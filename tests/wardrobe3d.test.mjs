import test from 'node:test';
import assert from 'node:assert/strict';
import {Adventure3D} from '../adventure3d.js';
import {normalizeWardrobe,wornItem,itemById,WARDROBE,SLOTS,spentBones} from '../wardrobe3d.js';
const withBones=(n,level=0)=>{const g=new Adventure3D(null,{level});g.start();for(const b of g.world.BONES.slice(0,n))g.collected.add(b.id);return g;};
test('bones from every world add up and buying spends them',()=>{
 const g=withBones(30);assert.equal(g.bonesEarned,30);assert.equal(g.bonesAvailable,30);
 assert.equal(g.buy('cape-sky').ok,true);assert.equal(g.bonesAvailable,10);assert.equal(g.wardrobe.wearing.cape,'cape-sky');
 const r=g.buy('hat-wizard');assert.equal(r.ok,false);assert.match(r.reason,/60 more bones/);assert.equal(g.buy('cape-sky').ok,false);
 const next=new Adventure3D({...g.snapshot()});assert.equal(next.bonesEarned,30);assert.equal(next.bonesAvailable,10);assert.equal(next.wardrobe.wearing.cape,'cape-sky');
 const other=g.snapshot();other.progress[1]={version:3,collected:['bone-0','bone-1','bone-1','village-key','bone-999'],rescued:[]};assert.equal(new Adventure3D(other).bonesEarned,32);
});
test('a tampered save cannot create bones or free items',()=>{
 const g=new Adventure3D({version:4,level:0,progress:{0:{version:3,collected:['bone-0']}},wardrobe:{owned:['hat-wizard','hat-crown','invented','cape-classic'],wearing:{hat:'hat-wizard',cape:'fur-snow'},spent:-500}});
 assert.deepEqual(g.wardrobe.owned,['hat-wizard']);assert.equal(g.bonesEarned,1);assert.equal(g.bonesAvailable,0);assert.equal(g.wardrobe.wearing.cape,undefined);
 assert.equal(spentBones(normalizeWardrobe({owned:['cape-gold','cape-gold']})),60);
});
test('secret hats come from secrets, default hats keep earlier rewards, and every item fits its slot',()=>{
 const w=normalizeWardrobe(null);assert.equal(wornItem(w,'hat').id,'hat-none');assert.equal(wornItem(w,'hat',new Set(['egg-0-1'])).id,'hat-antenna');assert.equal(wornItem(w,'hat',new Set(['egg-0-1','egg-4-1'])).id,'hat-crown');
 const g=withBones(0);assert.equal(g.wear('hat-crown').ok,false);g.secrets.add('egg-4-1');assert.equal(g.wear('hat-crown').ok,true);assert.equal(g.buy('hat-crown').ok,false);
 for(const slot of SLOTS){assert.equal(WARDROBE[slot][0].price,0,`${slot} has a free default`);for(const item of WARDROBE[slot])assert.equal(itemById(item.id).slot,slot);}
});
test('starting a new adventure keeps bought clothes, best times, and the difficulty',()=>{
 const g=new Adventure3D(null,{difficulty:'easy'});g.start();
 for(const b of g.world.BONES.slice(0,40))g.collected.add(b.id);
 assert.equal(g.buy('cape-royal').ok,true);g.challenges[0]={best:21.3};g.secrets.add('egg-0-0');
 for(const f of g.world.FRIENDS)g.rescued.add(f.id);
 const after=new Adventure3D(g.freshStart());
 assert.deepEqual(after.wardrobe.owned,['cape-royal'],'the cape they bought is still theirs');
 assert.equal(after.wardrobe.wearing.cape,'cape-royal');assert.deepEqual(after.challenges,{0:{best:21.3}});
 assert.equal(after.difficulty,'easy','the difficulty a grown-up chose survives');
 assert.equal(after.rescued.size,0);assert.equal(after.boneCount,0);assert.equal(after.secrets.size,0,'the adventure itself starts fresh');
 assert.equal(after.bonesAvailable,0,'and the bones are spent, not refunded');
});
