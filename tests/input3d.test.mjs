import test from 'node:test';
import assert from 'node:assert/strict';
import {readPad,deadzone,BUTTON,RUMBLE} from '../input3d.js';
import {SFX} from '../audio3d.js';
const pad=(axes=[0,0,0,0],down=[])=>({axes,buttons:Array.from({length:17},(_,i)=>({pressed:down.includes(i)}))});
test('sticks ignore drift, reach full speed, and the D-pad moves too',()=>{
 assert.equal(deadzone(.1),0);assert.equal(deadzone(1),1);assert.equal(deadzone(-1),-1);assert.ok(deadzone(.5)>0&&deadzone(.5)<.5);
 const r=readPad(pad([.05,-1,.6,0]));assert.equal(r.x,0);assert.equal(r.z,-1);assert.ok(r.camX>0);
 const d=readPad(pad([0,0,0,0],[BUTTON.RIGHT,BUTTON.UP]));assert.equal(d.x,1);assert.equal(d.z,-1);
 assert.equal(readPad(pad([1,0,0,0],[BUTTON.RIGHT])).x,1,'stick plus D-pad is clamped');
});
test('buttons fire once per press while A held keeps gliding',()=>{
 const first=readPad(pad([0,0,0,0],[BUTTON.A,BUTTON.X]));assert.equal(first.jump,true);assert.equal(first.bark,true);assert.equal(first.glide,true);
 const held=readPad(pad([0,0,0,0],[BUTTON.A,BUTTON.X]),first.pressed);assert.equal(held.jump,false);assert.equal(held.bark,false);assert.equal(held.glide,true);
 assert.equal(readPad(pad([0,0,0,0],[BUTTON.RT])).dash,true);assert.equal(readPad(pad([0,0,0,0],[BUTTON.Y])).interact,true);assert.equal(readPad(pad([0,0,0,0],[BUTTON.START])).pause,true);
 assert.equal(readPad(pad([0,0,0,0],[BUTTON.DOWN])).focus,1);assert.equal(readPad(pad([0,0,0,0],[BUTTON.UP])).focus,-1);
 assert.equal(readPad(null).x,0,'a missing pad reads as idle');
});
test('rumble strengths are sane and cover events that make sounds',()=>{
 for(const [type,[strength,ms]] of Object.entries(RUMBLE)){assert.ok(strength>0&&strength<=1);assert.ok(ms>=60&&ms<=600);assert.ok(SFX[type],`${type} also has a sound`);}
});
