import {describe,expect,it} from 'vitest';
import {fixtureContext,fixtureState} from './fixtures';
import {addParentageBasis,createEmptyKinshipState,removeParentageBasis,removePersonFromKinship} from './state';
import {getAncestors,getChildren,getDescendants,getGrandchildren,getGrandparents,getParentage,getParents,getSiblingRelationship} from './queries';
import {validKinshipState,validKinshipWithPeople} from './validation';
import type {KinshipStateV1,KinshipValidationContext,ParentageBasis} from './types';

const bases:ParentageBasis[]=['genetic','gestational','legal'];
const context=fixtureContext(12);
const id=(n:number)=>`person:${n}`;
const add=(state:KinshipStateV1,parent:number,child:number,basis:ParentageBasis='genetic')=>addParentageBasis(state,id(parent),id(child),basis,context);
const permutations=<T>(items:readonly T[]):T[][]=>items.length?items.flatMap((item,index)=>permutations(items.filter((_,position)=>position!==index)).map(rest=>[item,...rest])):[[]];
const cast=(value:unknown)=>value as KinshipStateV1;

describe('Kinship current parentage truth',()=>{
  it('constructs owned immutable empty state without IDs or required family membership',()=>{
    const state=createEmptyKinshipState();
    expect(state).toEqual({version:1,parentages:[]});
    expect(Object.isFrozen(state.parentages)).toBe(true);
    expect(validKinshipWithPeople(state,context.people)).toBe(true);
    expect(getParents(state,id(1),'genetic',context)).toEqual([]);
    expect(getParentage(state,id(1),id(2),context)).toBeUndefined();
  });
  it.each(bases)('stores %s independently, with reciprocal query and no other basis inference',basis=>{
    const state=add(createEmptyKinshipState(),1,2,basis);
    expect(state.parentages).toEqual([{parentId:id(1),childId:id(2),bases:[basis]}]);
    expect(getParents(state,id(2),basis,context)).toEqual([id(1)]);
    expect(getChildren(state,id(1),basis,context)).toEqual([id(2)]);
    for(const other of bases.filter(item=>item!==basis))expect(getParents(state,id(2),other,context)).toEqual([]);
  });
  it.each(permutations(bases).map(order=>[order]))('canonically merges every basis insertion permutation %j',order=>{
    const state=order.reduce((state,basis)=>add(state,1,2,basis),createEmptyKinshipState());
    expect(state.parentages).toEqual([{parentId:id(1),childId:id(2),bases}]);
    const again=add(state,1,2,order[0]);
    expect(again).toEqual(state);expect(again).not.toBe(state);expect(again.parentages[0].bases).not.toBe(state.parentages[0].bases);
  });
  it.each([['genetic'],['gestational'],['legal'],['genetic','gestational'],['genetic','legal'],['gestational','legal'],bases].map(subset=>[subset]))('accepts nonempty subset %j',subset=>{
    expect(validKinshipState({version:1,parentages:[{parentId:id(1),childId:id(2),bases:subset}]})).toBe(true);
  });
  it.each(bases)('removes only %s while preserving other truths',basis=>{
    const initial=fixtureState([[1,2,'genetic'],[1,2,'gestational'],[1,2,'legal']]);
    const next=removeParentageBasis(initial,id(1),id(2),basis,context);
    expect(next.parentages[0].bases).toEqual(bases.filter(item=>item!==basis));
    expect(initial.parentages[0].bases).toEqual(bases);
  });
  it('last-basis removal removes the record and re-add preserves tuple identity without allocator',()=>{
    const state=add(createEmptyKinshipState(),1,2),empty=removeParentageBasis(state,id(1),id(2),'genetic',context);
    expect(empty).toEqual(createEmptyKinshipState());
    expect(add(empty,1,2)).toEqual(state);expect(Object.keys(empty)).toEqual(['version','parentages']);
  });
  it('absent valid basis and pair removal are owned immutable no-ops',()=>{
    const state=fixtureState([[1,2]]);
    for(const [parent,child,basis] of [[1,2,'legal'],[2,3,'genetic']] as const){
      const next=removeParentageBasis(state,id(parent),id(child),basis,context);
      expect(next).toEqual(state);expect(next).not.toBe(state);expect(Object.isFrozen(next)).toBe(true);
    }
  });
  it('supports more than two parents and children without constraints from age/name/gender',()=>{
    const state=fixtureState([[1,5],[2,5],[3,5],[4,5],[1,6],[1,7]]);
    expect(validKinshipWithPeople(state,context.people)).toBe(true);
    expect(getParents(state,id(5),'genetic',context)).toEqual([id(1),id(2),id(3),id(4)]);
    expect(getChildren(state,id(1),'genetic',context)).toEqual([id(5),id(6),id(7)]);
  });
  it('adds adoption/legal truth without destroying genetic or gestational truth',()=>{
    const initial=fixtureState([[1,4,'genetic'],[2,4,'gestational']]);
    const adopted=add(initial,3,4,'legal');
    expect(getParents(adopted,id(4),'legal',context)).toEqual([id(3)]);
    expect(getParents(adopted,id(4),'genetic',context)).toEqual([id(1)]);
    expect(getParents(adopted,id(4),'gestational',context)).toEqual([id(2)]);
  });
  it('represents surrogacy with different genetic, gestational and legal Persons',()=>{
    const state=fixtureState([[1,5,'genetic'],[2,5,'genetic'],[3,5,'gestational'],[4,5,'legal']]);
    expect(validKinshipWithPeople(state,context.people)).toBe(true);
    expect(getParents(state,id(5),'gestational',context)).toEqual([id(3)]);
    expect(getParents(state,id(5),'legal',context)).toEqual([id(4)]);
  });
  it('a genetic donor need not be legal parent or romantic partner',()=>{
    const state=fixtureState([[1,3,'genetic'],[2,3,'legal']]);
    expect(getParentage(state,id(1),id(3),context)?.bases).toEqual(['genetic']);
    expect(Object.keys(state.parentages[0])).toEqual(['parentId','childId','bases']);
  });
  it('accepts same-gender legal parents without special case or reproductive claim',()=>{
    const source={people:{...context.people,people:context.people.people.map(person=>({...person,genderLabel:'Woman'}))}};
    const state=fixtureState([[1,3,'legal'],[2,3,'legal']]);
    expect(validKinshipWithPeople(state,source.people)).toBe(true);
  });
  it('permits parent younger than child: age eligibility belongs to later policy',()=>{
    const people={...context.people,people:context.people.people.map((person,index)=>({...person,dateOfBirth:{year:index===0?2020:1900,month:1,day:1}}))};
    expect(validKinshipWithPeople(fixtureState([[1,2,'legal']]),people)).toBe(true);
  });
  it('death of either endpoint preserves the graph and query result',()=>{
    const state=fixtureState([[1,2]]),before=JSON.stringify(state);
    for(const personId of [id(1),id(2)]){
      const people={...context.people,people:context.people.people.map(person=>person.id===personId?{...person,lifeStatus:'deceased' as const,diedAt:{year:2024,month:1,day:1}}:person)};
      expect(validKinshipWithPeople(state,people)).toBe(true);
      expect(getParents(state,id(2),'genetic',{people})).toEqual([id(1)]);
    }
    expect(JSON.stringify(state)).toBe(before);
  });
  it('cleanup removes all incoming/outgoing pairs/bases but preserves unrelated records and People',()=>{
    const state=fixtureState([[1,2],[1,2,'legal'],[2,3,'gestational'],[4,2,'legal'],[4,5]]),before=JSON.stringify(context);
    expect(removePersonFromKinship(state,id(2),context)).toEqual(fixtureState([[4,5]]));
    expect(JSON.stringify(context)).toBe(before);
    expect(removePersonFromKinship(state,id(6),context)).toEqual(state);
    expect(()=>removePersonFromKinship(state,id(99),context)).toThrow('Unknown Kinship Person.');
  });
  it('cleanup rejects missing context Person and unrelated corruption instead of repairing it',()=>{
    const state=fixtureState([[1,2],[8,99]]);
    expect(()=>removePersonFromKinship(state,id(2),context)).toThrow('Invalid Kinship state or validation context.');
    expect(()=>removePersonFromKinship(fixtureState([[1,99]]),id(99),context)).toThrow();
  });
  it('has no Household/Residence/country dependency or extra context, and never infers kinship from surname',()=>{
    const people={...context.people,people:context.people.people.map(person=>({...person,name:'Shared Surname'}))};
    expect(validKinshipWithPeople(fixtureState([[1,2]]),people)).toBe(true);
    expect(getSiblingRelationship(createEmptyKinshipState(),id(1),id(2),'genetic',{people}).sharedParentIds).toEqual([]);
    expect(()=>addParentageBasis(createEmptyKinshipState(),id(1),id(2),'legal',{people,household:{}} as KinshipValidationContext)).toThrow();
  });
});

