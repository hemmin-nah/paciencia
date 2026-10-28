// PACIENCIA 1.0.1 — actualizaciones sin quedar atrapado en cachés antiguas
const CACHE = 'paciencia-offline-1.0.1';
const CORE = ['./', './index.html'];
const EXTRAS = ['./manifest.webmanifest','./favicon.svg','./apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable.png'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(CORE);
  await Promise.allSettled(EXTRAS.map(u=>cache.add(u)));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k.startsWith('paciencia-offline-')&&k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(request);
   if(response.ok && new URL(request.url).pathname.startsWith(new URL(self.registration.scope).pathname)){
    cache.put(request,response.clone()).catch(()=>{});
   }
   return response;
  }catch(error){
   const cached=await cache.match(request);
   if(cached)return cached;
   if(request.mode==='navigate')return await cache.match('./index.html')||Response.error();
   return Response.error();
  }
 })());
});
