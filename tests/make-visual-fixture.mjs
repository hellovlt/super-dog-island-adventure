// A local visual QA copy with separate storage. Does not alter campaign saves.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const out=new URL('./.visual/',import.meta.url);
await mkdir(out,{recursive:true});
let html=await readFile(new URL('../classic/index.html',import.meta.url),'utf8');
html=html.replace('../style.css','../../style.css').replace('../favicon.svg','../../favicon.svg').replace('../game.js','./game.js');
await writeFile(new URL('index.html',out),html);
let source=await readFile(new URL('../game.js',import.meta.url),'utf8');
source=source.replace("'./engine.js'","'../../engine.js'").replaceAll('superdog-adventure-v2','superdog-qa-v2').replaceAll('superdog-best','superdog-qa-best');
source+=`\nconst scenario=new URLSearchParams(location.search);game.start();game.unlocked=5;game.visit(Number(scenario.get('stage')||0));game.player.x=Number(scenario.get('x')||80);game.camera=Math.max(0,game.player.x-width*.31);enterGame();\n`;
await writeFile(new URL('game.js',out),source);
console.log('Visual fixture: http://localhost:5173/tests/.visual/index.html?stage=2');
