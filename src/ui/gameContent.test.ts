import {describe,expect,it} from 'vitest';
import {acceptApplicationGame} from './gameContent';
import {context,syntheticResidenceGame,settlementPackage} from '../engine/testing/residenceFixture';
import {migrateGame} from '../engine/save';
import {createGame} from '../engine/simulation';
import type {Game} from '../engine/types';

describe('application Residence acceptance',()=>{
 it('accepts empty migrated/new state without requiring content placement',async()=>{const game=migrateGame(createGame('Empty','Unspecified','ca',5))!;expect(await acceptApplicationGame(game)).toBe(game);await expect(acceptApplicationGame({...game,residence:null} as unknown as Game)).rejects.toThrow('consistency');});
 it('accepts only exact injected packages and preserves the caller state on rejection',async()=>{const game=syntheticResidenceGame(),before=structuredClone(game);expect(await acceptApplicationGame(game,context(game.people!))).toBe(game);await expect(acceptApplicationGame(game,context(game.people!,settlementPackage('settlements.synthetic-residence-2025-v1')))).rejects.toThrow('unavailable');expect(game).toEqual(before);});
});
