import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSettings,DEFAULTS,FOLLOW,ZOOM,followYaw,behindYaw,wrapAngle} from '../settings3d.js';
test('settings fall back to sensible values and reject nonsense',()=>{
 assert.deepEqual(parseSettings(null),DEFAULTS);assert.deepEqual(parseSettings('{broken'),DEFAULTS);
 assert.deepEqual(parseSettings({follow:'auto',look:1.6,invertY:true,zoom:'far',effects:false,music:0,sfx:.5,hints:false,shareDrawing:true}),
  {follow:'auto',look:1.6,invertY:true,zoom:'far',effects:false,music:0,sfx:.5,hints:false,shareDrawing:true});
 assert.equal(parseSettings({}).shareDrawing,false,'a drawing is private until the player says otherwise');
 assert.equal(parseSettings({shareDrawing:'yes'}).shareDrawing,false);
 const wild=parseSettings({follow:'rocket',look:99,zoom:'moon',music:-5,sfx:'loud',invertY:'yes'});
 assert.equal(wild.follow,DEFAULTS.follow);assert.equal(wild.look,2);assert.equal(wild.zoom,DEFAULTS.zoom);assert.equal(wild.music,0);assert.equal(wild.sfx,DEFAULTS.sfx);assert.equal(wild.invertY,false);
 assert.ok(FOLLOW.off===0&&FOLLOW.gentle<FOLLOW.auto);assert.ok(ZOOM.near<ZOOM.medium&&ZOOM.medium<ZOOM.far);
});
test('the smart camera swings behind the hero without spinning the long way round',()=>{
 const facing=Math.PI;assert.equal(wrapAngle(behindYaw(facing)),0);
 let yaw=2.5;for(let i=0;i<30;i++)yaw=followYaw(yaw,facing,FOLLOW.auto,1/60);
 const halfSecond=Math.abs(wrapAngle(yaw-behindYaw(facing)));assert.ok(halfSecond<1.2&&halfSecond>.2,`half way there, not a snap: ${halfSecond}`);
 for(let i=0;i<90;i++)yaw=followYaw(yaw,facing,FOLLOW.auto,1/60);
 assert.ok(Math.abs(wrapAngle(yaw-behindYaw(facing)))<.1,`settled behind, got ${yaw}`);
 const near=followYaw(3.0,-3.0,FOLLOW.auto,1/60);assert.ok(Math.abs(wrapAngle(near-3.0))<.25,'takes the short way across the seam');
 assert.equal(followYaw(1,Math.PI,FOLLOW.off,1/60),1,'off leaves the camera alone');
 assert.equal(followYaw(1,Math.PI,FOLLOW.auto,1/60,false),1,'standing still leaves the camera alone');
 const gentle=followYaw(0,0,FOLLOW.gentle,1/60),auto=followYaw(0,0,FOLLOW.auto,1/60);
 assert.ok(Math.abs(auto)>Math.abs(gentle),'auto turns faster than gentle');
});
