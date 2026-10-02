import {describe,expect,it,vi} from 'vitest';
import {context} from '../../engine/testing/residenceFixture';
import {buildReferenceIndexMaterial} from './indexMaterial';
import {createApplicationReferenceContentService} from './service';
import {normalizeReferenceSet,referenceSetKey,validPrepareRequest,validPrepareResponse} from './protocol';
import type {ContentWorker,ExactReferenceContentSetV1,PreparedReferenceData} from './types';
import {receiveOwnedReferenceContent} from './lookupAdapters';

const fixture=()=>{const reference=context();return {data:buildReferenceIndexMaterial(reference.geography.registry,reference.settlements.registry),set:{version:1,geography:reference.geography.registry.manifest,settlements:reference.settlements.registry.packageManifest} as ExactReferenceContentSetV1};};
class FakeWorker{
 onmessage:ContentWorker['onmessage']=null;onerror:ContentWorker['onerror']=null;onmessageerror:ContentWorker['onmessageerror']=null;
 request:any;postMessage=(request:unknown)=>{this.request=structuredClone(request);};terminate=vi.fn();
 ready(data:PreparedReferenceData){this.onmessage?.({data:structuredClone({version:1,kind:'ready',requestId:this.request.requestId,exactSet:this.request.exactSet,data,metrics:{importMs:0,prepareMs:0,payloadBytes:1,emittedAt:performance.timeOrigin+performance.now()}})} as MessageEvent);}
}
const host=()=>{const workers:FakeWorker[]=[];const service=createApplicationReferenceContentService(()=>{const worker=new FakeWorker();workers.push(worker);return worker;});return {service,workers};};

