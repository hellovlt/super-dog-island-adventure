// Player settings: camera help, screen effects, volumes, and reading aloud.
export const SETTINGS_STORAGE='superdog-settings-v1';
export const FOLLOW={off:0,gentle:1.1,auto:2.6};
export const ZOOM={near:8,medium:11.5,far:15.5};
export const SUBTITLES={auto:'While someone speaks',always:'Also describe sounds',off:'Off'};
export const DEFAULTS={follow:'gentle',look:1,invertY:false,zoom:'medium',effects:true,music:.7,sfx:1,hints:true,shareDrawing:false,subtitles:'auto'};
const number=(v,min,max,fallback)=>Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
const choice=(v,options,fallback)=>Object.hasOwn(options,v)?v:fallback;

export function parseSettings(raw){
 let d=raw;if(typeof d==='string')try{d=JSON.parse(d);}catch{d=null;}
 if(!d||typeof d!=='object')return {...DEFAULTS};
 return {follow:choice(d.follow,FOLLOW,DEFAULTS.follow),look:number(d.look,.4,2,DEFAULTS.look),invertY:d.invertY===true,
  zoom:choice(d.zoom,ZOOM,DEFAULTS.zoom),effects:d.effects!==false,music:number(d.music,0,1,DEFAULTS.music),sfx:number(d.sfx,0,1,DEFAULTS.sfx),hints:d.hints!==false,shareDrawing:d.shareDrawing===true,subtitles:choice(d.subtitles,SUBTITLES,DEFAULTS.subtitles)};
}
// The camera sits behind the hero when its angle is the facing direction turned half way round.
export const behindYaw=facing=>facing-Math.PI;
export const wrapAngle=a=>{const t=(a+Math.PI)%(Math.PI*2);return (t<0?t+Math.PI*2:t)-Math.PI;};
// Eases the camera behind the hero while moving; returns the new angle.
export function followYaw(yaw,facing,strength,dt,moving=true){
 if(!strength||!moving||!Number.isFinite(dt)||dt<=0)return yaw;
 return yaw+wrapAngle(behindYaw(facing)-yaw)*(1-Math.exp(-strength*dt));
}
