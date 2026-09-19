import * as base from './world3d.js';

export const LEVELS = [
 {name:'Sunny Island',subtitle:'Where the drawing began',boss:'Snake King',color:0x9075bb,scale:5.2,sky:0xb9e7ed,ground:0x97c861,sea:0x68c9d8,stone:0xb9bb94,accent:0xf5c563},
 {name:'Mushroom Kingdom',subtitle:'A forest above the clouds',boss:'Mushroom Giant',color:0xc66582,scale:5.8,sky:0xc4d9e9,ground:0x75967a,sea:0x758fb8,stone:0xd5a29c,accent:0xffaf94},
 {name:'Crystal Winter',subtitle:'Steps to the ice palace',boss:'Frost Fang',color:0x69acd3,scale:6.3,sky:0xd2e7fc,ground:0xe2eff5,sea:0x709cca,stone:0x94cadf,accent:0xa2e7ff},
 {name:'Volcano Island',subtitle:'Leaps over fiery cracks',boss:'Fire Dragon',color:0xae574d,scale:6.8,sky:0xe5bcc0,ground:0x827686,sea:0xd87751,stone:0xa695a5,accent:0xffb35a},
 {name:'Sky Castle',subtitle:'The final page of the adventure',boss:'Cloud Emperor',color:0x8c74c1,scale:7.3,sky:0xcad0f1,ground:0xc3bedf,sea:0xaaa6d5,stone:0xf0d9bc,accent:0xffd275},
];
const eggNames=[['The First Drawing','Dog Moon'],['Mushroom Tea Party','The Tiny King'],['Snow Dog','The Frozen Woof'],['Dragon Pizza','The Dancing Volcano'],['World Creator','A Crown for Super Dog']];
const friendNames=[['Peach','Spark','Fluff'],['Moss','Truffle','Button'],['Snowball','Polar','Icicle'],['Ember','Chili','Ash'],['Comet','Sunny','Mallow']];
const eggTexts=[['It all began with a sheet of paper. Thank you to the young creator of Super Dog!','They hide bones on the Moon, too. You earned a star antenna!'],['The mushrooms invited you for tea. Just do not eat the cup!','The tiniest king has the biggest slippers.'],['The snow dog needs a scarf. Super Dog shares his spare cape!','An ancient woof, frozen in time. It thawed into a tiny melody.'],['The dragon bakes pizza without an oven. The secret is very hot breath.','This volcano has rhythm. Now you do, too!'],['Five worlds from one drawing. Imagination is the greatest superpower.','A crown for a curious explorer. Super Dog, you earned it!']];
// Each rescued friend says thank you in their own words.
const friendLines=[
 ['Woof! Thank you, Super Dog! That snake took my ball.','I knew you would come! Your cape is the best.','Free at last! Now let us stop the Snake King together!'],
 ['The mushrooms kept me company, but you are much nicer!','Sniff sniff... you smell like a hero!','My tail is wagging so fast! Thank you!'],
 ['Brrr! A hug from a super dog is the warmest thing.','I counted snowflakes while I waited. Four hundred and twelve!','You found me! Watch out for Frost Fang and its icy rings.'],
 ['Phew! It was getting toasty in there.','You jumped over the lava like a champion!','Thank you! The Fire Dragon is only grumpy. Bark and it calms down.'],
 ['Up here the clouds are soft, but the cage was not!','You made it to the sky! You really can fly.','The Cloud Emperor is the last giant. You can do it!'],
];
// A guide waits beside the first flag of every world with a few friendly hints.
const guides=[
 {name:'Grandma Tortoise',kind:'tortoise',lines:['Welcome to Sunny Island, Super Dog! Three friends are locked in cages.','Golden keys open the cages. Try the rooftops, the mushroom forest, and the cloud steps.','Touch a golden flag to save your spot and refill your hearts.','Snakes are shy. Bark with X and they run away!']},
 {name:'Professor Toad',kind:'toad',lines:['Welcome to the Mushroom Kingdom! My friends are stuck on the tallest mushrooms.','Each mushroom path climbs higher. Jump twice to reach the next cap.','Your new cape glide helps too. Hold jump while you fall.','The Mushroom Giant waits past the gate. Bark while it rests!']},
 {name:'Captain Penguin',kind:'penguin',lines:['Brr, hello! Welcome to Crystal Winter.','Three frozen friends wait at the top of the ice paths.','If you slip off, a rescue bubble brings you back to your last flag.','Frost Fang charges fast. Jump over its icy rings!']},
 {name:'Sal the Salamander',kind:'salamander',lines:['Hot, hot, hot! Welcome to Volcano Island.','The glowing cracks are lava. Jump over them, or glide across!','Your friends are on the high rocks. Keys first, then cages.','The Fire Dragon rests after each charge. That is your moment to bark!']},
 {name:'Wise Owl',kind:'owl',lines:['Hoo! You reached Sky Castle, the last page of the adventure.','The paths float on clouds. Look before you leap, and glide when you fall.','Three friends wait on the highest platforms.','The Cloud Emperor is the final giant. I believe in you, Super Dog!']},
];
const box=(id,x,z,w,d,top,bottom=0,kind='ruin')=>({id,x,z,w,d,top,bottom,kind});
const cyl=(id,x,z,radius,bottom,top,color)=>({id,shape:'cylinder',x,z,radius,bottom,top,color});

