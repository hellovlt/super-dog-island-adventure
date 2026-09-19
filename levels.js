export const GROUND = 520;
export const WORLDS = [
  { name:'Forest Trail',theme:'forest',icon:'♣',length:6200,friend:'Peach the Kitten',description:'Forest hideaways and a lost kitten.',story:'The Snake King captured your friends! Peach is somewhere in the forest. Bark to open the cage, then find the portal.',color:'#70935e' },
  { name:'Snake Town',theme:'town',icon:'⌂',length:6500,friend:'Donut the Bunny',description:'Rooftops, springs, and snake patrols.',story:'Donut is hidden among the rooftops! Golden stars point the way to secrets. The cave entrance lies ahead.',color:'#b49a6a' },
  { name:'Crystal Caves',theme:'cave',icon:'◆',length:6100,friend:'Spark the Fox',description:'Crystals and a stone guardian.',story:'Spark needs help in the caves. Ride the moving platforms and face the Crystal Guardian at the exit!',color:'#9382ba' },
  { name:'Cloud Islands',theme:'sky',icon:'☁',length:6000,friend:'Fluff the Owl',description:'Sky trails and double jumps.',story:'Fluff is lost in the clouds. Double jump and dash to reach distant platforms.',color:'#73aac1' },
  { name:'Fire Valley',theme:'lava',icon:'♨',length:6400,friend:'Bagel the Puppy',description:'Lava, fire bugs, and the final portal.',story:'Bagel is close to the castle! A shield can block a hit. Double jump and dash over the lava.',color:'#c47d66' },
  { name:'Snake King Castle',theme:'castle',icon:'♛',length:2400,description:'The final battle and a reunion with friends.',story:'The castle at last! Watch for attack warnings. Super bark destroys venom balls and defeats the king.',color:'#708d82' },
];
export const WORLD_NAMES=WORLDS.map(w=>w.name);
export function makeLevel(index){
  if(!Number.isInteger(index)||!WORLDS[index])throw new RangeError('Unknown world');
  const world=WORLDS[index],length=world.length;let gaps,ledges;
  if(index===0){
    gaps=[[860,1000],[1820,1970],[3040,3200],[4450,4620],[5370,5530]];
    ledges=[[410,410,170],[730,345,155],[1170,408,200],[1510,330,165],[2110,402,170],[2440,326,185],[2810,406,150],[3330,400,180],[3670,335,170],[4050,410,180],[4320,325,160],[4770,405,180],[5090,322,185],[5670,405,180]];
  }else if(index===1){
    gaps=[[720,880],[1700,1870],[2710,2870],[3650,3820],[4740,4910],[5630,5800]];
    ledges=[[360,408,155],[670,337,140],[1020,413,175],[1390,330,170],[1990,405,190],[2340,326,160],[2950,400,180],[3290,329,190],[3860,410,180],[4160,337,170],[4480,405,170],[5050,405,200],[5370,325,170],[5920,402,180]];
  }else if(index===5){gaps=[];ledges=[[380,410,175],[700,325,170],[1040,405,180],[1480,410,180],[1780,325,180]];}
  else{gaps=[];ledges=[];for(let part=0;part<5;part++){const base=part*1100;gaps.push([base+760,base+930]);ledges.push([base+320,410,180],[base+610,325,180],[base+990,410,160]);}}
  const platforms=[];let start=0;
  for(const [left,right] of [...gaps,[length,length]]){platforms.push({x:start,y:GROUND,w:left-start,h:250,ground:true});start=right;}
  ledges.forEach(([x,y,w],i)=>platforms.push({x,y,w,h:27,ground:false,...(index>=2&&index<5&&i%3===1?{moving:true,home:x,range:55,speed:.9,phase:i,dx:0}:{})}));
  const bones=[];
  ledges.forEach(([x,y,w],i)=>{for(let j=0;j<3;j++)bones.push({x:x+24+j*(w-48)/2,y:y-38,id:`${index}-bone-${i}-${j}`});});
  for(let x=230;x<length-220;x+=260)if(!gaps.some(([a,b])=>x>a-25&&x<b+25))bones.push({x,y:480,id:`${index}-trail-${x}`});
  const enemies=[];
  if(index!==5)for(let x=600,i=0;x<length-380;x+=560,i++){
    if(gaps.some(([a,b])=>x>a-110&&x<b+110))continue;
    const kind=index>=2&&i%3===1?'flyer':index===4?'beetle':'snake';
    enemies.push({x,y:kind==='flyer'?388:GROUND-31,w:52,h:31,home:x,baseY:388,dir:i%2?1:-1,speed:56+index*8,kind,alive:true,phase:i});
  }
  const checkpoints=index===0?[1430,2910,4650]:index===1?[1430,2910,4930]:index===5?[1100]:[1150,2250,3350,4900];
  const stars=[0,1,2].map(n=>{const ledge=ledges[Math.min(ledges.length-1,1+n*Math.floor(ledges.length/3))];return{id:`${index}-star-${n}`,kind:'star',x:ledge[0]+ledge[2]/2,y:ledge[1]-85,w:26,h:26};});
  const pickups=[];
  const placements=index===5?[{x:210,kind:'shield'},{x:1250,kind:'heart'}]:[{x:270,kind:'magnet'},{x:1300,kind:'shield'},{x:2450,kind:'heart'},{x:4010,kind:'power'},{x:5100,kind:'heart'}];
  placements.forEach((p,i)=>{if(!gaps.some(([a,b])=>p.x>a-20&&p.x<b+20))pickups.push({...p,y:477,w:28,h:28,id:`${index}-power-${i}`});});
  const chests=index===5?[]:[0,1,2].map(n=>({x:[1090,3500,length-450][n],y:483,w:44,h:37,id:`${index}-chest-${n}`,opened:false}));
  for(const c of chests)if(gaps.some(([a,b])=>c.x>a-45&&c.x<b))c.x+=250;
  const rescueLedge=ledges[Math.floor(ledges.length*.6)];
  const friend=index===5?null:{x:rescueLedge[0]+40,y:rescueLedge[1]-65,w:58,h:65,id:`${index}-friend`,name:world.friend,rescued:false,kind:index};
  const springs=index===5?[]:[{x:340,y:504,w:38,h:16},{x:ledges[Math.min(10,ledges.length-1)][0]-70,y:504,w:38,h:16}].filter(s=>!gaps.some(([a,b])=>s.x+s.w>a&&s.x<b)&&!enemies.some(e=>Math.abs(e.home-s.x)<130));
  const boss=index===2||index===5?{x:length-360,home:length-360,y:384,w:140,h:136,hp:index===2?6:12,maxHp:index===2?6:12,invuln:0,timer:2.5,phase:0,attack:0,kind:index===2?'guardian':'king',name:index===2?'Crystal Guardian':'Snake King'}:null;
  return{...world,platforms,bones,enemies,checkpoints,exit:length-180,stars,pickups,chests,friend,springs,boss};
}
export const TOTAL_BONES=WORLDS.reduce((sum,_,i)=>sum+makeLevel(i).bones.length+makeLevel(i).chests.length*5,0);
export const TOTAL_STARS=WORLDS.length*3;
