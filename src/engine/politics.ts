// Compatibility facade. The life coordinator owns monthly advancement.
export * from './politics/uk/politics';
export {adultStart} from './core/life';
import type {Game} from './types';
import {advanceMonth} from './simulation';
export function advancePoliticalMonth(g:Game):Game{return g.politics?advanceMonth(g):g;}
