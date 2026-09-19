// Spoken lines: recorded ahead of time (see tools/make-voice.mjs) and played from files, so the
// published game needs no speech service, no key, and no network. Subtitles carry the same words.
// Resolved against this module, not the page, so recordings load from test pages in sub-folders too.
export const VOICE_DIR=new URL('./assets/voice/',import.meta.url).href;
export const lineId={
 story:id=>id,
 guide:(level,index)=>`guide-${level}-${index}`,
 friend:(level,index)=>`friend-${level}-${index}`,
 ui:name=>`ui-${name}`,
};
// Short captions for sounds that carry meaning, for players who cannot hear them.
export const SOUND_CAPTIONS={
 bark:'Woof!',checkpoint:'Checkpoint chime',rescue:'Friend rescued!',secret:'Secret sparkle',
 coin:'Bone collected',key:'Key found',star:'Star found',hurt:'Ouch!',dead:'Oh no…',fall:'Splash!',
 boss:'The giant roars',bossHit:'Thud! The giant is hit',won:'Victory fanfare',enemy:'The snake runs away',
 rushStart:'Ready… go!',rushWon:'Bone Rush finished!',rushLost:'Time is up',glide:'Whoosh',dash:'Dash!',land:'Thump',jump:'Boing',talk:'Chatter',
};
export const captionForSound=type=>SOUND_CAPTIONS[type]??null;

export function parseManifest(raw){
 const data=typeof raw==='string'?(()=>{try{return JSON.parse(raw);}catch{return null;}})():raw;
 if(!data||typeof data!=='object'||!data.lines||typeof data.lines!=='object')return {voice:null,lines:{}};
 const lines={};
 for(const [id,entry] of Object.entries(data.lines))
  if(entry&&typeof entry.file==='string'&&/^[\w.-]+\.mp3$/.test(entry.file)&&typeof entry.text==='string')lines[id]={file:entry.file,text:entry.text};
 return {voice:typeof data.voice==='string'?data.voice:null,lines};
}
// Plays a recorded line when there is one, otherwise falls back to the browser's own voice.
export function createVoice({manifest={lines:{}},onCaption,enabled=()=>true,volume=()=>1}={}){
 let current=null;
 const stop=()=>{if(current){current.pause();current=null;}
  if(typeof speechSynthesis!=='undefined')try{speechSynthesis.cancel();}catch{}};
 return {
  stop,
  has:id=>!!manifest.lines[id],
  // `force` is for a button the player pressed on purpose, such as "Read it to me".
  speak(id,text,{force=false}={}){
   const line=id&&manifest.lines[id],words=text??line?.text??'';
   onCaption?.(words);
   if((!enabled()&&!force)||!words)return false;
   stop();
   if(line){
    const audio=new Audio(VOICE_DIR+line.file);audio.volume=Math.max(0,Math.min(1,volume()));
    audio.onended=()=>{if(current===audio)current=null;};
    audio.play().catch(()=>{});current=audio;return true;
   }
   if(typeof speechSynthesis==='undefined')return false;
   const utterance=new SpeechSynthesisUtterance(words.replace(/[◆★✧]/g,''));
   utterance.lang='en-US';utterance.rate=.95;utterance.pitch=1.15;
   try{speechSynthesis.speak(utterance);}catch{}
   return true;
  },
 };
}
