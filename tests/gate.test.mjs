import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure3D} from '../adventure3d.js';
import {go} from './3d-playthrough.mjs';
// Fly from beside the closed gate straight at the giant's island, gliding the whole way.
function glideAtTheArena(g,startX){
 Object.assign(g.player,{x:startX,y:0,z:-41,vx:0,vz:0,vy:0});
 let deepest=0;
 for(let i=0;i<900;i++){const p=g.player,dx=0-p.x,dz=-60-p.z,d=Math.hypot(dx,dz)||1;
  g.tick(1/60,{x:dx/d,z:dz/d,glide:true,jump:i%40===0});deepest=Math.min(deepest,p.z);}
 return deepest;
}
for(let level=0;level<5;level++)test(`world ${level+1}: the giant's island cannot be reached before all three friends are free`,()=>{
 for(const startX of [0,7,14,-9,-16]){
  const g=new Adventure3D(null,{level});g.start();g.boss.hp=0;g.boss.state='defeated';g.player.hp=g.maxHP; // glide unlocked
  const deepest=glideAtTheArena(g,startX);
  assert.ok(deepest>-46.5,`world ${level+1} from x ${startX} slipped past the gate to z ${deepest.toFixed(1)}`);
  assert.equal(g.rescued.size,0);assert.equal(g.player.hp,g.maxHP,'being carried back costs no hearts');
  assert.ok(g.events.some(e=>e.type==='hint'&&/three friends/.test(e.text)),'the gate explains itself');
 }
});
test('with all three friends free the bridge leads to the giant as usual',()=>{
 const g=new Adventure3D(null,{level:1});g.start();
 for(const f of g.world.FRIENDS)g.rescued.add(f.id);
 g.solids=g.world.solidsFor(g.rescued);
 Object.assign(g.player,{x:0,y:0,z:-38,vx:0,vz:0,vy:0});
 go(g,0,-43,.5);go(g,0,-52,.5);go(g,0,-60,1.2);
 assert.ok(g.player.z<-56,'crossed into the arena');assert.equal(g.status,'playing');
 for(let i=0;i<60;i++)g.tick(1/60);
 assert.notEqual(g.boss.state,'sleep','the giant wakes for a player who earned the fight');
});
