import {describe,expect,it} from 'vitest';
import {createRandomness} from '../core/rng';
import {validResidenceLocationContent} from '../residence/validation';
import {candidateKey,fnv1a64} from './data';
import {admin,area,context,input,policy,request,settlementArea} from './fixtures';
import {createResidencePlacementRegistry,fingerprintResidencePlacementPolicy,resolveResidencePlacementPolicy,validateResidencePlacementContent,validateResidencePlacementPolicy,validateResidencePlacementRegistry,withResidencePlacementPolicyFingerprint} from './package';
import {createResidencePlacementRuntime,evaluateResidencePlacement} from './runtime';
import {boundedPlacementTicket,candidateIndexForTicket,keyedPlacementTicket,MAX_PLACEMENT_DRAW_ATTEMPTS} from './selection';
import type {ResidencePlacementPolicyInputV1,ResidencePlacementPolicyV1} from './types';
import {validateResidencePlacementRequest} from './validation';

const ctx=context();
const build=(value:unknown)=>withResidencePlacementPolicyFingerprint(value as ResidencePlacementPolicyInputV1);
const copy=()=>structuredClone(policy(ctx));

describe('generic Residence placement composition',()=>{
 it('materializes an immutable strictly canonical policy with exact relative integer weights',()=>{
  const value=policy(ctx);expect(validateResidencePlacementPolicy(value)).toBe(true);expect(validateResidencePlacementContent(value,ctx)).toBe(true);expect(Object.isFrozen(value.groups[0].candidates[0].location.administrativeArea)).toBe(true);expect(value.groups[0].candidates.map(c=>c.weight)).toEqual([50,10,1]);
 });
 it('returns minimal admin-only decisions without allocating or deriving a selection word',()=>{
  const runtime=createResidencePlacementRuntime(policy(ctx),ctx),req=request('person:1',1,area('gamma')),result=runtime.evaluate(req),diagnostics=runtime.diagnose(req);
  expect(result).toEqual({version:1,policyId:runtime.policy.policyId,policyFingerprint:runtime.policy.fingerprint,requestKey:result.requestKey,location:admin(area('gamma'))});expect(diagnostics.ticket).toBeNull();expect(diagnostics.attempts).toBe(0);expect(JSON.stringify(result)).not.toMatch(/residenceId|history|personId|population/i);
 });
 it('pins exact deterministic weighted outputs, not statistical sampling expectations',()=>{
  const runtime=createResidencePlacementRuntime(policy(ctx),ctx);
  const actual=[0,1,42,2024].map(seed=>{const d=runtime.diagnose(request('person:1',seed));return [d.ticket,d.decision.location.kind==='settlement-area'?d.decision.location.settlement.settlementId:'admin'];});
  expect(actual).toEqual([['32','settlement.synthetic.aa.a'],['24','settlement.synthetic.aa.a'],['46','settlement.synthetic.aa.a'],['2','settlement.synthetic.aa.a']]);
 });
 it('canonicalizes all unordered collections before fingerprinting and preserves decision bytes',()=>{
  const original=input(ctx),shuffled=structuredClone(original);(shuffled.groups as unknown[]).reverse();for(const group of shuffled.groups)(group.candidates as unknown[]).reverse();
  const a=build(original),b=build(shuffled);expect(JSON.stringify(a)).toBe(JSON.stringify(b));expect(fingerprintResidencePlacementPolicy({...a,groups:[...a.groups].reverse()})).toBe(a.fingerprint);expect(JSON.stringify(evaluateResidencePlacement(a,request(),ctx))).toBe(JSON.stringify(evaluateResidencePlacement(b,request(),ctx)));expect(validateResidencePlacementPolicy({...a,groups:[...a.groups].reverse()})).toBe(false);
  const reordered=JSON.parse(JSON.stringify(original,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).reverse()):value));expect(JSON.stringify(build(reordered))).toBe(JSON.stringify(a));expect(JSON.stringify(evaluateResidencePlacement(build(reordered),request(),ctx))).toBe(JSON.stringify(evaluateResidencePlacement(a,request(),ctx)));
  const reorderedCanonical=JSON.parse(JSON.stringify(a,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).reverse()):value));expect(validateResidencePlacementPolicy(reorderedCanonical)).toBe(true);expect(JSON.stringify(evaluateResidencePlacement(reorderedCanonical,request(),ctx))).toBe(JSON.stringify(evaluateResidencePlacement(a,request(),ctx)));
 });
 it('changes material fingerprints and rejects mutation under a registered identity',()=>{
  const original=policy(ctx),changed=structuredClone(input(ctx));(changed.groups[0].candidates[0] as {weight:number}).weight=51;const next=build(changed);
  expect(next.fingerprint).not.toBe(original.fingerprint);expect(()=>createResidencePlacementRegistry([next],[{policyId:original.policyId,fingerprint:original.fingerprint}])).toThrow('manifest');expect(validateResidencePlacementPolicy({...next,fingerprint:original.fingerprint})).toBe(false);
  expect(()=>build({...input(ctx),algorithmId:'residence-placement.weighted-integer-v2'})).toThrow();
 });
 it('keeps the fingerprint self-independent and follows deterministic UTF-8 FNV encoding',()=>{
  const p=policy(ctx);expect(fingerprintResidencePlacementPolicy({...p,fingerprint:'fnv1a64-v1:0000000000000000'})).toBe(p.fingerprint);expect(fnv1a64('')).toBe('fnv1a64-v1:cbf29ce484222325');expect(fnv1a64('hello')).toBe('fnv1a64-v1:a430d84680aabd0b');expect(fnv1a64('é')).not.toBe(fnv1a64('e'));
 });
 it('requires exact registry registration and forbids duplicate or latest identities',()=>{
  const p=policy(ctx),manifest=[{policyId:p.policyId,fingerprint:p.fingerprint}],registry=createResidencePlacementRegistry([p],manifest);
  expect(validateResidencePlacementRegistry(registry)).toBe(true);expect(resolveResidencePlacementPolicy(registry,p.policyId)).toEqual(p);expect(()=>resolveResidencePlacementPolicy(registry,'latest')).toThrow('Unknown');expect(()=>createResidencePlacementRegistry([p,p],[...manifest,...manifest])).toThrow();expect(()=>createResidencePlacementRegistry([p],[])).toThrow();
 });
 it('separates structural acceptance from exact external content validation',()=>{
  const unknown=structuredClone(input(ctx));(unknown.dependencies.settlementPackages[0] as {id:string}).id='settlements.synthetic-absent-v1';for(const group of unknown.groups)for(const candidate of group.candidates)if(candidate.location.kind==='settlement-area')(candidate.location.settlement as {packageId:string}).packageId='settlements.synthetic-absent-v1';
  const p=build(unknown);expect(validateResidencePlacementPolicy(p)).toBe(true);expect(validateResidencePlacementContent(p,ctx)).toBe(false);expect(()=>createResidencePlacementRuntime(p,ctx)).toThrow('dependencies');
 });
 it('rejects mismatched fingerprints, unresolved partitions, Places and Settlements',()=>{
  for(const kind of ['geography-hash','settlement-hash','partition','place','settlement']){
   const value=structuredClone(input(ctx));
   if(kind==='geography-hash')(value.dependencies.geographyPartitions[0] as {fingerprint:string}).fingerprint='fnv1a64-v1:0000000000000000';
   if(kind==='settlement-hash')(value.dependencies.settlementPackages[0] as {fingerprint:string}).fingerprint='fnv1a64-v1:0000000000000000';
   if(kind==='partition'){(value.dependencies.geographyPartitions[0] as {id:string}).id='geography.synthetic-absent-v1';for(const g of value.groups){(g.scope as {partitionId:string}).partitionId='geography.synthetic-absent-v1';for(const c of g.candidates)(c.location.administrativeArea as {partitionId:string}).partitionId='geography.synthetic-absent-v1';}}
   if(kind==='place'){(value.groups[0].scope as {placeId:string}).placeId='place.synthetic.aa.absent';for(const c of value.groups[0].candidates)(c.location.administrativeArea as {placeId:string}).placeId='place.synthetic.aa.absent';}
   if(kind==='settlement')(value.groups[0].candidates[0].location as ReturnType<typeof settlementArea> & {settlement:{settlementId:string}}).settlement.settlementId='settlement.synthetic.aa.absent';
   expect(validateResidencePlacementContent(build(value),ctx),kind).toBe(false);
  }
 });
 it('resolves shared durable identity against exactly the referenced package and never a newer one',()=>{
  const old=policy(ctx),next=structuredClone(input(ctx));(next.dependencies.settlementPackages[0] as {id:string;fingerprint:string}).id='settlements.synthetic-aa-v2';(next.dependencies.settlementPackages[0] as {fingerprint:string}).fingerprint=ctx.settlements.package('settlements.synthetic-aa-v2')!.fingerprint;for(const g of next.groups)for(const c of g.candidates)if(c.location.kind==='settlement-area')(c.location.settlement as {packageId:string}).packageId='settlements.synthetic-aa-v2';
  const p=build(next);expect(validateResidencePlacementContent(p,ctx)).toBe(true);expect(p.fingerprint).not.toBe(old.fingerprint);const selected=createResidencePlacementRuntime(p,ctx).evaluate(request());expect(selected.location.kind==='settlement-area'&&selected.location.settlement.packageId).toBe('settlements.synthetic-aa-v2');
  const withoutOld={...ctx,settlements:{...ctx.settlements,package:(id:string)=>id==='settlements.synthetic-aa-v1'?undefined:ctx.settlements.package(id)}};expect(validateResidencePlacementContent(old,withoutOld)).toBe(false);
 });
 it('permits exact cross-boundary pairs but rejects unrelated and cross-scope destinations',()=>{
  expect(validateResidencePlacementContent(policy(ctx),ctx)).toBe(true);expect(evaluateResidencePlacement(policy(ctx),request('person:1',1,area('beta')),ctx).location).toEqual(settlementArea('cross',area('beta')));
  const invalid=structuredClone(input(ctx));(invalid.groups as unknown[]).push({scope:area('root'),candidates:[{location:settlementArea('cross',area('root')),weight:1}]});expect(validateResidencePlacementContent(build(invalid),ctx)).toBe(false);
  const mismatch=structuredClone(input(ctx));(mismatch.groups[0].candidates[0] as {location:unknown}).location=settlementArea('cross',area('beta'));expect(()=>build(mismatch)).toThrow();
 });
 it('rejects cross-country Settlement use while permitting synthetic countries through one mechanism',()=>{
  const value=structuredClone(input(ctx));const bb=area('alpha','bb');(value.groups as unknown[]).push({scope:bb,candidates:[{location:admin(bb),weight:1}]});(value.dependencies.geographyPartitions as unknown[]).push({id:bb.partitionId,fingerprint:ctx.geography.partition(bb.partitionId)!.fingerprint});const p=build(value);expect(validateResidencePlacementContent(p,ctx)).toBe(true);expect(evaluateResidencePlacement(p,request('person:9',22,bb),ctx).location).toEqual(admin(bb));
  (value.groups[value.groups.length-1].candidates as unknown[])[0]={location:settlementArea('cross',bb),weight:1};expect(validateResidencePlacementContent(build(value),ctx)).toBe(false);
 });
 it('supports several exact Settlement packages and genuinely unordered dependency lists',()=>{
  const value=structuredClone(input(ctx)),bb=area('alpha','bb'),packageId='settlements.synthetic-bb-v1';
  (value.dependencies.geographyPartitions as unknown[]).push({id:bb.partitionId,fingerprint:ctx.geography.partition(bb.partitionId)!.fingerprint});(value.dependencies.settlementPackages as unknown[]).push({id:packageId,fingerprint:ctx.settlements.package(packageId)!.fingerprint});
  (value.groups as unknown[]).push({scope:bb,candidates:[{weight:25,location:{kind:'settlement-area',administrativeArea:bb,settlement:{version:1,packageId,settlementId:'settlement.synthetic.bb.a'}}}]});
  const first=build(value);expect(validateResidencePlacementContent(first,ctx)).toBe(true);const second=structuredClone(value);(second.dependencies.geographyPartitions as unknown[]).reverse();(second.dependencies.settlementPackages as unknown[]).reverse();(second.groups as unknown[]).reverse();expect(JSON.stringify(build(second))).toBe(JSON.stringify(first));
  expect(evaluateResidencePlacement(first,request('person:77',12,bb),ctx).location).toEqual({kind:'settlement-area',administrativeArea:bb,settlement:{version:1,packageId,settlementId:'settlement.synthetic.bb.a'}});
 });
 it('uses Person, policy and area identities without depending on evaluation order',()=>{
  const runtime=createResidencePlacementRuntime(policy(ctx),ctx),a=runtime.evaluate(request('person:1')),b=runtime.evaluate(request('person:2'));
  expect(a.requestKey).not.toBe(b.requestKey);expect(runtime.evaluate(request('person:2'))).toEqual(b);expect(runtime.evaluate(request('person:1'))).toEqual(a);
  const different=build({...input(ctx),policyId:'residence-placement.synthetic-v2'}),other=createResidencePlacementRuntime(different,ctx).evaluate({...request(),policyId:different.policyId});expect(other.requestKey).not.toBe(a.requestKey);
  expect(runtime.evaluate(request('person:1',42,area('beta'))).requestKey).not.toBe(a.requestKey);
  expect(runtime.diagnose(request('person:1')).ticket).not.toBe(runtime.diagnose(request('person:2')).ticket);
 });
 it('rejects malformed requests predictably without changing input or mutable streams',()=>{
  const runtime=createResidencePlacementRuntime(policy(ctx),ctx),randomness=createRandomness(42),before=structuredClone(randomness),valid=request();
  for(const bad of [{...valid,version:2},{...valid,rootSeed:-1},{...valid,rootSeed:2**32},{...valid,rootSeed:NaN},{...valid,personId:'person:01'},{...valid,personId:'person:9007199254740992'},{...valid,age:18},{...valid,policyId:'residence-placement.absent-v1'},{...valid,scope:area('absent')}])expect(()=>runtime.evaluate(bad as typeof valid)).toThrow(/placement/i);
  expect(randomness).toEqual(before);expect(validateResidencePlacementRequest(valid)).toBe(true);expect(runtime.evaluate(valid)).toEqual(runtime.evaluate(JSON.parse(JSON.stringify(valid))));
 });
 it('keeps diagnostics separate and identical selection with no extra decision fields',()=>{
  const runtime=createResidencePlacementRuntime(policy(ctx),ctx),decision=runtime.evaluate(request()),diag=runtime.diagnose(request());expect(diag.decision).toEqual(decision);expect(diag.totalMass).toBe(61);expect(diag.candidates.map(c=>c.weight)).toEqual([50,10,1]);expect(Object.isFrozen(diag.candidates)).toBe(true);expect(Object.keys(decision).sort()).toEqual(['location','policyFingerprint','policyId','requestKey','version']);
 });
 it('owns every nested input and exposes no mutable location/index authority',()=>{
  const mutable=structuredClone(policy(ctx)),runtime=createResidencePlacementRuntime(mutable,ctx),before=runtime.evaluate(request()),diagnostic=runtime.diagnose(request());
  (mutable.groups[0].candidates[0] as {weight:number}).weight=999;(mutable.groups[0].candidates[0].location.administrativeArea as {placeId:string}).placeId=area('beta').placeId;(mutable.dependencies.geographyPartitions as unknown[]).length=0;(mutable.groups as unknown[]).reverse();expect(runtime.evaluate(request())).toEqual(before);expect(()=>((before.location.administrativeArea as {placeId:string}).placeId='changed')).toThrow();expect(()=>((diagnostic.candidates as unknown[]).length=0)).toThrow();expect(JSON.stringify(runtime.policy)).not.toMatch(/cache|index|Map/);
 });
 it('validates its owned snapshot even if injected content lookup changes the caller input',()=>{
  const mutable=copy(),expected=createResidencePlacementRuntime(mutable,ctx).evaluate(request()),injected={...ctx,geography:{...ctx.geography,partition:(id:string)=>{(mutable.groups[0].candidates[0] as {weight:number}).weight=987;return ctx.geography.partition(id);}}};
  const runtime=createResidencePlacementRuntime(mutable,injected);expect(runtime.evaluate(request())).toEqual(expected);expect(runtime.policy.groups[0].candidates[0].weight).toBe(50);
 });
 it('agrees with frozen Residence location validation without establishing a Residence',()=>{
  const p=policy(ctx);for(const group of p.groups)for(const candidate of group.candidates)expect(validResidenceLocationContent(candidate.location,ctx.geography,ctx.settlements)).toBe(true);
  const invalid=settlementArea('cross',area('gamma'));expect(validResidenceLocationContent(invalid,ctx.geography,ctx.settlements)).toBe(false);
 });
 it('keeps policy, request and injected registries unchanged through repeated success and failure',()=>{
  const p=policy(ctx),runtime=createResidencePlacementRuntime(p,ctx),req=request('person:9007199254740991',0xffffffff),bad={...req,scope:area('absent')};
  const before=JSON.stringify({p,req,bad,geography:ctx.geography.registry,settlements:ctx.settlements.registry}),expected=JSON.stringify(runtime.evaluate(req));
  expect(()=>runtime.evaluate(bad)).toThrow('Unknown');expect(JSON.stringify(runtime.evaluate(req))).toBe(expected);expect(JSON.stringify(runtime.diagnose(req).decision)).toBe(expected);
  expect(JSON.stringify({p,req,bad,geography:ctx.geography.registry,settlements:ctx.settlements.registry})).toBe(before);expect(runtime.policy).toEqual(p);
 });
});

