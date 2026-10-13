import {describe,it,expect,vi} from 'vitest';
import {createEmptyCareState,establishCare,setCareRole,endCare,removePersonFromCare} from './state';
import {validCareState,validCareWithPeople} from './validation';
import {getCareResponsibility,getCareProviders,getCareRecipients} from './queries';
import {fixtureContext,fixtureDate,deceased} from './fixtures';
import {snapshot} from './internal';
const populated=()=>{const context=fixtureContext();return {context,state:establishCare(createEmptyCareState(),'person:1','person:2','principal',context)};};
describe('Care current directed responsibility',()=>{
  it('creates exact empty state without allocator or IDs',()=>{const a=createEmptyCareState(),b=createEmptyCareState();expect(a).toEqual({version:1,responsibilities:[]});expect(a).not.toBe(b);expect(Object.isFrozen(a.responsibilities)).toBe(true);});
  it('establishes repeat idempotently with independent ownership',()=>{const {state,context}=populated(),next=establishCare(state,'person:1','person:2','principal',context);expect(next).toEqual(state);expect(next).not.toBe(state);expect(next.responsibilities[0]).not.toBe(state.responsibilities[0]);});
  it('requires explicit role setter and does not manufacture missing responsibilities',()=>{const {state,context}=populated();expect(()=>establishCare(state,'person:1','person:2','unspecified',context)).toThrow('Conflicting');const next=setCareRole(state,'person:1','person:2','unspecified',context);expect(next.responsibilities[0].role).toBe('unspecified');expect(setCareRole(next,'person:1','person:2','unspecified',context)).toEqual(next);expect(()=>setCareRole(state,'person:2','person:1','principal',context)).toThrow('Unknown');expect(state.responsibilities[0].role).toBe('principal');});
  it('ends current pair with owned absent-pair no-op and no terminal history',()=>{const {state,context}=populated();const empty=endCare(state,'person:1','person:2',context);expect(empty).toEqual(createEmptyCareState());expect(endCare(empty,'person:1','person:2',context)).toEqual(empty);expect(state.responsibilities).toHaveLength(1);});
  it('allows multiple principals, recipients, reciprocity and adult roles without capacity inference',()=>{const ctx=fixtureContext();let state=createEmptyCareState();for(const [a,b] of [['person:1','person:2'],['person:3','person:2'],['person:2','person:1'],['person:1','person:3']])state=establishCare(state,a,b,'principal',ctx);expect(validCareWithPeople(state,ctx.people,fixtureDate)).toBe(true);expect(getCareProviders(state,'person:2',ctx)).toHaveLength(2);expect(getCareRecipients(state,'person:1',ctx)).toHaveLength(2);expect(Object.keys(state.responsibilities[0])).toEqual(['caregiverId','recipientId','role']);});
  it.each(['person:0','person:01','person:999','person:9007199254740992','future.slot','institution:1'])('rejects malformed/missing endpoint %s',id=>{const ctx=fixtureContext();for(const [a,b] of [[id,'person:2'],['person:1',id]])expect(()=>establishCare(createEmptyCareState(),a,b,'principal',ctx)).toThrow();});
  it('rejects self and unsupported role across establishment/set/end/query',()=>{const {state,context}=populated();expect(()=>establishCare(state,'person:1','person:1','principal',context)).toThrow();expect(()=>establishCare(state,'person:1','person:3','exclusive' as any,context)).toThrow();expect(()=>setCareRole(state,'person:1','person:2','primary' as any,context)).toThrow();expect(()=>endCare(state,'person:1','person:1',context)).toThrow();expect(()=>getCareResponsibility(state,'person:1','person:1',context)).toThrow();});
  it.each(['person:1','person:2'])('cleans deceased %s in both directions and preserves unrelated living edges',id=>{const {state,context}=populated();let all=establishCare(state,'person:2','person:1','unspecified',context);all=establishCare(all,'person:3','person:4','principal',context);const ctx={...context,people:deceased(context.people,id)},before=JSON.stringify(all);expect(validCareWithPeople(all,ctx.people,fixtureDate)).toBe(false);expect(()=>endCare(all,'person:1','person:2',ctx)).toThrow();const cleaned=removePersonFromCare(all,id,ctx);expect(cleaned.responsibilities).toEqual([{caregiverId:'person:3',recipientId:'person:4',role:'principal'}]);expect(ctx.people.people.find(x=>x.id===id)!.lifeStatus).toBe('deceased');expect(JSON.stringify(all)).toBe(before);});
  it('rejects unrelated stale death, missing target, and malformed original during cleanup',()=>{const {state,context}=populated(),ctx={...context,people:deceased(context.people,'person:2')};expect(()=>removePersonFromCare(state,'person:3',ctx)).toThrow();expect(()=>removePersonFromCare(state,'person:999',context)).toThrow();expect(()=>removePersonFromCare({...state,responsibilities:[state.responsibilities[0],state.responsibilities[0]]},'person:2',ctx)).toThrow();});
  it('supports living-target deletion preparation without modifying People',()=>{const {state,context}=populated(),before=JSON.stringify(context.people);expect(removePersonFromCare(state,'person:1',context)).toEqual(createEmptyCareState());expect(JSON.stringify(context.people)).toBe(before);});
  it('rejects invalid reference dates, future DOB/death and strict context extras',()=>{const {state,context}=populated();for(const date of [{year:2024,month:2,day:30},{year:1979,month:1,day:1}])expect(validCareWithPeople(state,context.people,date)).toBe(false);expect(()=>endCare(state,'person:1','person:2',{...context,extra:true} as any)).toThrow();expect(validCareWithPeople(state,deceased(context.people,'person:1'),{year:2024,month:6,day:29})).toBe(false);});
  it('orders directed rows code-point independent of creation order',()=>{const ctx=fixtureContext(),pairs=[['person:2','person:3'],['person:10','person:3'],['person:1','person:3']];const build=(order:string[][])=>order.reduce((s,[a,b])=>establishCare(s,a,b,'principal',ctx),createEmptyCareState());const a=build(pairs),b=build([...pairs].reverse());expect(a).toEqual(b);expect(a.responsibilities.map(x=>x.caregiverId)).toEqual(['person:1','person:10','person:2']);expect(validCareState({...a,responsibilities:[...a.responsibilities].reverse()})).toBe(false);});
  it('returns frozen independently owned queries including absent results',()=>{const {state,context}=populated(),a=getCareResponsibility(state,'person:1','person:2',context)!,b=getCareResponsibility(state,'person:1','person:2',context)!;expect(a).not.toBe(b);expect(a).not.toBe(state.responsibilities[0]);expect(Object.isFrozen(a)).toBe(true);expect(getCareProviders(state,'person:2',context)).toEqual([a]);expect(getCareRecipients(state,'person:1',context)).toEqual([a]);expect(getCareResponsibility(state,'person:2','person:1',context)).toBeUndefined();expect(()=>getCareProviders(state,'person:999',context)).toThrow();expect(()=>{(a as any).role='unspecified';}).toThrow();});
  it('preserves input/context and consumes no mutable entropy or time',()=>{const ctx=fixtureContext(),before=JSON.stringify(ctx);const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('random');}),time=vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('time');}),entropy=vi.spyOn(crypto,'getRandomValues').mockImplementation(()=>{throw Error('entropy');});try{const a=establishCare(createEmptyCareState(),'person:1','person:2','principal',ctx),b=establishCare(createEmptyCareState(),'person:1','person:2','principal',ctx);expect(a).toEqual(b);expect(JSON.stringify(ctx)).toBe(before);expect(random).not.toHaveBeenCalled();expect(time).not.toHaveBeenCalled();expect(entropy).not.toHaveBeenCalled();}finally{vi.restoreAllMocks();}});
});
describe('Care hostile input rejection',()=>{
  it('rejects over-depth and excessive-array hostile snapshots',()=>{
    const {state}=populated();const deep:any=structuredClone(state);let cursor=deep;
    for(let i=0;i<42;i++){cursor.extra={};cursor=cursor.extra;}
    expect(validCareState(deep)).toBe(false);
    expect(validCareState({...state,responsibilities:Array(1_000_001)})).toBe(false);
  });
  it('does not rewrite or normalize an unrelated noncanonical original during ordinary transitions',()=>{
    const {state,context}=populated(),two=establishCare(state,'person:3','person:4','unspecified',context),bad={...two,responsibilities:[...two.responsibilities].reverse()},before=JSON.stringify(bad);
    expect(()=>endCare(bad,'person:1','person:2',context)).toThrow();
    expect(JSON.stringify(bad)).toBe(before);
  });
  const corruptions:[string,(s:any)=>unknown][]=[
    ['version',s=>({...s,version:2})],['unexpected allocator',s=>({...s,nextSequence:1})],
    ['duplicate pair',s=>({...s,responsibilities:[s.responsibilities[0],s.responsibilities[0]]})],
    ['invalid role',s=>{s.responsibilities[0].role='primary';return s;}],
    ['self',s=>{s.responsibilities[0].recipientId='person:1';return s;}],
    ['malformed Person',s=>{s.responsibilities[0].caregiverId='person:01';return s;}],
    ['extra row',s=>{s.responsibilities[0].hours=1;return s;}],
    ['sparse',s=>{s.responsibilities=Array(2);return s;}],
    ['symbol',s=>{s[Symbol('bad')]=1;return s;}],
    ['hidden',s=>{Object.defineProperty(s,'hidden',{value:true});return s;}],
    ['prototype',s=>Object.assign(Object.create({polluted:true}),s)],
    ['cycle',s=>{s.extra=s;return s;}],
    ['revoked proxy',s=>{const p=Proxy.revocable(s,{});p.revoke();return p.proxy;}],
    ['throwing proxy',s=>new Proxy(s,{getPrototypeOf(){throw Error('trap');}})]
  ];
  it.each(corruptions)('rejects %s predictably and preserves valid original',(_label,corrupt)=>{const {state,context}=populated(),before=JSON.stringify(state),bad=corrupt(structuredClone(state));expect(validCareState(bad)).toBe(false);expect(()=>removePersonFromCare(bad as any,'person:1',context)).toThrow();expect(JSON.stringify(state)).toBe(before);});
  it('does not invoke getters in state, rows or context',()=>{let reads=0;const {state,context}=populated();for(const target of ['root','row','context']){const s:any=structuredClone(state),ctx:any={...context};const obj=target==='root'?s:target==='row'?s.responsibilities[0]:ctx,key=target==='root'?'version':target==='row'?'role':'people';Object.defineProperty(obj,key,{enumerable:true,get(){reads++;throw Error('getter');}});expect(()=>establishCare(s,'person:1','person:2','principal',ctx)).toThrow();}expect(reads).toBe(0);});
  it('returns an owned query unaffected by subsequent source/People mutation',()=>{const {state,context}=populated(),source=structuredClone(state),ctx=structuredClone(context),out=getCareResponsibility(source,'person:1','person:2',ctx)!;(source.responsibilities[0] as any).role='unspecified';(ctx.people.people[0] as any).name='Changed';expect(out.role).toBe('principal');expect(Object.isFrozen(out)).toBe(true);});
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

describe('public Care descriptor-mutation regressions',()=>{
  it.each(['structure','People','create','role','end','cleanup','record-query','providers','recipients'])('rejects mutation in %s without getters or candidate state',entry=>{
    const {state:valid,context}=populated(),state:any=structuredClone(valid),before=JSON.stringify(context);let getters=0,traps=0;
    state.responsibilities[0]=new Proxy(state.responsibilities[0],{getOwnPropertyDescriptor(target,key){if(key==='role'&&++traps===2)Object.defineProperty(state,'version',{enumerable:true,configurable:true,get(){getters++;return 1;}});return Reflect.getOwnPropertyDescriptor(target,key);}});
    const earlier=getCareProviders(valid,'person:2',context),run=()=>{switch(entry){
      case 'structure':return validCareState(state);case 'People':return validCareWithPeople(state,context.people,context.referenceDate);
      case 'create':return establishCare(state,'person:1','person:2','principal',context);case 'role':return setCareRole(state,'person:1','person:2','unspecified',context);case 'end':return endCare(state,'person:1','person:2',context);case 'cleanup':return removePersonFromCare(state,'person:2',context);
      case 'record-query':return getCareResponsibility(state,'person:1','person:2',context);case 'providers':return getCareProviders(state,'person:2',context);default:return getCareRecipients(state,'person:1',context);
    }};
    if(['structure','People'].includes(entry))expect(run()).toBe(false);else expect(run).toThrow(/Invalid Care/);
    expect(getters).toBe(0);expect(traps).toBe(2);expect(JSON.stringify(context)).toBe(before);expect(earlier).toEqual(valid.responsibilities);expect(Object.isFrozen(earlier[0])).toBe(true);expect(valid.responsibilities).toHaveLength(1);
  });
  it('rejects dynamic People context accessors before cleanup can remove any record',()=>{
    const {state,context}=populated(),before=JSON.stringify({state,context}),ctx:any=structuredClone(context);let getters=0;
    ctx.people.people[0]=new Proxy(ctx.people.people[0],{getOwnPropertyDescriptor(target,key){Object.defineProperty(ctx.people,'version',{enumerable:true,configurable:true,get(){getters++;return 1;}});return Reflect.getOwnPropertyDescriptor(target,key);}});
    expect(()=>removePersonFromCare(state,'person:2',ctx)).toThrow(/Invalid Care/);expect(getters).toBe(0);expect(JSON.stringify({state,context})).toBe(before);
  });
});
