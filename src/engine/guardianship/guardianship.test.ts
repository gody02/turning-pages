import {describe,it,expect,vi} from 'vitest';
import {replacePerson} from '../human/person';
import {createEmptyGuardianshipState,establishGuardianship,endGuardianship,removePersonFromGuardianships} from './state';
import {validGuardianshipState,validGuardianshipWithPeople,validGuardianshipWithContext} from './validation';
import {getGuardianship,getGuardianshipsForHolder,getGuardianshipsForProtectedPerson,getCurrentGuardianshipHolders,getCurrentGuardianshipRecipients} from './queries';
import {fixtureContext,fixtureInput,fixtureRef,fixtureDate,deceased} from './fixtures';
import type {GuardianshipInputV1} from './types';
import {snapshot} from './internal';
import {createGuardianshipKindRegistry,validGuardianshipKind} from './kinds';
const create=()=>{const context=fixtureContext();return {context,...establishGuardianship(createEmptyGuardianshipState(),fixtureInput(),context)};};
describe('Guardianship legal episode authority',()=>{
  it('constructs the exact owned empty state',()=>{const a=createEmptyGuardianshipState(),b=createEmptyGuardianshipState();expect(a).toEqual({version:1,nextSequence:1,guardianships:[]});expect(a).not.toBe(b);expect(Object.isFrozen(a.guardianships)).toBe(true);});
  it('allocates exact durable episodes and resumes through terminal/pruned sequence gaps',()=>{const {context,state}=create();const second=establishGuardianship(state,fixtureInput(),context);expect(second.guardianship.id).toBe('guardianship:2');const end=endGuardianship(second.state,'guardianship:1',{endedOn:null},context);const pruned=removePersonFromGuardianships(end,'person:1',context);expect(pruned.guardianships).toEqual([]);expect(pruned.nextSequence).toBe(3);expect(establishGuardianship(pruned,fixtureInput(),context).guardianship.id).toBe('guardianship:3');});
  it('retains two genuinely distinct same-party same-kind instruments',()=>{const ctx=fixtureContext(),input=fixtureInput(),source=(recordId:string)=>({...input,basis:{kind:'source-reference' as const,sourceId:'synthetic.source',recordId,instrumentId:'shared.instrument'}});let state=establishGuardianship(createEmptyGuardianshipState(),source('grant.one'),ctx).state;state=establishGuardianship(state,source('grant.two'),ctx).state;expect(state.guardianships.map(x=>x.sequence)).toEqual([1,2]);expect(endGuardianship(state,'guardianship:1',{endedOn:null},ctx).guardianships[1].standing.kind).toBe('in-force');});
  it.each(['source-reference','authored-assertion'] as const)('rejects duplicate known %s assertions even after termination',kind=>{const ctx=fixtureContext(),input={...fixtureInput(),basis:kind==='source-reference'?{kind,sourceId:'synthetic.source',recordId:'grant.one',instrumentId:null}:{kind,assertionId:'synthetic.assertion'}};const state=establishGuardianship(createEmptyGuardianshipState(),input,ctx).state;const end=endGuardianship(state,'guardianship:1',{endedOn:null},ctx);for(const s of [state,end]){const before=JSON.stringify(s);expect(()=>establishGuardianship(s,input,ctx)).toThrow();expect(JSON.stringify(s)).toBe(before);expect(s.nextSequence).toBe(2);}});
  it('keeps source assertion scope separate from source instrument and authored namespace',()=>{const ctx=fixtureContext(),base=fixtureInput();let state=createEmptyGuardianshipState();for(const sourceId of ['source.a','source.b'])state=establishGuardianship(state,{...base,basis:{kind:'source-reference',sourceId,recordId:'same.record',instrumentId:null}},ctx).state;state=establishGuardianship(state,{...base,basis:{kind:'authored-assertion',assertionId:'same.record'}},ctx).state;expect(state.guardianships).toHaveLength(3);});
  it('records null dates unchanged and retains minimal terminal truth',()=>{const {state,context}=create(),ended=endGuardianship(state,'guardianship:1',{endedOn:null},context);expect(ended.guardianships[0]).toEqual({...state.guardianships[0],standing:{kind:'ended',endedOn:null}});expect(ended.nextSequence).toBe(state.nextSequence);expect(endGuardianship(ended,'guardianship:1',{endedOn:null},context)).toEqual(ended);});
  it('accepts same terminal date regardless of date property insertion order',()=>{const {state,context}=create(),ended=endGuardianship(state,'guardianship:1',{endedOn:fixtureDate},context);expect(endGuardianship(ended,'guardianship:1',{endedOn:{day:30,month:6,year:2024}},context)).toEqual(ended);});
  it('rejects conflicting terminal assertions and unsupported reopening/scope changes',()=>{const {state,context}=create(),ended=endGuardianship(state,'guardianship:1',{endedOn:null},context);expect(()=>endGuardianship(ended,'guardianship:1',{endedOn:fixtureDate},context)).toThrow('Conflicting');for(const end of [{endedOn:null,standing:{kind:'in-force'}},{endedOn:null,authorityKind:fixtureRef}])expect(()=>endGuardianship(ended,'guardianship:1',end as any,context)).toThrow();expect(ended.guardianships[0].standing.kind).toBe('ended');});
  it.each([NaN,Infinity,0,-1,1.5,Number.MAX_SAFE_INTEGER+1])('rejects unsafe allocator %s',nextSequence=>{const ctx=fixtureContext(),state={...createEmptyGuardianshipState(),nextSequence};expect(validGuardianshipState(state)).toBe(false);expect(()=>establishGuardianship(state,fixtureInput(),ctx)).toThrow();});
  it('fails at exhausted allocator but allows final safe continuation',()=>{const ctx=fixtureContext();expect(()=>establishGuardianship({...createEmptyGuardianshipState(),nextSequence:Number.MAX_SAFE_INTEGER},fixtureInput(),ctx)).toThrow('exhausted');const out=establishGuardianship({...createEmptyGuardianshipState(),nextSequence:Number.MAX_SAFE_INTEGER-1},fixtureInput(),ctx);expect(out.state.nextSequence).toBe(Number.MAX_SAFE_INTEGER);expect(validGuardianshipWithContext(out.state,ctx)).toBe(true);});
  it.each(['person:0','person:01','person:999','person:9007199254740992','household:1','future.slot'])('rejects invalid/missing holder and protected Person %s',id=>{const ctx=fixtureContext();for(const field of ['holderId','protectedPersonId'])expect(()=>establishGuardianship(createEmptyGuardianshipState(),{...fixtureInput(),[field]:id},ctx)).toThrow();});
  it('rejects self-authority and accepts neutral reciprocal/multi-holder structure',()=>{const ctx=fixtureContext(),base=fixtureInput();expect(()=>establishGuardianship(createEmptyGuardianshipState(),{...base,protectedPersonId:'person:1'},ctx)).toThrow();let state=createEmptyGuardianshipState();for(const [holderId,protectedPersonId] of [['person:1','person:2'],['person:2','person:1'],['person:3','person:2']])state=establishGuardianship(state,{...base,holderId,protectedPersonId},ctx).state;expect(validGuardianshipWithContext(state,ctx)).toBe(true);});
  it.each([{year:2024,month:2,day:30},{year:0,month:1,day:1},{year:10000,month:1,day:1},{year:2024,month:7,day:1},{year:2024,month:6,day:29}])('rejects invalid/future/pre-recipient-DOB commencement %j',beganOn=>{const ctx=fixtureContext(),before=createEmptyGuardianshipState();expect(()=>establishGuardianship(before,{...fixtureInput(),beganOn},ctx)).toThrow();expect(before.nextSequence).toBe(1);});
  it('accepts exact leap dates and rejects chronology violations on end',()=>{const ctx=fixtureContext(),input={...fixtureInput(),protectedPersonId:'person:2',beganOn:{year:2024,month:2,day:29}},out=establishGuardianship(createEmptyGuardianshipState(),input,ctx);for(const endedOn of [{year:2024,month:2,day:28},{year:1979,month:1,day:1},{year:2024,month:7,day:1}])expect(()=>endGuardianship(out.state,out.guardianship.id,{endedOn},ctx)).toThrow();expect(validGuardianshipWithContext(endGuardianship(out.state,out.guardianship.id,{endedOn:fixtureDate},ctx),ctx)).toBe(true);});
  it('retains deceased endpoint legal standing and permits explicit termination, not new establishment',()=>{const {state,context}=create(),ctx={...context,people:deceased(context.people,'person:1')};expect(validGuardianshipWithContext(state,ctx)).toBe(true);expect(getCurrentGuardianshipHolders(state,'person:4',ctx)).toEqual(['person:1']);expect(()=>establishGuardianship(state,fixtureInput(),ctx)).toThrow();expect(endGuardianship(state,'guardianship:1',{endedOn:null},ctx).guardianships[0].standing.kind).toBe('ended');});
  it('rejects known commencement after known death and future referenced Person dates',()=>{const {state,context}=create();const person=context.people.people[0],people=replacePerson(context.people,{...person,lifeStatus:'deceased',diedAt:{year:2024,month:6,day:29}});expect(validGuardianshipWithPeople({...state,guardianships:[{...state.guardianships[0],beganOn:fixtureDate}]},people,fixtureDate)).toBe(false);expect(validGuardianshipWithPeople(state,context.people,{year:2024,month:6,day:29})).toBe(false);});
  it('requires registry resolution for ended and unrelated grants, preserving structural acceptance',()=>{const {state,context}=create(),ended=endGuardianship(state,'guardianship:1',{endedOn:null},context),missing={...context,kinds:{version:1 as const,kinds:[],manifest:[]}};expect(validGuardianshipWithPeople(ended,context.people,fixtureDate)).toBe(true);expect(validGuardianshipWithContext(ended,missing)).toBe(false);expect(()=>getGuardianship(ended,'guardianship:999',missing)).toThrow();expect(validGuardianshipWithContext({...state,guardianships:[{...state.guardianships[0],authorityKind:{...fixtureRef,fingerprint:'fnv1a64-v1:0000000000000000'}}]},context)).toBe(false);});
  it('returns numeric sequence lists, deduplicated code-point current IDs, owned terminal-aware queries',()=>{const ctx=fixtureContext();let state=createEmptyGuardianshipState();for(const holderId of ['person:2','person:10','person:1','person:1'])state=establishGuardianship(state,{...fixtureInput(),holderId},ctx).state;expect(getCurrentGuardianshipHolders(state,'person:4',ctx)).toEqual(['person:1','person:10','person:2']);expect(getGuardianshipsForProtectedPerson(state,'person:4',ctx).map(x=>x.sequence)).toEqual([1,2,3,4]);expect(getGuardianshipsForHolder(state,'person:1',ctx)).toHaveLength(2);expect(getCurrentGuardianshipRecipients(state,'person:1',ctx)).toEqual(['person:4']);const a=getGuardianship(state,'guardianship:1',ctx)!,b=getGuardianship(state,'guardianship:1',ctx)!;expect(a).not.toBe(b);expect(a.authorityKind).not.toBe(state.guardianships[0].authorityKind);expect(Object.isFrozen(a.basis)).toBe(true);expect(getGuardianship(state,'guardianship:999',ctx)).toBeUndefined();expect(()=>getGuardianship(state,'guardianship:01',ctx)).toThrow();expect(()=>getCurrentGuardianshipHolders(state,'person:999',ctx)).toThrow();});
  it('owns candidate dates/provenance and preserves input/People on failure and success',()=>{const context=structuredClone(fixtureContext()),input={...fixtureInput(),beganOn:{...fixtureDate}},before=JSON.stringify(context),out=establishGuardianship(createEmptyGuardianshipState(),input,context);input.beganOn.day=29;(context.people.people[0] as any).name='Changed';expect(out.guardianship.beganOn).toEqual(fixtureDate);expect(out.state.guardianships[0].authorityKind).not.toBe(input.authorityKind);expect(Object.isFrozen(out.guardianship.beganOn)).toBe(true);expect(before).not.toBe(JSON.stringify(context));expect(out.state.nextSequence).toBe(2);});
  it('consumes no randomness, entropy or wall clock and is byte deterministic',()=>{const ctx=fixtureContext(),input=fixtureInput();const rng=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('random');}),time=vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('time');}),entropy=vi.spyOn(crypto,'getRandomValues').mockImplementation(()=>{throw Error('entropy');});try{expect(establishGuardianship(createEmptyGuardianshipState(),input,ctx)).toEqual(establishGuardianship(createEmptyGuardianshipState(),input,ctx));expect(rng).not.toHaveBeenCalled();expect(time).not.toHaveBeenCalled();expect(entropy).not.toHaveBeenCalled();}finally{vi.restoreAllMocks();}});
});
describe('Guardianship hostile state/input boundaries',()=>{
  it('produces byte-identical canonical dates and provenance despite object key insertion order',()=>{
    const ctx=fixtureContext(),a=fixtureInput();
    const first=establishGuardianship(createEmptyGuardianshipState(),{...a,beganOn:fixtureDate,basis:{kind:'source-reference',sourceId:'synthetic.source',recordId:'grant.one',instrumentId:null}},ctx);
    const second=establishGuardianship(createEmptyGuardianshipState(),{...a,beganOn:{day:30,year:2024,month:6},basis:{instrumentId:null,recordId:'grant.one',sourceId:'synthetic.source',kind:'source-reference'}},ctx);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(JSON.stringify(endGuardianship(first.state,first.guardianship.id,{endedOn:fixtureDate},ctx))).toBe(JSON.stringify(endGuardianship(second.state,second.guardianship.id,{endedOn:{day:30,month:6,year:2024}},ctx)));
  });
  it('rejects over-depth and excessive-array hostile snapshots without getter execution',()=>{
    const {state}=create();const deep:any=structuredClone(state);let cursor=deep;
    for(let i=0;i<42;i++){cursor.extra={};cursor=cursor.extra;}
    expect(validGuardianshipState(deep)).toBe(false);
    expect(validGuardianshipState({...state,guardianships:Array(1_000_001)})).toBe(false);
  });
  const corruptions:[string,(s:any)=>unknown][]=[
    ['wrong version',s=>({...s,version:2})],['extra root',s=>({...s,care:[]})],
    ['duplicate row',s=>({...s,nextSequence:3,guardianships:[s.guardianships[0],s.guardianships[0]]})],
    ['allocator rollback',s=>({...s,nextSequence:1})],
    ['sequence ID mismatch',s=>{s.guardianships[0].id='guardianship:02';return s;}],
    ['unknown standing',s=>{s.guardianships[0].standing={kind:'unknown'};return s;}],
    ['standing hidden payload',s=>{s.guardianships[0].standing.extra=1;return s;}],
    ['invalid tagged provenance',s=>{s.guardianships[0].basis={kind:'source-reference',sourceId:'x'};return s;}],
    ['source locator as identity',s=>{s.guardianships[0].basis={kind:'authored-assertion',assertionId:'https://invalid'};return s;}],
    ['sparse rows',s=>{s.guardianships=Array(1);return s;}],
    ['symbol',s=>{s[Symbol('x')]=1;return s;}],
    ['hidden',s=>{Object.defineProperty(s,'hidden',{value:1});return s;}],
    ['exotic prototype',s=>Object.assign(Object.create({polluted:true}),s)],
    ['class array',s=>{Object.setPrototypeOf(s.guardianships,{});return s;}],
    ['cycle',s=>{s.extra=s;return s;}],
    ['date extra',s=>{s.guardianships[0].beganOn={...fixtureDate,extra:1};return s;}],
    ['revoked proxy',s=>{const p=Proxy.revocable(s,{});p.revoke();return p.proxy;}],
    ['throwing proxy',s=>new Proxy(s,{ownKeys(){throw Error('trap');}})]
  ];
  it.each(corruptions)('rejects %s without publishing/mutating authority',(_name,corrupt)=>{const {state,context}=create(),before=JSON.stringify(state),bad=corrupt(structuredClone(state));expect(validGuardianshipState(bad)).toBe(false);expect(()=>establishGuardianship(bad as any,fixtureInput(),context)).toThrow();expect(JSON.stringify(state)).toBe(before);});
  it('rejects accessors with zero getter invocation across all boundaries',()=>{let reads=0;const {state,context}=create(),bad=structuredClone(state);Object.defineProperty(bad,'version',{enumerable:true,get(){reads++;return 1;}});expect(validGuardianshipState(bad)).toBe(false);const input:any=fixtureInput();Object.defineProperty(input,'basis',{enumerable:true,get(){reads++;return {kind:'unspecified'};}});expect(()=>establishGuardianship(state,input,context)).toThrow();const ctx:any={...context};Object.defineProperty(ctx,'people',{enumerable:true,get(){reads++;return context.people;}});expect(validGuardianshipWithContext(state,ctx)).toBe(false);expect(reads).toBe(0);});
  it('rejects unexpected termination date fields before reconstructing known dates',()=>{const {state,context}=create();expect(()=>endGuardianship(state,'guardianship:1',{endedOn:{...fixtureDate,extra:1}} as any,context)).toThrow();});
  it('rejects noncanonical row ordering and invalid referenced People/context',()=>{const {state,context}=create(),two=establishGuardianship(state,fixtureInput(),context).state;expect(validGuardianshipState({...two,guardianships:[...two.guardianships].reverse()})).toBe(false);expect(validGuardianshipWithContext(state,{...context,extra:1} as any)).toBe(false);expect(validGuardianshipWithPeople(state,{...context.people,nextSequence:999},fixtureDate)).toBe(false);});
});
 +
