// Loaded only by the generated, isolated browser QA page.
// Drives the same frame input path as the keyboard, without altering physics.
var qaDrive=null,qaLastJump=false,qaFrames=0,qaFPS=0,qaLastSample=performance.now();
function qaCountFrame(now){qaFrames++;if(now-qaLastSample>=1000){qaFPS=Math.round(qaFrames*1000/(now-qaLastSample));qaFrames=0;qaLastSample=now;}}
const qaPanel=document.createElement('aside');qaPanel.id='qaPanel';
qaPanel.style.cssText='position:absolute;bottom:75px;right:200px;z-index:9;background:#fffbedf5;color:#243e3a;border:2px solid #335b46;border-radius:12px;padding:12px;width:340px;font:12px system-ui;box-shadow:0 4px 20px #0002';
qaPanel.innerHTML=`<strong>Isolated playtest · real frame inputs</strong><p><label>Scene <select id="qaScene"><option value="start">Start</option><option value="tree">Tree trunk</option><option value="lighthouse">Lighthouse</option><option value="roof">Cage and chimney</option><option value="mushroom">Under mushroom</option><option value="sky">Sky rescue</option><option value="bridge">Bridge rail</option><option value="boss">Boss fight</option><option value="loss">One heart</option></select></label> <button id="qaLoad">Load scene</button></p><div id="qaButtons" style="display:flex;gap:5px;flex-wrap:wrap"><button data-drive="forward">Forward 2s</button><button data-drive="back">Back 2s</button><button data-drive="left">Left 2s</button><button data-drive="right">Right 2s</button><button data-drive="dash">Dash forward</button><button data-drive="jump">Double jump</button><button data-drive="stop">Stop</button></div><output id="qaReadout" style="display:block;margin-top:8px;white-space:pre-wrap"></output>`;
document.getElementById('app').append(qaPanel);
const qaStyle=document.createElement('style');qaStyle.textContent='@media(max-width:760px){#qaPanel{display:none}}';document.head.append(qaStyle);
const qaScenes={start:[0,0,32],tree:[21,0,8],lighthouse:[-39,0,-30],roof:[-24,3.8,-2.5],mushroom:[35,0,12],sky:[18,7.5,-34.5],bridge:[0,.5,-49],boss:[0,1.2,-64],loss:[15,0,14.7]};
document.getElementById('qaLoad').onclick=()=>{
 const id=document.getElementById('qaScene').value;const [x,y,z]=qaScenes[id];const difficulty=game.difficulty;
 game=new Adventure3D(null,{difficulty});Object.assign(game.player,{x,y,z});
 if(id==='roof')game.collected.add('village-key');if(id==='sky')game.collected.add('sky-key');
 if(id==='boss'||id==='bridge'){for(const f of FRIENDS)game.rescued.add(f.id);for(const k of KEYS)game.collected.add(k.id);game.solids=solidsFor(game.rescued);}
 if(id==='loss')game.player.hp=1;
 qaDrive=null;launch();yaw=0;updateDifficulty();
};
for(const b of qaPanel.querySelectorAll('[data-drive]'))b.onclick=()=>{
 const kind=b.dataset.drive;qaDrive=kind==='stop'?null:{kind,started:game.time,end:game.time+2,first:true,second:false};
 if(game.status==='paused'){game.resume();$('modal').hidden=true;}canvas.focus();
};
// Put the dog somewhere exactly, for checks that are about being there rather than getting there.
window.qaTeleport=(x,z)=>{Object.assign(game.player,{x,z,vx:0,vz:0,vy:0});return `${game.player.x},${game.player.z}`;};
function qaInput(){if(!qaDrive)return null;if(game.time>=qaDrive.end){qaDrive=null;return null;}const d=qaDrive,result={x:d.kind==='left'?-1:d.kind==='right'?1:0,z:d.kind==='back'?1:d.kind==='forward'||d.kind==='dash'?-1:0};if(d.kind==='dash'&&d.first)result.dash=true;if(d.kind==='jump'&&(d.first||(!d.second&&game.player.vy<.1&&game.player.jumps===1))){result.jump=true;if(!d.first)d.second=true;}d.first=false;return result;}
setInterval(()=>{const p=game.player;document.getElementById('qaReadout').textContent=`${game.status} | ${game.difficulty} | HP ${p.hp}/${game.maxHP}\nx ${p.x.toFixed(2)} · y ${p.y.toFixed(2)} · z ${p.z.toFixed(2)}\ngrounded ${p.grounded} · friends ${game.rescued.size}/3\nboss ${game.boss.state} ${game.boss.hp}/${game.rules.bossHP}\n${qaDrive?'Input: '+qaDrive.kind:'Input: idle'} · ${qaFPS} FPS · ${renderer.info.render.calls} draw calls`;},100);
const initialScene=new URLSearchParams(location.search).get('scene');if(initialScene&&qaScenes[initialScene]){document.getElementById('qaScene').value=initialScene;document.getElementById('qaLoad').click();}
