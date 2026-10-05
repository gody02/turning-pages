import {serializeGameV5} from '../save';
import {createHousehold} from '../household/state';
import {syntheticResidenceGame} from './residenceFixture';
import type {GameV5} from '../types';

/** Test-only instantiated people/domestic units, independent of UK composition. */
export function syntheticHouseholdGame():GameV5{
 const result=serializeGameV5(syntheticResidenceGame());
 if(!result.ok)throw Error('Synthetic historical root-v5 fixture failed validation.');
 const game=result.game;
 const context={people:game.people};
 let household=createHousehold(game.household,['person:1','person:2'],context).state;
 household=createHousehold(household,['person:1','person:3'],context).state;
 return {...game,household};
}
