import {describe,expect,it} from 'vitest';
import {addMonths,ageOn} from '../core/clock';
import {recordHistoryFact} from '../core/history';
import {addTrait} from '../systems/character';
import {adultStart,ageUp,createGame} from '../simulation';
import {isGame,loadGame,migrateGame,parseGame,PRE_PERSON_SAVE_KEY,RECOVERY_SNAPSHOTS,saveGame,SAVE_KEY,serializeGame} from '../save';
import type {Game} from '../types';
import fixture from '../fixtures/life-v1.json';
import {createLegacyPopulation} from './population';
import {allocatePerson,createPeople,createPerson,getPerson,playerPerson,replacePerson,validPeople,validPerson,type PersonInput} from './person';

const born={year:2000,month:2,day:29};
const input=(overrides:Partial<PersonInput>={}):PersonInput=>({name:'Alex Morgan',dateOfBirth:born,genderLabel:'Non-binary',lifeStatus:'living',traits:[],temperament:{},aptitudes:{},...overrides});
const legacy=(game:Game)=>{const value=structuredClone(game) as unknown as Record<string,unknown>;value.version=1;delete value.people;delete value.population;return value;};
const memoryStorage=(entries:Record<string,string>={})=>{const data=new Map(Object.entries(entries));return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};

describe('country-neutral Person and PeopleState v1',()=>{
 it('creates the player as person:1 and allocates the same Person type monotonically',()=>{
  const people=createPeople(input()),allocated=allocatePerson(people,input({name:'Jamie Morgan',genderLabel:'Woman'}));
  expect(people).toEqual({version:1,nextSequence:2,playerId:'person:1',people:[expect.objectContaining({id:'person:1',sequence:1})]});
  expect(allocated.person.id).toBe('person:2');expect(allocated.state.nextSequence).toBe(3);expect(getPerson(allocated.state,'person:2')).toEqual(allocated.person);expect(validPerson(playerPerson(people))).toBe(true);expect(validPerson(allocated.person)).toBe(true);
 });
 it('never reuses an identity after death',()=>{
  const people=createPeople(input()),player=playerPerson(people),deceased=createPerson(1,{...input(),lifeStatus:'deceased',diedAt:{year:2050,month:1,day:1}}),afterDeath=replacePerson(people,deceased),next=allocatePerson(afterDeath,input({name:'Next Person'}));
  expect(player.id).toBe('person:1');expect(next.person.id).toBe('person:2');expect(next.state.people.map(person=>person.id)).toEqual(['person:1','person:2']);
 });
 it('preserves exact birth dates, contains no age authority, and derives age from Clock',()=>{
  const game=adultStart(createGame('Clock Person','Woman','ca',1)),person=playerPerson(game.people!);
  expect(person.dateOfBirth).toEqual(game.dateOfBirth);expect('age' in person).toBe(false);expect(ageOn(person.dateOfBirth,game.clock!.date)).toBe(game.age);
 });
 it('accepts the full shared Gregorian birth-date range and rejects dates outside it',()=>{
  expect(createPerson(1,input({dateOfBirth:{year:1,month:1,day:1}})).dateOfBirth).toEqual({year:1,month:1,day:1});
  expect(createPerson(1,input({dateOfBirth:{year:1899,month:12,day:31}})).dateOfBirth).toEqual({year:1899,month:12,day:31});
  expect(createPerson(1,input({dateOfBirth:{year:9999,month:12,day:31}})).dateOfBirth).toEqual({year:9999,month:12,day:31});
  expect(validPerson({...createPerson(1,input()),dateOfBirth:{year:0,month:1,day:1}})).toBe(false);
  expect(validPerson({...createPerson(1,input()),dateOfBirth:{year:10000,month:1,day:1}})).toBe(false);
 });
 it('validates life status and exact death semantics',()=>{
  expect(()=>createPerson(1,{...input(),lifeStatus:'deceased'})).toThrow('exact death date');
  expect(validPerson({...createPerson(1,input()),diedAt:{year:2050,month:1,day:1}})).toBe(false);
  expect(validPerson({...createPerson(1,{...input(),lifeStatus:'deceased',diedAt:{year:2050,month:1,day:1}}),diedAt:{year:1999,month:1,day:1}})).toBe(false);
  let game=createGame('Mortal','Man','uk',2);game.stats.health=1;game=ageUp(game);const person=playerPerson(game.people!);expect(person.lifeStatus).toBe('deceased');expect(person.diedAt).toEqual(game.clock!.date);
 });
 it('preserves descriptive traits and synchronizes addTrait through one bridge',()=>{
  const game=createGame('Traits','Non-binary','uk',3);addTrait(game,'patient');addTrait(game,'patient');
  expect(game.development!.traits).toEqual(['patient']);expect(playerPerson(game.people!).traits).toEqual(['patient']);expect(isGame(game)).toBe(true);
 });
 it('accepts bounded keyed temperament and aptitudes without reinterpreting old stats',()=>{
  const person=createPerson(1,input({temperament:{'human.risk-tolerance':0,'human.sociability':100},aptitudes:{'human.numeracy':100}}));
  expect(person.temperament).toEqual({'human.risk-tolerance':0,'human.sociability':100});expect(person.aptitudes).toEqual({'human.numeracy':100});
  for(const invalid of [-1,101,NaN,Infinity])expect(validPerson({...person,temperament:{'human.risk-tolerance':invalid}})).toBe(false);
  expect(validPerson({...person,aptitudes:{numeracy:50}})).toBe(false);
  const game=createGame('No inference','Woman','uk',4);game.stats.smarts=100;game.stats.happiness=0;expect(playerPerson(game.people!).aptitudes).toEqual({});expect(playerPerson(game.people!).temperament).toEqual({});
 });
 it('constructs immutable alias-safe records without consuming random state',()=>{
  const traits=['patient'],temperament={'human.patience':75},aptitudes={'human.reasoning':60},before={...temperament};const person=createPerson(1,input({traits,temperament,aptitudes}));traits.push('changed');temperament['human.patience']=0;aptitudes['human.reasoning']=0;
  expect(person.traits).toEqual(['patient']);expect(person.temperament).toEqual(before);expect(person.aptitudes).toEqual({'human.reasoning':60});expect(Object.isFrozen(person)).toBe(true);expect(Object.isFrozen(person.dateOfBirth)).toBe(true);
  const game=createGame('No draw','Woman','ca',5),randomness=structuredClone(game.randomness);createPerson(2,input());expect(game.randomness).toEqual(randomness);
 });
 it('rejects malformed shapes, sparse arrays, aliases and duplicate player identities',()=>{
  const person=createPerson(1,input());expect(validPerson({...person,extra:true})).toBe(false);expect(validPerson({...person,traits:new Array(1)})).toBe(false);expect(validPeople({...createPeople(input()),nextSequence:3})).toBe(false);expect(validPeople({...createPeople(input()),playerId:'person:2'})).toBe(false);
  let reads=0;const hostile={...person};Object.defineProperty(hostile,'name',{enumerable:true,get:()=>{reads++;return 'Hostile';}});expect(validPerson(hostile)).toBe(false);expect(reads).toBe(0);
  const revoked=Proxy.revocable(person,{});revoked.revoke();expect(()=>validPerson(revoked.proxy)).not.toThrow();expect(validPerson(revoked.proxy)).toBe(false);
  const hidden={...person,temperament:{'human.patience':50}};Object.defineProperty(hidden.temperament,'hidden',{value:1});expect(validPerson(hidden)).toBe(false);
 });
 it('uses Person IDs unchanged as History actor and subject identities',()=>{
  const people=allocatePerson(createPeople(input()),input({name:'Jamie'})).state,recorded=recordHistoryFact({version:1,nextSequence:1,facts:[]},{year:2030,month:1,day:1},{type:'person.met',source:'human.test',actorIds:[people.playerId],subjectIds:['person:2']});
  expect(recorded.fact.actorIds).toEqual(['person:1']);expect(recorded.fact.subjectIds).toEqual(['person:2']);
 });
});

