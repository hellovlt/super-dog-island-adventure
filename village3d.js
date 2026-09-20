// The village: where every adventure starts and the only place friends share outside an
// island. It is a world in the same shape as an island, so the renderer and the physics
// need no special cases, but it holds no bones, no keys, no cages and no giant. Nothing
// here is ever written into the campaign save: see placeGuard in game3d.js.
import * as base from './world3d.js';
import {createWorld,LEVELS} from './campaign3d.js';

const box=(id,x,z,w,d,top,bottom=-3,kind='grass')=>({id,x,z,w,d,top,bottom,kind});
const cylinder=(id,x,z,radius,bottom,top,color)=>({id,shape:'cylinder',x,z,radius,bottom,top,color});
const prop=(id,x,z,w,d,bottom,top,color)=>({...box(id,x,z,w,d,top,bottom,'prop'),color});

export const VILLAGE_META={
 name:'Your Village',subtitle:'Home of the super dogs',boss:'',
 color:0x7fa86a,scale:4.2,sky:0xcfe9f2,ground:0x95c96b,sea:0x68c9d8,stone:0xc2bfa4,accent:0xf3c65b,
};
export const VILLAGE_SPAWN={x:0,y:0,z:18};
export const GREEN_RADIUS=34;

// Five gates stand in an arc across the north of the green, in campaign order from the
// left, so the island a child has played longest is always in the same place.
export const GATE_RADIUS=25;
export const GATES=[0,1,2,3,4].map(level=>{
 const angle=Math.PI*(1.18+level*0.16);
 return {level,id:`gate-${level}`,x:Math.round(Math.cos(angle)*GATE_RADIUS*10)/10,z:Math.round(Math.sin(angle)*GATE_RADIUS*10)/10,radius:2.6};
});
// Where a house, a tree or a trampoline can go. Building fills these in a later step;
// until then they are flat patches of ground the child can run over.
export const PLOTS=[0,1,2,3,4,5].map(i=>{
 const angle=Math.PI*(0.12+i*0.13);
 return {id:`plot-${i}`,x:Math.round(Math.cos(angle)*19*10)/10,z:Math.round(Math.sin(angle)*19*10)/10};
});

const gateProps=()=>GATES.flatMap(g=>{
 const lean=Math.atan2(-g.z,-g.x),side=0.9;
 const dx=Math.round(Math.cos(lean+Math.PI/2)*side*100)/100,dz=Math.round(Math.sin(lean+Math.PI/2)*side*100)/100;
 return [
  prop(`${g.id}-pillar-a`,g.x+dx*2.2,g.z+dz*2.2,.9,.9,0,4.6,0xbfb08b),
  prop(`${g.id}-pillar-b`,g.x-dx*2.2,g.z-dz*2.2,.9,.9,0,4.6,0xbfb08b),
  prop(`${g.id}-arch`,g.x,g.z,Math.max(1.2,Math.abs(dx*5)),Math.max(1.2,Math.abs(dz*5)),4.6,5.3,0xd8c79c),
 ];
});

