import test from 'node:test';
import assert from 'node:assert/strict';
import { Adventure, GROUND, makeLevel, WORLDS, TOTAL_BONES, TOTAL_STARS } from '../engine.js';

const running = (stage = 0) => { const game = new Adventure(); game.start(); if (stage) game.loadLevel(stage); return game; };
const advance = (g, seconds, input = {}) => { for (let i = 0; i < seconds * 60; i++) g.tick(1 / 60, input); };

test('standing still is stable; movement accelerates and stops', () => {
  const g = running(); advance(g, 1); assert.equal(g.player.y + g.player.h, GROUND);
  advance(g, .5, { right: true }); assert.ok(g.player.x > 180); advance(g, .3); assert.equal(g.player.vx, 0);
});
test('held jumps reach a 110px ledge and land on its top', () => {
  const g = running(); g.player.x = 405; g.tick(1/60, {jumpPressed:true,jumpHeld:true});
  let top=g.player.y; for(let i=0;i<60;i++){g.tick(1/60,{jumpHeld:true});top=Math.min(top,g.player.y);}
  assert.ok(top < 348); assert.equal(g.player.y + g.player.h, 410); assert.equal(g.player.grounded,true);
});
test('releasing jump makes a shorter jump', () => {
  const height = held => { const g=running(); g.tick(1/60,{jumpPressed:true,jumpHeld:true});let top=g.player.y;for(let i=0;i<50;i++){g.tick(1/60,{jumpHeld:held});top=Math.min(top,g.player.y);}return top; };
  assert.ok(height(true) < height(false) - 35);
});
test('jump grace allows takeoff shortly after leaving an edge', () => {
  const g=running();g.player.x=853;g.player.vx=310;g.tick(1/60,{right:true});g.tick(1/60,{right:true});
  assert.equal(g.player.grounded,false);g.tick(1/60,{right:true,jumpPressed:true,jumpHeld:true});assert.ok(g.player.vy < -500);
});
test('fall costs one heart and returns to a safe checkpoint', () => {
  const g=running();g.player.x=1440;g.tick(1/60,{});assert.equal(g.spawnX,1430);
  g.player.x=1900;g.player.y=810;g.tick(1/60,{});assert.equal(g.player.hp,g.maxHp-1);assert.equal(g.player.x,1430);assert.equal(g.player.y+g.player.h,GROUND);
});
test('damage grace prevents repeated loss; retry restores lives', () => {
  const g=running();g.hurt();g.hurt();assert.equal(g.player.hp,g.maxHp-1);
  for(let i=0;i<g.maxHp;i++)g.hurt(true);assert.equal(g.status,'dead');g.retry();assert.equal(g.status,'playing');assert.equal(g.player.hp,g.maxHp);
});
test('each bone counts once, including after a retry', () => {
  const g=running();const b=g.level.bones[0];g.player.x=b.x;g.player.y=b.y;g.tick(1/60,{});assert.equal(g.score,1);
  g.retry();g.player.x=b.x;g.player.y=b.y;g.tick(1/60,{});assert.equal(g.score,1);
});
test('bark defeats a snake from a distance', () => {
  const g=running();g.player.x=420;advance(g,.7,{bark:true});assert.equal(g.level.enemies[0].alive,false);assert.equal(g.player.hp,g.maxHp);
});
test('pause freezes simulation', () => {
  const g=running();g.status='paused';const before=JSON.stringify(g.player);advance(g,2,{right:true,jumpPressed:true,bark:true});assert.equal(JSON.stringify(g.player),before);
});
test('all platform gaps are passable with normal movement at 30, 60 and 120 fps', () => {
  for(const fps of [30,60,120])for(const stage of [0,1,3,4]){
    const g=running(stage);
    for(let i=0;i<fps*40 && g.status==='playing';i++){
      const p=g.player;
      const edge=g.level.platforms.find(f=>f.ground&&p.x>=f.x&&p.x<f.x+f.w);
      const jump=p.grounded&&edge&&edge.x+edge.w<g.level.length&&edge.x+edge.w-p.x<105;
      g.tick(1/fps,{right:true,bark:true,jumpHeld:true,jumpPressed:jump});
    }
    assert.equal(g.status,'transition',`stage ${stage}, ${fps} fps, x=${g.player.x}, hp=${g.player.hp}`);
  }
});
test('portals retain collected bones and restore health in the next world', () => {
  const g=running();g.score=4;g.player.x=g.level.exit+1;g.tick(1/60,{});assert.equal(g.status,'transition');
  g.next();assert.equal(g.stage,1);assert.equal(g.score,4);assert.equal(g.player.hp,g.maxHp);
});
test('twelve separate king hits win; invulnerability prevents duplicate hits', () => {
  const g=running(5);g.hitBoss();g.hitBoss();assert.equal(g.level.boss.hp,11);
  for(let i=0;i<11;i++){g.level.boss.invuln=0;g.hitBoss();}
  assert.equal(g.status,'won');assert.equal(g.level.boss.hp,0);assert.equal(g.venom.length,0);
});
test('bone identifiers are unique across all worlds', () => {
  const levels=WORLDS.map((_,i)=>makeLevel(i));const ids=levels.flatMap(l=>l.bones.map(b=>b.id));assert.ok(ids.length>300);assert.equal(new Set(ids).size,ids.length);assert.equal(TOTAL_BONES,ids.length+levels.reduce((n,l)=>n+l.chests.length*5,0));assert.equal(TOTAL_STARS,18);
});
test('boss can be defeated with normal running, jumping and barking at each frame rate', () => {
  for(const fps of [30,60,120]){
    const g=running(5);
    for(let i=0;i<fps*40&&g.status==='playing';i++){
      const p=g.player;
      const danger=g.venom.some(v=>v.x>p.x&&v.x-p.x<180&&Math.abs(v.y-p.y)<85);
      g.tick(1/fps,{right:p.x<g.level.boss.home-290,bark:true,jumpHeld:true,jumpPressed:p.grounded&&danger});
    }
    assert.equal(g.status,'won',`boss at ${fps} fps`);assert.ok(g.player.hp>0);
  }
});
