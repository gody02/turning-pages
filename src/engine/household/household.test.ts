import {describe,expect,it,vi} from 'vitest';
import {allocatePerson,createPeople,createPerson,replacePerson,type PeopleState,type PersonInput} from '../human/person';
import type {ResidenceStateV1} from '../residence/types';
import {validResidenceWithPeople} from '../residence/validation';
import {getHousehold,getHouseholdMembers,getPersonHouseholds} from './queries';
import {addHouseholdMember,createEmptyHouseholdState,createHousehold,removeHouseholdMember,removePersonFromHouseholds,transferHouseholdMembership} from './state';
import type {HouseholdStateV1,HouseholdValidationContext} from './types';
import {validHouseholdState,validHouseholdWithPeople} from './validation';

const input=(name='Synthetic Person'):PersonInput=>({name,dateOfBirth:{year:2024,month:6,day:30},genderLabel:'Unspecified',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}});
function people(count=4):PeopleState{
  let state=createPeople(input());
  for(let index=2;index<=count;index++)state=allocatePerson(state,input(`Synthetic ${index}`)).state;
  return state;
}
const context=(count=4):HouseholdValidationContext=>({people:people(count)});
const populated=(c=context())=>createHousehold(createEmptyHouseholdState(),['person:1'],c).state;
type Mutable<T>=T extends readonly (infer Item)[]?Mutable<Item>[]:T extends object?{-readonly [Key in keyof T]:Mutable<T[Key]>}:T;
const mutable=<T>(value:T):Mutable<T>=>structuredClone(value) as Mutable<T>;
function dead(peopleState:PeopleState,sequence:number):PeopleState{
  return replacePerson(peopleState,createPerson(sequence,{...input(),lifeStatus:'deceased',diedAt:{year:2024,month:7,day:1}}));
}
function frozenTree(value:unknown):void{
  if(!value||typeof value!=='object')return;
  expect(Object.isFrozen(value)).toBe(true);
  for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value' in descriptor)frozenTree(descriptor.value);
}

