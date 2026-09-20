import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeRoomCode,normalizeCode,isCompleteCode,formatCode,pickName,NAMES,CODE_ALPHABET,CODE_LENGTH,MAX_PLAYERS,
 packState,unpackState,packLook,unpackLook,easeRemote,shortestTurn,roomFull,waitingMessage,LONELY_AFTER,roomConfig,RELAY_REDUNDANCY,APP_ID} from '../multiplayer3d.js';

test('codes are easy to read aloud, type, and mistype',()=>{
 for(const confusing of ['O','0','I','1','L'])assert.ok(!CODE_ALPHABET.includes(confusing),`${confusing} is not in a child's code`);
 let random=0;const code=makeRoomCode(()=>{random+=.137;return random%1;});
 assert.equal(code.length,CODE_LENGTH);assert.ok([...code].every(c=>CODE_ALPHABET.includes(c)));
 assert.equal(normalizeCode(' k7r-2m '),'K7R2M');assert.equal(normalizeCode('abc'),'ABC');
 assert.equal(normalizeCode('o0i1l'),'QQJJJ','look-alikes land on the same letters');
 assert.equal(normalizeCode('K7R2MEXTRA'),'K7R2M','never longer than the code');
 assert.equal(isCompleteCode('k7 r2m'),true);assert.equal(isCompleteCode('k7r'),false);
 assert.equal(formatCode('k7r'),'K 7 R · ·');
});
test('every player gets a different friendly name and the island holds eight',()=>{
 const taken=[];for(let i=0;i<NAMES.length;i++){const name=pickName(taken,()=>0);assert.ok(!taken.includes(name));taken.push(name);}
 assert.ok(NAMES.includes(pickName(taken,()=>0)),'falls back once every name is taken');
 assert.equal(MAX_PLAYERS,8);assert.equal(roomFull(new Array(7).fill(0)),true);assert.equal(roomFull(new Array(6).fill(0)),false);
});
test('a friend travels as six small numbers and arrives intact',()=>{
 const player={x:12.345,y:2.5,z:-30.128,facing:1.2345,vx:3,vz:0,grounded:false,gliding:true,dash:0};
 const packet=packState(player,2);
 assert.equal(packet.length,6);assert.deepEqual(packet.slice(0,3),[12.35,2.5,-30.13]);
 const state=unpackState(packet);
 assert.equal(state.level,2);assert.equal(state.gliding,true);assert.equal(state.grounded,false);assert.equal(state.moving,true);assert.equal(state.dashing,false);
 assert.equal(unpackState(packState({...player,dash:.2},0)).dashing,true);
 for(const junk of [null,'hello',[1,2],[NaN,0,0,0,0,0],[9999,0,0,0,0,0]])assert.equal(unpackState(junk),null,'a bad packet is ignored, not drawn');
 assert.equal(unpackState([0,0,0,0,0,99]).level,4,'a silly world number is clamped');
});
test('a friend\'s look is limited to what draws their dog, and the drawing only travels when allowed',()=>{
 const png='data:image/png;base64,iVBORw0KGgo=';
 const look=packLook({name:'Brave Peach','cape':0x5aa7d8,hat:'hat-cowboy',fur:0xd8a667,drawing:png});
 assert.equal(look.drawing,png);assert.equal(packLook({name:'x',drawing:null}).drawing,null);
 assert.equal(packLook({name:'x',drawing:'javascript:alert(1)'}).drawing,null,'only a real drawing is accepted');
 assert.equal(packLook({name:'A'.repeat(50)}).name.length,20,'names stay short');
 const back=unpackLook(look);assert.equal(back.name,'Brave Peach');assert.equal(back.cape,0x5aa7d8);assert.equal(back.hat,'hat-cowboy');
 const missing=unpackLook(null);assert.equal(missing.name,'Friend');assert.equal(missing.hat,'hat-none');assert.equal(missing.drawing,null);
 assert.equal(unpackLook({name:'  ',cape:'blue'},'Jolly Spark').name,'Jolly Spark');
});
test('friends glide smoothly between updates and turn the short way',()=>{
 assert.ok(Math.abs(shortestTurn(3.0,-3.0)-.283)<.01,'across the seam, not the long way round');
 let shown={x:0,y:0,z:0,facing:0};const target={x:10,y:0,z:0,facing:Math.PI/2};
 for(let i=0;i<60;i++)shown=easeRemote(shown,target,1/60);
 assert.ok(Math.abs(shown.x-10)<.1&&Math.abs(shown.facing-Math.PI/2)<.05,'catches up within a second');
 const oneStep=easeRemote({x:0,y:0,z:0,facing:0},target,1/60);
 assert.ok(oneStep.x>0&&oneStep.x<2,'and never teleports');
});
test('a child who mistypes a code is told, instead of waiting alone forever',()=>{
 assert.match(waitingMessage({joined:false,friends:0,waitedMs:0}),/Read this code/,'the one who started reads it out');
 assert.match(waitingMessage({joined:true,friends:0,waitedMs:0}),/Looking for/,'the one who typed it is still hopeful');
 const late=waitingMessage({joined:true,friends:0,waitedMs:LONELY_AFTER});
 assert.match(late,/Check the code/,'and after a while is told to check the code');
 assert.equal(waitingMessage({joined:true,friends:1,waitedMs:LONELY_AFTER}),null,'nothing is said once a friend is there');
 assert.ok(LONELY_AFTER>=10000&&LONELY_AFTER<=30000,'long enough for a slow join, short enough for a child');
 const ui=readFileSync(new URL('../game3d.js',import.meta.url),'utf8');
 assert.match(ui,/startParty\(typed,\{joined:true\}\)/,'joining is told apart from starting');
 assert.match(ui,/setTimeout\([^;]*roster\(\)\.length/,'and an empty island speaks up on its own');
});
test('a party is announced on enough meeting points to survive dead ones',async()=>{
 const {defaultRelayUrls}=await import('../vendor/trystero/nostr.mjs');
 const config=roomConfig();
 assert.equal(config.appId,APP_ID);
 assert.equal(config.relayConfig.redundancy,RELAY_REDUNDANCY,'the wider set is actually asked for');
 assert.ok(RELAY_REDUNDANCY>5,'more than the library default, which leaves no spare for a dead relay');
 assert.ok(RELAY_REDUNDANCY<=defaultRelayUrls.length,'never asks for more meeting points than exist');
 assert.ok(RELAY_REDUNDANCY<=12,'idle sockets on a school tablet are not free');
 // The set is a prefix of one fixed order, so a child on a cached older build still shares
 // meeting points with a child on the newest one. A hand-picked list would strand them.
 assert.equal(config.relayConfig.urls,undefined,'never replaces the list, only widens it');
});