// Every route uses the same mesh and collider data. The four new islands have
// individually authored jumping courses, rather than copies of the village.
const COURSES=[null,
 [[[-10,20,1.2],[-15,18,2.4],[-20,21,3.6],[-25,18,4.8],[-30,14,6]],[[14,12,1.2],[19,9,2.4],[24,12,3.6],[29,8,4.8],[34,4,6]],[[0,-10,1.2],[-4,-15,2.4],[0,-20,3.6],[4,-25,4.8],[0,-31,6]]],
 [[[-12,20,1.3],[-18,20,2.6],[-24,16,3.9],[-24,10,5.2],[-30,7,6.5]],[[13,17,1.3],[18,13,2.6],[18,7,3.9],[24,3,5.2],[30,0,6.5]],[[0,-9,1.3],[5,-14,2.6],[0,-19,3.9],[-5,-24,5.2],[0,-30,6.5]]],
 [[[-10,22,1.4],[-15,18,2.8],[-20,14,4.2],[-25,10,5.6],[-30,6,7]],[[13,20,1.4],[19,16,2.8],[25,12,4.2],[31,8,5.6],[35,2,7]],[[0,-8,1.4],[-5,-13,2.8],[-5,-19,4.2],[0,-24,5.6],[0,-31,7]]],
 [[[-11,23,1.5],[-16,18,3],[-21,13,4.5],[-26,8,6],[-31,2,7.5]],[[12,20,1.5],[17,15,3],[22,10,4.5],[27,5,6],[32,-1,7.5]],[[0,-9,1.5],[5,-14,3],[0,-19,4.5],[-5,-24,6],[0,-31,7.5]]],
];