describe('descriptor-owned snapshot regression boundary',()=>{
  it('rejects an impossible immediate value budget before allocating per-key descriptors',()=>{
    let descriptors=0;const oversized=new Proxy({},{ownKeys(){return Array.from({length:1_000_000},(_,i)=>String(i));},getOwnPropertyDescriptor(){descriptors++;return {value:null,enumerable:true,configurable:true,writable:true};}});
    expect(()=>snapshot(oversized)).toThrow('Invalid Foundation JSON.');expect(descriptors).toBe(0);
  });
  const attack=(change:(root:any,target:any,key:PropertyKey)=>void,at=2)=>{
    const root:any={version:1,nested:null};let getters=0,traps=0;
    const getter=()=>{getters++;return 1;};
    root.nested=new Proxy({token:'data'},{getOwnPropertyDescriptor(target,key){
      if(key==='token'&&++traps===at)change(root,{target,getter},key);
      return Reflect.getOwnPropertyDescriptor(target,key);
    }});
    return {root,counts:()=>({getters,traps})};
  };
  it.each([1,2])('rejects ancestor data-to-accessor replacement on descriptor pass %s without getter execution',at=>{
    const probe=attack((root,{getter})=>Object.defineProperty(root,'version',{enumerable:true,configurable:true,get:getter}),at);
    expect(()=>snapshot(probe.root)).toThrow('Invalid Foundation JSON.');expect(probe.counts().getters).toBe(0);expect(probe.counts().traps).toBe(2);
  });
  it.each(['insert','delete','replace-data','prototype'])('rejects observable %s mutation rather than publishing a repaired snapshot',mode=>{
    const probe=attack(root=>{if(mode==='insert')root.extra=true;else if(mode==='delete')delete root.version;else if(mode==='replace-data')root.version=2;else Object.setPrototypeOf(root,{inherited:true});},1);
    expect(()=>snapshot(probe.root)).toThrow('Invalid Foundation JSON.');expect(probe.counts().getters).toBe(0);
  });
  it('captures proxy-reported data without any subsequent ordinary property get',()=>{
    let gets=0,descriptors=0;const original=new Proxy({value:{text:'owned'}},{get(){gets++;throw Error('unsafe get');},getOwnPropertyDescriptor(target,key){descriptors++;return Reflect.getOwnPropertyDescriptor(target,key);}});
    const owned=snapshot(original);expect(owned).toEqual({value:{text:'owned'}});expect(owned.value).not.toBe(Reflect.getOwnPropertyDescriptor(original,'value')!.value);
    expect(gets).toBe(0);expect(descriptors).toBeGreaterThan(0);
  });
  it('rejects dynamically replaced array elements without invoking accessors',()=>{
    let getters=0;const array:any[]=[null];array[0]=new Proxy({value:1},{getOwnPropertyDescriptor(target,key){if(key==='value')Object.defineProperty(array,'0',{enumerable:true,configurable:true,get(){getters++;return target;}});return Reflect.getOwnPropertyDescriptor(target,key);}});
    expect(()=>snapshot(array)).toThrow('Invalid Foundation JSON.');expect(getters).toBe(0);
  });
  it('captures array length by descriptor and rejects length changes during nested inspection',()=>{
    let gets=0;const proxy=new Proxy([1,2],{get(){gets++;throw Error('unsafe array get');}});expect(snapshot(proxy)).toEqual([1,2]);expect(gets).toBe(0);
    const array:any[]=[null];array[0]=new Proxy({value:1},{getOwnPropertyDescriptor(target,key){array.length=2;return Reflect.getOwnPropertyDescriptor(target,key);}});
    expect(()=>snapshot(array)).toThrow('Invalid Foundation JSON.');
  });
  it.each(['revoked','throw-ownKeys','throw-descriptor','throw-prototype'])('fails %s inspection with the stable private error',mode=>{
    let input:unknown;
    if(mode==='revoked'){const proxy=Proxy.revocable({},{});proxy.revoke();input=proxy.proxy;}
    else input=new Proxy({},mode==='throw-ownKeys'?{ownKeys(){throw Error('trap');}}:mode==='throw-descriptor'?{ownKeys(){return ['key'];},getOwnPropertyDescriptor(){throw Error('trap');}}:{getPrototypeOf(){throw Error('trap');}});
    expect(()=>snapshot(input)).toThrow('Invalid Foundation JSON.');
  });
  it('fails revocation during descriptor inspection without later gets',()=>{
    let gets=0;const proxy=Proxy.revocable({value:1},{get(){gets++;throw Error('get');},getOwnPropertyDescriptor(target,key){proxy.revoke();return Reflect.getOwnPropertyDescriptor(target,key);}});
    expect(()=>snapshot(proxy.proxy)).toThrow('Invalid Foundation JSON.');expect(gets).toBe(0);
  });
  it('owns null-prototype data, special keys and nested aliases without pollution or toJSON execution',()=>{
    let calls=0;const input:any=Object.create(null);Object.defineProperty(input,'__proto__',{value:{polluted:true},enumerable:true});input.data={values:[]};
    const owned=snapshot(input);expect(Object.getPrototypeOf(owned)).toBe(Object.prototype);expect(Object.prototype.hasOwnProperty.call(owned,'__proto__')).toBe(true);expect(({} as any).polluted).toBeUndefined();
    input.data.values.push('later');expect(owned.data.values).toEqual([]);
    expect(()=>snapshot({toJSON(){calls++;return {};}})).toThrow();expect(calls).toBe(0);
  });
  it.each([undefined,NaN,Infinity,1n,Symbol('value'),()=>1,new Date(0),new Map(),new Uint8Array(1)])('rejects unsupported JSON value %s',value=>{
    expect(()=>snapshot({nested:value})).toThrow('Invalid Foundation JSON.');
  });
  it('preserves finite negative zero at snapshot level and rejects cycles without freezing caller data',()=>{
    const original={empty:[],nested:{value:-0}},owned=snapshot(original);expect(Object.is(owned.nested.value,-0)).toBe(true);expect(Object.isFrozen(original)).toBe(false);expect(owned.empty).not.toBe(original.empty);
    const cycle:any={};cycle.self=cycle;expect(()=>snapshot(cycle)).toThrow();
  });
});

