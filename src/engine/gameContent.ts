import type {Game} from './types';
import {isGame} from './save';
import {validResidenceContent,type ResidenceValidationContext} from './residence/validation';
import {removePersonFromResidences} from './residence/state';
import {synchronizeNewPlayerDeath} from './human/playerPerson';
import {removePersonFromPartnerships} from './partnership/state';
import {validFormalUnionWithContext} from './formalUnion/validation';
import {createFormalUnionKindRegistry} from './formalUnion/kinds';
import type {FormalUnionKindRegistryV1} from './formalUnion/types';

/** Runtime content is injected by composition; it never enters Game JSON. */
export type GameContentContext=Pick<ResidenceValidationContext,'geography'|'settlements'> & {readonly formalUnionKinds?:FormalUnionKindRegistryV1};
export function validGameWithContent(game:unknown,content?:GameContentContext):game is Game{
 try{
  if(!isGame(game))return false;
  if(game.version===7&&content!==undefined&&(content===null||typeof content!=='object'||Array.isArray(content)))return false;
  if(game.version===7&&!validFormalUnionWithContext(game.formalUnion,{people:game.people,referenceDate:game.clock!.date,kinds:content?.formalUnionKinds===undefined?createFormalUnionKindRegistry([],[]):content.formalUnionKinds}))return false;
  if(game.version!==4&&game.version!==5&&game.version!==6&&game.version!==7)return true;
  if(!content)return game.version===7&&!game.residence.residences.length&&!game.residence.noFixedAbodePersonIds.length;
  return validResidenceContent(game.residence,content.geography,content.settlements);
 }catch{return false;}
}
/** Narrow current-player lifecycle composition using frozen domain primitives. */
export function synchronizeGamePlayerDeath(previous:Game,candidate:Game,content?:GameContentContext):Game{
 let next=synchronizeNewPlayerDeath(previous,candidate);
 if((next.version!==4&&next.version!==5&&next.version!==6&&next.version!==7)||!previous.alive||next.alive||!next.people)return next;
 const id=next.people.playerId;
 if(next.version===7)next={...next,partnership:removePersonFromPartnerships(next.partnership,id,{people:next.people,referenceDate:next.clock!.date})};
 if(!next.residence.occupants.some(item=>item.personId===id)&&!next.residence.noFixedAbodePersonIds.includes(id)){
  if(next.version===7&&!validGameWithContent(next,content))throw Error('Game lifecycle transition failed validation.');
  return next;
 }
 if(!content)throw Error('Residence lifecycle cleanup requires the saved content resolvers.');
 const residence=removePersonFromResidences(next.residence,id,{geography:content.geography,settlements:content.settlements,people:next.people!});
 const result={...next,residence};
 if(!validGameWithContent(result,content))throw Error('Game lifecycle transition failed validation.');
 return result;
}
