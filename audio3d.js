// Music and sound effects synthesized with Web Audio: no audio files, nothing to download.
export const SOUND_STORAGE='superdog-sound';
const MAJOR=[0,2,4,7,9],MINOR=[0,3,5,7,10];
// One mood per world: key, tempo, instrument, and the chord roots the bass walks through.
export const WORLD_MUSIC=[
 {name:'Sunny Island',root:60,scale:MAJOR,bpm:112,lead:'triangle',chords:[0,9,5,7]},
 {name:'Mushroom Kingdom',root:65,scale:MAJOR,bpm:100,lead:'square',chords:[0,5,9,7]},
 {name:'Crystal Winter',root:57,scale:MINOR,bpm:84,lead:'sine',chords:[0,8,3,10]},
 {name:'Volcano Island',root:50,scale:MINOR,bpm:128,lead:'sawtooth',chords:[0,3,8,10]},
 {name:'Sky Castle',root:67,scale:MAJOR,bpm:96,lead:'triangle',chords:[0,4,9,5]},
];
function seeded(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}

// Eight bars in an A A' B A shape so the tune is catchy and loops without a seam. Steps are sixteenth notes.
export function musicPattern(level){
 const m=WORLD_MUSIC[level]??WORLD_MUSIC[0],rnd=seeded(level*9973+17),notes=[];
 const base=m.root<62?m.root+12:m.root,pitch=degree=>{const n=m.scale.length,d=((degree%n)+n)%n;return base+12*Math.floor(degree/n)+m.scale[d];};
 const motif=()=>{const out=[];let degree=Math.floor(rnd()*3)+2;for(let step=0;step<32;){const len=rnd()<.7?2:4;if(step%4!==0&&rnd()<.22){step+=2;continue;}degree=Math.max(0,Math.min(7,degree+[-2,-1,-1,1,1,2,0][Math.floor(rnd()*7)]));out.push({step,len,degree});step+=len;}return out;};
 const a=motif(),b=motif(),ending=motif().filter(n=>n.step>=16);
 const sections=[a,[...a.filter(n=>n.step<16),...ending],b.map(n=>({...n,degree:n.degree+2})),a];
 sections.forEach((section,i)=>{for(const n of section)notes.push({voice:'lead',step:i*32+n.step,len:n.len,midi:pitch(n.degree)});});
 for(let bar=0;bar<8;bar++){const root=m.root-24+m.chords[bar%4];for(const beat of [0,8])notes.push({voice:'bass',step:bar*16+beat,len:6,midi:root+(beat?7:0)});}
 return {bpm:m.bpm,lead:m.lead,steps:128,notes:notes.sort((x,y)=>x.step-y.step)};
}
export const midiToHz=midi=>440*2**((midi-69)/12);

function voice(ctx,out,{type='sine',freq,to,at,dur,vol=.2,attack=.008}){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);if(to)o.frequency.exponentialRampToValueAtTime(to,at+dur);
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vol,at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+dur);
 o.connect(g);g.connect(out);o.start(at);o.stop(at+dur+.02);
}
let noiseBuffer=null;
function noise(ctx,out,{at,dur,vol=.2,filter='bandpass',from=900,to=300,q=1.2}){
 if(!noiseBuffer||noiseBuffer.sampleRate!==ctx.sampleRate){noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*.5,ctx.sampleRate);const d=noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
 const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuffer;f.type=filter;f.Q.value=q;f.frequency.setValueAtTime(from,at);f.frequency.exponentialRampToValueAtTime(to,at+dur);
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(vol,at+.01);g.gain.exponentialRampToValueAtTime(.0001,at+dur);s.connect(f);f.connect(g);g.connect(out);s.start(at);s.stop(at+dur+.02);
}
const arpeggio=(ctx,out,at,freqs,gap=.07,type='triangle',vol=.14)=>freqs.forEach((f,i)=>voice(ctx,out,{type,freq:f,at:at+i*gap,dur:.22,vol}));

