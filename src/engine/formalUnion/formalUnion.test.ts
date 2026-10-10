import {describe,expect,it,vi} from 'vitest';
import {createEmptyFormalUnionState,createFormalUnion,setFormalUnionSeparation,endFormalUnion,removePersonFromFormalUnions} from './state';
import {getFormalUnion,getFormalUnionsForPerson,getInForceFormalUnionsForPerson,getInForceFormalUnionsBetween,getSurvivingFormalUnionAssociations} from './queries';
import {validFormalUnionState,validFormalUnionWithPeople,validFormalUnionWithContext} from './validation';
import {fixtureContext,fixtureInput} from './fixtures';
import type {FormalUnionEndV1,FormalUnionInputV1,FormalUnionStateV1} from './types';
const populated=(ctx=fixtureContext())=>createFormalUnion(createEmptyFormalUnionState(),fixtureInput(),ctx).state;
const terminal:FormalUnionEndV1={reason:'dissolution',endedOn:{year:2031,month:6,day:30}};

describe('Formal Union independently identified contract standing',()=>{
  it('owns exact independent frozen empty states',()=>{
    const a=createEmptyFormalUnionState(),b=createEmptyFormalUnionState();
    expect(a).toEqual({version:1,nextSequence:1,unions:[]});expect(a).not.toBe(b);expect(a.unions).not.toBe(b.unions);expect(Object.isFrozen(a.unions)).toBe(true);
  });
  it('allocates a contract with canonical pair, supplied effective date and unknown separation',()=>{
    const result=createFormalUnion(createEmptyFormalUnionState(),fixtureInput(2,1),fixtureContext());
    expect(result.union).toEqual({id:'formal-union:1',sequence:1,personIds:['person:1','person:2'],kindId:fixtureInput().kindId,formedOn:fixtureInput().formedOn,standing:{kind:'in-force',separation:'unknown'}});
    expect(result.state.nextSequence).toBe(2);expect(result.union).not.toBe(result.state.unions[0]);expect(Object.isFrozen(result.union.personIds)).toBe(true);
  });
  it('supports unknown formation dates without filling referenceDate',()=>{
    const s=createFormalUnion(createEmptyFormalUnionState(),{...fixtureInput(),formedOn:null},fixtureContext()).state;
    expect(s.unions[0].formedOn).toBeNull();
  });
  it.each(['unknown','not-separated','separated'] as const)('sets explicit separation %s without closing formal standing',separation=>{
    const ctx=fixtureContext(),s=populated(),next=setFormalUnionSeparation(s,'formal-union:1',separation,ctx);
    expect(next.unions[0].standing).toEqual({kind:'in-force',separation});expect(getInForceFormalUnionsBetween(next,'person:2','person:1',ctx)).toHaveLength(1);
    expect(setFormalUnionSeparation(next,'formal-union:1',separation,ctx)).toEqual(next);expect(s.unions[0].standing).toEqual({kind:'in-force',separation:'unknown'});
  });
  it.each(['dissolution','annulment'] as const)('retains minimal terminal %s and supports exact command retry',reason=>{
    const ctx=fixtureContext(),s=populated(),end={reason,endedOn:null},next=endFormalUnion(s,'formal-union:1',end,ctx);
    expect(next.unions[0].standing).toEqual({kind:'ended',end});expect(next.nextSequence).toBe(2);expect(getInForceFormalUnionsForPerson(next,'person:1',ctx)).toEqual([]);
    const retry=endFormalUnion(next,'formal-union:1',end,ctx);expect(retry).toEqual(next);expect(retry).not.toBe(next);
    expect(()=>setFormalUnionSeparation(next,'formal-union:1','unknown',ctx)).toThrow();
  });
  it('rejects conflicting terminal assertions without re-opening or correction',()=>{
    const ctx=fixtureContext(),s=endFormalUnion(populated(),'formal-union:1',terminal,ctx),before=JSON.stringify(s);
    for(const end of [{reason:'annulment',endedOn:terminal.endedOn},{reason:'dissolution',endedOn:null}] as FormalUnionEndV1[])expect(()=>endFormalUnion(s,'formal-union:1',end,ctx)).toThrow();
    expect(JSON.stringify(s)).toBe(before);
  });
  it('rejects identical/reversed active formation instead of creating a retry ledger',()=>{
    const ctx=fixtureContext(),s=populated(),before=JSON.stringify({s,ctx});
    for(const input of [fixtureInput(),fixtureInput(2,1)])expect(()=>createFormalUnion(s,input,ctx)).toThrow('Duplicate');
    expect(JSON.stringify({s,ctx})).toBe(before);
  });
  it('allocates remarriage as new ID and an old end retry cannot end it',()=>{
    const ctx=fixtureContext(),ended=endFormalUnion(populated(),'formal-union:1',terminal,ctx),s=createFormalUnion(ended,fixtureInput(),ctx).state;
    expect(s.unions.map(x=>x.id)).toEqual(['formal-union:1','formal-union:2']);expect(s.nextSequence).toBe(3);
    expect(endFormalUnion(s,'formal-union:1',terminal,ctx)).toEqual(s);expect(s.unions[1].standing.kind).toBe('in-force');
    expect(getFormalUnionsForPerson(s,'person:1',ctx)).toHaveLength(2);
  });
  it('permits multiple partners and exact kinds without global monogamy',()=>{
    const ctx=fixtureContext();let s=populated();
    s=createFormalUnion(s,fixtureInput(1,3),ctx).state;s=createFormalUnion(s,fixtureInput(1,2,'formal-union-kind.synthetic.second-v1'),ctx).state;
    expect(getInForceFormalUnionsForPerson(s,'person:1',ctx)).toHaveLength(3);expect(getInForceFormalUnionsBetween(s,'person:1','person:2',ctx)).toHaveLength(2);
  });
  it('preserves numeric contract order beyond single-digit sequences',()=>{
    const ctx=fixtureContext(20);let s=createEmptyFormalUnionState();
    for(let i=2;i<=12;i++)s=createFormalUnion(s,fixtureInput(1,i),ctx).state;
    expect(getFormalUnionsForPerson(s,'person:1',ctx).map(record=>record.sequence)).toEqual(Array.from({length:11},(_,i)=>i+1));
  });
  it('does not universally end a recorded union when a Person dies',()=>{
    const ctx=fixtureContext(12,[2]),s=populated(ctx);
    expect(validFormalUnionWithContext(s,ctx)).toBe(true);expect(s.unions[0].standing.kind).toBe('in-force');expect(getSurvivingFormalUnionAssociations(s,'person:1',ctx)).toEqual([]);
  });
  it('records a known death cause and queries living surviving associations',()=>{
    const ctx=fixtureContext(12,[2]),end:FormalUnionEndV1={reason:'death',endedOn:{year:2030,month:2,day:28},deceasedPersonId:'person:2'},s=endFormalUnion(populated(ctx),'formal-union:1',end,ctx);
    expect(getSurvivingFormalUnionAssociations(s,'person:1',ctx)).toHaveLength(1);expect(getSurvivingFormalUnionAssociations(s,'person:2',ctx)).toEqual([]);expect(s.unions[0].standing).toEqual({kind:'ended',end});
  });
  it('permits unknown exact death dates with explicit deceased authority',()=>{
    const ctx=fixtureContext(12,[2],true),end:FormalUnionEndV1={reason:'death',endedOn:null,deceasedPersonId:'person:2'};
    expect(validFormalUnionWithContext(endFormalUnion(populated(ctx),'formal-union:1',end,ctx),ctx)).toBe(true);
  });
  it('returns no living survivor when both endpoints deceased',()=>{
    const ctx=fixtureContext(12,[1,2]),s=endFormalUnion(populated(ctx),'formal-union:1',{reason:'death',endedOn:null,deceasedPersonId:'person:2'},ctx);
    expect(getSurvivingFormalUnionAssociations(s,'person:1',ctx)).toEqual([]);expect(getSurvivingFormalUnionAssociations(s,'person:2',ctx)).toEqual([]);
  });
  it('does not rewrite earlier dissolution after former partner death',()=>{
    const ctx=fixtureContext(12,[2]),s=endFormalUnion(populated(ctx),'formal-union:1',terminal,ctx);
    expect(getSurvivingFormalUnionAssociations(s,'person:1',ctx)).toEqual([]);expect(s.unions[0].standing).toEqual({kind:'ended',end:terminal});
  });
  it.each([
    {reason:'death',endedOn:null,deceasedPersonId:'person:1'},
    {reason:'death',endedOn:null,deceasedPersonId:'person:3'},
    {reason:'death',endedOn:{year:2029,month:12,day:31},deceasedPersonId:'person:2'},
    {reason:'dissolution',endedOn:{year:2023,month:1,day:1}},
    {reason:'dissolution',endedOn:{year:2033,month:1,day:1}},
    {reason:'dissolution',endedOn:{year:2031,month:2,day:29}},
    {reason:'invalid',endedOn:null},
    {reason:'dissolution',endedOn:null,deceasedPersonId:'person:2'}
  ])('rejects invalid terminal command %j atomically',end=>{
    const ctx=fixtureContext(12,[2]),s=populated(ctx),before=JSON.stringify({s,ctx});
    expect(()=>endFormalUnion(s,'formal-union:1',end as FormalUnionEndV1,ctx)).toThrow();expect(JSON.stringify({s,ctx})).toBe(before);
  });
  it.each([
    {year:1999,month:1,day:1},{year:2033,month:1,day:1},{year:2023,month:2,day:29},
    {year:0,month:1,day:1},{year:10000,month:1,day:1},{year:2024,month:6,day:30,extra:1}
  ])('rejects invalid formation date %j without allocation',formedOn=>{
    const s=createEmptyFormalUnionState();
    expect(()=>createFormalUnion(s,{...fixtureInput(),formedOn},fixtureContext())).toThrow();expect(s.nextSequence).toBe(1);
  });
  it('accepts real leap day and Calendar endpoints with actual DOB',()=>{
    const ctx=fixtureContext(),s=createFormalUnion(createEmptyFormalUnionState(),{...fixtureInput(),formedOn:{year:2024,month:2,day:29}},ctx).state;
    expect(validFormalUnionWithContext(s,ctx)).toBe(true);
    const early={...ctx,referenceDate:{year:1,month:1,day:1},people:{...ctx.people,people:ctx.people.people.map(p=>({...p,dateOfBirth:{year:1,month:1,day:1}}))}};
    expect(createFormalUnion(createEmptyFormalUnionState(),{...fixtureInput(),formedOn:early.referenceDate},early).state.unions).toHaveLength(1);
  });
  it('deletion cleanup removes target contracts but retains allocator and unrelated unions',()=>{
    const ctx=fixtureContext();let s=populated();s=createFormalUnion(s,fixtureInput(3,4),ctx).state;
    s=endFormalUnion(s,'formal-union:1',terminal,ctx);
    const next=removePersonFromFormalUnions(s,'person:1',ctx);expect(next.unions.map(record=>record.id)).toEqual(['formal-union:2']);expect(next.nextSequence).toBe(3);
    const last=removePersonFromFormalUnions(next,'person:3',ctx);expect(last.unions).toEqual([]);expect(last.nextSequence).toBe(3);
    expect(createFormalUnion(last,fixtureInput(),ctx).union.id).toBe('formal-union:3');expect(ctx.people.people).toHaveLength(12);
  });
  it('rejects corrupt records even if selected for cleanup',()=>{
    const ctx=fixtureContext(),s={...populated(),nextSequence:1};
    expect(()=>removePersonFromFormalUnions(s,'person:1',ctx)).toThrow();
  });
  it('handles allocator exhaustion before publication and validates safe continuation',()=>{
    const ctx=fixtureContext(),s:FormalUnionStateV1={version:1,nextSequence:Number.MAX_SAFE_INTEGER,unions:[]};
    expect(validFormalUnionWithContext(s,ctx)).toBe(true);expect(()=>createFormalUnion(s,fixtureInput(),ctx)).toThrow('exhausted');expect(s.unions).toEqual([]);
    expect(validFormalUnionState({...s,nextSequence:Number.MAX_SAFE_INTEGER+1})).toBe(false);
  });
  it('validates absent kind separately from structural decode and refuses terminal kind fallback',()=>{
    const ctx=fixtureContext(),s=endFormalUnion(populated(),'formal-union:1',terminal,ctx),missing={...ctx,kinds:{version:1 as const,kinds:[],manifest:[]}};
    expect(validFormalUnionState(s)).toBe(true);expect(validFormalUnionWithPeople(s,ctx.people,ctx.referenceDate)).toBe(true);expect(validFormalUnionWithContext(s,missing)).toBe(false);
    expect(()=>getFormalUnion(s,'formal-union:1',missing)).toThrow();
  });
  it('requires actual Persons, no self edge, and no universal age/gender gate',()=>{
    const ctx=fixtureContext();
    for(const input of [fixtureInput(1,1),fixtureInput(1,99)])expect(()=>createFormalUnion(createEmptyFormalUnionState(),input,ctx)).toThrow();
    const people={...ctx.people,people:ctx.people.people.map(p=>({...p,dateOfBirth:ctx.referenceDate,genderLabel:'same label'}))};
    expect(createFormalUnion(createEmptyFormalUnionState(),{...fixtureInput(),formedOn:null},{...ctx,people}).state.unions).toHaveLength(1);
  });
  it('queries known absence and rejects malformed/unknown Persons',()=>{
    const ctx=fixtureContext(),s=populated();
    expect(getFormalUnion(s,'formal-union:99',ctx)).toBeUndefined();expect(getFormalUnionsForPerson(s,'person:3',ctx)).toEqual([]);
    expect(()=>getFormalUnion(s,'formal-union:01',ctx)).toThrow();expect(()=>getFormalUnionsForPerson(s,'person:99',ctx)).toThrow();expect(()=>getInForceFormalUnionsBetween(s,'person:1','person:1',ctx)).toThrow();
  });
  it('rejects unknown IDs and wrong transition modes',()=>{
    const ctx=fixtureContext(),s=populated();
    expect(()=>endFormalUnion(s,'formal-union:99',terminal,ctx)).toThrow();expect(()=>setFormalUnionSeparation(s,'formal-union:1','invalid' as any,ctx)).toThrow();
  });
  it('owns/freeze all input dates, status outputs and result/query records',()=>{
    const ctx=fixtureContext(),input=fixtureInput(),result=createFormalUnion(createEmptyFormalUnionState(),input,ctx),end=structuredClone(terminal),s=endFormalUnion(result.state,result.union.id,end,ctx),record=getFormalUnion(s,result.union.id,ctx)!;
    input.formedOn.year=2025;(end.endedOn as {year:number}).year=2032;
    expect(result.union.formedOn?.year).toBe(2024);expect(record.standing).toEqual({kind:'ended',end:terminal});expect(Object.isFrozen(record)).toBe(true);
    expect(()=>{(record.personIds as unknown as string[])[0]='person:3';}).toThrow();
  });
  it('produces exact bytes regardless of legitimate input field/pair order',()=>{
    const ctx=fixtureContext(),a=createFormalUnion(createEmptyFormalUnionState(),fixtureInput(),ctx),i=fixtureInput(2,1),b=createFormalUnion({unions:[],nextSequence:1,version:1},{formedOn:{day:30,year:2024,month:6},kindId:i.kindId,personIds:i.personIds},ctx);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it.each([null,{year:2024,month:6,day:30}])('preserves known/unknown date matrix for formedOn %j',formedOn=>{
    const ctx=fixtureContext(),s=createFormalUnion(createEmptyFormalUnionState(),{...fixtureInput(),formedOn},ctx).state;
    for(const endedOn of [null,{year:2031,month:1,day:1}])expect(validFormalUnionWithContext(endFormalUnion(s,'formal-union:1',{reason:'dissolution',endedOn},ctx),ctx)).toBe(true);
  });
  it('rejects a nonnumeric contract array order without silently sorting source corruption',()=>{
    const ctx=fixtureContext(),s=createFormalUnion(populated(),fixtureInput(3,4),ctx).state;
    const corrupt={...s,unions:[...s.unions].reverse()};
    expect(validFormalUnionState(corrupt)).toBe(false);expect(()=>removePersonFromFormalUnions(corrupt,'person:1',ctx)).toThrow();
  });
  it('rejects unknown formation fields rather than discarding them',()=>{
    expect(()=>createFormalUnion(createEmptyFormalUnionState(),{...fixtureInput(),extra:1} as FormalUnionInputV1,fixtureContext())).toThrow();
  });
  it('leaves external authority intact and uses no wall clock or entropy',()=>{
    const ctx=fixtureContext(),before=JSON.stringify(ctx),outside={partnership:[],household:[],kinship:[],residence:[],rng:73,history:[],events:[],causality:[]},other=JSON.stringify(outside);
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('entropy');}),now=vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('clock');});
    try{const s=populated(ctx);endFormalUnion(s,'formal-union:1',terminal,ctx);expect(JSON.stringify(ctx)).toBe(before);expect(JSON.stringify(outside)).toBe(other);}finally{random.mockRestore();now.mockRestore();}
  });
  it('handles moderate graph scale with indexed plural queries over actual Persons only',()=>{
    const ctx=fixtureContext(1000),kindId=fixtureInput().kindId;
    const s:FormalUnionStateV1={version:1,nextSequence:1000,unions:Array.from({length:999},(_,i)=>({id:`formal-union:${i+1}`,sequence:i+1,personIds:['person:1',`person:${i+2}`] as [string,string],kindId,formedOn:null,standing:{kind:'in-force',separation:'unknown'}}))};
    expect(validFormalUnionWithContext(s,ctx)).toBe(true);expect(getInForceFormalUnionsForPerson(s,'person:1',ctx)).toHaveLength(999);
  });
});
describe('Formal Union strict hostile/canonical acceptance',()=>{
  it.each([
    (s:any)=>{s.version=2;},(s:any)=>{s.nextSequence=NaN;},(s:any)=>{s.nextSequence=Infinity;},(s:any)=>{s.nextSequence=1;},
    (s:any)=>{s.unions[0].id='formal-union:01';},(s:any)=>{s.unions[0].sequence=1.5;},(s:any)=>{s.unions[0].personIds.reverse();},
    (s:any)=>{s.unions[0].personIds=['person:1','person:1'];},(s:any)=>{s.unions[0].kindId='latest';},
    (s:any)=>{s.unions[0].standing={kind:'in-force',separation:'unknown',end:null};},
    (s:any)=>{s.unions[0].standing={kind:'ended',end:{reason:'death',endedOn:null,deceasedPersonId:'person:3'}};},
    (s:any)=>{s.unions[0].formedOn={year:2024,month:2,day:30};},
    (s:any)=>{s.unions.push({...s.unions[0],id:'formal-union:2',sequence:2});s.nextSequence=3;},
    (s:any)=>{s.unions=new Array(1);},(s:any)=>{s.extra=0;}
  ].map((mutate,index)=>({mutate,index})))('rejects malformed state case $index',({mutate})=>{
    const s=structuredClone(populated());mutate(s);expect(validFormalUnionState(s)).toBe(false);
  });
  it('rejects getters/hidden/symbol/custom prototypes and proxies without invoking getters',()=>{
    let calls=0;const s=populated(),accessor={...s,get unions(){calls++;return [];}};
    const hidden=Object.defineProperty(structuredClone(s),'x',{value:1}),symbol={...s,[Symbol('x')]:0},custom=Object.assign(Object.create({}),s),revoked=Proxy.revocable({},{});revoked.revoke();
    for(const bad of [accessor,hidden,symbol,custom,new Proxy(s,{}),revoked.proxy])expect(validFormalUnionState(bad)).toBe(false);
    expect(calls).toBe(0);
  });
  it('rejects context hidden fields, malformed registry and poisoned command dates',()=>{
    const ctx=fixtureContext(),s=populated(),bad=Object.defineProperty({...ctx},'x',{value:1});
    expect(validFormalUnionWithContext(s,bad)).toBe(false);
    expect(()=>endFormalUnion(s,'formal-union:1',{reason:'dissolution',endedOn:{year:2031,month:1,day:1,extra:1}} as FormalUnionEndV1,ctx)).toThrow();
  });
  it('rejects nested accessors, cycles, custom arrays and detached/reference proxies predictably',()=>{
    let calls=0;const s=populated(),nested={...s,unions:[{...s.unions[0],get standing(){calls++;return {kind:'in-force',separation:'unknown'};}}]};
    const cycle:any={...s};cycle.unions=[cycle];
    const array=Object.setPrototypeOf([],null);
    for(const bad of [nested,cycle,{...s,unions:array},{...s,unions:new Array(1_000_001)}])expect(validFormalUnionState(bad)).toBe(false);
    expect(calls).toBe(0);
    expect(validFormalUnionWithContext(s,new Proxy(fixtureContext(),{}))).toBe(false);
  });
});
