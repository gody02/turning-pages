import {countries} from '../../data/world';
import type {LifeState} from '../core/model';
export const countryOf=(g:Pick<LifeState,'country'>)=>countries.find(c=>c.id===g.country)!;
export const validCountry=(id:string)=>countries.some(c=>c.id===id);
