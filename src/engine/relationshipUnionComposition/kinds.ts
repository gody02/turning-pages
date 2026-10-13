import {createFormalUnionKindRegistry} from '../formalUnion/kinds';
import {validFormalUnionWithPeople} from '../formalUnion/validation';
import type {FormalUnionKindRegistryV1} from '../formalUnion/types';
import {canonicalStringify,compare,fields,immutable,reasons,snapshot} from './data';
import {validateRelationshipUnionCompositionPlan} from './runtime';
import type {RelationshipOriginalPlanV1,RelationshipFormalUnionContextV1,RelationshipKindResolutionV1} from './types';

export function assessRelationshipUnionKindResolution(original:RelationshipOriginalPlanV1,current:RelationshipFormalUnionContextV1,kinds?:FormalUnionKindRegistryV1):RelationshipKindResolutionV1{
  try{
    const o=snapshot(original),c=snapshot(current);
    if(!fields(o,['plan','policy','context'])||!validateRelationshipUnionCompositionPlan(o.plan,o.policy,o.context)||!fields(c,['people','formalUnion','referenceDate'])||!validFormalUnionWithPeople(c.formalUnion,c.people,c.referenceDate)||canonicalStringify(c.referenceDate)!==canonicalStringify(o.plan.request.referenceDate))throw Error();
    const supplied=kinds===undefined?{version:1 as const,kinds:[],manifest:[]}:snapshot(kinds);
    if(!fields(supplied,['version','kinds','manifest'])||supplied.version!==1)throw Error();
    const registry=createFormalUnionKindRegistry(supplied.kinds,supplied.manifest);
    if(canonicalStringify(supplied)!==canonicalStringify(registry))throw Error();
    const definitions=new Map(registry.kinds.map(kind=>[kind.kindId,kind]));
    const failures:string[]=[],pins=new Map(o.plan.formalUnions.map(u=>[u.unionKind.kindId,u.unionKind.fingerprint]));
    const ids=[...new Set([...pins.keys(),...c.formalUnion.unions.map(u=>u.kindId)])].sort(compare);
    for(const id of ids){
      const kind=definitions.get(id);if(!kind)failures.push(`FormalUnion kind ${id} is unresolved.`);else if(pins.has(id)&&kind.fingerprint!==pins.get(id))failures.push(`FormalUnion kind fingerprint does not match for ${id}.`);
    }
    return immutable({status:failures.length?'UNRESOLVED':'RESOLVED',reasons:reasons(failures)});
  }catch{throw Error('Invalid Relationship/Union kind-resolution input.');}
}
