import {upgradeGameToCurrent} from '../save';
import {addParentageBasis} from '../kinship/state';
import {syntheticHouseholdGame} from './householdRootFixture';
import type {GameV6} from '../types';

/** Synthetic persisted graph; no production composition or family inference. */
export function syntheticKinshipGame():GameV6{
 const game=upgradeGameToCurrent(syntheticHouseholdGame());
 if(!game)throw Error('Synthetic root-v6 fixture failed validation.');
 const context={people:game.people};
 let kinship=addParentageBasis(game.kinship,'person:4','person:5','legal',context);
 kinship=addParentageBasis(kinship,'person:4','person:5','genetic',context);
 kinship=addParentageBasis(kinship,'person:2','person:4','gestational',context);
 return {...game,kinship};
}