// Two signature landmarks per later world, set in the empty southern corners so every route stays open.
const LANDMARKS=[[],
 [{id:'mushroom-tree',kind:'mushroom-tree',x:24,z:-24,radius:1.7},{id:'fairy-ring',kind:'fairy-ring',x:-26,z:-24,radius:4.2}],
 [{id:'ice-palace',kind:'ice-palace',x:24,z:-24,radius:4},{id:'crystal-garden',kind:'crystal-garden',x:-26,z:-24,radius:3}],
 [{id:'volcano',kind:'volcano',x:24,z:-25,radius:6},{id:'obsidian-arch',kind:'obsidian-arch',x:-26,z:-24,radius:3}],
 [{id:'castle-keep',kind:'castle-keep',x:24,z:-24,radius:4.4},{id:'rainbow-arch',kind:'rainbow-arch',x:-26,z:-24,radius:4.2}],
];
const ring=(n,r,a0=0)=>Array.from({length:n},(_,i)=>[Math.sin(a0+i*Math.PI*2/n)*r,Math.cos(a0+i*Math.PI*2/n)*r]);
export const CRYSTALS=[[0,0,4],[2.2,1.2,2.8],[-2,1.6,3.2],[1.4,-2.2,2.6],[-1.8,-1.8,3],[2.8,-.6,2.2],[-.4,2.8,2.4]];
function landmarkSolids(l){
 const {id,x,z}=l;
 if(l.kind==='mushroom-tree')return [cyl(`${id}-stem`,x,z,1.7,0,9)];
 if(l.kind==='fairy-ring')return ring(9,4.2).map(([dx,dz],i)=>cyl(`${id}-${i}`,x+dx,z+dz,.45,0,1.3));
 if(l.kind==='ice-palace')return [box(`${id}-keep`,x,z,5,5,9,0,'landmark'),box(`${id}-west`,x-4.2,z+1,2.4,2.4,6,0,'landmark'),box(`${id}-east`,x+4.2,z+1,2.4,2.4,6,0,'landmark')];
 if(l.kind==='crystal-garden')return CRYSTALS.map(([dx,dz,h],i)=>cyl(`${id}-${i}`,x+dx,z+dz,.55,0,h));
 if(l.kind==='volcano')return [cyl(`${id}-base`,x,z,6,0,4),cyl(`${id}-peak`,x,z,3.4,0,8.5)];
 if(l.kind==='obsidian-arch')return [box(`${id}-west`,x-2.6,z,1.2,1.2,5.4,0,'landmark'),box(`${id}-east`,x+2.6,z,1.2,1.2,5.4,0,'landmark'),box(`${id}-top`,x,z,6.6,1.3,5.6,4.5,'landmark')];
 if(l.kind==='castle-keep')return [box(`${id}-keep`,x,z,6,6,8,0,'landmark'),...ring(4,4.24,Math.PI/4).map(([dx,dz],i)=>cyl(`${id}-tower-${i}`,x+dx,z+dz,1.1,0,10))];
 return [cyl(`${id}-west`,x-4,z,.8,0,1.2),cyl(`${id}-east`,x+4,z,.8,0,1.2)];
}
// Bone Rush: twelve golden bones in a shape of their own around the starting meadow.
export const RUSH_REWARD=30,RUSH_TIME={easy:55,normal:42,hard:34};
function rushShape(index){const cx=0,cz=19.5;return Array.from({length:12},(_,i)=>{const t=i/12*Math.PI*2;let x,z;
 if(index===0){x=Math.sin(t)*6.5;z=Math.cos(t)*6.5;}
 else if(index===1){x=Math.sin(t)*6.5;z=Math.sin(2*t)*4;}
 else if(index===2){const r=i%2?3.4:6.5;x=Math.sin(t)*r;z=Math.cos(t)*r;}
 else if(index===3){const u=i/11,r=2+u*4.5,a=u*Math.PI*3;x=Math.sin(a)*r;z=Math.cos(a)*r;}
 else{const r=4.3+2.2*Math.cos(3*t);x=Math.sin(t)*r;z=Math.cos(t)*r;}
 return {id:`rush-${i}`,x:cx+x,y:.9,z:cz+z};});}
// Breadcrumb trails bend differently in every world: waves, zigzags, arcs, and quick ripples.
function trailOffset(index,t,i){return index===1?Math.sin(t*Math.PI*2)*1.6:index===2?(i%2?1.4:-1.4):index===3?Math.sin(t*Math.PI)*2.5:Math.sin(t*Math.PI*4)*1.2;}

