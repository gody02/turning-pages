import type {ResidencePlacementPolicyV1,ResidencePlacementRegistryV1} from '../../../engine/residencePlacement/types';
import {resolveResidencePlacementPolicy} from '../../../engine/residencePlacement/package';
import {createUkInitialResidencePlacementRegistry,UK_INITIAL_RESIDENCE_PLACEMENT_ID,validateUkInitialResidencePlacementPolicy} from './initial-mid-2024/adapter';

/** One exact initial-world policy; registration enables no gameplay or periodic application. */
export function createUkResidencePlacementContentRegistry():ResidencePlacementRegistryV1{
 return createUkInitialResidencePlacementRegistry();
}
export function resolveUkResidencePlacementContent(registry:ResidencePlacementRegistryV1,policyId:string):ResidencePlacementPolicyV1{
 if(policyId!==UK_INITIAL_RESIDENCE_PLACEMENT_ID)throw Error('Unknown UK initial Residence placement policy.');
 const policy=resolveResidencePlacementPolicy(registry,policyId);
 if(registry.policies.length!==1||!validateUkInitialResidencePlacementPolicy(policy))throw Error('Invalid immutable UK initial Residence placement registry.');
 return policy;
}
