import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Adventure3D,LEVELS} from '../adventure3d.js';
import {createVillage,gateAt,everyoneReady,villagersFor,statuesFor,GATES,PLOTS,VILLAGE_SPAWN,GREEN_RADIUS} from '../village3d.js';

test('the village is a world of the same shape as an island, with nothing to lose in it',()=>{
 const village=createVillage(),island=new Adventure3D(null).world;
 for(const key of ['PLATFORMS','FRIENDS','KEYS','STARS','BONES','CHECKPOINTS','SPAWN','TREES','PROPS','ROCKS',
  'COURSES','LANDMARKS','NPCS','RUSH','EGGS','HAZARDS','ENEMIES','STATIC_SOLIDS','CAGE_SOLIDS','meta'])
  assert.ok(village[key]!==undefined,`the renderer reads ${key} on every world`);
 assert.equal(typeof village.solidsFor,'function');
 for(const key of ['BONES','KEYS','STARS','FRIENDS','ENEMIES','HAZARDS','EGGS'])
  assert.equal(village[key].length,0,`a child cannot collect or lose ${key} in the village`);
 for(const key of ['name','subtitle','color','scale','sky','ground','sea','stone','accent'])
  assert.ok(village.meta[key]!==undefined,`meta.${key} is read by the level label or the sky`);
 // The first island has no COURSES at all (campaign3d.js builds it by hand), so the village
 // supplies an empty array rather than the null the renderer already steps around.
 assert.ok(Array.isArray(village.COURSES),'COURSES is an array, never null');
 assert.ok(village.solidsFor(new Set()).length>10,'the village has ground and walls');
 // Nothing lies flat on the green at almost its own height: that is what shimmers.
 for(const solid of village.STATIC_SOLIDS){
  if(solid.id==='village'||solid.id==='village-beach'||solid.shape==='cylinder')continue;
  const flat=solid.w>2&&solid.d>2,nearGround=Math.abs(solid.top)<.5&&solid.bottom<.5;
  assert.ok(!(flat&&nearGround),`${solid.id} is a wide slab at ground level and will z-fight the green`);
 }
 // A child who lands and runs straight at a gate must not meet a post on the way.
 const spawn=village.SPAWN;
 for(const gate of GATES){
  const steps=60;
  for(let i=1;i<=steps;i++){
   const t=i/steps,x=spawn.x+(gate.x-spawn.x)*t,z=spawn.z+(gate.z-spawn.z)*t;
   for(const solid of village.STATIC_SOLIDS){
    if(solid.bottom>=1.2||solid.id.startsWith('village')||solid.id.startsWith('plot'))continue;
    const near=solid.shape==='cylinder'
     ?Math.hypot(x-solid.x,z-solid.z)<solid.radius+.55
     :Math.abs(x-solid.x)<solid.w/2+.55&&Math.abs(z-solid.z)<solid.d/2+.55;
    assert.ok(!near||solid.id.startsWith(gate.id),`${solid.id} blocks the straight walk from the spawn to ${gate.id}`);
   }
  }
 }
});

test('five gates, one per island, all reachable from the middle',()=>{
 assert.equal(GATES.length,LEVELS.length);
 assert.deepEqual(GATES.map(g=>g.level),[0,1,2,3,4],'in campaign order');
 for(const gate of GATES){
  assert.ok(Math.hypot(gate.x,gate.z)<GREEN_RADIUS-4,`${gate.id} stands on the green, not in the water`);
  assert.equal(gateAt(gate.x,gate.z).level,gate.level,'standing in it is enough');
  assert.equal(gateAt(gate.x+9,gate.z+9,[gate]),null,'and walking past it is not');
 }
 for(const a of GATES)for(const b of GATES)if(a!==b)
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>a.radius+b.radius,`${a.id} and ${b.id} never overlap`);
 assert.equal(gateAt(VILLAGE_SPAWN.x,VILLAGE_SPAWN.z),null,'you do not set off by standing still where you land');
 for(const plot of PLOTS)assert.equal(gateAt(plot.x,plot.z),null,`${plot.id} is clear of the gates`);
});

test('a party leaves together, and nobody is left waiting on a friend who cannot come',()=>{
 const gate=GATES[2];
 assert.equal(everyoneReady(gate,[{gate:2,unlocked:5},{gate:2,unlocked:5}]),true,'both in the gate, both can go');
 assert.equal(everyoneReady(gate,[{gate:2,unlocked:5},{gate:null,unlocked:5}]),false,'one is still wandering');
 assert.equal(everyoneReady(gate,[{gate:2,unlocked:5},{gate:null,unlocked:1}]),true,
  'a friend who has not unlocked that island never blocks the others');
 assert.equal(everyoneReady(gate,[{gate:null,unlocked:1}]),false,'and cannot set off alone either');
 assert.equal(everyoneReady(null,[{gate:2,unlocked:5}]),false);
 assert.equal(everyoneReady(gate,[]),false);
});

