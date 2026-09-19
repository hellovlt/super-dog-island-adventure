import { Adventure, GROUND, WORLD_NAMES, WORLDS, TOTAL_BONES, TOTAL_STARS } from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d'), game = new Adventure();
const keys = new Set(), pressed = new Set(), particles = [];
let width = 1280, dpr = 1, last = 0, visualTime = 0, toastTimer = 0, audioCtx, sound = false, best = 0;
let helpPaused = false, savedGame = null, hudElapsed = 0;
const SAVE_KEY = 'superdog-adventure-v2';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
try { best = Number(localStorage.getItem('superdog-best') || 0); } catch { /* Private browsing can disable storage. */ }
const total = TOTAL_BONES;
try { const candidate = JSON.parse(localStorage.getItem(SAVE_KEY)); if (new Adventure().restore(candidate)) savedGame = candidate; } catch {}
$('bestScore').textContent = `Best: ${best} bones`;

document.querySelector('.chapter-grid').innerHTML = WORLDS.map((w,i)=>`<button class="chapter" data-chapter="${i}" ${i?'disabled':''}><span class="chapter-art chapter-${w.theme}">${w.icon}</span><span class="chapter-copy"><span>WORLD 0${i+1} <i>AHEAD</i></span><strong>${w.name}</strong><small>${w.description}</small><span class="chapter-stars" aria-label="Level stars">☆ ☆ ☆</span></span><span class="chapter-state">○</span></button>`).join('');
if(savedGame){$('startButton').innerHTML='Continue <span>↗</span>';$('newGameButton').hidden=false;$('savedHint').textContent=`Saved: ${WORLD_NAMES[savedGame.stage]}`;}
function saveProgress(){
  if(game.status==='menu')return;
  savedGame=game.snapshot();
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(savedGame));$('saveStatus').textContent='Adventure saved';}
  catch{$('saveStatus').textContent='Browser saving is unavailable';}
}

function resize() {
  const box = canvas.getBoundingClientRect();
  width = box.width / box.height * 650;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(650 * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resize).observe(canvas);

function tone(freq, duration = .12, type = 'sine', volume = .045, end = freq) {
  if (!sound) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain(), now = audioCtx.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(freq, now); osc.frequency.exponentialRampToValueAtTime(Math.max(end, 20), now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(now + duration);
  } catch { sound = false; updateSound(); }
}
function updateSound() {
  $('soundButton').setAttribute('aria-pressed', String(sound)); $('soundButton').setAttribute('aria-label', sound ? 'Mute sound' : 'Enable sound');
  $('soundButton').innerHTML = `<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4Z ${sound ? 'M16 8q5 4 0 8m3-11q7 7 0 14' : 'M16 9l5 6m0-6-5 6'}"/></svg>`;
}
function saveBest() {
  if (game.score > best) { best = game.score; try { localStorage.setItem('superdog-best', String(best)); } catch {} }
  $('bestScore').textContent = `Best: ${best} bones`;
}
function showToast(text) { $('toast').textContent = text; $('toast').classList.add('visible'); toastTimer = 3; }
function syncHud() {
  $('hearts').textContent = '♥ '.repeat(Math.max(0, game.player.hp)) + '♡ '.repeat(game.maxHp - Math.max(0, game.player.hp));
  $('hearts').setAttribute('aria-label', `Hearts: ${game.player.hp} of ${game.maxHp}`);
  $('score').textContent = game.score; $('totalBones').textContent = total;
  $('worldLabel').textContent = `WORLD 0${game.stage + 1}`; $('worldName').textContent = WORLD_NAMES[game.stage];
  const boss=game.level.boss;
  $('bossHud').hidden = !boss || boss.hp<=0 || game.status==='menu' || Math.abs(game.player.x-boss.x)>1100;
  if(boss){$('bossHealth').style.width=`${boss.hp/boss.maxHp*100}%`;$('bossName').textContent=boss.name.toUpperCase();$('bossWarning').textContent=boss.timer<.6?'ATTACK INCOMING — JUMP!':boss.hp<=boss.maxHp/2?'WATCH FOR A DOUBLE ATTACK':'';}
  $('starCount').textContent=`${game.starCount} / ${TOTAL_STARS}`;$('friendCount').textContent=`${game.friendCount} / 5`;
  $('routeFill').style.width=`${Math.min(100,game.player.x/game.level.exit*100)}%`;
  $('dashStatus').textContent=game.player.dashCooldown>0?`Dash ${game.player.dashCooldown.toFixed(1)} s`:'Dash ready · Shift';
  $('dashStatus').classList.toggle('ready',game.player.dashCooldown<=0);
  const powerNames={shield:'Shield',magnet:'Magnet',power:'Super bark ×2'};
  $('powerStatus').textContent=Object.entries(powerNames).filter(([key])=>game.player[key]>0).map(([key,name])=>`${name} ${Math.ceil(game.player[key])}s`).join(' · ')||'Space ×2 — double jump';
  $('missionText').textContent=game.level.friend&&!game.level.friend.rescued?`Find your friend: ${game.level.friend.name}`:game.level.boss&&game.level.boss.hp>0?`Ahead: ${game.level.boss.name}`:'Find stars and the portal';
  document.querySelectorAll('.chapter').forEach((el, i) => {
    el.classList.toggle('active', i === game.stage);
    el.disabled=i>game.unlocked;
    el.querySelector('i').textContent=game.completed.has(i)?'COMPLETE':i===game.stage?'YOU ARE HERE':i<=game.unlocked?'UNLOCKED':'AHEAD';
    el.querySelector('.chapter-state').textContent=game.completed.has(i)?'✓':i===game.stage?'↗':'○';
    const stars=[0,1,2].map(n=>game.found.has(`${i}-star-${n}`)?'★':'☆').join(' ');el.querySelector('.chapter-stars').textContent=stars;
  });
}
function enterGame(){
  keys.clear();pressed.clear();particles.length=0;
  $('startOverlay').hidden = true; $('messageOverlay').hidden = true; $('pauseButton').disabled = false;
  $('gameViewport').classList.add('playing'); canvas.focus({ preventScroll: true }); syncHud();
  $('missionStrip').hidden=false;saveProgress();
}
function start(){
  game.start();enterGame();showToast('Rescue Peach! Space twice to double jump. Shift to dash.');tone(440,.2,'sine',.04,880);
}
function showMessage(kicker, title, text, button, icon = '✦') {
  $('toast').classList.remove('visible'); toastTimer = 0;
  $('messageKicker').textContent = kicker; $('messageTitle').textContent = title; $('messageText').textContent = text;
  $('messageIcon').textContent = icon; $('continueButton').innerHTML = `${button} <span>→</span>`;
  $('messageOverlay').hidden = false; $('continueButton').focus({ preventScroll: true });
  $('pauseButton').disabled = game.status !== 'paused'; keys.clear(); pressed.clear();
}
function pause() {
  if (game.status === 'playing') { saveProgress(); game.status = 'paused'; showMessage('TAKE A BREAK', 'Paws on pause', 'Progress saved at the last flag. Choose unlocked worlds on the map below the game.', 'Continue'); }
  else if (game.status === 'paused' && !$('helpDialog').open) resume();
}
function resume() { game.status = 'playing'; $('messageOverlay').hidden = true; $('pauseButton').disabled = false; canvas.focus({ preventScroll: true }); }
function continueGame() {
  if (game.status === 'paused') resume();
  else if (game.status === 'transition') { game.next(); resume(); syncHud(); saveProgress(); showToast(WORLDS[game.stage].story); }
  else if (game.status === 'dead') { game.retry(); resume(); syncHud(); showToast('Try again! You can do it.'); }
  else if (game.status === 'won') start();
}
$('startButton').addEventListener('click',()=>{if(savedGame&&game.restore(savedGame)){enterGame();showToast('Welcome back! Continue from the last flag.');}else start();});
$('newGameButton').addEventListener('click',start);
$('continueButton').addEventListener('click', continueGame);
document.querySelectorAll('[data-chapter]').forEach(button=>button.addEventListener('click',()=>{
  if(game.status==='menu'&&savedGame)game.restore(savedGame);
  if(game.visit(Number(button.dataset.chapter))){enterGame();showToast(WORLDS[game.stage].story);$('gameViewport').scrollIntoView({block:'center',behavior:reducedMotion?'instant':'smooth'});}
}));
$('restartButton').addEventListener('click', start); $('pauseButton').addEventListener('click', pause);
$('soundButton').addEventListener('click', () => { sound = !sound; updateSound(); if (sound) tone(660, .14); });
$('fullscreenButton').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('.game-section').requestFullscreen(); }
  catch { showToast('Fullscreen is unavailable in this browser'); }
});
$('helpButton').addEventListener('click', () => { helpPaused = game.status === 'playing'; if (helpPaused) pause(); $('helpDialog').showModal(); });
function closeHelp() { $('helpDialog').close(); }
$('closeHelp').addEventListener('click', closeHelp); $('gotItButton').addEventListener('click', closeHelp);
$('helpDialog').addEventListener('close', () => { if (helpPaused && game.status === 'paused') resume(); helpPaused = false; });

