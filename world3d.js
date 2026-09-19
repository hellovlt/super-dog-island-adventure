// The world and simulation share coordinates with the renderer. Y is height at the feet.
export const SPAWN = {x:0,y:0,z:32};
const box=(id,x,z,w,d,top,bottom=-3,kind='grass')=>({id,x,z,w,d,top,bottom,kind});
export const PLATFORMS = [
 box('island',0,1,96,94,0,-7,'island'),
 box('arena',0,-70,38,32,1.2,-8,'arena'),
 box('bridge',0,-49.5,5.2,13,0.5,-.2,'bridge'),
 box('bridge-approach',0,-42.65,5.2,1.7,.25,-.1,'bridge'),
 box('bridge-step',0,-54,5.2,2,.85,0,'bridge'),
 box('house1',-24,8,8,7,3.4,0,'house'),box('house2',-24,-5,8,8,3.8,0,'house'),
 box('house3',-37,-9,7,7,3.1,0,'house'),box('house4',-38,10,6,7,2.9,0,'house'),
 box('crate1',-14,14,3,3,1.1,0,'crate'),box('crate2',-17,10,3,3,2.2,0,'crate'),
 box('mush1',27,18,4,4,1.2,0,'mushroom'),box('mush2',32,16,4,4,2.4,0,'mushroom'),
 box('mush3',37,12,5,5,3.6,0,'mushroom'),
 box('cloud1',6,-19,4,4,1.5,0,'ruin'),box('cloud2',10,-23,3.5,3.5,3,1,'float'),
 box('cloud3',14,-27,3.5,3.5,4.5,2,'float'),box('cloud4',18,-31,3.5,3.5,6,3.5,'float'),
 box('cloud5',18,-37,8,7,7.5,5,'float'),
 box('secret',-39,29,6,6,2.4,0,'ruin'),box('secret-step',-34,30,3,3,1.1,0,'crate'),
];
export const FRIENDS = [
 {id:'peach',name:'Peach',x:-24,y:3.8,z:-5,color:0xffbb72},
 {id:'spark',name:'Spark',x:30,y:0,z:-9,color:0xf08f65},
 {id:'fluff',name:'Fluff',x:18,y:7.5,z:-37,color:0xb4b5f9},
];
export const KEYS = [
 {id:'village-key',x:-24,y:4.2,z:8}, {id:'forest-key',x:37,y:4.4,z:12}, {id:'sky-key',x:14,y:5.3,z:-27}
];
export const STARS = [
 {id:'star-roof',x:-37,y:4,z:-9},{id:'star-ruin',x:-39,y:3.3,z:29},
 {id:'star-cloud',x:15.2,y:8.4,z:-38},{id:'star-forest',x:41,y:.9,z:-23},
 {id:'star-beach',x:-41,y:.9,z:-34},{id:'star-arena',x:12,y:2.1,z:-76},
];
const bones=[];
const trail=(ax,az,bx,bz,n,y=.85)=>{for(let i=0;i<n;i++){const t=i/(n-1);bones.push({id:`bone-${bones.length}`,x:ax+(bx-ax)*t,y,z:az+(bz-az)*t});}};
trail(0,26,0,8,7);trail(-6,8,-16,14,5);trail(-24,10,-24,6,3,4.25);
trail(-26.7,-3,-26.7,-7,3,4.65);trail(5,12,22,18,6);trail(30,8,30,-6,6);
trail(25,-12,11,-18,6);trail(20.8,-35,20.8,-39,3,8.35);trail(-12,-22,-35,-32,7);
trail(-38,22,-16,29,7);trail(4,-27,0,-43,6);trail(0,-47,0,-53,4,1.4);
trail(-10,-65,-10,-76,5,2.05);trail(10,-65,10,-73,4,2.05);
bones[10].y=1.95; // This breadcrumb sits on the first crate, not inside its wood.
export const BONES=bones;
export const CHECKPOINTS=[{id:'home',...SPAWN},{id:'village',x:-13,y:0,z:3},{id:'forest',x:24,y:0,z:-5},{id:'sky',x:5,y:0,z:-16},{id:'boss',x:0,y:1.2,z:-58}];
export const ENEMIES=[{id:'snake1',x:15,z:13},{id:'snake2',x:29,z:-1},{id:'snake3',x:-9,z:-21},{id:'snake4',x:-33,z:23},{id:'snake5',x:35,z:-22}];

