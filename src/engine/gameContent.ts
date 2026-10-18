import type {Game} from './types';
import {captureValidatedGame} from './save';
import {validResidenceContent,type ResidenceValidationContext} from './residence/validation';
import {removePersonFromResidences} from './residence/state';
import {synchronizeNewPlayerDeath} from './human/playerPerson';
import {removePersonFromPartnerships} from './partnership/state';
import {validFormalUnionWithContext} from './formalUnion/validation';
import {createFormalUnionKindRegistry} from './formalUnion/kinds';
import type {FormalUnionKindRegistryV1} from './formalUnion/types';
import {validGuardianshipWithContext} from './guardianship/validation';
import {createGuardianshipKindRegistry} from './guardianship/kinds';
import type {GuardianshipKindRegistryV1} from './guardianship/types';
import {removePersonFromCare} from './care/state';
import {snapshotRoot} from './rootSnapshot';

/** Runtime content is injected by composition; it never enters Game JSON. */
export type GameContentContext=Pick<ResidenceValidationContext,'geography'|'settlements'> & {readonly formalUnionKinds?:FormalUnionKindRegistryV1;readonly guardianshipKinds?:GuardianshipKindRegistryV1};
/** Runtime resolvers are not JSON. Capture their context slots as data, leaving
 * immutable registry validation to each frozen owning domain. */
function contentSlots(content:GameContentContext|undefined):GameContentContext|undefined{
 if(content===undefined)return undefined;
 if(!content||typeof content!=='object'||Array.isArray(content))throw Error('Invalid Game content.');
 const copy={} as GameContentContext;
 for(const key of ['geography','settlements','formalUnionKinds','guardianshipKinds'] as const){
  const descriptor=Object.getOwnPropertyDescriptor(content,key);
  if(descriptor){if(!('value' in descriptor))throw Error('Invalid Game content.');Object.defineProperty(copy,key,{value:descriptor.value,enumerable:true});}
 }
 return copy;
}
export function validGameWithContent(game:unknown,content?:GameContentContext):game is Game{
 try{
  const owned=captureValidatedGame(game);if(!owned)return false;
  content=contentSlots(content);
  if((owned.version===7||owned.version===8)&&content!==undefined&&(content===null||typeof content!=='object'||Array.isArray(content)))return false;
  if((owned.version===7||owned.version===8)&&!validFormalUnionWithContext(owned.formalUnion,{people:owned.people,referenceDate:owned.clock!.date,kinds:content?.formalUnionKinds===undefined?createFormalUnionKindRegistry([],[]):content.formalUnionKinds}))return false;
  if(owned.version===8&&!validGuardianshipWithContext(owned.guardianship,{people:owned.people,referenceDate:owned.clock!.date,kinds:content?.guardianshipKinds===undefined?createGuardianshipKindRegistry([],[]):content.guardianshipKinds}))return false;
  if(owned.version!==4&&owned.version!==5&&owned.version!==6&&owned.version!==7&&owned.version!==8)return true;
  if(!content)return (owned.version===7||owned.version===8)&&!owned.residence.residences.length&&!owned.residence.noFixedAbodePersonIds.length;
  return validResidenceContent(owned.residence,content.geography,content.settlements);
 }catch{return false;}
}
/** Narrow current-player lifecycle composition using frozen domain primitives. */
export function synchronizeGamePlayerDeath(previous:Game,candidate:Game,content?:GameContentContext):Game{
 // The internal no-death path intentionally preserves identity and does no root
 // traversal. Inspect only captured data descriptors to identify a transition.
 const before=Object.getOwnPropertyDescriptor(previous,'alive'),after=Object.getOwnPropertyDescriptor(candidate,'alive');
 if(!before||!after||!('value' in before)||!('value' in after)||typeof before.value!=='boolean'||typeof after.value!=='boolean')throw Error('Invalid lifecycle input.');
 if(!before.value||after.value)return candidate;
 previous=snapshotRoot(previous);candidate=snapshotRoot(candidate);
 content=contentSlots(content);
 let next=synchronizeNewPlayerDeath(previous,candidate);
 if((next.version!==4&&next.version!==5&&next.version!==6&&next.version!==7&&next.version!==8)||!previous.alive||next.alive||!next.people)return next;
 const id=next.people.playerId;
 if(next.version===7||next.version===8)next={...next,partnership:removePersonFromPartnerships(next.partnership,id,{people:next.people,referenceDate:next.clock!.date})};
 if(next.version===8)next={...next,care:removePersonFromCare(next.care,id,{people:next.people,referenceDate:next.clock!.date})};
 if(!next.residence.occupants.some(item=>item.personId===id)&&!next.residence.noFixedAbodePersonIds.includes(id)){
  if((next.version===7||next.version===8)&&!validGameWithContent(next,content))throw Error('Game lifecycle transition failed validation.');
  return next;
 }
 if(!content)throw Error('Residence lifecycle cleanup requires the saved content resolvers.');
 const residence=removePersonFromResidences(next.residence,id,{geography:content.geography,settlements:content.settlements,people:next.people!});
 const result={...next,residence};
 if(!validGameWithContent(result,content))throw Error('Game lifecycle transition failed validation.');
 return result;
}