describe('Household Foundation v1 standalone state',()=>{
  it('creates exact empty owned state with no materialized Household for living or deceased Persons',()=>{
    const state=createEmptyHouseholdState(),p=dead(people(),2);
    expect(state).toEqual({version:1,nextSequence:1,households:[],memberships:[]});
    expect(validHouseholdWithPeople(state,p)).toBe(true);expect(getPersonHouseholds(state,'person:1')).toEqual([]);frozenTree(state);
  });
  it('supports a one-person Household, final-member retirement and no identity reuse',()=>{
    const c=context(),first=createHousehold(createEmptyHouseholdState(),['person:1'],c);
    expect(first.household).toEqual({id:'household:1',sequence:1});expect(first.household).toBe(first.state.households[0]);
    expect(getHouseholdMembers(first.state,'household:1')).toEqual(['person:1']);
    const retired=removeHouseholdMember(first.state,'person:1','household:1',c);
    expect(retired).toEqual({version:1,nextSequence:2,households:[],memberships:[]});
    expect(createHousehold(retired,['person:2'],c).household.id).toBe('household:2');frozenTree(first);
  });
  it('adds unrelated members and removes only the requested pair while retaining survivors',()=>{
    const c=context(),initial=populated(c),joined=addHouseholdMember(initial,'person:2','household:1',c);
    const next=removeHouseholdMember(joined,'person:1','household:1',c);
    expect(next.households).toEqual(initial.households);expect(next.nextSequence).toBe(2);
    expect(getHouseholdMembers(next,'household:1')).toEqual(['person:2']);expect(getHouseholdMembers(joined,'household:1')).toEqual(['person:1','person:2']);
  });
  it('supports a minor in multiple domestic units without roles, primary home or automatic transfer',()=>{
    const c=context(),first=createHousehold(createEmptyHouseholdState(),['person:1','person:2'],c);
    const second=createHousehold(first.state,['person:1','person:3'],c);
    expect(getPersonHouseholds(second.state,'person:1').map(item=>item.id)).toEqual(['household:1','household:2']);
    expect(second.state.memberships.filter(item=>item.personId==='person:1')).toEqual([{personId:'person:1',householdId:'household:1'},{personId:'person:1',householdId:'household:2'}]);
    expect(getPersonHouseholds(second.state,'person:4')).toEqual([]);expect(validHouseholdWithPeople(second.state,c.people)).toBe(true);
    const removed=removeHouseholdMember(second.state,'person:1','household:1',c);
    expect(getPersonHouseholds(removed,'person:1').map(item=>item.id)).toEqual(['household:2']);
  });
  it('can add a member already belonging elsewhere without silently moving their first membership',()=>{
    const c=context(),first=populated(c),second=createHousehold(first,['person:2'],c).state;
    const next=addHouseholdMember(second,'person:1','household:2',c);
    expect(getPersonHouseholds(next,'person:1')).toHaveLength(2);expect(next.nextSequence).toBe(3);
  });
  it('atomically transfers exactly one pair, retires an emptied source and preserves another membership',()=>{
    const c=context(),a=populated(c),b=createHousehold(a,['person:2'],c).state,d=createHousehold(b,['person:1','person:3'],c).state;
    const before=JSON.stringify(d),next=transferHouseholdMembership(d,'person:1','household:1','household:2',c);
    expect(next.households.map(item=>item.id)).toEqual(['household:2','household:3']);
    expect(getPersonHouseholds(next,'person:1').map(item=>item.id)).toEqual(['household:2','household:3']);
    expect(getHouseholdMembers(next,'household:2')).toEqual(['person:1','person:2']);
    expect(next.nextSequence).toBe(4);expect(JSON.stringify(d)).toBe(before);frozenTree(next);
  });
  it('retains a shared source after transferring one member',()=>{
    const c=context(),a=createHousehold(createEmptyHouseholdState(),['person:1','person:2'],c).state,b=createHousehold(a,['person:3'],c).state;
    const next=transferHouseholdMembership(b,'person:1','household:1','household:2',c);
    expect(getHouseholdMembers(next,'household:1')).toEqual(['person:2']);expect(next.households).toHaveLength(2);
  });
  it('supports targeted death cleanup across multiple units and preserves unrelated surviving members',()=>{
    const c=context(),a=populated(c),b=createHousehold(a,['person:1','person:2'],c).state,afterDeath={people:dead(c.people,1)};
    expect(validHouseholdWithPeople(b,afterDeath.people)).toBe(false);
    const next=removePersonFromHouseholds(b,'person:1',afterDeath);
    expect(next.households).toEqual([{id:'household:2',sequence:2}]);
    expect(next.memberships).toEqual([{personId:'person:2',householdId:'household:2'}]);expect(next.nextSequence).toBe(3);
    expect(validHouseholdWithPeople(next,afterDeath.people)).toBe(true);expect(afterDeath.people.people[0].lifeStatus).toBe('deceased');
    const repeat=removePersonFromHouseholds(next,'person:1',afterDeath);
    expect(repeat).toEqual(next);expect(repeat).not.toBe(next);frozenTree(repeat);
  });
  it('allows explicit living lifecycle removal or an existing nonmember without deleting a Person',()=>{
    const c=context(),state=populated(c),before=JSON.stringify(c.people);
    expect(removePersonFromHouseholds(state,'person:4',c)).toEqual(state);
    expect(removePersonFromHouseholds(state,'person:1',c).households).toEqual([]);expect(JSON.stringify(c.people)).toBe(before);
  });
  it('does not repair an unrelated newly dead or missing member during lifecycle cleanup',()=>{
    const c=context(),state=createHousehold(createEmptyHouseholdState(),['person:1','person:2'],c).state;
    expect(()=>removePersonFromHouseholds(state,'person:1',{people:dead(c.people,2)})).toThrow('Household lifecycle removal cannot repair unrelated invalid state.');
    const missing={...state,memberships:[...state.memberships,{personId:'person:99',householdId:'household:1'}]};
    expect(()=>removePersonFromHouseholds(missing,'person:1',c)).toThrow('Household lifecycle removal cannot repair unrelated invalid state.');
  });
  it('rejects ordinary commands while a deceased membership awaits targeted lifecycle cleanup',()=>{
    const c=context(),state=populated(c),afterDeath={people:dead(c.people,1)};
    expect(()=>addHouseholdMember(state,'person:2','household:1',afterDeath)).toThrow('Invalid Household state or validation context.');
    expect(()=>removeHouseholdMember(state,'person:1','household:1',afterDeath)).toThrow('Invalid Household state or validation context.');
  });
  it('normalizes unordered initial members and property insertion order, while allocating commands in order',()=>{
    const c=context(12),initial={memberships:[],households:[],nextSequence:1,version:1} as HouseholdStateV1;
    const left=createHousehold(initial,['person:2','person:10','person:1'],c),right=createHousehold(createEmptyHouseholdState(),['person:1','person:2','person:10'],c);
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));expect(getHouseholdMembers(left.state,'household:1')).toEqual(['person:1','person:10','person:2']);
    expect(Object.keys(left.state)).toEqual(['version','nextSequence','households','memberships']);
    expect(Object.keys(left.household)).toEqual(['id','sequence']);expect(Object.keys(left.state.memberships[0])).toEqual(['personId','householdId']);
  });
  it('orders Household sequences numerically within one Person membership list',()=>{
    const c=context();let state=createEmptyHouseholdState();for(let index=1;index<=12;index++)state=createHousehold(state,['person:1'],c).state;
    expect(state.memberships.map(item=>item.householdId)).toEqual(Array.from({length:12},(_,index)=>`household:${index+1}`));
    expect(getPersonHouseholds(state,'person:1').map(item=>item.sequence)).toEqual(Array.from({length:12},(_,index)=>index+1));
  });
  it('accepts retired sequence gaps and the safe allocator maximum, then rejects further allocation',()=>{
    const c=context(),empty={...createEmptyHouseholdState(),nextSequence:Number.MAX_SAFE_INTEGER-1};
    const last=createHousehold(empty,['person:1'],c);
    expect(last.household.sequence).toBe(Number.MAX_SAFE_INTEGER-1);expect(last.state.nextSequence).toBe(Number.MAX_SAFE_INTEGER);
    expect(validHouseholdState(last.state)).toBe(true);expect(()=>createHousehold(last.state,['person:2'],c)).toThrow('Household sequence is exhausted.');
    const retired=removeHouseholdMember(last.state,'person:1',last.household.id,c);expect(retired.nextSequence).toBe(Number.MAX_SAFE_INTEGER);expect(validHouseholdState(retired)).toBe(true);
  });
  it('retains canonical state and allocator continuation after standalone JSON save/reload',()=>{
    const c=context(),first=populated(c),retired=removeHouseholdMember(first,'person:1','household:1',c),raw=JSON.stringify(retired),loaded=JSON.parse(raw);
    expect(validHouseholdWithPeople(loaded,c.people)).toBe(true);expect(createHousehold(loaded,['person:2'],c).household.id).toBe('household:2');
    expect(JSON.stringify(loaded)).toBe(raw);
  });
  it('keeps same-home/different-unit and different-home/same-unit facts independent',()=>{
    const c=context(),a=populated(c),separate=createHousehold(a,['person:2'],c).state;
    const shared:ResidenceStateV1={version:1,nextSequence:2,residences:[{id:'residence:1',sequence:1,location:{kind:'country',countryId:'aa'}}],occupants:[{personId:'person:1',residenceId:'residence:1'},{personId:'person:2',residenceId:'residence:1'}],noFixedAbodePersonIds:[]};
    expect(validResidenceWithPeople(shared,c.people)).toBe(true);expect(validHouseholdWithPeople(separate,c.people)).toBe(true);
    const homes:ResidenceStateV1={version:1,nextSequence:3,residences:[...shared.residences,{id:'residence:2',sequence:2,location:{kind:'country',countryId:'bb'}}],occupants:[{personId:'person:1',residenceId:'residence:1'},{personId:'person:2',residenceId:'residence:2'}],noFixedAbodePersonIds:[]};
    const combined=createHousehold(createEmptyHouseholdState(),['person:1','person:2'],c).state,before=JSON.stringify(homes);
    expect(validResidenceWithPeople(homes,c.people)).toBe(true);expect(validHouseholdWithPeople(combined,c.people)).toBe(true);
    removeHouseholdMember(combined,'person:1','household:1',c);expect(JSON.stringify(homes)).toBe(before);
    expect(validHouseholdWithPeople(createEmptyHouseholdState(),c.people)).toBe(true);
    const absent:ResidenceStateV1={version:1,nextSequence:1,residences:[],occupants:[],noFixedAbodePersonIds:['person:1']};
    expect(validResidenceWithPeople(absent,c.people)).toBe(true);expect(validHouseholdWithPeople(combined,c.people)).toBe(true);
  });
  it('produces identical results without calling host entropy or time',()=>{
    const c=context(),state=createEmptyHouseholdState(),random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('entropy');}),now=vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('time');});
    try{expect(createHousehold(state,['person:1','person:2'],c)).toEqual(createHousehold(state,['person:2','person:1'],c));expect(random).not.toHaveBeenCalled();expect(now).not.toHaveBeenCalled();}finally{random.mockRestore();now.mockRestore();}
  });
});