describe('exact integer selection boundaries',()=>{
 it('does not collapse large-mass draws into the four affine-correlated raw-word tickets',()=>{
  // Raw frozen-RNG lanes ending in 0/1 differ by +/- 888907383 modulo 2^32.
  // At mass 2^32+1 raw concatenation therefore reaches only four tickets.
  const mass=4294967297,collapsed=[888907383n,888907384n,3406059913n,3406059914n];
  const tickets=[0,1,42,2024].map(seed=>keyedPlacementTicket(seed,'fixture',mass).ticket);
  expect(tickets).toEqual([3250336398n,433709310n,3235172788n,659100444n]);
  expect(tickets.every(ticket=>!collapsed.includes(ticket))).toBe(true);
 });
 it('maps cumulative intervals with exact half-open boundaries',()=>{const bounds=[50n,60n,61n];expect([0n,49n,50n,59n,60n].map(x=>candidateIndexForTicket(bounds,x))).toEqual([0,0,1,1,2]);expect(()=>candidateIndexForTicket(bounds,61n)).toThrow();});
 it('rejects the remainder region before applying modulo',()=>{const seen:number[]=[];const result=boundedPlacementTicket(3,(attempt,lane)=>{seen.push(attempt);return attempt===0?0xffffffff:lane===0?0:5;});expect(result).toEqual({ticket:2n,attempts:2});expect(seen).toEqual([0,0,1,1]);});
 it('handles the maximum safe total and exact 64-bit rejection boundary',()=>{const mass=BigInt(Number.MAX_SAFE_INTEGER),limit=(1n<<64n)/mass*mass,words=(x:bigint,lane:number)=>Number(lane===0?x>>32n:x&0xffffffffn);expect(boundedPlacementTicket(Number.MAX_SAFE_INTEGER,(_attempt,lane)=>words(limit-1n,lane)).ticket).toBe(mass-1n);expect(boundedPlacementTicket(Number.MAX_SAFE_INTEGER,(attempt,lane)=>words(attempt===0?limit:0n,lane))).toEqual({ticket:0n,attempts:2});});
 it('supports power-of-two and unit mass without scaling floats',()=>{expect(boundedPlacementTicket(2**32,(_a,lane)=>lane===0?0xffffffff:123)).toEqual({ticket:123n,attempts:1});expect(boundedPlacementTicket(1,()=>0xffffffff).ticket).toBe(0n);});
 it('fails rather than biasing a pathological rejection stream',()=>{let draws=0;expect(()=>boundedPlacementTicket(3,()=>{draws++;return 0xffffffff;})).toThrow('guard');expect(draws).toBe(MAX_PLACEMENT_DRAW_ATTEMPTS*2);expect(()=>boundedPlacementTicket(2,()=>NaN)).toThrow('word');expect(()=>boundedPlacementTicket(0,()=>0)).toThrow('mass');});
});

