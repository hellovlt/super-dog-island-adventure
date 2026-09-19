// Draw your own: a child's drawing becomes a sticker on Super Dog's cape and the checkpoint flags.
export const DRAWING_STORAGE='superdog-drawing-v1',PAD_SIZE=256,MAX_IMAGE_LENGTH=400000;
export const CRAYONS=[['Night','#2f3b36'],['Cherry','#e2574c'],['Sunny','#f6c343'],['Leaf','#4fa35a'],['Sky','#3f8fd2'],['Grape','#8a5cc2'],['Candy','#f28bb3'],['Cocoa','#8b5a3c']];
export const BRUSHES=[['Thin',5],['Medium',11],['Thick',22]];

export function parseDrawing(raw){
 try{const d=typeof raw==='string'?JSON.parse(raw):raw;
  if(!d||typeof d.image!=='string'||!d.image.startsWith('data:image/png;base64,')||d.image.length>MAX_IMAGE_LENGTH)return null;
  return {image:d.image,cape:d.cape!==false,flags:d.flags!==false};
 }catch{return null;}
}
// Crop the middle of a photo so it fills a square without stretching.
export function coverRect(sw,sh,dw,dh){const s=Math.max(dw/sw,dh/sh),w=dw/s,h=dh/s;return {sx:(sw-w)/2,sy:(sh-h)/2,sw:w,sh:h};}
// Fit the whole drawing inside a surface of another shape, with a margin.
export function containRect(sw,sh,dw,dh,pad=0){const s=Math.min((dw-pad*2)/sw,(dh-pad*2)/sh),w=sw*s,h=sh*s;return {x:(dw-w)/2,y:(dh-h)/2,w,h};}
// Paper is the brightest common tone in a photo; greyish pixels near it turn transparent so only the lines stay.
export function knockOutPaper(data){
 const hist=new Array(256).fill(0),n=data.length/4;
 for(let i=0;i<data.length;i+=4)hist[Math.round(.299*data[i]+.587*data[i+1]+.114*data[i+2])]++;
 let paper=255;for(let seen=0,v=0;v<256;v++){seen+=hist[v];if(seen>=n*.6){paper=v;break;}}
 const cutoff=paper*.8,soft=25;let kept=0;
 for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2],lum=.299*r+.587*g+.114*b,grey=Math.max(r,g,b)-Math.min(r,g,b)<60;
  if(grey&&lum>=cutoff)data[i+3]=0;
  else if(grey&&lum>cutoff-soft)data[i+3]=Math.round(data[i+3]*(cutoff-lum)/soft);
  if(data[i+3]>24)kept++;
 }
 return kept;
}
// The smallest box around the ink, so a small doodle still fills the cape.
export function inkBounds(data,width,height,pad=6){
 let x0=width,y0=height,x1=-1,y1=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>24){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
 if(x1<0)return {x:0,y:0,w:width,h:height};
 x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(width-1,x1+pad);y1=Math.min(height-1,y1+pad);return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
}
export function hasInk(data){for(let i=3;i<data.length;i+=4)if(data[i]>24)return true;return false;}

// A colored surface with the drawing centered on it, ready for a CanvasTexture.
export function stickerCanvas(image,width,height,background,margin=.1){
 const probe=document.createElement('canvas');probe.width=image.width;probe.height=image.height;const p=probe.getContext('2d',{willReadFrequently:true});p.drawImage(image,0,0);
 const ink=inkBounds(p.getImageData(0,0,image.width,image.height).data,image.width,image.height);
 const c=document.createElement('canvas');c.width=width;c.height=height;const g=c.getContext('2d');
 g.fillStyle=background;g.fillRect(0,0,width,height);
 const r=containRect(ink.w,ink.h,width,height,Math.min(width,height)*margin);g.drawImage(image,ink.x,ink.y,ink.w,ink.h,r.x,r.y,r.w,r.h);return c;
}

