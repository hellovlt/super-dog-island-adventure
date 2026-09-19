import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure3D} from '../adventure3d.js';
// Jump from open ground at spawn and hold forward; optionally hold jump to glide once falling.
function flight(g,glide){const start=g.player.z;g.tick(1/60,{jump:true,z:-1});let frames=0,minVy=0;while(!g.player.grounded||frames<2){g.tick(1/60,{z:-1,glide});minVy=Math.min(minVy,g.player.vy);if(++frames>600)break;}return {frames,distance:start-g.player.z,minVy};}
test('the cape glide stays locked until the first giant is beaten',()=>{
 const g=new Adventure3D();g.start();assert.equal(g.gliderUnlocked,false);const f=flight(g,true);assert.ok(f.minVy<-6,'falls normally');assert.equal(g.events.some(e=>e.type==='glide'),false);
 g.boss.hp=0;assert.equal(g.gliderUnlocked,true);assert.equal(new Adventure3D(null,{level:2}).gliderUnlocked,true);
});
test('gliding slows the fall, carries Super Dog further, and ends on landing',()=>{
 const plain=new Adventure3D(null,{level:1});plain.start();const walk=flight(plain,false);
 const glider=new Adventure3D(null,{level:1});glider.start();const glide=flight(glider,true);
 assert.ok(glide.minVy>=-2.41,`fall capped, got ${glide.minVy}`);assert.ok(glide.frames>walk.frames*1.5,'stays in the air longer');assert.ok(glide.distance>walk.distance*1.8,`${glide.distance} vs ${walk.distance}`);
 assert.equal(glider.events.filter(e=>e.type==='glide').length,1);assert.equal(glider.player.gliding,false);
});
test('dash and a second jump still work while gliding',()=>{
 const g=new Adventure3D(null,{level:1});g.start();g.tick(1/60,{jump:true});for(let i=0;i<30;i++)g.tick(1/60,{glide:true});assert.equal(g.player.gliding,true);
 g.tick(1/60,{glide:true,jump:true});assert.ok(g.player.vy>5,'double jump from a glide');assert.equal(g.player.gliding,false);
 for(let i=0;i<40;i++)g.tick(1/60,{glide:true});g.tick(1/60,{glide:true,dash:true});assert.equal(g.player.gliding,false);assert.ok(g.player.dash>0);
});
