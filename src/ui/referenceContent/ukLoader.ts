import {referenceSetKey} from './protocol';
import type {ExactReferenceContentSetV1,PreparedReferenceData} from './types';
import {buildReferenceIndexMaterial} from './indexMaterial';
import {UK_REFERENCE_CONTENT_SET} from './identities';

/** Called only inside the content Worker (or a differential test). Original validation is unchanged. */
export async function loadRegisteredReferenceContent(set:ExactReferenceContentSetV1):Promise<{data:PreparedReferenceData;importMs:number;prepareMs:number}>{
  if(referenceSetKey(set)!==referenceSetKey(UK_REFERENCE_CONTENT_SET))throw Error('Exact application reference content is not registered.');
  const start=performance.now(),[geo,settlement]=await Promise.all([import('../../data/geography/uk/primary-local-admin-2024/adapter'),import('../../data/geography/uk/settlementRegistry')]),imported=performance.now();
  const geography=geo.createUkGeographyRegistry(),settlements=settlement.createUkSettlementContentRegistry();
  if(JSON.stringify(geography.manifest)!==JSON.stringify(set.geography)||JSON.stringify(settlements.packageManifest)!==JSON.stringify(set.settlements))throw Error('Application content manifest mismatch.');
  const data=buildReferenceIndexMaterial(geography,settlements);
  return {data,importMs:imported-start,prepareMs:performance.now()-imported};
}
