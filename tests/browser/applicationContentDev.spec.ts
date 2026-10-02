import {expect,test} from '@playwright/test';

test('development Vite resolves the private content Worker under a non-root base',async({page})=>{
 await page.goto('./');await expect(page.getByRole('button',{name:'Begin my story'})).toBeVisible();
 const result=await page.evaluate(async()=>{
  const host=await import('/application-content-evidence/src/ui/gameContent.ts'),{UK_REFERENCE_CONTENT_SET}=await import('/application-content-evidence/src/ui/referenceContent/identities.ts');
  const first=await host.applicationGameContent(UK_REFERENCE_CONTENT_SET),again=await host.applicationGameContent(UK_REFERENCE_CONTENT_SET),diagnostics=host.applicationContentDiagnostics();
  return {same:first===again,places:first.geography.registry.places.length,settlements:first.settlements.registry.packages[0].settlements.length,diagnostics};
 });
 expect(result).toMatchObject({same:true,places:366,settlements:2698,diagnostics:{preparations:1,activeWorkers:0,pendingSets:0,cachedSets:1}});
});
