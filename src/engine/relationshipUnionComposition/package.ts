import {canonicalStringify,compare,dense,fields,fingerprintShape,fnv1a64,immutable,snapshot,versionedId} from './data';
import shapes from './validation';
import type {RelationshipUnionCompositionPolicyV1,RelationshipUnionCompositionPolicyInputV1,RelationshipUnionCompositionRegistryV1,RelationshipUnionCompositionManifestEntryV1} from './types';

function canonical(policy:RelationshipUnionCompositionPolicyV1):RelationshipUnionCompositionPolicyV1{
  const sortPair=(pair:import('./types').RelationshipTemplatePairV1):import('./types').RelationshipTemplatePairV1=>compare(canonicalStringify(pair[0]),canonicalStringify(pair[1]))<0?pair:[pair[1],pair[0]];
  return {...policy,bindings:[...policy.bindings].sort((a,b)=>compare(a.bindingId,b.bindingId)),unionBindings:[...policy.unionBindings].sort(compare),
    templates:policy.templates.map(t=>({...t,when:[...t.when].sort((a,b)=>compare(canonicalStringify(a),canonicalStringify(b))),additionalSubjects:[...t.additionalSubjects].sort((a,b)=>compare(a.slotId,b.slotId)),
      partnerships:t.partnerships.map(p=>({subjects:sortPair(p.subjects)})).sort((a,b)=>compare(canonicalStringify(a),canonicalStringify(b))),
      formalUnions:t.formalUnions.map(u=>({...u,subjects:sortPair(u.subjects)})).sort((a,b)=>compare(a.kind==='create-contract'?JSON.stringify(['create',a.contractSlotId]):JSON.stringify(['existing',a.unionBindingId]),b.kind==='create-contract'?JSON.stringify(['create',b.contractSlotId]):JSON.stringify(['existing',b.unionBindingId]))),provenanceIds:[...t.provenanceIds].sort(compare)})).sort((a,b)=>compare(a.id,b.id)),
    provenance:policy.provenance.map(p=>({...p,sourceIds:[...p.sourceIds].sort(compare)})).sort((a,b)=>compare(a.id,b.id)),limitations:[...policy.limitations].sort(compare)};
}
function digest(policy:RelationshipUnionCompositionPolicyV1){const {fingerprint:_fingerprint,...semantics}=canonical(policy);return fnv1a64(canonicalStringify(semantics));}
export function validateRelationshipUnionCompositionPolicy(value:unknown):value is RelationshipUnionCompositionPolicyV1{
  try{const copy=snapshot(value);return shapes.policyShape(copy)&&canonicalStringify(copy)===canonicalStringify(canonical(copy))&&copy.fingerprint===digest(copy);}catch{return false;}
}
export function withRelationshipUnionCompositionPolicyFingerprint(input:RelationshipUnionCompositionPolicyInputV1):RelationshipUnionCompositionPolicyV1{
  try{
    const copy=snapshot(input);if(!fields(copy,['version','policyId','algorithmId','eligibility','scope','bindings','unionBindings','templates','provenance','limitations']))throw Error();
    const candidate={...copy,fingerprint:'fnv1a64-v1:0000000000000000'};if(!shapes.policyShape(candidate))throw Error();
    return immutable(canonical({...candidate,fingerprint:digest(candidate)}));
  }catch{throw Error('Invalid Relationship/Union composition policy.');}
}
function registryShape(value:unknown):value is RelationshipUnionCompositionRegistryV1{
  if(!fields(value,['version','policies','manifest'])||value.version!==1||!dense(value.policies)||!dense(value.manifest)||value.policies.length!==value.manifest.length||!value.policies.every(validateRelationshipUnionCompositionPolicy))return false;
  if(!value.manifest.every(entry=>fields(entry,['policyId','fingerprint'])&&versionedId(entry.policyId)&&fingerprintShape(entry.fingerprint)))return false;
  const policies=value.policies as readonly RelationshipUnionCompositionPolicyV1[],manifest=value.manifest as readonly RelationshipUnionCompositionManifestEntryV1[];
  return policies.every((policy,index)=>(!index||compare(policies[index-1].policyId,policy.policyId)<0)&&manifest[index].policyId===policy.policyId&&manifest[index].fingerprint===policy.fingerprint);
}
export function createRelationshipUnionCompositionRegistry(policies:readonly RelationshipUnionCompositionPolicyV1[],manifest:readonly RelationshipUnionCompositionManifestEntryV1[]):RelationshipUnionCompositionRegistryV1{
  try{const candidate={version:1 as const,policies:[...snapshot(policies)].sort((a,b)=>compare(a.policyId,b.policyId)),manifest:[...snapshot(manifest)].sort((a,b)=>compare(a.policyId,b.policyId))};if(!registryShape(candidate))throw Error();return immutable(candidate);}catch{throw Error('Invalid Relationship/Union composition registry or manifest.');}
}
export function resolveRelationshipUnionCompositionPolicy(registry:RelationshipUnionCompositionRegistryV1,policyId:string):RelationshipUnionCompositionPolicyV1{
  try{const copy=snapshot(registry);if(!registryShape(copy)||!versionedId(policyId))throw Error();const policy=copy.policies.find(item=>item.policyId===policyId);if(!policy)throw Error();return immutable(policy);}catch{throw Error('Invalid registry or unknown Relationship/Union composition policy.');}
}