test('nothing done in the village can rewrite what was earned on the islands',()=>{
 const ui=readFileSync(new URL('../game3d.js',import.meta.url),'utf8');
 assert.match(ui,/const islandSave=game\.snapshot\(\);/,'the campaign save is kept as loaded');
 assert.match(ui,/inVillage\(\)\?\{\.\.\.snap,level:islandSave\.level,progress:islandSave\.progress,challenges:islandSave\.challenges\}/,
  'saving in the village copies progress and challenges through verbatim');
 assert.match(ui,/game\.enemies\.length=0;/,'the island snakes do not follow the child home');
 assert.match(ui,/state\.place==='village'\?inVillage\(\)/,'friends are together by place, not by island');
 assert.match(ui,/sendState\(p,game\.level,\{village:inVillage\(\),ready:!!gateWas\}\)/,'the packet says where you are');
 // The danger is real: snapshot() rebuilds progress[level] from the live sets every time.
 const sim=readFileSync(new URL('../adventure3d.js',import.meta.url),'utf8');
 assert.match(sim,/progress:\{\.\.\.this\.progress,\[this\.level\]:this\.levelSnapshot\(\)\}/,
  'if this ever stops being true, the guard above needs revisiting');
});

test('a save written in the village still reads back as the island it belongs to',()=>{
 const game=new Adventure3D(null,{level:0});game.start();
 for(const friend of game.world.FRIENDS)game.rescued.add(friend.id);
 for(const key of game.world.KEYS)game.collected.add(key.id);
 game.boss.hp=0;
 const island=game.snapshot();
 // What game3d.js writes while the child is in the village.
 const fromVillage={...game.snapshot(),level:island.level,progress:island.progress,challenges:island.challenges};
 const back=new Adventure3D(fromVillage);
 assert.equal(back.unlocked,2,'the island stays beaten and the next one stays open');
 assert.deepEqual(back.progress,island.progress,'progress survives the trip through the village');
});

test('a child cannot fall out of their own village, in any direction',()=>{
 const village=createVillage();
 for(const degrees of Array.from({length:24},(_,i)=>i*15)){
  const game=new Adventure3D(null);
  // Exactly what game3d.js does on the way in, including emptying the island's snakes.
  game.world=village;game.solids=village.solidsFor(new Set());game.enemies.length=0;
  Object.assign(game.player,{...VILLAGE_SPAWN,vx:0,vy:0,vz:0});
  game.start();
  const a=degrees*Math.PI/180,x=Math.cos(a),z=Math.sin(a);
  for(let i=0;i<600;i++)game.tick(1/60,{x,z,jump:i%50===0});
  // Let go and give the bubble a moment: what matters is where a child ends up, not mid-air.
  for(let i=0;i<180;i++)game.tick(1/60,{});
  const p=game.player;
  assert.ok(p.y>-1,`running ${degrees}° from the spawn dropped the dog to y ${p.y.toFixed(2)}`);
  assert.equal(p.hp,game.maxHP,`running ${degrees}° cost a heart`);
  // The shore outside the fence is still the village; the sea is not.
  assert.ok(Math.abs(p.x)<GREEN_RADIUS+4.5&&Math.abs(p.z)<GREEN_RADIUS+4.5,`${degrees}° left the village at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
 }
});

test('the village fills with the friends the child rescued and the giants they beat',()=>{
 assert.deepEqual(villagersFor({}),[],'a fresh save has an empty green');
 assert.deepEqual(statuesFor(undefined),[]);
 const progress={0:{rescued:['peach','spark','fluff'],won:true},1:{rescued:['peach'],won:false},7:{rescued:['peach'],won:true},junk:{rescued:'peach'}};
 const villagers=villagersFor(progress);
 assert.deepEqual(villagers.map(v=>v.name),['Peach','Spark','Fluff','Moss'],'named as they were on their islands, junk levels ignored');
 assert.equal(new Set(villagers.map(v=>v.id)).size,4,'the same friend from two worlds is two villagers');
 for(const v of villagers){
  assert.equal(gateAt(v.x,v.z),null,`${v.name} is not standing in a gate`);
  for(const plot of PLOTS)assert.ok(Math.hypot(v.x-plot.x,v.z-plot.z)>3.2,`${v.name} is not standing on ${plot.id}`);
  assert.ok(Math.hypot(v.x,v.z)<GREEN_RADIUS-4,`${v.name} is on the green`);
 }
 const statues=statuesFor(progress);
 assert.deepEqual(statues.map(s=>s.name),['Snake King'],'only a beaten giant gets a statue');
 assert.ok(Math.hypot(statues[0].x-GATES[0].x,statues[0].z-GATES[0].z)>GATES[0].radius,'and it stands beside the gate, not in it');
 // Every possible statue keeps its gate clear.
 const all=statuesFor({0:{won:true},1:{won:true},2:{won:true},3:{won:true},4:{won:true}});
 assert.equal(all.length,5);
 for(const statue of all)assert.equal(gateAt(statue.x,statue.z),null,`${statue.name} blocks a gate`);
});