export function createWorld(index=0){
 index=Number.isInteger(index)&&index>=0&&index<5?index:0;
 const meta=LEVELS[index];
 const world={...base,index,meta,HAZARDS:[],LANDMARKS:LANDMARKS[index],COURSES:COURSES[index],EGGS:eggNames[index].map((name,i)=>({id:`egg-${index}-${i}`,name,text:eggTexts[index][i],hint:i?'Explore the far shore behind the lighthouse.':'Look behind the trees on the southwest shore.',x:i?-43:-43,y:0,z:i?-29:34,kind:i?'crown':'book'}))};
 if(index){
  const platforms=base.PLATFORMS.filter(p=>['island','arena','bridge'].includes(p.kind)).map(p=>({...p}));
  const keys=[],friends=[],bones=[],stars=[],checkpoints=[{id:'home',...base.SPAWN}];
  for(const [routeIndex,course] of COURSES[index].entries()){
   course.forEach(([x,z,top],i)=>{
    platforms.push(box(`course-${routeIndex}-${i}`,x,z,i===4?7:4.2,i===4?7:4.2,top,index===1?0:Math.max(0,top-1.1),index===1?'mushroom':index===4?'float':'ruin'));
    if(i<4)bones.push({id:`bone-${bones.length}`,x,y:top+.85,z});
   });
   const [kx,kz,ky]=course[3],[fx,fz,fy]=course[4];
   keys.push({id:base.KEYS[routeIndex].id,x:kx,y:ky+.8,z:kz});
   friends.push({...base.FRIENDS[routeIndex],name:friendNames[index][routeIndex],x:fx,y:fy,z:fz});
   const [cx,cz]=course[0];checkpoints.push({id:['village','forest','sky'][routeIndex],x:cx+(routeIndex===0?5:routeIndex===1?-5:0),z:cz+(routeIndex===2?5:0),y:0});
   stars.push({id:`star-route-${routeIndex}`,x:fx+2.6,y:fy+.85,z:fz});
  }
  checkpoints.push({...base.CHECKPOINTS[4]});
  // Ground breadcrumbs stay clear of the courses and lead to each checkpoint.
  for(const [ax,az,bx,bz] of [[0,28,0,8],[-7,29,-35,29],[7,28,36,28],[-37,22,-37,-20],[40,20,40,-23],[0,-35,0,-42]]){
   // The offset is perpendicular to the trail and, for arcs, bows away from the island centre.
   const len=Math.hypot(bx-ax,bz-az),px=-(bz-az)/len,pz=(bx-ax)/len,out=px*(ax+bx)+pz*(az+bz)<0?-1:1;
   for(let i=0;i<7;i++){const t=i/6,o=trailOffset(index,t,i)*out;bones.push({id:`bone-${bones.length}`,x:ax+(bx-ax)*t+px*o,y:.85,z:az+(bz-az)*t+pz*o});}
  }
  // A ring of bones circles the first landmark, inviting a closer look.
  const [mark]=LANDMARKS[index];for(const [dx,dz] of ring(8,mark.radius+2.6,Math.PI/8))bones.push({id:`bone-${bones.length}`,x:mark.x+dx,y:.85,z:mark.z+dz});
  stars.push({id:'star-west',x:-43,y:.85,z:13},{id:'star-east',x:43,y:.85,z:-20},{id:'star-arena',x:12,y:2.05,z:-76});
  world.PLATFORMS=platforms;world.KEYS=keys;world.FRIENDS=friends;world.BONES=bones;world.STARS=stars;world.CHECKPOINTS=checkpoints;
  world.TREES=base.TREES.filter(t=>Math.abs(t.x)>40||t.z>36).map(t=>({...t,pine:index===2,scale:t.scale*(index===1?1.7:1)}));
  world.PROPS=base.PROPS.filter(p=>!p.id.startsWith('house')&&!p.id.startsWith('flag')).map(p=>({...p}));
  world.PROPS.push(...checkpoints.map(c=>cyl(`flag-${c.id}`,c.x-2,c.z,.075,c.y,c.y+3.2,0xa58052)));
  world.ENEMIES=[{id:'snake1',x:-20,z:28},{id:'snake2',x:20,z:28},{id:'snake3',x:36,z:-16},{id:'snake4',x:-36,z:-16},{id:'snake5',x:10,z:-37}];
  if(index===3)world.HAZARDS=[box('lava-west',-22,14,25,4,.08),box('lava-east',25,12,25,4,.08),box('lava-north',0,-20,19,4,.08)];
  if(index===2)world.ICE=[box('ice-west',-22,16,29,20,.025),box('ice-east',22,10,28,24,.025)];
  world.STATIC_SOLIDS=[...platforms.map(p=>p.kind==='mushroom'?{...p,bottom:p.top-.4}:p),base.STATIC_SOLIDS.find(s=>s.id==='beach'),...platforms.filter(p=>p.kind==='mushroom').map(p=>cyl(`${p.id}-stem`,p.x,p.z,.6,0,p.top-.4)),...world.TREES.map(t=>cyl(t.id,t.x,t.z,.28*t.scale,0,2.8*t.scale)),...world.PROPS,...LANDMARKS[index].flatMap(landmarkSolids),...base.STATIC_SOLIDS.filter(s=>s.id.startsWith('rock-'))];
  world.CAGE_SOLIDS=friends.map(f=>({...cyl(`cage-${f.id}`,f.x,f.z,1.5,f.y,f.y+2.72),friend:f.id}));
 }
 world.FRIENDS=world.FRIENDS.map((f,i)=>({...f,line:friendLines[index][i]}));
 world.NPCS=[{id:`guide-${index}`,...guides[index],lines:[...guides[index].lines,'See the glowing stone across the path? Press E on it for a Bone Rush race!'],x:4.5,y:0,z:27.5}];
 world.RUSH={x:-4.5,y:0,z:27.5,bones:rushShape(index)};
 world.solidsFor=rescued=>[...world.STATIC_SOLIDS,...world.CAGE_SOLIDS.filter(c=>!rescued.has(c.friend)),...(rescued.size<3?[base.CLOSED_GATE]:[])];
 return world;
}
