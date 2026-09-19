import { GROUND, WORLDS, makeLevel } from './levels.js';
export { GROUND, WORLDS, WORLD_NAMES, TOTAL_BONES, TOTAL_STARS, makeLevel } from './levels.js';
export const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const box=item=>({x:item.x-14,y:item.y-14,w:28,h:28});

export class Adventure {
  constructor(){this.status='menu';this.stage=0;this.unlocked=0;this.score=0;this.collected=new Set();this.found=new Set();this.completed=new Set();this.defeated=new Set();this.events=[];this.time=0;this.maxHp=5;this.loadLevel(0);}
  get starCount(){return [...this.found].filter(id=>id.includes('-star-')).length;}
  get friendCount(){return [...this.found].filter(id=>id.endsWith('-friend')).length;}
  loadLevel(index){
    this.stage=index;this.level=makeLevel(index);this.spawnX=80;
    this.player={x:80,y:GROUND-62,w:46,h:62,vx:0,vy:0,dir:1,grounded:true,coyote:.1,buffer:0,hp:this.maxHp,invuln:0,barkCooldown:0,barkTime:0,airJump:true,dashTime:0,dashCooldown:0,shield:0,magnet:0,power:0,standing:null};
    this.shots=[];this.venom=[];this.camera=0;
    if(this.level.boss&&this.defeated.has(index))this.level.boss.hp=0;
    this.level.chests.forEach(c=>c.opened=this.found.has(c.id));
    if(this.level.friend)this.level.friend.rescued=this.found.has(this.level.friend.id);
  }
  start(){this.score=0;this.collected.clear();this.found.clear();this.completed.clear();this.defeated.clear();this.unlocked=0;this.time=0;this.loadLevel(0);this.status='playing';this.events=[{type:'start'}];}
  next(){if(this.stage>=WORLDS.length-1)return;this.unlocked=Math.max(this.unlocked,this.stage+1);this.loadLevel(this.stage+1);this.status='playing';this.events.push({type:'world',stage:this.stage});}
  visit(index){if(!Number.isInteger(index)||index<0||index>this.unlocked)return false;this.loadLevel(index);this.status=index===5&&this.defeated.has(5)?'won':'playing';this.events.push({type:this.status==='won'?'win':'world',stage:index});return true;}
  retry(){this.player.hp=this.maxHp;this.respawn();this.status='playing';}
  respawn(){const p=this.player;p.x=this.spawnX;p.y=GROUND-p.h;p.vx=p.vy=0;p.invuln=2;p.grounded=true;p.airJump=true;p.dashTime=0;p.standing=null;this.venom=[];this.shots=[];}
  snapshot(){return{version:2,stage:this.stage,unlocked:this.unlocked,spawnX:this.spawnX,collected:[...this.collected],found:[...this.found],completed:[...this.completed],defeated:[...this.defeated]};}
  restore(data){
    if(!data||data.version!==2||!Number.isInteger(data.stage)||!WORLDS[data.stage]||!Number.isInteger(data.unlocked)||data.unlocked<data.stage||data.unlocked>=WORLDS.length)return false;
    for(const key of ['collected','found','completed','defeated'])if(!Array.isArray(data[key])||data[key].length>2000)return false;
    const all=WORLDS.map((_,i)=>makeLevel(i));
    const coins=new Set(all.flatMap(l=>l.bones.map(b=>b.id)));
    const items=new Set(all.flatMap(l=>[...l.stars,...l.pickups,...l.chests,...(l.friend?[l.friend]:[])].map(item=>item.id)));
    this.collected=new Set(data.collected.filter(id=>coins.has(id)));this.found=new Set(data.found.filter(id=>items.has(id)));
    this.completed=new Set(data.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<=data.unlocked));
    this.defeated=new Set(data.defeated.filter(i=>[2,5].includes(i)&&i<=data.unlocked));
    this.score=this.collected.size+[...this.found].filter(id=>id.includes('-chest-')).length*5;
    this.unlocked=data.unlocked;this.loadLevel(data.stage);
    this.spawnX=this.level.checkpoints.includes(data.spawnX)?data.spawnX:80;this.respawn();this.status=this.stage===5&&this.defeated.has(5)?'won':'playing';this.events=[{type:'restored'},...(this.status==='won'?[{type:'win'}]:[])];return true;
  }
  hurt(fell=false){
    if(this.status!=='playing')return;
    const p=this.player;if(!fell&&(p.invuln>0||p.dashTime>0))return;
    if(!fell&&p.shield>0){p.shield=0;p.invuln=1.2;this.events.push({type:'shieldBreak',x:p.x+23,y:p.y+30});return;}
    p.hp--;this.events.push({type:'hurt'});
    if(p.hp<=0){this.status='dead';return;}
    if(fell)this.respawn();else{p.invuln=1.6;p.vy=-330;p.vx=-p.dir*220;}
  }
  hitBoss(){
    const b=this.level.boss;if(!b||b.invuln>0||b.hp<=0||this.status!=='playing')return;
    b.hp--;b.invuln=.6;this.events.push({type:'bossHit',x:b.x+60,y:b.y+55});
    if(b.hp<=0){this.defeated.add(this.stage);this.venom=[];
      if(this.stage===WORLDS.length-1){this.completed.add(this.stage);this.status='won';this.events.push({type:'win'});}
      else this.events.push({type:'guardianDown',x:b.x,y:b.y});
    }
  }
  collect(item){
    if(this.found.has(item.id))return;this.found.add(item.id);const p=this.player;
    if(item.kind==='heart')p.hp=Math.min(this.maxHp,p.hp+2);
    if(item.kind==='shield')p.shield=20;
    if(item.kind==='magnet')p.magnet=16;
    if(item.kind==='power')p.power=14;
    this.events.push({type:item.kind==='star'?'star':'powerup',kind:item.kind,x:item.x,y:item.y});
  }
  tick(dt,input={}){
    if(this.status!=='playing')return;dt=Math.max(0,Math.min(dt,.035));this.time+=dt;
    const p=this.player,l=this.level;
    for(const key of ['invuln','barkCooldown','barkTime','dashTime','dashCooldown','shield','magnet','power'])p[key]=Math.max(0,p[key]-dt);
    for(const f of l.platforms)if(f.moving){const previous=f.x;f.x=f.home+Math.sin(this.time*f.speed+f.phase)*f.range;f.dx=f.x-previous;if(p.standing===f&&p.grounded)p.x+=f.dx;}
    p.buffer=input.jumpPressed?.13:Math.max(0,p.buffer-dt);p.coyote=p.grounded?.11:Math.max(0,p.coyote-dt);
    if(p.grounded)p.airJump=true;
    const axis=(input.right?1:0)-(input.left?1:0);if(axis)p.dir=axis;
    if(input.dashPressed&&p.dashCooldown<=0){p.dashTime=.19;p.dashCooldown=1.2;p.vy=0;this.events.push({type:'dash',x:p.x+23,y:p.y+32});}
    p.vx+=Math.max(-2200*dt,Math.min(2200*dt,axis*310-p.vx));
    if(p.buffer>0&&(p.coyote>0||p.airJump)){
      const second=p.coyote<=0;p.vy=second?-605:-665;p.grounded=false;p.standing=null;p.coyote=p.buffer=0;if(second)p.airJump=false;
      this.events.push({type:second?'doubleJump':'jump',x:p.x+23,y:p.y+62});
    }
    if(!input.jumpHeld&&p.vy< -270)p.vy+=1900*dt;
    if(input.bark&&p.barkCooldown<=0){
      this.shots.push({x:p.x+(p.dir>0?45:-25),y:p.y+24,w:p.power?44:28,h:p.power?38:25,dir:p.dir,life:p.power?1.1:.78,powered:p.power>0});
      p.barkCooldown=p.power?.25:.48;p.barkTime=.22;this.events.push({type:'bark'});
    }
    p.vy=Math.min(900,p.vy+1650*dt);if(p.dashTime>0){p.vx=p.dir*760;p.vy=0;}
    p.x=Math.max(0,Math.min(l.length-p.w,p.x+p.vx*dt));const oldBottom=p.y+p.h;
    p.y+=p.vy*dt;p.grounded=false;p.standing=null;
    for(const f of l.platforms)if(p.vy>=0&&oldBottom<=f.y+2&&p.y+p.h>=f.y&&p.x+p.w>f.x+2&&p.x<f.x+f.w-2){p.y=f.y-p.h;p.vy=0;p.grounded=true;p.standing=f;}
    if(p.y>790){this.hurt(true);return;}
    for(const spring of l.springs)if(p.grounded&&overlap(p,{...spring,y:spring.y-5,h:25})){p.vy=-900;p.grounded=false;p.coyote=0;p.airJump=true;this.events.push({type:'spring',x:spring.x+19,y:spring.y});}
    for(const b of l.bones){
      if(this.collected.has(b.id))continue;
      if(p.magnet>0&&Math.hypot(p.x+23-b.x,p.y+30-b.y)<175){b.x+=(p.x+23-b.x)*dt*7;b.y+=(p.y+30-b.y)*dt*7;}
      if(overlap(p,box(b))){this.collected.add(b.id);this.score++;this.events.push({type:'bone',x:b.x,y:b.y});}
    }
    for(const item of [...l.stars,...l.pickups])if(!this.found.has(item.id)&&overlap(p,box(item)))this.collect(item);
    for(const x of l.checkpoints)if(p.x>=x&&x>this.spawnX){this.spawnX=x;p.hp=Math.min(this.maxHp,p.hp+1);this.events.push({type:'checkpoint',x,y:450});}
    for(const e of l.enemies){
      if(!e.alive)continue;e.x+=e.dir*e.speed*dt;if(Math.abs(e.x-e.home)>75)e.dir*=-1;
      if(e.kind==='flyer')e.y=e.baseY+Math.sin(this.time*2.5+e.phase)*44;
      if(overlap(p,e)){
        if(p.dashTime>0||(p.vy>80&&oldBottom<e.y+15)){e.alive=false;p.vy=p.dashTime>0?p.vy:-430;this.events.push({type:'poof',x:e.x+20,y:e.y});}
        else this.hurt();
      }
    }
    if(this.status!=='playing')return;
    const b=l.boss;
    if(b&&b.hp>0){
      b.invuln=Math.max(0,b.invuln-dt);b.phase+=dt;b.x=b.home+Math.sin(b.phase*.9)*105;b.y=GROUND-b.h+Math.sin(b.phase*2.2)*6;
      if(Math.abs(p.x-b.x)<1000){b.timer-=dt;
        if(b.timer<=0){
          b.attack++;b.timer=b.hp<=b.maxHp/2?2.1:2.6;
          const dx=p.x+23-b.x,dy=p.y+30-(b.y+42),angle=Math.atan2(dy,dx),speed=b.kind==='guardian'?205:235;
          const offsets=b.hp<=b.maxHp/2&&b.attack%2===0?[-.18,0,.18]:[0];
          for(const offset of offsets)this.venom.push({x:b.x,y:b.y+42,w:20,h:20,vx:Math.cos(angle+offset)*speed,vy:Math.sin(angle+offset)*speed,life:5,kind:'orb'});
          if(b.kind==='king'&&b.attack%3===0)this.venom.push({x:b.x,y:GROUND-23,w:29,h:23,vx:-245,vy:0,life:5,kind:'wave'});
          this.events.push({type:'venom'});
        }
      }
      if(overlap(p,b)){if(p.vy>80&&oldBottom<b.y+25){this.hitBoss();p.vy=-580;p.airJump=true;}else this.hurt();}
    }
    for(const s of this.shots){
      s.x+=s.dir*600*dt;s.life-=dt;
      for(const e of l.enemies)if(e.alive&&s.life>0&&overlap(s,e)){e.alive=false;if(!s.powered)s.life=0;this.events.push({type:'poof',x:e.x+25,y:e.y});}
      for(const c of l.chests)if(!c.opened&&s.life>0&&overlap(s,c)){c.opened=true;this.found.add(c.id);this.score+=5;s.life=0;this.events.push({type:'chest',x:c.x+22,y:c.y});}
      const friend=l.friend;
      if(friend&&!friend.rescued&&s.life>0&&overlap(s,friend)){friend.rescued=true;this.found.add(friend.id);s.life=0;this.events.push({type:'rescue',name:friend.name,x:friend.x+29,y:friend.y+20});}
      if(b&&s.life>0&&overlap(s,b)){this.hitBoss();s.life=0;}
      for(const v of this.venom)if(s.life>0&&v.life>0&&overlap(s,v)){v.life=s.life=0;this.events.push({type:'poof',x:v.x,y:v.y});}
    }
    this.shots=this.shots.filter(s=>s.life>0);
    for(const v of this.venom){v.x+=v.vx*dt;v.y+=v.vy*dt;v.life-=dt;if(v.life>0&&overlap(p,v)){v.life=0;this.hurt();}}
    this.venom=this.venom.filter(v=>v.life>0);
    if(this.status==='playing'&&this.stage<WORLDS.length-1&&p.x>l.exit&&p.y+p.h>400&&(!b||b.hp<=0)){
      this.completed.add(this.stage);this.unlocked=Math.max(this.unlocked,this.stage+1);this.status='transition';this.events.push({type:'complete'});
    }
  }
}
