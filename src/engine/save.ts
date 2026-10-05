import type {CurrentAuthoritativeGame,Game} from './types';
import { validLife } from './core/validation';
import { validPolitics } from './politicsSave';
import {createUKWorld,validUKWorld} from './ukWorld';
import {createNational} from './politics/uk/national';
import {ensureInstitutions} from './politics/uk/institutions';
import {validNational} from './politics/uk/nationalSave';
import {addMonths,ageOn,hasCanonicalClock,isMonthPrecisionDate,lifeMonth,monthOfYear,monthsBetween,SIMULATION_START_DATE,type MonthPrecisionDate} from './core/clock';
import type {JsonValue} from './core/model';
import {COMPATIBILITY_LIFE_STREAM,COMPATIBILITY_MEREFORD_STREAM,COMPATIBILITY_NATIONAL_STREAM,compatibilitySeed,createRandomness,synchronizeCompatibilitySeed} from './core/rng';
import {createScheduler} from './core/scheduler';
import {createHistory} from './core/history';
import {equalJson,isJsonValue} from './core/json';
import {validPeople} from './human/person';
import {createLegacyPlayerPeople,validPlayerPersonProjection} from './human/playerPerson';
import {createLegacyPopulation,validPopulationWithPeople} from './human/population';
import {createEmptyResidenceState} from './residence/state';
import {validResidenceWithPeople} from './residence/validation';
import type {ResidenceStateV1} from './residence/types';
import {createEmptyHouseholdState} from './household/state';
import {validHouseholdWithPeople} from './household/validation';
import type {HouseholdStateV1} from './household/types';
export const PRE_HOUSEHOLD_SAVE_KEY='turning-pages:before-household';
export const PRE_RESIDENCE_SAVE_KEY='turning-pages:before-residence';
export const PRE_ARCHITECTURE_SAVE_KEY='turning-pages:before-life-architecture';
export const PRE_SIMULATION_CLOCK_SAVE_KEY='turning-pages:before-simulation-clock';
export const PRE_DAY_PRECISION_SAVE_KEY='turning-pages:before-day-precision';
export const PRE_DETERMINISTIC_RNG_SAVE_KEY='turning-pages:before-deterministic-rng';
export const PRE_SCHEDULER_SAVE_KEY='turning-pages:before-scheduler';
export const PRE_HISTORY_SAVE_KEY='turning-pages:before-history';
export const PRE_PERSON_SAVE_KEY='turning-pages:before-person';
export const PRE_POPULATION_SAVE_KEY='turning-pages:before-population';
export const SAVE_KEY='turning-pages:v1';
export const PRE_POLITICS_SAVE_KEY='turning-pages:before-career-integration';
export const PRE_INSTITUTIONS_SAVE_KEY='turning-pages:before-institutions';
export const PRE_NATIONAL_SAVE_KEY='turning-pages:before-national-economy';
export const PRE_UK_WORLD_SAVE_KEY='turning-pages:before-uk-world-ownership';
export interface StorageLike { getItem(key:string):string|null; setItem(key:string,value:string):void }
export type PersistenceFailureReason='invalid-json'|'unsupported-version'|'invalid-state'|'migration-failed'|'storage-unavailable';
export type LoadGameResult={game:Game|null;error:string|null;reason:PersistenceFailureReason|null};
export type RecoveryDescriptor={readonly key:string;readonly label:string};
export type CanonicalSerializationResult={ok:true;game:Game;raw:string}|{ok:false;reason:Exclude<PersistenceFailureReason,'invalid-json'|'storage-unavailable'>;error:string};
export type CurrentGameLoadResult=Omit<LoadGameResult,'game'> & {game:CurrentAuthoritativeGame|null};
export type CurrentGameSerializationResult={ok:true;game:CurrentAuthoritativeGame;raw:string}|Extract<CanonicalSerializationResult,{ok:false}>;
export const RECOVERY_SNAPSHOTS=[
 {key:PRE_HOUSEHOLD_SAVE_KEY,label:'Recover before Household migration'},
 {key:PRE_RESIDENCE_SAVE_KEY,label:'Recover before Residence migration'},
 {key:PRE_POPULATION_SAVE_KEY,label:'Recover before Population migration'},
 {key:PRE_PERSON_SAVE_KEY,label:'Recover before Person migration'},
 {key:PRE_SCHEDULER_SAVE_KEY,label:'Recover before Scheduler migration'},
 {key:PRE_HISTORY_SAVE_KEY,label:'Recover before History migration'},
 {key:PRE_DETERMINISTIC_RNG_SAVE_KEY,label:'Recover before deterministic RNG migration'},
 {key:PRE_DAY_PRECISION_SAVE_KEY,label:'Recover before day precision'},
 {key:PRE_SIMULATION_CLOCK_SAVE_KEY,label:'Recover before Clock migration'},
 {key:PRE_UK_WORLD_SAVE_KEY,label:'Recover before UK World migration'},
 {key:PRE_POLITICS_SAVE_KEY,label:'Recover before political-career integration'},
 {key:PRE_NATIONAL_SAVE_KEY,label:'Recover before national economy'},
 {key:PRE_INSTITUTIONS_SAVE_KEY,label:'Recover before institutions'},
 {key:PRE_ARCHITECTURE_SAVE_KEY,label:'Recover before architecture refactor'},
] as const satisfies readonly RecoveryDescriptor[];
type SavedClock={version?:number;date?:MonthPrecisionDate;monthOfYear?:number;totalMonths?:number;cadence?:'year'|'month'};
const ROOT_V1_FIELDS=new Set(['version','name','gender','country','age','stats','money','alive','cause','seed','actions','pending','seen','relationships','randomness','scheduler','history','education','studyYears','job','jobYears','level','retired','earned','lastIncome','lastExpenses','journal','dateOfBirth','clock','finances','development','facts','ukWorld','politics']);
const ROOT_V2_FIELDS=new Set([...ROOT_V1_FIELDS,'people']);
const ROOT_V3_FIELDS=new Set([...ROOT_V2_FIELDS,'population']);
const ROOT_V4_FIELDS=new Set([...ROOT_V3_FIELDS,'residence']);
const ROOT_V5_FIELDS=new Set([...ROOT_V4_FIELDS,'household']);
const exactRootFields=(value:Record<string,unknown>)=>Object.keys(value).every(key=>(value.version===1?ROOT_V1_FIELDS:value.version===2?ROOT_V2_FIELDS:value.version===3?ROOT_V3_FIELDS:value.version===4?ROOT_V4_FIELDS:ROOT_V5_FIELDS).has(key));
function monthPrecisionClock(g:MigratingGame){const legacy=g as unknown as {clock?:SavedClock;dateOfBirth?:unknown},clock=legacy.clock;if(clock?.version!==1||!isMonthPrecisionDate(clock.date)||!isMonthPrecisionDate(legacy.dateOfBirth)||!clock.cadence)return null;return {date:clock.date,dateOfBirth:legacy.dateOfBirth,cadence:clock.cadence};}
function savedClock(g:MigratingGame){
 if(hasCanonicalClock(g))return {month:monthOfYear(g),total:lifeMonth(g),cadence:g.clock!.cadence};
 const monthPrecision=monthPrecisionClock(g);if(monthPrecision){const total=monthsBetween({...monthPrecision.dateOfBirth,day:1},{...monthPrecision.date,day:1});return {month:total%12,total,cadence:monthPrecision.cadence};}
 const clock=g.clock as unknown as SavedClock|undefined,politicalMonth=g.politics?((g.politics.startMonth??0)+g.politics.months)%12:0;
 const month=clock?.monthOfYear??politicalMonth,total=clock?.totalMonths??g.age*12+month;
 return {month,total,cadence:clock?.cadence??(g.politics?'month':'year')};
}
export function isGame(x:unknown):x is Game{
 if(!isJsonValue(x)||typeof x!=='object'||x===null||Array.isArray(x)||!exactRootFields(x as Record<string,unknown>)||!validLife(x))return false;
 const g=x as Game;
 if(g.version===1){if(g.people!==undefined)return false;}
 else if(g.version===2){if(!validPeople(g.people)||g.population!==undefined||!validPlayerPersonProjection(g))return false;}
 else if(g.version===3){if(!validPeople(g.people)||!validPopulationWithPeople(g.population,g.people)||!validPlayerPersonProjection(g))return false;}
 else if(g.version===4||g.version===5){if(!validPeople(g.people)||!validPopulationWithPeople(g.population,g.people)||!validPlayerPersonProjection(g)||!validResidenceWithPeople(g.residence,g.people))return false;if(g.version===5&&!validHouseholdWithPeople(g.household,g.people))return false;}
 else return false;
 if(g.ukWorld!==undefined&&(g.country!=='uk'||!validUKWorld(g.ukWorld,validNational)))return false;
 if(g.ukWorld!==undefined&&g.politics?.national!==undefined)return false;
 if(g.politics!==undefined){
  if(!validPolitics(g.politics,g.age,g.country))return false;
  const clock=savedClock(g);
  if(g.clock&&(clock.cadence!=='month'||(g.politics.active&&clock.month!==((g.politics.startMonth??0)+g.politics.months)%12)))return false;
 }
 return true;
}
type MigratingGame=LifeStateForMigration & {residence?:ResidenceStateV1;household?:HouseholdStateV1};
type LifeStateForMigration=Omit<Game,'version'|'residence'|'household'> & {version:1|2|3|4|5};
function migrateClock(g:MigratingGame){
 if(hasCanonicalClock(g)){g.dateOfBirth={...g.dateOfBirth!};g.clock={version:2,date:{...g.clock!.date},cadence:g.clock!.cadence};g.age=ageOn(g.dateOfBirth,g.clock.date);return;}
 const monthPrecision=monthPrecisionClock(g);if(monthPrecision){g.dateOfBirth={...monthPrecision.dateOfBirth,day:1};g.clock={version:2,date:{...monthPrecision.date,day:1},cadence:monthPrecision.cadence};g.age=ageOn(g.dateOfBirth,g.clock.date);return;}
 const saved=savedClock(g),worldMonth=g.ukWorld?.national.month;
 const date=addMonths(SIMULATION_START_DATE,worldMonth??saved.month);
 g.dateOfBirth=addMonths(date,-saved.total);
 g.clock={version:2,date,cadence:saved.cadence};
 g.age=ageOn(g.dateOfBirth,date);
}
/** One-time RNG migration: legacy fields remain projections of these compatibility streams. */
function migrateRandomness(g:MigratingGame,preserveNationalProjection=false){
 if(!g.randomness)g.randomness=createRandomness(g.seed);
 g.seed=compatibilitySeed(g.randomness,COMPATIBILITY_LIFE_STREAM,g.seed);
 if(g.ukWorld)g.ukWorld.national.seed=preserveNationalProjection?synchronizeCompatibilitySeed(g.randomness,COMPATIBILITY_NATIONAL_STREAM,g.ukWorld.national.seed):compatibilitySeed(g.randomness,COMPATIBILITY_NATIONAL_STREAM,g.ukWorld.national.seed);
 if(g.politics)g.politics.economy.seed=compatibilitySeed(g.randomness,COMPATIBILITY_MEREFORD_STREAM,g.politics.economy.seed);
}
function migrateScheduler(g:MigratingGame){if(!g.scheduler)g.scheduler=createScheduler();}
function migrateHistory(g:MigratingGame){if(!g.history)g.history=createHistory();}
function migratePeople(g:MigratingGame){if(g.version>=2)return;g.people=createLegacyPlayerPeople(g);g.version=2;}
function migratePopulation(g:MigratingGame){if(g.version>=3)return;if(g.version!==2||!validPeople(g.people))throw Error('People migration must precede Population migration.');g.population=createLegacyPopulation(g.people,g.country);g.version=3;}
function migrateResidence(g:MigratingGame){if(g.version===4)return;if(g.version!==3)throw Error('Population migration must precede Residence migration.');g.residence=createEmptyResidenceState();g.version=4;}
function migrateHousehold(g:MigratingGame){if(g.version===5)return;if(g.version!==4)throw Error('Residence migration must precede Household migration.');g.household=createEmptyHouseholdState();g.version=5;}
type MigrationContext={movedLegacyNational:boolean};
type MigrationStage={readonly id:'uk-world'|'clock'|'rng'|'scheduler'|'history'|'people'|'population'|'residence'|'household';run:(game:MigratingGame,context:MigrationContext)=>void};
type NormalizationResult={ok:true;game:Game}|{ok:false;reason:'unsupported-version'|'invalid-state'|'migration-failed'};
function migrateUKWorld(g:MigratingGame,context:MigrationContext){
 if(g.country!=='uk'||g.ukWorld)return;
 const previous=g.politics?.national,month=previous?.month??savedClock(g).total;
 if(previous){g.ukWorld=createUKWorld(previous);context.movedLegacyNational=true;}else{const national=createNational(g.seed,month);ensureInstitutions(national);g.ukWorld=createUKWorld(national);}
 if(g.politics?.national!==undefined)delete g.politics.national;
}
/** Migration order is a persistence invariant: UK ownership precedes RNG projection; Clock precedes History validation and Person construction. */
const MIGRATION_PIPELINE:readonly MigrationStage[]=[
 {id:'uk-world',run:migrateUKWorld},
 {id:'clock',run:g=>migrateClock(g)},
 {id:'rng',run:(g,context)=>migrateRandomness(g,context.movedLegacyNational)},
 {id:'scheduler',run:g=>migrateScheduler(g)},
 {id:'history',run:g=>migrateHistory(g)},
 {id:'people',run:g=>migratePeople(g)},
 {id:'population',run:g=>migratePopulation(g)},
 {id:'residence',run:g=>migrateResidence(g)},
 {id:'household',run:g=>migrateHousehold(g)},
];
function normalizeGame(value:unknown,targetVersion:3|4|5=4):NormalizationResult{
 try{
  if(!isJsonValue(value))return {ok:false,reason:'invalid-state'};
  if(typeof value==='object'&&value!==null&&!Array.isArray(value)){
   const root=value as Record<string,unknown>,version=root.version,record=(candidate:unknown)=>candidate&&typeof candidate==='object'&&!Array.isArray(candidate)?candidate as Record<string,unknown>:undefined,future=(candidate:unknown,current:number)=>{const component=record(candidate),componentVersion=component?.version;return typeof componentVersion==='number'&&Number.isSafeInteger(componentVersion)&&componentVersion>current;};
   const ukWorld=record(root.ukWorld),politics=record(root.politics),national=record(ukWorld?.national)??record(politics?.national);
   if(typeof version==='number'&&Number.isSafeInteger(version)&&version>targetVersion||(version===1||version===2||version===3||version===4||version===5)&&!exactRootFields(root)||future(root.clock,2)||future(root.randomness,1)||future(root.scheduler,1)||future(root.history,1)||future(root.people,1)||future(root.population,1)||future(root.residence,1)||future(root.household,1)||future(ukWorld,1)||future(national,1)||future(national?.institutions,1)||future(politics,1)||future(politics?.economy,1))return {ok:false,reason:'unsupported-version'};
  }
  if(!isGame(value))return {ok:false,reason:'invalid-state'};
  const owned=structuredClone(value);
  if(owned.version===5||owned.version===4&&targetVersion===4)return {ok:true,game:owned};
  const game:MigratingGame=owned,context:MigrationContext={movedLegacyNational:false};
  if(game.version===4)migrateHousehold(game);
  else for(const stage of MIGRATION_PIPELINE)if((stage.id!=='residence'||targetVersion>=4)&&(stage.id!=='household'||targetVersion===5))stage.run(game,context);
  return isGame(game)?{ok:true,game}:{ok:false,reason:'invalid-state'};
 }catch{return {ok:false,reason:'migration-failed'};}
}
export function migrateGame(value:unknown):Game|null{const result=normalizeGame(value);return result.ok?result.game:null;}
/** Current-root object migration, shared with decoding; no serialization or external side effects. */
export function upgradeGameToCurrent(value:unknown):CurrentAuthoritativeGame|null{const result=normalizeGame(value,5);return result.ok&&result.game.version===5?result.game:null;}
/** Validates canonical bytes in their stored schema before current-root migration. */
function canonicalRoot(game:Game):Game{
 if(game.version===5){const {residence,household,...rest}=game;return {...rest,residence,household:{version:household.version,nextSequence:household.nextSequence,households:household.households.map(item=>({id:item.id,sequence:item.sequence})),memberships:household.memberships.map(item=>({personId:item.personId,householdId:item.householdId}))}};}
 if(game.version!==4)return game;const {residence,...rest}=game;return {...rest,residence};
}
export function isCanonicalGamePayload(raw:string):boolean{try{const value:unknown=JSON.parse(raw),version=typeof value==='object'&&value!==null&&!Array.isArray(value)?(value as Record<string,unknown>).version:undefined,normalized=normalizeGame(value,version===3?3:version===5?5:4);return normalized.ok&&JSON.stringify(canonicalRoot(normalized.game))===raw;}catch{return false;}}
function serializeForTarget(value:unknown,targetVersion:4|5):CanonicalSerializationResult{
 const normalized=normalizeGame(value,targetVersion);if(!normalized.ok)return {ok:false,reason:normalized.reason,error:'The save failed its consistency check.'};
 try{const game=canonicalRoot(normalized.game),raw=JSON.stringify(game),parsed:unknown=JSON.parse(raw),roundTrip=normalizeGame(parsed,targetVersion);if(!roundTrip.ok||!isJsonValue(roundTrip.game)||!equalJson(game as unknown as JsonValue,roundTrip.game as unknown as JsonValue))return {ok:false,reason:roundTrip.ok?'invalid-state':roundTrip.reason,error:'The save failed its canonical round-trip check.'};return {ok:true,game,raw};}
 catch{return {ok:false,reason:'migration-failed',error:'The save failed its canonical round-trip check.'};}
}
/** Frozen root-v4 compatibility serializer, including direct Country Start construction. */
export function serializeGame(value:unknown):CanonicalSerializationResult{return serializeForTarget(value,4);}
export function serializeCurrentGame(value:unknown):CurrentGameSerializationResult{const result=serializeForTarget(value,5);if(!result.ok)return result;return result.game.version===5?{...result,game:result.game}:{ok:false,reason:'migration-failed',error:'The save failed its current-root check.'};}
const loadMessage=(reason:PersistenceFailureReason)=>reason==='unsupported-version'?'This save was created by a newer unsupported version of Turning Pages.':reason==='storage-unavailable'?'Browser storage is unavailable. You can still play and export backups.':'This save could not be loaded. It may be damaged or invalid.';
function parseForTarget(raw:string,targetVersion:4|5):LoadGameResult{let value:unknown;try{value=JSON.parse(raw);}catch{return {game:null,error:loadMessage('invalid-json'),reason:'invalid-json'};}const result=normalizeGame(value,targetVersion);return result.ok?{game:result.game,error:null,reason:null}:{game:null,error:loadMessage(result.reason),reason:result.reason};}
/** Frozen root-v4 compatibility decoder. Current application persistence uses parseCurrentGame. */
export function parseGame(raw:string):LoadGameResult{return parseForTarget(raw,4);}
export function parseCurrentGame(raw:string):CurrentGameLoadResult{const result=parseForTarget(raw,5);if(!result.game)return {...result,game:null};return result.game.version===5?{...result,game:result.game}:{game:null,error:loadMessage('migration-failed'),reason:'migration-failed'};}
export function loadGame(storage:StorageLike):LoadGameResult{let raw:string|null;try{raw=storage.getItem(SAVE_KEY);}catch{return {game:null,error:loadMessage('storage-unavailable'),reason:'storage-unavailable'};}return raw?parseGame(raw):{game:null,error:null,reason:null};}

