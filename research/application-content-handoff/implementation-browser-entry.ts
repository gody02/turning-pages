// Browser acceptance tooling only; no production app imports this module.
export {createUkMid2024GeographicResidenceGame,disposeUkCountryStartStartup} from '../../src/data/countryStart/uk/countryStartResidence';
export {GamePersistence} from '../../src/persistence/service';
export {serializeGame,serializeCurrentGame,upgradeGameToCurrent} from '../../src/engine/save';
export {deriveCountryPopulation} from '../../src/engine/human/population';
export {validGameWithContent} from '../../src/engine/gameContent';
export async function createHistoricalGame(){const {createUkMid2024GeographicGame}=await import('../../src/data/uk/countryStartGeographic');return createUkMid2024GeographicGame({version:1,rootSeed:73,mode:'adult',identity:{name:'Current Life'}});}
export async function historicalRoot3Raw(){const {createUkMid2024Game}=await import('../../src/data/uk/countryStart'),{residence,...game}=createUkMid2024Game({version:1,rootSeed:73,mode:'adult',identity:{name:'Historical Life'}});return JSON.stringify({...game,version:3});}
export async function continueSavedGame(game:any,context:any){
  const [{instantiateFromCohortWithContent},{createUkHumanGenerationContentRegistry},{establishResidence}]=await Promise.all([import('../../src/engine/human/content/integration'),import('../../src/data/human/uk/generation/adapter'),import('../../src/engine/residence/state')]);
  const cohort=game.population.cohorts.find((item:any)=>item.birthYear===2000);
  const result=instantiateFromCohortWithContent({people:game.people,population:game.population,rootSeed:73,cohortId:cohort.id,requestKey:'application-content.browser-continuation',count:1,referenceDate:{year:2024,month:6,day:30},contentRegistry:createUkHumanGenerationContentRegistry()});
  const home=establishResidence(game.residence,['person:2'],game.residence.residences[0].location,{...context,people:result.people});
  return {nextPerson:result.persons[0].id,nextResidence:home.residence.id};
}