describe('Kinship union DAG and atomic transitions',()=>{
  it.each(bases)('rejects self-parentage for %s without modifying candidate inputs',basis=>{
    const state=createEmptyKinshipState(),before=JSON.stringify({state,context});
    expect(()=>add(state,1,1,basis)).toThrow('Self parentage is invalid.');
    expect(JSON.stringify({state,context})).toBe(before);
  });
  it.each(bases.flatMap(left=>bases.map(right=>[left,right] as const)))('rejects direct cycle %s/%s atomically',(left,right)=>{
    const state=fixtureState([[1,2,left]]),before=JSON.stringify({state,context});
    expect(()=>add(state,2,1,right)).toThrow('Kinship transition failed validation.');
    expect(JSON.stringify({state,context})).toBe(before);
  });
  it('rejects indirect mixed-basis cycle even when every basis separately is acyclic',()=>{
    const state=fixtureState([[1,2,'genetic'],[2,3,'gestational']]),before=JSON.stringify(state);
    expect(()=>add(state,3,1,'legal')).toThrow('Kinship transition failed validation.');
    expect(JSON.stringify(state)).toBe(before);
    expect(validKinshipState(fixtureState([[1,2,'genetic'],[2,3,'gestational'],[3,1,'legal']]))).toBe(false);
  });
  it('deduplicates several bases for cycle indegrees without rejecting a valid diamond',()=>{
    expect(validKinshipState(fixtureState([[1,2],[1,2,'legal'],[1,3],[2,4],[3,4]]))).toBe(true);
  });
  it.each([[99,2],[1,99]])('rejects missing endpoint %j atomically',(parent,child)=>{
    const state=fixtureState([[3,4]]),before=JSON.stringify({state,context});
    expect(()=>add(state,parent,child)).toThrow('Unknown Kinship Person.');
    expect(JSON.stringify({state,context})).toBe(before);
  });
  it('adding invalid basis and removing absent invalid endpoints fail rather than consume IDs',()=>{
    const state=createEmptyKinshipState(),before=JSON.stringify(context);
    expect(()=>addParentageBasis(state,id(1),id(2),'biological' as ParentageBasis,context)).toThrow('Invalid parentage basis.');
    expect(()=>removeParentageBasis(state,id(1),id(99),'legal',context)).toThrow();
    expect(context.people.nextSequence).toBe(13);expect(JSON.stringify(context)).toBe(before);
  });
  it('all edge/basis insertion permutations yield byte-identical canonical state',()=>{
    const edges=[[2,4,'legal'],[1,3,'genetic'],[1,3,'gestational'],[1,2,'legal']] as const;
    const results=permutations(edges).map(order=>JSON.stringify(order.reduce((state,[parent,child,basis])=>add(state,parent,child,basis),createEmptyKinshipState())));
    expect(new Set(results).size).toBe(1);
  });
});