const gameKeys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyX','KeyF','ShiftLeft','ShiftRight','KeyC'];
window.addEventListener('keydown', e => {
  if ($('helpDialog').open) return;
  if (game.status === 'playing' && gameKeys.includes(e.code)) { e.preventDefault(); if (!keys.has(e.code)) pressed.add(e.code); keys.add(e.code); }
  if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) { e.preventDefault(); pause(); }
});
window.addEventListener('keyup', e => { keys.delete(e.code); });
window.addEventListener('blur', () => { keys.clear(); pressed.clear(); if (game.status === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.status === 'playing') pause(); });
document.querySelectorAll('[data-key]').forEach(button => {
  const code = button.dataset.key;
  button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); keys.add(code); pressed.add(code); button.classList.add('held'); });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => { keys.delete(code); button.classList.remove('held'); });
});

function ellipse(x, y, rx, ry, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function path(points, fill, stroke, line = 2) { ctx.beginPath(); points(ctx); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); } }
function roundRect(x, y, w, h, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function line(x1, y1, x2, y2, color, size = 2) { path(c => { c.moveTo(x1,y1); c.lineTo(x2,y2); }, null, color, size); }
function hash(n) { return (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1; }
function cloud(x, y, scale, color = '#f9fae4') {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ellipse(0, 5, 50, 15, color); ellipse(-24, -4, 22, 20, color); ellipse(3, -17, 28, 27, color); ellipse(28, 0, 24, 20, color); ctx.restore();
}
function tree(x, y, scale, color, type = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  path(c => { c.moveTo(-8,0); c.lineTo(-5,-145); c.lineTo(7,-145); c.lineTo(10,0); }, '#8e9570');
  line(0,-95,-24,-121,'#87916a',4); line(3,-75,28,-110,'#87916a',3);
  if (type) {
    for (let i = 0; i < 3; i++) path(c => { c.moveTo(0,-235+i*40); c.quadraticCurveTo(-25,-185+i*40,-66-i*8,-147+i*35); c.quadraticCurveTo(0,-133+i*36,66+i*8,-147+i*35); c.quadraticCurveTo(25,-185+i*40,0,-235+i*40); }, color);
  } else {
    ellipse(-41,-151,51,54,color); ellipse(4,-185,58,62,color); ellipse(53,-154,50,47,color); ellipse(0,-132,65,46,color);
    path(c=>{c.moveTo(-28,-190);c.quadraticCurveTo(-7,-222,16,-211)},null,'#f0f4c520',3);
  }
  ctx.restore();
}
function bush(x, y, s, color) { ellipse(x, y, 45*s, 24*s, color); ellipse(x-29*s,y+6*s,30*s,22*s,color); ellipse(x+29*s,y+6*s,31*s,21*s,color); }
function building(x, ground, w, h, color, roof = '#b3916b') {
  roundRect(x,ground-h,w,h,3,color);
  path(c=>{c.moveTo(x-7,ground-h);c.lineTo(x+w/2,ground-h-29);c.lineTo(x+w+7,ground-h);},roof);
  for(let yy=ground-h+18;yy<ground-20;yy+=31) for(let xx=x+12;xx<x+w-8;xx+=23) roundRect(xx,yy,11,16,3,'#faf2c180');
  roundRect(x+w/2-9,ground-27,18,27,[9,9,0,0],'#768767');
}
function background(time, menu) {
  const stage = game.stage, camera = menu ? 0 : game.camera;
  if(!menu&&['cave','sky','lava'].includes(game.level.theme)){fantasyBackground(game.level.theme,camera,time);return;}
  const sky = ctx.createLinearGradient(0,0,0,650);
  sky.addColorStop(0, stage === 2 ? '#b9c8ba' : stage === 1 ? '#e4ddbb' : '#d3e5ce'); sky.addColorStop(1, stage === 2 ? '#dee3b9' : '#f1efca');
  ctx.fillStyle = sky; ctx.fillRect(0,0,width,650);
  const sunX = width * .73 - camera * .025;
  ellipse(sunX,145,69,69,'#f5edbd45'); ellipse(sunX,145,48,48,'#fcf4c0');
  for(let i=0;i<7;i++) { const x=((i*287-camera*.09+time*(reducedMotion?0:2))%(width+250)+width+250)%(width+250)-100; cloud(x,104+(i%3)*49,.65+(i%2)*.3,'#f8f9e89c'); }
  path(c=>{c.moveTo(0,460);for(let x=-100;x<width+200;x+=90)c.lineTo(x,350+Math.sin((x+camera*.13)*.004)*45+Math.cos(x*.008)*15);c.lineTo(width,650);c.lineTo(0,650);},stage===2?'#a8bb9a':'#bfd1a5');
  path(c=>{c.moveTo(0,470);for(let x=-100;x<width+200;x+=60)c.lineTo(x,402+Math.sin((x+camera*.22)*.007+2)*40);c.lineTo(width,650);c.lineTo(0,650);},stage===2?'#87a284':'#a8c295');
  if(stage===0) {
    for(let i=-1;i<Math.ceil(width/200)+1;i++){const x=i*200-(camera*.27%200);tree(x,451,.62,'#94b58b',i%3===0?1:0);}
    const cityX = menu ? width-244 : 2800-camera*.55;
    for(let i=0;i<6;i++) building(cityX+i*47,438,35,55+(i%3)*35,'#bdc7a0','#a5b18b');
    for(let i=-1;i<Math.ceil(width/315)+1;i++){const x=i*315-(camera*.6%315);if(menu)continue;tree(x+30,503,1.5+(i%2)*.15,'#779d70',i%2===0?1:0);}
  } else if(stage===1) {
    for(let i=-1;i<Math.ceil(width/165)+1;i++){const x=i*165-(camera*.4%165); if(i%3===0)tree(x,478,.7,'#99ad82');else building(x,475,75,90+(i%3)*45,'#b0b695','#8c9f7e');}
    for(let i=-1;i<Math.ceil(width/410)+1;i++) { const x=i*410-(camera*.75%410); path(c=>{c.moveTo(x-80,520);c.bezierCurveTo(x-120,343,x+130,285,x+148,520);},'#c7c59b');path(c=>{c.moveTo(x-1,520);c.lineTo(x-1,460);c.bezierCurveTo(x-1,418,x+52,419,x+52,460);c.lineTo(x+52,520);},'#6d8c73');tree(x+12,376,.47,'#90a672');line(x+85,452,x+125,452,'#f3e7b6',3); }
  } else {
    for(let i=0;i<9;i++){const x=i*220-camera*.28;path(c=>{c.moveTo(x,520);c.lineTo(x+25,225+(i%3)*35);c.lineTo(x+50,235+(i%3)*35);c.lineTo(x+74,520);},'#73937e');bush(x+29,240+(i%3)*35,1,'#90a987');}
    ellipse(1400-camera*.3,455,300,180,'#99ad83');
  }
  for(let i=-1;i<Math.ceil(width/140)+1;i++){const x=i*140-(camera*.7%140);bush(x,508,.8+(i%3)*.1,stage===2?'#6c946e':'#91b174');}
  if(menu){
    tree(-190,528,2.35,'#507e54');tree(width+150,529,2.3,'#608854');
    for(let i=0;i<5;i++)ellipse(-70+i*24,-30,100,43+i*5,'#648b5a');
    for(let i=0;i<5;i++)ellipse(width+20-i*23,-24,90,35+i*6,'#71945f');
  }
}
function ground(platform, camera) {
  const x=platform.x-camera,y=platform.y,w=platform.w;
  if(x>width+30||x+w< -30)return;
  if(game.status!=='menu'&&['cave','sky','lava'].includes(game.level.theme)){
    const theme=game.level.theme;
    const palette={cave:['#665e89','#ab9bc9','#8271ab'],sky:['#d0dce2','#fff9e9','#bbcddd'],lava:['#786675','#ba967c','#988172']}[theme];
    if(platform.ground){
      roundRect(x,y,w,theme==='sky'?70:180,theme==='sky'?22:8,palette[0]);roundRect(x,y,w,12,6,palette[1]);
      for(let xx=Math.max(x,Math.floor(camera/90)*90-camera);xx<x+w&&xx<width;xx+=90){if(theme==='cave')crystal(xx+20,y+70,23,'#8c80ad');else if(theme==='sky')cloud(xx+45,y+65,.65,'#ffffff70');else line(xx+12,y+25,xx+30,y+57,'#c9a08560',3);}
    }else{roundRect(x,y,w,26,9,palette[0]);roundRect(x,y,w,9,5,palette[1]);if(theme==='sky')cloud(x+w/2,y+24,w/150,'#faf9ee');}
    if(platform.moving){ctx.fillStyle=theme==='cave'?'#e4cdf6':'#fbf4d9';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText('↔',x+w/2,y+20);ctx.textAlign='left';}
    return;
  }
  if(platform.ground){
    ctx.fillStyle=game.stage===2?'#a69f77':'#b9a880';ctx.fillRect(x,y,w,650-y);
    ctx.fillStyle='#cfbb91';ctx.fillRect(x,y+14,w,19);
    ctx.fillStyle='#91ac68';ctx.fillRect(x,y,w,12);
    path(c=>{c.moveTo(x,y+11);for(let xx=Math.max(x,0);xx<Math.min(x+w,width)+12;xx+=12){c.lineTo(xx,y+12+(Math.floor(xx/12)%3)*3);}c.lineTo(x+w,y);c.lineTo(x,y);},'#86a45e');
    for(let xx=Math.floor(Math.max(platform.x,camera)/43)*43;xx<Math.min(platform.x+w,camera+width);xx+=43){const yy=y+47+Math.abs(hash(xx))*69;ellipse(xx-camera,yy,3+Math.abs(hash(xx+2))*3,2,'#9c906961');}
    for(let xx=Math.floor(Math.max(platform.x,camera)/37)*37+7;xx<Math.min(platform.x+w,camera+width);xx+=37){line(xx-camera,y+1,xx-camera-3,y-7,'#769552',1.5);line(xx-camera,y+1,xx-camera+4,y-5,'#769552',1.5);}
    for(let xx=Math.floor(Math.max(platform.x,camera)/183)*183+54;xx<Math.min(platform.x+w,camera+width);xx+=183){const fx=xx-camera;line(fx,y,fx+2,y-18,'#729157',2);for(let j=0;j<5;j++)ellipse(fx+2+Math.cos(j*1.256)*4,y-20+Math.sin(j*1.256)*4,3,3,xx%2?'#fff6d3':'#edba76');ellipse(fx+2,y-20,2.5,2.5,'#c18a50');}
  }else{
    roundRect(x,y,w,platform.h,8,game.stage===1?'#9da876':'#b9a174');roundRect(x,y,w,9,5,'#8daa65');
    line(x+12,y+19,x+w-14,y+19,'#a48c61',2);for(let xx=x+20;xx<x+w-5;xx+=35)line(xx,y+9,xx-2,y+16,'#947f59',1);
    if(game.stage!==1){path(c=>{c.moveTo(x+15,y+platform.h);c.quadraticCurveTo(x+12,y+49,x+25,y+52);},null,'#8d9a61',2);ellipse(x+20,y+42,7,3,'#8b9e60');}
  }
}
function bone(x,y,s=1,alpha=1) {
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(-.4);ctx.scale(s,s);
  path(c=>{c.moveTo(-8,-4);c.bezierCurveTo(-14,-14,-24,-5,-17,1);c.bezierCurveTo(-24,8,-13,14,-8,5);c.lineTo(8,5);c.bezierCurveTo(14,14,24,5,17,-1);c.bezierCurveTo(24,-8,13,-14,8,-4);c.closePath();},'#fff3c4','#cda569',1.5);
  line(-6,-1,7,-1,'#fffce6',2);ctx.restore();
}
function dog(x,y,scale=1,dir=1,run=0,barking=false,air=false) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale*dir,scale);
  const stride=air?7:Math.sin(run)*7;
  path(c=>{c.moveTo(-10,-42);c.bezierCurveTo(-34,-47,-35,-24,-58,-33);c.quadraticCurveTo(-41,-6,-13,-17);c.lineTo(0,-35);},'#d8764c','#b56242',1.2);
  path(c=>{c.moveTo(-15,-21);c.quadraticCurveTo(-41,-30,-36,-42);},null,'#ab764c',8);
  ellipse(-3,-26,20,20,'#d8a569');
  ellipse(-12+stride*.4,-6,7,12,'#aa7448');ellipse(10-stride*.4,-7,7,12,'#b88250');
  roundRect(-18+stride*.4,-5,14,7,4,'#edd0a0');roundRect(5-stride*.4,-5,14,7,4,'#f1d8ac');
  ellipse(4,-24,10,14,'#efd2a0');
  ctx.save();ctx.translate(6,-44+(air?0:Math.sin(run*.5)*.7));
  ellipse(0,-8,23,23,'#deb17a');
  ellipse(-19,-11,9,19,'#a76c44');ellipse(18,-12,8,17,'#b78050');
  ellipse(5,0,18,12,'#f3dab1');ellipse(17,-3,6,4.5,'#354634');
  ellipse(1,-14,3.3,4.5,'#2e3b2b');ellipse(2,-15.5,1.1,1.4,'#fff8df');
  path(c=>{c.moveTo(-3,-21);c.quadraticCurveTo(2,-24,6,-21);},null,'#9b6c48',1.5);
  if(barking){ellipse(13,6,5,6,'#6c4530');ellipse(14,9,3,2,'#da947c');}
  else {path(c=>{c.moveTo(17,2);c.quadraticCurveTo(11,10,5,5);},null,'#78533b',1.6);ellipse(9,8,3,4,'#d78d77');}
  ctx.restore();
  path(c=>{c.moveTo(-14,-39);c.quadraticCurveTo(0,-33,17,-37);},null,'#c5633f',5);
  ellipse(8,-35,5,6,'#ebc35e');ctx.fillStyle='#855a31';ctx.font='bold 7px Arial';ctx.fillText('S',5.6,-32.6);
  ctx.restore();
}
function snake(e,camera,time) {
  if(e.kind==='flyer'){
    const x=e.x-camera+26,y=e.y+15,flap=Math.sin(time*11+e.phase)*18;
    const color=game.level.theme==='sky'?'#8596c2':'#8a79a4';
    path(c=>{c.moveTo(x-3,y);c.quadraticCurveTo(x-30,y-30+flap,x-41,y+flap);c.quadraticCurveTo(x-15,y+14,x-3,y);},color);
    path(c=>{c.moveTo(x+3,y);c.quadraticCurveTo(x+30,y-30+flap,x+41,y+flap);c.quadraticCurveTo(x+15,y+14,x+3,y);},color);
    ellipse(x,y,17,16,color);ellipse(x-6,y-3,4,5,'#fcf2d5');ellipse(x+6,y-3,4,5,'#fcf2d5');ellipse(x-6,y-3,2,3,'#38384c');ellipse(x+6,y-3,2,3,'#38384c');return;
  }
  if(e.kind==='beetle'){
    const x=e.x-camera+25,y=e.y+19;ellipse(x,y,25,15,'#b86856');ellipse(x,y-3,17,13,'#e39d65');line(x,y-14,x,y+9,'#aa644f',2);
    for(let i=-1;i<=1;i++){line(x-15,y+i*8,x-29,y+i*12,'#795868',3);line(x+15,y+i*8,x+29,y+i*12,'#795868',3);}ellipse(x+e.dir*21,y-4,8,10,'#775367');ellipse(x+e.dir*25,y-7,2,3,'#fff1c5');return;
  }
  const x=e.x-camera+26,y=e.y+27;
  ctx.save();ctx.translate(x,y);ctx.scale(-e.dir,1);
  path(c=>{c.moveTo(-23,0);c.bezierCurveTo(-8,8,-2,-14,10,-4);c.bezierCurveTo(21,8,23,-12,17,-16);},null,'#668e5e',12);
  path(c=>{c.moveTo(-20,2);c.quadraticCurveTo(-7,5,0,-4);},null,'#a1b477',3);
  ellipse(16,-20+Math.sin(time*5)*1.5,13,10,'#7a9b60');ellipse(20,-23,2,2.5,'#253f31');ellipse(13,-23,2,2.5,'#253f31');
  line(26,-17,33,-17,'#c77761',1.5);line(33,-17,36,-19,'#c77761',1);line(33,-17,36,-15,'#c77761',1);ctx.restore();
}
function portal(x,time) {
  ellipse(x,522,63,10,'#506e4830');
  ctx.save();ctx.translate(x,443);
  ctx.shadowColor='#ffec99';ctx.shadowBlur=24;
  path(c=>{c.moveTo(-45,76);c.lineTo(-45,-17);c.bezierCurveTo(-45,-91,45,-91,45,-17);c.lineTo(45,76);},'#74967b','#efe3aa',9);ctx.shadowBlur=0;
  const glow=ctx.createLinearGradient(-30,0,30,0);glow.addColorStop(0,'#accea0');glow.addColorStop(.5,'#f3ebaa');glow.addColorStop(1,'#a1c89c');
  path(c=>{c.moveTo(-33,74);c.lineTo(-33,-15);c.bezierCurveTo(-33,-70,33,-70,33,-15);c.lineTo(33,74);},glow);
  for(let i=0;i<8;i++){const a=time+i*2.4;ellipse(Math.sin(a)*24,55-((time*28+i*19)%110),2,3,'#fff9d5');}
  ctx.fillStyle='#4c7156';ctx.font='bold 10px "Nunito Sans", sans-serif';ctx.textAlign='center';ctx.fillText('PORTAL',0,-88);ctx.textAlign='left';ctx.restore();
}
function boss(b,camera,time) {
  if(b.hp<=0)return;
  if(b.kind==='guardian'){guardian(b,camera,time);return;}
  const x=b.x-camera,y=b.y;
  ctx.save();ctx.translate(x,y);if(b.invuln>0&&Math.floor(time*17)%2)ctx.globalAlpha=.55;
  ellipse(66,139,105,12,'#355f4428');
  path(c=>{c.moveTo(152,124);c.bezierCurveTo(94,79,51,167,31,114);c.bezierCurveTo(11,76,85,82,45,37);},null,'#668c5c',38);
  path(c=>{c.moveTo(138,124);c.bezierCurveTo(93,96,60,151,43,114);},null,'#a5ba78',12);
  for(let i=0;i<5;i++)ellipse(60+i*16,113+Math.sin(i)*10,5,4,'#557e51');
  ellipse(27,40,39,29,'#7e9f65');ellipse(1,48,24,18,'#9db57a');
  ellipse(13,28,7,9,'#f4efc0');ellipse(12,29,2.5,7,'#304934');ellipse(39,27,7,9,'#f4efc0');ellipse(37,28,2.5,7,'#304934');
  line(4,15,20,20,'#456b45',4);line(30,18,46,12,'#456b45',4);
  line(-16,54,-36,57,'#ca8670',3);line(-36,57,-45,52,'#ca8670',2);line(-36,57,-43,64,'#ca8670',2);
  path(c=>{c.moveTo(2,9);c.lineTo(-1,-17);c.lineTo(15,-7);c.lineTo(27,-30);c.lineTo(39,-8);c.lineTo(55,-20);c.lineTo(51,10);c.closePath();},'#e5bb5f','#b5984e',2);
  ellipse(27,-3,4,5,'#db7a52');ctx.restore();
}
function checkpoint(x,active) { line(x,520,x,449,'#9c8f66',3);path(c=>{c.moveTo(x,449);c.lineTo(x+32,456);c.lineTo(x,470);},active?'#eac16a':'#eeecd1');ellipse(x,448,3,3,'#c2a563'); }
function sparkle(x,y,size,color) { path(c=>{c.moveTo(x-size,y);c.quadraticCurveTo(x,y-1,x,y-size);c.quadraticCurveTo(x+1,y,x+size,y);c.quadraticCurveTo(x,y+1,x,y+size);c.quadraticCurveTo(x-1,y,x-size,y);},color); }
function burst(x,y,color,count=10) { for(let i=0;i<(reducedMotion?3:count);i++)particles.push({x,y,vx:(Math.random()-.5)*150,vy:-30-Math.random()*150,life:.7+Math.random()*.4,color,size:2+Math.random()*4}); }

