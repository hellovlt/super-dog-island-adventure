import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure3D} from '../adventure3d.js';
import {overlapsXZ} from '../collision3d.js';
test('every later world has two landmarks of its own, clear of the start, routes, and flags',()=>{
 const kinds=new Set();
 for(let level=1;level<5;level++){const g=new Adventure3D(null,{level}),w=g.world;assert.equal(w.LANDMARKS.length,2);
  for(const l of w.LANDMARKS){kinds.add(l.kind);assert.ok(w.STATIC_SOLIDS.some(s=>s.id.startsWith(l.id)),`${l.id} is solid`);
   for(const c of w.CHECKPOINTS)assert.ok(Math.hypot(c.x-l.x,c.z-l.z)>l.radius+6,`${l.id} crowds flag ${c.id}`);
   for(const route of w.COURSES)for(const [x,z] of route)assert.ok(Math.hypot(x-l.x,z-l.z)>l.radius+6,`${l.id} crowds a course`);
   assert.ok(Math.hypot(l.x,l.z-32)>20&&Math.abs(l.x-(-12))>6,`${l.id} blocks the start or the west road`);}
 }
 assert.equal(kinds.size,8);
});
test('bone trails differ per world yet stay on open ground, off lava, and inside the island',()=>{
 const shapes=new Set();
 for(let level=1;level<5;level++){const g=new Adventure3D(null,{level}),w=g.world;shapes.add(JSON.stringify(w.BONES.slice(0,7).map(b=>[+b.x.toFixed(2),+b.z.toFixed(2)])));
  for(const b of w.BONES.filter(b=>b.y<1)){assert.ok(Math.abs(b.x)<47&&Math.abs(b.z)<45,`${b.id} in the sea`);
   assert.ok(!w.HAZARDS.some(h=>overlapsXZ({x:b.x,z:b.z},h,.6)),`${b.id} on lava`);}
  assert.equal(w.BONES.length,62);}
 assert.equal(shapes.size,4);
});