export const studioMarkup=hasDrawing=>`<p>Draw anything you like. It goes on Super Dog’s cape and the golden flags.</p>
<div class="studio"><canvas class="pad" width="${PAD_SIZE}" height="${PAD_SIZE}" aria-label="Drawing paper"></canvas>
<div class="crayons" aria-label="Crayons">${CRAYONS.map(([name,color],i)=>`<button type="button" data-color="${color}" aria-label="${name} crayon" aria-pressed="${i===0}" style="background:${color}"></button>`).join('')}</div>
<div class="studio-tools">${BRUSHES.map(([name,size],i)=>`<button type="button" data-brush="${size}" aria-label="${name} brush" aria-pressed="${i===1}"><span class="brush-dot" style="width:${4+i*5}px;height:${4+i*5}px"></span></button>`).join('')}<button type="button" data-tool="eraser" aria-pressed="false">Eraser</button><button type="button" data-tool="undo">Undo</button><button type="button" data-tool="clear">Clear</button><label class="photo-button" tabindex="0" role="button">Use a photo<input type="file" accept="image/*" hidden></label></div>
<div class="studio-where"><label><input type="checkbox" name="cape" checked> On my cape</label><label><input type="checkbox" name="flags" checked> On the flags</label></div>
${hasDrawing?'<button type="button" class="text-button" data-tool="remove">Remove my drawing</button>':''}</div>`;

// Wires the studio markup inside `root`. Returns what the save button needs.
export function mountStudio(root,current,{onRemove}={}){
 const pad=root.querySelector('.pad'),g=pad.getContext('2d',{willReadFrequently:true}),undo=[];
 let color=CRAYONS[0][1],size=BRUSHES[1][1],eraser=false,stroke=null;
 const where=name=>root.querySelector(`input[name="${name}"]`);
 if(current){where('cape').checked=current.cape;where('flags').checked=current.flags;const img=new Image();img.onload=()=>g.drawImage(img,0,0,PAD_SIZE,PAD_SIZE);img.src=current.image;}
 const remember=()=>{undo.push(g.getImageData(0,0,PAD_SIZE,PAD_SIZE));if(undo.length>20)undo.shift();};
 const press=(selector,button)=>{for(const b of root.querySelectorAll(selector))b.setAttribute('aria-pressed',String(b===button));};
 const point=e=>{const r=pad.getBoundingClientRect();return [(e.clientX-r.left)*PAD_SIZE/r.width,(e.clientY-r.top)*PAD_SIZE/r.height];};
 const line=(a,b)=>{g.globalCompositeOperation=eraser?'destination-out':'source-over';g.strokeStyle=color;g.lineWidth=eraser?size*1.6:size;g.lineCap=g.lineJoin='round';g.beginPath();g.moveTo(...a);g.lineTo(...b);g.stroke();};
 pad.addEventListener('pointerdown',e=>{e.preventDefault();pad.setPointerCapture(e.pointerId);remember();stroke={id:e.pointerId,at:point(e)};line(stroke.at,stroke.at);});
 pad.addEventListener('pointermove',e=>{if(stroke?.id!==e.pointerId)return;const at=point(e);line(stroke.at,at);stroke.at=at;});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(name,()=>stroke=null);
 for(const b of root.querySelectorAll('[data-color]'))b.onclick=()=>{color=b.dataset.color;eraser=false;press('[data-color]',b);root.querySelector('[data-tool="eraser"]').setAttribute('aria-pressed','false');};
 for(const b of root.querySelectorAll('[data-brush]'))b.onclick=()=>{size=Number(b.dataset.brush);press('[data-brush]',b);};
 root.querySelector('[data-tool="eraser"]').onclick=e=>{eraser=!eraser;e.currentTarget.setAttribute('aria-pressed',String(eraser));};
 root.querySelector('[data-tool="undo"]').onclick=()=>{const last=undo.pop();if(last)g.putImageData(last,0,0);};
 root.querySelector('[data-tool="clear"]').onclick=()=>{remember();g.clearRect(0,0,PAD_SIZE,PAD_SIZE);};
 const remove=root.querySelector('[data-tool="remove"]');if(remove)remove.onclick=()=>onRemove?.();
 const photo=root.querySelector('.photo-button');photo.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();photo.querySelector('input').click();}};
 photo.querySelector('input').onchange=e=>{
  const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{remember();const r=coverRect(img.naturalWidth,img.naturalHeight,PAD_SIZE,PAD_SIZE);g.globalCompositeOperation='source-over';g.clearRect(0,0,PAD_SIZE,PAD_SIZE);g.drawImage(img,r.sx,r.sy,r.sw,r.sh,0,0,PAD_SIZE,PAD_SIZE);const pixels=g.getImageData(0,0,PAD_SIZE,PAD_SIZE);knockOutPaper(pixels.data);g.putImageData(pixels,0,0);URL.revokeObjectURL(url);};
  img.onerror=()=>URL.revokeObjectURL(url);img.src=url;e.target.value='';
 };
 return {
  result(){const data=g.getImageData(0,0,PAD_SIZE,PAD_SIZE).data;if(!hasInk(data))return null;return {image:pad.toDataURL('image/png'),cape:where('cape').checked,flags:where('flags').checked};}
 };
}