function crystal(x,y,size,color){
  path(c=>{c.moveTo(x,y-size);c.lineTo(x+size*.4,y-size*.55);c.lineTo(x+size*.32,y+size*.2);c.lineTo(x-size*.28,y+size*.2);c.lineTo(x-size*.4,y-size*.5);c.closePath();},color);
  line(x,y-size,x,y+size*.12,'#ffffff55',1.5);line(x-size*.36,y-size*.5,x,y-size*.3,'#ffffff55',1);
}
function fantasyBackground(theme,camera,time){
  const colors={cave:['#282941','#5c527e'],sky:['#afdaed','#f6e5d3'],lava:['#704c68','#e7aa85']}[theme];
  const gradient=ctx.createLinearGradient(0,0,0,650);gradient.addColorStop(0,colors[0]);gradient.addColorStop(1,colors[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,width,650);
  if(theme==='sky'){
    ellipse(width*.75,116,62,62,'#fff5d390');
    for(let i=-1;i<10;i++){const x=i*230-(camera*.17%230);cloud(x,150+(i%3)*90,1.5,'#fff9f0b0');}
    for(let i=-1;i<7;i++){const x=i*330-(camera*.35%330);path(c=>{c.moveTo(x,415);c.lineTo(x+110,540);c.lineTo(x+180,411);},'#b0c8c1');ellipse(x+90,415,100,24,'#dce4cf');tree(x+80,405,.42,'#9dbba7');}
    for(let i=0;i<5;i++){const x=(i*290+time*4-camera*.1)%(width+200);cloud(x,600,.95,'#fffbefc0');}
  }else if(theme==='cave'){
    for(let i=-1;i<14;i++){const x=i*140-(camera*.2%140);path(c=>{c.moveTo(x-45,0);c.lineTo(x+40,110+(i%4)*31);c.lineTo(x+100,0);},'#39354f');crystal(x+70,460,85+(i%3)*27,'#71618e');}
    for(let i=0;i<35;i++){const x=(i*93-camera*.36+width*10)%width,y=115+(i*71)%370;ellipse(x,y,1.5,1.5,`rgba(214,214,255,${.25+Math.sin(time*2+i)*.2})`);}
    for(let i=-1;i<10;i++){const x=i*195-(camera*.55%195);crystal(x,520,57,'#8b81bb');crystal(x+34,524,32,'#afabd2');}
  }else{
    ellipse(width*.74,180,65,65,'#f4c58d70');
    for(let i=-1;i<6;i++){const x=i*370-(camera*.2%370);path(c=>{c.moveTo(x-70,520);c.lineTo(x+115,240);c.lineTo(x+165,240);c.lineTo(x+360,520);},'#92637a');path(c=>{c.moveTo(x+115,240);c.lineTo(x+138,296);c.lineTo(x+148,269);c.lineTo(x+178,305);c.lineTo(x+165,240);},'#ebaa72');cloud(x+140,205,1.1,'#b78693a0');}
    ctx.fillStyle='#e68c63';ctx.fillRect(0,545,width,105);
    for(let i=0;i<25;i++){const x=(i*79+time*20)%(width+80)-40;ellipse(x,566+Math.sin(time+i)*13,22,4,'#ffca7b80');}
    for(let i=0;i<24;i++){const x=(i*137-camera*.3+width*10)%width,y=530-((time*30+i*31)%470);ellipse(x,y,2,3,'#ffd8a080');}
  }
}
function guardian(b,camera,time){
  const x=b.x-camera,y=b.y;ctx.save();ctx.translate(x,y);if(b.invuln>0&&Math.floor(time*17)%2)ctx.globalAlpha=.5;
  ellipse(60,140,84,10,'#1f244433');roundRect(12,59,102,71,19,'#89809f');roundRect(14,117,33,21,6,'#625c79');roundRect(80,117,33,21,6,'#625c79');
  roundRect(-13,62+Math.sin(time*3)*7,30,59,12,'#746b8b');roundRect(108,62-Math.sin(time*3)*7,30,59,12,'#746b8b');
  roundRect(12,9,100,69,19,'#a395b8');crystal(64,53,60,'#c5b0e1');ellipse(38,44,8,6,'#eee5ff');ellipse(84,44,8,6,'#eee5ff');ellipse(36,44,3,5,'#444059');ellipse(81,44,3,5,'#444059');line(46,68,75,68,'#59546f',4);ctx.restore();
}
function drawStar(x,y,size=15){
  ctx.save();ctx.shadowColor='#ffdf85';ctx.shadowBlur=12;
  path(c=>{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?size*.46:size;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();},'#f7d47e','#d5a356',1.5);ctx.restore();
}
function friendArt(f,camera,time){
  const x=f.x-camera+29,y=f.y+40;
  const coat=['#dfb47c','#ede2c8','#d99365','#b9a6bf','#bd9672'][f.kind];
  ellipse(x,y+13,16,19,coat);
  if(f.kind===1){ellipse(x-9,y-20,5,20,coat);ellipse(x+9,y-20,5,20,coat);}
  else if(f.kind!==3){path(c=>{c.moveTo(x-16,y-1);c.lineTo(x-15,y-26);c.lineTo(x-1,y-12);c.lineTo(x+14,y-26);c.lineTo(x+17,y+1);},coat);}
  ellipse(x,y-5,19,17,coat);ellipse(x-6,y-7,2.5,3,'#3e4339');ellipse(x+7,y-7,2.5,3,'#3e4339');ellipse(x+1,y+1,3,2,'#795b4b');
  if(!f.rescued){roundRect(x-30,f.y,60,64,7,'#65817822');for(let n=-2;n<=2;n++)line(x+n*12,f.y+5,x+n*12,f.y+63,'#8b947b',3);line(x-30,f.y+6,x+30,f.y+6,'#8b947b',4);line(x-30,f.y+63,x+30,f.y+63,'#8b947b',4);roundRect(x-7,f.y+28,14,17,3,'#e3bd69');ctx.fillStyle=game.stage===2?'#f5dca2':'#52694d';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('BARK! →',x,f.y-12);ctx.textAlign='left';}
  else{ctx.fillStyle='#e5b16c';ctx.font='bold 20px sans-serif';ctx.fillText('♥',x-8,f.y-5+Math.sin(time*3)*4);}
}
function objects(camera,time){
  for(const star of game.level.stars)if(!game.found.has(star.id))drawStar(star.x-camera,star.y+Math.sin(time*2)*4);
  const icons={heart:'♥',shield:'◇',magnet:'∩',power:'ϟ'},colors={heart:'#e4a292',shield:'#9dc9d4',magnet:'#c5a4d8',power:'#e8c677'};
  for(const item of game.level.pickups)if(!game.found.has(item.id)){
    const x=item.x-camera,y=item.y+Math.sin(time*3+item.x)*3;ellipse(x,y,19,19,colors[item.kind]);ellipse(x-5,y-7,5,3,'#ffffff60');ctx.fillStyle='#fffbed';ctx.font='bold 23px sans-serif';ctx.textAlign='center';ctx.fillText(icons[item.kind],x,y+8);ctx.textAlign='left';
  }
  for(const c of game.level.chests){const x=c.x-camera;roundRect(x,c.y,c.w,c.h,5,c.opened?'#a28c6b':'#ae8053');roundRect(x,c.y+(c.opened?-11:0),c.w,13,4,'#d8b271');line(x+9,c.y+3,x+9,c.y+c.h,'#f0cf85',3);line(x+35,c.y+3,x+35,c.y+c.h,'#f0cf85',3);if(!c.opened)roundRect(x+18,c.y+12,10,11,2,'#f5da91');}
  for(const s of game.level.springs){const x=s.x-camera;line(x+5,520,x+31,516,'#9c9275',3);path(c=>{c.moveTo(x+7,516);c.lineTo(x+29,510);c.lineTo(x+8,505);},null,'#b59366',3);roundRect(x,s.y-6,38,8,4,'#e5bb70');}
  if(game.level.friend)friendArt(game.level.friend,camera,time);
}

function render(dt) {
  const menu=game.status==='menu';
  const target=Math.max(0,Math.min(game.level.length-width,game.player.x-width*.31));
  if(!menu)game.camera+=(target-game.camera)*Math.min(1,dt*7);
  background(visualTime,menu);
  const camera=menu?0:game.camera;
  if(menu){
    ground({x:0,y:GROUND,w:width,h:200,ground:true},0);
    const dogX=width*.74;
    ellipse(dogX,523,63,10,'#576f4833');dog(dogX,514,2.05,1,reducedMotion?0:Math.sin(visualTime)*.7);
    for(let i=0;i<3;i++){bone(dogX+115+i*50,438-Math.sin(i*.9)*24+Math.sin(visualTime*2+i)*3,.85);}
    sparkle(dogX-45,359,8,'#e5b55f');sparkle(dogX+70,395,6,'#e5b55f');
    bush(width-10,537,.85,'#5e874f');bush(8,539,.9,'#6c914f');
    ctx.save();ctx.translate(width*.50,468);ctx.rotate(-.1);line(0,0,0,51,'#9c8961',5);roundRect(-28,-7,74,28,4,'#dac699');ctx.fillStyle='#66744d';ctx.font='bold 11px sans-serif';ctx.fillText('TOWN →',-20,12);ctx.restore();
  }else{
    for(const p of game.level.platforms)ground(p,camera);
    objects(camera,visualTime);
    for(const x of game.level.checkpoints)checkpoint(x-camera,x<=game.spawnX);
    for(const b of game.level.bones)if(!game.collected.has(b.id)&&b.x>camera-30&&b.x<camera+width+30)bone(b.x-camera,b.y+Math.sin(visualTime*3+b.x)*3,.72);
    if(game.stage<WORLDS.length-1&&(!game.level.boss||game.level.boss.hp<=0))portal(game.level.exit+50-camera,visualTime);
    for(const e of game.level.enemies)if(e.alive&&e.x>camera-80&&e.x<camera+width+80)snake(e,camera,visualTime);
    if(game.level.boss)boss(game.level.boss,camera,visualTime);
    const p=game.player;
    if(p.dashTime>0)for(let i=1;i<4;i++){ctx.globalAlpha=.2-i*.04;dog(p.x+23-camera-p.dir*i*24,p.y+p.h,1,p.dir,0);ctx.globalAlpha=1;}
    if(p.shield>0){ctx.strokeStyle='#a7dfed';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(p.x+23-camera,p.y+28,39,47,0,0,Math.PI*2);ctx.stroke();}
    if(p.magnet>0){ctx.strokeStyle='#cab0df70';ctx.lineWidth=1;ctx.setLineDash([4,8]);ctx.beginPath();ctx.arc(p.x+23-camera,p.y+30,90,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    if(p.invuln<=0||Math.floor(visualTime*12)%2){
      if(p.grounded)ellipse(p.x+23-camera,p.y+p.h+3,23,4,'#456d4124');
      dog(p.x+23-camera,p.y+p.h,1,p.dir,p.grounded&&Math.abs(p.vx)>10?game.time*14:0,p.barkTime>0,!p.grounded);
    }
    for(const s of game.shots){ctx.save();ctx.translate(s.x-camera+14,s.y+12);ctx.scale(s.dir,1);for(let i=0;i<3;i++)path(c=>c.arc(-5-i*9,0,8+i*6,-1.1,1.1),null,'#fff5bc',3);ctx.restore();}
    for(const v of game.venom){if(v.kind==='wave'){path(c=>{c.moveTo(v.x-camera,v.y+23);c.quadraticCurveTo(v.x+15-camera,v.y-12,v.x+29-camera,v.y+23);},'#a7b965');}else{ellipse(v.x-camera+10,v.y+10,10,9,game.stage===2?'#baa4de':'#8baf64');ellipse(v.x-camera+7,v.y+6,3,3,'#eee3bd');}}
    if(game.status==='won'){for(let i=0;i<5;i++)if(game.found.has(`${i}-friend`))friendArt({x:p.x-160+i*65,y:454,kind:i,rescued:true},camera,visualTime);}
    for(const part of particles){ctx.globalAlpha=Math.max(0,part.life);sparkle(part.x-camera,part.y,part.size,part.color);}ctx.globalAlpha=1;
  }
  // A subtle, deterministic paper grain keeps the world close to its pencil origins.
  ctx.fillStyle='#fffde809';for(let i=0;i<150;i++){const x=Math.abs(hash(i))*width,y=Math.abs(hash(i+500))*650;ctx.fillRect(x,y,2,2);}
}
function events() {
  for(const e of game.events){
    if(e.type==='bone'){burst(e.x,e.y,'#fff1b6',7);tone(880,.12,'sine',.035,1320);saveBest();}
    if(e.type==='jump'){burst(e.x,e.y,'#e7ddb2',4);tone(260,.1,'sine',.022,500);}
    if(e.type==='doubleJump'){burst(e.x,e.y,'#e8f9e1',12);tone(440,.13,'sine',.035,880);}
    if(e.type==='dash'){burst(e.x,e.y,'#f6dda1',10);tone(150,.15,'sawtooth',.025,550);}
    if(e.type==='spring'){burst(e.x,e.y,'#f4d99e',12);tone(220,.25,'sine',.04,1200);}
    if(e.type==='star'){burst(e.x,e.y,'#ffe9a5',22);showToast('A secret star! Another one for your collection.');tone(1046,.3,'sine',.04,1568);}
    if(e.type==='chest'){burst(e.x,e.y,'#eacf8b',20);showToast('Chest opened! +5 bones');saveBest();tone(660,.25,'triangle',.04,990);}
    if(e.type==='rescue'){burst(e.x,e.y,'#f0c6a9',25);showToast(`${e.name} is free! Friends rescued: ${game.friendCount} of 5.`);tone(660,.35,'sine',.045,1320);}
    if(e.type==='powerup'){const names={heart:'A heart! +2 health',shield:'A shield for 20 seconds! It blocks one hit.',magnet:'A magnet for 16 seconds! Bones fly toward you.',power:'A stronger super bark for 14 seconds!'};showToast(names[e.kind]);burst(e.x,e.y,'#dfd1f2',12);tone(523,.2,'sine',.03,1046);}
    if(e.type==='shieldBreak'){burst(e.x,e.y,'#bce2ed',18);showToast('Your shield protected you!');}
    if(e.type==='guardianDown'){burst(e.x,e.y,'#c7b0ec',30);showToast('Crystal Guardian defeated! The portal is open.');tone(440,.4,'sine',.04,880);}
    if(e.type==='bark')tone(180,.13,'triangle',.075,90);
    if(e.type==='hurt'){tone(190,.25,'triangle',.04,70);showToast(game.player.hp>0?'Ouch! Stay sharp. You can do it.':'');}
    if(e.type==='poof'){burst(e.x,e.y,'#d4e4a1',12);tone(360,.15,'sine',.035,680);}
    if(e.type==='checkpoint'){burst(e.x,e.y,'#f3d28b',18);showToast('Checkpoint! +1 heart. Adventure saved.');tone(540,.2,'sine',.04,1080);}
    if(e.type==='bossHit'){burst(e.x,e.y,'#f7d589',20);tone(130,.2,'triangle',.05,300);}
    if(e.type==='complete'){saveBest();const count=[0,1,2].filter(n=>game.found.has(`${game.stage}-star-${n}`)).length;showMessage(`WORLD ${game.stage+1} COMPLETE · ${'★'.repeat(count)}${'☆'.repeat(3-count)}`,'A new world beyond the portal',`${WORLDS[game.stage+1].story} ${game.level.friend?.rescued?'Friend rescued!':'Use the map to go back for any friends you missed.'}`,WORLDS[game.stage+1].name,'↗');tone(660,.4,'sine',.04,1320);}
    if(e.type==='win'){saveBest();showMessage('YOU ARE A SUPERHERO!', 'Little paws, big adventure',`Snake King defeated! Friends rescued: ${game.friendCount}/5. Stars: ${game.starCount}/${TOTAL_STARS}. Bones: ${game.score}/${total}. ${game.friendCount===5?'All your friends are together again!':'Revisit unlocked worlds on the map to find the remaining friends.'}`, 'New adventure', '★');tone(523,.6,'sine',.05,1046);}
  }
  if(game.events.some(e=>['bone','star','chest','rescue','checkpoint','powerup','guardianDown','complete','win','hurt','world'].includes(e.type)))saveProgress();
  game.events=[];
  if(game.status==='dead'&&$('messageOverlay').hidden)showMessage('ONE MORE TRY','Even super dogs stumble','Your bones are safe. Return to the last flag and try again!','Try again','♡');
  syncHud();
}
function frame(now) {
  const dt=Math.min((now-last)/1000||0,.035);last=now;
  if(game.status==='playing'||game.status==='menu'){visualTime+=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('visible');}}
  const input={left:keys.has('ArrowLeft')||keys.has('KeyA'),right:keys.has('ArrowRight')||keys.has('KeyD'),jumpPressed:pressed.has('Space')||pressed.has('ArrowUp')||pressed.has('KeyW'),jumpHeld:keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW'),bark:keys.has('KeyX')||keys.has('KeyF')||pressed.has('KeyX')||pressed.has('KeyF'),dashPressed:pressed.has('ShiftLeft')||pressed.has('ShiftRight')||pressed.has('KeyC')};
  game.tick(dt,input);pressed.clear();
  if(game.status==='playing')for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1);}
  if(game.events.length||game.status==='dead')events();
  hudElapsed+=dt;if(hudElapsed>.15){syncHud();hudElapsed=0;}
  render(dt);requestAnimationFrame(frame);
}
syncHud();resize();requestAnimationFrame(frame);
