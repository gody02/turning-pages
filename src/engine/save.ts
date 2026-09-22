import type { Game } from './types';
import { validLife } from './core/validation';
import { validPolitics } from './politicsSave';
export const PRE_ARCHITECTURE_SAVE_KEY='turning-pages:before-life-architecture';
export const SAVE_KEY='turning-pages:v1';
export const PRE_POLITICS_SAVE_KEY='turning-pages:before-career-integration';
export const PRE_INSTITUTIONS_SAVE_KEY='turning-pages:before-institutions';
export const PRE_NATIONAL_SAVE_KEY='turning-pages:before-national-economy';
export interface StorageLike { getItem(key:string):string|null; setItem(key:string,value:string):void }
export function isGame(x:unknown):x is Game{
 if(!validLife(x))return false;
 const g=x as Game;
 if(g.politics!==undefined){if(!validPolitics(g.politics,g.age,g.country))return false;if(g.clock&&(g.clock.cadence!=='month'||g.clock.monthOfYear!==((g.politics.startMonth??0)+g.politics.months)%12))return false;}
 return true;
}
export function loadGame(storage: StorageLike): {game:Game|null; error:string|null} {
  try { const raw=storage.getItem(SAVE_KEY);if(!raw)return {game:null,error:null};const value:unknown=JSON.parse(raw);if(!isGame(value))throw Error();return {game:value,error:null}; }
  catch{return {game:null,error:'This save could not be loaded. It may be damaged or from another version.'};}
}
export function saveGame(storage: StorageLike, game: Game): string|null {
  try{
    if(!isGame(game))return 'The save failed its consistency check. Your previous save was kept.';
    if(game.politics&&!storage.getItem(PRE_POLITICS_SAVE_KEY)){
      const raw=storage.getItem(SAVE_KEY);
      if(raw){let previous:unknown;try{previous=JSON.parse(raw);}catch{previous=null;}if(isGame(previous)&&!previous.politics)storage.setItem(PRE_POLITICS_SAVE_KEY,raw);}
    }
    if(game.politics?.national&&!storage.getItem(PRE_NATIONAL_SAVE_KEY)){
      const raw=storage.getItem(SAVE_KEY);if(raw){let previous:unknown;try{previous=JSON.parse(raw);}catch{previous=null;}if(isGame(previous)&&previous.politics&&!previous.politics.national)storage.setItem(PRE_NATIONAL_SAVE_KEY,raw);}
    }
    if(game.politics?.national?.institutions&&!storage.getItem(PRE_INSTITUTIONS_SAVE_KEY)){
      const raw=storage.getItem(SAVE_KEY);if(raw){let previous:unknown;try{previous=JSON.parse(raw);}catch{previous=null;}if(isGame(previous)&&previous.politics?.national&&!previous.politics.national.institutions)storage.setItem(PRE_INSTITUTIONS_SAVE_KEY,raw);}
    }
    if(game.clock&&!storage.getItem(PRE_ARCHITECTURE_SAVE_KEY)){const raw=storage.getItem(SAVE_KEY);if(raw){let old:unknown;try{old=JSON.parse(raw);}catch{old=null;}if(isGame(old)&&!old.clock)storage.setItem(PRE_ARCHITECTURE_SAVE_KEY,raw);}}
    storage.setItem(SAVE_KEY,JSON.stringify(game));return null;
  }catch{return 'Saving is unavailable. Export a life backup before closing this tab.';}
}