// Every gameplay event that should make a sound. `ratio` raises the pitch, e.g. for a bone streak.
export const SFX={
 coin:(c,o,t,r)=>{voice(c,o,{type:'sine',freq:988*r,at:t,dur:.09,vol:.12});voice(c,o,{type:'sine',freq:1319*r,at:t+.06,dur:.16,vol:.12});},
 key:(c,o,t)=>arpeggio(c,o,t,[784,988,1175,1568],.06),
 star:(c,o,t)=>{arpeggio(c,o,t,[1047,1319,1568,2093],.05,'sine',.12);noise(c,o,{at:t+.1,dur:.3,vol:.04,filter:'highpass',from:6000,to:9000});},
 jump:(c,o,t)=>voice(c,o,{type:'triangle',freq:300,to:620,at:t,dur:.14,vol:.12}),
 land:(c,o,t,r)=>{voice(c,o,{type:'sine',freq:140,to:55,at:t,dur:.12,vol:.18*r});noise(c,o,{at:t,dur:.09,vol:.05*r,filter:'lowpass',from:900,to:200});},
 bark:(c,o,t)=>{noise(c,o,{at:t,dur:.2,vol:.28,from:1100,to:380,q:2.2});voice(c,o,{type:'sawtooth',freq:260,to:110,at:t,dur:.17,vol:.08});},
 rushStart:(c,o,t)=>{voice(c,o,{type:'square',freq:880,at:t,dur:.12,vol:.06});voice(c,o,{type:'square',freq:880,at:t+.25,dur:.12,vol:.06});voice(c,o,{type:'square',freq:1320,at:t+.5,dur:.3,vol:.07});},
 rushWon:(c,o,t)=>{arpeggio(c,o,t,[659,784,988,1319],.08,'triangle',.12);arpeggio(c,o,t+.4,[1047,1319,1568,2093],.06,'sine',.09);},
 rushLost:(c,o,t)=>[660,560,470].forEach((f,i)=>voice(c,o,{type:'triangle',freq:f,at:t+i*.14,dur:.22,vol:.09})),
 talk:(c,o,t)=>[620,760,540,700].forEach((f,i)=>voice(c,o,{type:'triangle',freq:f,to:f*1.08,at:t+i*.065,dur:.06,vol:.07})),
 glide:(c,o,t)=>{noise(c,o,{at:t,dur:.5,vol:.07,filter:'lowpass',from:500,to:1400,q:.6});voice(c,o,{type:'sine',freq:520,to:780,at:t,dur:.3,vol:.05});},
 dash:(c,o,t)=>noise(c,o,{at:t,dur:.22,vol:.12,filter:'bandpass',from:600,to:3200,q:.8}),
 hurt:(c,o,t)=>{voice(c,o,{type:'square',freq:420,to:150,at:t,dur:.25,vol:.07});voice(c,o,{type:'square',freq:300,to:110,at:t+.08,dur:.22,vol:.06});},
 fall:(c,o,t)=>voice(c,o,{type:'triangle',freq:700,to:160,at:t,dur:.45,vol:.1}),
 enemy:(c,o,t)=>{voice(c,o,{type:'square',freq:660,to:1320,at:t,dur:.08,vol:.06});noise(c,o,{at:t,dur:.12,vol:.08,filter:'highpass',from:2000,to:5000});},
 rescue:(c,o,t)=>arpeggio(c,o,t,[523,659,784,1047,1319],.08),
 checkpoint:(c,o,t)=>{voice(c,o,{type:'sine',freq:880,at:t,dur:.5,vol:.1});voice(c,o,{type:'sine',freq:1320,at:t+.12,dur:.6,vol:.08});},
 secret:(c,o,t)=>arpeggio(c,o,t,[1047,1245,1568,1865,2093,2489],.05,'sine',.09),
 boss:(c,o,t)=>{voice(c,o,{type:'sawtooth',freq:110,to:55,at:t,dur:.7,vol:.09});noise(c,o,{at:t,dur:.6,vol:.08,filter:'lowpass',from:400,to:80});},
 bossHit:(c,o,t)=>{voice(c,o,{type:'sine',freq:180,to:60,at:t,dur:.25,vol:.22});noise(c,o,{at:t,dur:.18,vol:.12,from:1500,to:300});},
 dead:(c,o,t)=>[523,494,440,349].forEach((f,i)=>voice(c,o,{type:'triangle',freq:f,to:f*.97,at:t+i*.16,dur:.3,vol:.1})),
 won:(c,o,t)=>{arpeggio(c,o,t,[523,659,784,1047],.12,'square',.07);arpeggio(c,o,t+.5,[784,988,1175,1568],.09,'triangle',.12);voice(c,o,{type:'triangle',freq:1047,at:t+.9,dur:.8,vol:.12});},
};
export function playSfx(ctx,out,type,ratio=1){const play=SFX[type];if(play)play(ctx,out,ctx.currentTime+.005,ratio);}

// Loops the world's tune with a short look-ahead scheduler so timing stays steady even if a frame is late.
export function createMusic(ctx,out,level){
 const song=musicPattern(level),stepTime=60/song.bpm/4,bus=ctx.createGain();bus.gain.value=.55;bus.connect(out);
 let timer=null,nextStep=0,nextTime=0;
 const schedule=()=>{while(nextTime<ctx.currentTime+.25){const step=nextStep%song.steps;for(const n of song.notes)if(n.step===step){const bass=n.voice==='bass';voice(ctx,bus,{type:bass?'triangle':song.lead,freq:midiToHz(n.midi),at:nextTime,dur:n.len*stepTime*(bass?1:.9),vol:bass?.09:song.lead==='sawtooth'||song.lead==='square'?.035:.07,attack:bass?.02:.012});}nextStep++;nextTime+=stepTime;}};
 return {
  setVolume(v){bus.gain.value=Math.max(0,Math.min(1,Number.isFinite(v)?v:.7))*.55;},
  start(){if(timer)return;nextTime=ctx.currentTime+.1;timer=setInterval(schedule,40);schedule();},
  stop(){clearInterval(timer);timer=null;},
  get playing(){return !!timer;}
 };
}
