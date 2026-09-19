import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const cached=()=>[...read('sw.js').matchAll(/'\.\/([^']*)'/g)].map(m=>m[1]);

test('the installable app describes itself and ships the icons it promises',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
 assert.ok(manifest.name&&manifest.short_name.length<=12);assert.match(manifest.theme_color,/^#[0-9a-f]{6}$/);
 assert.ok(manifest.icons.some(i=>i.purpose==='maskable'),'a maskable icon for Android');
 for(const icon of manifest.icons){const file=icon.src.replace('./','');assert.ok(existsSync(new URL('../'+file,import.meta.url)),`${file} exists`);
  const png=readFileSync(new URL('../'+file,import.meta.url));assert.equal(png.toString('ascii',1,4),'PNG',`${file} is a PNG`);
  const [w,h]=[png.readUInt32BE(16),png.readUInt32BE(20)];assert.equal(`${w}x${h}`,icon.sizes,`${file} is really ${icon.sizes}`);}
 const html=read('index.html');assert.match(html,/rel="manifest"/);assert.match(html,/serviceWorker/);
});
test('everything the page loads is cached for offline play',()=>{
 const list=cached(),html=read('index.html');
 for(const file of ['index.html','style3d.css','favicon.svg','manifest.webmanifest'])assert.ok(list.includes(file),`${file} is cached`);
 // Follow the module graph from the page and require every file on the way.
 const seen=new Set(),queue=[...html.matchAll(/src="\.\/([^"]+\.m?js)"/g)].map(m=>m[1]);
 while(queue.length){const file=queue.pop();if(seen.has(file))continue;seen.add(file);
  assert.ok(list.includes(file),`${file} is imported but not cached for offline play`);
  const dir=file.includes('/')?file.slice(0,file.lastIndexOf('/')+1):'';
  for(const m of read(file).matchAll(/from\s*['"]\.\/([^'"]+\.m?js)['"]/g))queue.push((dir+m[1]).replace(/^\.\//,''));}
 assert.ok(seen.size>=10,`followed the whole module graph, saw ${seen.size}`);
 for(const file of list)if(file&&!file.endsWith('/'))assert.ok(existsSync(new URL('../'+file,import.meta.url)),`cached ${file} exists`);
});
