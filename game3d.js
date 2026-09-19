import * as T from './vendor/three.module.js';
import {Adventure3D,DIFFICULTIES,LEVELS,createWorld,hasProgress,CRYSTALS} from './adventure3d.js';
import {safeCamera} from './collision3d.js';
import {DRAWING_STORAGE,parseDrawing,stickerCanvas,studioMarkup,mountStudio} from './drawing3d.js';
import {SOUND_STORAGE,playSfx,createMusic} from './audio3d.js';
import {SLOTS,SLOT_NAMES,WARDROBE,wornItem,owns} from './wardrobe3d.js';
import {readPad,RUMBLE} from './input3d.js';
import {SETTINGS_STORAGE,parseSettings,FOLLOW,ZOOM,followYaw} from './settings3d.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {joinParty,makeRoomCode,normalizeCode,isCompleteCode,formatCode,pickName,easeRemote,waitingMessage,LONELY_AFTER,NAMES,MAX_PLAYERS,CODE_LENGTH} from './multiplayer3d.js';
import {STORIES,storyText,isStoryOpen,storiesForLevel,STORY_COUNT} from './stories3d.js';
import {createVoice,parseManifest,captionForSound,lineId,VOICE_DIR} from './voice3d.js';
const $=id=>document.getElementById(id),canvas=$('world');
const STORAGE='superdog-island-3d-v4',LEGACY_STORAGE='superdog-island-3d-v3';
let save=null;try{save=JSON.parse(localStorage.getItem(STORAGE)||localStorage.getItem(LEGACY_STORAGE)||'null');}catch{}
const game=new Adventure3D(save);
const {PLATFORMS,FRIENDS,KEYS,STARS,BONES,CHECKPOINTS,SPAWN,TREES,PROPS,ROCKS}=game.world;
const theme=game.world.meta;
const scene=new T.Scene();scene.background=new T.Color(theme.sky);scene.fog=new T.Fog(theme.sky,75,180);
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});}catch(error){$('loading').textContent='This game needs WebGL. Open it in Chrome or Edge with hardware acceleration enabled.';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const camera=new T.PerspectiveCamera(52,1,.1,250);
scene.add(new T.HemisphereLight(0xeaffff,0x698947,1.8));
const sun=new T.DirectionalLight(0xffedc4,3.2);sun.position.set(-35,65,28);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-58,right:58,top:62,bottom:-62,near:1,far:150});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;scene.add(sun);sun.target.position.set(0,0,-15);scene.add(sun.target);
const mats=new Map();function mat(color){color=({[0x97c861]:theme.ground,[0x68c9d8]:theme.sea,[0xb9bb94]:theme.stone,[0xb3d77c]:theme.ground,[0xaeb888]:theme.stone,[0xd8d2b7]:theme.stone,...(game.level===2?{[0x66a968]:0xe3f3fc,[0x81bb6c]:0xc9dfec,[0x98c77a]:0xf4fbff,[0x498960]:0xbdd9ec,[0x68a96b]:0xebf6ff}:{}),...(game.level===3?{[0x66a968]:0xbe8173,[0x81bb6c]:0xd9a084,[0x98c77a]:0xe5b390}:{})})[color]??color;if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.88,flatShading:true}));return mats.get(color);}
const geo={box:new T.BoxGeometry(1,1,1),ball:new T.IcosahedronGeometry(1,1),cylinder:new T.CylinderGeometry(1,1,1,10),disc:new T.CylinderGeometry(1,1,1,28),cone:new T.ConeGeometry(1,1,7)};
// Ground cover and paths follow each world so snow and lava never grow green meadow bushes.
const foliage=[{bush:0x82b56a,stem:0x63964d,flowers:[0xf1b591,0xffedac],path:0xdcd09a},{bush:0x5f8a66,stem:0x4f7a55,flowers:[0xffafc4,0xfff0cb],path:0xcdbb9a},{bush:0xd6eaf2,stem:0x9cc4d6,flowers:[0xa2e7ff,0xffffff],path:0xbfd6e3},{bush:0x6d5d6b,stem:0x57495a,flowers:[0xffb35a,0xff8a4c],path:0x625667},{bush:0xf8fbf3,stem:0xd9d3ee,flowers:[0xffd275,0xffc2e0],path:0xe8def5}][game.level]||{bush:0x82b56a,stem:0x63964d,flowers:[0xf1b591,0xffedac],path:0xdcd09a};
function mesh(kind,color,x,y,z,sx=1,sy=sx,sz=sx,parent=scene){const m=new T.Mesh(geo[kind],mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cube(color,x,y,z,w,h,d,parent){return mesh('box',color,x,y,z,w,h,d,parent);}
function ball(color,x,y,z,r,parent,sY=1,sZ=1){return mesh('ball',color,x,y,z,r,r*sY,r*sZ,parent);}
function cylinder(color,x,y,z,r,h,parent){return mesh('cylinder',color,x,y,z,r,h,r,parent);}
// The child's drawing is layered onto the cape and flag faces; the thin edges keep their plain color.
let drawing=null,drawingMats=null,capeColor=0xe87862;const hex=c=>'#'+c.toString(16).padStart(6,'0');try{drawing=parseDrawing(localStorage.getItem(DRAWING_STORAGE));}catch{}
function applyDrawing(d){drawing=d;for(const m of Object.values(drawingMats||{}))m[4].map.dispose();drawingMats=null;if(!d)return;const img=new Image();img.onload=()=>{if(drawing!==d)return;const face=(bg,w,h)=>{const t=new T.CanvasTexture(stickerCanvas(img,w,h,bg));t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;const m=new T.MeshStandardMaterial({map:t,roughness:.9});return m;};const surface=(color,hex,w,h)=>{const f=face(hex,w,h),edge=mat(color);return [edge,edge,edge,edge,f,f];};drawingMats={cape:surface(capeColor,hex(capeColor),240,272),flag:surface(0xf5c563,'#f5c563',288,168),flagOn:surface(0x85c37a,'#85c37a',288,168)};};img.src=d.image;}
applyDrawing(drawing);
function group(x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);scene.add(g);return g;}
let seed=7231;function rnd(a=0,b=1){seed=(seed*16807)%2147483647;return a+(seed/2147483647)*(b-a);}

// Sea, beach, and the broad grass island.
const sea=mesh('box',0x68c9d8,0,-1.1,-12,650,.3,650);sea.castShadow=false;
const shore=cube(0xead49a,0,-.6,1,101,1,99);shore.castShadow=false;
const terrainMeshes=[];
for(const p of PLATFORMS){
 const h=p.top-p.bottom;
 if(p.kind==='island'||p.kind==='arena'){
  const rock=cube(p.kind==='island'?0xb6aa80:0xa7a199,p.x,p.bottom+h/2,p.z,p.w,h,p.d);terrainMeshes.push(rock);
  terrainMeshes.push(cube(p.kind==='arena'?0xaeb888:0x97c861,p.x,p.top-.12,p.z,p.w,.25,p.d));
 }else if(p.kind==='house'){
  terrainMeshes.push(cube(p.id==='house2'?0xffdb93:0xf8e6b4,p.x,p.top/2,p.z,p.w,p.top,p.d));
  cube(0xd88260,p.x,p.top-.12,p.z,p.w+.25,.25,p.d+.25);
  // Terrace rims, awnings and chimneys are rendered from their shared colliders below.
  cube(0xb16e4b,p.x,.95,p.z+p.d/2+.04,1.3,1.9,.1);ball(0xf6c35f,p.x+.42,.9,p.z+p.d/2+.12,.1);
  for(const dx of [-2.4,2.4]){cube(0xfff5d4,p.x+dx,2,p.z+p.d/2+.07,1.2,1.3,.14);cube(0x729aab,p.x+dx,2.03,p.z+p.d/2+.16,.85,.9,.08);cube(0xf9e0a4,p.x+dx,2.03,p.z+p.d/2+.22,.09,.9,.06);}
 }else if(p.kind==='mushroom'){
  cylinder(0xf6dec1,p.x,p.top/2,p.z,.6,p.top);const cap=cube(0xe49776,p.x,p.top-.2,p.z,p.w,.4,p.d);terrainMeshes.push(cap);
  for(let i=0;i<5;i++)ball(0xfff0cb,p.x+rnd(-p.w*.35,p.w*.35),p.top+.03,p.z+rnd(-p.d*.35,p.d*.35),.22,scene,.25,1);
 }else if(p.kind==='bridge'){
  terrainMeshes.push(cube(0xba8855,p.x,p.top-.16,p.z,p.w,.32,p.d));
  for(let z=p.z-p.d/2;z<p.z+p.d/2;z+=.75)cube(0xe2b97a,p.x,p.top+.025,z,p.w,.08,.62);
 }else{
  terrainMeshes.push(cube(p.kind==='crate'?0xc69660:p.kind==='float'?0xd8d2b7:0xb9bb94,p.x,(p.top+p.bottom)/2,p.z,p.w,h,p.d));
  cube(p.kind==='crate'?0xe4b977:0xb3d77c,p.x,p.top-.08,p.z,p.w+.05,.16,p.d+.05);
  if(p.kind==='crate'){for(const z of [-1,1])cube(0x9f774b,p.x,p.top*.5,p.z+z*(p.d/2+.02),p.w,.12,.08);}
  if(p.kind==='float')for(let i=0;i<3;i++)ball(0xf2f6e9,p.x+rnd(-2,2),p.bottom-.5,p.z+rnd(-1,1),1.1,scene,.6,1.1);
 }
}
// Curving sandy paths (small overlapping disks) lead between landmarks.
function path(points,width=2){for(let k=0;k<points.length-1;k++){const [ax,az]=points[k],[bx,bz]=points[k+1],n=Math.ceil(Math.hypot(bx-ax,bz-az)/.45);for(let i=0;i<=n;i++){const t=i/n;const m=mesh('disc',foliage.path,ax+(bx-ax)*t,.015,az+(bz-az)*t,width,.025,width);m.castShadow=false;}}}
if(!game.level){path([[0,42],[0,20],[0,4],[-12,2],[-15,-11],[-29,-19]],2.1);path([[0,13],[15,15],[25,8],[28,-9],[19,-17],[4,-17],[0,-43]],1.7);path([[-12,2],[-12,17],[-28,25],[-38,32]],1.4);}
else{path([[0,42],[0,32],[0,0],[-12,0],[-12,-36],[0,-38],[0,-43]],1.4);for(const route of game.world.COURSES){const [x,z]=route[0];path([[0,32],[x,z+4.5],[x,z]],1.2);}}
function tree(x,z,s=1,type=0){const g=group(x,0,z);cylinder(0x97764d,0,1.4*s,0,.28*s,2.8*s,g);if(type){mesh('cone',0x498960,0,3*s,0,1.6*s,3.6*s,1.6*s,g);mesh('cone',0x68a96b,0,4.3*s,0,1.2*s,2.8*s,1.2*s,g);}else{ball(0x66a968,0,3.2*s,0,1.6*s,g);ball(0x81bb6c,-.7*s,3*s,.3*s,1.15*s,g);ball(0x98c77a,.7*s,3.7*s,0,1.1*s,g);}return g;}
TREES.forEach(t=>tree(t.x,t.z,t.scale,t.pine));
for(let i=0;i<25;i++){const x=rnd(-46,46),z=rnd(-43,45);if(Math.abs(x)<5||PLATFORMS.some(p=>p.kind!=='island'&&Math.abs(x-p.x)<p.w/2+2&&Math.abs(z-p.z)<p.d/2+2))continue;ball(foliage.bush,x,.3,z,.7,scene,.65,1.2);for(let j=0;j<3;j++){const fx=x+rnd(-1.5,1.5),fz=z+rnd(-1.5,1.5);cylinder(foliage.stem,fx,.22,fz,.03,.4);ball(foliage.flowers[i%3===0?0:1],fx,.44,fz,.14);}}
ROCKS.forEach(r=>ball(0xb7ac8b,r.x,-.3*r.r,r.z,r.r,scene,.8,1));
// A lighthouse and flags give the island a recognisable skyline.
for(const s of PROPS){
 if(s.id.startsWith('bridge-rail')){cube(s.color,s.x,s.top-.065,s.z,s.w,.13,s.d);for(let z=s.z-s.d/2;z<=s.z+s.d/2;z+=1.25)cylinder(0x967145,s.x,(s.top+s.bottom)/2,z,.1,s.top-s.bottom);}
 else if(s.shape==='cylinder')cylinder(s.color,s.x,(s.bottom+s.top)/2,s.z,s.radius,s.top-s.bottom);
 else cube(s.color,s.x,(s.bottom+s.top)/2,s.z,s.w,s.top-s.bottom,s.d);
}
const lighthouse=group(-39,0,-35);mesh('cone',0xc77f62,0,11.7,0,2.5,1.5,2.5,lighthouse);
const flags=[];for(const c of CHECKPOINTS){const g=group(c.x-2,c.y,c.z);const f=cube(0xf5c563,.6,2.7,0,1.2,.7,.035,g);flags.push({mesh:f,id:c.id});ball(0xffedb7,0,3.25,0,.14,g);}
const gate=group(0,0,-44.5);for(const x of [-3.4,3.4])ball(0xd9dbb0,x,8.6,0,.75,gate);const gateBars=group(0,0,-44.5);for(let x=-2.8;x<=2.8;x+=.55)cylinder(0xc69a4e,x,4,0,.075,8,gateBars);cube(0xd5ad62,0,7.9,0,6,.18,.18,gateBars);
// Crown pillars and serpent banners frame the final arena.
for(const x of [-16,16])for(const z of [-58,-82])ball(0xe5b75c,x,6.8,z,.65);
for(let i=0;i<10;i++){const a=i/10*Math.PI*2;cube(0xbfc293,Math.sin(a)*14,1.24,-71+Math.cos(a)*10,1.4,.05,1.4).rotation.y=a;}

// Signature landmarks of the later worlds; their colliders live in campaign3d.js.
const glowMat=(color,emissive,intensity=.9)=>new T.MeshStandardMaterial({color,emissive,emissiveIntensity:intensity,roughness:.7,flatShading:true});
function glowing(m,color,emissive,intensity){m.material=glowMat(color,emissive,intensity);m.castShadow=false;return m;}
let volcanoCrater=null;
for(const l of game.world.LANDMARKS){const {x,z}=l;
 if(l.kind==='mushroom-tree'){cylinder(0xf2e3c8,x,4.5,z,1.7,9);ball(0xd8676a,x,10,z,6,scene,.42,1);for(const [dx,dz] of [[2.5,1],[-2,2.6],[.5,-3],[-3.4,-1],[3.2,-2.2]])ball(0xfff4de,x+dx,11.5,z+dz,.55,scene,.4,1);cube(0x8a5a36,x,1,z+1.66,1,2,.15);for(const y of [4.5,6.6])glowing(cube(0xffd98a,x,y,z+1.66,.55,.55,.12),0xffd98a,0xffb347,.7);}
 else if(l.kind==='fairy-ring'){for(let i=0;i<9;i++){const a=i*Math.PI*2/9,mx=x+Math.sin(a)*4.2,mz=z+Math.cos(a)*4.2;cylinder(0xf6dec1,mx,.5,mz,.25,1);ball([0xe49776,0xffafc4,0xf6c343][i%3],mx,1.15,mz,.6,scene,.5,1);}const c=new T.Mesh(new T.RingGeometry(1.1,1.5,40),glowMat(0xfff0b8,0xffd98a,.8));c.rotation.x=-Math.PI/2;c.position.set(x,.04,z);scene.add(c);}
 else if(l.kind==='ice-palace'){cube(0xd8f0fb,x,4.5,z,5,9,5);mesh('cone',0xa2e7ff,x,11,z,3.8,4,3.8);for(const s of [-1,1]){cube(0xcde9f6,x+s*4.2,3,z+1,2.4,6,2.4);mesh('cone',0xbfe8fb,x+s*4.2,7.4,z+1,1.8,2.8,1.8);}cube(0x6fa3c4,x,1.2,z+2.53,1.6,2.4,.1);for(const [wx,wy] of [[-1.3,6],[1.3,6],[0,4]])glowing(cube(0x9fd6f0,x+wx,wy,z+2.53,.8,1.1,.1),0xbfe8fb,0x7fc8ec,.5);}
 else if(l.kind==='crystal-garden'){const pond=cylinder(0xdff4fb,x,.03,z,4.2,.04);pond.castShadow=false;CRYSTALS.forEach(([dx,dz,h],i)=>{const m=mesh('cone',i%2?0xc9f3ff:0xa2e7ff,x+dx,h/2,z+dz,.55,h,.55);m.rotation.z=(i%3-1)*.08;});}
 else if(l.kind==='volcano'){mesh('cone',0x6d5d6b,x,4.5,z,7,9,7);mesh('cone',0x7d6c7b,x+1.2,2.2,z+2.5,3.2,4.4,3.2);glowing(cylinder(0xff8a4c,x,8.2,z,1.05,.35),0xffb35a,0xff5a1f,1.2);for(const [dx,dy,dz] of [[.9,6.6,.6],[-.7,5.2,1.3],[1.6,3.8,1.9]])glowing(ball(0xff8a4c,x+dx,dy,z+dz,.28),0xffb35a,0xff5a1f,1);volcanoCrater={x,y:8.6,z};}
 else if(l.kind==='obsidian-arch'){for(const s of [-1,1]){cube(0x3b3440,x+s*2.6,2.7,z,1.2,5.4,1.2);glowing(cube(0xffb35a,x+s*2.6,2.8,z+.62,.3,.9,.06),0xffb35a,0xff6a2a,1.1);}cube(0x2f2934,x,5.05,z,6.6,1.1,1.3);}
 else if(l.kind==='castle-keep'){cube(0xf0d9bc,x,4,z,6,8,6);for(let i=-2;i<=2;i+=2)for(const s of [-1,1]){cube(0xe6cca9,x+i*1.2,8.35,z+s*2.8,.8,.7,.5);cube(0xe6cca9,x+s*2.8,8.35,z+i*1.2,.5,.7,.8);}for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,tx=x+Math.sin(a)*4.24,tz=z+Math.cos(a)*4.24;cylinder(0xf5e2c6,tx,5,tz,1.1,10);mesh('cone',0x8c74c1,tx,11.3,tz,1.35,2.6,1.35);}cube(0x7a5a8c,x,1.4,z+3.03,1.8,2.8,.12);for(const s of [-1,1])cube(0xffd275,x+s*1.8,5.4,z+3.03,.7,2,.08);}
 else if(l.kind==='rainbow-arch'){[0xe2574c,0xf28a3c,0xf6c343,0x4fa35a,0x3f8fd2,0x8a5cc2].forEach((c,i)=>{const t=new T.Mesh(new T.TorusGeometry(4.2-i*.28,.15,6,40,Math.PI),mat(c));t.position.set(x,0,z);t.castShadow=true;scene.add(t);});for(const s of [-1,1])for(let j=0;j<3;j++)ball(0xf8fbf3,x+s*4+(j-1)*.7,.55+j%2*.3,z+(j-1)*.4,.8,scene,.65,1);}
}

