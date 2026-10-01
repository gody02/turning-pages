import {describe,expect,it} from 'vitest';
import {createUkPopulationContentRegistry,resolveUkPopulationContent,UK_POPULATION_CONTENT_MANIFEST,validateUkPopulationContentRegistry} from './populationRegistry';
import {UK_COUNTRY_START_SCENARIO} from '../../uk/countryStart';

describe('UK population content registry',()=>{
 it('registers v3 as production while retaining v2 as immutable compatibility content',()=>{
  const registry=createUkPopulationContentRegistry();
  expect(registry).toEqual(UK_POPULATION_CONTENT_MANIFEST);expect(Object.isFrozen(registry)).toBe(true);expect(Object.isFrozen(registry.entries)).toBe(true);
  expect(registry.entries).toEqual([
   {packageId:'uk.population.mid-2024.v2',fingerprint:'fnv1a64-v1:a43f874fe1fab27f',contentKind:'national-calibration',releaseStatus:'compatibility'},
   {packageId:'uk.population.mid-2024.v3',fingerprint:'fnv1a64-v1:2894f4c1b1fdd274',contentKind:'geographic-allocation',releaseStatus:'production'},
  ]);
  expect(resolveUkPopulationContent(registry,'uk.population.mid-2024.v2')?.id).toBe('uk.population.mid-2024.v2');
  expect(resolveUkPopulationContent(registry,'uk.population.mid-2024.v3')?.id).toBe('uk.population.mid-2024.v3');
  expect(resolveUkPopulationContent(registry,'uk.population.mid-2024.v4')).toBeUndefined();
 });
 it('rejects malformed manifests and changed semantics under an existing package ID',()=>{
  const changed=structuredClone(UK_POPULATION_CONTENT_MANIFEST) as any;changed.entries[1].fingerprint='fnv1a64-v1:0000000000000000';expect(validateUkPopulationContentRegistry(changed)).toBe(false);
  const reordered=structuredClone(UK_POPULATION_CONTENT_MANIFEST) as any;reordered.entries.reverse();expect(validateUkPopulationContentRegistry(reordered)).toBe(false);
  const extra=structuredClone(UK_POPULATION_CONTENT_MANIFEST) as any;extra.unexpected=true;expect(validateUkPopulationContentRegistry(extra)).toBe(false);
 });
 it('does not switch the frozen country-start scenario to v3',()=>{expect(UK_COUNTRY_START_SCENARIO.populationPackageId).toBe('uk.population.mid-2024.v2');});
});
