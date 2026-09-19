import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Adventure3D} from '../adventure3d.js';

test('all player-facing source and guides use English without broken encoding',()=>{
 for(const file of ['index.html','classic/index.html','game3d.js','drawing3d.js','audio3d.js','wardrobe3d.js','input3d.js','settings3d.js','stories3d.js','voice3d.js','multiplayer3d.js','game.js','adventure3d.js','campaign3d.js','world3d.js','levels.js','engine.js','README.md','classic/README.md','docs/Super-Dog-3D-Guide.md']){
  const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(text,/[\u0400-\u04ff]|\uFFFD|\?{3,}/,file);
  if(file.endsWith('.html'))assert.match(text,/<html lang="en">/,file);
 }
 const source=readFileSync(new URL('../game3d.js',import.meta.url),'utf8');
 assert.ok(source.includes("showModal('Secret found!'"));
 assert.ok(source.includes("'Keep exploring'"));
 for(let level=0;level<5;level++){
  const game=new Adventure3D(null,{level});game.start();
  for(const secret of game.world.EGGS){Object.assign(game.player,{x:secret.x,y:secret.y,z:secret.z});game.interact();const event=game.events.find(e=>e.type==='secret'&&e.text.startsWith(secret.name+':'));assert.ok(event,secret.id);assert.doesNotMatch(event.text,/[\u0400-\u04ff]|\uFFFD|\?{3,}/);}
 }
});
