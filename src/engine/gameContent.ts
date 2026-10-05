import type {Game} from './types';
import {isGame} from './save';
import {validResidenceContent,type ResidenceValidationContext} from './residence/validation';
import {removePersonFromResidences} from './residence/state';
import {synchronizeNewPlayerDeath} from './human/playerPerson';

/** Runtime resolvers are injected by the application; they never enter Game JSON. */
export type GameContentContext=Pick<ResidenceValidationContext,'geography'|'settlements'>;
export function validGameWithContent(game:unknown,content:GameContentContext):game is Game{
 try{return isGame(game)&&((game.version!==4&&game.version!==5&&game.version!==6)||validResidenceContent(game.residence,content.geography,content.settlements));}catch{return false;}
}
/** Candidate lifecycle composition, using the frozen Residence removal primitive. */
export function synchronizeGamePlayerDeath(previous:Game,candidate:Game,content?:GameContentContext):Game{
 const next=synchronizeNewPlayerDeath(previous,candidate);
 if((next.version!==4&&next.version!==5&&next.version!==6)||!previous.alive||next.alive||!next.people)return next;
 const id=next.people.playerId;
 if(!next.residence.occupants.some(item=>item.personId===id)&&!next.residence.noFixedAbodePersonIds.includes(id))return next;
 if(!content)throw Error('Residence lifecycle cleanup requires the saved content resolvers.');
 const residence=removePersonFromResidences(next.residence,id,{...content,people:next.people});
 const result={...next,residence};
 if(!validGameWithContent(result,content))throw Error('Game lifecycle transition failed validation.');
 return result;
}
