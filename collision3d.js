// Shared, renderer-independent cylinder-vs-solid collision queries.
export const BODY = Object.freeze({radius:.48,height:2.05,step:.38});
const EPS=1e-5;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function overlapsXZ(p,s,r=BODY.radius){
 if(s.shape==='cylinder')return Math.hypot(p.x-s.x,p.z-s.z)<s.radius+r-EPS;
 const nx=clamp(p.x,s.x-s.w/2,s.x+s.w/2),nz=clamp(p.z,s.z-s.d/2,s.z+s.d/2);
 return Math.hypot(p.x-nx,p.z-nz)<r-EPS||(r===0&&Math.abs(p.x-s.x)<s.w/2&&Math.abs(p.z-s.z)<s.d/2);
}
export function penetrates(p,s,r=BODY.radius,h=BODY.height){return p.y<s.top-EPS&&p.y+h>s.bottom+EPS&&overlapsXZ(p,s,r);}
export function pushOut(p,s,r=BODY.radius){
 if(s.shape==='cylinder'){
  let dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz);if(d<.00001){dx=1;dz=0;d=1;}
  const amount=s.radius+r+.00001;p.x=s.x+dx/d*amount;p.z=s.z+dz/d*amount;return;
 }
 const nx=clamp(p.x,s.x-s.w/2,s.x+s.w/2),nz=clamp(p.z,s.z-s.d/2,s.z+s.d/2);
 let dx=p.x-nx,dz=p.z-nz,d=Math.hypot(dx,dz);
 if(d>EPS){const amount=r+.00001;p.x=nx+dx/d*amount;p.z=nz+dz/d*amount;return;}
 const faces=[{axis:'x',value:s.x-s.w/2-r,delta:p.x-(s.x-s.w/2)},{axis:'x',value:s.x+s.w/2+r,delta:s.x+s.w/2-p.x},{axis:'z',value:s.z-s.d/2-r,delta:p.z-(s.z-s.d/2)},{axis:'z',value:s.z+s.d/2+r,delta:s.z+s.d/2-p.z}].sort((a,b)=>a.delta-b.delta);
 p[faces[0].axis]=faces[0].value;
}
export function moveHorizontal(p,dx,dz,solids,{radius=BODY.radius,height=BODY.height,step=BODY.step,canStep=p.grounded}={}){
 // Steps are only permitted from solid ground, never as an aerial wall climb.
 const startY=p.y;p.x+=dx;p.z+=dz;
 for(let pass=0;pass<4;pass++)for(const s of solids){
  if(!penetrates(p,s,radius,height))continue;
  if(canStep&&s.top-startY<=step+EPS&&s.top>=startY&& !solids.some(other=>other!==s&&penetrates({...p,y:s.top},other,radius,height))){p.y=s.top;continue;}
  pushOut(p,s,radius);
 }
}
export function moveVertical(p,dy,solids,{radius=BODY.radius,height=BODY.height}={}){
 const oldY=p.y,newY=oldY+dy;let floor=-Infinity,ceiling=Infinity;
 for(const s of solids){if(!overlapsXZ(p,s,radius))continue;
  if(dy<=0&&oldY>=s.top-EPS&&newY<=s.top)floor=Math.max(floor,s.top);
  if(dy>0&&oldY+height<=s.bottom+EPS&&newY+height>=s.bottom)ceiling=Math.min(ceiling,s.bottom-height);
 }
 p.grounded=false;p.y=newY;
 if(Number.isFinite(floor)){p.y=floor;p.vy=0;p.grounded=true;p.jumps=0;}
 if(Number.isFinite(ceiling)){p.y=ceiling;p.vy=0;}
}
// Slab/cylinder ray tests are shared by line of sight and the camera.
export function segmentHit(a,b,s,padding=0){
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;let near=0,far=1;
 function slab(origin,delta,min,max){if(Math.abs(delta)<EPS)return origin>=min&&origin<=max;let t1=(min-origin)/delta,t2=(max-origin)/delta;if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);return near<=far;}
 if(!slab(a.y,dy,s.bottom-padding,s.top+padding))return null;
 if(s.shape==='cylinder'){
  const ox=a.x-s.x,oz=a.z-s.z,r=s.radius+padding,A=dx*dx+dz*dz,C=ox*ox+oz*oz-r*r;
  if(A<EPS){if(C>0)return null;}else{const B=2*(ox*dx+oz*dz),disc=B*B-4*A*C;if(disc<0)return null;near=Math.max(near,(-B-Math.sqrt(disc))/(2*A));far=Math.min(far,(-B+Math.sqrt(disc))/(2*A));if(near>far)return null;}
 }else if(!slab(a.x,dx,s.x-s.w/2-padding,s.x+s.w/2+padding)||!slab(a.z,dz,s.z-s.d/2-padding,s.z+s.d/2+padding))return null;
 return near>=0&&near<=1?near:null;
}
export function clearSight(a,b,solids,ignoreId){return !solids.some(s=>s.id!==ignoreId&&segmentHit(a,b,s)!==null);}
export function safeCamera(target,desired,solids){let t=1;for(const s of solids){const hit=segmentHit(target,desired,s,.18);if(hit!==null)t=Math.min(t,Math.max(0,hit-.015));}return {x:target.x+(desired.x-target.x)*t,y:target.y+(desired.y-target.y)*t,z:target.z+(desired.z-target.z)*t};}
