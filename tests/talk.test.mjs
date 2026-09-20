import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure3D} from '../adventure3d.js';
import {penetrates} from '../collision3d.js';
test('every world has a guide near the start, clear of solids, with several hints',()=>{
 const names=new Set();
 for(let level=0;level<5;level++){const g=new Adventure3D(null,{level});const [n]=g.world.NPCS;names.add(n.name);
  assert.ok(n.lines.length>=3);assert.ok(Math.hypot(n.x-g.world.SPAWN.x,n.z-g.world.SPAWN.z)<8,'close to spawn');
  assert.ok(!g.solids.some(s=>penetrates({x:n.x,y:n.y,z:n.z},s)),`${n.name} stands inside a solid`);
  assert.equal(new Set(g.world.FRIENDS.map(f=>f.line)).size,3,'three different thank-you lines');}
 assert.equal(names.size,5);
});
test('talking cycles through the hints and never spends a key',()=>{
 const g=new Adventure3D(null,{level:2});g.start();const n=g.world.NPCS[0];Object.assign(g.player,{x:n.x,z:n.z+1.5});
 const heard=[];for(let i=0;i<n.lines.length+1;i++){g.tick(1/60,{interact:true});g.tick(1/60);heard.push(g.events.filter(e=>e.type==='talk').at(-1));}
 assert.deepEqual(heard.slice(0,n.lines.length).map(e=>e.text),n.lines);assert.equal(heard.at(-1).text,n.lines[0]);assert.equal(heard[0].speaker,n.name);
 assert.equal(g.keyCount,0);assert.equal(g.rescued.size,0);
});
test('a rescued friend thanks Super Dog by name',()=>{
 const g=new Adventure3D(null,{level:1});g.start();const f=g.world.FRIENDS[0];g.collected.add(g.world.KEYS[0].id);Object.assign(g.player,{x:f.x,y:f.y,z:f.z+2.2});g.interact();
 const e=g.events.find(e=>e.type==='rescue');assert.equal(e.speaker,f.name);assert.equal(e.line,f.line);
});
test('a guide greets Super Dog for walking up, once, and E carries the conversation on',()=>{
 const g=new Adventure3D(null,{level:0});g.start();const n=g.world.NPCS[0];
 for(let i=0;i<30;i++)g.tick(1/60);
 assert.equal(g.events.filter(e=>e.type==='talk').length,0,'nothing is said from across the field');
 Object.assign(g.player,{x:n.x,z:n.z+1.5});
 for(let i=0;i<30;i++)g.tick(1/60);
 const greeted=g.events.filter(e=>e.type==='talk');
 assert.equal(greeted.length,1,'walking up is enough, and it is said once');
 assert.equal(greeted[0].text,n.lines[0]);assert.equal(greeted[0].speaker,n.name);
 g.tick(1/60,{interact:true});g.tick(1/60);
 assert.equal(g.events.filter(e=>e.type==='talk').at(-1).text,n.lines[1],'pressing E gives the next hint, not the greeting again');
 Object.assign(g.player,{x:n.x+12,z:n.z});for(let i=0;i<30;i++)g.tick(1/60);
 Object.assign(g.player,{x:n.x,z:n.z+1.5});for(let i=0;i<30;i++)g.tick(1/60);
 assert.equal(g.events.filter(e=>e.type==='talk').length,2,'coming back later does not repeat the greeting');
});
