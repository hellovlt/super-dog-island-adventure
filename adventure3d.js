import {createWorld,LEVELS,RUSH_REWARD,RUSH_TIME} from './campaign3d.js';
export {LEVELS,createWorld,CRYSTALS,RUSH_REWARD,RUSH_TIME} from './campaign3d.js';
import {BODY,moveHorizontal,moveVertical,clearSight,segmentHit,overlapsXZ} from './collision3d.js';
import {normalizeWardrobe,spentBones,buyItem,wearItem} from './wardrobe3d.js';
export * from './world3d.js';
export const DIFFICULTIES=Object.freeze({
 easy:{name:'Easy',hp:7,enemyHP:1,enemySpeed:1.65,bossHP:6,chargeSpeed:12,windup:2.1,rest:4.2,waveSpeed:7,invulnerability:2.4,barkCooldown:.5,dashCooldown:.85,grace:.16,fallDamage:0,description:'7 hearts · gentle snakes · no fall damage'},
 normal:{name:'Normal',hp:5,enemyHP:2,enemySpeed:2.3,bossHP:8,chargeSpeed:17,windup:1.8,rest:3.4,waveSpeed:9,invulnerability:1.7,barkCooldown:.65,dashCooldown:1.1,grace:.11,fallDamage:1,description:'5 hearts · regular enemies · falls cost 1 heart'},
 hard:{name:'Hard',hp:3,enemyHP:3,enemySpeed:3,bossHP:12,chargeSpeed:20,windup:1.25,rest:2.6,waveSpeed:11,invulnerability:1.1,barkCooldown:.8,dashCooldown:1.35,grace:.08,fallDamage:1,description:'3 hearts · fast enemies · shorter boss breaks'},
});
const difficultyKey=value=>Object.hasOwn(DIFFICULTIES,value)?value:'normal';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const eye=(o,offset=1)=>({x:o.x,y:(o.y||0)+offset,z:o.z});
const boneIds=[];const boneIdsFor=level=>boneIds[level]??=new Set(createWorld(level).BONES.map(b=>b.id));
// A save only counts as an adventure in progress once something was found, rescued, reached or unlocked.
export const hasProgress=save=>!!save&&(save.level>0||save.secrets?.length>0||[save,...Object.values(save.progress||{})].some(p=>p?.collected?.length||p?.rescued?.length||p?.defeated?.length||p?.won||(p?.checkpoint&&p.checkpoint!=='home')));
export class Adventure3D {
 constructor(save,{difficulty='normal',level=0}={}){
  this.level=Number.isInteger(level)&&level>=0&&level<5?level:0;
  this.progress={};this.secrets=new Set();this.wardrobe=normalizeWardrobe(save?.version===4?save.wardrobe:null);this.challenges={};for(const [k,v] of Object.entries(save?.version===4&&save.challenges&&typeof save.challenges==='object'?save.challenges:{}))if(/^[0-4]$/.test(k)&&Number.isFinite(v?.best)&&v.best>=1&&v.best<1000)this.challenges[k]={best:Math.round(v.best*10)/10};this.rush=null;
  if(save?.version===4){this.progress=save.progress&&typeof save.progress==='object'&&!Array.isArray(save.progress)?{...save.progress}:{};this.level=Number.isInteger(save.level)?Math.max(0,Math.min(4,save.level)):0;this.secrets=new Set((Array.isArray(save.secrets)?save.secrets:[]).filter(id=>/^egg-[0-4]-[01]$/.test(id)));let unlocked=0;while(unlocked<4&&this.validWin(this.progress[unlocked]))unlocked++;this.level=Math.min(this.level,unlocked);difficulty=save.difficulty;save={...this.progress[this.level],version:3,difficulty};}
  this.world=createWorld(this.level);
  this.difficulty=difficultyKey(save?.version===3?save.difficulty:difficulty);this.rules=DIFFICULTIES[this.difficulty];
  this.time=0;this.status='menu';this.collected=new Set();this.rescued=new Set();this.defeated=new Set();this.checkpoint='home';this.events=[];this.flagInside=new Set(['home']);
  this.player={...this.world.SPAWN,vx:0,vz:0,vy:0,facing:Math.PI,hp:this.rules.hp,jumps:0,grounded:true,invuln:0,dash:0,dashCD:0,barkCD:0,coyote:this.rules.grace,jumpBuffer:0,gliding:false};
  this.enemies=this.world.ENEMIES.map(e=>({...e,y:0,homeX:e.x,homeZ:e.z,hp:this.rules.enemyHP,hit:0,grounded:true}));
  this.boss={x:0,y:1.2,z:-75,hp:this.rules.bossHP,state:'sleep',timer:0,phase:0,hit:0,dx:0,dz:1};this.waves=[];this.solids=this.world.solidsFor(this.rescued);if(save)this.restore(save);
 }
 get maxHP(){return this.rules.hp;}
 // The cape glide is Super Dog's reward for beating the first giant; no route needs it.
 get gliderUnlocked(){return this.level>0||this.boss.hp<=0||this.validWin(this.progress[0]);}
 get bossRadius(){return this.world.meta.scale*.6;}
 get bossHeight(){return this.world.meta.scale*1.7;}
 validWin(s){return s?.won===true&&Array.isArray(s.rescued)&&Array.isArray(s.collected)&&['peach','spark','fluff'].every(id=>s.rescued?.includes(id))&&['village-key','forest-key','sky-key'].every(id=>s.collected?.includes(id));}
 get unlocked(){let n=1;while(n<5&&this.validWin(n-1===this.level?this.levelSnapshot():this.progress[n-1]))n++;return n;}
 snapshot(){return {version:4,level:this.level,difficulty:this.difficulty,secrets:[...this.secrets],wardrobe:{owned:[...this.wardrobe.owned],wearing:{...this.wardrobe.wearing}},challenges:{...this.challenges},progress:{...this.progress,[this.level]:this.levelSnapshot()}};}
 // Bones are the wardrobe currency: every bone collected in any world counts once.
 get bonesEarned(){let n=0;for(let i=0;i<5;i++){const ids=i===this.level?[...this.collected]:Array.isArray(this.progress[i]?.collected)?this.progress[i].collected:[];const valid=boneIdsFor(i);n+=new Set(ids.filter(id=>valid.has(id))).size;}return n+this.challengeBones;}
 get challengeBones(){return Object.keys(this.challenges).length*RUSH_REWARD;}
 // Bone Rush: a timed run to collect the world's twelve golden bones; the first clear pays wardrobe bones.
 get rushLimit(){return RUSH_TIME[this.difficulty];}
 nearbyRushStone(){const s=this.world.RUSH;return !this.rush&&distance(this.player,s)<2.4&&Math.abs(this.player.y-s.y)<1.2?s:null;}
 startRush(){this.rush={left:this.rushLimit,got:new Set()};this.emit('rushStart',`Bone Rush! Collect ${this.world.RUSH.bones.length} golden bones in ${this.rushLimit} seconds.`);}
 updateRush(dt){const r=this.rush,p=this.player,bones=this.world.RUSH.bones;r.left=Math.max(0,r.left-dt);
  for(const b of bones)if(!r.got.has(b.id)&&distance(p,b)<1.3&&Math.abs(p.y+.8-b.y)<1.2){r.got.add(b.id);this.emit('coin');}
  if(r.got.size===bones.length){const time=Math.round((this.rushLimit-r.left)*10)/10,old=this.challenges[this.level],first=!old;this.challenges[this.level]={best:first?time:Math.min(old.best,time)};this.rush=null;this.emit('rushWon',`Bone Rush complete in ${time} seconds!`,{time,best:this.challenges[this.level].best,first,reward:first?RUSH_REWARD:0});}
  else if(r.left<=0){this.rush=null;this.emit('rushLost',`Time's up! ${r.got.size} / ${bones.length} golden bones. Try again at the stone.`);}
 }
 get bonesAvailable(){return Math.max(0,this.bonesEarned-spentBones(this.wardrobe));}
 buy(id){const r=buyItem(this.wardrobe,id,this.bonesAvailable);if(r.ok)this.wardrobe=r.wardrobe;return r;}
 wear(id){const r=wearItem(this.wardrobe,id,this.secrets);if(r.ok)this.wardrobe=r.wardrobe;return r;}
 // Starting over clears the adventure itself, but a child keeps the clothes they bought,
 // their best race times, and the difficulty a grown-up chose.
 freshStart(){const fresh=new Adventure3D(null,{difficulty:this.difficulty});
  fresh.wardrobe={owned:[...this.wardrobe.owned],wearing:{...this.wardrobe.wearing}};
  fresh.challenges={...this.challenges};return fresh.snapshot();}
 selectLevel(level){if(!Number.isInteger(level)||level<0||level>=this.unlocked)return false;const save=this.snapshot();save.level=level;Object.assign(this,new Adventure3D(save));return true;}
 advance(){return this.boss.hp<=0&&this.level<4?this.selectLevel(this.level+1):false;}
 nearbySecret(){return this.world.EGGS.find(e=>!this.secrets.has(e.id)&&distance(this.player,e)<2.6&&Math.abs(this.player.y-e.y)<1.5&&clearSight(eye(this.player),eye(e),this.solids));}
 discoverSecret(){const e=this.nearbySecret();if(!e)return false;this.secrets.add(e.id);this.emit('secret',`${e.name}: ${e.text}`);return true;}
 // Never below zero: a world with no keys at all, such as the village, still has friends rescued.
 get keyCount(){return Math.max(0,this.world.KEYS.filter(k=>this.collected.has(k.id)).length-this.rescued.size);}
 get boneCount(){return this.world.BONES.filter(k=>this.collected.has(k.id)).length;}
 get starCount(){return this.world.STARS.filter(k=>this.collected.has(k.id)).length;}
 get objective(){return this.boss.hp<=0?this.level<4?'World saved! The next level is unlocked.':'Five worlds saved! Complete your secret album.':this.rescued.size<3?`Rescue friends: ${this.rescued.size} / 3. Keys open cages.`:this.boss.state!=='sleep'?'Dodge charges. Bark while the giant rests!':`All friends are free! Across the bridge awaits ${this.world.meta.boss}.`;}
 emit(type,text,extra){this.events.push({type,text,...extra});}
 start(){if(this.status==='dead')this.retry();else this.status='playing';}
 resume(){if(this.status==='paused')this.status='playing';}
 pause(){if(this.status==='playing')this.status='paused';}
 setDifficulty(value){if(!Object.hasOwn(DIFFICULTIES,value)||this.status==='playing')return false;this.difficulty=value;this.rules=DIFFICULTIES[value];this.player.hp=this.maxHP;this.player.invuln=2;this.player.dash=0;this.player.dashCD=0;this.player.barkCD=0;for(const e of this.enemies)e.hp=this.rules.enemyHP;this.resetBoss();this.emit('difficulty',`Difficulty: ${this.rules.name}`);return true;}
 resetBoss(){this.waves=[];if(this.boss.hp<=0)return;Object.assign(this.boss,{hp:this.rules.bossHP,state:'sleep',timer:0,hit:0,phase:0,x:0,z:-75});}
 respawn({heal=true}={}){
  const c=this.world.CHECKPOINTS.find(c=>c.id===this.checkpoint)||this.world.CHECKPOINTS[0];
  Object.assign(this.player,{x:c.x,y:c.y,z:c.z,vx:0,vz:0,vy:0,facing:Math.PI,invuln:2,jumps:0,grounded:true,dash:0,dashCD:0,barkCD:0,coyote:this.rules.grace,jumpBuffer:0});if(heal)this.player.hp=this.maxHP;
  this.flagInside=new Set([c.id]);this.resetBoss();
  for(const e of this.enemies)if(!this.defeated.has(e.id)){e.x=e.homeX;e.z=e.homeZ;e.hp=this.rules.enemyHP;e.hit=0;}
 }
 retry(){this.respawn();this.status='playing';}
 restore(s){
  if(!s||s.version!==3)return;const valid=new Set([...this.world.BONES,...this.world.KEYS,...this.world.STARS].map(o=>o.id));
  this.collected=new Set((Array.isArray(s.collected)?s.collected:[]).filter(id=>valid.has(id)));
  const keyTotal=this.world.KEYS.filter(k=>this.collected.has(k.id)).length;
  this.rescued=new Set([...new Set((Array.isArray(s.rescued)?s.rescued:[]).filter(id=>this.world.FRIENDS.some(f=>f.id===id)))].slice(0,keyTotal));
  this.defeated=new Set((Array.isArray(s.defeated)?s.defeated:[]).filter(id=>this.world.ENEMIES.some(e=>e.id===id)));
  this.checkpoint=this.world.CHECKPOINTS.some(c=>c.id===s.checkpoint&&(c.id!=='boss'||this.rescued.size===3))?s.checkpoint:'home';
  if(s.won===true&&this.rescued.size===3){this.boss.hp=0;this.boss.state='defeated';}
  this.solids=this.world.solidsFor(this.rescued);this.retry();this.status='menu';
 }
 levelSnapshot(){return {version:3,difficulty:this.difficulty,collected:[...this.collected],rescued:[...this.rescued],defeated:[...this.defeated],checkpoint:this.checkpoint,won:this.boss.hp<=0};}
 hurt(){const p=this.player;if(this.status!=='playing'||p.invuln>0||p.dash>0)return;p.hp=Math.max(0,p.hp-1);p.invuln=this.rules.invulnerability;p.vy=5;p.grounded=false;this.emit('hurt','Ouch! Return to a flag to refill your hearts.');if(p.hp===0)this.die();}
 die(){this.rush=null;this.status='dead';this.player.vx=0;this.player.vz=0;this.player.jumpBuffer=0;this.emit('dead','Try again? All your discoveries are saved.');}
 bark(){
  const p=this.player;if(this.status!=='playing'||p.barkCD>0)return;p.barkCD=this.rules.barkCooldown;this.emit('bark');
  for(const e of this.enemies){if(this.defeated.has(e.id))continue;if(distance(p,e)<6&&Math.abs(p.y-e.y)<2.3&&clearSight(eye(p),eye(e,.6),this.solids)){e.hp--;e.hit=.3;if(e.hp<=0){this.defeated.add(e.id);this.emit('enemy','The snake ran away!');}}}
  const b=this.boss;if(b.hp>0&&b.state==='rest'&&distance(p,b)<this.bossRadius+6&&Math.abs(p.y-b.y)<5&&clearSight(eye(p),eye(b,1.3),this.solids)){b.hp--;b.hit=.4;this.emit('bossHit',`Good hit! Health remaining: ${b.hp}`);if(b.hp<=0){b.state='defeated';this.waves=[];this.status='won';this.emit('won','You saved the island and all your friends!');}}
 }
 nearbyGuide(){return this.world.NPCS.find(n=>distance(this.player,n)<2.8&&Math.abs(this.player.y-n.y)<1.5);}
 talk(n){this.talked??={};const i=this.talked[n.id]??0;this.talked[n.id]=i+1;const index=i%n.lines.length;this.emit('talk',n.lines[index],{speaker:n.name,index});}
 nearbyFriend(){return this.world.FRIENDS.find(f=>!this.rescued.has(f.id)&&distance(this.player,f)<3&&Math.abs(this.player.y-f.y)<1.5&&clearSight(eye(this.player),eye(f),this.solids,`cage-${f.id}`));}
 interact(){if(this.status!=='playing')return;if(this.discoverSecret())return;const f=this.nearbyFriend();if(!f){if(this.nearbyRushStone()){this.startRush();return;}const n=this.nearbyGuide();if(n)this.talk(n);return;}if(this.keyCount>0){this.rescued.add(f.id);this.solids=this.world.solidsFor(this.rescued);this.player.hp=this.maxHP;this.emit('rescue',`${f.name} is free! ${this.rescued.size}/3 friends rescued.`,{speaker:f.name,line:f.line,index:this.world.FRIENDS.indexOf(f)});}else this.emit('hint','Find a golden key first!');}
 tick(dt,input={}){
  if(this.status!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  // Run physics in small steps even when rendering at 10–20 frames per second.
  dt=Math.min(dt,.25);const steps=Math.ceil(dt/(1/120));
  for(let i=0;i<steps&&this.status==='playing';i++)this.step(dt/steps,i===0?input:{...input,jump:false,dash:false,bark:false,interact:false});
 }
 step(dt,input){
  this.time+=dt;const p=this.player;
  for(const key of ['invuln','dash','dashCD','barkCD','jumpBuffer'])p[key]=Math.max(0,p[key]-dt);
  p.coyote=p.grounded?this.rules.grace:Math.max(0,p.coyote-dt);
  if(input.interact)this.interact();if(input.bark)this.bark();if(this.status!=='playing')return;
  // Walking up to a guide is enough to be greeted; nobody should have to find the E key first.
  if(!this.rush){const guide=this.nearbyGuide();if(guide&&!this.talked?.[guide.id])this.talk(guide);}
  if(input.jump)p.jumpBuffer=.14;
  if(p.jumpBuffer>0&&(p.grounded||p.coyote>0||p.jumps<2)){
   const first=p.grounded||p.coyote>0;p.vy=first?10.8:10;p.jumps=first?1:2;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.emit('jump');
  }
  let mx=Number.isFinite(input.x)?input.x:0,mz=Number.isFinite(input.z)?input.z:0,length=Math.hypot(mx,mz);if(length>1){mx/=length;mz/=length;}
  const yaw=Number.isFinite(input.yaw)?input.yaw:0,dx=mx*Math.cos(yaw)+mz*Math.sin(yaw),dz=mz*Math.cos(yaw)-mx*Math.sin(yaw);if(length>.08)p.facing=Math.atan2(dx,dz);
  if(input.dash&&p.dashCD<=0){p.dash=.22;p.dashCD=this.rules.dashCooldown;this.emit('dash');}
  const gliding=!!input.glide&&this.gliderUnlocked&&!p.grounded&&p.vy<0&&p.dash<=0;if(gliding&&!p.gliding)this.emit('glide');p.gliding=gliding;
  const speed=gliding?8.6:7.5;p.vx=p.dash>0?Math.sin(p.facing)*23:dx*speed;p.vz=p.dash>0?Math.cos(p.facing)*23:dz*speed;
  moveHorizontal(p,p.vx*dt,p.vz*dt,this.solids);p.vy-=26*dt;if(gliding)p.vy=Math.max(p.vy,-2.4);moveVertical(p,p.vy*dt,this.solids);if(p.grounded)p.gliding=false;
  if(!p.grounded&&p.jumps===0&&p.coyote<=0)p.jumps=1;
  if(this.rescued.size<3&&p.z<-42.5&&p.z>-44&&Math.abs(p.x)<3&&this.time-(this.gateHint||-10)>6){this.gateHint=this.time;this.emit('hint','Rescue all three friends to open the gate.');}
  // The bridge is the only way south: gliding around the closed gate carries you back to your flag.
  if(this.rescued.size<3&&p.z<-45.5){this.emit('hint','A rescue bubble carried you back. Rescue all three friends to open the gate!');this.respawn({heal:false});return;}
  // A world marked safe never costs anything: the village is somewhere to be, not to survive.
  if(p.y<-3.5&&this.world.safe){this.respawn({heal:false});this.emit('hint','A bubble floated you back into your village.');return;}
  if(p.y<-3.5){p.hp=Math.max(0,p.hp-this.rules.fallDamage);if(p.hp===0){this.die();return;}this.respawn({heal:false});this.emit('fall',this.rules.fallDamage?'Back to the flag. Falling cost 1 heart.':'A rescue bubble brought you back to the flag.');return;}
  for(const c of [...this.world.BONES,...this.world.KEYS,...this.world.STARS])if(!this.collected.has(c.id)&&distance(p,c)<1.15&&Math.abs(p.y+.8-c.y)<1.1&&clearSight(eye(p,.8),c,this.solids)){this.collected.add(c.id);this.emit(this.world.KEYS.includes(c)?'key':this.world.STARS.includes(c)?'star':'coin',this.world.KEYS.includes(c)?'A golden key! Find a friend in a cage.':this.world.STARS.includes(c)?'Secret star found!':null);}
  for(const c of this.world.CHECKPOINTS){const near=distance(p,c)<1.8&&Math.abs(p.y-c.y)<.5&&p.grounded;if(near&&!this.flagInside.has(c.id)&&(c.id!=='boss'||this.rescued.size===3)){this.flagInside.add(c.id);this.checkpoint=c.id;p.hp=this.maxHP;this.emit('checkpoint','Checkpoint saved. Hearts refilled!');}else if(!near)this.flagInside.delete(c.id);}
  for(const h of this.world.HAZARDS)if(overlapsXZ(p,h,.35)&&p.y<h.top+.25)this.hurt();
  if(this.rush)this.updateRush(dt);
  this.updateEnemies(dt);if(this.status==='playing')this.updateBoss(dt);
 }
 updateEnemies(dt){const p=this.player;for(const e of this.enemies){e.hit=Math.max(0,e.hit-dt);if(this.defeated.has(e.id))continue;
  const near=distance(p,e)<9&&p.y<2.3&&clearSight(eye(e,.65),eye(p),this.solids);
  const tx=near?p.x:e.homeX+Math.sin(this.time*.7+e.homeX)*2.5,tz=near?p.z:e.homeZ+Math.cos(this.time*.7)*2.5;
  const d=Math.hypot(tx-e.x,tz-e.z)||1,s=near?this.rules.enemySpeed:1;
  const old={x:e.x,z:e.z};moveHorizontal(e,(tx-e.x)/d*s*dt,(tz-e.z)/d*s*dt,this.solids,{radius:.55,height:1.2,step:0,canStep:false});
  // Snakes cannot chase into the sea or outside their home region.
  if(Math.abs(e.x)>46||e.z>46||e.z<-43||Math.hypot(e.x-e.homeX,e.z-e.homeZ)>13){e.x=old.x;e.z=old.z;}
  if(distance(p,e)<1.15&&p.y<1.35&&clearSight(eye(e,.6),eye(p,.6),this.solids)){if(p.vy<-2&&p.y>.65){this.defeated.add(e.id);p.vy=8;p.grounded=false;this.emit('enemy','You jumped on the snake!');}else this.hurt();}
  if(this.status!=='playing')return;
 }}
 updateBoss(dt){
  const b=this.boss,p=this.player;if(b.hp<=0)return;b.hit=Math.max(0,b.hit-dt);
  const inArena=p.z<-56&&Math.abs(p.x)<19.5&&p.z>-87&&p.y>-.2;
  if(b.state!=='sleep'&&!inArena){this.resetBoss();return;}
  if(b.state==='sleep'){this.pushBossBody(false);if(inArena&&this.rescued.size===3){b.state='windup';b.timer=this.rules.windup;this.emit('boss',`${this.world.meta.boss}! Dodge the charges and bark while the giant rests.`);}return;}
  b.timer-=dt;
  if(b.state==='windup'&&b.timer<=0){const d=distance(p,b)||1;b.dx=(p.x-b.x)/d;b.dz=(p.z-b.z)/d;b.state='charge';b.timer=.85;}
  else if(b.state==='charge'){moveHorizontal(b,b.dx*this.rules.chargeSpeed*dt,b.dz*this.rules.chargeSpeed*dt,this.solids,{radius:this.bossRadius,height:this.bossHeight,step:0,canStep:false});b.x=clamp(b.x,-14+this.bossRadius,14-this.bossRadius);b.z=clamp(b.z,-81+this.bossRadius,-59-this.bossRadius);if(b.timer<=0){b.state='rest';b.timer=this.rules.rest;this.waves.push({x:b.x,z:b.z,r:0,hit:false});this.emit('hint','The giant is tired! Move closer and press X to bark.');}}
  else if(b.state==='rest'&&b.timer<=0){b.state='windup';b.timer=this.rules.windup;b.phase++;}
  this.pushBossBody(b.state!=='rest');
  for(const w of this.waves){w.r+=this.rules.waveSpeed*dt;if(!w.hit&&Math.abs(distance(p,w)-w.r)<.65&&p.y<2.05&&p.invuln<=0&&p.dash<=0){this.hurt();w.hit=true;}}
  this.waves=this.waves.filter(w=>w.r<38);
 }
 pushBossBody(damaging){const p=this.player,b=this.boss;if(distance(p,b)<this.bossRadius+.48&&p.y<b.y+this.bossHeight){if(damaging)this.hurt();let dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz)||1;if(Math.abs(dx)+Math.abs(dz)<.001){dz=1;d=1;}moveHorizontal(p,dx/d*(this.bossRadius+.49-d),dz/d*(this.bossRadius+.49-d),this.solids);}}
 groundBelow(p){let result=-1.1;for(const s of this.solids)if(s.top<=p.y+.02&&overlapsXZ(p,s,0))result=Math.max(result,s.top);return result;}
}