export type RecoveryKey=(typeof RECOVERY_SNAPSHOTS)[number]['key'];
type RecoveryRule=(previous:Game,normalized:Game)=>boolean;
const RECOVERY_RULES:Record<RecoveryKey,RecoveryRule>={
 [PRE_HOUSEHOLD_SAVE_KEY]:(previous,normalized)=>previous.version<5&&normalized.version>=5,
 [PRE_RESIDENCE_SAVE_KEY]:(previous,normalized)=>previous.version<4&&normalized.version>=4,
 [PRE_POPULATION_SAVE_KEY]:(previous,normalized)=>previous.version<3&&normalized.version>=3,
 [PRE_PERSON_SAVE_KEY]:(previous,normalized)=>previous.version===1&&normalized.version>=2,
 [PRE_SCHEDULER_SAVE_KEY]:previous=>!previous.scheduler,[PRE_HISTORY_SAVE_KEY]:previous=>!previous.history,[PRE_DETERMINISTIC_RNG_SAVE_KEY]:previous=>!previous.randomness,
 [PRE_DAY_PRECISION_SAVE_KEY]:previous=>!hasCanonicalClock(previous),[PRE_SIMULATION_CLOCK_SAVE_KEY]:previous=>!hasCanonicalClock(previous),
 [PRE_UK_WORLD_SAVE_KEY]:(previous,normalized)=>normalized.country==='uk'&&!previous.ukWorld,[PRE_POLITICS_SAVE_KEY]:(previous,normalized)=>!!normalized.politics&&!previous.politics,
 [PRE_NATIONAL_SAVE_KEY]:(previous,normalized)=>!!normalized.ukWorld&&!!previous.politics&&!previous.ukWorld&&!previous.politics.national,
 [PRE_INSTITUTIONS_SAVE_KEY]:(previous,normalized)=>!!normalized.ukWorld?.national.institutions&&((!!previous.ukWorld&&!previous.ukWorld.national.institutions)||!!previous.politics?.national&&!previous.politics.national.institutions),
 [PRE_ARCHITECTURE_SAVE_KEY]:(previous,normalized)=>!!normalized.clock&&!previous.clock,
};
export function requiredRecoverySnapshotKeys(previous:Game,normalized:Game):readonly RecoveryKey[]{return RECOVERY_SNAPSHOTS.filter(snapshot=>RECOVERY_RULES[snapshot.key](previous,normalized)).map(snapshot=>snapshot.key);}
export function listRecoverySnapshots(storage:Pick<StorageLike,'getItem'>):readonly RecoveryDescriptor[]{return RECOVERY_SNAPSHOTS.filter(snapshot=>storage.getItem(snapshot.key)!==null);}
export function loadRecoverySnapshot(storage:Pick<StorageLike,'getItem'>,key:string):LoadGameResult{
 if(!RECOVERY_SNAPSHOTS.some(snapshot=>snapshot.key===key))return {game:null,error:'This recovery snapshot is not recognised.',reason:'invalid-state'};
 let raw:string|null;try{raw=storage.getItem(key);}catch{return {game:null,error:loadMessage('storage-unavailable'),reason:'storage-unavailable'};}return raw?parseGame(raw):{game:null,error:'No recovery snapshot of this kind exists on this device.',reason:'invalid-state'};
}
/** Explicit confirmed restore. Canonicalizes first and never removes recovery snapshots. */
export function restoreGame(storage:Pick<StorageLike,'setItem'>,game:Game):string|null{
 const serialized=serializeGame(game);if(!serialized.ok)return serialized.error;
 try{storage.setItem(SAVE_KEY,serialized.raw);return null;}catch{return 'The restored life could not be written. Your existing save and recovery snapshots were kept.';}
}
export function saveGame(storage:StorageLike,game:Game):string|null{
 const serialized=serializeGame(game);if(!serialized.ok)return serialized.error+' Your previous save was kept.';
 try{const previousRaw=storage.getItem(SAVE_KEY);let previous:Game|null=null;if(previousRaw){let value:unknown;try{value=JSON.parse(previousRaw);}catch{return 'The existing save is damaged and was kept. Restore a recovery snapshot before replacing it.';}if(!isGame(value))return 'The existing save is invalid or from another version and was kept.';previous=value;}if(previousRaw&&previous)for(const snapshot of RECOVERY_SNAPSHOTS)if(!storage.getItem(snapshot.key)&&RECOVERY_RULES[snapshot.key](previous,serialized.game))storage.setItem(snapshot.key,previousRaw);storage.setItem(SAVE_KEY,serialized.raw);return null;}
 catch{return 'Saving is unavailable. Export a life backup before closing this tab.';}
}
