import {createResidencePlacementRegistry,resolveResidencePlacementPolicy,validateResidencePlacementPolicy} from '../../../../engine/residencePlacement/package';
import {createResidencePlacementRuntime} from '../../../../engine/residencePlacement/runtime';
import type {ResidencePlacementContext,ResidencePlacementManifestEntryV1,ResidencePlacementPolicyV1,ResidencePlacementRegistryV1} from '../../../../engine/residencePlacement/types';
import policyJson from './compiled-policy.json';
import manifestJson from './policy-manifest.json';
import metadataJson from './package-manifest.json';

export const UK_INITIAL_RESIDENCE_PLACEMENT_ID='residence-placement.uk.mid-2024-v1' as const;
export const UK_INITIAL_RESIDENCE_PLACEMENT_FINGERPRINT='fnv1a64-v1:c0d2080b63263587' as const;
export const UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_BYTES=1_570_378 as const;
export const UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_SHA256='f73e76df9caa4bbf3d8fb31b5b98cd2b8fb3e80c18781107c2c375f291c13281' as const;
export const UK_INITIAL_RESIDENCE_PLACEMENT_COMPATIBILITY_DATE=Object.freeze({year:2024,month:6,day:30} as const);

/** Exact immutable contract, not a latest/default lookup or a population target. */
export function validateUkInitialResidencePlacementPolicy(value:unknown):value is ResidencePlacementPolicyV1{
 try{return validateResidencePlacementPolicy(value)&&value.policyId===UK_INITIAL_RESIDENCE_PLACEMENT_ID&&value.fingerprint===UK_INITIAL_RESIDENCE_PLACEMENT_FINGERPRINT;}catch{return false;}
}

/** Own a canonical copy; caller mutation cannot alter registry authority. No source parsing. */
export function prepareUkInitialResidencePlacementPolicy(value:unknown,manifest:readonly ResidencePlacementManifestEntryV1[]=manifestJson):ResidencePlacementRegistryV1{
 if(!validateUkInitialResidencePlacementPolicy(value))throw Error('Invalid immutable UK initial Residence placement content.');
 const registry=createResidencePlacementRegistry([value],manifest);
 if(registry.manifest.length!==1||registry.manifest[0].policyId!==UK_INITIAL_RESIDENCE_PLACEMENT_ID||registry.manifest[0].fingerprint!==UK_INITIAL_RESIDENCE_PLACEMENT_FINGERPRINT)throw Error('UK initial Residence placement manifest mismatch.');
 return registry;
}

/** Registers content only. Never establishes a Residence or accepts a Game. */
export function createUkInitialResidencePlacementRegistry():ResidencePlacementRegistryV1{
 if(metadataJson.version!==1||metadataJson.policyId!==UK_INITIAL_RESIDENCE_PLACEMENT_ID||metadataJson.fingerprint!==UK_INITIAL_RESIDENCE_PLACEMENT_FINGERPRINT||metadataJson.purpose!=='base-world-initial-residence-placement'||metadataJson.status!=='frozen-production'||metadataJson.artifact.byteLength!==UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_BYTES||metadataJson.artifact.sha256!==UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_SHA256)throw Error('UK initial Residence placement package metadata mismatch.');
 return prepareUkInitialResidencePlacementPolicy(policyJson);
}

/** Pure evaluator: later orchestration must prove compatible unevolved base-world context.
 * It must not apply these masses as evolving-world equilibrium or late-NPC targets.
 */
export function createUkInitialResidencePlacementRuntime(context:ResidencePlacementContext){
 const policy=resolveResidencePlacementPolicy(createUkInitialResidencePlacementRegistry(),UK_INITIAL_RESIDENCE_PLACEMENT_ID);
 return createResidencePlacementRuntime(policy,context);
}

/** Build/import boundary verification, not runtime evidence loading. Own bytes before await. */
export async function verifyUkInitialResidencePlacementArtifact(value:Uint8Array):Promise<void>{
 let owned:Uint8Array<ArrayBuffer>;
 try{
  if(!(value instanceof Uint8Array)||Object.getPrototypeOf(value)!==Uint8Array.prototype)throw Error();
  const length=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype),'byteLength')!.get!.call(value);
  owned=new Uint8Array(length);Uint8Array.prototype.set.call(owned,value);
 }catch{throw Error('Invalid UK placement artifact bytes.');}
 if(owned.byteLength!==UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_BYTES)throw Error('UK placement artifact byte length mismatch.');
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',owned.buffer)),sha=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(sha!==UK_INITIAL_RESIDENCE_PLACEMENT_ARTIFACT_SHA256)throw Error('UK placement artifact checksum mismatch.');
}
