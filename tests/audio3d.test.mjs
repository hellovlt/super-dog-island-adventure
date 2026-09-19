import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {musicPattern,WORLD_MUSIC,SFX,midiToHz} from '../audio3d.js';
test('each world has its own repeatable eight-bar tune that stays in its key',()=>{
 const tunes=WORLD_MUSIC.map((_,level)=>musicPattern(level));
 tunes.forEach((song,level)=>{
  assert.deepEqual(song,musicPattern(level),'deterministic');
  const m=WORLD_MUSIC[level],lead=song.notes.filter(n=>n.voice==='lead');
  assert.equal(song.steps,128);assert.ok(lead.length>=24,'enough melody');assert.equal(song.notes.filter(n=>n.voice==='bass').length,16);
  for(const n of song.notes){assert.ok(n.step>=0&&n.step+n.len<=song.steps+6);assert.ok(m.scale.includes((((n.midi-m.root)%12)+12)%12)||n.voice==='bass','melody in scale');}
  assert.ok(lead.every(n=>midiToHz(n.midi)>150&&midiToHz(n.midi)<2000),'comfortable range');
 });
 assert.equal(new Set(tunes.map(t=>JSON.stringify(t.notes.slice(0,12)))).size,5,'worlds sound different');
});
test('every gameplay event that should be heard has a sound effect',()=>{
 const sim=readFileSync(new URL('../adventure3d.js',import.meta.url),'utf8');
 const events=new Set([...sim.matchAll(/emit\('([a-zA-Z]+)'/g)].map(m=>m[1]));
 for(const quiet of ['hint','difficulty'])events.delete(quiet);
 for(const type of [...events,'coin','key','star','land'])assert.equal(typeof SFX[type],'function',type);
});
