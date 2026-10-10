import {afterEach,describe,expect,it,vi} from 'vitest';
import legacy from './fixtures/life-v1.json';
import {isGame,isCanonicalGamePayload,upgradeGameToCurrent,upgradeGameToV6,serializeCurrentGame,serializeGameV6,parseCurrentGame,parseGameV6,requiredRecoverySnapshotKeys,PRE_RELATIONSHIP_UNION_SAVE_KEY} from './save';
import {syntheticKinshipGame} from './testing/kinshipRootFixture';
import {syntheticRelationshipUnionGame,relationshipUnionContext} from './testing/relationshipUnionRootFixture';
import {syntheticResidenceGame} from './testing/residenceFixture';
import {syntheticHouseholdGame} from './testing/householdRootFixture';
import {createGame,ageUp} from './simulation';
import {validGameWithContent} from './gameContent';
import {createEmptyResidenceState} from './residence/state';
import {createEmptyHouseholdState} from './household/state';
import {createEmptyPartnershipState,establishPartnership} from './partnership/state';
import {createEmptyFormalUnionState,createFormalUnion} from './formalUnion/state';
import {fixtureKinds,fixtureInput} from './formalUnion/fixtures';
import {allocatePerson,createPerson,replacePerson} from './human/person';
import {createLegacyPopulation} from './human/population';

