import {describe,expect,it} from 'vitest';
import {acceptApplicationGame} from './gameContent';
import {context,syntheticResidenceGame,settlementPackage} from '../engine/testing/residenceFixture';
import {migrateGame,upgradeGameToCurrent} from '../engine/save';
import {createGame} from '../engine/simulation';
import type {Game} from '../engine/types';
import {syntheticRelationshipUnionGame,relationshipUnionContext} from '../engine/testing/relationshipUnionRootFixture';
import {createEmptyResidenceState} from '../engine/residence/state';
import {createEmptyFormalUnionState} from '../engine/formalUnion/state';

describe('application Residence acceptance',()=>{
 it('checks root7 Union kinds without Residence and rejects malformed empty registries without mutation',async()=>{
  const game={...syntheticRelationshipUnionGame(),residence:createEmptyResidenceState()},before=structuredClone(game);
  await expect(acceptApplicationGame(game)).rejects.toThrow('unavailable');expect(game).toEqual(before);
  expect(await acceptApplicationGame(game,relationshipUnionContext(game))).toBe(game);
  const empty={...game,formalUnion:createEmptyFormalUnionState()};expect(await acceptApplicationGame(empty)).toBe(empty);
  await expect(acceptApplicationGame(empty,{...relationshipUnionContext(empty),formalUnionKinds:{version:1,kinds:[],manifest:[{kindId:'broken',fingerprint:'fnv1a64-v1:0000000000000000'}]}})).rejects.toThrow('unavailable');
 });
 it('accepts empty migrated/new state without requiring content placement',async()=>{const game=migrateGame(createGame('Empty','Unspecified','ca',5))!;expect(await acceptApplicationGame(game)).toBe(game);await expect(acceptApplicationGame({...game,residence:null} as unknown as Game)).rejects.toThrow('consistency');});
 it('accepts only exact injected packages and preserves the caller state on rejection',async()=>{const game=syntheticResidenceGame(),before=structuredClone(game);expect(await acceptApplicationGame(game,context(game.people!))).toBe(game);await expect(acceptApplicationGame(game,context(game.people!,settlementPackage('settlements.synthetic-residence-2025-v1')))).rejects.toThrow('unavailable');expect(game).toEqual(before);});
 it('applies the same exact Residence qualification to current5 without changing Household',async()=>{const game=upgradeGameToCurrent(syntheticResidenceGame())!,before=structuredClone(game);expect(await acceptApplicationGame(game,context(game.people))).toBe(game);await expect(acceptApplicationGame(game,context(game.people,settlementPackage('settlements.synthetic-residence-2025-v1')))).rejects.toThrow('unavailable');expect(game).toEqual(before);expect(game.household.memberships).toHaveLength(0);});
});
