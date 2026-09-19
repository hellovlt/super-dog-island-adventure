// The dog house wardrobe: bones from every world buy capes, hats, and fur colors.
// Spending is derived from what is owned, so a save can never hold more bones than were collected.
export const SLOTS=['cape','hat','fur'];
export const SLOT_NAMES={cape:'Capes',hat:'Hats',fur:'Fur'};
export const WARDROBE={
 cape:[
  {id:'cape-classic',name:'Classic red',price:0,color:0xe87862},
  {id:'cape-sky',name:'Sky blue',price:20,color:0x5aa7d8},
  {id:'cape-leaf',name:'Leaf green',price:20,color:0x5eb36b},
  {id:'cape-royal',name:'Royal purple',price:35,color:0x8a5cc2},
  {id:'cape-gold',name:'Golden',price:60,color:0xf2c14e},
  {id:'cape-night',name:'Starry night',price:80,color:0x33416e},
 ],
 hat:[
  {id:'hat-none',name:'No hat',price:0},
  {id:'hat-party',name:'Party hat',price:25},
  {id:'hat-cowboy',name:'Cowboy hat',price:40},
  {id:'hat-chef',name:'Chef hat',price:45},
  {id:'hat-pirate',name:'Pirate hat',price:50},
  {id:'hat-wizard',name:'Wizard hat',price:70},
  {id:'hat-antenna',name:'Star antenna',secret:'egg-0-1'},
  {id:'hat-crown',name:'Crown',secret:'egg-4-1'},
 ],
 fur:[
  {id:'fur-honey',name:'Honey',price:0,body:0xd8a667,head:0xf3d6a3},
  {id:'fur-ginger',name:'Ginger',price:30,body:0xe08a3c,head:0xf6c08a},
  {id:'fur-snow',name:'Snow',price:30,body:0xefe9dd,head:0xfffaf0},
  {id:'fur-cocoa',name:'Cocoa',price:35,body:0x8b5a3c,head:0xc49068},
  {id:'fur-midnight',name:'Midnight',price:45,body:0x4d4d5c,head:0x8a8a9c},
 ],
};
const ALL=SLOTS.flatMap(slot=>WARDROBE[slot].map(item=>({...item,slot})));
export const itemById=id=>ALL.find(item=>item.id===id)||null;
const buyable=id=>{const item=itemById(id);return !!item&&item.price>0;};

export function normalizeWardrobe(raw){
 const owned=[...new Set(Array.isArray(raw?.owned)?raw.owned.filter(buyable):[])];
 const wearing={};
 for(const slot of SLOTS){const id=raw?.wearing?.[slot],item=itemById(id);if(item&&item.slot===slot)wearing[slot]=id;}
 return {owned,wearing};
}
export const spentBones=w=>w.owned.reduce((sum,id)=>sum+itemById(id).price,0);
export function owns(w,id,secrets=new Set()){const item=itemById(id);if(!item)return false;if(item.secret)return secrets.has(item.secret);return item.price===0||w.owned.includes(id);}
// Players who never chose a hat keep the secret rewards they earned, best one first.
export function wornItem(w,slot,secrets=new Set()){
 const id=w.wearing[slot];if(id&&owns(w,id,secrets))return itemById(id);
 if(slot==='hat')return itemById(secrets.has('egg-4-1')?'hat-crown':secrets.has('egg-0-1')?'hat-antenna':'hat-none');
 return {...WARDROBE[slot][0],slot};
}
export function buyItem(w,id,available){
 const item=itemById(id);
 if(!item||item.secret)return {ok:false,reason:'This item is found through a secret.'};
 if(owns(w,id))return {ok:false,reason:'Already yours.'};
 if(available<item.price)return {ok:false,reason:`You need ${item.price-available} more bones.`};
 return {ok:true,wardrobe:{owned:[...w.owned,id],wearing:{...w.wearing,[item.slot]:id}}};
}
export function wearItem(w,id,secrets=new Set()){
 const item=itemById(id);if(!item||!owns(w,id,secrets))return {ok:false,reason:'Not yours yet.'};
 return {ok:true,wardrobe:{owned:w.owned,wearing:{...w.wearing,[item.slot]:id}}};
}
