import {candidateKey,derivationKey,immutable,scopeKey,snapshot} from './data';
import {validateResidencePlacementPolicy,withResidencePlacementPolicyFingerprint} from './package';
import {candidateIndexForTicket,keyedPlacementTicket} from './selection';
import {placementContentMatches,validateResidencePlacementRequest} from './validation';
import type {ResidencePlacementCandidateV1,ResidencePlacementContext,ResidencePlacementDecisionV1,ResidencePlacementDiagnosticsV1,ResidencePlacementPolicyV1,ResidencePlacementRequestV1} from './types';

export type ResidencePlacementRuntime=Readonly<{policy:ResidencePlacementPolicyV1;evaluate:(request:ResidencePlacementRequestV1)=>ResidencePlacementDecisionV1;diagnose:(request:ResidencePlacementRequestV1)=>ResidencePlacementDiagnosticsV1}>;
/** Indexes are separate closure-private derivatives of owned frozen canonical content. */
export function createResidencePlacementRuntime(policy:ResidencePlacementPolicyV1,context:ResidencePlacementContext):ResidencePlacementRuntime{
 let owned:ResidencePlacementPolicyV1;
 try{const copy=snapshot(policy);if(!validateResidencePlacementPolicy(copy))throw Error();const {fingerprint:_fingerprint,...input}=copy;owned=withResidencePlacementPolicyFingerprint(input);if(!placementContentMatches(owned,context))throw Error();}catch{throw Error('Invalid Residence placement policy or content dependencies.');}
 const groups=new Map<string,{candidates:readonly ResidencePlacementCandidateV1[];bounds:readonly bigint[];total:number}>();
 for(const group of owned.groups){let sum=0n;const bounds=group.candidates.map(candidate=>{sum+=BigInt(candidate.weight);return sum;});groups.set(scopeKey(group.scope),{candidates:group.candidates,bounds,total:Number(sum)});}
 const select=(input:ResidencePlacementRequestV1)=>{
  if(!validateResidencePlacementRequest(input))throw Error('Invalid Residence placement request.');
  const request=snapshot(input);if(request.policyId!==owned.policyId)throw Error('Residence placement policy ID mismatch.');
  const group=groups.get(scopeKey(request.scope));if(!group)throw Error('Unknown Residence placement scope.');
  const requestKey=derivationKey('residence-placement','v1',owned.algorithmId,owned.policyId,owned.fingerprint,request.personId,request.scope.partitionId,request.scope.placeId);
  const draw=group.candidates.length===1?null:keyedPlacementTicket(request.rootSeed,requestKey,group.total),index=draw===null?0:candidateIndexForTicket(group.bounds,draw.ticket),candidate=group.candidates[index];
  const decision:ResidencePlacementDecisionV1=immutable({version:1,policyId:owned.policyId,policyFingerprint:owned.fingerprint,requestKey,location:candidate.location});
  return {request,group,draw,candidate,decision};
 };
 const evaluate=(request:ResidencePlacementRequestV1)=>select(request).decision;
 const diagnose=(request:ResidencePlacementRequestV1):ResidencePlacementDiagnosticsV1=>{
  const selected=select(request);
  return immutable({version:1,decision:selected.decision,scope:selected.request.scope,candidates:selected.group.candidates.map(candidate=>({key:candidateKey(candidate.location),location:candidate.location,weight:candidate.weight})),totalMass:selected.group.total,ticket:selected.draw?.ticket.toString()??null,attempts:selected.draw?.attempts??0,selectedCandidateKey:candidateKey(selected.candidate.location)});
 };
 return Object.freeze({policy:owned,evaluate,diagnose});
}
export function evaluateResidencePlacement(policy:ResidencePlacementPolicyV1,request:ResidencePlacementRequestV1,context:ResidencePlacementContext):ResidencePlacementDecisionV1{return createResidencePlacementRuntime(policy,context).evaluate(request);}
