import {describe,expect,it,vi} from 'vitest';
import {createEmptyPartnershipState,establishPartnership,endPartnership,removePersonFromPartnerships} from './state';
import {getPartnership,getCurrentPartners,arePartners} from './queries';
import {validPartnershipState,validPartnershipWithPeople} from './validation';
import {fixtureContext} from './fixtures';
import type {PartnershipStateV1,PartnershipValidationContext} from './types';

const state=(pairs:readonly (readonly [string,string])[]):PartnershipStateV1=>({version:1,partnerships:pairs.map(personIds=>({personIds}))});
const populated=()=>establishPartnership(createEmptyPartnershipState(),'person:1','person:2',fixtureContext());
describe('Partnership current mutual dyads',()=>{
  it('creates exact independently owned frozen empty states without allocator',()=>{
    const a=createEmptyPartnershipState(),b=createEmptyPartnershipState();
    expect(a).toEqual({version:1,partnerships:[]});expect(a).not.toBe(b);expect(a.partnerships).not.toBe(b.partnerships);
    expect(Object.isFrozen(a.partnerships)).toBe(true);expect(validPartnershipWithPeople(a,fixtureContext().people,fixtureContext().referenceDate)).toBe(true);
  });
  it('uses symmetric pair identity and idempotent owned establishment',()=>{
    const ctx=fixtureContext(),a=establishPartnership(createEmptyPartnershipState(),'person:2','person:1',ctx),b=establishPartnership(a,'person:1','person:2',ctx);
    expect(a).toEqual(state([['person:1','person:2']]));expect(b).toEqual(a);expect(b).not.toBe(a);expect(b.partnerships[0]).not.toBe(a.partnerships[0]);
    expect(arePartners(a,'person:2','person:1',ctx)).toBe(true);
  });
  it('orders Person identities lexically by code point rather than sequence',()=>{
    const ctx=fixtureContext(),a=establishPartnership(createEmptyPartnershipState(),'person:2','person:10',ctx);
    expect(a.partnerships[0].personIds).toEqual(['person:10','person:2']);
  });
  it('supports triangle and V structures without exclusivity assumptions',()=>{
    const ctx=fixtureContext();let s=createEmptyPartnershipState();
    for(const [a,b] of [[1,2],[1,3],[2,3]])s=establishPartnership(s,`person:${a}`,`person:${b}`,ctx);
    expect(getCurrentPartners(s,'person:1',ctx)).toEqual(['person:2','person:3']);expect(s.partnerships).toHaveLength(3);
  });
  it('matches an independent pair-set oracle for all 64 four-Person graphs and both command orders',()=>{
    const ctx=fixtureContext(4),edges=[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]];
    for(let mask=0;mask<64;mask++){
      const selected=edges.filter((_edge,index)=>(mask&(1<<index))!==0);
      let forward=createEmptyPartnershipState(),reverse=createEmptyPartnershipState();
      for(const [a,b] of selected)forward=establishPartnership(forward,`person:${a}`,`person:${b}`,ctx);
      for(const [a,b] of [...selected].reverse())reverse=establishPartnership(reverse,`person:${b}`,`person:${a}`,ctx);
      expect(JSON.stringify(forward)).toBe(JSON.stringify(reverse));
      for(let person=1;person<=4;person++)expect(getCurrentPartners(forward,`person:${person}`,ctx)).toEqual(selected.flatMap(([a,b])=>a===person?[`person:${b}`]:b===person?[`person:${a}`]:[]).sort());
      for(const [a,b] of edges)expect(arePartners(forward,`person:${a}`,`person:${b}`,ctx)).toBe(selected.some(([x,y])=>a===x&&b===y));
    }
  });
  it('removes only current truth and preserves no former timeline',()=>{
    const ctx=fixtureContext(),a=populated(),b=endPartnership(a,'person:2','person:1',ctx);
    expect(b).toEqual(createEmptyPartnershipState());expect(endPartnership(b,'person:1','person:2',ctx)).toEqual(b);expect(a.partnerships).toHaveLength(1);
  });
  it('queries known absence while rejecting unknown/self endpoints',()=>{
    const ctx=fixtureContext(),s=createEmptyPartnershipState();
    expect(getPartnership(s,'person:1','person:2',ctx)).toBeUndefined();expect(getCurrentPartners(s,'person:1',ctx)).toEqual([]);expect(arePartners(s,'person:1','person:2',ctx)).toBe(false);
    expect(()=>getCurrentPartners(s,'person:99',ctx)).toThrow();expect(()=>getPartnership(s,'person:1','person:1',ctx)).toThrow();
  });
  it.each(['person:0','person:01','person:-1','person:1.0','person:9007199254740992','person:99','future.slot'])('rejects nonactual identity %s atomically',id=>{
    const ctx=fixtureContext(),s=populated(),before=JSON.stringify({s,ctx});
    expect(()=>establishPartnership(s,'person:1',id,ctx)).toThrow();expect(JSON.stringify({s,ctx})).toBe(before);
  });
  it('rejects self partnership',()=>expect(()=>establishPartnership(createEmptyPartnershipState(),'person:1','person:1',fixtureContext())).toThrow());
  it('validates structure separately from living existence',()=>{
    const s=populated(),dead=fixtureContext(12,[2]);
    expect(validPartnershipState(s)).toBe(true);expect(validPartnershipWithPeople(s,dead.people,dead.referenceDate)).toBe(false);
    expect(()=>establishPartnership(createEmptyPartnershipState(),'person:1','person:2',dead)).toThrow();
    expect(()=>endPartnership(s,'person:1','person:2',dead)).toThrow();
  });
  it('permits only selected stale death pairs for cleanup',()=>{
    const s=populated(),ctx=fixtureContext(12,[2]);
    const next=removePersonFromPartnerships(s,'person:2',ctx);
    expect(next).toEqual(createEmptyPartnershipState());expect(ctx.people.people[1].lifeStatus).toBe('deceased');expect(s.partnerships).toHaveLength(1);
    expect(()=>removePersonFromPartnerships(s,'person:1',ctx)).toThrow();
  });
  it('rejects unrelated dead-pair corruption during selected cleanup',()=>{
    const s=state([['person:1','person:2'],['person:3','person:4']]);
    expect(()=>removePersonFromPartnerships(s,'person:2',fixtureContext(12,[2,4]))).toThrow();
  });
  it('resolves all endpoints even when their pairs would be removed',()=>{
    expect(()=>removePersonFromPartnerships(state([['person:1','person:99']]),'person:1',fixtureContext())).toThrow();
  });
  it('supports living cleanup and absent-member cleanup without deleting Persons',()=>{
    const ctx=fixtureContext(),s=populated();
    expect(removePersonFromPartnerships(s,'person:3',ctx)).toEqual(s);expect(removePersonFromPartnerships(s,'person:1',ctx).partnerships).toEqual([]);expect(ctx.people.people).toHaveLength(12);
  });
  it('rejects future DOB/current date mismatch, including malformed reference dates',()=>{
    const ctx=fixtureContext();const early={...ctx,referenceDate:{year:1999,month:1,day:1}};
    expect(validPartnershipWithPeople(populated(),early.people,early.referenceDate)).toBe(false);
    expect(()=>establishPartnership(createEmptyPartnershipState(),'person:1','person:2',early)).toThrow();
    expect(()=>getCurrentPartners(populated(),'person:1',{...ctx,referenceDate:{year:2032,month:2,day:30}})).toThrow();
  });
  it('imposes no adult age or gender eligibility rule',()=>{
    const ctx=fixtureContext();const people={...ctx.people,people:ctx.people.people.map(p=>({...p,dateOfBirth:ctx.referenceDate,genderLabel:'same identity label'}))};
    expect(establishPartnership(createEmptyPartnershipState(),'person:1','person:2',{...ctx,people}).partnerships).toHaveLength(1);
  });
  it('returns deep frozen owned queries with no caller aliases',()=>{
    const ctx=fixtureContext(),s=structuredClone(populated()),record=getPartnership(s,'person:1','person:2',ctx)!;
    (s.partnerships[0].personIds as unknown as string[])[0]='person:3';expect(record.personIds).toEqual(['person:1','person:2']);
    expect(()=>{(record.personIds as unknown as string[])[0]='person:3';}).toThrow();
  });
  it('canonicalizes allowed object-key order and pair command order to identical bytes',()=>{
    const ctx=fixtureContext(),a=establishPartnership({partnerships:[],version:1},'person:2','person:1',ctx),b=establishPartnership(createEmptyPartnershipState(),'person:1','person:2',ctx);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('leaves People and unrelated authority unchanged and consumes no entropy',()=>{
    const ctx=fixtureContext(),other={household:[],kinship:[],residence:[],history:[],events:[],causality:[],rng:{seed:73}},before=JSON.stringify({ctx,other});
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('entropy');}),now=vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('wall clock');});
    try{const s=populated();endPartnership(s,'person:1','person:2',ctx);expect(JSON.stringify({ctx,other})).toBe(before);}finally{random.mockRestore();now.mockRestore();}
  });
  it('validates moderate actual identity scale without Population traversal',()=>{
    const ctx=fixtureContext(1000),pairs=Array.from({length:499},(_,i)=>[`person:${i+1}`,`person:${i+501}`].sort() as [string,string]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[1]<b[1]?-1:1),s=state(pairs);
    expect(validPartnershipWithPeople(s,ctx.people,ctx.referenceDate)).toBe(true);expect(getCurrentPartners(s,'person:1',ctx)).toEqual(['person:501']);
  });
});
describe('Partnership hostile and noncanonical structures',()=>{
  const bad:unknown[]=[
    null,{version:2,partnerships:[]},{version:1,partnerships:[],extra:0},
    state([['person:2','person:1']]),state([['person:1','person:1']]),state([['person:1','person:2'],['person:1','person:2']]),
    state([['person:2','person:3'],['person:1','person:2']]),{version:1,partnerships:[{personIds:['person:1','person:2'],extra:1}]},
    {version:1,partnerships:[{personIds:['person:1','person:2','person:3']}]},{version:1,partnerships:new Array(1)},
    {version:1,partnerships:[{personIds:['person:1',NaN]}]},Object.assign(Object.create({}),{version:1,partnerships:[]})
  ];
  it.each(bad.map((value,index)=>({value,index})))('rejects malformed case $index',({value})=>expect(validPartnershipState(value)).toBe(false));
  it('rejects getters without executing them, hidden/symbol fields and transparent/revoked proxies',()=>{
    let calls=0;const getter={version:1,get partnerships(){calls++;return [];}};
    const hidden=Object.defineProperty({version:1,partnerships:[]},'extra',{value:1}),symbol={version:1,partnerships:[],[Symbol('x')]:1};
    const revoked=Proxy.revocable({},{});revoked.revoke();
    for(const value of [getter,hidden,symbol,new Proxy(createEmptyPartnershipState(),{}),revoked.proxy])expect(validPartnershipState(value)).toBe(false);
    expect(calls).toBe(0);
  });
  it('rejects custom array prototypes, cycles, excessive depth and poisoned context',()=>{
    const array=Object.setPrototypeOf([],null),cycle:any={version:1,partnerships:[]};cycle.partnerships.push(cycle);
    expect(validPartnershipState({version:1,partnerships:array})).toBe(false);expect(validPartnershipState(cycle)).toBe(false);
    let deep:any=[];for(let i=0;i<45;i++)deep=[deep];expect(validPartnershipState({version:1,partnerships:deep})).toBe(false);
    expect(()=>getCurrentPartners(populated(),'person:1',{...fixtureContext(),extra:1} as PartnershipValidationContext)).toThrow();
  });
  it('rejects oversized hostile arrays before visiting their contents',()=>{
    expect(validPartnershipState({version:1,partnerships:new Array(1_000_001)})).toBe(false);
  });
});
