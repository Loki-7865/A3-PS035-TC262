import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadDemoScenario, investigationContext, findingCategory, SCENARIO_IDS } from '../src/services/demoScenarios.js';
const fixture = async id => JSON.parse(await readFile(new URL(`../public/demo/scenarios/${id}.json`,import.meta.url)));
test('all four demo snapshots load unchanged from independent static paths', async()=>{
  for(const id of SCENARIO_IDS){
    const expected=await fixture(id); let requested;
    const result=await loadDemoScenario(id,{baseUrl:'/preview/',fetcher:async(url,options)=>{requested={url,options}; return {ok:true,json:async()=>expected};}});
    assert.deepEqual(result,expected); assert.equal(requested.url,`/preview/demo/scenarios/${id}.json`); assert.equal(requested.options.cache,'no-store');
  }
});
test('failed, mismatched and malformed snapshots reject instead of producing healthy data',async()=>{
  await assert.rejects(loadDemoScenario('bad'),/Unknown/);
  await assert.rejects(loadDemoScenario('healthy',{fetcher:async()=>({ok:false,status:503})}),/503/);
  await assert.rejects(loadDemoScenario('healthy',{fetcher:async()=>({ok:true,json:async()=>({})})}),/invalid structure/);
  const snapshot=await fixture('healthy');snapshot.evidence={};
  await assert.rejects(loadDemoScenario('healthy',{fetcher:async()=>({ok:true,json:async()=>snapshot})}),/invalid structure/);
});
test('aborted request cannot publish even if response parsing completes afterward',async()=>{
  const controller=new AbortController(); const snapshot=await fixture('healthy');
  await assert.rejects(loadDemoScenario('healthy',{signal:controller.signal,fetcher:async()=>({ok:true,json:async()=>{controller.abort();return snapshot;}})}),{name:'AbortError'});
});
test('simultaneous failures keep each links evidence and hypotheses separate',async()=>{
  const snapshot=await fixture('multiple_faults');
  const physical=investigationContext(snapshot,{link:'R2-R4'}), routing=investigationContext(snapshot,{link:'R4-R5'});
  assert.equal(physical.causes.length,1); assert.equal(routing.causes.length,1);
  assert.equal(physical.causes[0].type,'physical_link_failure');
  assert.ok(physical.evidence.every(item=>item.link==='R2-R4'));
  assert.ok(routing.evidence.every(item=>item.link==='R4-R5'));
  assert.equal(physical.evidence.length+routing.evidence.length,snapshot.evidence.length);
});
test('router context includes cited peer evidence without claiming new telemetry',async()=>{
  const snapshot=await fixture('multiple_faults'); const context=investigationContext(snapshot,{router:'R4'});
  assert.equal(context.links.length,3); assert.equal(context.causes.length,2);
  assert.ok(context.evidence.some(item=>item.router==='r2'));
  assert.deepEqual(investigationContext(snapshot),{findings:[],links:[],causes:[],evidence:[]});
});
test('BGP observations are possible downstream symptoms only when a physical hypothesis exists on that link',async()=>{
  const snapshot=await fixture('multiple_faults'); const causes=snapshot.diagnosis.candidate_root_causes;
  assert.equal(findingCategory({type:'interface_down'},causes),'Physical observation');
  assert.equal(findingCategory({type:'bgp_session_down',link:'R2-R4'},causes),'Possible downstream symptom');
  assert.equal(findingCategory({type:'bgp_session_down',link:'R4-R5'},causes),'Routing observation');
});
