import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure3D,DIFFICULTIES} from '../adventure3d.js';
import {createWorld,LEVELS} from '../campaign3d.js';
import {penetrates,safeCamera,segmentHit} from '../collision3d.js';
import {go,rescueRoute,fightBoss} from './3d-playthrough.mjs';

export function newRescueRoute(g,hz=60){
 if(!g.level)return rescueRoute(g,hz);
 for(const [r,course] of g.world.COURSES.entries()){
  const [sx,sz]=course[0];
  go(g,0,32,0,false,hz);go(g,sx,sz+4.5,0,false,hz);
  for(const [i,[x,z,y]] of course.entries()){
   if(i===course.length-1){const [px,pz]=course[i-1],d=Math.hypot(px-x,pz-z);go(g,x+(px-x)/d*2.5,z+(pz-z)/d*2.5,y,true,hz);}
   else go(g,x,z,y,true,hz);
  }
  g.interact();assert.ok(g.rescued.has(g.world.FRIENDS[r].id),`rescue route ${r}`);
  for(const [x,z,y] of [...course].slice(0,-1).reverse())go(g,x,z,y,true,hz);
  go(g,sx,sz+4.5,0,true,hz);
 }
 go(g,0,32,0,false,hz);go(g,0,0,0,false,hz);go(g,-12,0,0,false,hz);go(g,-12,-36,0,false,hz);go(g,0,-38,0,false,hz);
 go(g,0,-43,.5,false,hz);go(g,0,-52,.5,false,hz);go(g,0,-64,1.2,false,hz);
}

for(let level=0;level<5;level++)test(`world ${level+1}: pickups, secrets and checkpoints are outside solids`,()=>{
 const g=new Adventure3D(null,{level});const w=g.world;
 for(const item of [...w.KEYS,...w.STARS,...w.BONES,...w.EGGS.map(e=>({...e,y:e.y+1}))]){
  const blocked=g.solids.filter(s=>item.y>s.bottom+.05&&item.y<s.top-.05&&penetrates({x:item.x,y:item.y-.1,z:item.z},s,.1,.2));
  assert.deepEqual(blocked.map(s=>s.id),[],`${item.id} buried`);
 }
 for(const c of w.CHECKPOINTS)assert.ok(!g.solids.some(s=>penetrates(c,s)),`${c.id} blocked`);
 assert.equal(new Set([...w.KEYS,...w.STARS,...w.BONES].map(x=>x.id)).size,w.KEYS.length+w.STARS.length+w.BONES.length);
});

for(let level=1;level<5;level++)for(const difficulty of Object.keys(DIFFICULTIES))for(const hz of [15,60])test(`world ${level+1}: complete using inputs, ${difficulty}, ${hz}Hz`,()=>{
 const g=new Adventure3D(null,{level,difficulty});g.start();newRescueRoute(g,hz);fightBoss(g,hz);assert.equal(g.rescued.size,3);assert.ok(g.player.hp>0);
});