afterEach(()=>vi.restoreAllMocks());
describe('current root7 and pinned historical6',()=>{
 it('adds exact independent empty state only without JSON, entropy, time or inference',()=>{
  const source=syntheticKinshipGame(),before=structuredClone(source);
  const parse=vi.spyOn(JSON,'parse').mockImplementation(()=>{throw Error('No JSON');}),encode=vi.spyOn(JSON,'stringify').mockImplementation(()=>{throw Error('No JSON');});
  const random=vi.spyOn(Math,'random'),now=vi.spyOn(Date,'now'),entropy=vi.spyOn(crypto,'getRandomValues');
  const first=upgradeGameToCurrent(source)!,second=upgradeGameToCurrent(source)!;
  expect(parse).not.toHaveBeenCalled();expect(encode).not.toHaveBeenCalled();expect(random).not.toHaveBeenCalled();expect(now).not.toHaveBeenCalled();expect(entropy).not.toHaveBeenCalled();
  const {partnership,formalUnion,...rest}=first;expect({...rest,version:6}).toEqual(before);expect(source).toEqual(before);expect(first).toEqual(second);
  expect(partnership).toEqual(createEmptyPartnershipState());expect(formalUnion).toEqual(createEmptyFormalUnionState());expect(first.people).not.toBe(source.people);
  expect(first.partnership).not.toBe(second.partnership);expect(first.formalUnion).not.toBe(second.formalUnion);expect(Object.isFrozen(first.partnership)).toBe(true);expect(Object.isFrozen(first.formalUnion.unions)).toBe(true);
 });
 it('extends all historical chains and retains a pinned6 target',()=>{
  for(const source of [legacy,createGame('Historic','Unspecified','ca',17),syntheticResidenceGame(),syntheticHouseholdGame(),syntheticKinshipGame()]){
   const before=structuredClone(source),historical=serializeGameV6(source),current=serializeCurrentGame(source);if(!historical.ok||!current.ok)throw Error('Codec');
   expect(current.game.version).toBe(7);const {partnership,formalUnion,...rest}=current.game;expect({...rest,version:6}).toEqual(historical.game);expect(source).toEqual(before);
   expect(parseGameV6(historical.raw).game).toEqual(historical.game);expect(parseCurrentGame(historical.raw).game).toEqual(current.game);expect(isCanonicalGamePayload(historical.raw)).toBe(true);
   expect(new TextEncoder().encode(current.raw).length-new TextEncoder().encode(historical.raw).length).toBe(103);
   expect(upgradeGameToV6(current.game)).toBeNull();expect(parseGameV6(current.raw).reason).toBe('unsupported-version');
   expect(requiredRecoverySnapshotKeys(historical.game,current.game)).toEqual([PRE_RELATIONSHIP_UNION_SAVE_KEY]);
  }
 });
 it('round-trips independent/populated retained contracts and exact allocator continuation',()=>{
  const game=syntheticRelationshipUnionGame(),before=structuredClone(game);
  for(const candidate of [game,{...game,partnership:createEmptyPartnershipState()},{...game,formalUnion:createEmptyFormalUnionState()}]){
   const encoded=serializeCurrentGame(candidate);if(!encoded.ok)throw Error(encoded.error);expect(parseCurrentGame(encoded.raw).game).toEqual(candidate);expect(isCanonicalGamePayload(encoded.raw)).toBe(true);
   expect(validGameWithContent(candidate,relationshipUnionContext(game))).toBe(true);
  }
  for(const separation of ['unknown','not-separated','separated'] as const)for(const reason of ['annulment','dissolution'] as const){
   const candidate={...game,formalUnion:{...game.formalUnion,unions:game.formalUnion.unions.map(record=>record.standing.kind==='in-force'?{...record,standing:{kind:'in-force' as const,separation}}:{...record,standing:{kind:'ended' as const,end:{reason,endedOn:null}}})}};
   const result=serializeCurrentGame(candidate);if(!result.ok)throw Error(result.error);expect(parseCurrentGame(result.raw).game).toEqual(candidate);
  }
  const permuted={...game,partnership:{partnerships:game.partnership.partnerships,version:1},formalUnion:{unions:game.formalUnion.unions.map(({id,sequence,personIds,kindId,formedOn,standing})=>({standing,formedOn:formedOn&&{day:formedOn.day,year:formedOn.year,month:formedOn.month},kindId,personIds,sequence,id})),nextSequence:game.formalUnion.nextSequence,version:1}};
  expect(serializeCurrentGame(permuted)).toEqual(serializeCurrentGame(game));
  const parallel={...game,partnership:establishPartnership(game.partnership,'person:1','person:3',{people:game.people,referenceDate:game.clock!.date})};expect(isGame(parallel)).toBe(true);
  const encoded=serializeCurrentGame(game);if(!encoded.ok)throw Error(encoded.error);const loaded=parseCurrentGame(encoded.raw).game!;
  const continued=createFormalUnion(loaded.formalUnion,{...fixtureInput(2,3),formedOn:loaded.clock!.date},{people:loaded.people,referenceDate:loaded.clock!.date,kinds:fixtureKinds()});expect(continued.union.id).toBe('formal-union:5');expect(game).toEqual(before);
  const lexical=upgradeGameToCurrent(createGame('Synthetic pair order','Unspecified','ca',12))!;
  for(let sequence=2;sequence<=10;sequence++)lexical.people=allocatePerson(lexical.people,{...lexical.people.people[0],name:`Synthetic ${sequence}`}).state;
  lexical.population=createLegacyPopulation(lexical.people,lexical.country);
  const pairContext={people:lexical.people,referenceDate:lexical.clock!.date},left=establishPartnership(lexical.partnership,'person:2','person:10',pairContext),right=establishPartnership(lexical.partnership,'person:10','person:2',pairContext);
  expect(left.partnerships[0].personIds).toEqual(['person:10','person:2']);expect(serializeCurrentGame({...lexical,partnership:left})).toEqual(serializeCurrentGame({...lexical,partnership:right}));
 });
 it('requires exact states on7, rejects additions to6, and never repairs corrupt state',()=>{
  const game=syntheticRelationshipUnionGame();
  expect(isGame({...syntheticKinshipGame(),partnership:game.partnership,formalUnion:game.formalUnion})).toBe(false);
  for(const component of ['partnership','formalUnion'] as const)for(const value of [undefined,null,{}, {...game[component],extra:1},{...game[component],version:2}]){
   const invalid={...game,[component]:value};expect(isGame(invalid)).toBe(false);expect(upgradeGameToCurrent(invalid)).toBeNull();expect(serializeCurrentGame(invalid).ok).toBe(false);
  }
  for(const ids of [['person:1','person:1'],['person:2','person:1'],['person:1','person:999']])expect(isGame({...game,partnership:{version:1,partnerships:[{personIds:ids}]}})).toBe(false);
  expect(isGame({...game,formalUnion:{...game.formalUnion,nextSequence:4}})).toBe(false);
  for(const unions of [
   [...game.formalUnion.unions,game.formalUnion.unions[3]],
   game.formalUnion.unions.map(record=>({...record,personIds:['person:1','person:1']})),
   game.formalUnion.unions.map(record=>({...record,personIds:['person:1','person:999']})),
   [...game.formalUnion.unions,{...game.formalUnion.unions[1],id:'formal-union:5',sequence:5}],
  ])expect(isGame({...game,formalUnion:{version:1,nextSequence:6,unions}})).toBe(false);
  expect(isGame({...game,formalUnion:{...game.formalUnion,unions:game.formalUnion.unions.map(record=>({...record,formedOn:{year:9999,month:1,day:1}}))}})).toBe(false);
 });
 it('rejects hostile components predictably without executing getters',()=>{
  const game=syntheticRelationshipUnionGame();let reads=0;const accessor={version:1};Object.defineProperty(accessor,'partnerships',{enumerable:true,get:()=>{reads++;throw Error('Getter');}});
  const hidden={version:1,partnerships:[]};Object.defineProperty(hidden,'hidden',{value:1});const revoked=Proxy.revocable(game.partnership,{});revoked.revoke();
  for(const partnership of [accessor,hidden,{...game.partnership,[Symbol('hidden')]:1},{version:1,partnerships:new Array(1)},new Proxy(game.partnership,{}),revoked.proxy,Object.setPrototypeOf({version:1,partnerships:[]},{custom:true})]){
   expect(()=>serializeCurrentGame({...game,partnership})).not.toThrow();expect(serializeCurrentGame({...game,partnership}).ok).toBe(false);
  }expect(reads).toBe(0);
 });
 it('requires kind content independently of Residence, including terminal records and malformed empty registries',()=>{
  const game={...syntheticRelationshipUnionGame(),residence:createEmptyResidenceState()};expect(isGame(game)).toBe(true);expect(validGameWithContent(game)).toBe(false);expect(validGameWithContent(game,relationshipUnionContext(game))).toBe(true);
  const empty={...game,formalUnion:createEmptyFormalUnionState()};expect(validGameWithContent(empty)).toBe(true);expect(validGameWithContent(empty,{...relationshipUnionContext(empty),formalUnionKinds:{version:1,kinds:[],manifest:[{kindId:'bad',fingerprint:'fnv1a64-v1:0000000000000000'}]}})).toBe(false);
  const member=game.people.people.find(person=>person.id==='person:2')!,dead=createPerson(member.sequence,{...member,lifeStatus:'deceased',diedAt:game.clock!.date});
  const terminal={...game,people:replacePerson(game.people,dead),household:createEmptyHouseholdState(),partnership:createEmptyPartnershipState(),formalUnion:{version:1 as const,nextSequence:2,unions:[{...game.formalUnion.unions[0],formedOn:null,standing:{kind:'ended' as const,end:{reason:'death' as const,endedOn:game.clock!.date,deceasedPersonId:'person:2'}}}]}};
  const encoded=serializeCurrentGame(terminal);if(!encoded.ok)throw Error(encoded.error);expect(parseCurrentGame(encoded.raw).game).toEqual(terminal);expect(validGameWithContent(terminal,relationshipUnionContext(terminal))).toBe(true);
 });
 it.each([false,true])('cleans only player Partnership before Residence early return (occupied=%s), retaining Union',occupied=>{
  let game=upgradeGameToCurrent(syntheticResidenceGame())!;game={...game,household:createEmptyHouseholdState(),residence:occupied?game.residence:createEmptyResidenceState()};
  const ctx={people:game.people,referenceDate:game.clock!.date,kinds:fixtureKinds()};game.partnership=establishPartnership(game.partnership,'person:1','person:2',{people:ctx.people,referenceDate:ctx.referenceDate});game.formalUnion=createFormalUnion(game.formalUnion,{...fixtureInput(),formedOn:ctx.referenceDate},ctx).state;
  const before=structuredClone(game);game.stats.health=0;const next=ageUp(game,relationshipUnionContext(game));expect(next.version).toBe(7);expect(isGame(next)).toBe(true);
  if(next.version!==7)throw Error('Current root');expect(next.partnership.partnerships).toEqual([]);expect(next.formalUnion).toEqual(before.formalUnion);expect(next.kinship).toEqual(before.kinship);expect(game.partnership).toEqual(before.partnership);expect(next.residence.occupants.some(item=>item.personId==='person:1')).toBe(false);
  const stale=syntheticRelationshipUnionGame();stale.stats.health=0;const snapshot=structuredClone(stale);expect(()=>ageUp(stale,relationshipUnionContext(stale))).toThrow('validation');expect(stale).toEqual(snapshot);
 });
});
