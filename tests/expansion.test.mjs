import test from 'node:test';
import assert from 'node:assert/strict';
import { Adventure, GROUND, WORLDS, makeLevel } from '../engine.js';
const run=(stage=0)=>{const g=new Adventure();g.start();g.unlocked=stage;g.loadLevel(stage);return g;};
const step=(g,n,input={})=>{for(let i=0;i<n;i++)g.tick(1/60,input);};

test('double jump grants one extra jump and recharges on landing',()=>{
 const g=run();g.tick(1/60,{jumpPressed:true,jumpHeld:true});step(g,20,{jumpHeld:true});
 g.tick(1/60,{jumpPressed:true,jumpHeld:true});assert.ok(g.player.vy< -500);assert.equal(g.player.airJump,false);
 step(g,5,{jumpHeld:true});const velocity=g.player.vy;g.tick(1/60,{jumpPressed:true,jumpHeld:true});assert.ok(g.player.vy>velocity);
 step(g,90);assert.equal(g.player.grounded,true);g.tick(1/60,{});assert.equal(g.player.airJump,true);
});
test('dash gives a short burst and cannot be spammed',()=>{
 const g=run();const x=g.player.x;g.tick(1/60,{right:true,dashPressed:true});step(g,9,{right:true,dashPressed:true});
 assert.ok(g.player.x-x>110);assert.ok(g.player.dashCooldown>.8);step(g,25);assert.equal(g.player.dashTime,0);
});
test('shield absorbs one hit and pickups expire',()=>{
 const g=run();const shield=g.level.pickups.find(p=>p.kind==='shield');g.collect(shield);assert.equal(g.player.shield,20);
 g.hurt();assert.equal(g.player.hp,g.maxHp);assert.equal(g.player.shield,0);g.player.invuln=0;g.hurt();assert.equal(g.player.hp,g.maxHp-1);
 const magnet=g.level.pickups.find(p=>p.kind==='magnet');g.collect(magnet);step(g,1000);assert.equal(g.player.magnet,0);
});
test('magnet attracts nearby bones without duplicating them',()=>{
 const g=run();const bone=g.level.bones[0];g.player.x=bone.x-100;g.player.y=bone.y;g.player.magnet=10;
 const before=bone.x;g.tick(1/60,{});assert.ok(bone.x<before);
});
test('spring launches higher than a normal jump',()=>{
 const g=run();const s=g.level.springs[0];g.player.x=s.x;g.tick(1/60,{});assert.ok(g.player.vy< -850);assert.equal(g.player.grounded,false);
});
test('moving platforms carry the hero without sliding off',()=>{
 const g=run(3);g.tick(1/60,{});const f=g.level.platforms.find(p=>p.moving);
 g.player.x=f.x+40;g.player.y=f.y-g.player.h;g.player.standing=f;g.player.grounded=true;
 const offset=g.player.x-f.x;step(g,90);assert.ok(Math.abs((g.player.x-f.x)-offset)<1);assert.equal(g.player.grounded,true);
});
test('bark opens chests once and frees friends from cages',()=>{
 const g=run();g.level.enemies=[];const c=g.level.chests[0];g.player.x=c.x-160;g.player.y=GROUND-g.player.h;step(g,45,{bark:true});assert.equal(c.opened,true);assert.ok(g.found.has(c.id));
 const after=g.score;step(g,30,{bark:true});assert.equal(g.score,after);
 const f=g.level.friend;g.player.x=f.x-140;g.player.y=f.y+3;g.player.vy=0;g.player.barkCooldown=0;
 // A shot across the platform reaches the cage while the hero falls onto it.
 g.shots.push({x:f.x-20,y:f.y+20,w:28,h:25,dir:1,life:.8});g.tick(1/60,{});assert.equal(f.rescued,true);assert.equal(g.friendCount,1);
});
test('save restores checkpoints, collection, rescue and world unlocks',()=>{
 const g=run(3);g.spawnX=g.level.checkpoints[1];g.found.add(g.level.friend.id);g.found.add(g.level.chests[0].id);g.found.add(g.level.stars[0].id);g.collected.add(g.level.bones[0].id);g.completed.add(2);g.defeated.add(2);
 const restored=new Adventure();assert.equal(restored.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);
 assert.equal(restored.stage,3);assert.equal(restored.player.x,g.spawnX);assert.equal(restored.score,6);assert.equal(restored.friendCount,1);assert.equal(restored.starCount,1);assert.equal(restored.level.friend.rescued,true);assert.equal(restored.level.chests[0].opened,true);
 assert.equal(restored.visit(4),false);assert.equal(restored.visit(2),true);assert.equal(restored.level.boss.hp,0);
});
test('malformed saves are rejected and unsafe coordinates are ignored',()=>{
 const g=run();assert.equal(g.restore({version:2,stage:500}),false);assert.equal(g.restore(null),false);
 const save=g.snapshot();save.spawnX=99999;save.collected=['invented'];assert.equal(g.restore(save),true);assert.equal(g.player.x,80);assert.equal(g.score,0);
});
test('guardian protects the portal and defeating it does not end the campaign',()=>{
 const g=run(2);g.player.x=g.level.exit+1;g.tick(1/60,{});assert.equal(g.status,'playing');
 while(g.level.boss.hp>0){g.level.boss.invuln=0;g.hitBoss();}assert.equal(g.status,'playing');g.tick(1/60,{});assert.equal(g.status,'transition');assert.equal(g.unlocked,3);
});
test('completed final saves return to victory instead of an empty boss arena',()=>{
 const g=run(5);while(g.level.boss.hp>0){g.level.boss.invuln=0;g.hitBoss();}
 const restored=new Adventure();assert.equal(restored.restore(g.snapshot()),true);assert.equal(restored.status,'won');assert.equal(restored.visit(0),true);assert.equal(restored.status,'playing');
});
test('all checkpoints, friends and treasure chests have solid support',()=>{
 for(let i=0;i<WORLDS.length;i++){
  const l=makeLevel(i);for(const x of l.checkpoints)assert.ok(l.platforms.some(p=>p.ground&&x>=p.x&&x+46<p.x+p.w),`checkpoint world ${i}`);
  for(const c of [...l.chests,...(l.friend?[l.friend]:[])])assert.ok(l.platforms.some(p=>c.x>=p.x&&c.x+c.w<=p.x+p.w&&Math.abs(c.y+c.h-p.y)<2),`object ${c.id}`);
 }
});
test('the complete six world adventure can be finished with player inputs',()=>{
 const g=run();
 for(let world=0;world<WORLDS.length;world++){
  for(let frame=0;frame<60*70&&g.status==='playing';frame++){
   const p=g.player,b=g.level.boss;
   const edge=g.level.platforms.find(f=>f.ground&&p.x>=f.x&&p.x<f.x+f.w);
   const gap=p.grounded&&edge&&edge.x+edge.w<g.level.length&&edge.x+edge.w-p.x<105;
   const danger=g.venom.some(v=>v.x>p.x&&v.x-p.x<180&&Math.abs(v.y-p.y)<85);
   g.tick(1/60,{right:!b||b.hp<=0||p.x<b.home-290,bark:true,jumpHeld:true,jumpPressed:gap||(p.grounded&&danger)});
  }
  assert.equal(g.status,world===5?'won':'transition',`world ${world}: x=${g.player.x} hearts=${g.player.hp}`);
  if(world<5)g.next();
 }
 assert.equal(g.completed.size,6);assert.equal(g.defeated.size,2);
});