describe('Household commands fail atomically',()=>{
  const cases:readonly [string,(state:HouseholdStateV1,c:HouseholdValidationContext)=>unknown,string][]=[
    ['empty creation',(s,c)=>createHousehold(s,[],c),'Invalid Household initial members.'],
    ['duplicate initial members',(s,c)=>createHousehold(s,['person:1','person:1'],c),'Invalid Household initial members.'],
    ['unknown initial Person',(s,c)=>createHousehold(s,['person:99'],c),'Invalid Household initial members.'],
    ['unknown add Person',(s,c)=>addHouseholdMember(s,'person:99','household:1',c),'Invalid Household member addition.'],
    ['unknown add Household',(s,c)=>addHouseholdMember(s,'person:3','household:99',c),'Invalid Household member addition.'],
    ['duplicate pair',(s,c)=>addHouseholdMember(s,'person:1','household:1',c),'Invalid Household member addition.'],
    ['absent remove pair',(s,c)=>removeHouseholdMember(s,'person:3','household:1',c),'Unknown Household membership.'],
    ['unknown remove Household',(s,c)=>removeHouseholdMember(s,'person:1','household:99',c),'Unknown Household membership.'],
    ['unknown transfer target',(s,c)=>transferHouseholdMembership(s,'person:1','household:1','household:99',c),'Invalid Household membership transfer.'],
    ['unknown transfer source',(s,c)=>transferHouseholdMembership(s,'person:1','household:99','household:2',c),'Invalid Household membership transfer.'],
    ['absent transfer source pair',(s,c)=>transferHouseholdMembership(s,'person:3','household:1','household:2',c),'Invalid Household membership transfer.'],
    ['same transfer unit',(s,c)=>transferHouseholdMembership(s,'person:1','household:1','household:1',c),'Invalid Household membership transfer.'],
    ['already-present transfer target',(s,c)=>transferHouseholdMembership(s,'person:1','household:1','household:2',c),'Invalid Household membership transfer.'],
    ['unknown lifecycle target',(s,c)=>removePersonFromHouseholds(s,'person:99',c),'Unknown Household lifecycle Person.'],
  ];
  it.each(cases)('%s preserves both allocators and every input byte',(_name,command,message)=>{
    const c=structuredClone(context()),a=populated(c),state=structuredClone(createHousehold(a,['person:1','person:2'],c).state),before=JSON.stringify({state,c});
    expect(()=>command(state,c)).toThrow(message);expect(JSON.stringify({state,c})).toBe(before);expect(Object.isFrozen(state)).toBe(false);expect(c.people.nextSequence).toBe(5);
  });
  it('rejects deceased initial/add members even when they exist in valid PeopleState',()=>{
    const c={people:dead(people(),2)},state=populated(c);
    expect(()=>createHousehold(state,['person:2'],c)).toThrow('Invalid Household initial members.');
    expect(()=>addHouseholdMember(state,'person:2','household:1',c)).toThrow('Invalid Household member addition.');
  });
});

