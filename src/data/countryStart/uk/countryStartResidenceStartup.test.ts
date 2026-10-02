import {describe,expect,it,vi} from 'vitest';
import {createStartupService,type StartupPort} from './countryStartResidenceStartup';
import {STARTUP_CONTRACT,validStartupCommand,validStartupReply} from './countryStartResidenceProtocol';

const request={version:1 as const,rootSeed:73,mode:'adult' as const};
const envelope=(kind:string,requestId='1',extra:object={})=>({version:1,contract:STARTUP_CONTRACT,kind,requestId,...extra});
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function harness(){
 let receive:(v:unknown)=>void=()=>{},failure=()=>{};
 const post=vi.fn(),terminate=vi.fn(),off=vi.fn(),port:StartupPort={post,terminate,listen:(message,failed)=>{receive=message;failure=failed;return off;}};
 const factory=vi.fn(async()=>port),service=createStartupService(factory);
 return {service,factory,post,terminate,off,send:(v:unknown)=>receive(v),crash:()=>failure()};
}
describe('startup-only host protocol and atomic publication',()=>{
 it('rejects unknown/hostile envelopes without evaluating getters',()=>{
  const getter=vi.fn(),hostile=Object.defineProperty(envelope('ready','0'),'kind',{enumerable:true,get:getter});
  for(const value of [hostile,null,envelope('unknown'),{...envelope('ready','0'),extra:1},envelope('ready','0',{contract:'wrong'}),Object.create({})])expect(validStartupReply(value)).toBe(false);
  expect(validStartupCommand(hostile)).toBe(false);expect(getter).not.toHaveBeenCalled();
  expect(validStartupCommand(envelope('start','1',{request}))).toBe(true);
  expect(validStartupReply(envelope('ready','0'))).toBe(true);
  expect(validStartupReply(envelope('complete','1',{game:{},metrics:{preparationMs:0,constructionMs:Infinity,emittedAt:0,workerHeapUsed:null}}))).toBe(false);
 });
 it('shares one in-flight preparation and allows retry after factory failure',async()=>{
  const h=harness(),a=h.service.prepare(),b=h.service.prepare();expect(a).toBe(b);await flush();expect(h.factory).toHaveBeenCalledTimes(1);
  h.send(envelope('ready','0'));await a;expect(h.service.status()).toMatchObject({ready:true,active:false});h.service.dispose();
  const retry=harness();retry.factory.mockRejectedValueOnce(Error('load'));
  await expect(retry.service.prepare()).rejects.toMatchObject({code:'unavailable'});expect(retry.service.status().ready).toBe(false);
  const recovered=retry.service.prepare();await flush();retry.send(envelope('ready','0'));await recovered;expect(retry.factory).toHaveBeenCalledTimes(2);retry.service.dispose();
 });
 it('rejects a second create, owns request before suspension and isolates progress failures',async()=>{
  const h=harness(),input={...request,identity:{name:'Original'}},promise=h.service.create(input,{onProgress:()=>{throw Error('presentation');}});
  input.identity.name='Changed';await expect(h.service.create(request)).rejects.toMatchObject({code:'busy'});
  await flush();h.send(envelope('ready','0'));await flush();expect(h.post.mock.calls[1][0].request.identity.name).toBe('Original');
  h.send(envelope('failed','1',{code:'construction',message:'Invalid request.'}));await expect(promise).rejects.toThrow('Invalid request.');expect(h.service.status()).toMatchObject({active:false,ready:true});h.service.dispose();
 });
 it('cancels publication, holds the slot until late completion and never admits stale success',async()=>{
  const h=harness(),abort=new AbortController(),p=h.service.create(request,{signal:abort.signal});await flush();h.send(envelope('ready','0'));await flush();abort.abort();
  await expect(p).rejects.toMatchObject({code:'aborted'});await expect(h.service.create(request)).rejects.toMatchObject({code:'busy'});
  h.send(envelope('complete','1',{game:{},metrics:{preparationMs:0,constructionMs:0,emittedAt:0,workerHeapUsed:null}}));expect(h.service.status().active).toBe(false);
  const next=h.service.create(request);await flush();h.send(envelope('complete','1',{game:{},metrics:{preparationMs:0,constructionMs:0,emittedAt:0,workerHeapUsed:null}}));await expect(next).rejects.toMatchObject({code:'protocol'});expect(h.terminate).toHaveBeenCalled();
 });
 it.each(['crash','malformed','mismatch','invalid-game','dispose'] as const)('cleans and rejects exactly once on %s',async kind=>{
  const h=harness(),p=h.service.create(request);await flush();h.send(envelope('ready','0'));await flush();
  if(kind==='crash')h.crash();else if(kind==='dispose')h.service.dispose();else if(kind==='invalid-game')h.send(envelope('complete','1',{game:{},metrics:{preparationMs:0,constructionMs:0,emittedAt:0,workerHeapUsed:null}}));else h.send(kind==='mismatch'?envelope('failed','999',{code:'construction',message:'bad'}):{kind:'bad'});
  await expect(p).rejects.toBeInstanceOf(Error);expect(h.service.status()).toMatchObject({active:false,ready:false,worker:false});expect(h.off).toHaveBeenCalled();expect(h.terminate).toHaveBeenCalledTimes(1);
 });
 it('rejects already aborted and hostile requests before creating a worker',async()=>{
  const h=harness(),controller=new AbortController();controller.abort();await expect(h.service.create(request,{signal:controller.signal})).rejects.toMatchObject({code:'aborted'});
  const getter=vi.fn(),bad=Object.defineProperty({...request},'rootSeed',{get:getter,enumerable:true});await expect(h.service.create(bad)).rejects.toThrow('Invalid');await expect(h.service.create(new Proxy(request,{}))).rejects.toThrow('Invalid');expect(getter).not.toHaveBeenCalled();expect(h.factory).not.toHaveBeenCalled();
 });
 it('rejects malformed host controls without acquiring or stranding the active slot',async()=>{
  const h=harness();await expect(h.service.create(request,{signal:{} as AbortSignal})).rejects.toBeInstanceOf(Error);
  await expect(h.service.create(request,{onProgress:1 as never})).rejects.toThrow('progress');expect(h.service.status().active).toBe(false);expect(h.factory).not.toHaveBeenCalled();
 });
});
