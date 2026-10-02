import {validGameWithContent} from '../../../engine/gameContent';
import {establishResidence} from '../../../engine/residence/state';
import {serializeGame} from '../../../engine/save';
import type {CurrentGame} from '../../../engine/types';
import type {UkMid2024StartRequestV1} from '../../uk/countryStart';
import {createUkMid2024GeographicGame} from '../../uk/countryStartGeographic';
import {createUkCountryStartRegistry,resolveUkCountryStartScenario} from './countryStartRegistry';
import {UK_RESIDENCE_COUNTRY_START_SCENARIO as scenario} from './countryStartResidenceScenario';
import {prepareUkCountryStartResidenceContent} from './countryStartResidencePreparation';
import {ownStartupRequest as ownRequest} from './countryStartResidenceRequest';

/** Base-world construction only. No storage, runtime materialization, or UI routing. */
export function buildUkMid2024GeographicResidenceGame(input:UkMid2024StartRequestV1):CurrentGame{
 const request=ownRequest(input),registry=createUkCountryStartRegistry();
 resolveUkCountryStartScenario(registry,scenario.id);
 resolveUkCountryStartScenario(registry,scenario.baseScenarioId);
 // Calling v2 unchanged preserves its exact generation, cohort, compatibility and RNG keys.
 const base=createUkMid2024GeographicGame(request);
 if(base.version!==4||!base.people||!base.population||base.people.playerId!=='person:1'
  ||base.people.people.length!==1||base.people.nextSequence!==2||base.people.people[0].lifeStatus!=='living'
  ||base.residence.nextSequence!==1||base.residence.residences.length!==0
  ||base.residence.occupants.length!==0||base.residence.noFixedAbodePersonIds.length!==0)throw Error('Invalid v2 base world for initial Residence.');
 const memberships=base.population.memberships.filter(item=>item.personId===base.people!.playerId);
 const member=memberships[0],coverage=base.population.coverage.find(item=>item.countryId===scenario.countryId);
 if(memberships.length!==1||base.population.memberships.length!==1||!member
  ||member.countryId!==scenario.countryId||member.areaId===null||member.origin.kind!=='cohort'
  ||coverage?.status!=='complete'||coverage.source!==scenario.populationPackageId
  ||coverage.areaPartitionId!==scenario.geographyPartitionId)throw Error('Invalid UK player Population placement scope.');
 const {geography,settlements,placement:runtime}=prepareUkCountryStartResidenceContent();
 if(!geography.isPopulationAllocationCell(scenario.geographyPartitionId,member.areaId))throw Error('UK Country Start Residence content mismatch.');
 const context={people:base.people,geography,settlements};
 if(!validGameWithContent(base,context))throw Error('Invalid content-bound UK base world.');
 const decision=runtime.evaluate({version:1,policyId:scenario.placementPolicyId,personId:base.people.playerId,
  rootSeed:request.rootSeed,scope:{version:1,partitionId:scenario.geographyPartitionId,placeId:member.areaId}});
 if(decision.version!==1||decision.policyId!==scenario.placementPolicyId||decision.policyFingerprint!==scenario.placementFingerprint
  ||decision.location.administrativeArea.partitionId!==scenario.geographyPartitionId
  ||decision.location.administrativeArea.placeId!==member.areaId)throw Error('UK initial Residence decision changed administrative scope.');
 const established=establishResidence(base.residence,[base.people.playerId],decision.location,context);
 const candidate:CurrentGame={...base,residence:established.state};
 if(candidate.residence.residences.length!==1||candidate.residence.occupants.length!==1
  ||candidate.residence.occupants[0].personId!==base.people.playerId
  ||candidate.residence.noFixedAbodePersonIds.length!==0||!validGameWithContent(candidate,context))throw Error('UK initial Residence failed root/content validation.');
 // The frozen codec validates, canonicalizes, parses and compares its candidate before return.
 const serialized=serializeGame(candidate);
 if(!serialized.ok||serialized.game.version!==4||!validGameWithContent(serialized.game,context))throw Error('UK initial Residence failed canonical roundtrip.');
 return serialized.game;
}
