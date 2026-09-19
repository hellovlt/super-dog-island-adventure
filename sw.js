// Offline service worker: the whole game is cached on install, so it plays with no server and no network.
const VERSION='superdog-v6-1';
const ASSETS=[
 './','./index.html','./style3d.css','./favicon.svg','./manifest.webmanifest',
 './icon-192.png','./icon-512.png','./icon-maskable.png',
 './game3d.js','./adventure3d.js','./campaign3d.js','./collision3d.js','./world3d.js',
 './drawing3d.js','./audio3d.js','./wardrobe3d.js','./input3d.js','./settings3d.js',
 './multiplayer3d.js',
 './vendor/trystero/core/action-wire.mjs',
 './vendor/trystero/core/actions.mjs',
 './vendor/trystero/core/crypto.mjs',
 './vendor/trystero/core/handshake.mjs',
 './vendor/trystero/core/index.mjs',
 './vendor/trystero/core/media.mjs',
 './vendor/trystero/core/offer-pool.mjs',
 './vendor/trystero/core/peer.mjs',
 './vendor/trystero/core/room.mjs',
 './vendor/trystero/core/shared-peer.mjs',
 './vendor/trystero/core/signal-handler.mjs',
 './vendor/trystero/core/strategy.mjs',
 './vendor/trystero/core/topic-strategy.mjs',
 './vendor/trystero/core/utils.mjs',
 './vendor/trystero/nostr.mjs',
 './vendor/trystero/secp256k1.mjs',
 './vendor/three.module.js','./vendor/three.core.js','./vendor/GLTFLoader.js','./vendor/BufferGeometryUtils.js',
 './assets/bosses/snake.glb','./assets/bosses/mushroom.glb','./assets/bosses/wolf.glb','./assets/bosses/dragon.glb','./assets/bosses/cloud.glb',
 './classic/index.html','./game.js','./engine.js','./levels.js','./style.css',
];
// Prime the cache straight from the network: a host that asks browsers to hold files for minutes
// (GitHub Pages does) must not hand the worker a stale copy of a fresh release.
self.addEventListener('install',event=>{event.waitUntil(caches.open(VERSION)
 .then(cache=>Promise.all(ASSETS.map(path=>fetch(new Request(path,{cache:'reload'})).then(response=>response.ok?cache.put(path,response):null).catch(()=>null))))
 .then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
// The game's own files are served from the cache; anything else (test pages, new assets) asks the
// network first, so an update is never hidden behind a stale copy.
const shell=new Set(ASSETS.map(path=>new URL(path,self.registration.scope).pathname));
const store=(request,response)=>{if(response.ok&&response.type==='basic'){const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(request,copy));}return response;};
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 const offline=()=>caches.match(request).then(hit=>hit||(request.mode==='navigate'?caches.match('./index.html'):Promise.reject(new Error('offline'))));
 // Shell files answer from the cache at once and refresh in the background, so the next load is current.
 if(shell.has(new URL(request.url).pathname))event.respondWith(caches.match(request).then(hit=>{
  const fresh=fetch(request).then(r=>store(request,r)).catch(()=>hit);
  return hit||fresh;
 }));
 else event.respondWith(fetch(request).then(r=>store(request,r)).catch(offline));
});