describe('Basis-aware derived kinship',()=>{
  it('reports represented shared-parent evidence, not an unconditional full/half label',()=>{
    const state=fixtureState([[1,4],[2,4],[1,5],[3,5,'legal'],[3,4,'legal']]);
    expect(getSiblingRelationship(state,id(4),id(5),'genetic',context)).toEqual({basis:'genetic',leftKnownParentIds:[id(1),id(2)],rightKnownParentIds:[id(1)],sharedParentIds:[id(1)],sameNonemptyParentSet:false});
    expect(getSiblingRelationship(state,id(4),id(5),'legal',context)).toEqual({basis:'legal',leftKnownParentIds:[id(3)],rightKnownParentIds:[id(3)],sharedParentIds:[id(3)],sameNonemptyParentSet:true});
    expect(getSiblingRelationship(state,id(4),id(5),'gestational',context)).toEqual({basis:'gestational',leftKnownParentIds:[],rightKnownParentIds:[],sharedParentIds:[],sameNonemptyParentSet:false});
  });
  it('identical nonempty parent sets remain known sets, not proof of complete genealogy',()=>{
    const state=fixtureState([[1,5],[2,5],[3,5],[1,6],[2,6],[3,6]]),result=getSiblingRelationship(state,id(5),id(6),'genetic',context);
    expect(result.sharedParentIds).toEqual([id(1),id(2),id(3)]);expect(result.sameNonemptyParentSet).toBe(true);
    expect(Object.keys(result).sort()).toEqual(['basis','leftKnownParentIds','rightKnownParentIds','sameNonemptyParentSet','sharedParentIds'].sort());
  });
  it('unknown parentage returns empty sets without asserting unrelatedness',()=>{
    expect(getSiblingRelationship(createEmptyKinshipState(),id(1),id(2),'legal',context).sameNonemptyParentSet).toBe(false);
    expect(()=>getSiblingRelationship(createEmptyKinshipState(),id(1),id(1),'legal',context)).toThrow('Sibling comparison requires distinct Persons.');
  });
  it('grandparent/grandchild use exactly two selected-basis edges and deduplicate pedigree collapse',()=>{
    const state=fixtureState([[1,2],[1,3],[2,4],[3,4],[5,2,'legal']]);
    expect(getGrandparents(state,id(4),'genetic',context)).toEqual([id(1)]);
    expect(getGrandchildren(state,id(1),'genetic',context)).toEqual([id(4)]);
    expect(getGrandparents(state,id(4),'legal',context)).toEqual([]);
  });
  it('a shortest-distance parent may also be grandparent through a second path',()=>{
    const state=fixtureState([[1,2],[1,3],[2,3]]);
    expect(getAncestors(state,id(3),'genetic',1,context)).toEqual({basis:'genetic',maxDepth:1,relatives:[{personId:id(1),minimumDistance:1},{personId:id(2),minimumDistance:1}],truncated:false});
    expect(getGrandparents(state,id(3),'genetic',context)).toEqual([id(1)]);
    expect(getGrandchildren(state,id(1),'genetic',context)).toEqual([id(3)]);
  });
  it('bounds ancestry, exposes omitted reachable Persons, and never mixes bases',()=>{
    const state=fixtureState([[1,2],[2,3],[3,4],[5,1,'legal']]);
    expect(getAncestors(state,id(4),'genetic',2,context)).toEqual({basis:'genetic',maxDepth:2,relatives:[{personId:id(3),minimumDistance:1},{personId:id(2),minimumDistance:2}],truncated:true});
    expect(getAncestors(state,id(4),'genetic',3,context).relatives.at(-1)).toEqual({personId:id(1),minimumDistance:3});
    expect(getAncestors(state,id(4),'legal',10,context).relatives).toEqual([]);
    expect(getDescendants(state,id(1),'genetic',2,context).truncated).toBe(true);
  });
  it('depth-limit outgoing edges only to already visited Persons are not truncation',()=>{
    const state=fixtureState([[1,2],[1,3],[2,3],[3,4]]);
    expect(getDescendants(state,id(1),'genetic',1,context).truncated).toBe(true);
    expect(getDescendants(state,id(1),'genetic',2,context).truncated).toBe(false);
  });
  it.each([0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid traversal depth %s',depth=>{
    expect(()=>getAncestors(createEmptyKinshipState(),id(1),'genetic',depth,context)).toThrow('Invalid Kinship traversal depth.');
    expect(()=>getDescendants(createEmptyKinshipState(),id(1),'legal',depth,context)).toThrow();
  });
  it('sorts by code-point IDs rather than numeric sequence/locale, then traversal distance',()=>{
    const state=fixtureState([[2,3],[10,3],[1,10]]);
    expect(getParents(state,id(3),'genetic',context)).toEqual([id(10),id(2)]);
    expect(getAncestors(state,id(3),'genetic',3,context).relatives).toEqual([{personId:id(10),minimumDistance:1},{personId:id(2),minimumDistance:1},{personId:id(1),minimumDistance:2}]);
    expect(state.parentages.map(item=>item.parentId)).toEqual([id(1),id(10),id(2)]);
  });
  it('all public queries reject missing Persons, invalid bases and malformed graph without mutation',()=>{
    const state=fixtureState([[1,2]]),before=JSON.stringify({state,context});
    for(const query of [getParents,getChildren,getGrandparents,getGrandchildren]){
      expect(()=>query(state,id(99),'genetic',context)).toThrow('Unknown Kinship Person.');
      expect(()=>query(state,id(1),'guardian' as ParentageBasis,context)).toThrow('Invalid parentage basis.');
      expect(()=>query(cast({version:1,parentages:[...state.parentages,...state.parentages]}),id(1),'genetic',context)).toThrow('Invalid Kinship state or validation context.');
    }
    expect(()=>getParentage(state,id(99),id(1),context)).toThrow();
    expect(()=>getSiblingRelationship(state,id(1),id(99),'genetic',context)).toThrow();
    expect(JSON.stringify({state,context})).toBe(before);
  });
  it('iteratively validates/traverses a deep chain without a generation or recursion cap',()=>{
    const count=3000,source=fixtureContext(count),state=fixtureState(Array.from({length:count-1},(_,index)=>[index+1,index+2] as const));
    expect(validKinshipWithPeople(state,source.people)).toBe(true);
    const result=getAncestors(state,id(count),'genetic',Number.MAX_SAFE_INTEGER,source);
    expect(result.relatives.length).toBe(count-1);expect(result.relatives.at(-1)).toEqual({personId:id(1),minimumDistance:count-1});expect(result.truncated).toBe(false);
    expect(validKinshipState(fixtureState([...Array.from({length:count-1},(_,index)=>[index+1,index+2] as const),[count,1]]))).toBe(false);
  });
  it('layered diamonds yield unique reachability instead of enumerating exponential paths',()=>{
    const edges:([number,number])[]=[];
    for(let level=0;level<20;level++)for(const parent of [2*level+1,2*level+2])for(const child of [2*level+3,2*level+4])edges.push([parent,child]);
    const result=getDescendants(fixtureState(edges),id(1),'genetic',30,fixtureContext(42));
    expect(result.relatives.length).toBe(40);expect(new Set(result.relatives.map(item=>item.personId)).size).toBe(40);expect(result.truncated).toBe(false);
  });
});