describe('Person persistence and root-v3 population migration',()=>{
 it('migrates root v1 once to exactly one deterministic player without inventing state or consuming RNG',()=>{
  const current=adultStart(createGame('Legacy Person','Self-described','uk',6));current.money=1234;current.job='barista';current.education='secondary';addTrait(current,'patient');const old=legacy(current),beforeRandomness=structuredClone(old.randomness),relationships=structuredClone(old.relationships),migrated=migrateGame(old)!;
  expect(migrated.version).toBe(3);expect(migrated.people).toEqual(expect.objectContaining({version:1,nextSequence:2,playerId:'person:1'}));expect(migrated.people!.people).toHaveLength(1);expect(playerPerson(migrated.people!).traits).toEqual(['patient']);expect(playerPerson(migrated.people!).aptitudes).toEqual({});expect(playerPerson(migrated.people!).temperament).toEqual({});expect(migrated.randomness).toEqual(beforeRandomness);expect(migrated.money).toBe(1234);expect(migrated.job).toBe('barista');expect(migrated.education).toBe('secondary');expect(migrated.relationships).toEqual(relationships);expect(migrateGame(migrated)).toEqual(migrated);
  expect(migrated.clock!.date).toEqual(current.clock!.date);expect(migrated.ukWorld).toEqual(current.ukWorld);
 });
 it('preserves the exact established gender-label compatibility value during migration',()=>{
  const old=legacy(createGame('Legacy label','Woman','ca',61));old.gender='';expect(isGame(old)).toBe(true);const migrated=migrateGame(old)!;expect(playerPerson(migrated.people!).genderLabel).toBe('');expect(migrated.gender).toBe('');expect(isGame(migrated)).toBe(true);
 });
 it('preserves an unknown legacy death date without fabricating one',()=>{
  const old=legacy(createGame('Legacy Death','Man','ca',7));old.alive=false;old.cause='Legacy cause';old.pending=null;const randomness=structuredClone(old.randomness),migrated=migrateGame(old)!;
  expect(playerPerson(migrated.people!).lifeStatus).toBe('deceased');expect(playerPerson(migrated.people!).diedAt).toBeUndefined();expect(migrated.randomness).toEqual(randomness);expect(isGame(migrated)).toBe(true);
 });
 it('rejects root-v2 missing, malformed, or projection-disagreeing People state',()=>{
  const game=createGame('Canonical','Woman','uk',8),missing=structuredClone(game) as unknown as Record<string,unknown>;delete missing.people;expect(parseGame(JSON.stringify(missing)).reason).toBe('invalid-state');
  expect(parseGame(JSON.stringify({...game,people:{}})).reason).toBe('invalid-state');expect(isGame({...game,name:'Different'})).toBe(false);expect(isGame({...game,dateOfBirth:addMonths(game.dateOfBirth!,1)})).toBe(false);expect(isGame({...game,alive:false})).toBe(false);
 });
 it('round trips identities and allocates the next Person after save/load',()=>{
  const game=createGame('Persistent','Non-binary','nz',9);game.people=allocatePerson(game.people!,input({name:'NPC'})).state;game.version=2;delete game.population;const serialized=serializeGame(game);expect(serialized.ok).toBe(true);if(!serialized.ok)return;const loaded=parseGame(serialized.raw).game!,next=allocatePerson(loaded.people!,input({name:'Another NPC'}));expect(loaded.people).toEqual(game.people);expect(next.person.id).toBe('person:3');
 });
 it('round trips a pre-1900 Person through the unchanged root-v3 schema',()=>{
  const game=createGame('Historical identity','Person','ca',90),allocated=allocatePerson(game.people!,input({name:'Older Person',dateOfBirth:{year:1899,month:12,day:31}}));game.people=allocated.state;game.population=createLegacyPopulation(game.people,'ca');
  const serialized=serializeGame(game);expect(serialized.ok).toBe(true);if(!serialized.ok)return;const loaded=parseGame(serialized.raw).game!;
  expect(loaded.version).toBe(3);expect(getPerson(loaded.people!,'person:2')?.dateOfBirth).toEqual({year:1899,month:12,day:31});expect(loaded.people?.nextSequence).toBe(3);expect(migrateGame(loaded)).toEqual(loaded);
 });
 it('preserves exact root-v1 bytes once and blocks replacement if recovery creation fails',()=>{
  const old=legacy(createGame('Recovery','Woman','uk',10)),raw=JSON.stringify(old),migrated=migrateGame(old)!,storage=memoryStorage({[SAVE_KEY]:raw});expect(saveGame(storage,migrated)).toBeNull();expect(storage.data.get(PRE_PERSON_SAVE_KEY)).toBe(raw);const first=storage.data.get(PRE_PERSON_SAVE_KEY);expect(saveGame(storage,migrated)).toBeNull();expect(storage.data.get(PRE_PERSON_SAVE_KEY)).toBe(first);expect(RECOVERY_SNAPSHOTS.some(snapshot=>snapshot.key===PRE_PERSON_SAVE_KEY)).toBe(true);
  const blocked={getItem:(key:string)=>key===SAVE_KEY?raw:null,setItem:(key:string)=>{if(key===PRE_PERSON_SAVE_KEY)throw Error('Quota');}};expect(saveGame(blocked,migrated)).toBeTruthy();expect(blocked.getItem(SAVE_KEY)).toBe(raw);
 });
 it('keeps human-domain code free of React, UK, politics, host randomness and wall-clock identity',()=>{
  const sources=import.meta.glob<string>('./*.ts',{eager:true,query:'?raw',import:'default'});for(const [path,source] of Object.entries(sources)){expect(source,path).not.toMatch(/from\s+['"][^'"]*(?:react|politics|ukWorld|national)/);expect(source,path).not.toMatch(/Math\.random|Date\.now/);}
 });
 it('keeps the old fixture migratable while canonical new lives use root v2',()=>{
  expect(migrateGame(fixture)?.version).toBe(3);expect(createGame('New','Woman','uk',11).version).toBe(3);
 });
});
