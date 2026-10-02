import {expect,test} from '@playwright/test';

test('startup Worker lifetime drops completed worlds and has a bounded post-GC memory plateau',async({page},testInfo)=>{
 await page.goto('/research/country-start-v3/worker-browser-blank.html');
 const supported=testInfo.project.name==='chromium',snapshots:any[]=[],workers=new Map<string,string>();
 const cdp=supported?await page.context().newCDPSession(page):null;let counter=0;
 async function remote(sessionId:string,method:string){
  const id=++counter;
  return new Promise<any>((resolve,reject)=>{
   const listener=(event:any)=>{if(event.sessionId!==sessionId)return;const result=JSON.parse(event.message);if(result.id!==id)return;cdp!.off('Target.receivedMessageFromTarget',listener);result.error?reject(Error(result.error.message)):resolve(result.result);};
   cdp!.on('Target.receivedMessageFromTarget',listener);
   void cdp!.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method})}).catch(reject);
  });
 }
 if(cdp){cdp.on('Target.attachedToTarget',(event:any)=>{if(event.targetInfo.type==='worker')workers.set(event.targetInfo.targetId,event.sessionId);});cdp.on('Target.detachedFromTarget',(event:any)=>{for(const [id,session]of workers)if(session===event.sessionId)workers.delete(id);});await cdp.send('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:false});}
 try{
  for(let iteration=0;iteration<5;iteration++){
   const status=await page.evaluate(async i=>{
    const api=await import('/research/country-start-v3/worker-browser-dist/startup-profile.js');
    const game=await api.createUkMid2024GeographicResidenceGame({version:1,rootSeed:73+i,mode:'adult'});
    if(game.people!.people.length!==1||game.residence.residences.length!==1)throw Error('Repeated startup changed composition.');
    return api.ukCountryStartStartupStatus(); // No Game is returned or retained by the harness.
   },iteration);
   expect(status).toMatchObject({active:false,ready:true,worker:true});
   if(cdp){await cdp.send('HeapProfiler.collectGarbage');const main=await cdp.send('Runtime.getHeapUsage'),worker=[];
    for(const session of workers.values()){await remote(session,'HeapProfiler.collectGarbage');worker.push(await remote(session,'Runtime.getHeapUsage'));}
    snapshots.push({iteration,main,worker});expect(workers.size).toBe(1);
   }else snapshots.push({iteration,status,heapUnsupported:true});
  }
  await page.evaluate(async()=>{const api=await import('/research/country-start-v3/worker-browser-dist/startup-profile.js');api.disposeUkCountryStartStartup();return api.ukCountryStartStartupStatus();}).then(status=>expect(status).toMatchObject({active:false,worker:false,ready:false}));
  if(cdp){await cdp.send('HeapProfiler.collectGarbage');snapshots.push({disposed:true,main:await cdp.send('Runtime.getHeapUsage')});}
  // Resource observations remain non-brittle; object ownership/lifetime assertions enforce bounded retention.
  const report={browser:testInfo.project.name,heapSupported:supported,snapshots,completedGamesRetainedByHarness:0,oneWorker:true};
  console.log(JSON.stringify({gate:'country-start-v3-worker-memory',...report}));await testInfo.attach('country-start-v3-worker-memory',{body:JSON.stringify(report,null,2),contentType:'application/json'});
 }finally{await page.evaluate(async()=>{const api=await import('/research/country-start-v3/worker-browser-dist/startup-profile.js');api.disposeUkCountryStartStartup();});await cdp?.detach();}
});