describe('Household aliases and queries',()=>{
  it('owns and freezes output without freezing or retaining caller state, context or command arrays',()=>{
    const c=mutable(context()),state=mutable(populated(c)),ids=['person:2','person:3'];
    const created=createHousehold(state,ids,c),before=JSON.stringify(created);
    state.households[0]={id:'household:77',sequence:77};ids[0]='person:99';c.people.people[1]={...c.people.people[1],name:'Changed'};
    expect(JSON.stringify(created)).toBe(before);expect(Object.isFrozen(state)).toBe(false);expect(Object.isFrozen(c.people)).toBe(false);expect(Object.isFrozen(ids)).toBe(false);frozenTree(created);
    expect(()=>{(created.household as {sequence:number}).sequence=7;}).toThrow(TypeError);
    expect(()=>{(created as {state:HouseholdStateV1}).state=createEmptyHouseholdState();}).toThrow(TypeError);
    expect(()=>{(created.state.memberships as {personId:string;householdId:string}[]).push({personId:'person:4',householdId:'household:2'});}).toThrow(TypeError);
    expect(JSON.stringify(created)).toBe(before);
  });
  it('returns immutable query copies without aliases into mutable input state',()=>{
    const state=mutable(populated()),one=getHousehold(state,'household:1')!,units=getPersonHouseholds(state,'person:1'),members=getHouseholdMembers(state,'household:1');
    state.households[0]={id:'household:4',sequence:4};state.memberships[0]={personId:'person:4',householdId:'household:4'};
    expect(one).toEqual({id:'household:1',sequence:1});expect(units).toEqual([one]);expect(members).toEqual(['person:1']);frozenTree(one);frozenTree(units);frozenTree(members);
    expect(()=>{(units[0] as {sequence:number}).sequence=9;}).toThrow(TypeError);
  });
  it('returns absent results for syntactically valid unknown IDs',()=>{
    const state=populated();expect(getHousehold(state,'household:99')).toBeUndefined();expect(getHouseholdMembers(state,'household:99')).toEqual([]);expect(getPersonHouseholds(state,'person:99')).toEqual([]);
  });
  it.each(['household:0','household:01','household:-1','household:1e2','household:9007199254740992','household:unknown','household:1\n'])('rejects malformed query ID %s',id=>{
    expect(()=>getHousehold(populated(),id)).toThrow('Invalid Household query.');expect(()=>getHouseholdMembers(populated(),id)).toThrow('Invalid Household query.');
  });
  it.each(['person:0','person:01','person:9007199254740992','other:1','person:1\n'])('rejects malformed Person query ID %s',id=>{
    expect(()=>getPersonHouseholds(populated(),id)).toThrow('Invalid Household query.');
  });
});