export const TREES=[[-44,40],[-42,18],[-43,-23],[-40,-39],[-28,-37],[-18,-39],[-8,-38],[10,-42],[30,-39],[42,-36],[43,38],[30,37],[19,38],[-17,39],[-30,40],[-6,43],[7,44],[41,27],[43,5],[41,-7],[36,-15],[25,-25],[34,-30],[20,27],[29,25],[21,5],[-6,-9],[-34,-26],[-42,1],[-17,-30]].map(([x,z],i)=>({id:`tree-${i}`,x,z,scale:.85+(i*37%65)/100,pine:i%4===0}));
const cylinder=(id,x,z,radius,bottom,top,color)=>({id,shape:'cylinder',x,z,radius,bottom,top,color});
const prop=(id,x,z,w,d,bottom,top,color)=>({...box(id,x,z,w,d,top,bottom,'prop'),color});
// These solid props are drawn directly from the same data used for collisions.
export const PROPS=[
 cylinder('lighthouse-base',-39,-35,2,0,10,0xf6e8be),
 cylinder('lighthouse-band1',-39,-35,2.03,3.25,4.75,0xdc9975),
 cylinder('lighthouse-band2',-39,-35,2.03,7.4,8.6,0xdc9975),
 cylinder('lighthouse-lantern',-39,-35,1.6,9.85,11.15,0x6f928f),
 ...PLATFORMS.filter(p=>p.kind==='house').flatMap(p=>[
  ...[-1,1].map(side=>prop(`${p.id}-rim-${side}`,p.x+side*(p.w/2-.15),p.z,.25,p.d,p.top,p.top+.36,0xffe6b3)),
  prop(`${p.id}-chimney`,p.x+p.w*.25,p.z-1,1,1,p.top,p.top+1.3,0xf3daaa),
  prop(`${p.id}-cap`,p.x+p.w*.25,p.z-1,1.2,1.2,p.top+1.25,p.top+1.45,0xad7557),
  prop(`${p.id}-awning`,p.x,p.z+p.d/2+.8,p.w*.85,1.7,2.52,2.72,0xd6815e),
 ]),
 ...[-1,1].flatMap(side=>[
  prop(`gate-pillar-${side}`,side*3.4,-44.5,1.1,1.2,0,8.4,0xb5b690),
  prop(`bridge-rail-${side}`,side*2.6,-49.6,.16,11.9,.5,1.68,0x856a47),
 ]),
 ...CHECKPOINTS.map(c=>cylinder(`flag-${c.id}`,c.x-2,c.z,.075,c.y,c.y+3.2,0xa58052)),
 ...[-16,16].flatMap(x=>[-58,-82].flatMap(z=>[
  cylinder(`pillar-${x}-${z}`,x,z,.9,1.1,6.1,0xaaa98e),
  cylinder(`pillar-cap-${x}-${z}`,x,z,1.2,6,6.4,0xd9caa0),
 ])),
];
export const ROCKS=Array.from({length:20},(_,i)=>({id:`rock-${i}`,x:-47+i*4.9,z:i%2?49:-46.7,r:.65+(i*13%7)/10}));
export const STATIC_SOLIDS=[
 ...PLATFORMS.map(p=>p.kind==='mushroom'?{...p,bottom:p.top-.4}:p),
 box('beach',0,1,101,99,-.1,-1.1,'beach'),
 ...PLATFORMS.filter(p=>p.kind==='mushroom').map(p=>cylinder(`${p.id}-stem`,p.x,p.z,.6,0,p.top-.4)),
 ...TREES.map(t=>cylinder(t.id,t.x,t.z,.28*t.scale,0,2.8*t.scale)),
 ...PROPS,
 ...ROCKS.map(r=>cylinder(r.id,r.x,r.z,r.r*.88,-1,r.r*.5)),
];
export const CLOSED_GATE=prop('gate',0,-44.5,6,.18,0,8,0xc69a4e);
export const CAGE_SOLIDS=FRIENDS.map(f=>({...cylinder(`cage-${f.id}`,f.x,f.z,1.5,f.y,f.y+2.72),friend:f.id}));
export function solidsFor(rescued){return [...STATIC_SOLIDS,...CAGE_SOLIDS.filter(c=>!rescued.has(c.friend)),...(rescued.size<3?[CLOSED_GATE]:[])];}