// Batch immovable scenery into instanced meshes; keep flags and the opening gate dynamic.
scene.updateMatrixWorld(true);
const movingFlags=new Set(flags.map(f=>f.mesh)),staticBatches=new Map();
scene.traverse(object=>{
 if(!object.isMesh||movingFlags.has(object))return;
 for(let parent=object.parent;parent;parent=parent.parent)if(parent===gateBars)return;
 const key=`${object.geometry.uuid}/${object.material.uuid}/${object.castShadow}/${object.receiveShadow}`;
 if(!staticBatches.has(key))staticBatches.set(key,[]);staticBatches.get(key).push(object);
});
for(const batch of staticBatches.values()){
 if(batch.length<2)continue;const first=batch[0],instanced=new T.InstancedMesh(first.geometry,first.material,batch.length);
 instanced.castShadow=first.castShadow;instanced.receiveShadow=first.receiveShadow;
 batch.forEach((object,i)=>{instanced.setMatrixAt(i,object.matrixWorld);object.removeFromParent();});instanced.computeBoundingSphere();scene.add(instanced);
}
terrainMeshes.length=0;

function dogModel(color=0xd8a667,scale=1){const g=new T.Group();const body=cube(color,0,.88,0,.88,.95,.64,g),fur=[body];const head=ball(0xf3d6a3,0,1.53,.09,.6,g,1,.88);const muzzle=ball(0xffe2b6,0,1.3,.58,.37,g,.65,.8);ball(0x3b3a37,0,1.4,.85,.13,g,.65,1);for(const x of [-.23,.23]){ball(0x393c38,x,1.64,.53,.075,g);ball(0xffffff,x-.017,1.66,.585,.021,g);const ear=ball(0x935c38,x*2.4,1.39,-.02,.27,g,1.85,.7);ear.rotation.z=x>0?-.18:.18;}const legs=[];for(const x of [-.27,.27]){const leg=cube(0xa77344,x,.29,.03,.3,.58,.4,g);legs.push(leg);}for(const x of [-.56,.56]){const arm=cube(color,x,.95,0,.26,.55,.32,g);arm.rotation.z=x>0?-.16:.16;legs.push(arm);fur.push(arm);}cube(0x4e91b0,0,1.07,.36,.73,.38,.1,g);const badge=cube(0xffd779,0,1.09,.43,.2,.23,.04,g);badge.rotation.z=Math.PI/4;const cape=cube(0xe87862,0,1,-.46,.95,1.08,.09,g);cape.rotation.x=-.23;const tail=mesh('cone',0xa87544,0,.62,-.66,.14,.65,.14,g);tail.rotation.x=-1.1;g.scale.setScalar(scale);g.userData={legs,cape,tail,fur,head};return g;}
const dog=dogModel();scene.add(dog);
const antenna=new T.Group();dog.add(antenna);cylinder(0xe4c967,0,2.12,.2,.025,.45,antenna);ball(0xffdf78,0,2.38,.2,.14,antenna);antenna.visible=false;
const heroCrown=new T.Group();dog.add(heroCrown);cylinder(0xf3c65b,0,2,.2,.3,.15,heroCrown);for(const x of [-.2,0,.2])mesh('cone',0xffdb78,x,2.2,.2,.08,.3,.08,heroCrown);heroCrown.visible=false;
// Wardrobe hats sit where the secret crown does; applyLook() shows the one being worn.
const HAT_SHAPES={
 'hat-party':h=>{mesh('cone',0xf28bb3,0,2.4,.12,.3,.72,.3,h);cylinder(0xfff3a8,0,2.2,.12,.25,.06,h);ball(0xfff3a8,0,2.8,.12,.1,h);},
 'hat-cowboy':h=>{cylinder(0x9c6b3f,0,2.05,.12,.66,.06,h);cylinder(0xb07c49,0,2.25,.12,.33,.4,h);cylinder(0x5e3d24,0,2.12,.12,.34,.07,h);},
 'hat-chef':h=>{cylinder(0xfbfaf4,0,2.2,.12,.32,.4,h);for(const x of [-.17,0,.17])ball(0xffffff,x,2.5,.12,.22,h);},
 'hat-pirate':h=>{cube(0x2f3033,0,2.16,.12,.95,.2,.46,h);mesh('cone',0x2f3033,0,2.36,.12,.36,.34,.28,h);ball(0xf5f1e6,0,2.2,.36,.07,h);},
 'hat-wizard':h=>{const c=mesh('cone',0x6b4fb4,0,2.55,.1,.36,1.05,.36,h);c.rotation.z=.16;cylinder(0x4c3888,0,2.08,.12,.42,.06,h);ball(0xffd54f,.05,2.35,.44,.08,h);},
 'hat-antenna':h=>{cylinder(0xe4c967,0,2.12,.2,.025,.45,h);ball(0xffdf78,0,2.38,.2,.14,h);},
 'hat-crown':h=>{cylinder(0xf3c65b,0,2,.2,.3,.15,h);for(const x of [-.2,0,.2])mesh('cone',0xffdb78,x,2.2,.2,.08,.3,.08,h);},
};
function wearHat(id,parent){const h=new T.Group();parent.add(h);HAT_SHAPES[id]?.(h);return h;}
const hats={'hat-antenna':antenna,'hat-crown':heroCrown};
for(const id of Object.keys(HAT_SHAPES))if(!hats[id]){const h=wearHat(id,dog);h.visible=false;hats[id]=h;}
function applyLook(){const secrets=game.secrets,w=game.wardrobe;const hatId=wornItem(w,'hat',secrets).id;for(const [id,h] of Object.entries(hats))h.visible=id===hatId;const fur=wornItem(w,'fur',secrets);for(const m of dog.userData.fur)m.material=mat(fur.body);dog.userData.head.material=mat(fur.head);const cape=wornItem(w,'cape',secrets).color;if(cape!==capeColor){capeColor=cape;applyDrawing(drawing);}}
// Guides are small procedural creatures; a floating speech bubble marks one you have not talked to yet.
function guideModel(kind){const g=new T.Group(),eyes=(y,z,gap=.16,r=.07)=>{for(const x of [-gap,gap]){ball(0xffffff,x,y,z,r*1.5,g);ball(0x2b2d2f,x,y,z+r*.9,r*.8,g);}};
 if(kind==='tortoise'){ball(0x6f9a55,0,.55,0,.72,g,.62,1);ball(0x86b26a,0,.72,0,.45,g,.5,.9);ball(0xc2cf93,0,.62,.78,.3,g);eyes(.72,.98,.12,.05);for(const [x,z] of [[-.45,.4],[.45,.4],[-.45,-.4],[.45,-.4]])cylinder(0xb4c486,x,.18,z,.13,.36,g);}
 else if(kind==='toad'){ball(0x8fbf6a,0,.5,0,.55,g,.85,1);ball(0xe0675c,0,1.02,0,.58,g,.42,1);for(const [x,z] of [[-.25,.2],[.25,.25],[0,-.3],[.3,-.15]])ball(0xfff4de,x,1.2,z,.09,g);ball(0xd6ecb4,0,.4,.42,.3,g,.8,.5);eyes(.72,.42,.2);}
 else if(kind==='penguin'){ball(0x2f3a4a,0,.72,0,.5,g,1.45,1);ball(0xf6f3ea,0,.62,.22,.36,g,1.35,.7);mesh('cone',0xf1a33c,0,1.02,.5,.08,.22,.08,g).rotation.x=Math.PI/2;eyes(1.16,.4,.15,.055);cylinder(0x27325f,0,1.46,0,.3,.12,g);cylinder(0x27325f,0,1.4,.12,.36,.03,g);ball(0xf3c65b,0,1.47,.29,.05,g);}
 else if(kind==='salamander'){ball(0xf08a4b,0,.36,0,.36,g,.8,2.1);ball(0xf3a060,0,.52,.78,.34,g,.85,1);for(const z of [-.4,0,.35])ball(0xffd166,.22,.55,z,.08,g);mesh('cone',0xe0763a,0,.32,-.95,.13,.6,.13,g).rotation.x=-Math.PI/2;eyes(.72,.98,.15,.06);}
 else{ball(0xa27b5c,0,.78,0,.55,g,1.25,1);ball(0xf4e3c3,0,.85,.36,.4,g,1,.5);for(const x of [-.19,.19]){ball(0xffffff,x,1.02,.62,.16,g);ball(0x2b2d2f,x,1.02,.76,.08,g);mesh('cone',0x8c6647,x*1.8,1.55,0,.1,.3,.1,g);}mesh('cone',0xf1a33c,0,.88,.72,.06,.16,.06,g).rotation.x=Math.PI/2;}
 const marker=new T.Group();g.add(marker);marker.position.y=kind==='penguin'?2.05:1.85;ball(0xffffff,0,0,0,.32,marker,.7,.35);for(const x of [-.14,0,.14])ball(0x355744,x,0,.1,.045,marker);g.userData.marker=marker;return g;}
