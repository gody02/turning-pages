import type {Game} from '../engine/types';
import {isGame} from '../engine/save';
import {validGameWithContent,type GameContentContext} from '../engine/gameContent';
import {createApplicationReferenceContentService} from './referenceContent/service';
import {UK_REFERENCE_CONTENT_SET} from './referenceContent/identities';
import type {ExactReferenceContentSetV1} from './referenceContent/types';
import {yieldReferenceHost} from './referenceContent/lookupAdapters';

/** Host lifetime only. No Game/seed/residence choices in the exact-content cache. */
let service=createApplicationReferenceContentService();
export const applicationContentDiagnostics=()=>service.diagnostics();
export function disposeApplicationContent(){service.dispose();service=createApplicationReferenceContentService();}
/** Select an explicit registered loader from saved references, never a latest/fallback alias. */
function requiredReferenceSet(game:Game):ExactReferenceContentSetV1{
 if(game.version!==4)throw Error('This life requires no Residence content.');
 for(const record of game.residence.residences){const location=record.location;
  if(location.kind==='country')continue;
  if(location.administrativeArea.partitionId!==UK_REFERENCE_CONTENT_SET.geography[0].partitionId||location.kind==='settlement-area'&&location.settlement.packageId!==UK_REFERENCE_CONTENT_SET.settlements[0].packageId)throw Error('This life references unavailable or incompatible geographic content. Your saved life was kept.');
 }
 // Country-only/no-fixed-abode has no package reference; no geographic fact is inferred.
 // The exact registered UK host context is available without changing those saved markers.
 return UK_REFERENCE_CONTENT_SET;
}
export function applicationGameContent(set:ExactReferenceContentSetV1,options?:Readonly<{signal?:AbortSignal}>):Promise<GameContentContext>{return service.prepare(set,options);}
export async function acceptApplicationGame(game:Game,injected?:GameContentContext,options?:Readonly<{signal?:AbortSignal}>):Promise<Game>{
 if(!isGame(game))throw Error('This life failed its component consistency check. Your saved life was kept.');
 // Empty state has no content references. No package substitution or inferred placement.
 if(game.version===4&&(game.residence.residences.length||game.residence.noFixedAbodePersonIds.length)){
  const context=injected??await applicationGameContent(requiredReferenceSet(game),options);
  await yieldReferenceHost();
  if(options?.signal?.aborted)throw Error('Application reference-content preparation was cancelled.');
  if(!validGameWithContent(game,context))throw Error('This life references unavailable or incompatible geographic content. Your saved life was kept.');
 }
 return game;
}
export function lifecycleContent(game:Game):GameContentContext|undefined{if(game.version!==4||!game.residence.occupants.length&&!game.residence.noFixedAbodePersonIds.length)return undefined;const content=service.peek(requiredReferenceSet(game));if(!content)throw Error('Residence content has not been validated before gameplay.');return content;}
export function applicationResolversReady(game:Game):boolean{try{return !lifecycleContent(game)||!!service.peek(requiredReferenceSet(game));}catch{return false;}}
