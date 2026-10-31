import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInvestigation, liveInvestigation, relatedContext, investigativeSteps } from '../src/services/faultInvestigation.js';
const fixture = async id => JSON.parse(await readFile(new URL(`../public/demo/scenarios/${id}.json`, import.meta.url)));
const live = {schema_version:1,source:'live',provenance:'backend_recorded_snapshot',observed_at:'2020-01-01T00:00:00Z',served_at:'2020-01-02T00:00:00Z',freshness:'stale',routers:[{id:'R1',status:'attention',collection_ok:true,findings_count:1}],topology:{links:[{id:'R1-R2',a:'R1',b:'R2',status:'suspected',physical_status:'not_measured'}]},diagnosis:{findings:[{router:'R1',neighbor:'peer',type:'bgp_down',severity:'CRITICAL',message:'Idle'}],candidate_root_causes:[{candidate_link:'R1-R2',severity:'CRITICAL',assessment:'Hypothesis',evidence:'Peer Idle',observations:[{router:'R1',neighbor:'peer'}]}]},evidence:[{id:'finding-1',router:'R1',neighbor:'peer',type:'bgp_down',message:'Idle'}],incidents:[],incidents_total:0};
test('all demo results preserve observations and explicitly label the recorded operation',async()=> {
  for(const id of ['healthy','bgp_failure','link_failure','multiple_faults']) {
    const original=await fixture(id);
    const result=await runInvestigation({source:'demo',scenarioId:id,demoLoader:async()=>original,now:()=> '2026-01-01T00:00:00Z'});
    assert.deepEqual(result.diagnosis,original.diagnosis);
    assert.equal(result.investigation.operation,'review_recorded_diagnosis');
    original.scenario.id='mutated'; assert.equal(result.scenario.id,id);
  }
});
test('multiple independent faults retain their own evidence and uncertainty',async()=> {
  const data=await fixture('multiple_faults');
  const context=relatedContext(data,{kind:'link',id:'R2-R4'});
  assert.equal(context.causes.length,1); assert.equal(context.evidence.length,5);
  assert.ok(context.evidence.every(item=>item.link==='R2-R4'));
  assert.ok(investigativeSteps(data,context).some(step=>step.includes('independent observations')));
});
test('live conversion keeps provenance and correlates peer observations without raw telemetry',()=> {
  const result=liveInvestigation({...live,token:'do-not-copy'});
  assert.equal(result.token,undefined); assert.equal(result.scenario.mode,'live');
  assert.equal(result.provenance.observed_at,live.observed_at);
  assert.equal(result.telemetry.routers[0].router,'R1');
  assert.equal(relatedContext(result,{kind:'link',id:'R1-R2'}).evidence.length,1);
  assert.equal(result.evidence[0].timestamp,live.observed_at);
});
test('cancelled or changed-session results are not returned',async()=> {
  const controller=new AbortController();controller.abort();
  await assert.rejects(runInvestigation({source:'demo',scenarioId:'healthy',signal:controller.signal,demoLoader:()=>fixture('healthy')}),{name:'AbortError'});
  await assert.rejects(runInvestigation({source:'demo',scenarioId:'healthy',user:{uid:'a'},currentUid:()=> 'b',demoLoader:()=>fixture('healthy')}),/session changed/);
});
test('live requests use supported reader and do not fall back to demo on error',async()=> {
  let called=false;
  await assert.rejects(runInvestigation({source:'live',liveLoader:async()=>{called=true;throw Error('Unavailable');},demoLoader:()=>assert.fail('fallback')}),/Unavailable/);
  assert.equal(called,true);
});
test('no findings yields verification guidance, never a healthy conclusion',async()=> {
  const data=await fixture('healthy');
  assert.ok(investigativeSteps(data,relatedContext(data,null)).some(step=>step.includes('does not establish network health')));
});
