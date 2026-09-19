import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out=new URL('./.visual/3d/',import.meta.url);await mkdir(out,{recursive:true});
let html=await readFile(new URL('../index.html',import.meta.url),'utf8');
html=html.replace('./style3d.css','../../../style3d.css').replace('./favicon.svg','../../../favicon.svg').replace('./classic/index.html','../../../classic/index.html');
html=html.replace(/<script>if\('serviceWorker'[^<]*<\/script>\s*/,'');  // the QA page is not the installable app
await writeFile(new URL('index.html',out),html);
let source=await readFile(new URL('../game3d.js',import.meta.url),'utf8');
// Every path the page loads is relative to the game folder, so rewrite them all at once:
// a hand-kept list silently 404s the day a new module is added.
// Rewrite every path the page loads in one pass: a hand-kept list silently 404s the day a new
// module is added. The QA page also gets its own save keys and the extra bindings it drives.
source=source.replace(/(from\s*['"])\.\/([^'"]+)(['"])/g,'$1../../../$2$3')
 .replace(/(['"`])\.\/assets\//g,'$1../../../assets/')
 .replaceAll('superdog-island-3d-v3','superdog-qa-3d').replaceAll('superdog-island-3d-v4','superdog-qa-3d-v4')
 .replaceAll('superdog-drawing-v1','superdog-qa-drawing').replaceAll('superdog-settings-v1','superdog-qa-settings')
 .replaceAll('superdog-sound','superdog-qa-sound').replaceAll('superdog-read-aloud','superdog-qa-read-aloud')
 .replaceAll('superdog-name','superdog-qa-name')
 .replace('const game=new Adventure3D(save);','let game=new Adventure3D(save);')
 .replace('SPAWN,TREES,PROPS,ROCKS','SPAWN,TREES,PROPS,ROCKS,solidsFor');
source=source.replace('const x=(pressed','let x=(pressed').replace('  // Fixed maximum physics step prevents tunnelling on slower devices.','  const qa=qaInput();if(qa){x=qa.x;z=qa.z;actions={...actions,...qa};}\n  // QA uses the production frame input path.');
source+='\n'+await readFile(new URL('./playtest-controls.js',import.meta.url),'utf8');
source=source.replace('function frame(now){requestAnimationFrame(frame);','function frame(now){qaCountFrame(now);requestAnimationFrame(frame);');
source=source.replace('let game=new Adventure3D(save);',`const qaLevel=Number(new URLSearchParams(location.search).get('level')||0);let game=new Adventure3D(save,{level:qaLevel});if(new URLSearchParams(location.search).has('level'))game=new Adventure3D(null,{level:qaLevel});`);
source=source.replace('game=new Adventure3D(null,{difficulty});','game=new Adventure3D(null,{difficulty,level:qaLevel});').replace('game.solids=solidsFor(game.rescued);','game.solids=game.world.solidsFor(game.rescued);');
source=source.replace('<option value="start">Start</option>','<option value="start">Start</option><option value="secret">Easter egg</option><option value="victory">Victory</option>');
source=source.replace('const qaScenes={start:', 'const qaScenes={secret:[-43,0,36],victory:[0,1.2,-64],start:');
source=source.replace("if(id==='boss'||id==='bridge')", "if(id==='boss'||id==='bridge'||id==='victory')");
source=source.replace("if(id==='loss')game.player.hp=1;", "if(id==='victory'){game.boss.hp=0;game.boss.state='defeated';game.emit('won');}if(id==='loss')game.player.hp=1;");
source=source.replace('const theme=game.world.meta;',`for(let i=0;i<game.level;i++)game.progress[i]={won:true,collected:['village-key','forest-key','sky-key'],rescued:['peach','spark','fluff']};const theme=game.world.meta;`);
source=source.replace('qaDrive=null;launch();',`for(let i=0;i<game.level;i++)game.progress[i]={won:true,collected:['village-key','forest-key','sky-key'],rescued:['peach','spark','fluff']};qaDrive=null;launch();`);
source=source.replace("sessionStorage.setItem('superdog-autostart','1');location.reload();", "sessionStorage.setItem('superdog-autostart','1');location.href='./index.html';");
await writeFile(new URL('game3d.js',out),source);
console.log('Isolated playtest: http://localhost:5173/tests/.visual/3d/index.html?scene=tree');
