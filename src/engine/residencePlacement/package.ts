import {candidateKey,canonicalStringify,compare,dense,fields,fingerprintShape,fnv1a64,immutable,record,scopeKey,snapshot,versionedId} from './data';
import {placementContentMatches,policyShape} from './validation';
import type {GeographicAreaReferenceV1} from '../geography/types';
import type {ResidencePlacementContext,ResidencePlacementLocationV1,ResidencePlacementManifestEntryV1,ResidencePlacementPolicyInputV1,ResidencePlacementPolicyV1,ResidencePlacementRegistryV1} from './types';

const canonicalArea=(area:GeographicAreaReferenceV1):GeographicAreaReferenceV1=>({version:1,partitionId:area.partitionId,placeId:area.placeId});
const canonicalLocation=(location:ResidencePlacementLocationV1):ResidencePlacementLocationV1=>location.kind==='administrative-area'?{kind:location.kind,administrativeArea:canonicalArea(location.administrativeArea)}:{kind:location.kind,administrativeArea:canonicalArea(location.administrativeArea),settlement:{version:1,packageId:location.settlement.packageId,settlementId:location.settlement.settlementId}};

function canonical(policy:ResidencePlacementPolicyV1):ResidencePlacementPolicyV1{
 const pins=(items:ResidencePlacementPolicyV1['dependencies']['geographyPartitions'])=>items.map(item=>({id:item.id,fingerprint:item.fingerprint})).sort((a,b)=>compare(a.id,b.id));
 return {version:1,policyId:policy.policyId,fingerprint:policy.fingerprint,algorithmId:policy.algorithmId,dependencies:{geographyPartitions:pins(policy.dependencies.geographyPartitions),settlementPackages:pins(policy.dependencies.settlementPackages)},groups:policy.groups.map(group=>({scope:canonicalArea(group.scope),candidates:group.candidates.map(candidate=>({location:canonicalLocation(candidate.location),weight:candidate.weight})).sort((a,b)=>compare(candidateKey(a.location),candidateKey(b.location)))})).sort((a,b)=>compare(scopeKey(a.scope),scopeKey(b.scope)))};
}
function digest(policy:ResidencePlacementPolicyV1):string{const {fingerprint:_fingerprint,...semantics}=canonical(policy);return fnv1a64(canonicalStringify(semantics));}
export function fingerprintResidencePlacementPolicy(value:ResidencePlacementPolicyV1):string{
 try{const copy=snapshot(value);if(!policyShape(copy))throw Error();return digest(copy);}catch{throw Error('Invalid Residence placement policy.');}
}
export function validateResidencePlacementPolicy(value:unknown):value is ResidencePlacementPolicyV1{
 try{const copy=snapshot(value);return policyShape(copy)&&canonicalStringify(copy)===canonicalStringify(canonical(copy))&&copy.fingerprint===digest(copy);}catch{return false;}
}
export function withResidencePlacementPolicyFingerprint(value:ResidencePlacementPolicyInputV1):ResidencePlacementPolicyV1{
 try{
  const copy=snapshot(value);if(!record(copy)||!fields(copy,['version','policyId','algorithmId','dependencies','groups']))throw Error();
  const candidate={...copy,fingerprint:'fnv1a64-v1:0000000000000000'};if(!policyShape(candidate))throw Error();
  return immutable(canonical({...candidate,fingerprint:digest(candidate)}));
 }catch{throw Error('Invalid Residence placement policy.');}
}
export function validateResidencePlacementContent(value:unknown,context:ResidencePlacementContext):value is ResidencePlacementPolicyV1{
 try{const copy=snapshot(value);return validateResidencePlacementPolicy(copy)&&placementContentMatches(copy,context);}catch{return false;}
}
export function validateResidencePlacementRegistry(value:unknown):value is ResidencePlacementRegistryV1{
 try{
  const copy=snapshot(value);if(!record(copy)||!fields(copy,['version','policies','manifest'])||copy.version!==1||!dense(copy.policies)||!dense(copy.manifest)||copy.policies.length!==copy.manifest.length||!copy.policies.every(validateResidencePlacementPolicy))return false;
  const policies=copy.policies as readonly ResidencePlacementPolicyV1[],manifest=copy.manifest;
  if(!manifest.every(item=>record(item)&&fields(item,['policyId','fingerprint'])&&versionedId(item.policyId)&&fingerprintShape(item.fingerprint)))return false;
  const entries=manifest as readonly ResidencePlacementManifestEntryV1[];
  return policies.every((policy,index)=>(index===0||compare(policies[index-1].policyId,policy.policyId)<0)&&entries[index].policyId===policy.policyId&&entries[index].fingerprint===policy.fingerprint);
 }catch{return false;}
}
export function createResidencePlacementRegistry(policies:readonly ResidencePlacementPolicyV1[],manifest:readonly ResidencePlacementManifestEntryV1[]):ResidencePlacementRegistryV1{
 try{const candidate={version:1 as const,policies:[...snapshot(policies)].sort((a,b)=>compare(a.policyId,b.policyId)),manifest:[...snapshot(manifest)].sort((a,b)=>compare(a.policyId,b.policyId))};if(!validateResidencePlacementRegistry(candidate))throw Error();return immutable(candidate);}catch{throw Error('Invalid Residence placement registry or manifest.');}
}
export function resolveResidencePlacementPolicy(registry:ResidencePlacementRegistryV1,policyId:string):ResidencePlacementPolicyV1{
 if(!validateResidencePlacementRegistry(registry))throw Error('Invalid Residence placement registry.');
 const policy=registry.policies.find(item=>item.policyId===policyId);if(!policy)throw Error('Unknown Residence placement policy.');return immutable(policy);
}
