import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseDrawing,coverRect,containRect,knockOutPaper,hasInk,inkBounds,studioMarkup,CRAYONS,MAX_IMAGE_LENGTH} from '../drawing3d.js';
const png='data:image/png;base64,iVBORw0KGgo=';
test('stored drawings are validated before they reach a texture',()=>{
 assert.deepEqual(parseDrawing(JSON.stringify({image:png})),{image:png,cape:true,flags:true});
 assert.deepEqual(parseDrawing({image:png,cape:false,flags:true}),{image:png,cape:false,flags:true});
 for(const bad of [null,'','{broken',JSON.stringify({image:'javascript:alert(1)'}),JSON.stringify({image:'data:image/svg+xml;base64,PHN2Zz4='}),JSON.stringify({image:png+'A'.repeat(MAX_IMAGE_LENGTH)})])assert.equal(parseDrawing(bad),null);
});
test('photos are center-cropped to a square and drawings fit their surface without stretching',()=>{
 assert.deepEqual(coverRect(400,200,256,256),{sx:100,sy:0,sw:200,sh:200});
 const r=containRect(256,256,288,168,10);assert.equal(r.w,148);assert.equal(r.h,148);assert.equal(r.x,70);assert.equal(r.y,10);
});
test('paper in a photo turns transparent while pencil lines and crayon colors stay',()=>{
 const px=[];const add=(r,g,b,n)=>{for(let i=0;i<n;i++)px.push(r,g,b,255);};
 add(196,190,178,700);add(40,40,45,150);add(220,60,60,150);// dim yellowish paper, pencil, red crayon
 const data=new Uint8ClampedArray(px);const kept=knockOutPaper(data);
 assert.equal(data[3],0,'paper removed');assert.equal(data[700*4+3],255,'pencil kept');assert.equal(data[850*4+3],255,'crayon kept');assert.equal(kept,300);
 assert.equal(hasInk(new Uint8ClampedArray(16)),false);assert.equal(hasInk(data),true);
});
test('studio markup offers big crayons and never needs text from storage',()=>{
 const html=studioMarkup(true);assert.equal((html.match(/data-color=/g)||[]).length,CRAYONS.length);assert.match(html,/Remove my drawing/);assert.doesNotMatch(studioMarkup(false),/Remove my drawing/);
 const css=readFileSync(new URL('../style3d.css',import.meta.url),'utf8');assert.match(css,/\.crayons button\{width:44px;height:44px/);
});
test('a small doodle is cropped to its ink so it fills the cape',()=>{
 const w=20,h=10,data=new Uint8ClampedArray(w*h*4);for(const [x,y] of [[5,3],[9,6]])data[(y*w+x)*4+3]=255;
 assert.deepEqual(inkBounds(data,w,h,1),{x:4,y:2,w:7,h:6});assert.deepEqual(inkBounds(new Uint8ClampedArray(w*h*4),w,h),{x:0,y:0,w,h});
});
