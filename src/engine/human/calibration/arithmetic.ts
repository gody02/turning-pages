export type ExactRational=Readonly<{numerator:bigint;denominator:bigint}>;

const MAX_RATIONAL_BITS=16384;
const withinLimit=(value:bigint)=>value.toString(2).length<=MAX_RATIONAL_BITS;
const gcd=(left:bigint,right:bigint):bigint=>{let a=left<0n?-left:left,b=right<0n?-right:right;while(b){const next=a%b;a=b;b=next;}return a||1n;};
export function rational(numerator:bigint,denominator=1n):ExactRational{
 if(typeof numerator!=='bigint'||typeof denominator!=='bigint'||denominator<=0n||numerator<0n)throw Error('Calibration rational must be nonnegative with a positive denominator.');
 if(!withinLimit(numerator)||!withinLimit(denominator))throw Error('Calibration rational exceeds the precision safety limit.');
 const divisor=gcd(numerator,denominator);return Object.freeze({numerator:numerator/divisor,denominator:denominator/divisor});
}
export function parseExactDecimal(value:string):ExactRational{
 if(typeof value!=='string'||!/^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/.test(value))throw Error('Invalid canonical decimal.');
 const [whole,fraction='']=value.split('.');if(whole.length+fraction.length>30||fraction.length>12)throw Error('Decimal precision exceeds calibration limits.');
 return rational(BigInt(whole+fraction),10n**BigInt(fraction.length));
}
function normalized(value:ExactRational):ExactRational{try{return rational(value.numerator,value.denominator);}catch{throw Error('Invalid calibration rational.');}}
export const addRational=(left:ExactRational,right:ExactRational)=>{const a=normalized(left),b=normalized(right);return rational(a.numerator*b.denominator+b.numerator*a.denominator,a.denominator*b.denominator);};
export const multiplyRational=(left:ExactRational,right:ExactRational)=>{const a=normalized(left),b=normalized(right);return rational(a.numerator*b.numerator,a.denominator*b.denominator);};
export const divideRational=(left:ExactRational,right:ExactRational)=>{const a=normalized(left),b=normalized(right);if(b.numerator===0n)throw Error('Cannot divide by zero calibration weight.');return rational(a.numerator*b.denominator,a.denominator*b.numerator);};
export const compareRational=(left:ExactRational,right:ExactRational)=>{const a=normalized(left),b=normalized(right);return a.numerator*b.denominator<b.numerator*a.denominator?-1:a.numerator*b.denominator>b.numerator*a.denominator?1:0;};
export const floorRational=(value:ExactRational)=>{const item=normalized(value);return item.numerator/item.denominator;};
export const rationalToString=(value:ExactRational)=>{const item=normalized(value);return item.denominator===1n?item.numerator.toString():`${item.numerator}/${item.denominator}`;};

export type AllocationWeight=Readonly<{id:string;weight:ExactRational}>;
export type LargestRemainderResult=Readonly<{allocations:readonly Readonly<{id:string;count:number}>[];residualAssignments:readonly string[]}>;
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;

export function allocateLargestRemainder(target:number,weights:readonly AllocationWeight[]):LargestRemainderResult{
 if(!Number.isSafeInteger(target)||target<0)throw Error('Invalid largest-remainder allocation.');
 const safeWeights:AllocationWeight[]=[];try{if(!Array.isArray(weights)||weights.length>10000||Object.keys(weights).length!==weights.length||Reflect.ownKeys(weights).length!==weights.length+1)throw Error();for(let index=0;index<weights.length;index++){const element=Object.getOwnPropertyDescriptor(weights,index);if(!element?.enumerable||!('value' in element))throw Error();const item=element.value;if(!item||typeof item!=='object'||Array.isArray(item)||Object.getPrototypeOf(item)!==Object.prototype&&Object.getPrototypeOf(item)!==null)throw Error();const keys=Reflect.ownKeys(item);if(keys.length!==2||!keys.includes('id')||!keys.includes('weight'))throw Error();const id=Object.getOwnPropertyDescriptor(item,'id'),weight=Object.getOwnPropertyDescriptor(item,'weight');if(!id?.enumerable||!('value' in id)||typeof id.value!=='string'||!id.value||id.value.length>500||!weight?.enumerable||!('value' in weight))throw Error();safeWeights.push({id:id.value,weight:normalized(weight.value as ExactRational)});}}catch{throw Error('Invalid allocation weight.');}
 if(new Set(safeWeights.map(item=>item.id)).size!==safeWeights.length)throw Error('Invalid largest-remainder allocation.');
 const ordered=[...safeWeights].sort((a,b)=>codePointCompare(a.id,b.id));let total=rational(0n);
 for(const item of ordered)total=addRational(total,item.weight);
 if(target>0&&total.numerator===0n)throw Error('Positive allocation requires positive total weight.');
 if(target===0)return Object.freeze({allocations:Object.freeze(ordered.map(item=>Object.freeze({id:item.id,count:0}))),residualAssignments:Object.freeze([])});
 const quotas=ordered.map(item=>{const quota=divideRational(multiplyRational(rational(BigInt(target)),item.weight),total),floor=floorRational(quota);return {id:item.id,floor,remainder:rational(quota.numerator%quota.denominator,quota.denominator)};});
 const floorTotal=quotas.reduce((sum,item)=>sum+item.floor,0n),residual=BigInt(target)-floorTotal;if(residual<0n||residual>BigInt(quotas.length))throw Error('Invalid largest-remainder residual.');
 const ranked=[...quotas].sort((a,b)=>compareRational(b.remainder,a.remainder)||codePointCompare(a.id,b.id));const awarded=new Set(ranked.slice(0,Number(residual)).map(item=>item.id));
 const allocations=quotas.map(item=>{const value=item.floor+(awarded.has(item.id)?1n:0n);if(value>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Calibration allocation exceeds safe integer range.');return Object.freeze({id:item.id,count:Number(value)});});
 if(allocations.reduce((sum,item)=>sum+item.count,0)!==target)throw Error('Largest-remainder allocation did not conserve its target.');
 return Object.freeze({allocations:Object.freeze(allocations),residualAssignments:Object.freeze(ranked.slice(0,Number(residual)).map(item=>item.id))});
}
