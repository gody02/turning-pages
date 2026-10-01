import type {Game} from '../engine/types';
import {isGame} from '../engine/save';
import {validGameWithContent,type GameContentContext} from '../engine/gameContent';

/** Static immutable registries with private derivative indexes, constructed only on demand. */
let content:GameContentContext|undefined;
let pending:Promise<GameContentContext>|undefined;
export function applicationGameContent():Promise<GameContentContext>{
 if(content)return Promise.resolve(content);
 if(!pending)pending=(async()=>{const [{createGeographyRuntime},{createSettlementRuntime},{createUkGeographyRegistry},{createUkSettlementContentRegistry}]=await Promise.all([import('../engine/geography/runtime'),import('../engine/geography/settlements/runtime'),import('../data/geography/uk/primary-local-admin-2024/adapter'),import('../data/geography/uk/settlementRegistry')]);const geography=createGeographyRuntime(createUkGeographyRegistry());content=Object.freeze({geography,settlements:createSettlementRuntime(createUkSettlementContentRegistry(),geography)});return content;})();
 return pending;
}
export async function acceptApplicationGame(game:Game,injected?:GameContentContext):Promise<Game>{
 if(!isGame(game))throw Error('This life failed its component consistency check. Your saved life was kept.');
 // Empty state has no content references. No package substitution or inferred placement.
 if(game.version===4&&(game.residence.residences.length||game.residence.noFixedAbodePersonIds.length)&&!validGameWithContent(game,injected??await applicationGameContent()))throw Error('This life references unavailable or incompatible geographic content. Your saved life was kept.');
 return game;
}
export function lifecycleContent(game:Game):GameContentContext|undefined{if(game.version!==4||!game.residence.occupants.length&&!game.residence.noFixedAbodePersonIds.length)return undefined;if(!content)throw Error('Residence content has not been validated before gameplay.');return content;}