describe('public Guardianship descriptor-mutation regressions',()=>{
  const malicious=()=>{
    const {state:valid,context}=create(),state:any=structuredClone(valid);let getters=0,traps=0;
    state.guardianships[0].standing=new Proxy({kind:'in-force'},{getOwnPropertyDescriptor(target,key){
      if(key==='kind'&&++traps===2)Object.defineProperty(state,'version',{enumerable:true,configurable:true,get(){getters++;return 1;}});
      return Reflect.getOwnPropertyDescriptor(target,key);
    }});return {state,context,counts:()=>({getters,traps})};
  };
  it.each(['structure','People','content','create','end','prune','record-query','holder-query','recipient-query','current-holders','current-recipients'])('rejects mutation in %s without getter or published candidate',entry=>{
    const {state,context,counts}=malicious(),before=JSON.stringify(context),owned=create(),earlier=getGuardianship(owned.state,'guardianship:1',owned.context);
    const run=()=>{switch(entry){
      case 'structure':return validGuardianshipState(state);case 'People':return validGuardianshipWithPeople(state,context.people,context.referenceDate);case 'content':return validGuardianshipWithContext(state,context);
      case 'create':return establishGuardianship(state,fixtureInput(),context);case 'end':return endGuardianship(state,'guardianship:1',{endedOn:null},context);case 'prune':return removePersonFromGuardianships(state,'person:1',context);
      case 'record-query':return getGuardianship(state,'guardianship:1',context);case 'holder-query':return getGuardianshipsForHolder(state,'person:1',context);case 'recipient-query':return getGuardianshipsForProtectedPerson(state,'person:4',context);
      case 'current-holders':return getCurrentGuardianshipHolders(state,'person:4',context);default:return getCurrentGuardianshipRecipients(state,'person:1',context);
    }};
    if(['structure','People','content'].includes(entry))expect(run()).toBe(false);else expect(run).toThrow(/Invalid Guardianship/);
    expect(counts()).toEqual({getters:0,traps:2});expect(JSON.stringify(context)).toBe(before);expect(state.nextSequence).toBe(2);expect(earlier).toEqual(owned.state.guardianships[0]);expect(Object.isFrozen(earlier)).toBe(true);
  });
  it.each(['input','end-date','People','registry'])('rejects nested %s mutation without consuming a grant sequence',entry=>{
    const {state,context}=create(),before=JSON.stringify({state,context});let getters=0;const args:any=structuredClone(fixtureInput()),ctx:any=structuredClone(context),end:any={endedOn:{year:2024,month:6,day:30}};
    let ancestor:any,key:string,nested:any;
    if(entry==='input'){ancestor=args;key='holderId';nested=args.basis;args.basis=new Proxy(nested,{getOwnPropertyDescriptor(target,property){Object.defineProperty(ancestor,key,{enumerable:true,configurable:true,get(){getters++;return 'person:1';}});return Reflect.getOwnPropertyDescriptor(target,property);}});}
    else if(entry==='end-date'){ancestor=end;key='endedOn';nested=end.endedOn;end.endedOn=new Proxy(nested,{getOwnPropertyDescriptor(target,property){Object.defineProperty(ancestor,key,{enumerable:true,configurable:true,get(){getters++;return nested;}});return Reflect.getOwnPropertyDescriptor(target,property);}});}
    else {ancestor=entry==='People'?ctx.people:ctx.kinds;key='version';const rows=entry==='People'?ancestor.people:ancestor.kinds;rows[0]=new Proxy(rows[0],{getOwnPropertyDescriptor(target,property){Object.defineProperty(ancestor,key,{enumerable:true,configurable:true,get(){getters++;return 1;}});return Reflect.getOwnPropertyDescriptor(target,property);}});}
    expect(()=>entry==='end-date'?endGuardianship(state,'guardianship:1',end,ctx):establishGuardianship(state,args,ctx)).toThrow();expect(getters).toBe(0);expect(JSON.stringify({state,context})).toBe(before);expect(state.nextSequence).toBe(2);
  });
  it('rejects mutated legal kind content through validation and registry construction',()=>{
    for(const operation of ['kind','registry']){let getters=0;const context:any=structuredClone(fixtureContext()),kind=context.kinds.kinds[0];kind.limitations[0]=new Proxy({text:'bad'},{getOwnPropertyDescriptor(target,key){Object.defineProperty(kind,'version',{enumerable:true,configurable:true,get(){getters++;return 1;}});return Reflect.getOwnPropertyDescriptor(target,key);}});
      if(operation==='kind')expect(validGuardianshipKind(kind)).toBe(false);else expect(()=>createGuardianshipKindRegistry(context.kinds.kinds,context.kinds.manifest)).toThrow();expect(getters).toBe(0);
    }
  });
});
