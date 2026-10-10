import {canonicalStringify,compare,dense,fields,fingerprintShape,fnv1a64,immutable,snapshot,versionedId} from './data';
import shapes from './validation';
import type {FamilyCompositionPolicyV1,FamilyCompositionPolicyInputV1,FamilyCompositionRegistryV1,FamilyCompositionManifestEntryV1} from './types';

function canonical(policy:FamilyCompositionPolicyV1):FamilyCompositionPolicyV1{
  return {...policy,bindings:[...policy.bindings].sort((a,b)=>compare(a.bindingId,b.bindingId)),
    templates:policy.templates.map(template=>({...template,when:[...template.when].sort((a,b)=>compare(canonicalStringify(a),canonicalStringify(b))),additionalSubjects:[...template.additionalSubjects].sort((a,b)=>compare(a.slotId,b.slotId)),parentages:template.parentages.map(edge=>({...edge,bases:[...edge.bases].sort(compare)})).sort((a,b)=>compare(canonicalStringify(a.parent),canonicalStringify(b.parent))||compare(canonicalStringify(a.child),canonicalStringify(b.child))),provenanceIds:[...template.provenanceIds].sort(compare)})).sort((a,b)=>compare(a.id,b.id)),
    provenance:policy.provenance.map(item=>({...item,sourceIds:[...item.sourceIds].sort(compare)})).sort((a,b)=>compare(a.id,b.id)),limitations:[...policy.limitations].sort(compare)};
}
function digest(policy:FamilyCompositionPolicyV1){const {fingerprint:_fingerprint,...semantics}=canonical(policy);return fnv1a64(canonicalStringify(semantics));}
export function validateFamilyCompositionPolicy(value:unknown):value is FamilyCompositionPolicyV1{
  try{const copy=snapshot(value);return shapes.policyShape(copy)&&canonicalStringify(copy)===canonicalStringify(canonical(copy))&&copy.fingerprint===digest(copy);}catch{return false;}
}
export function withFamilyCompositionPolicyFingerprint(input:FamilyCompositionPolicyInputV1):FamilyCompositionPolicyV1{
  try{
    const copy=snapshot(input);if(!fields(copy,['version','policyId','algorithmId','eligibility','scope','bindings','templates','provenance','limitations']))throw Error();
    const candidate={...copy,fingerprint:'fnv1a64-v1:0000000000000000'};if(!shapes.policyShape(candidate))throw Error();
    return immutable(canonical({...candidate,fingerprint:digest(candidate)}));
  }catch{throw Error('Invalid Family composition policy.');}
}
function registryShape(value:unknown):value is FamilyCompositionRegistryV1{
  if(!fields(value,['version','policies','manifest'])||value.version!==1||!dense(value.policies)||!dense(value.manifest)||value.policies.length!==value.manifest.length||!value.policies.every(validateFamilyCompositionPolicy))return false;
  if(!value.manifest.every(entry=>fields(entry,['policyId','fingerprint'])&&versionedId(entry.policyId)&&fingerprintShape(entry.fingerprint)))return false;
  const policies=value.policies as readonly FamilyCompositionPolicyV1[],manifest=value.manifest as readonly FamilyCompositionManifestEntryV1[];
  return policies.every((policy,index)=>(!index||compare(policies[index-1].policyId,policy.policyId)<0)&&manifest[index].policyId===policy.policyId&&manifest[index].fingerprint===policy.fingerprint);
}
export function createFamilyCompositionRegistry(policies:readonly FamilyCompositionPolicyV1[],manifest:readonly FamilyCompositionManifestEntryV1[]):FamilyCompositionRegistryV1{
  try{const candidate={version:1 as const,policies:[...snapshot(policies)].sort((a,b)=>compare(a.policyId,b.policyId)),manifest:[...snapshot(manifest)].sort((a,b)=>compare(a.policyId,b.policyId))};if(!registryShape(candidate))throw Error();return immutable(candidate);}catch{throw Error('Invalid Family composition registry or manifest.');}
}
export function resolveFamilyCompositionPolicy(registry:FamilyCompositionRegistryV1,policyId:string):FamilyCompositionPolicyV1{
  try{const copy=snapshot(registry);if(!registryShape(copy)||!versionedId(policyId))throw Error();const policy=copy.policies.find(item=>item.policyId===policyId);if(!policy)throw Error();return immutable(policy);}catch{throw Error('Invalid registry or unknown Family composition policy.');}
}
