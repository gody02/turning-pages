// Compatibility facade. The life coordinator owns monthly advancement.
export {roleRank,joinPoliticsReason,electionIn,politicalTaskReason,UKPoliticalSystem,politicalIncome} from './politics/uk/politics';
import {joinPolitics as join,leavePolitics as leave,choosePoliticalEvent as choosePolitical,politicalTask as runPoliticalTask} from './politics/uk/politics';
export {adultStart} from './simulation';
import type {Game} from './types';
import {advanceMonth} from './simulation';
import type {PartyId,DoctrineId} from '../data/politics';
import {synchronizeGamePlayerDeath,type GameContentContext} from './gameContent';
export function joinPolitics(g:Game,party:PartyId,doctrine:DoctrineId):Game{return join(g,party,doctrine);}
export function leavePolitics(g:Game):Game{return leave(g);}
export function choosePoliticalEvent(g:Game,index:number,content?:GameContentContext):Game{return synchronizeGamePlayerDeath(g,choosePolitical(g,index),content);}
export function politicalTask(g:Game,id:string,content?:GameContentContext):Game{return synchronizeGamePlayerDeath(g,runPoliticalTask(g,id),content);}
export function advancePoliticalMonth(g:Game,content?:GameContentContext):Game{return g.politics?advanceMonth(g,content):g;}
