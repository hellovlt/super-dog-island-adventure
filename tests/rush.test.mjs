import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure3D,DIFFICULTIES,RUSH_REWARD} from '../adventure3d.js';
import {penetrates,overlapsXZ} from '../collision3d.js';
import {go} from './3d-playthrough.mjs';
const atStone=g=>{const s=g.world.RUSH;Object.assign(g.player,{x:s.x,y:0,z:s.z+1});};
function runRush(g,hz=60){atStone(g);g.interact();assert.ok(g.rush,'rush started');let here={x:g.player.x,z:g.player.z};const left=[...g.world.RUSH.bones];
 while(left.length&&g.rush){left.sort((a,b)=>Math.hypot(a.x-here.x,a.z-here.z)-Math.hypot(b.x-here.x,b.z-here.z));const b=left.shift();go(g,b.x,b.z,0,false,hz);here=b;}}
test('each world has its own golden bone shape on open, reachable ground',()=>{
 const shapes=new Set();
 for(let level=0;level<5;level++){const g=new Adventure3D(null,{level}),r=g.world.RUSH;assert.equal(r.bones.length,12);shapes.add(JSON.stringify(r.bones.map(b=>[+b.x.toFixed(1),+b.z.toFixed(1)])));
  for(const b of r.bones){assert.ok(!g.solids.some(s=>penetrates({x:b.x,y:b.y-.1,z:b.z},s,.35,.3)),`${b.id} in world ${level} is inside a solid`);assert.ok(g.groundBelow({x:b.x,y:5,z:b.z})<.3,`${b.id} in world ${level} sits on a platform`);assert.ok(!g.world.HAZARDS.some(h=>overlapsXZ({x:b.x,z:b.z},h,.8)),`${b.id} on lava`);}
  assert.ok(!g.solids.some(s=>penetrates({x:r.x,y:0,z:r.z},s)),'stone is clear');}
 assert.equal(shapes.size,5);
});
for(let level=0;level<5;level++)for(const difficulty of Object.keys(DIFFICULTIES))test(`world ${level+1}: Bone Rush can be won with real inputs on ${difficulty}`,()=>{
 const g=new Adventure3D(null,{level,difficulty});g.start();runRush(g);
 const won=g.events.find(e=>e.type==='rushWon');assert.ok(won,`won ${difficulty}`);assert.equal(won.first,true);assert.equal(won.reward,RUSH_REWARD);assert.ok(won.time<g.rushLimit);
 assert.equal(g.challengeBones,RUSH_REWARD);assert.equal(g.bonesEarned,g.boneCount+RUSH_REWARD);
});
test('a second clear keeps the best time and pays nothing more; saves keep records honest',()=>{
 const g=new Adventure3D(null,{level:1});g.start();runRush(g);const first=g.challenges[1].best;g.events.length=0;runRush(g);const again=g.events.find(e=>e.type==='rushWon');
 assert.equal(again.first,false);assert.equal(again.reward,0);assert.equal(g.challengeBones,RUSH_REWARD);assert.equal(g.challenges[1].best,Math.min(first,again.time));
 const loaded=new Adventure3D({...g.snapshot(),challenges:{1:{best:g.challenges[1].best},7:{best:3},2:{best:-1},3:{best:'fast'}}});assert.deepEqual(Object.keys(loaded.challenges),['1']);assert.equal(loaded.challengeBones,RUSH_REWARD);
});
test('running out of time ends the rush without a reward',()=>{
 const g=new Adventure3D(null,{level:0,difficulty:'hard'});g.start();atStone(g);g.interact();for(let i=0;i<60*(g.rushLimit+1);i++)g.tick(1/60);
 assert.equal(g.rush,null);assert.ok(g.events.some(e=>e.type==='rushLost'));assert.equal(g.challengeBones,0);
});
