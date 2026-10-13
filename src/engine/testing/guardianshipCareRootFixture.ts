import {upgradeGameToCurrent} from '../save';
import {relationshipUnionContext,syntheticRelationshipUnionGame} from './relationshipUnionRootFixture';
import {fixtureKind,fixtureRef} from '../guardianship/fixtures';
import {createGuardianshipKindRegistry} from '../guardianship/kinds';
import {establishGuardianship} from '../guardianship/state';
import {establishCare} from '../care/state';
import {createEmptyHouseholdState} from '../household/state';
import type {GameContentContext} from '../gameContent';
import type {GameV8} from '../types';

export function guardianshipCareContext(game:GameV8):GameContentContext{
 return {...relationshipUnionContext(game),guardianshipKinds:createGuardianshipKindRegistry([fixtureKind],[fixtureRef])};
}

/** Synthetic retained authority only; no production domestic inference or legal eligibility claim. */
export function syntheticGuardianshipCareGame():GameV8{
 const game=upgradeGameToCurrent(syntheticRelationshipUnionGame());
 if(!game)throw Error('Synthetic root-v8 fixture failed validation.');
 const kinds=createGuardianshipKindRegistry([fixtureKind],[fixtureRef]),referenceDate=game.clock!.date;
 const legal=establishGuardianship(game.guardianship,{holderId:'person:1',protectedPersonId:'person:4',authorityKind:{...fixtureRef},basis:{kind:'unspecified'},beganOn:null},{people:game.people,referenceDate,kinds}).state;
 let care=establishCare(game.care,'person:1','person:4','principal',{people:game.people,referenceDate});
 care=establishCare(care,'person:2','person:1','unspecified',{people:game.people,referenceDate});
 care=establishCare(care,'person:2','person:3','principal',{people:game.people,referenceDate});
 return {...game,household:createEmptyHouseholdState(),guardianship:legal,care};
}
