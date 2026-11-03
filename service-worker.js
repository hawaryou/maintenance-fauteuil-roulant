/* EuroMed — application offline, version 20261103-enr10-v06-endpoint */
/* Cache propre à ce projet pour ne pas perturber les autres applications EuroMed. */
const CACHE_NAME='euromed-maintenance-fauteuil-roulant-offline-20261103-enr10-v06-endpoint';
const CACHE_PREFIX='euromed-maintenance-fauteuil-roulant-offline-';
const SCOPE=self.registration.scope;
const LOCAL_FILES=["./","./index.html","style.css?v=20261103-photo-signature-v1","config.js?v=20261103-enr10-v06-endpoint","offline-queue.js?v=20261024-offline-lit-medical-sync","app.js?v=20261103-enr10-v06-endpoint","./euromed-logo.jpeg","./scan-success-euromed.jpg"];
const REMOTE_FILES=["https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js","https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.4/dist/iife/reader/index.js","https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","https://cdn.jsdelivr.net/npm/@undecaf/barcode-detector-polyfill@0.9.23/dist/main.js"];
function localUrl(path){return new URL(path,SCOPE).href}
async function precacheOne(cache,url){
  try{
    const response=await fetch(url,{cache:'reload'});
    if(response.ok)await cache.put(url,response.clone());
    return;
  }catch(error){
    // Utiliser les bibliothèques déjà enregistrées pour conserver le mode hors connexion.
    try{const previous=await caches.match(url);if(previous)await cache.put(url,previous.clone())}catch(ignore){}
  }
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  for(const path of LOCAL_FILES)await precacheOne(cache,localUrl(path));
  for(const url of REMOTE_FILES)await precacheOne(cache,url);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  // Ne jamais supprimer le cache partagé d'anciennes versions des autres maintenances.
  await Promise.all(keys.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  const local=url.origin===self.location.origin&&url.href.startsWith(SCOPE);
  const remote=REMOTE_FILES.includes(url.href);
  if(!local&&!remote)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const isDocument=req.mode==='navigate'||(local&&url.pathname.endsWith('/index.html'));
    const isAppScript=local&&url.pathname.endsWith('/app.js');
    // HTML + générateur PDF toujours actualisés dès qu'une connexion est disponible.
    if(isDocument||isAppScript){
      try{
        const response=await fetch(req,{cache:'no-store'});
        if(response.ok){
          await cache.put(req,response.clone());
          if(isDocument)await cache.put(localUrl('./index.html'),response.clone());
        }
        return response;
      }catch(error){}
    }
    const cached=await cache.match(req)||await caches.match(req);
    if(cached)return cached;
    try{
      const response=await fetch(req);
      if(response.ok)cache.put(req,response.clone()).catch(()=>{});
      return response;
    }catch(error){
      if(isDocument){
        const fallback=await cache.match(localUrl('./index.html'))||await caches.match(localUrl('./index.html'));
        if(fallback)return fallback;
      }
      return new Response('Ressource indisponible hors connexion',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}});
    }
  })());
});
