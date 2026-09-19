import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('every directly referenced UI element exists in the page',()=>{
 const script=readFileSync(new URL('../game.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../classic/index.html',import.meta.url),'utf8');
 for(const [,id]of script.matchAll(/\$\('([^']+)'\)/g))assert.ok(html.includes(`id="${id}"`),`Missing UI element: ${id}`);
 assert.ok(!html.includes('????'),'Russian text must survive file encoding');
});
test('every shared constant the 3D page uses is imported, so no world fails to load',async()=>{
 const js=readFileSync(new URL('../game3d.js',import.meta.url),'utf8'),exported=Object.keys(await import('../adventure3d.js'));
 const imports=[...js.matchAll(/^import \{([^}]+)\} from/gm)].flatMap(m=>m[1].split(',').map(s=>s.trim())),fromWorld=js.match(/const \{([^}]+)\}=game\.world/)?.[1].split(',')??[];
 const words=new Set(js.match(/[A-Za-z_$][\w$]*/g)),constants=exported.filter(n=>/^[A-Z][A-Z_]+$/.test(n)&&words.has(n));
 assert.ok(constants.length>3,'the check sees the constants game3d.js uses');
 for(const name of constants)assert.ok(imports.includes(name)||fromWorld.includes(name)||js.includes('game.world.'+name),`${name} is used by game3d.js but never imported`);
});
