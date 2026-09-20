import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {STORIES,STORY_COUNT,storyText,isStoryOpen,storiesForLevel} from '../stories3d.js';
import {parseManifest,captionForSound,SOUND_CAPTIONS,lineId,createVoice} from '../voice3d.js';
import {voiceInventory} from '../tools/voice-lines.mjs';
const manifest=JSON.parse(readFileSync(new URL('../assets/voice/manifest.json',import.meta.url),'utf8'));
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,16);

test('the story book holds twenty stories that open as the adventure is played',()=>{
 assert.equal(STORIES.length,STORY_COUNT);assert.equal(new Set(STORIES.map(s=>s.id)).size,STORY_COUNT);
 for(const story of STORIES){
  assert.ok(story.lines.length>=3&&story.lines.length<=5,`${story.id} is a few short lines`);
  assert.ok(storyText(story).length<400,`${story.id} stays under twenty seconds of reading`);
  assert.ok(story.title.length<34&&/^[A-Z]/.test(story.title),`${story.id} has a proper title`);
  assert.doesNotMatch(storyText(story),/[Ѐ-ӿ]|�/,`${story.id} is English`);
 }
 for(let level=0;level<5;level++)assert.equal(storiesForLevel(level).length,4,'one world story, two secrets, one victory');
 const fresh={unlocked:1,secrets:new Set(),progress:{},level:0};
 assert.equal(isStoryOpen(STORIES[0],fresh),true,'the first world story greets a new player');
 assert.equal(STORIES.filter(s=>isStoryOpen(s,fresh)).length,1,'nothing else is given away');
 const finished={unlocked:5,secrets:new Set(STORIES.filter(s=>s.egg).map(s=>s.egg)),progress:{0:{won:true},1:{won:true},2:{won:true},3:{won:true},4:{won:true}},level:4};
 assert.equal(STORIES.filter(s=>isStoryOpen(s,finished)).length,STORY_COUNT,'a finished adventure opens them all');
});
test('every spoken line has a recording that matches the words on screen',()=>{
 const lines=voiceInventory();
 assert.ok(lines.length>=70,`${lines.length} lines are recorded`);
 for(const line of lines){
  const entry=manifest.lines[line.id];
  assert.ok(entry,`${line.id} has no recording: run node tools/make-voice.mjs`);
  assert.equal(entry.hash,hash(line.text),`${line.id} was re-worded after recording: run node tools/make-voice.mjs`);
  const file=new URL('../assets/voice/'+entry.file,import.meta.url);
  assert.ok(existsSync(file),`${entry.file} is missing`);
  assert.ok(statSync(file).size>1200,`${entry.file} is too small to be speech`);
  assert.equal(readFileSync(file).subarray(0,3).toString(),'ID3',`${entry.file} is an mp3`);
 }
 assert.equal(Object.keys(manifest.lines).length,lines.length,'no stale recordings left behind');
});
test('a broken manifest never reaches the player, and sounds have captions',()=>{
 assert.deepEqual(parseManifest('not json'),{voice:null,lines:{}});
 assert.deepEqual(parseManifest({lines:{bad:{file:'../secrets.txt',text:'x'}}}).lines,{},'only plain mp3 names are used');
 assert.equal(parseManifest(JSON.stringify(manifest)).lines['story-world-0'].file,'story-world-0.mp3');
 const sim=readFileSync(new URL('../adventure3d.js',import.meta.url),'utf8');
 const events=new Set([...sim.matchAll(/emit\('([a-zA-Z]+)'/g)].map(m=>m[1]));
 for(const quiet of ['hint','difficulty','talk'])events.delete(quiet);
 for(const type of events)assert.ok(captionForSound(type),`${type} has a caption for players who cannot hear`);
 assert.equal(captionForSound('nothing-like-this'),null);
 assert.ok(Object.keys(SOUND_CAPTIONS).length>=15);
});
test('recorded lines play, and silence still shows the words',()=>{
 const captions=[];let played=null;
 globalThis.Audio=class{constructor(src){this.src=src;played=src;}play(){return Promise.resolve();}pause(){}};
 const voice=createVoice({manifest:parseManifest(JSON.stringify(manifest)),onCaption:t=>captions.push(t),enabled:()=>true,volume:()=>1});
 assert.equal(voice.has(lineId.story('story-world-0')),true);
 voice.speak('story-world-0','Once upon a time');
 assert.match(played,/story-world-0\.mp3$/);assert.deepEqual(captions,['Once upon a time']);
 const muted=createVoice({manifest:{lines:{}},onCaption:t=>captions.push(t),enabled:()=>false});
 assert.equal(muted.speak('nope','Subtitles still appear'),false,'reading aloud is off');
 assert.equal(captions.at(-1),'Subtitles still appear','but the words are still shown');
 const pressed=createVoice({manifest:parseManifest(JSON.stringify(manifest)),onCaption:t=>captions.push(t),enabled:()=>false,volume:()=>1});
 assert.equal(pressed.speak('story-world-0',null,{force:true}),true,'a button the child pressed always plays');
 delete globalThis.Audio;
});
test('the recorded voice is on from the first launch',()=>{
 const ui=readFileSync(new URL('../game3d.js',import.meta.url),'utf8');
 assert.match(ui,/localStorage\.getItem\(READ_STORAGE\)!=='off'/,'only an explicit off keeps it quiet');
 assert.match(ui,/catch\{return true;\}\}\)\(\),speechUntil/,'and a browser with no storage still speaks');
 assert.match(ui,/const opening=inVillage\(\)\?null:STORIES\.find/,'an island story is told on the island, not in the village');
});