describe('responsive application content host',()=>{
 it('deduplicates pending/rerender subscribers, publishes atomically, owns immutable delivery and reuses warm content',async()=>{
  const initial=fixture(),data=structuredClone(initial.data),set=initial.set,{service,workers}=host(),a=service.prepare(set),b=service.prepare(set);
  expect(workers).toHaveLength(1);expect(service.peek(set)).toBeUndefined();workers[0].ready(data);expect(service.peek(set)).toBeUndefined();const first=await a;expect(await b).toBe(first);expect(await service.prepare(set)).toBe(first);expect(workers[0].terminate).toHaveBeenCalledOnce();expect(Object.isFrozen(first.geography.registry.places[0])).toBe(true);
  (data.geography as any).places[0].countryId='changed';expect(first.geography.registry.places[0].countryId).not.toBe('changed');expect(service.diagnostics()).toMatchObject({activeWorkers:0,cachedSets:1,pendingSets:0,preparations:1});service.dispose();
 });
 it('does not reuse a wrong fingerprint; failed entries can retry',async()=>{
  const {data,set}=fixture(),{service,workers}=host();const bad={...set,geography:set.geography.map(item=>({...item,fingerprint:'fnv1a64-v1:0000000000000000'}))};
  const failure=service.prepare(bad);workers[0].ready(data);await expect(failure).rejects.toThrow('accepted');expect(service.peek(bad)).toBeUndefined();const retry=service.prepare(set);workers[1].ready(data);expect(await retry).toBeTruthy();service.dispose();
 });
 it('rejects protocol corruption without publishing and retries after Worker failure',async()=>{
  const {data,set}=fixture(),{service,workers}=host();const a=service.prepare(set);workers[0].onmessage?.({data:{version:99}} as MessageEvent);await expect(a).rejects.toThrow('response');const b=service.prepare(set);workers[1].onerror?.({} as ErrorEvent);await expect(b).rejects.toThrow('failed');const c=service.prepare(set);workers[2].ready(data);await c;service.dispose();
 });
 it('rejects invalid offset material and malformed/hidden receiver structures',async()=>{
  const {data,set}=fixture(),{service,workers}=host();const corrupt=structuredClone(data);(corrupt.indexes.identities as any)[0][1]=999999;const a=service.prepare(set);workers[0].ready(corrupt);await expect(a).rejects.toThrow('accepted');expect(service.peek(set)).toBeUndefined();service.dispose();
 });
 it('rejects cyclic/hidden owned payloads predictably without invoking accessors',async()=>{
  const {data,set}=fixture(),cyclic=structuredClone(data);(cyclic as any).cycle=cyclic;
  // Keep the exact outer envelope and put corruption inside its owned JSON tree.
  delete (cyclic as any).cycle;(cyclic.indexes as any).cycle=cyclic.indexes;
  await expect(receiveOwnedReferenceContent(cyclic,set,()=>true)).rejects.toThrow('Cyclic');
  const hidden=structuredClone(data),getter=vi.fn(()=>0);Object.defineProperty(hidden.indexes,'hidden',{get:getter});
  await expect(receiveOwnedReferenceContent(hidden,set,()=>true)).rejects.toThrow('property');expect(getter).not.toHaveBeenCalled();
 });
 it('one subscriber abort does not cancel another; final subscriber abort terminates unpublished work',async()=>{
  const {data,set}=fixture(),{service,workers}=host(),controller=new AbortController();const a=service.prepare(set,{signal:controller.signal}),b=service.prepare(set);controller.abort();await expect(a).rejects.toThrow('cancelled');expect(workers[0].terminate).not.toHaveBeenCalled();workers[0].ready(data);await b;service.dispose();
  const next=host(),last=new AbortController(),pending=next.service.prepare(set,{signal:last.signal});last.abort();await expect(pending).rejects.toThrow('cancelled');expect(next.workers[0].terminate).toHaveBeenCalledOnce();expect(next.service.peek(set)).toBeUndefined();next.service.dispose();
 });
 it('honours genuine AbortSignal even when own members are shadowed',async()=>{
  const {set}=fixture(),{service,workers}=host(),controller=new AbortController();Object.defineProperties(controller.signal,{aborted:{get(){throw Error('shadow');}},addEventListener:{value:()=>{throw Error('shadow');}},removeEventListener:{value:()=>{throw Error('shadow');}}});const pending=service.prepare(set,{signal:controller.signal});controller.abort();await expect(pending).rejects.toThrow('cancelled');expect(workers[0].terminate).toHaveBeenCalledOnce();service.dispose();
 });
 it('qualifies callbacks by lifetime and rejects disposal without activating stale data',async()=>{
  const {data,set}=fixture(),{service,workers}=host(),controller=new AbortController();const first=service.prepare(set,{signal:controller.signal}),stale=workers[0].onmessage;controller.abort();await expect(first).rejects.toThrow();const second=service.prepare(set);stale?.({data:{version:1}} as MessageEvent);expect(service.peek(set)).toBeUndefined();workers[1].ready(data);await second;service.dispose();expect(service.diagnostics()).toMatchObject({activeWorkers:0,cachedSets:0,pendingSets:0});await expect(service.prepare(set)).rejects.toThrow('disposed');
 });
 it('queues distinct exact sets with one Worker and no global national alias',async()=>{
  const {data,set}=fixture(),{service,workers}=host(),secondSet={...set,settlements:[]},a=service.prepare(set),b=service.prepare(secondSet);expect(workers).toHaveLength(1);workers[0].ready(data);await a;expect(workers).toHaveLength(2);workers[1].onmessage?.({data:{version:1,kind:'failed',requestId:workers[1].request.requestId,message:'Unregistered'}} as MessageEvent);await expect(b).rejects.toThrow('Unregistered');expect(service.peek(secondSet)).toBeUndefined();service.dispose();
 });
 it('normalizes only unordered identities; rejects duplicates, getters, sparse data and malformed fingerprints',()=>{
  const {set}=fixture(),two={...set,geography:[...set.geography,{partitionId:'geography.synthetic-z-v1',fingerprint:'fnv1a64-v1:1234567890abcdef'}]};expect(referenceSetKey(two)).toBe(referenceSetKey({...two,geography:[...two.geography].reverse()}));
  for(const bad of [{...set,version:2},{...set,geography:[...set.geography,...set.geography]},{...set,settlements:Array(1)},{...set,hidden:true},{...set,geography:[{partitionId:'not-id',fingerprint:'bad'}]}])expect(()=>normalizeReferenceSet(bad)).toThrow();
  const getter=vi.fn(()=>1);expect(validPrepareResponse(Object.defineProperty({},'kind',{get:getter}))).toBe(false);expect(getter).not.toHaveBeenCalled();expect(validPrepareRequest({version:1,kind:'prepare',requestId:1,exactSet:set})).toBe(true);
 });
});
