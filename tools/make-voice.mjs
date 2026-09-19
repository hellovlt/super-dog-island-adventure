// Records every spoken line with ElevenLabs and writes them into assets/voice/.
// Run it after changing any spoken text:  node tools/make-voice.mjs  (add --force to redo everything)
// The key is read from the environment or ~/.elevenlabs/key.env and never written into the project.
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {voiceInventory} from './voice-lines.mjs';

const VOICE_ID='cgSgspJ2msm6clMCkdW9',VOICE_NAME='Jessica',MODEL='eleven_multilingual_v2';
const SETTINGS={stability:.45,similarity_boost:.75,style:.35,use_speaker_boost:true};
const out=new URL('../assets/voice/',import.meta.url),manifestPath=new URL('manifest.json',out);
const hash=text=>createHash('sha256').update(text).digest('hex').slice(0,16);

async function apiKey(){
 if(process.env.ELEVENLABS_API_KEY)return process.env.ELEVENLABS_API_KEY.trim();
 const file=join(homedir(),'.elevenlabs','key.env');
 if(!existsSync(file))throw new Error('No ELEVENLABS_API_KEY in the environment or ~/.elevenlabs/key.env');
 return (await readFile(file,'utf8')).split('\n').find(l=>l.startsWith('ELEVENLABS_API_KEY='))?.split('=')[1]?.trim();
}
const speak=async(key,text)=>{
 const response=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`,
  {method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json'},
   body:JSON.stringify({text,model_id:MODEL,voice_settings:SETTINGS})});
 if(!response.ok)throw new Error(`${response.status} ${(await response.text()).slice(0,140)}`);
 const audio=Buffer.from(await response.arrayBuffer());
 if(audio.subarray(0,3).toString()!=='ID3'&&audio[0]!==0xff)throw new Error('the service did not return an mp3');
 return audio;
};

const force=process.argv.includes('--force');
await mkdir(out,{recursive:true});
const previous=existsSync(manifestPath)?JSON.parse(await readFile(manifestPath,'utf8')):{lines:{}};
const lines=voiceInventory(),manifest={voice:VOICE_NAME,voiceId:VOICE_ID,model:MODEL,recorded:new Date().toISOString().slice(0,10),lines:{}};
let spoken=0,kept=0,characters=0;
const key=await apiKey();
for(const line of lines){
 const file=`${line.id}.mp3`,stamp=hash(line.text),old=previous.lines?.[line.id];
 const fresh=!force&&old?.hash===stamp&&existsSync(new URL(file,out));
 if(fresh)kept++;
 else{
  process.stdout.write(`recording ${line.id} (${line.text.length} chars) … `);
  await writeFile(new URL(file,out),await speak(key,line.text));
  characters+=line.text.length;spoken++;console.log('done');
  await new Promise(r=>setTimeout(r,250));
 }
 manifest.lines[line.id]={file,hash:stamp,text:line.text,about:line.about};
}
await writeFile(manifestPath,JSON.stringify(manifest,null,1)+'\n');
console.log(`\n${spoken} recorded, ${kept} already current, ${characters} characters used. Voice: ${VOICE_NAME}.`);
