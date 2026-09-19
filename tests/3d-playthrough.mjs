import assert from 'node:assert/strict';
export function go(g,x,z,height=0,jump=false,hz=60){let second=false;
 for(let frame=0;frame<hz*12;frame++){const p=g.player,d=Math.hypot(x-p.x,z-p.z);if(d<.25&&p.grounded&&Math.abs(p.y-height)<.1)return;
  let j=jump&&frame===0;if(jump&&!second&&p.vy<=.4&&p.jumps===1){j=true;second=true;}
  g.tick(1/hz,{x:d>.15?(x-p.x)/Math.max(d,1):0,z:d>.15?(z-p.z)/Math.max(d,1):0,jump:j,bark:p.barkCD===0});
  assert.equal(g.status,'playing',`Stopped en route to ${x},${height},${z}`);
 }assert.fail(`Unreachable ${x},${height},${z}; at ${JSON.stringify(g.player)}`);
}
export function rescueRoute(g,hz=60){
 const route=(points)=>{for(const [x,z,y=0,jump=false]of points)go(g,x,z,y,jump,hz);};
 route([[-12,14],[-14,14,1.1,true],[-17,10,2.2,true],[-24,8,3.4,true],[-24,4.8,3.4],[-24,-2.5,3.8,true]]);g.interact();assert.ok(g.rescued.has('peach'));
 route([[-13,-5,0,true],[16,18],[23,18],[27,18,1.2,true],[32,16,2.4,true],[37,12,3.6,true],[30,7,0,true],[30,-6.5]]);g.interact();assert.ok(g.rescued.has('spark'));
 route([[7,-13],[6,-19,1.5,true],[10,-23,3,true],[14,-27,4.5,true],[18,-31,6,true],[18,-34.5,7.5,true]]);g.interact();assert.ok(g.rescued.has('fluff'));
 route([[0,-37,0,true],[0,-43,.5],[0,-52,.5],[0,-64,1.2]]);assert.equal(g.keyCount,0);
}
export function fightBoss(g,hz=60){
 let lastJump=-100,dodgeDirection=null;
 for(let frame=0;frame<hz*100&&g.status==='playing';frame++){
  const p=g.player,b=g.boss,d=Math.hypot(p.x-b.x,p.z-b.z)||1,close=b.state==='rest';
  let x=0,z=0;
  if(close&&d>g.bossRadius+4){x=(b.x-p.x)/d;z=(b.z-p.z)/d;}
  if(!close&&d<g.bossRadius+8){x=(p.x-b.x)/d;z=(p.z-b.z)/d;}
  if(b.state!=='charge')dodgeDirection=null;
  if(b.state==='charge'){
   // The charge direction is locked: sidestep perpendicular to it, toward arena centre.
   if(!dodgeDirection){x=-b.dz;z=b.dx;if(x*(-p.x)+z*(-70-p.z)<0){x=-x;z=-z;}dodgeDirection={x,z};}
   ({x,z}=dodgeDirection);
  }
  // Use the arena's space, not the exit; retreating through the exit resets the fight.
  if(p.z>-61&&z>0){z=0;x=p.x<0?-1:1;}
  if(p.z<-79&&z<0){z=0;x=p.x<0?1:-1;}
  if(p.x>12&&x>0){x=0;z=p.z>-70?-1:1;}
  if(p.x<-12&&x<0){x=0;z=p.z>-70?1:-1;}
  if(b.state==='sleep'){z=-1;x=0;}
  const waveDanger=g.waves.some(w=>{const gap=Math.hypot(p.x-w.x,p.z-w.z)-w.r;return !w.hit&&gap<4.5&&gap>-.8;});
  const needJump=waveDanger||(b.state==='charge'&&d<g.bossRadius+3);
  const jump=(p.grounded&&needJump)||(needJump&&p.jumps===1&&p.vy<0&&frame-lastJump>hz*.3);if(jump)lastJump=frame;
  g.tick(1/hz,{x,z,bark:close&&p.barkCD===0,jump,dash:b.state==='charge'&&d<g.bossRadius+3&&p.dashCD===0});
 }
 assert.equal(g.status,'won',`${g.difficulty}, ${hz} Hz: boss ${JSON.stringify(g.boss)}, player ${JSON.stringify(g.player)}`);
}