const guides=game.world.NPCS.map(n=>{const m=guideModel(n.kind);m.position.set(n.x,n.y,n.z);scene.add(m);return {data:n,mesh:m};});
// Bone Rush: the race stone, its trophy, and twelve golden bones with light beams.
const rushStone=group(game.world.RUSH.x,game.world.RUSH.y,game.world.RUSH.z);
{const plate=cylinder(0xe9d9a8,0,.08,0,1.3,.16,rushStone);plate.castShadow=false;const ringMesh=new T.Mesh(new T.RingGeometry(.85,1.1,36),glowMat(0xfff0b8,0xffc94a,.9));ringMesh.rotation.x=-Math.PI/2;ringMesh.position.y=.17;rushStone.add(ringMesh);}
const trophy=new T.Group();rushStone.add(trophy);trophy.position.y=1.55;
const trophyParts=[cylinder(0xcfd6d8,0,.12,0,.3,.42,trophy),cylinder(0xcfd6d8,0,-.18,0,.09,.22,trophy),cylinder(0xcfd6d8,0,-.32,0,.22,.07,trophy)];
for(const s of [-1,1]){const h=new T.Mesh(new T.TorusGeometry(.13,.035,6,12),mat(0xcfd6d8));h.position.set(s*.33,.14,0);h.rotation.y=Math.PI/2;trophy.add(h);trophyParts.push(h);}
const rushBones=game.world.RUSH.bones.map(b=>{const m=boneModel();m.traverse(o=>{if(o.isMesh)o.material=glowMat(0xffd166,0xffa31a,.55);});m.scale.setScalar(1.25);m.position.set(b.x,b.y,b.z);m.visible=false;scene.add(m);const beam=new T.Mesh(new T.CylinderGeometry(.1,.1,9,8,1,true),new T.MeshBasicMaterial({color:0xfff1a8,transparent:true,opacity:.28,depthWrite:false}));beam.position.set(b.x,4.5,b.z);beam.visible=false;scene.add(beam);return {data:b,mesh:m,beam};});
function showRushResult(e){game.pause();updateCampaignUI();showModal('Bone Rush complete!',`<div class="results"><span>${e.time}<small>seconds</small></span><span>${e.best}<small>best time</small></span></div><p>${e.first?`<b>+${e.reward} bones</b> for your wardrobe. Try again to beat your best time!`:e.time<=e.best?'A new best time! Can you go even faster?':'Your best time still stands. One more try?'}</p>`,'Keep exploring',()=>{game.resume();canvas.focus();},false);voice.speak(lineId.ui('rushWon'));}
// Friends who joined with the same code: their dogs, their names, and their barks.
const friendViews=new Map();
function friendCape(view,look){
 if(!look.drawing){view.group.userData.cape.material=mat(look.cape);return;}
 const img=new Image();img.onload=()=>{if(view.look.drawing!==look.drawing)return;
  const tex=new T.CanvasTexture(stickerCanvas(img,240,272,hex(look.cape)));tex.colorSpace=T.SRGBColorSpace;
  const edge=mat(look.cape),face=new T.MeshStandardMaterial({map:tex,roughness:.9});
  view.group.userData.cape.material=[edge,edge,edge,edge,face,face];};img.src=look.drawing;
}
function makeFriendView(look){
 const g=dogModel(look.fur,1);scene.add(g);
 g.userData.cape.material=mat(look.cape);
 const hat=wearHat(look.hat,g);
 const tag=document.createElement('div');tag.className='tag';tag.textContent=look.name;$('tags').append(tag);
 const shadow=new T.Mesh(new T.CircleGeometry(.6,20),new T.MeshBasicMaterial({color:0x3b6546,transparent:true,opacity:.16,depthWrite:false}));
 shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 const view={group:g,hat,tag,shadow,look,shown:null,state:null};friendCape(view,look);return view;
}
function refreshFriend(view,look){
 view.look=look;view.tag.textContent=look.name;
 for(const m of view.group.userData.fur)m.material=mat(look.fur);
 view.hat.removeFromParent();view.hat=wearHat(look.hat,view.group);
 friendCape(view,look);
}
function dropFriend(id){const view=friendViews.get(id);if(!view)return;view.group.removeFromParent();view.shadow.removeFromParent();view.tag.remove();friendViews.delete(id);}
function syncFriends(roster){
 const ids=new Set(roster.map(f=>f.id));
 for(const id of [...friendViews.keys()])if(!ids.has(id))dropFriend(id);
 for(const friend of roster){
  const view=friendViews.get(friend.id);
  if(!view)friendViews.set(friend.id,makeFriendView(friend.look));
  else if(JSON.stringify(view.look)!==JSON.stringify(friend.look))refreshFriend(view,friend.look);
 }
 updatePartyHud();
}
const tagPoint=new T.Vector3();
function drawFriends(dt,anim){
 for(const [id,view] of friendViews){
  const friend=party?.friends.get(id),state=friend?.state;
  const here=!!state&&state.level===game.level;
  view.group.visible=here;view.shadow.visible=here;view.tag.hidden=!here;
  if(!here)continue;
  view.shown=view.shown?easeRemote(view.shown,state,dt):{x:state.x,y:state.y,z:state.z,facing:state.facing};
  const {x,y,z,facing}=view.shown;
  view.group.position.set(x,y,z);view.group.rotation.y=facing;view.group.rotation.x=state.gliding?.22:0;
  view.shadow.position.set(x,y+.03,z);
  view.group.userData.legs.forEach((l,i)=>l.rotation.x=state.moving?Math.sin(anim*15+i*Math.PI)*.5:0);
  view.group.userData.tail.rotation.z=Math.sin(anim*(state.moving?19:8))*(state.moving?.35:.5);
  view.group.userData.cape.rotation.x=state.gliding?-1.3:-.25+(state.moving?Math.sin(anim*16)*.14-.25:Math.sin(anim*3)*.06);
  tagPoint.set(x,y+2.6,z).project(camera);
  const onScreen=tagPoint.z<1&&Math.abs(tagPoint.x)<1.3&&Math.abs(tagPoint.y)<1.3;
  view.tag.hidden=!onScreen;
  if(onScreen){view.tag.style.left=`${(tagPoint.x*.5+.5)*innerWidth}px`;view.tag.style.top=`${(-tagPoint.y*.5+.5)*innerHeight}px`;}
 }
}
const dogShadow=new T.Mesh(new T.CircleGeometry(.65,24),new T.MeshBasicMaterial({color:0x3b6546,transparent:true,opacity:.18,depthWrite:false}));dogShadow.rotation.x=-Math.PI/2;scene.add(dogShadow);
const cages=new Map(),friendModels=new Map();
for(const f of FRIENDS){const g=group(f.x,f.y,f.z);const bars=new T.Group();g.add(bars);cylinder(0x778d7e,0,.08,0,1.5,.16,bars);cylinder(0x91a499,0,2.65,0,1.5,.12,bars);for(let i=0;i<10;i++){const a=i*Math.PI/5;cylinder(0x7b9083,Math.sin(a)*1.4,1.4,Math.cos(a)*1.4,.055,2.5,bars);}const lock=cube(0xeab956,0,1.1,1.46,.45,.55,.16,bars);ball(0x9a8039,0,1.16,1.56,.07,bars);const friend=dogModel(f.color,.65);g.add(friend);friend.position.y=.12;friendModels.set(f.id,friend);cages.set(f.id,bars);}
function boneModel(){const g=new T.Group();const stem=cube(0xffedbc,0,0,0,.75,.17,.17,g);for(const x of [-.38,.38])for(const y of [-.11,.11])ball(0xffedbc,x,y,0,.15,g);return g;}
function keyModel(){const g=new T.Group();const ring=new T.Mesh(new T.TorusGeometry(.27,.085,6,12),mat(0xffcc59));ring.position.y=.25;g.add(ring);cube(0xffcc59,0,-.18,0,.11,.6,.13,g);cube(0xffcc59,.13,-.43,0,.32,.12,.13,g);cube(0xffcc59,.12,-.26,0,.26,.1,.13,g);g.scale.setScalar(1.4);return g;}
function starModel(){const s=new T.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,r=i%2===0?.55:.26;const x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)s.moveTo(x,y);else s.lineTo(x,y);}s.closePath();const m=new T.Mesh(new T.ExtrudeGeometry(s,{depth:.17,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:1,steps:1}),mat(0xffcc5a));m.castShadow=true;return m;}
const pickups=[];for(const [list,kind] of [[BONES,'bone'],[KEYS,'key'],[STARS,'star']])for(const c of list){const m=kind==='bone'?boneModel():kind==='key'?keyModel():starModel();m.position.set(c.x,c.y,c.z);scene.add(m);pickups.push({data:c,mesh:m,kind,base:m.scale.x,pop:game.collected.has(c.id)?0:undefined});}
function snakeModel(big=false){const g=new T.Group(),segments=[];const color=big?0x9075bb:0x83ad64;for(let i=0;i<6;i++){const s=ball(color,Math.sin(i*.7)*.15,.35,-i*.36,.43-i*.045,g,.82,1.1);segments.push(s);}ball(big?0xae8ecd:0xa3c774,0,.7,.2,.53,g,.85,1.1);for(const x of [-.2,.2]){ball(0xffe39c,x,.91,.55,.13,g);ball(0x354835,x,.92,.65,.065,g);}cube(0xe99780,0,.5,.84,.09,.045,.3,g);if(big){cylinder(0xf3c65b,0,1.2,.15,.39,.22,g);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh('cone',0xffd475,Math.sin(a)*.34,1.48,.15+Math.cos(a)*.34,.12,.4,.12,g);}g.scale.setScalar(3);}g.userData.segments=segments;return g;}
const enemyModels=new Map();for(const e of game.enemies){const m=snakeModel();scene.add(m);enemyModels.set(e.id,m);}const bossModel=giantBossModel();scene.add(bossModel);bossModel.userData.baseScale=theme.scale;
function giantBossModel(){
 const g=new T.Group(),head=new T.Group();g.add(head);
 // A coiled silhouette keeps the entire giant inside its physical footprint.
 for(let i=0;i<12;i++){const a=i*Math.PI/6;ball(theme.color,Math.sin(a)*.31,.24,Math.cos(a)*.31,.28,g,.9,1);}
 ball(theme.color,0,.63,0,.43,g,1.1,1);ball(theme.color,0,1.05,.03,.48,head,.85,1);
 for(const x of [-.2,.2]){ball(0xfff6d6,x,1.16,.39,.13,head);ball(0x343149,x,1.16,.49,.06,head);}
 cube(0xf59b92,0,.92,.49,.18,.035,.16,head);
 if(game.level===1){cylinder(0xffb6ba,0,1.44,0,.56,.2,head);for(let i=0;i<6;i++){const a=i*Math.PI/3;ball(0xfff6d6,Math.sin(a)*.35,1.56,Math.cos(a)*.35,.08,head);}}
 else if(game.level===2){for(const x of [-.3,0,.3])mesh('cone',0xc9f8ff,x,1.56,0,.12,.7,.12,head);}
 else if(game.level===3){for(const x of [-.34,.34])mesh('cone',0xffcc85,x,1.5,0,.16,.65,.16,head);for(let i=0;i<3;i++)mesh('cone',0xfab36e,0,.55+i*.22,-.38,.12,.3,.12,g);}
 else{cylinder(0xf3c65b,0,1.46,0,.39,.2,head);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh('cone',0xffd475,Math.sin(a)*.32,1.66,Math.cos(a)*.32,.11,.4,.11,head);}}
 if(game.level===4){for(const x of [-.4,.4])ball(0xffebc7,x,.66,-.05,.22,g,1.8,.45);}
 g.scale.setScalar(theme.scale);g.userData.head=head;return g;
}
// World weather: spores, snow, embers, or sparkles drift around Super Dog (one draw call).
const weather=[null,{color:0xf7ffd9,count:140,vy:.35,size:.2},{color:0xffffff,count:320,vy:-1.4,size:.17},{color:0xffb35a,count:160,vy:1.1,size:.15},{color:0xfff3c4,count:120,vy:.2,size:.18}][game.level];
let weatherPoints=null,smokeT=0;
if(weather){const pos=new Float32Array(weather.count*3);for(let i=0;i<weather.count;i++){pos[i*3]=game.player.x+rnd(-28,28);pos[i*3+1]=rnd(0,14);pos[i*3+2]=game.player.z+rnd(-28,28);}const geom=new T.BufferGeometry();geom.setAttribute('position',new T.BufferAttribute(pos,3));const dot=document.createElement('canvas');dot.width=dot.height=32;const d2=dot.getContext('2d'),grd=d2.createRadialGradient(16,16,0,16,16,16);grd.addColorStop(0,'rgba(255,255,255,1)');grd.addColorStop(1,'rgba(255,255,255,0)');d2.fillStyle=grd;d2.fillRect(0,0,32,32);const map=new T.CanvasTexture(dot);map.colorSpace=T.SRGBColorSpace;weatherPoints=new T.Points(geom,new T.PointsMaterial({color:weather.color,size:weather.size*2.4,map,transparent:true,depthWrite:false}));weatherPoints.frustumCulled=false;scene.add(weatherPoints);}
function updateWeather(dt,t,center){if(!weatherPoints||!effectsOn())return;const a=weatherPoints.geometry.attributes.position,v=a.array;for(let i=0;i<v.length;i+=3){v[i]+=Math.sin(t*.7+i)*.35*dt;v[i+1]+=weather.vy*dt*(.6+(i%7)/10);v[i+2]+=Math.cos(t*.6+i)*.35*dt;if(v[i+1]>14)v[i+1]=0;if(v[i+1]<0)v[i+1]=14;if(v[i]-center.x>28)v[i]-=56;if(center.x-v[i]>28)v[i]+=56;if(v[i+2]-center.z>28)v[i+2]-=56;if(center.z-v[i+2]>28)v[i+2]+=56;}a.needsUpdate=true;}
// The five giants are CC0 models by Quaternius (see assets/MODEL-LICENSES.md); the procedural
// giant below stays as the fallback whenever a model cannot be loaded.
const BOSS_FILE=['snake','mushroom','wolf','dragon','cloud'][game.level];
const BOSS_STYLE=[{},{},{tint:0x9fd7ee,tall:.78,wide:6.6},{},{tint:0xe4e1f8,flatten:true}][game.level];
let bossView=bossModel;
function adoptBossModel(model){
 const box=new T.Box3().setFromObject(model),size=new T.Vector3();box.getSize(size);
 // Height decides the size; width only matters for a model far wider than the arena footprint.
 const fit=Math.min(game.bossHeight*(BOSS_STYLE.tall??.94)/Math.max(.001,size.y),game.bossRadius*(BOSS_STYLE.wide??4.6)/Math.max(.001,size.x,size.z));
 model.scale.setScalar(fit);
 const placed=new T.Box3().setFromObject(model),centre=new T.Vector3();placed.getCenter(centre);
 model.position.set(-centre.x,-placed.min.y,-centre.z);model.rotation.y=BOSS_STYLE.yaw??0;
 model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
  o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
  for(const m of [o.material].flat()){m.flatShading=true;if(BOSS_STYLE.flatten){m.vertexColors=false;m.map=null;m.emissive?.setHex(0x2a2740);m.emissiveIntensity=.25;}if(BOSS_STYLE.tint)m.color.setHex(BOSS_STYLE.tint);m.needsUpdate=true;}});
 const holder=new T.Group();holder.add(model);holder.userData={head:model,baseScale:1};scene.add(holder);
 bossView.visible=false;bossView=holder;
}
new GLTFLoader().load(`./assets/bosses/${BOSS_FILE}.glb`,gltf=>{try{adoptBossModel(gltf.scene);}catch(error){console.error('Giant model could not be used:',error);}},undefined,()=>{});
const attackRing=new T.Mesh(new T.RingGeometry(.9,1,48),new T.MeshBasicMaterial({color:0xffe393,side:T.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));attackRing.rotation.x=-Math.PI/2;attackRing.visible=false;scene.add(attackRing);
let barkTime=0;const waveModels=[];const dangerRing=new T.Mesh(new T.RingGeometry(game.bossRadius+.3,game.bossRadius+.5,48),new T.MeshBasicMaterial({color:0xea9b68,side:T.DoubleSide,transparent:true,opacity:.7}));dangerRing.rotation.x=-Math.PI/2;dangerRing.position.y=1.26;scene.add(dangerRing);
const particles=[];function burst(x,y,z,color=0xffda76,n=12){for(let i=0;i<n;i++){const m=ball(color,x,y,z,.1);m.castShadow=false;particles.push({m,v:new T.Vector3(rnd(-3,3),rnd(2,5),rnd(-3,3)),life:.75});}}
// Landing dust: soft puffs that spread along the ground and shrink away.
function dust(x,y,z,strength=1){for(let i=0;i<Math.round(6+strength*6);i++){const a=rnd(0,Math.PI*2),r=rnd(.12,.2)*(.8+strength*.5),m=ball(0xfff6df,x+Math.cos(a)*.35,y+.12,z+Math.sin(a)*.35,r);m.castShadow=false;particles.push({m,v:new T.Vector3(Math.cos(a)*rnd(1.8,3.2)*strength,rnd(.4,1.1),Math.sin(a)*rnd(1.8,3.2)*strength),life:.45,max:.45,size:r,g:1.5});}}
// Confetti: flat colored flakes that tumble down slowly.
function confetti(x,y,z,n=60){const colors=[theme.accent,0xe2574c,0x3f8fd2,0x4fa35a,0xf6c343,0xf28bb3];for(let i=0;i<n;i++){const m=cube(colors[i%colors.length],x+rnd(-.6,.6),y+rnd(0,.6),z+rnd(-.6,.6),.18,.03,.11);m.castShadow=false;particles.push({m,v:new T.Vector3(rnd(-4,4),rnd(5,9),rnd(-4,4)),life:2.2,g:6,spin:rnd(4,11)});}}
let victoryT=0;
const easeOutBack=t=>1+2.70158*(t-1)**3+1.70158*(t-1)**2;
const secretModels=game.world.EGGS.map(e=>{
 const g=group(e.x,e.y+1,e.z);
 if(game.level===1&&e.kind==='book'){cylinder(0xffe1ac,0,.05,0,.3,.4,g);cylinder(0x8a6156,0,.26,0,.24,.01,g);const handle=new T.Mesh(new T.TorusGeometry(.18,.045,6,12),mat(0xffe1ac));handle.position.x=.34;g.add(handle);}
 else if(game.level===1){const tiny=snakeModel(true);tiny.scale.setScalar(.65);g.add(tiny);for(const x of [-.25,.25])ball(0xef8c91,x,-.08,.35,.24,g,.35,1.4);}
 else if(game.level===2&&e.kind==='book'){const snow=dogModel(0xe8f6ff,.6);g.add(snow);}
 else if(game.level===3&&e.kind==='book'){cylinder(0xeab86c,0,0,0,.7,.13,g);cylinder(0xffdf85,0,.08,0,.62,.04,g);for(let i=0;i<6;i++){const a=i*Math.PI/3;cylinder(0xcb6852,Math.sin(a)*.38,.12,Math.cos(a)*.38,.12,.03,g);}}
 else if(game.level===3){mesh('cone',0x9d7474,0,.1,0,.6,.8,.6,g);ball(0xffb04e,0,.5,0,.19,g);for(const x of [-.17,.17])ball(0xfff3bd,x,.12,.39,.06,g);}
 else if(e.kind==='book'){cube(0x695589,0,0,0,1,.12,.8,g);cube(0xfff0d4,0,.1,0,.92,.1,.73,g);cube(0xe78570,0,.18,0,.04,.03,.7,g);for(const x of [-.25,.25])ball(0x6e9ac4,x,.2,0,.12,g,.1,1);}
 else{cylinder(0xffcf60,0,0,0,.4,.2,g);for(let i=0;i<5;i++){const a=i*Math.PI/2.5;mesh('cone',0xffdc78,Math.sin(a)*.32,.25,Math.cos(a)*.32,.12,.45,.12,g);}}
 const halo=new T.Mesh(new T.RingGeometry(.75,.85,32),new T.MeshBasicMaterial({color:theme.accent,side:T.DoubleSide}));halo.rotation.x=-Math.PI/2;g.add(halo);return {data:e,mesh:g};
});
for(const h of game.world.HAZARDS){const lava=cube(0xf58b46,h.x,.045,h.z,h.w,.09,h.d);lava.material=new T.MeshStandardMaterial({color:0xff9b43,emissive:0xc63f1d,emissiveIntensity:.65});for(let x=h.x-h.w/2+1;x<h.x+h.w/2;x+=2)cylinder(0xffd474,x,.098,h.z,.35,.015);}
for(const ice of game.world.ICE||[])cube(0xb7e7f3,ice.x,.015,ice.z,ice.w,.025,ice.d);
const clouds=[];for(let i=0;i<16;i++){const g=group(rnd(-110,110),rnd(22,36),rnd(-105,65));for(let j=0;j<3;j++)ball(0xf8fbf3,j*2,Math.sin(j)*.6,0,2.8,g,.48,1);clouds.push(g);}

let yaw=0,pitch=.35,cameraDistance=11.5,drag=null,stick={x:0,z:0},pressed=new Set(),actions={},last=performance.now(),toastUntil=0,audio=null,sound=(()=>{try{return localStorage.getItem(SOUND_STORAGE)!=='off';}catch{return true;}})(),modalAction=null,helpWasPlaying=false,menuMode=true,resettingSave=false;
const cameraTarget=new T.Vector3(),desiredCamera=new T.Vector3(),camBase=new T.Vector3();
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches,BASE_FOV=52;let trauma=0,fovPunch=0,squashT=0,squashAmt=0,wasGrounded=true,lastVy=0;
const shakeNoise=(t,seed)=>{const x=Math.sin(t*12.9898+seed*78.233)*43758.5453;return (x-Math.floor(x))*2-1;};
function storeSave(){if(resettingSave)return;try{localStorage.setItem(STORAGE,JSON.stringify(game.snapshot()));}catch{}}
function updateDifficulty(){for(const button of document.querySelectorAll('[data-difficulty]'))button.setAttribute('aria-pressed',String(button.dataset.difficulty===game.difficulty));$('difficultyDescription').textContent=game.rules.description;$('difficultyBadge').textContent=game.rules.name;}
for(const button of document.querySelectorAll('[data-difficulty]'))button.onclick=()=>{if(game.setDifficulty(button.dataset.difficulty)){updateDifficulty();storeSave();}};
updateDifficulty();
function updateCampaignUI(){
 $('levelLabel').textContent=`${game.level+1}/5 · ${theme.name}`;$('bossName').textContent=theme.boss;
 $('levelDescription').textContent=`${game.level+1}. ${theme.name} — ${theme.subtitle}`;
 $('album').textContent=`📖 Story book · ${openStoryCount()} / ${STORY_COUNT}`;$('wardrobe').textContent=`◆ Wardrobe · ${game.bonesAvailable} bones to spend`;
 $('nextLevel').hidden=game.boss.hp>0||game.level===4;
 $('levelPicker').innerHTML=LEVELS.map((l,i)=>`<button data-level="${i}" aria-label="${i+1}. ${l.name}${i>=game.unlocked?' — locked':''}" aria-pressed="${i===game.level}" ${i>=game.unlocked?'disabled':''}><span>${i>=game.unlocked?'🔒':i<game.unlocked-1?'✓':i+1}</span><small>${l.name}</small></button>`).join('');
 for(const b of $('levelPicker').children)b.onclick=()=>{if(Number(b.dataset.level)===game.level)return;changeLevel(Number(b.dataset.level),false);};
}
function changeLevel(level,autostart=true){if(!game.selectLevel(level))return;storeSave();if(autostart)sessionStorage.setItem('superdog-autostart','1');location.reload();}
function showVictory(){updateCampaignUI();if(game.level===0)voice.speak(lineId.ui('glideUnlocked'));showModal(game.level===4?'Five worlds saved!':'Giant defeated!',`<p><b>${theme.boss}</b> gives up. All three friends are free!</p><div class="results"><span><b class="bone-icon">◆</b> ${game.boneCount}<small>/ ${BONES.length} bones</small></span><span><b class="star">★</b> ${game.starCount}<small>/ 6 stars</small></span><span><b class="key">✧</b> ${game.secrets.size}<small>/ 10 secrets</small></span></div>${game.level===0?'<p><b>New power: cape glide!</b> Hold jump while falling to float across gaps.</p>':''}<p>${game.level<4?'New world unlocked: '+LEVELS[game.level+1].name+'. Revisit completed worlds from the main menu.':'Thanks for the adventure! Revisit any world to complete your secret album.'}</p>`,game.level<4?'Next world →':'Keep exploring',()=>{if(game.level<4)changeLevel(game.level+1);else{game.start();canvas.focus();}});}
 $('nextLevel').onclick=()=>changeLevel(game.level+1);
 $('album').onclick=openStoryBook;
updateCampaignUI();
function openStudio(){voice.speak(lineId.ui('drawing'));let studio=null;showModal('Drawing studio',studioMarkup(!!drawing),'Put it on Super Dog!',()=>{const d=studio.result();if(!d){saveDrawing(null);toast('The paper was empty, so nothing changed.');return;}if(saveDrawing(d))toast(d.cape||d.flags?'Your drawing is on Super Dog’s '+(d.cape&&d.flags?'cape and flags!':d.cape?'cape!':'flags!'):'Drawing saved. Tick “On my cape” to wear it.');},false);studio=mountStudio($('modalBody'),drawing,{onRemove:()=>{saveDrawing(null);$('modal').hidden=true;toast('Your drawing was removed.');}});}
// The wardrobe opens beside a turntable view of Super Dog so each choice is seen straight away.
let previewMode=false;
const hatIcons={'hat-none':'<circle cx="20" cy="20" r="11" fill="none" stroke="#8a9a8e" stroke-width="3" stroke-dasharray="4 4"/>','hat-party':'<path d="M20 5 30 33H10z" fill="#f28bb3"/><rect x="11" y="27" width="18" height="4" fill="#fff3a8"/><circle cx="20" cy="6" r="4" fill="#fff3a8"/>','hat-cowboy':'<ellipse cx="20" cy="29" rx="17" ry="4" fill="#9c6b3f"/><path d="M12 29c0-12 3-17 8-17s8 5 8 17z" fill="#b07c49"/><rect x="12" y="24" width="16" height="3" fill="#5e3d24"/>','hat-chef':'<rect x="12" y="19" width="16" height="14" rx="2" fill="#fbfaf4" stroke="#c9c3b3"/><circle cx="13" cy="16" r="6" fill="#fff" stroke="#c9c3b3"/><circle cx="20" cy="13" r="7" fill="#fff" stroke="#c9c3b3"/><circle cx="27" cy="16" r="6" fill="#fff" stroke="#c9c3b3"/>','hat-pirate':'<path d="M3 27c8-12 26-12 34 0-6 5-28 5-34 0z" fill="#2f3033"/><circle cx="20" cy="22" r="3.5" fill="#f5f1e6"/>','hat-wizard':'<path d="M21 3 31 33H9z" fill="#6b4fb4"/><rect x="7" y="31" width="26" height="4" rx="2" fill="#4c3888"/><path d="m18 17 1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#ffd54f"/>','hat-antenna':'<line x1="20" y1="34" x2="20" y2="13" stroke="#e4c967" stroke-width="3"/><circle cx="20" cy="10" r="6" fill="#ffdf78"/>','hat-crown':'<path d="M6 31 8 13l7 8 5-11 5 11 7-8 2 18z" fill="#f3c65b"/>'};
function swatch(item){if(item.slot==='cape')return `<span class="swatch" style="background:${hex(item.color)}"></span>`;if(item.slot==='fur')return `<span class="swatch" style="background:linear-gradient(135deg,${hex(item.head)} 50%,${hex(item.body)} 50%)"></span>`;return `<span class="swatch hat-swatch"><svg viewBox="0 0 40 40" aria-hidden="true">${hatIcons[item.id]||''}</svg></span>`;}
let wardrobeTab='cape';
function wardrobeMarkup(){return `<p class="wallet"><b class="bone-icon">◆</b> <strong>${game.bonesAvailable}</strong> bones to spend <small>${game.bonesEarned} collected in all worlds</small></p><div class="shelf-tabs" role="tablist">${SLOTS.map(slot=>`<button type="button" role="tab" data-tab="${slot}" aria-selected="${slot===wardrobeTab}">${SLOT_NAMES[slot]}</button>`).join('')}</div>`+SLOTS.map(slot=>`<section class="shelf-group${slot===wardrobeTab?' active':''}"><h3 class="shelf">${SLOT_NAMES[slot]}</h3><div class="shelf-items">${WARDROBE[slot].map(i=>({...i,slot})).map(item=>{const mine=owns(game.wardrobe,item.id,game.secrets),worn=wornItem(game.wardrobe,slot,game.secrets).id===item.id,short=!mine&&(item.secret||item.price>game.bonesAvailable);return `<button type="button" class="item${worn?' worn':''}" data-item="${item.id}" aria-pressed="${worn}"${short?' aria-disabled="true"':''}>${swatch(item)}<span class="item-name">${item.name}</span><span class="item-state">${worn?'Wearing':mine?'Wear':item.secret?'Find a secret':`◆ ${item.price}`}</span></button>`;}).join('')}</div></section>`).join('');}
function renderWardrobe(){$('modalBody').innerHTML=wardrobeMarkup();for(const t of $('modalBody').querySelectorAll('[data-tab]'))t.onclick=()=>{wardrobeTab=t.dataset.tab;renderWardrobe();$('modalBody').querySelector(`[data-tab="${wardrobeTab}"]`)?.focus();};for(const b of $('modalBody').querySelectorAll('[data-item]'))b.onclick=()=>{const id=b.dataset.item,mine=owns(game.wardrobe,id,game.secrets),r=mine?game.wear(id):game.buy(id);if(!r.ok){toast(r.reason);tone('hurt');return;}tone(mine?'jump':'key');if(!mine)burst(dog.position.x,dog.position.y+1.6,dog.position.z,0xffdc72,16);storeSave();applyLook();updateCampaignUI();party?.sendLook();renderWardrobe();$('modalBody').querySelector(`[data-item="${id}"]`)?.focus();};}
function openWardrobe(){showModal('Dog house wardrobe','','Done',()=>{},false);voice.speak(lineId.ui('wardrobe'));$('modal').classList.add('wardrobe');previewMode=true;$('menu').style.visibility='hidden';renderWardrobe();}
$('wardrobe').onclick=openWardrobe;
// Play with friends: a five-letter code, up to eight dogs on one island.
let party=null,partySendAt=0,partyJoined=false,partyOpenedAt=0,lonelyTimer=0;const greeted=new Set();
const NAME_STORAGE='superdog-name';
let myName=(()=>{try{return localStorage.getItem(NAME_STORAGE)||pickName();}catch{return pickName();}})();
const myLook=()=>({name:myName,cape:wornItem(game.wardrobe,'cape',game.secrets).color,hat:wornItem(game.wardrobe,'hat',game.secrets).id,
 fur:wornItem(game.wardrobe,'fur',game.secrets).body,drawing:settings.shareDrawing&&drawing?.cape?drawing.image:null});
function updatePartyHud(){
 const count=party?party.roster().length:0;
 $('partyHud').hidden=!party;$('partyCount').textContent=count?`${count} friend${count>1?'s':''} · ${party.code}`:`Waiting · ${party?.code??''}`;
 if(!$('modal').hidden&&$('modal').classList.contains('party'))renderParty();
}
function startParty(code,{joined=false}={}){
 if(party)party.leave();
 const joinedAt=Date.now();partyJoined=joined;partyOpenedAt=joinedAt;
 // Somebody who typed a code and is still alone after a while has probably typed it wrong.
 clearTimeout(lonelyTimer);
 if(joined)lonelyTimer=setTimeout(()=>{if(party&&!party.roster().length){toast('Nobody is on that island. Check the code with your friend.');tone('hurt');renderParty();}},LONELY_AFTER);
 try{
  party=joinParty(code,{look:myLook,
   onRoster:roster=>{
    // Eight dogs fit on one island: a late arrival steps back out again.
    if(roster.length+1>MAX_PLAYERS&&Date.now()-joinedAt<9000){leaveParty();toast('That game is full. Eight friends are already playing.');return;}
    const taken=roster.map(f=>f.look?.name).filter(Boolean);
    // Two children can pick the same name; the one who arrived later takes another.
    if(taken.includes(myName)&&Date.now()-joinedAt<9000){myName=pickName(taken);try{localStorage.setItem(NAME_STORAGE,myName);}catch{}party?.sendLook();toast(`That name was taken, so you are ${myName}.`);}
    // Greet a friend once their name has arrived, not at the moment the connection opens.
    for(const friend of roster)if(friend.look?.name&&friend.look.name!=='Friend'&&!greeted.has(friend.id)){greeted.add(friend.id);toast(`${friend.look.name} joined the island!`);tone('checkpoint');}
    syncFriends(roster);},
   onLeave:(id,gone)=>{greeted.delete(id);dropFriend(id);if(gone?.look?.name&&gone.look.name!=='Friend')toast(`${gone.look.name} left.`);},
   onBark:(id,friend)=>{const view=friendViews.get(id);if(view?.shown){tone('bark',.9);burst(view.shown.x,view.shown.y+1.2,view.shown.z,0xfff0b8,8);}},
   onError:()=>toast('Could not reach your friends. Check the internet connection.')});
 }catch(error){toast('Could not start a game with friends. Check the internet connection.');return;}
 try{localStorage.setItem(NAME_STORAGE,myName);}catch{}
 updatePartyHud();renderParty();
}
function leaveParty(){if(!party)return;clearTimeout(lonelyTimer);party.leave();party=null;partyJoined=false;greeted.clear();for(const id of [...friendViews.keys()])dropFriend(id);updatePartyHud();renderParty();}
function partyMarkup(){
 if(!party)return `<p>Play on the same island with up to ${MAX_PLAYERS} friends. One of you starts a game and reads out the code; the others type it in.</p>
 <div class="party-name"><span class="set-label">You are</span><select id="partyName">${NAMES.map(n=>`<option${n===myName?' selected':''}>${n}</option>`).join('')}</select></div>
 <button type="button" class="primary" data-party="start">Start a game</button>
 <p class="party-or">or join a friend</p>
 <div class="party-join"><input id="partyCode" inputmode="latin" autocomplete="off" spellcheck="false" maxlength="7" placeholder="CODE" aria-label="Friend's code"><button type="button" class="primary" data-party="join">Join</button></div>`;
 const roster=party.roster();
 const waiting=waitingMessage({joined:partyJoined,friends:roster.length,waitedMs:Date.now()-partyOpenedAt});
 return `<p class="party-wait">${(waiting??'Read this code to your friends. They type it into Join.').replace('Join.','<b>Join</b>.')}</p><div class="party-code">${formatCode(party.code)}</div>
 <h3 class="shelf">On the island (${roster.length+1}/${MAX_PLAYERS})</h3>
 <ul class="party-list"><li><b>${myName}</b> <small>you · ${theme.name}</small></li>${roster.map(f=>`<li><b>${f.look.name}</b> <small>${f.state?LEVELS[f.state.level].name:'arriving…'}</small></li>`).join('')}</ul>
 ${roster.length?'':'<p class="set-note">Nobody has joined yet. The code works as long as this screen stays open.</p>'}
 <div class="set-row"><span class="set-label">Show my drawing to friends</span><button type="button" class="set-switch" data-party="drawing" aria-pressed="${!!settings.shareDrawing}"><span></span></button></div>
 <button type="button" class="text-button" data-party="leave">Leave the game</button>`;
}
function renderParty(){
 if($('modal').hidden||!$('modal').classList.contains('party'))return;
 $('modalBody').innerHTML=partyMarkup();
 const code=$('modalBody').querySelector('#partyCode');
 if(code)code.oninput=()=>{const raw=normalizeCode(code.value);code.value=raw;};
 const name=$('modalBody').querySelector('#partyName');
 if(name)name.onchange=()=>{myName=name.value;try{localStorage.setItem(NAME_STORAGE,myName);}catch{}party?.sendLook();};
 for(const button of $('modalBody').querySelectorAll('[data-party]'))button.onclick=()=>{
  const what=button.dataset.party;
  if(what==='start')startParty(makeRoomCode());
  else if(what==='join'){const typed=normalizeCode($('modalBody').querySelector('#partyCode').value);
   if(!isCompleteCode(typed)){toast(`A code has ${CODE_LENGTH} letters and numbers.`);return;}startParty(typed,{joined:true});}
  else if(what==='leave')leaveParty();
  else if(what==='drawing'){settings.shareDrawing=!settings.shareDrawing;saveSettings();party?.sendLook();renderParty();}
 };
}
function openParty(){const wasPlaying=game.status==='playing';game.pause();showModal('Play with friends','','Done',()=>{if(wasPlaying)game.resume();canvas.focus();},false);$('modal').classList.add('party');renderParty();voice.speak(lineId.ui('friends'));}
$('friends').onclick=openParty;$('partyHud').onclick=openParty;
// The story book: stories open as worlds are reached, secrets found, and giants beaten.
function storyState(){return {unlocked:game.unlocked,secrets:game.secrets,progress:{...game.progress,[game.level]:game.levelSnapshot()},level:game.level};}
function openStoryCount(){return STORIES.filter(s=>isStoryOpen(s,storyState())).length;}
function storyBookMarkup(){
 const state=storyState();
 return `<p>${openStoryCount()} of ${STORY_COUNT} stories opened. Reach a world, find a secret, or beat a giant to open more.</p>`+
 LEVELS.map((level,i)=>`<section class="story-world"><h3 class="shelf">${i+1}. ${level.name}</h3>${storiesForLevel(i).map(story=>{
  const open=isStoryOpen(story,state);
  return `<article class="story${open?'':' locked'}"><h4>${open?story.title:'· · ·'}</h4>${open
   ?`<p>${story.lines.join('<br>')}</p><button type="button" class="text-button" data-story="${story.id}">▶ Read it to me</button>`
   :`<p class="story-locked">${story.kind==='secret'?'Hidden somewhere in this world.':story.kind==='victory'?'Beat the giant of this world.':'Reach this world.'}</p>`}</article>`;
 }).join('')}</section>`).join('');
}
function openStoryBook(){
 const wasPlaying=game.status==='playing';game.pause();
 showModal('Story book','','Close the book',()=>{voice.stop();if(wasPlaying)game.resume();canvas.focus();},false);
 $('modal').classList.add('storybook');$('modalBody').innerHTML=storyBookMarkup();
 for(const button of $('modalBody').querySelectorAll('[data-story]'))button.onclick=()=>{
  const story=STORIES.find(s=>s.id===button.dataset.story);if(!story)return;
  for(const other of $('modalBody').querySelectorAll('[data-story]'))other.textContent='▶ Read it to me';
  button.textContent='■ Stop reading';voice.stop();showCaption(storyText(story));voice.speak(story.id,storyText(story),{force:true});
 };
}
function saveDrawing(d){try{if(d)localStorage.setItem(DRAWING_STORAGE,JSON.stringify(d));else localStorage.removeItem(DRAWING_STORAGE);}catch{toast('This browser could not save the drawing.');return false;}applyDrawing(d);return true;}
$('draw').onclick=openStudio;$('drawCard').onclick=openStudio;
const READ_STORAGE='superdog-read-aloud';let readAloud=(()=>{try{return localStorage.getItem(READ_STORAGE)==='on';}catch{return false;}})(),speechUntil=0;
function updateReadAloud(){for(const b of document.querySelectorAll('[data-read-aloud]')){b.setAttribute('aria-pressed',String(readAloud));b.title=readAloud?'Reading aloud: on':'Read aloud: off';}}
function toggleReadAloud(){readAloud=!readAloud;try{localStorage.setItem(READ_STORAGE,readAloud?'on':'off');}catch{}updateReadAloud();if(readAloud)voice.speak(lineId.ui('welcome'));else voice.stop();}
function showSpeech(name,text,id){if(!text)return;$('speaker').textContent=name;$('speechText').textContent=text;$('speech').hidden=false;speechUntil=performance.now()+Math.max(4200,text.length*75);voice.speak(id,text);}
$('readAloud').onclick=toggleReadAloud;updateReadAloud();
// A new version arrived while the game was open: take it now in the menu, or offer it during play.
addEventListener('superdog-update',()=>{
 if(menuMode&&$('modal').hidden){location.reload();return;}
 $('updateBar').hidden=false;
});
$('updateNow').onclick=()=>location.reload();
// Spoken lines and subtitles. Recordings play when present; otherwise the browser reads the words.
let voiceManifest={voice:null,lines:{}},captionUntil=0;
const voice=createVoice({manifest:voiceManifest,enabled:()=>readAloud,volume:()=>settings.sfx,
 onCaption:text=>showCaption(text)});
fetch(VOICE_DIR+'manifest.json').then(r=>r.ok?r.json():null).then(raw=>{if(raw)Object.assign(voiceManifest,parseManifest(raw));}).catch(()=>{});
function showCaption(text,kind='speech'){
 if(!text||settings.subtitles==='off'||(kind==='sound'&&settings.subtitles!=='always'))return;
 $('caption').textContent=text;$('caption').hidden=false;
 captionUntil=performance.now()+Math.max(2600,String(text).length*70);
}
function speak(text,id){voice.speak(id,text);}
function speakStory(story){showCaption(storyText(story));voice.speak(story.id,storyText(story));}
function toast(text){if(!text)return;$('toast').textContent=text;$('toast').classList.add('show');toastUntil=performance.now()+3800;}
// Browsers only allow audio after a tap or key press, so the context is created on first use.
let master=null,sfxBus=null,music=null,coinStreak=0,coinStreakUntil=0;const STREAK=[0,2,4,7,9,12,14,16,19,21,24];
function audioReady(){if(!sound)return false;try{audio??=new AudioContext();if(!master){master=audio.createGain();master.gain.value=.9;master.connect(audio.destination);sfxBus=audio.createGain();sfxBus.gain.value=settings.sfx;sfxBus.connect(master);music=createMusic(audio,master,game.level);music.setVolume(settings.music);}if(audio.state==='suspended')audio.resume();return true;}catch{return false;}}
function tone(type,ratio=1){if(audioReady())playSfx(audio,sfxBus,type,ratio);}
function syncMusic(){if(sound&&audioReady())music.start();else music?.stop();}
// Bones picked up in quick succession climb a pentatonic scale.
function coinRatio(now){coinStreak=now<coinStreakUntil?Math.min(coinStreak+1,STREAK.length-1):0;coinStreakUntil=now+1100;return 2**(STREAK[coinStreak]/12);}
function updateSoundButton(){$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Mute sound':'Enable sound');$('sound').style.background=sound?'#f9d487':'';}
updateSoundButton();for(const type of ['pointerdown','keydown'])window.addEventListener(type,()=>syncMusic(),{once:true});
// Controllers: poll the first connected gamepad each frame; menus get focus navigation with the D-pad.
let padConnected=false,padPrev=[],padMove={x:0,z:0,glide:false};
window.addEventListener('gamepadconnected',()=>{padConnected=true;toast('Controller connected! A jump · X bark · B dash · Y talk');});
window.addEventListener('gamepaddisconnected',()=>{padConnected=[...(navigator.getGamepads?.()||[])].some(Boolean);});
function rumble(type,scale=1){const r=RUMBLE[type];if(!r)return;for(const g of navigator.getGamepads?.()||[]){try{g?.vibrationActuator?.playEffect?.('dual-rumble',{duration:r[1],strongMagnitude:Math.min(1,r[0]*scale),weakMagnitude:Math.min(1,r[0]*scale*1.3)})?.catch?.(()=>{});}catch{}}if(!padConnected&&(type==='hurt'||type==='dead')&&matchMedia('(pointer:coarse)').matches)try{navigator.vibrate?.(Math.round(r[1]*.5));}catch{}}
function moveFocus(dir){const root=$('modal').hidden?$('app'):$('modal');const items=[...root.querySelectorAll('button:not([disabled]),a[href],[role=button][tabindex="0"]')].filter(e=>e.offsetParent&&getComputedStyle(e).visibility!=='hidden');if(!items.length)return;const i=items.indexOf(document.activeElement);items[(i+dir+items.length)%items.length].focus();}
function pollPad(dt){padMove={x:0,z:0,glide:false};if(!padConnected)return;const g=[...(navigator.getGamepads?.()||[])].find(Boolean);if(!g)return;const pad=readPad(g,padPrev);padPrev=pad.pressed;
 const modalOpen=!$('modal').hidden;
 if(game.status==='playing'&&!modalOpen){padMove={x:pad.x,z:pad.z,glide:pad.glide};padLooking=Math.abs(pad.camX)>.01||Math.abs(pad.camY)>.01;yaw-=pad.camX*dt*2.6*settings.look;pitch=Math.max(.05,Math.min(.95,pitch+pad.camY*dt*1.6*settings.look*(settings.invertY?-1:1)));if(pad.recenter)recenterCamera();cameraDistance=Math.max(6,Math.min(19,cameraDistance+pad.zoom*dt*9));for(const k of ['jump','bark','dash','interact'])if(pad[k])actions[k]=true;if(pad.pause)pause();return;}
 if(pad.focus)moveFocus(pad.focus);
 if(pad.back&&modalOpen)window.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape'}));
 else if(pad.confirm||pad.pause){const el=document.activeElement;if(el&&el!==document.body&&el!==canvas&&typeof el.click==='function')el.click();else if(modalOpen)$('modalPrimary').click();else if(menuMode)$('play').click();}
}
// Settings: camera help, screen effects, volumes, and spoken stories.
let settings=(()=>{try{return parseSettings(localStorage.getItem(SETTINGS_STORAGE));}catch{return parseSettings(null);}})();
const effectsOn=()=>settings.effects&&!reduceMotion;
function saveSettings(){try{localStorage.setItem(SETTINGS_STORAGE,JSON.stringify(settings));}catch{}}
function applySettings(){cameraDistance=ZOOM[settings.zoom];document.body.classList.toggle('no-hints',!settings.hints);music?.setVolume(settings.music);if(sfxBus)sfxBus.gain.value=settings.sfx;}
const choiceRow=(label,name,options,current)=>`<div class="set-row"><span class="set-label">${label}</span><div class="set-choice">${options.map(([value,text])=>`<button type="button" data-set="${name}" data-value="${value}" aria-pressed="${value===current}">${text}</button>`).join('')}</div></div>`;
const sliderRow=(label,name,value,min,max,step)=>`<div class="set-row"><span class="set-label"><label for="set-${name}">${label}</label></span><input id="set-${name}" class="set-slider" type="range" data-set="${name}" min="${min}" max="${max}" step="${step}" value="${value}"></div>`;
const switchRow=(label,name,on)=>`<div class="set-row"><span class="set-label">${label}</span><button type="button" class="set-switch" data-set="${name}" data-value="toggle" aria-pressed="${!!on}"><span></span></button></div>`;
function settingsMarkup(){return `<p>Make the camera and the screen fit the way you play.</p>
${choiceRow('Camera help','follow',[['off','Off'],['gentle','Gentle'],['auto','Auto']],settings.follow)}
${choiceRow('Camera distance','zoom',[['near','Near'],['medium','Medium'],['far','Far']],settings.zoom)}
${sliderRow('Look speed','look',settings.look,.4,2,.1)}
${switchRow('Invert up and down','invertY',settings.invertY)}
${choiceRow('Subtitles','subtitles',[['auto','Speech'],['always','Speech + sounds'],['off','Off']],settings.subtitles)}
${switchRow('Read stories and friends aloud','readAloud',readAloud)}
${switchRow('Screen shake and zoom kicks','effects',settings.effects)}
${sliderRow('Music volume','music',settings.music,0,1,.05)}
${sliderRow('Sound volume','sfx',settings.sfx,0,1,.05)}
${switchRow('Show control hints','hints',settings.hints)}
<p class="set-note">Press <kbd>C</kbd>, tap ◎, or click the right stick to put the camera behind Super Dog.</p>`;}
function renderSettings(){$('modalBody').innerHTML=settingsMarkup();
 for(const el of $('modalBody').querySelectorAll('[data-set]')){const name=el.dataset.set;
  if(el.classList.contains('set-slider'))el.oninput=()=>{settings[name]=Number(el.value);saveSettings();applySettings();};
  else el.onclick=()=>{if(name==='readAloud'){toggleReadAloud();}else if(el.dataset.value==='toggle'){settings[name]=!settings[name];}else{settings[name]=el.dataset.value;}
   saveSettings();applySettings();tone('coin');renderSettings();$('modalBody').querySelector(`[data-set="${name}"]${el.dataset.value?`[data-value="${el.dataset.value}"]`:''}`)?.focus();};}
}
function openSettings(){const wasPlaying=game.status==='playing';game.pause();showModal('Settings','','Done',()=>{if(wasPlaying)game.resume();canvas.focus();},false);$('modal').classList.add('settings');renderSettings();}
$('settings').onclick=openSettings;
// Camera help: ease behind Super Dog while moving, or snap there on request.
let recenterT=0,padLooking=false;
function recenterCamera(){recenterT=.55;}
function resetInput(){pressed.clear();heldTouch?.clear();actions={};stick={x:0,z:0};drag=null;joystickPointer=null;$('joystick').firstElementChild.style.transform='';}
function launch(){menuMode=false;const opening=STORIES.find(st=>st.kind==='world'&&st.level===game.level);if(opening&&readAloud)setTimeout(()=>speakStory(opening),900);$('menu').hidden=true;$('hud').hidden=false;$('pause').hidden=false;$('touch').hidden=!matchMedia('(pointer:coarse), (max-width:760px)').matches;game.start();ui();$('modal').hidden=true;resetInput();yaw=0;pitch=.35;camera.position.set(game.player.x,game.player.y+7,game.player.z+11);camBase.copy(camera.position);canvas.focus();storeSave();toast('WASD — move · Space twice to double jump · Drag the mouse to orbit');}
function showModal(title,body,label,callback,secondary=true){resetInput();$('modal').classList.remove('wardrobe','settings','party');$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalPrimary').textContent=label;modalAction=callback;$('modalSecondary').hidden=!secondary;$('modal').hidden=false;$('modalPrimary').focus({preventScroll:true});$('modal').firstElementChild.scrollTop=0;}
function pause(){if(game.status!=='playing')return;game.pause();storeSave();showModal('Taking a break',`<p>Your discoveries and rescued friends are saved. The island will be here when you return!</p><p>Bones: <b>${game.boneCount}/${BONES.length}</b> · Stars: <b>${game.starCount}/6</b></p><p>Difficulty: <b>${game.rules.name}</b>. Change it in the main menu. Your discoveries stay saved; hearts and the current battle reset.</p>`,'Continue adventure',()=>{game.resume();canvas.focus();});$('modalBody').insertAdjacentHTML('beforeend','<button type="button" class="text-button" data-open-settings>⚙ Settings</button>');$('modalBody').querySelector('[data-open-settings]').onclick=openSettings;}
$('play').onclick=launch;if((save?.version===3||save?.version===4)&&hasProgress(save)){$('play').firstChild.textContent='Continue adventure ';$('newGame').hidden=false;}
$('newGame').onclick=()=>showModal('Start over?','<p>This will reset discoveries and rescued friends in all five worlds. Your wardrobe, your drawing, and your Bone Rush best times stay.</p>','Yes, start a new adventure',()=>{resettingSave=true;try{localStorage.setItem(STORAGE,JSON.stringify(game.freshStart()));}catch{}location.reload();});
$('pause').onclick=pause;$('modalPrimary').onclick=()=>{$('modal').hidden=true;modalAction?.();ui();};
$('modalSecondary').onclick=()=>{updateCampaignUI();$('modal').hidden=true;game.pause();menuMode=true;$('menu').hidden=false;$('hud').hidden=true;$('touch').hidden=true;$('pause').hidden=true;$('play').firstChild.textContent='Continue adventure ';$('newGame').hidden=false;};
$('help').onclick=()=>{helpWasPlaying=game.status==='playing';game.pause();showModal('How to be a super dog',`<p>Explore each world, collect three keys, and rescue your friends. The bridge to the giant boss will open.</p><dl class="help-list"><dt>WASD / arrow keys</dt><dd>Move relative to the camera</dd><dt>Space × 2</dt><dd>Jump, then jump again in midair</dd><dt>X / BARK button</dt><dd>Super bark to chase away snakes</dd><dt>Hold Space</dt><dd>Glide with your cape (after the first giant)</dd><dt>Shift</dt><dd>Dash forward, even in midair</dd><dt>E</dt><dd>Talk, open a cage with one key, or discover a secret</dd><dt>Mouse / touch</dt><dd>Drag across the world to rotate the camera</dd><dt>Q / R · mouse wheel</dt><dd>Rotate · camera distance</dd><dt>C</dt><dd>Put the camera behind Super Dog</dd><dt>Esc</dt><dd>Pause</dd><dt>Controller</dt><dd>Stick move · A jump, hold to glide · X bark · B dash · Y talk · Start pause</dd></dl><p>Golden flags are checkpoints. Falling into the water returns you to a flag. Progress is saved in this browser.</p><button type="button" class="read-toggle" data-read-aloud aria-pressed="false">Read stories and friends aloud</button>`,'Got it!',()=>{if(helpWasPlaying)game.resume();canvas.focus();},false);$('modalBody').querySelector('[data-read-aloud]').onclick=toggleReadAloud;updateReadAloud();};
$('sound').onclick=()=>{sound=!sound;try{localStorage.setItem(SOUND_STORAGE,sound?'on':'off');}catch{}updateSoundButton();syncMusic();tone('coin');if(game.status==='playing')canvas.focus();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('app').requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}if(game.status==='playing')canvas.focus();};
const actionKeys={Space:'jump',KeyX:'bark',KeyE:'interact',ShiftLeft:'dash',ShiftRight:'dash'};
window.addEventListener('keydown',e=>{if(e.code==='KeyC'&&game.status==='playing'&&$('modal').hidden)recenterCamera();});
window.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();if(!$('modal').hidden){if(game.status==='dead'||game.status==='won')return;$('modal').hidden=true;if(!menuMode)game.resume();canvas.focus();}else pause();return;}if(e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement)return;if(game.status!=='playing'||!$('modal').hidden)return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!pressed.has(e.code)&&actionKeys[e.code])actions[actionKeys[e.code]]=true;pressed.add(e.code);});
window.addEventListener('keyup',e=>pressed.delete(e.code));window.addEventListener('blur',()=>{resetInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();pause();audio?.suspend();}else if(sound)audio?.resume();});window.addEventListener('pagehide',storeSave);
canvas.addEventListener('pointerdown',e=>{if(game.status!=='playing')return;canvas.focus();canvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;yaw-=(e.clientX-drag.x)*.006*settings.look;pitch=Math.max(.05,Math.min(.95,pitch+(e.clientY-drag.y)*.004*settings.look*(settings.invertY?-1:1)));drag.x=e.clientX;drag.y=e.clientY;});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>drag=null);
canvas.addEventListener('wheel',e=>{if(game.status==='playing'){e.preventDefault();cameraDistance=Math.max(6,Math.min(19,cameraDistance+e.deltaY*.01));}},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
let joystickPointer=null;const joy=$('joystick');function moveStick(e){if(e.pointerId!==joystickPointer)return;const r=joy.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/35,z=(e.clientY-r.top-r.height/2)/35;const d=Math.hypot(x,z);if(d>1){x/=d;z/=d;}stick={x,z};joy.firstElementChild.style.transform=`translate(${x*30}px,${z*30}px)`;}
joy.addEventListener('pointerdown',e=>{joystickPointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveStick(e);});joy.addEventListener('pointermove',moveStick);for(const name of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(name,()=>{joystickPointer=null;stick={x:0,z:0};joy.firstElementChild.style.transform='';});
const heldTouch=new Set();for(const button of document.querySelectorAll('[data-action]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(button.dataset.action==='recenter'){recenterCamera();return;}heldTouch.add(button.dataset.action);if(game.status==='playing')actions[button.dataset.action]=true;});for(const name of ['pointerup','pointercancel','pointerleave'])button.addEventListener(name,()=>heldTouch.delete(button.dataset.action));}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(!menuMode)$('touch').hidden=!matchMedia('(pointer:coarse), (max-width:760px)').matches;}window.addEventListener('resize',resize);resize();
const map=$('minimap').getContext('2d'),css=c=>'#'+c.toString(16).padStart(6,'0');function drawMap(){const px=x=>90+x*1.34,pz=z=>126+z*1.04;map.clearRect(0,0,180,180);map.fillStyle=css(theme.sea);map.fillRect(0,0,180,180);map.fillStyle=css(theme.ground);map.fillRect(px(-48),pz(-46),96*1.34,94*1.04);map.fillStyle=css(theme.stone);map.fillRect(px(-19),pz(-86),38*1.34,32*1.04);map.fillStyle='#c8a66e';map.fillRect(px(-2.6),pz(-55),5.2*1.34,12*1.04);map.globalAlpha=.55;for(const p of PLATFORMS){if(p.kind==='island'||p.kind==='arena'||p.kind==='bridge')continue;map.fillStyle=p.kind==='house'?'#d79677':p.kind==='mushroom'?css(theme.accent):'#fff8e4';map.fillRect(px(p.x-p.w/2),pz(p.z-p.d/2),Math.max(2,p.w*1.34),Math.max(2,p.d*1.04));}map.globalAlpha=1;for(const f of FRIENDS){map.beginPath();map.fillStyle=game.rescued.has(f.id)?'#f9f4ce':'#9868b4';map.arc(px(f.x),pz(f.z),3.7,0,7);map.fill();}for(const k of KEYS)if(!game.collected.has(k.id)){map.fillStyle='#ffeb78';map.fillRect(px(k.x)-2,pz(k.z)-2,4,4);}const p=game.player;map.save();map.translate(px(p.x),pz(p.z));map.rotate(-p.facing);map.fillStyle='#fff9e7';map.strokeStyle='#385845';map.lineWidth=1.5;map.beginPath();map.moveTo(0,5);map.lineTo(-4,-4);map.lineTo(4,-4);map.closePath();map.fill();map.stroke();map.restore();map.fillStyle='#406656';map.font='bold 9px sans-serif';map.fillText('N',86,12);}
$('boneTotal').textContent=`/ ${BONES.length}`;$('friendBadges').innerHTML=FRIENDS.map(f=>`<span data-friend="${f.id}">${f.name}</span>`).join('');
let uiTime=0;function ui(){applyLook();const p=game.player;$('hearts').textContent='♥ '.repeat(Math.max(0,p.hp))+'♡ '.repeat(game.maxHP-Math.max(0,p.hp));$('hearts').setAttribute('aria-label',`${p.hp} of ${game.maxHP} hearts`);$('bones').textContent=game.boneCount;$('stars').textContent=game.starCount;$('keys').textContent=game.keyCount;$('objective').textContent=game.objective;for(const badge of $('friendBadges').children)badge.classList.toggle('saved',game.rescued.has(badge.dataset.friend));$('barkCharge').style.width=`${Math.max(0,1-p.barkCD/game.rules.barkCooldown)*100}%`;$('dashCharge').style.width=`${Math.max(0,1-p.dashCD/game.rules.dashCooldown)*100}%`;$('zone').textContent=game.level?theme.name:p.z<-54?'Royal arena':p.z<-20&&p.x>5?'Cloud steps':p.x>18?'Mushroom forest':p.x<-15?'Friend village':'Sunny shore';const secret=game.nearbySecret();const f=game.nearbyFriend();const stone=!f&&!secret&&game.nearbyRushStone(),guide=!f&&!secret&&!stone&&game.nearbyGuide();$('interactPrompt').hidden=!f&&!secret&&!guide&&!stone;if(guide)$('interactPrompt').lastElementChild.textContent=`Talk to ${guide.name}`;if(stone){const best=game.challenges[game.level]?.best;$('interactPrompt').lastElementChild.textContent=`Start Bone Rush${best?` · best ${best}s`:''}`;}$('rushHud').hidden=!game.rush;if(game.rush){const left=Math.ceil(game.rush.left);$('rushTime').textContent=`${left}s`;$('rushHud').classList.toggle('hurry',left<=10);$('rushCount').textContent=`${game.rush.got.size} / ${game.world.RUSH.bones.length}`;}for(const m of trophyParts)m.material=mat(game.challenges[game.level]?0xf3c65b:0xcfd6d8);if(secret)$('interactPrompt').lastElementChild.textContent='Discover secret';if(f)$('interactPrompt').lastElementChild.textContent=game.keyCount>0?`Rescue: ${f.name}`:'You need a golden key';$('bossHud').hidden=game.boss.state==='sleep'||game.boss.hp<=0;$('bossHealth').style.width=`${game.boss.hp/game.rules.bossHP*100}%`;$('bossState').textContent=game.boss.state==='rest'?'BARK NOW!':game.boss.state==='windup'?'CHARGING UP':'DASH SIDEWAYS!';drawMap();}
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.1);last=now;const anim=now/1000;pollPad(dt);
 if(game.status==='playing'){
  yaw+=((pressed.has('KeyQ')?1:0)-(pressed.has('KeyR')?1:0))*dt*1.8;
  const x=(pressed.has('KeyD')||pressed.has('ArrowRight')?1:0)-(pressed.has('KeyA')||pressed.has('ArrowLeft')?1:0)+stick.x+padMove.x,z=(pressed.has('KeyS')||pressed.has('ArrowDown')?1:0)-(pressed.has('KeyW')||pressed.has('ArrowUp')?1:0)+stick.z+padMove.z;
  // Fixed maximum physics step prevents tunnelling on slower devices.
  game.tick(dt,{x,z,yaw,...actions,glide:pressed.has('Space')||heldTouch.has('jump')||padMove.glide});actions={};
 }
 const frameEvents=game.events.splice(0);if(frameEvents.length)uiTime=1;
 // Recorded guidance for the moments that matter; silent unless reading aloud is on.
const SPOKEN_EVENTS={checkpoint:'checkpoint',dead:'dead',rushStart:'rushStart',rushLost:'rushLost'};
let saidFirstKey=false;
for(const event of frameEvents){tone(event.type,event.type==='coin'?coinRatio(now):1);rumble(event.type);
  if(SPOKEN_EVENTS[event.type])voice.speak(lineId.ui(SPOKEN_EVENTS[event.type]));
  if(event.type==='key'&&!saidFirstKey){saidFirstKey=true;voice.speak(lineId.ui('firstKey'));}
  if(event.type==='hurt'&&game.player.hp===1)voice.speak(lineId.ui('hurt'));
  if(event.type==='hint'&&/open the gate/.test(event.text||''))voice.speak(lineId.ui('gate'));
  if(event.type==='hint'&&/tired/.test(event.text||''))voice.speak(lineId.ui('bossTired'));
  if(event.type==='rescue'&&game.rescued.size===3)voice.speak(lineId.ui('bossReady'));
if(event.text&&event.type!=='talk')toast(event.text);if(event.type==='talk')showSpeech(event.speaker,event.text,lineId.guide(game.level,event.index??0));if(event.type==='rescue')showSpeech(event.speaker,event.line,lineId.friend(game.level,event.index??0));showCaption(captionForSound(event.type),'sound');if(['coin','key','star','rescue','checkpoint','enemy','won','secret'].includes(event.type))storeSave();if(['coin','key','star','rescue','secret'].includes(event.type))burst(game.player.x,game.player.y+1,game.player.z,event.type==='rescue'?0xb9e98a:0xffdc72,event.type==='coin'?4:20);if(event.type==='jump'){squashAmt=.2;squashT=.2;}if(event.type==='dash'&&effectsOn())fovPunch=Math.min(10,fovPunch+6);if(effectsOn())trauma=Math.min(1,trauma+({hurt:.55,bossHit:.4,fall:.3,won:.35}[event.type]||0));if(event.type==='bark'){party?.bark();barkTime=.4;attackRing.position.set(game.player.x,game.player.y+.15,game.player.z);}if(event.type==='dead')showModal('Try again?',`<p>You keep your bones, keys, and rescued friends. Restart from the last flag.</p>`,'Return to checkpoint',()=>{game.retry();canvas.focus();});if(event.type==='secret'){game.pause();updateCampaignUI();const found=STORIES.find(s=>s.egg===event.id);showModal('Secret found!',`<p>${event.text}</p>${found?`<p class="story-hint">A new story opened in the story book: <b>${found.title}</b>.</p>`:''}<p>${game.secrets.size} / 10 in your album.</p>`,'Keep exploring',()=>{game.resume();canvas.focus();},false);if(found)speakStory(found);else voice.speak(null,event.text);}if(event.type==='rushWon'){confetti(game.player.x,game.player.y+1.6,game.player.z,50);setTimeout(()=>showRushResult(event),reduceMotion?200:900);}if(event.type==='rescue')confetti(game.player.x,game.player.y+1.5,game.player.z,24);if(event.type==='won'){victoryT=1.8;confetti(game.player.x,game.player.y+2,game.player.z,70);setTimeout(showVictory,reduceMotion?300:1700);}}
 const p=game.player;if(game.status==='playing'&&p.grounded&&!wasGrounded&&lastVy<-4){const s=Math.min(1,-lastVy/16);squashAmt=-.26*s;squashT=.22;dust(p.x,game.groundBelow(p),p.z,s);tone('land',.4+s*.6);if(s>.5)rumble('land',s);}wasGrounded=p.grounded;lastVy=p.vy;
 if(squashT>0){squashT=Math.max(0,squashT-dt);const k=1-squashT/(squashAmt>0?.2:.22),y=1+squashAmt*(1-easeOutBack(k));dog.scale.set(1/Math.sqrt(y),y,1/Math.sqrt(y));}else dog.scale.setScalar(1);
 dog.position.set(p.x,p.y,p.z);dog.rotation.y=p.facing;if(victoryT>0){victoryT=Math.max(0,victoryT-dt);const t=1.8-victoryT;dog.rotation.y+=reduceMotion?0:t*7;dog.position.y+=Math.abs(Math.sin(t*9))*.55;}const moving=game.status==='playing'&&(Math.hypot(p.vx,p.vz)>.2||game.secrets.has('egg-3-1'));dog.userData.legs.forEach((l,i)=>l.rotation.x=moving?Math.sin(anim*15+i*Math.PI)*.5:0);dog.userData.tail.rotation.z=Math.sin(anim*(moving?19:8))*(moving?.35:.5);dog.userData.cape.rotation.x=p.gliding?-1.3+Math.sin(anim*22)*.06:-.25+(moving?Math.sin(anim*16)*.14-.25:Math.sin(anim*3)*.06);if(p.gliding){dog.userData.legs[2].rotation.z=-1.15;dog.userData.legs[3].rotation.z=1.15;dog.rotation.x=.22;}else{dog.userData.legs[2].rotation.z=.16;dog.userData.legs[3].rotation.z=-.16;dog.rotation.x=0;}dog.visible=true;dog.userData.cape.material=game.status==='playing'&&p.invuln>0&&Math.floor(anim*8)%2===0?mat(0xffd98b):drawing?.cape&&drawingMats?drawingMats.cape:mat(capeColor);dogShadow.position.set(p.x,game.groundBelow(p)+.035,p.z);dogShadow.scale.setScalar(p.grounded?1:.7);
 for(const c of pickups){const got=game.collected.has(c.data.id);if(!got){c.pop=undefined;c.mesh.visible=true;c.mesh.scale.setScalar(c.base);c.mesh.position.y=c.data.y+Math.sin(anim*2.3+c.data.x)*.12;c.mesh.rotation.y=anim*(c.kind==='bone'?.7:1.2);continue;}
  // A collected item leaps up, grows and spins for a moment instead of blinking out.
  if(c.pop===undefined)c.pop=.3;if(c.pop>0){c.pop=Math.max(0,c.pop-dt);const k=1-c.pop/.3;c.mesh.visible=c.pop>0;c.mesh.scale.setScalar(c.base*(1+easeOutBack(Math.min(1,k*1.6))*.7)*(1-k*k));c.mesh.position.y=c.data.y+k*1.4;c.mesh.rotation.y+=dt*16;}else c.mesh.visible=false;}
 for(const f of FRIENDS){cages.get(f.id).visible=!game.rescued.has(f.id);const m=friendModels.get(f.id);m.position.y=.12+(game.rescued.has(f.id)?Math.abs(Math.sin(anim*3))* .22:0);m.rotation.y=game.rescued.has(f.id)?Math.sin(anim)*.5:anim*.4;}
 for(const r of rushBones){const on=!!game.rush&&!game.rush.got.has(r.data.id);r.mesh.visible=on;r.beam.visible=on;if(on){r.mesh.rotation.y=anim*2;r.mesh.position.y=r.data.y+Math.sin(anim*3+r.data.x)*.15;}}
 trophy.rotation.y=anim*.8;trophy.position.y=1.55+Math.sin(anim*2)*.08;
 for(const n of guides){const m=n.mesh,d=Math.hypot(p.x-n.data.x,p.z-n.data.z);m.position.y=n.data.y+Math.abs(Math.sin(anim*2.4+n.data.x))*.08;m.rotation.y=d<10?Math.atan2(p.x-n.data.x,p.z-n.data.z):Math.sin(anim*.4)*.6;m.userData.marker.visible=!game.talked?.[n.data.id];m.userData.marker.position.y=(n.data.kind==='penguin'?2.05:1.85)+Math.sin(anim*3)*.08;}
 if(!$('speech').hidden&&now>speechUntil)$('speech').hidden=true;
 if(!$('caption').hidden&&now>captionUntil)$('caption').hidden=true;
 for(const e of secretModels){e.mesh.visible=!game.secrets.has(e.data.id);e.mesh.position.y=e.data.y+1+Math.sin(anim*2)*.18;e.mesh.rotation.y=anim*.5;}
 gateBars.visible=game.rescued.size<3;for(const f of flags){const on=f.id===game.checkpoint;f.mesh.material=drawing?.flags&&drawingMats?drawingMats[on?'flagOn':'flag']:mat(on?0x85c37a:0xf5c563);f.mesh.rotation.y=Math.sin(anim*3)*.15;}
 for(const e of game.enemies){const m=enemyModels.get(e.id);m.visible=!game.defeated.has(e.id);m.position.set(e.x,0,e.z);m.rotation.y=Math.atan2(p.x-e.x,p.z-e.z);m.userData.segments.forEach((s,i)=>s.position.x=Math.sin(anim*5+i)*.14);m.scale.setScalar(e.hit>0?1.2:1);}
 const b=game.boss;bossView.visible=b.hp>0;bossView.position.set(b.x,b.y,b.z);bossView.rotation.y=b.state==='charge'?Math.atan2(b.dx,b.dz):Math.atan2(p.x-b.x,p.z-b.z);bossView.scale.setScalar(bossView.userData.baseScale*(b.hit>0?1.04:1));bossView.userData.head.rotation.z=Math.sin(anim*2)*.035;dangerRing.visible=b.state==='windup';dangerRing.position.x=b.x;dangerRing.position.z=b.z;dangerRing.scale.setScalar(1+Math.sin(anim*12)*.1);
 while(waveModels.length<game.waves.length){const m=new T.Mesh(new T.RingGeometry(.97,1,64),new T.MeshBasicMaterial({color:0xf6cb7e,transparent:true,opacity:.85,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;scene.add(m);waveModels.push(m);}waveModels.forEach((m,i)=>{const w=game.waves[i];m.visible=!!w;if(w){m.position.set(w.x,1.38,w.z);m.scale.setScalar(w.r);}});
 barkTime-=dt;attackRing.visible=barkTime>0;if(barkTime>0){attackRing.scale.setScalar((1-barkTime/.4)*6);attackRing.material.opacity=barkTime/.4;}
 for(let i=particles.length-1;i>=0;i--){const q=particles[i];q.life-=dt;q.v.y-=(q.g??10)*dt;q.m.position.addScaledVector(q.v,dt);if(q.max)q.m.scale.setScalar(q.size*Math.max(.01,q.life/q.max));if(q.spin){q.m.rotation.x+=q.spin*dt;q.m.rotation.z+=q.spin*.6*dt;q.v.x*=1-dt*1.5;q.v.z*=1-dt*1.5;}if(q.life<=0){scene.remove(q.m);particles.splice(i,1);}}
 if(party){drawFriends(dt,anim);if(now-partySendAt>80){partySendAt=now;party.sendState(p,game.level);}}
 clouds.forEach((c,i)=>c.position.x+=Math.sin(i+anim*.03)*dt*.18);updateWeather(dt,anim,menuMode?{x:0,z:0}:p);
 if(volcanoCrater&&(smokeT-=dt)<0){smokeT=.4;const m=ball(0x9a8f98,volcanoCrater.x+rnd(-.5,.5),volcanoCrater.y,volcanoCrater.z+rnd(-.5,.5),.9);m.castShadow=false;particles.push({m,v:new T.Vector3(rnd(-.4,.4),1.7,rnd(-.4,.4)),life:3.4,max:3.4,size:.9+rnd(0,.6),g:-.1});}
 if(previewMode&&$('modal').hidden){previewMode=false;camera.clearViewOffset();$('menu').style.visibility='';}
 if(menuMode&&previewMode){const c=dog.position,w=innerWidth,h=innerHeight;dog.rotation.y=anim*.7;const wide=w>900,d=6.2*Math.max(1,1/camera.aspect);camera.position.set(c.x+d*.22,c.y+2.2+d*.05,c.z+d);camera.lookAt(c.x,c.y+(wide?1.15:1.15-d*.28),c.z);if(wide)camera.setViewOffset(w,h,-w*.22,0,w,h);else camera.clearViewOffset();}
 else if(menuMode){camera.position.set(66+Math.sin(anim*.05)*5,53,78);camera.lookAt(-3,1,-11);}else{
  if(recenterT>0){recenterT=Math.max(0,recenterT-dt);yaw=followYaw(yaw,p.facing,9,dt);}
  else if(settings.follow!=='off'&&!drag&&!padLooking&&game.status==='playing')yaw=followYaw(yaw,p.facing,FOLLOW[settings.follow],dt,Math.hypot(p.vx,p.vz)>1.5);
  const battle=b.hp>0&&p.z<-55;const viewDistance=battle?Math.max(cameraDistance,21+game.level):cameraDistance;
  cameraTarget.set(p.x,p.y+(battle?3.7:1.3),p.z);desiredCamera.set(Math.sin(yaw)*Math.cos(pitch)*viewDistance,Math.sin(pitch)*viewDistance+2,Math.cos(yaw)*Math.cos(pitch)*viewDistance).add(cameraTarget);
  const cameraSolids=b.hp>0?[...game.solids,{shape:'cylinder',x:b.x,z:b.z,radius:game.bossRadius,bottom:b.y,top:b.y+game.bossHeight}]:game.solids;
  desiredCamera.copy(safeCamera(cameraTarget,desiredCamera,cameraSolids));
  camBase.lerp(desiredCamera,1-Math.exp(-dt*12));camBase.copy(safeCamera(cameraTarget,camBase,cameraSolids));camera.position.copy(camBase);camera.lookAt(cameraTarget);
  // Trauma shake is added after the follow camera, so it never accumulates into the next frame.
  if(trauma>0){trauma=Math.max(0,trauma-1.5*dt);const s=trauma*trauma,t=anim*32;camera.position.x+=.45*s*shakeNoise(t,1);camera.position.y+=.35*s*shakeNoise(t,2);camera.rotateZ(.06*s*shakeNoise(t,3));}
  if(fovPunch>.01||camera.fov!==BASE_FOV){fovPunch=fovPunch>.01?fovPunch*Math.exp(-dt/.2):0;camera.fov=BASE_FOV+fovPunch;camera.updateProjectionMatrix();}
 }
 if(now>toastUntil)$('toast').classList.remove('show');uiTime+=dt;if(uiTime>.1){ui();uiTime=0;}renderer.render(scene,camera);
}
applySettings();ui();$('loading').hidden=true;requestAnimationFrame(frame);if(sessionStorage.getItem('superdog-autostart')){sessionStorage.removeItem('superdog-autostart');launch();}