describe('hostile policy input hardening',()=>{
 it('rejects every invalid integer weight and aggregate overflow',()=>{
  for(const weight of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){const value=structuredClone(input(ctx));(value.groups[0].candidates[0] as {weight:number}).weight=weight;expect(()=>build(value)).toThrow();}
  const value=structuredClone(input(ctx));(value.groups[0].candidates[0] as {weight:number}).weight=Number.MAX_SAFE_INTEGER;expect(()=>build(value)).toThrow();
  const maximum=structuredClone(input(ctx));(maximum.groups[0] as {candidates:unknown}).candidates=[{location:admin(),weight:Number.MAX_SAFE_INTEGER}];const standalone={...maximum,groups:[maximum.groups[0]],dependencies:{...maximum.dependencies,settlementPackages:[]}};expect(validateResidencePlacementContent(build(standalone),ctx)).toBe(true);
 });
 it('rejects duplicate groups, destinations, pins and unused declarations',()=>{
  for(const change of [(v:ResidencePlacementPolicyInputV1)=>(v.groups as unknown[]).push(v.groups[0]),(v:ResidencePlacementPolicyInputV1)=>(v.groups[0].candidates as unknown[]).push(v.groups[0].candidates[0]),(v:ResidencePlacementPolicyInputV1)=>(v.dependencies.geographyPartitions as unknown[]).push(v.dependencies.geographyPartitions[0]),(v:ResidencePlacementPolicyInputV1)=>(v.dependencies.settlementPackages as unknown[]).push({id:'settlements.synthetic-unused-v1',fingerprint:'fnv1a64-v1:0000000000000000'})]){const v=structuredClone(input(ctx));change(v);expect(()=>build(v)).toThrow();}
 });
 it('rejects unsupported versions, unions, IDs and extra fields',()=>{const value=input(ctx);for(const bad of [{...value,version:2},{...value,policyId:'latest'},{...value,extra:1},{...value,groups:[]},{...value,groups:[{scope:area(),candidates:[{location:{kind:'country',countryId:'aa'},weight:1}]}]},{...value,groups:[{scope:area(),candidates:[{location:{...admin(),extra:1},weight:1}]}]}])expect(()=>build(bad)).toThrow();});
 it('rejects sparse, symbolic, hidden, accessor, custom-prototype and proxy inputs without invoking getters',()=>{
  let reads=0;const accessor=copy();Object.defineProperty(accessor,'policyId',{enumerable:true,get(){reads++;throw Error('getter invoked');}});
  const hidden=copy();Object.defineProperty(hidden,'hidden',{value:1});const symbolic=copy();Object.defineProperty(symbolic,Symbol('hidden'),{value:1});const sparse=copy();delete (sparse.groups as unknown[])[0];const custom=copy();Object.setPrototypeOf(custom,{custom:true});const array=copy();Object.setPrototypeOf(array.groups,{custom:true});const proxy=new Proxy(copy(),{}),revoked=Proxy.revocable(copy(),{});revoked.revoke();
  for(const bad of [accessor,hidden,symbolic,sparse,custom,array,proxy,revoked.proxy,new Map(),new Set(),new Date(),{...copy(),groups:[{scope:area(),candidates:[{location:admin(),weight:()=>1}]}]}]){expect(validateResidencePlacementPolicy(bad)).toBe(false);expect(()=>build(bad)).toThrow(/placement/i);}expect(reads).toBe(0);
 });
 it('rejects hostile nested dependencies and request objects without leaking low-level errors',()=>{const v=copy();Object.defineProperty(v.dependencies.geographyPartitions[0],'fingerprint',{enumerable:true,get(){throw Error('leak');}});expect(validateResidencePlacementContent(v,ctx)).toBe(false);const req=request();Object.defineProperty(req,'rootSeed',{enumerable:true,get(){throw Error('leak');}});expect(validateResidencePlacementRequest(req)).toBe(false);expect(()=>createResidencePlacementRuntime(policy(ctx),ctx).evaluate(req)).toThrow('Invalid Residence placement request');});
});
