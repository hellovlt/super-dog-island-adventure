// Play together: a five-letter code puts friends on the same island, device to device.
// Each player keeps their own bones and rescues; what travels is where everyone is and what they look like.
import {joinRoom} from './vendor/trystero/nostr.mjs';

export const MAX_PLAYERS=8,CODE_LENGTH=5,APP_ID='super-dog-island-adventure';
// No O/0/I/1/L: a code is read aloud and typed by children.
export const CODE_ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const NAMES=['Brave Peach','Speedy Comet','Happy Fluff','Jolly Spark','Sunny Mallow','Clever Truffle','Snowy Polar','Mighty Ember','Cosy Button','Zippy Chili','Bouncy Moss','Starry Icicle'];

export function makeRoomCode(random=Math.random){
 let code='';for(let i=0;i<CODE_LENGTH;i++)code+=CODE_ALPHABET[Math.floor(random()*CODE_ALPHABET.length)%CODE_ALPHABET.length];
 return code;
}
// Accepts what a child actually types: lower case, spaces, dashes, and the usual look-alikes.
export function normalizeCode(input){
 const swaps={O:'Q',0:'Q',I:'J',1:'J',L:'J'};
 const cleaned=[...String(input??'').toUpperCase()].map(c=>swaps[c]??c).filter(c=>CODE_ALPHABET.includes(c)).join('');
 return cleaned.slice(0,CODE_LENGTH);
}
export const isCompleteCode=code=>normalizeCode(code).length===CODE_LENGTH;
export const formatCode=code=>normalizeCode(code).padEnd(CODE_LENGTH,'·').split('').join(' ');
export const pickName=(taken=[],random=Math.random)=>{
 const free=NAMES.filter(n=>!taken.includes(n));
 return (free.length?free:NAMES)[Math.floor(random()*(free.length||NAMES.length))];
};

// Position and pose, rounded down to what a viewer can actually see, to keep packets small.
const round=(v,places=2)=>Math.round((Number.isFinite(v)?v:0)*10**places)/10**places;
export function packState(player,level){
 return [round(player.x),round(player.y),round(player.z),round(player.facing,3),
  (player.grounded?1:0)|(player.gliding?2:0)|(Math.hypot(player.vx||0,player.vz||0)>1.5?4:0)|(player.dash>0?8:0),level|0];
}
export function unpackState(packet){
 if(!Array.isArray(packet)||packet.length<6||!packet.slice(0,4).every(Number.isFinite))return null;
 const [x,y,z,facing,flags,level]=packet;
 if(Math.abs(x)>200||Math.abs(y)>200||Math.abs(z)>200)return null;
 return {x,y,z,facing,grounded:!!(flags&1),gliding:!!(flags&2),moving:!!(flags&4),dashing:!!(flags&8),level:Math.max(0,Math.min(4,level|0))};
}
// A friend's look: only what is needed to draw their dog. The drawing is shared only if they allow it.
export function packLook({name,cape,hat,fur,drawing}){return {name:String(name??'').slice(0,20),cape:cape|0,hat:String(hat??'hat-none').slice(0,20),fur:fur|0,head:0,drawing:typeof drawing==='string'&&drawing.startsWith('data:image/png;base64,')&&drawing.length<400000?drawing:null};}
export function unpackLook(look,fallbackName='Friend'){
 if(!look||typeof look!=='object')return {name:fallbackName,cape:0xe87862,hat:'hat-none',fur:0xd8a667,drawing:null};
 return {name:(typeof look.name==='string'&&look.name.trim()?look.name:fallbackName).slice(0,20),
  cape:Number.isFinite(look.cape)?look.cape:0xe87862,hat:typeof look.hat==='string'?look.hat.slice(0,20):'hat-none',
  fur:Number.isFinite(look.fur)?look.fur:0xd8a667,
  drawing:typeof look.drawing==='string'&&look.drawing.startsWith('data:image/png;base64,')&&look.drawing.length<400000?look.drawing:null};
}
// Friends move smoothly between the updates that arrive.
export const shortestTurn=(from,to)=>{const d=(to-from+Math.PI)%(Math.PI*2);return (d<0?d+Math.PI*2:d)-Math.PI;};
export function easeRemote(shown,target,dt,speed=12){
 const k=1-Math.exp(-speed*dt);
 return {x:shown.x+(target.x-shown.x)*k,y:shown.y+(target.y-shown.y)*k,z:shown.z+(target.z-shown.z)*k,
  facing:shown.facing+shortestTurn(shown.facing,target.facing)*k};
}
export const roomFull=peers=>peers.length+1>=MAX_PLAYERS;
// A child who mistypes a code lands in an empty room that looks exactly like hosting one.
// These are the words shown under the code while nobody else is there yet.
export const LONELY_AFTER=18000;
export function waitingMessage({joined=false,friends=0,waitedMs=0}={}){
 if(friends>0)return null;
 if(!joined)return 'Read this code to your friends. They type it into Join.';
 return waitedMs<LONELY_AFTER
  ?'Looking for your friend’s island… keep this open.'
  :'Nobody is on this island yet. Check the code with your friend, letter by letter, then join again.';
}

// Joins the room and keeps the roster; everything above stays testable without a network.
// Which meeting points the game uses is decided by the app id alone, not by the code children
// type, so every party everywhere shares one fixed set. Trystero's default of five is thin for
// that: one of our five is already dead, and each one that dies later is a permanent loss no
// player can work around. A wider set costs a few idle sockets and nothing else.
export const RELAY_REDUNDANCY=9;
export const roomConfig=()=>({appId:APP_ID,relayConfig:{redundancy:RELAY_REDUNDANCY}});

export function joinParty(code,{look,onRoster,onBark,onJoin,onLeave,onError}={}){
 const room=joinRoom(roomConfig(),`sd-${normalizeCode(code)}`);
 const state=room.makeAction('pos'),looks=room.makeAction('look'),barks=room.makeAction('bark');
 const friends=new Map();
 const roster=()=>[...friends.entries()].map(([id,f])=>({id,...f}));
 const announce=()=>onRoster?.(roster());
 looks.onMessage=(raw,{peerId})=>{const f=friends.get(peerId)||{};friends.set(peerId,{...f,look:unpackLook(raw)});announce();};
 state.onMessage=(raw,{peerId})=>{const moved=unpackState(raw);if(!moved)return;const f=friends.get(peerId)||{};friends.set(peerId,{...f,state:moved,seen:Date.now()});};
 barks.onMessage=(_,{peerId})=>onBark?.(peerId,friends.get(peerId));
 room.onPeerJoin=peerId=>{friends.set(peerId,{look:unpackLook(null),joined:Date.now()});looks.send(packLook(look()),{target:peerId});announce();onJoin?.(peerId);};
 room.onPeerLeave=peerId=>{const gone=friends.get(peerId);friends.delete(peerId);announce();onLeave?.(peerId,gone);};
 try{looks.send(packLook(look()));}catch(error){onError?.(error);}
 return {
  code:normalizeCode(code),room,friends,roster,
  sendState:(player,level)=>{state.send(packState(player,level)).catch?.(()=>{});},
  sendLook:()=>{looks.send(packLook(look())).catch?.(()=>{});},
  bark:()=>{barks.send(1).catch?.(()=>{});},
  leave:()=>{try{room.leave();}catch{}friends.clear();announce();},
 };
}
