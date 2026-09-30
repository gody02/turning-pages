/** Stable game dimensions. They describe simulation tendencies, not diagnoses. */
export const TEMPERAMENT_KEYS=[
 'human.sociability',
 'human.conscientiousness',
 'human.risk-tolerance',
 'human.emotional-reactivity',
] as const;

export const APTITUDE_KEYS=[
 'human.verbal',
 'human.quantitative',
 'human.spatial',
 'human.interpersonal',
] as const;

export type TemperamentKey=typeof TEMPERAMENT_KEYS[number];
export type AptitudeKey=typeof APTITUDE_KEYS[number];

const temperamentKeys=new Set<string>(TEMPERAMENT_KEYS);
const aptitudeKeys=new Set<string>(APTITUDE_KEYS);

export const isTemperamentKey=(value:unknown):value is TemperamentKey=>typeof value==='string'&&temperamentKeys.has(value);
export const isAptitudeKey=(value:unknown):value is AptitudeKey=>typeof value==='string'&&aptitudeKeys.has(value);