test('campaign advances one level, preserves per-world progress and finishes at five',()=>{
 let g=new Adventure3D();assert.equal(g.unlocked,1);assert.equal(g.selectLevel(4),false);
 for(let level=0;level<5;level++){
  assert.equal(g.level,level);for(const k of g.world.KEYS)g.collected.add(k.id);for(const f of g.world.FRIENDS)g.rescued.add(f.id);g.boss.hp=0;g.boss.state='defeated';g.secrets.add(`egg-${level}-0`);
  g=new Adventure3D(g.snapshot());assert.equal(g.level,level);assert.equal(g.boss.hp,0);assert.equal(g.advance(),level<4);
 }
 assert.equal(g.unlocked,5);assert.equal(g.secrets.size,5);assert.equal(g.selectLevel(0),true);assert.equal(g.rescued.size,3);assert.equal(g.boss.hp,0);assert.equal(g.selectLevel(4),true);
});
test('version 3 save migrates to campaign and unlocks level two after a prior win',()=>{
 const g=new Adventure3D({version:3,difficulty:'hard',collected:['village-key','forest-key','sky-key','bone-0'],rescued:['peach','spark','fluff'],checkpoint:'boss',won:true});
 assert.equal(g.unlocked,2);assert.equal(g.boneCount,1);assert.equal(g.snapshot().version,4);assert.ok(g.advance());assert.equal(g.difficulty,'hard');assert.equal(g.rescued.size,0);assert.equal(g.selectLevel(0),true);assert.equal(g.boneCount,1);
});
test('malformed campaign data cannot unlock worlds or create fake secrets',()=>{
 const g=new Adventure3D({version:4,level:4,progress:{3:{won:true}},secrets:['bad','egg-9-0','egg-0-1','egg-0-1']});assert.equal(g.level,0);assert.equal(g.unlocked,1);assert.deepEqual([...g.secrets],['egg-0-1']);
});
test('all ten secrets are discoverable once by E, persist, and remain optional',()=>{
 for(let level=0;level<5;level++){const g=new Adventure3D(null,{level});g.start();for(const e of g.world.EGGS){Object.assign(g.player,{x:e.x,y:e.y,z:e.z});g.tick(1/60,{interact:true});assert.ok(g.secrets.has(e.id));g.interact();assert.equal(g.events.filter(v=>v.type==='secret').length,g.secrets.size);}assert.equal(g.rescued.size,0);assert.equal(g.boss.hp,g.rules.bossHP);}
});
test('lava hurts on contact, can be cleared above it, and respects invulnerability',()=>{
 const g=new Adventure3D(null,{level:3});g.start();Object.assign(g.player,{x:-12,z:14});g.tick(1/60);assert.equal(g.player.hp,4);g.tick(1/60);assert.equal(g.player.hp,4);Object.assign(g.player,{x:-12,z:14,y:3,invuln:0});g.tick(1/60);assert.equal(g.player.hp,4);
});
test('each boss has a larger solid footprint and stays solid while resting',()=>{
 for(let level=0;level<5;level++){const g=new Adventure3D(null,{level});g.start();for(const f of g.world.FRIENDS)g.rescued.add(f.id);g.solids=g.world.solidsFor(g.rescued);Object.assign(g.boss,{state:'rest',timer:100});Object.assign(g.player,{x:0,y:1.2,z:-65});for(let i=0;i<120;i++)g.tick(1/60,{z:-1,dash:i===0});assert.ok(Math.hypot(g.player.x-g.boss.x,g.player.z-g.boss.z)>=g.bossRadius+.47);assert.ok(g.bossHeight>8);}
 assert.equal(new Set(LEVELS.map(l=>l.boss)).size,5);
});
test('camera beside every giant stays outside its body during a full orbit',()=>{
 for(let level=0;level<5;level++){const g=new Adventure3D(null,{level}),b=g.boss,s={shape:'cylinder',x:b.x,z:b.z,radius:g.bossRadius,bottom:b.y,top:b.y+g.bossHeight};
  const target={x:0,y:b.y+3.7,z:b.z+g.bossRadius+.49};
  for(let i=0;i<360;i+=5){const a=i*Math.PI/180,end={x:target.x+Math.sin(a)*24,y:target.y+10,z:target.z+Math.cos(a)*24},actual=safeCamera(target,end,[s]);assert.equal(segmentHit(target,actual,s),null,`world ${level}, angle ${i}`);}
 }
});
test('uncompleted early world cannot be bypassed by a later completed record',()=>{
 const won={won:true,collected:['village-key','forest-key','sky-key'],rescued:['peach','spark','fluff']};const g=new Adventure3D({version:4,level:4,progress:{3:won}});assert.equal(g.level,0);assert.equal(g.unlocked,1);
});
test('new-world spawn remains safe while a child reads the controls',()=>{
 for(let level=1;level<5;level++){const g=new Adventure3D(null,{level,difficulty:'hard'});g.start();for(let i=0;i<900;i++)g.tick(1/30);assert.equal(g.player.hp,g.maxHP);assert.equal(g.status,'playing');}
});
