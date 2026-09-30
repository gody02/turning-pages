/**
 * A generous resource bound for a Person's display name. This is not a
 * linguistic limit and counts Unicode code points, not grapheme clusters.
 */
export const MAX_PERSON_NAME_CODE_POINTS=256 as const;

export function personDisplayNameCodePointCount(value:string):number{
 let count=0;for(const _codePoint of value)count++;return count;
}

export function validPersonDisplayName(value:unknown):value is string{
 if(typeof value!=='string')return false;
 let count=0;for(const _codePoint of value)if(++count>MAX_PERSON_NAME_CODE_POINTS)return false;
 return count>0&&value.trim().length>0;
}
