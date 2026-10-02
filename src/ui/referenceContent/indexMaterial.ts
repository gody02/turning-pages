import type {GeographyRegistryV1} from '../../engine/geography/types';
import type {SettlementRegistryV1} from '../../engine/geography/settlements/types';
import type {GroupTable,PreparedReferenceData} from './types';

const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
export const areaKey=(partitionId:string,placeId:string)=>`${partitionId}\u0000${placeId}`;
/** Worker-only preparation: offsets refer to the canonical arrays, never copied records. */
export function buildReferenceIndexMaterial(geography:GeographyRegistryV1,settlements:SettlementRegistryV1):PreparedReferenceData{
  const groups=(map:Map<string,number[]>):GroupTable=>[...map].sort(([a],[b])=>compare(a,b));
  return {geography,settlements,indexes:{identities:geography.places.map((item,i)=>[item.placeId,i]),
    geography:geography.partitions.map(pkg=>{
      const children=new Map<string,number[]>();pkg.nodes.forEach((node,i)=>{if(node.parentPlaceId!==null){const items=children.get(node.parentPlaceId)??[];items.push(i);children.set(node.parentPlaceId,items);}});
      for(const values of children.values())values.sort((a,b)=>compare(pkg.nodes[a].placeId,pkg.nodes[b].placeId));
      return {partitionId:pkg.partitionId,nodes:pkg.nodes.map((node,i)=>[node.placeId,i] as const),children:groups(children)};
    }),
    settlements:settlements.packages.map(pkg=>{
      const nodes=new Map(pkg.settlements.map((item,i)=>[item.settlementId,i])),relations=new Map<string,number[]>(),areas=new Map<string,number[]>();
      pkg.administrativeRelations.forEach((relation,i)=>{const list=relations.get(relation.settlementId)??[];list.push(i);relations.set(relation.settlementId,list);const key=areaKey(relation.partitionId,relation.placeId),ids=areas.get(key)??[],node=nodes.get(relation.settlementId)!;if(!ids.includes(node))ids.push(node);areas.set(key,ids);});
      for(const values of relations.values())values.sort((a,b)=>compare(areaKey(pkg.administrativeRelations[a].partitionId,pkg.administrativeRelations[a].placeId),areaKey(pkg.administrativeRelations[b].partitionId,pkg.administrativeRelations[b].placeId)));
      for(const values of areas.values())values.sort((a,b)=>compare(pkg.settlements[a].settlementId,pkg.settlements[b].settlementId));
      return {packageId:pkg.packageId,nodes:pkg.settlements.map((node,i)=>[node.settlementId,i] as const),relations:groups(relations),areas:groups(areas)};
    })}};
}
