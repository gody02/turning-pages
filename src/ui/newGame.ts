import type {UkCountryStartMode,UkMid2024StartRequestV1} from '../data/uk/countryStart';
import {createUkMid2024GeographicGame} from '../data/uk/countryStartGeographic';
import {MAX_PERSON_NAME_CODE_POINTS,personDisplayNameCodePointCount,validPersonDisplayName} from '../engine/shared/personDisplayName';
import type {Game} from '../engine/types';

export type NewGameFormV1=Readonly<{mode:UkCountryStartMode;name:string;genderLabel:string}>;
type NewGameDependencies=Readonly<{rootSeed:()=>number;bootstrap:(request:UkMid2024StartRequestV1)=>Game}>;
const dependencies:NewGameDependencies={rootSeed:platformRootSeed,bootstrap:createUkMid2024GeographicGame};

export class NewGameInputError extends Error{}

export function platformRootSeed():number{
 const source=globalThis.crypto;if(!source?.getRandomValues)throw Error('Secure platform randomness is unavailable.');const value=new Uint32Array(1);source.getRandomValues(value);return value[0];
}

export function newGameNameError(value:string):string{
 const name=value.trim();if(!name)return '';if(!validPersonDisplayName(name))return personDisplayNameCodePointCount(name)>MAX_PERSON_NAME_CODE_POINTS?`Names can contain at most ${MAX_PERSON_NAME_CODE_POINTS} Unicode code points.`:'Enter a valid name.';return '';
}

export function newGameGenderError(value:string):string{const label=value.trim();return label.length>40?'Gender labels can contain at most 40 characters.':'';}

/** UI composition only: domain dates, cohorts, identity generation and validation remain in the frozen bootstrap. */
export function createProductionUkNewGame(form:NewGameFormV1,custom:NewGameDependencies=dependencies):Game{
 if(!form||typeof form!=='object'||Array.isArray(form)||Reflect.ownKeys(form).length!==3||!Object.prototype.hasOwnProperty.call(form,'mode')||!Object.prototype.hasOwnProperty.call(form,'name')||!Object.prototype.hasOwnProperty.call(form,'genderLabel')||typeof form.name!=='string'||typeof form.genderLabel!=='string'||form.mode!=='childhood'&&form.mode!=='adult')throw new NewGameInputError('Choose a supported UK starting point.');
 const name=form.name.trim(),genderLabel=form.genderLabel.trim(),nameError=newGameNameError(form.name),genderError=newGameGenderError(form.genderLabel);if(nameError)throw new NewGameInputError(nameError);if(genderError)throw new NewGameInputError(genderError);
 const rootSeed=custom.rootSeed();if(!Number.isSafeInteger(rootSeed)||rootSeed<0||rootSeed>0xffffffff)throw Error('Platform seed creation failed.');
 const identity={...(name?{name}:{}),...(genderLabel?{genderLabel}:{})};return custom.bootstrap({version:1,rootSeed,mode:form.mode,...(Object.keys(identity).length?{identity}:{})});
}
