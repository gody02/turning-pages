import {upgradeGameToCurrent} from '../save';
import {syntheticKinshipGame} from './kinshipRootFixture';
import {context} from './residenceFixture';
import {fixtureKinds,fixtureInput} from '../formalUnion/fixtures';
import {createFormalUnion,endFormalUnion,setFormalUnionSeparation} from '../formalUnion/state';
import {establishPartnership} from '../partnership/state';
import type {GameV7} from '../types';

/** Synthetic retained contracts only; no production domestic inference or law. */
export function relationshipUnionContext(game:GameV7){return {...context(game.people),formalUnionKinds:fixtureKinds()};}
export function syntheticRelationshipUnionGame():GameV7{
 const game=upgradeGameToCurrent(syntheticKinshipGame());
 if(!game)throw Error('Synthetic root-v7 fixture failed validation.');
 const ctx={people:game.people,referenceDate:game.clock!.date,kinds:fixtureKinds()};
 let formalUnion=createFormalUnion(game.formalUnion,{...fixtureInput(1,2),formedOn:ctx.referenceDate},ctx).state;
 formalUnion=endFormalUnion(formalUnion,'formal-union:1',{reason:'annulment',endedOn:null},ctx);
 formalUnion=createFormalUnion(formalUnion,{...fixtureInput(1,2),formedOn:ctx.referenceDate},ctx).state;
 formalUnion=setFormalUnionSeparation(formalUnion,'formal-union:2','separated',ctx);
 formalUnion=createFormalUnion(formalUnion,{...fixtureInput(1,3),formedOn:ctx.referenceDate},ctx).state;
 formalUnion=createFormalUnion(formalUnion,{...fixtureInput(1,2,'formal-union-kind.synthetic.second-v1'),formedOn:ctx.referenceDate},ctx).state;
 return {...game,partnership:establishPartnership(game.partnership,'person:1','person:2',{people:game.people,referenceDate:game.clock!.date}),formalUnion};
}