export function createVillage(){
 const trees=[[-30,26],[-24,31],[-11,33],[9,33],[22,30],[30,24],[33,10],[-33,8],[-32,-8],[33,-6],[26,-24],[-27,-23],[-14,-31],[12,-31]]
  .map(([x,z],i)=>({id:`tree-${i}`,x,z,scale:.9+(i*29%55)/100,pine:i%3===0}));
 const rocks=Array.from({length:10},(_,i)=>{const a=Math.PI*2*i/10;return {id:`rock-${i}`,x:Math.round(Math.cos(a)*31.5*10)/10,z:Math.round(Math.sin(a)*31.5*10)/10,r:.7+(i*17%6)/10};});
 const props=[
  // The signpost stands beside where a child lands, not in the middle: the walk from the
  // spawn to the gates has to be clear, or they run straight into it.
  cylinder('signpost',-4.5,13,.22,0,3.4,0xa58052),
  prop('signpost-board',-4.5,13,3.2,.22,2.3,3.2,0xe8d7ab),
  // The banner pole on the other side of the landing spot: the child's own drawing flies here.
  cylinder('banner-pole',4.5,13,.1,0,4.8,0xa58052),
  ...gateProps(),
 ];
 // A fence all the way round. Nothing here is meant to be survived, so the child simply
 // cannot walk off the edge and lose a heart in their own village.
 const FENCE=GREEN_RADIUS+1.5;
 const fence=[
  prop('fence-n',0,-FENCE,FENCE*2+1.6,.8,0,1.5,0xbba171),
  prop('fence-s',0,FENCE,FENCE*2+1.6,.8,0,1.5,0xbba171),
  prop('fence-w',-FENCE,0,.8,FENCE*2+1.6,0,1.5,0xbba171),
  prop('fence-e',FENCE,0,.8,FENCE*2+1.6,0,1.5,0xbba171),
 ];
 props.push(...fence);
 const platforms=[
  box('village',0,0,GREEN_RADIUS*2,GREEN_RADIUS*2,0,-6,'island'),
  ...PLOTS.map(p=>box(p.id,p.x,p.z,5,5,.06,-.2,'grass')),
 ];
 const world={
  ...base,
  index:0,place:'village',safe:true,meta:VILLAGE_META,
  SPAWN:{...VILLAGE_SPAWN},
  PLATFORMS:platforms,
  // Nothing to collect, nobody caged, no giant: a child cannot lose anything here.
  BONES:[],KEYS:[],STARS:[],FRIENDS:[],ENEMIES:[],HAZARDS:[],ICE:[],EGGS:[],
  LANDMARKS:[],COURSES:[],
  CHECKPOINTS:[{id:'home',...VILLAGE_SPAWN}],
  TREES:trees,ROCKS:rocks,PROPS:props,
  NPCS:[],
  GATES,PLOTS,
  RUSH:{x:11,y:0,z:14,bones:[]},
 };
 world.STATIC_SOLIDS=[
  ...platforms,
  box('village-beach',0,0,GREEN_RADIUS*2+8,GREEN_RADIUS*2+8,-.1,-1.1,'beach'),
  ...trees.map(t=>cylinder(t.id,t.x,t.z,.28*t.scale,0,2.8*t.scale)),
  ...props,
  ...rocks.map(r=>cylinder(r.id,r.x,r.z,r.r*.88,-1,r.r*.5)),
 ];
 world.CAGE_SOLIDS=[];
 world.solidsFor=()=>world.STATIC_SOLIDS;
 return world;
}

// Which gate a dog is standing in, or null. The pads are generous: a child aiming at a
// gate should not have to hit a pixel.
export function gateAt(x,z,gates=GATES){
 for(const gate of gates)if(Math.hypot(x-gate.x,z-gate.z)<=gate.radius)return gate;
 return null;
}
// Everyone who can travel is standing in the same gate, and there is at least one of them.
export function everyoneReady(gate,players){
 if(!gate||!players.length)return false;
 const eligible=players.filter(p=>p.unlocked>gate.level);
 return eligible.length>0&&eligible.every(p=>p.gate===gate.level);
}

// What the child has done, turned into who lives here. Read from the campaign save exactly
// as it was loaded: nothing here is stored, so nothing here can drift from the islands.
const validLevel=level=>Number.isInteger(level)&&level>=0&&level<LEVELS.length;
export function villagersFor(progress={}){
 const villagers=[];
 for(const [key,entry] of Object.entries(progress||{})){
  const level=Number(key);if(!validLevel(level)||!Array.isArray(entry?.rescued))continue;
  const friends=createWorld(level).FRIENDS;
  for(const friend of friends)if(entry.rescued.includes(friend.id))villagers.push({id:`${level}-${friend.id}`,level,name:friend.name,color:friend.color});
 }
 // Around the south half of the green, in a loose ring, clear of the plots and the gates.
 return villagers.map((v,i)=>{
  const angle=Math.PI*(0.28+(i%9)*0.055)+(i>=9?Math.PI*0.02:0),radius=i>=9?9.5:13.5;
  return {...v,x:Math.round(Math.cos(angle)*radius*10)/10,z:Math.round(Math.sin(angle)*radius*10)/10,facing:angle+Math.PI};
 });
}
// A beaten giant stands in stone beside the gate of the island it guarded.
export function statuesFor(progress={}){
 const statues=[];
 for(const gate of GATES){
  const entry=progress?.[gate.level];if(entry?.won!==true)continue;
  const out=Math.atan2(gate.z,gate.x);
  // Just outside the arch, on the side away from the middle, so the gate itself stays clear.
  statues.push({level:gate.level,name:LEVELS[gate.level].boss,x:Math.round((gate.x+Math.cos(out+Math.PI/2)*4.6)*10)/10,z:Math.round((gate.z+Math.sin(out+Math.PI/2)*4.6)*10)/10,facing:out+Math.PI});
 }
 return statues;
}
