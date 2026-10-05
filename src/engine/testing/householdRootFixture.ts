import {upgradeGameToCurrent} from '../save';
import {createHousehold} from '../household/state';
import {syntheticResidenceGame} from './residenceFixture';
import type {GameV5} from '../types';

/** Test-only instantiated people/domestic units, independent of UK composition. */
export function syntheticHouseholdGame():GameV5{
 const game=upgradeGameToCurrent(syntheticResidenceGame());
 if(!game)throw Error('Synthetic current-root fixture failed validation.');
 const context={people:game.people};
 let household=createHousehold(game.household,['person:1','person:2'],context).state;
 household=createHousehold(household,['person:1','person:3'],context).state;
 return {...game,household};
}
