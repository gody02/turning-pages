import {canonicalStringify, compare, dense, fields, fingerprintShape, fnv1a64, immutable, memberKey, snapshot, versionedId} from './data';
import {policyShape} from './validation';
import type {HouseholdCompositionPolicyInputV1, HouseholdCompositionPolicyV1, HouseholdCompositionRegistryV1, HouseholdCompositionManifestEntryV1} from './types';

function canonical(policy:HouseholdCompositionPolicyV1):HouseholdCompositionPolicyV1{
  return {...policy,anchorBindings:[...policy.anchorBindings].sort(compare),templates:policy.templates.map(template=>({
    ...template,
    when:[...template.when].sort((a,b)=>compare(a.bindingId,b.bindingId)),
    additionalMembers:[...template.additionalMembers].sort((a,b)=>compare(a.slotId,b.slotId)),
    households:template.households.map(unit=>({...unit,members:[...unit.members].sort((a,b)=>compare(memberKey(a),memberKey(b)))})).sort((a,b)=>compare(a.householdSlotId,b.householdSlotId)),
  })).sort((a,b)=>compare(a.id,b.id))};
}
function digest(policy:HouseholdCompositionPolicyV1){const {fingerprint:_fingerprint,...semantics}=canonical(policy);return fnv1a64(canonicalStringify(semantics));}
export function validateHouseholdCompositionPolicy(value:unknown):value is HouseholdCompositionPolicyV1{
  try{const copy=snapshot(value);return policyShape(copy) && canonicalStringify(copy)===canonicalStringify(canonical(copy)) && copy.fingerprint===digest(copy);}catch{return false;}
}
export function withHouseholdCompositionPolicyFingerprint(input:HouseholdCompositionPolicyInputV1):HouseholdCompositionPolicyV1{
  try{
    const copy=snapshot(input);
    if(!fields(copy,['version','policyId','algorithmId','scope','anchorBindings','templates']))throw Error();
    const candidate={...copy,fingerprint:'fnv1a64-v1:0000000000000000'};
    if(!policyShape(candidate))throw Error();
    return immutable(canonical({...candidate,fingerprint:digest(candidate)}));
  }catch{throw Error('Invalid Household composition policy.');}
}
function registryShape(value:unknown):value is HouseholdCompositionRegistryV1{
  if(!fields(value,['version','policies','manifest']) || value.version!==1 || !dense(value.policies) || !dense(value.manifest) || value.policies.length!==value.manifest.length || !value.policies.every(validateHouseholdCompositionPolicy))return false;
  if(!value.manifest.every(entry=>fields(entry,['policyId','fingerprint']) && versionedId(entry.policyId) && fingerprintShape(entry.fingerprint)))return false;
  const policies=value.policies as readonly HouseholdCompositionPolicyV1[],manifest=value.manifest as readonly HouseholdCompositionManifestEntryV1[];
  return policies.every((policy,index)=>(index===0 || compare(policies[index-1].policyId,policy.policyId)<0) && manifest[index].policyId===policy.policyId && manifest[index].fingerprint===policy.fingerprint);
}
export function createHouseholdCompositionRegistry(policies:readonly HouseholdCompositionPolicyV1[],manifest:readonly HouseholdCompositionManifestEntryV1[]):HouseholdCompositionRegistryV1{
  try{
    const candidate={version:1 as const,policies:[...snapshot(policies)].sort((a,b)=>compare(a.policyId,b.policyId)),manifest:[...snapshot(manifest)].sort((a,b)=>compare(a.policyId,b.policyId))};
    if(!registryShape(candidate))throw Error();return immutable(candidate);
  }catch{throw Error('Invalid Household composition registry or manifest.');}
}
export function resolveHouseholdCompositionPolicy(registry:HouseholdCompositionRegistryV1,policyId:string):HouseholdCompositionPolicyV1{
  try{
    const copy=snapshot(registry);if(!registryShape(copy) || !versionedId(policyId))throw Error();
    const policy=copy.policies.find(item=>item.policyId===policyId);if(!policy)throw Error();return immutable(policy);
  }catch{throw Error('Invalid registry or unknown Household composition policy.');}
}
