import {createGeographyRegistry,validateGeographyRegistry} from './package';
import type {GeographicAreaReferenceV1,GeographyPartitionNodeV1,GeographyPartitionPackageV1,GeographyRegistryV1,ResolvedGeographicPlace} from './types';

const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const stableIdentifier=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=160&&value.includes('.')&&/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value);

export type GeographyRuntime=Readonly<{
 registry:GeographyRegistryV1;
 partition:(partitionId:string)=>GeographyPartitionPackageV1|undefined;
 resolvePlace:(partitionId:string,placeId:string)=>ResolvedGeographicPlace|undefined;
 getParent:(partitionId:string,placeId:string)=>GeographyPartitionNodeV1|null;
 getChildren:(partitionId:string,placeId:string)=>readonly GeographyPartitionNodeV1[];
 getAncestors:(partitionId:string,placeId:string)=>readonly GeographyPartitionNodeV1[];
 isWithin:(partitionId:string,placeId:string,ancestorPlaceId:string)=>boolean;
 isPopulationAllocationCell:(partitionId:string,placeId:string)=>boolean;
}>;

/** Builds closure-private lookup indexes without modifying or decorating canonical Geography content. */
export function createGeographyRuntime(registry:GeographyRegistryV1):GeographyRuntime{
 if(!validateGeographyRegistry(registry))throw Error('Invalid Geography registry.');
 const canonical=createGeographyRegistry(registry.places,registry.partitions,registry.manifest,registry.placeManifest),identityById=new Map(canonical.places.map(item=>[item.placeId,item])),partitionById=new Map(canonical.partitions.map(item=>[item.partitionId,item])),nodeByPartition=new Map<string,Map<string,GeographyPartitionNodeV1>>(),childrenByPartition=new Map<string,Map<string,readonly GeographyPartitionNodeV1[]>>();
 for(const pkg of canonical.partitions){const nodes=new Map(pkg.nodes.map(node=>[node.placeId,node])),children=new Map<string,GeographyPartitionNodeV1[]>();for(const node of pkg.nodes)if(node.parentPlaceId!==null){const list=children.get(node.parentPlaceId)??[];list.push(node);children.set(node.parentPlaceId,list);}for(const list of children.values())list.sort((a,b)=>codePointCompare(a.placeId,b.placeId));nodeByPartition.set(pkg.partitionId,nodes);childrenByPartition.set(pkg.partitionId,children);}
 const partition=(partitionId:string)=>partitionById.get(partitionId);
 const node=(partitionId:string,placeId:string)=>nodeByPartition.get(partitionId)?.get(placeId);
 const requireNode=(partitionId:string,placeId:string)=>{const found=node(partitionId,placeId);if(!found)throw Error('Unknown Geography partition or Place.');return found;};
 const resolvePlace=(partitionId:string,placeId:string):ResolvedGeographicPlace|undefined=>{const found=node(partitionId,placeId),identity=identityById.get(placeId);return found&&identity?Object.freeze({identity,partitionId,node:found}):undefined;};
 const getParent=(partitionId:string,placeId:string)=>{const found=requireNode(partitionId,placeId);return found.parentPlaceId===null?null:requireNode(partitionId,found.parentPlaceId);};
 const getChildren=(partitionId:string,placeId:string)=>{requireNode(partitionId,placeId);return Object.freeze([...(childrenByPartition.get(partitionId)?.get(placeId)??[])]);};
 const getAncestors=(partitionId:string,placeId:string)=>{let current=requireNode(partitionId,placeId);const result:GeographyPartitionNodeV1[]=[];while(current.parentPlaceId!==null){current=requireNode(partitionId,current.parentPlaceId);result.push(current);}return Object.freeze(result);};
 const isWithin=(partitionId:string,placeId:string,ancestorPlaceId:string)=>{requireNode(partitionId,ancestorPlaceId);return getAncestors(partitionId,placeId).some(item=>item.placeId===ancestorPlaceId);};
 const isPopulationAllocationCell=(partitionId:string,placeId:string)=>node(partitionId,placeId)?.populationAllocationCell===true;
 return Object.freeze({registry:canonical,partition,resolvePlace,getParent,getChildren,getAncestors,isWithin,isPopulationAllocationCell});
}

export function validGeographicAreaReference(value:unknown,runtime?:GeographyRuntime):value is GeographicAreaReferenceV1{
 try{if(!value||typeof value!=='object'||Array.isArray(value)||(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null))return false;const keys=Reflect.ownKeys(value);if(keys.length!==3||!['version','partitionId','placeId'].every(key=>keys.includes(key)))return false;for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!['version','partitionId','placeId'].includes(key)||!descriptor?.enumerable||!('value' in descriptor))return false;}const reference=value as Record<string,unknown>;return reference.version===1&&stableIdentifier(reference.partitionId)&&stableIdentifier(reference.placeId)&&(!runtime||!!runtime.resolvePlace(reference.partitionId,reference.placeId));}catch{return false;}
}
