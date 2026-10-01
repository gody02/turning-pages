import {describe,expect,it} from 'vitest';
import legacyV1 from './fixtures/life-v1.json';
import {createGame,ageUp} from './simulation';
import {isGame,migrateGame,parseGame,serializeGame} from './save';
import {validGameWithContent} from './gameContent';
import {allocatePerson,createPerson,replacePerson} from './human/person';
import {createLegacyPopulation} from './human/population';
import {createEmptyResidenceState,establishResidence,recordNoFixedAbode} from './residence/state';
import {context,syntheticResidenceGame} from './testing/residenceFixture';
import type {CurrentGame} from './types';
import {createSettlementRegistry,withSettlementPackageFingerprint} from './geography/settlements/package';
import {createSettlementRuntime} from './geography/settlements/runtime';
import {removePersonFromResidences} from './residence/state';


describe('Residence root v4 integration',()=>{
 it('migrates v1, v2 and v3 to empty Residence without modifying the source',()=>{
  const root3=createGame('Migration','Unspecified','ca',11),root2=structuredClone(root3) as unknown as Record<string,unknown>;root2.version=2;delete root2.population;
  for(const source of [legacyV1,root2,root3]){const before=structuredClone(source),game=migrateGame(source)!;expect(game.version).toBe(4);expect(game.residence).toEqual(createEmptyResidenceState());expect(source).toEqual(before);expect(isGame(game)).toBe(true);expect(migrateGame(game)).toEqual(game);}
  const upgraded=migrateGame(root3)!;const {residence,...rest}=upgraded;expect({...rest,version:3}).toEqual(root3);expect(residence).toEqual(createEmptyResidenceState());
 });
 it('requires Residence in v4 and never repairs present malformed data',()=>{
  const game=syntheticResidenceGame(),badValues=[undefined,null,{}, {...game.residence,version:2},{...game.residence,nextSequence:0},{...game.residence,residences:{}},{...game.residence,occupants:new Array(1)},{...game.residence,occupants:[{personId:'person:999',residenceId:'residence:1'}]},{...game.residence,noFixedAbodePersonIds:['person:999']},{...game.residence,noFixedAbodePersonIds:['person:1','person:5']}];
  for(const residence of badValues){const invalid={...game,residence};expect(isGame(invalid)).toBe(false);expect(migrateGame(invalid)).toBeNull();expect(parseGame(JSON.stringify(invalid)).game).toBeNull();}
  const dead={...game,people:replacePerson(game.people!,createPerson(2,{...game.people!.people[1],lifeStatus:'deceased',diedAt:game.clock!.date}))};expect(isGame(dead)).toBe(false);
  const deadNoFixed={...game,people:replacePerson(game.people!,createPerson(5,{...game.people!.people[4],lifeStatus:'deceased',diedAt:game.clock!.date}))};expect(isGame(deadNoFixed)).toBe(false);
 });
 it('round-trips shared, multiple, rural, cross-boundary and no-fixed-abode facts',()=>{
  const game=syntheticResidenceGame(),serialized=serializeGame(game);expect(serialized.ok).toBe(true);if(!serialized.ok)return;
  expect(serialized.game).toEqual(game);const loaded=parseGame(serialized.raw).game!;expect(loaded.residence).toEqual(game.residence);expect(validGameWithContent(loaded,context(loaded.people!))).toBe(true);expect(serialized.raw).not.toContain('registry');expect(serializeGame(loaded)).toEqual(serialized);
  const clone=migrateGame(game) as CurrentGame;(clone.residence.occupants as unknown as unknown[]).pop();expect(game.residence.occupants).toHaveLength(6);
 });
 it('preserves exact Settlement package identity and rejects an unavailable successor resolver',()=>{
  const game=syntheticResidenceGame(),other=context(game.people!,{...context(game.people!).settlements.registry.packages[0],packageId:'settlements.synthetic-residence-2025-v1'});
  const loaded=parseGame(JSON.stringify(game)).game!;expect(isGame(loaded)).toBe(true);expect(validGameWithContent(loaded,other)).toBe(false);expect(validGameWithContent(loaded,context(loaded.people!))).toBe(true);
  const original=context(game.people!),a=original.settlements.registry,b=other.settlements.registry,{fingerprint:_fingerprint,...newerRaw}=b.packages[0],continuity={...newerRaw.decisions[0],id:'settlement-decision.synthetic-residence.continuity-v1',classification:'manual-continuity' as const},newer=withSettlementPackageFingerprint({...newerRaw,decisions:[...newerRaw.decisions,continuity],settlements:newerRaw.settlements.map(item=>({...item,decisionIds:[continuity.id]}))}),both={...original,settlements:createSettlementRuntime(createSettlementRegistry(a.identities,[...a.packages,newer],[...a.packageManifest,{packageId:newer.packageId,fingerprint:newer.fingerprint}],a.identityManifest,original.geography),original.geography)};
  expect(validGameWithContent(loaded,both)).toBe(true);expect((loaded.residence!.residences[2].location as {settlement:{packageId:string}}).settlement.packageId).toBe(a.packages[0].packageId);
  const invalid=structuredClone(game);(invalid.residence.residences[2].location as {administrativeArea:{placeId:string}}).administrativeArea.placeId='place.synthetic.aa.rural';expect(isGame(invalid)).toBe(true);expect(validGameWithContent(invalid,context(invalid.people!))).toBe(false);
  for(const field of ['packageId','settlementId'] as const){const missing=structuredClone(game),location=missing.residence.residences[2].location as {settlement:{packageId:string;settlementId:string}};location.settlement[field]=field==='packageId'?'settlements.synthetic-residence-missing-v1':'settlement.synthetic.aa.missing';expect(isGame(missing)).toBe(true);expect(validGameWithContent(missing,context(missing.people!))).toBe(false);}
  const unknownArea=structuredClone(game);(unknownArea.residence.residences[1].location as {administrativeArea:{placeId:string}}).administrativeArea.placeId='place.synthetic.aa.missing';expect(isGame(unknownArea)).toBe(true);expect(validGameWithContent(unknownArea,context(unknownArea.people!))).toBe(false);
 });
 it('removes deceased player occupancy at Game orchestration while retaining shared homes and allocation sequence',()=>{
  const game=syntheticResidenceGame();game.stats.health=0;game.pending=null;const before=structuredClone(game),next=ageUp(game,context(game.people!)) as CurrentGame;
  expect(next.alive).toBe(false);expect(next.people!.people[0].lifeStatus).toBe('deceased');expect(next.residence.occupants.some(item=>item.personId==='person:1')).toBe(false);expect(next.residence.residences.map(item=>item.id)).toEqual(['residence:1','residence:3']);expect(next.residence.nextSequence).toBe(4);expect(isGame(next)).toBe(true);expect(game).toEqual(before);expect(next.population).toEqual(game.population);
 });
 it('rejects nonempty death cleanup without resolvers transactionally',()=>{const game=syntheticResidenceGame();game.stats.health=0;const before=structuredClone(game);expect(()=>ageUp(game)).toThrow('resolvers');expect(game).toEqual(before);});
 it('clears a deceased player no-fixed-abode marker without inventing another residence',()=>{const game=syntheticResidenceGame(),content=context(game.people!);game.residence=recordNoFixedAbode(removePersonFromResidences(game.residence,'person:1',content),'person:1',content);game.stats.health=0;const next=ageUp(game,content) as CurrentGame;expect(next.residence.noFixedAbodePersonIds).toEqual(['person:5']);expect(next.residence.nextSequence).toBe(game.residence.nextSequence);expect(isGame(next)).toBe(true);});
});