describe('Strict validation and ownership',()=>{
  const edge={parentId:id(1),childId:id(2),bases:['genetic']};
  const malformed:[string,unknown][]=[
    ['null',null],['wrong version',{version:2,parentages:[]}],['missing version',{parentages:[]}],['extra root field',{version:1,parentages:[],nextSequence:1}],
    ['sparse records',{version:1,parentages:new Array(1)}],['duplicate pair',{version:1,parentages:[edge,edge]}],['empty bases',{version:1,parentages:[{...edge,bases:[]}]}],
    ['basis duplicate',{version:1,parentages:[{...edge,bases:['genetic','genetic']}]}],['basis reversed',{version:1,parentages:[{...edge,bases:['legal','genetic']}]}],
    ['vague biological',{version:1,parentages:[{...edge,bases:['biological']}]}],['guardian',{version:1,parentages:[{...edge,bases:['guardian']}]}],['NaN basis',{version:1,parentages:[{...edge,bases:[NaN]}]}],
    ['sparse bases',{version:1,parentages:[{...edge,bases:new Array(1)}]}],['string bases',{version:1,parentages:[{...edge,bases:'genetic'}]}],['extra record field',{version:1,parentages:[{...edge,id:'parentage:1'}]}],
    ['self record',{version:1,parentages:[{...edge,childId:id(1)}]}],['cycle',fixtureState([[1,2],[2,1]])],['noncanonical records',{version:1,parentages:[...fixtureState([[1,2],[2,3]]).parentages].reverse()}],
    ...['person:0','person:01','person:-1','person:1.0','person:1e3','person:9007199254740992','cohort:1','parent:unknown',''].map(value=>[`invalid ID ${value}`,{version:1,parentages:[{...edge,parentId:value}]}] as [string,unknown]),
    ['null child',{version:1,parentages:[{...edge,childId:null}]}],['array root',[]],['custom root prototype',Object.assign(Object.create({}),{version:1,parentages:[]})],['Map',new Map()],['Set',new Set()],
    ['transparent proxy',new Proxy({version:1,parentages:[]},{})],['proxy record',{version:1,parentages:[new Proxy(edge,{})]}]
  ];
  it.each(malformed)('rejects %s without attempting repair',(_label,value)=>{
    expect(validKinshipState(value)).toBe(false);expect(validKinshipWithPeople(value,context.people)).toBe(false);
    expect(()=>addParentageBasis(cast(value),id(1),id(2),'legal',context)).toThrow('Invalid Kinship state or validation context.');
  });
  it('structural IDs may be safe maximum, but unresolved identities still fail cross validation',()=>{
    const state=cast({version:1,parentages:[{...edge,childId:`person:${Number.MAX_SAFE_INTEGER}`} ]});
    expect(validKinshipState(state)).toBe(true);expect(validKinshipWithPeople(state,context.people)).toBe(false);
  });
  it('rejects getters without invoking them at root, records, bases, People or context',()=>{
    let calls=0;
    for(const [target,key] of [[{version:1,parentages:[]},'parentages'],[{...edge},'parentId'],[['genetic'],'0']] as const){
      Object.defineProperty(target,key,{enumerable:true,get:()=>{calls++;throw Error('getter invoked');}});
      const value=key==='parentages'?target:cast({version:1,parentages:[key==='parentId'?target:{...edge,bases:target}]});
      expect(validKinshipState(value)).toBe(false);
    }
    const badContext=Object.defineProperty({},'people',{enumerable:true,get:()=>{calls++;return context.people;}}) as KinshipValidationContext;
    expect(()=>getParents(createEmptyKinshipState(),id(1),'legal',badContext)).toThrow('Invalid Kinship state or validation context.');
    expect(()=>addParentageBasis(createEmptyKinshipState(),id(1),id(2),'legal',badContext)).toThrow();
    const badPeople=Object.defineProperty({...context.people},'people',{enumerable:true,get:()=>{calls++;return context.people.people;}});
    expect(validKinshipWithPeople(createEmptyKinshipState(),badPeople)).toBe(false);expect(calls).toBe(0);
  });
  it('rejects hidden/symbol fields and array decorations at all nesting levels',()=>{
    for(const decoration of ['hidden','symbol','extra'] as const)for(const level of ['root','records','edge','bases'] as const){
      const value=structuredClone({version:1,parentages:[edge]}),target=level==='root'?value:level==='records'?value.parentages:level==='edge'?value.parentages[0]:value.parentages[0].bases;
      Object.defineProperty(target,decoration==='symbol'?Symbol('secret'):'secret',{value:1,enumerable:decoration!=='hidden'});
      expect(validKinshipState(value),`${decoration}/${level}`).toBe(false);
    }
  });
  it('rejects custom array/record prototypes, cyclic values and revoked proxies predictably',()=>{
    const modified=structuredClone({version:1,parentages:[edge]});Object.setPrototypeOf(modified.parentages,{});
    expect(validKinshipState(modified)).toBe(false);
    const record=structuredClone({version:1,parentages:[edge]});Object.setPrototypeOf(record.parentages[0],{});expect(validKinshipState(record)).toBe(false);
    const cyclic:Record<string,unknown>={version:1};cyclic.parentages=cyclic;expect(validKinshipState(cyclic)).toBe(false);
    const proxy=Proxy.revocable({version:1,parentages:[]},{});proxy.revoke();expect(validKinshipState(proxy.proxy)).toBe(false);
    expect(()=>getParents(cast(proxy.proxy),id(1),'legal',context)).toThrow('Invalid Kinship state or validation context.');
  });
  it('supports plain null-prototype records consistent with frozen validator conventions',()=>{
    const state=Object.assign(Object.create(null),{version:1,parentages:[Object.assign(Object.create(null),edge)]});
    expect(validKinshipState(state)).toBe(true);
    expect(addParentageBasis(state,id(1),id(2),'legal',context).parentages[0].bases).toEqual(['genetic','legal']);
  });
  it.each([null,{}, {people:context.people,extra:1},new Proxy(context,{})])('rejects malformed validation context %j',value=>{
    expect(()=>getParents(createEmptyKinshipState(),id(1),'legal',value as KinshipValidationContext)).toThrow('Invalid Kinship state or validation context.');
    expect(()=>addParentageBasis(createEmptyKinshipState(),id(1),id(2),'legal',value as KinshipValidationContext)).toThrow();
  });
  it('invalid People, including missing player and extra Person field, are not accepted as identity views',()=>{
    for(const people of [{...context.people,playerId:id(99)}, {...context.people,people:context.people.people.map(person=>({...person,parentIds:[]}))}])expect(validKinshipWithPeople(createEmptyKinshipState(),people)).toBe(false);
  });
  it('owns immutable outputs despite later mutation of caller graph and context',()=>{
    const input=fixtureState([[1,2]]),source=structuredClone(context),next=addParentageBasis(input,id(2),id(3),'legal',source),before=JSON.stringify(next);
    (input.parentages[0].bases as ParentageBasis[]).push('legal');(input.parentages as unknown[]).length=0;
    (source.people.people as unknown[]).length=0;
    expect(JSON.stringify(next)).toBe(before);
    expect(Object.isFrozen(next)).toBe(true);expect(Object.isFrozen(next.parentages[0])).toBe(true);expect(Object.isFrozen(next.parentages[0].bases)).toBe(true);
    expect(()=>{(next.parentages[0].bases as ParentageBasis[]).push('legal');}).toThrow();
  });
  it('all query results are immutable owned values, never canonical-state indexes or aliases',()=>{
    const state=fixtureState([[1,2],[1,3],[2,4]]),before=JSON.stringify({state,context});
    const edge=getParentage(state,id(1),id(2),context)!;
    expect(edge).not.toBe(state.parentages[0]);expect(edge.bases).not.toBe(state.parentages[0].bases);
    const results=[getParents(state,id(2),'genetic',context),getChildren(state,id(1),'genetic',context),getGrandparents(state,id(4),'genetic',context),getGrandchildren(state,id(1),'genetic',context),getSiblingRelationship(state,id(2),id(3),'genetic',context),getAncestors(state,id(4),'genetic',4,context),getDescendants(state,id(1),'genetic',4,context),edge];
    for(const result of results)expect(Object.isFrozen(result)).toBe(true);
    expect(()=>{(edge.bases as ParentageBasis[]).push('legal');}).toThrow();
    expect(JSON.stringify({state,context})).toBe(before);expect(Object.keys(state)).toEqual(['version','parentages']);
  });
});