describe('strict Household validation',()=>{
  it.each([0,-0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects unsafe/nonpositive allocator %s',nextSequence=>{
    expect(validHouseholdState({...createEmptyHouseholdState(),nextSequence})).toBe(false);
  });
  const malformed:readonly [string,(state:HouseholdStateV1)=>unknown][]=[
    ['unsupported version',s=>({...s,version:2})],['extra root field',s=>({...s,role:'parent'})],
    ['record extra field',s=>({...s,households:[{...s.households[0],residenceId:'residence:1'}]})],
    ['membership role',s=>({...s,memberships:[{...s.memberships[0],role:'child'}]})],
    ['zero sequence',s=>({...s,households:[{id:'household:0',sequence:0}]})],
    ['ID mismatch',s=>({...s,households:[{id:'household:2',sequence:1}]})],
    ['sequence at allocator',s=>({...s,nextSequence:1})],
    ['duplicate Household',s=>({...s,households:[...s.households,...s.households]})],
    ['empty retained record',s=>({...s,memberships:[]})],
    ['duplicate pair',s=>({...s,memberships:[...s.memberships,...s.memberships]})],
    ['dangling Household',s=>({...s,memberships:[{personId:'person:1',householdId:'household:99'}]})],
    ['noncanonical Person ID',s=>({...s,memberships:[{personId:'person:01',householdId:'household:1'}]})],
    ['newline Person ID',s=>({...s,memberships:[{personId:'person:1\n',householdId:'household:1'}]})],
    ['unsafe Person ID',s=>({...s,memberships:[{personId:'person:9007199254740992',householdId:'household:1'}]})],
    ['oversized ID',s=>({...s,memberships:[{personId:'person:'+'1'.repeat(1000),householdId:'household:1'}]})],
    ['sparse records',s=>({...s,households:new Array(1)})],['sparse memberships',s=>({...s,memberships:new Array(1)})],
    ['Map instead of array',s=>({...s,households:new Map()})],
    ['custom root prototype',s=>Object.assign(Object.create({kind:'custom'}),s)],
    ['custom record prototype',s=>({...s,households:[Object.assign(Object.create({kind:'custom'}),s.households[0])]} )],
    ['custom membership prototype',s=>({...s,memberships:[Object.assign(Object.create({kind:'custom'}),s.memberships[0])]} )],
    ['custom array prototype',s=>{Object.setPrototypeOf(s.households,Object.create(Array.prototype));return s;}],
    ['hidden field',s=>Object.defineProperty(s,'hidden',{value:1})],
    ['symbol field',s=>Object.assign(s,{[Symbol('hidden')]:1})],
    ['array extra field',s=>{Object.defineProperty(s.memberships,'extra',{value:1});return s;}],
    ['transparent root proxy',s=>new Proxy(s,{})],
    ['transparent nested proxy',s=>({...s,memberships:[new Proxy(s.memberships[0],{})]})],
    ['revoked proxy',s=>{const proxy=Proxy.revocable(s,{});proxy.revoke();return proxy.proxy;}],
    ['cycle',s=>({...s,households:[s]})],
  ];
  it.each(malformed)('rejects %s predictably and cannot mutate through it',(_name,change)=>{
    const invalid=change(structuredClone(populated()));expect(()=>validHouseholdState(invalid)).not.toThrow();expect(validHouseholdState(invalid)).toBe(false);
    expect(validHouseholdWithPeople(invalid,people())).toBe(false);
    expect(()=>createHousehold(invalid as HouseholdStateV1,['person:2'],context())).toThrow('Invalid Household state or validation context.');
    expect(()=>getHousehold(invalid as HouseholdStateV1,'household:1')).toThrow('Invalid Household query.');
  });
  it('never invokes accessor fields, including indexed input, nested membership and context accessors',()=>{
    const getter=vi.fn(()=>{throw Error('getter must not run');}),state=structuredClone(populated());
    Object.defineProperty(state.memberships[0],'personId',{enumerable:true,get:getter});
    expect(validHouseholdState(state)).toBe(false);
    const ids=['person:1'];Object.defineProperty(ids,0,{enumerable:true,get:getter});
    expect(()=>createHousehold(createEmptyHouseholdState(),ids,context())).toThrow('Invalid Household initial members.');
    const c=Object.defineProperty({},'people',{enumerable:true,get:getter}) as HouseholdValidationContext;
    expect(()=>createHousehold(createEmptyHouseholdState(),['person:1'],c)).toThrow('Invalid Household state or validation context.');
    expect(getter).not.toHaveBeenCalled();
  });
  it('rejects malformed, accessor and proxy People/context without leaking low-level exceptions',()=>{
    const state=populated(),p=people(),getter=vi.fn(()=>{throw Error('getter');}),badPeople=Object.defineProperty({...p},'people',{enumerable:true,get:getter});
    for(const value of [null,{},new Proxy(p,{}),badPeople]){
      expect(validHouseholdWithPeople(state,value)).toBe(false);
      expect(()=>createHousehold(state,['person:2'],{people:value} as HouseholdValidationContext)).toThrow('Invalid Household state or validation context.');
    }
    const c=Proxy.revocable(context(),{});c.revoke();expect(()=>removePersonFromHouseholds(state,'person:1',c.proxy)).toThrow('Invalid Household state or validation context.');expect(getter).not.toHaveBeenCalled();
  });
  it('rejects noncanonical collection ordering and cross-People unresolved/deceased references without repair',()=>{
    const c=context(),a=createHousehold(createEmptyHouseholdState(),['person:1','person:2'],c).state,b=createHousehold(a,['person:1','person:3'],c).state;
    expect(validHouseholdState({...b,households:[...b.households].reverse()})).toBe(false);
    expect(validHouseholdState({...b,memberships:[...b.memberships].reverse()})).toBe(false);
    const unknown={...a,memberships:[{personId:'person:99',householdId:'household:1'}]};expect(validHouseholdState(unknown)).toBe(true);expect(validHouseholdWithPeople(unknown,c.people)).toBe(false);
    expect(validHouseholdWithPeople(a,dead(c.people,2))).toBe(false);
  });
});
