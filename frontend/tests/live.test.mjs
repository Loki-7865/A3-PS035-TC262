import test from 'node:test';
import assert from 'node:assert/strict';
import {liveEndpoint, validateLiveSnapshot, freshness, fetchLiveSnapshot} from '../src/services/liveApi.js';
const snapshot = {schema_version:1,source:'live',provenance:'backend_recorded_snapshot',routers:[],topology:{links:[]},diagnosis:{findings:[],candidate_root_causes:[]},evidence:[],incidents:[],incidents_total:0};
const user = {uid:'test',getIdToken:async()=> 'synthetic'};
test('API URLs require TLS except loopback and reject credentials', () => {
  assert.equal(liveEndpoint('/api','https://ui.example'), 'https://ui.example/api/live/snapshot');
  assert.equal(liveEndpoint(''),null);
  for(const base of ['http://public.example/api','https://user:pass@api.example','//evil.example','https://api.example?x=1','ftp://localhost']) assert.throws(()=>liveEndpoint(base));
});
test('snapshot validation rejects malformed nested render values',()=> {
  assert.equal(validateLiveSnapshot(snapshot),snapshot);
  assert.throws(()=>validateLiveSnapshot({...snapshot,routers:[{id:{}}]}));
  assert.throws(()=>validateLiveSnapshot({...snapshot,diagnosis:{...snapshot.diagnosis,impact_analysis:{limitations:{}}}}));
});
test('freshness never labels missing, future, or stale records recent',()=> {
  assert.equal(freshness({freshness:'unknown',observed_at:'1970-01-01T00:00:00Z'},1000),'Unknown observation time');
  assert.equal(freshness({},1000),'Unknown observation time');
  assert.equal(freshness({observed_at:'2020-01-01'},1000),'Unknown observation time');
  assert.equal(freshness({freshness:'stale'},1000),'Stale telemetry');
  assert.equal(freshness({observed_at:'1970-01-01T00:00:00Z'},200000),'Stale telemetry');
});
test('fetch sends bearer only with redirects disabled and no cookies/cache',async()=> {
  await fetchLiveSnapshot({endpoint:'https://api.example',user,fetcher:async(url,options)=> {
    assert.equal(options.headers.Authorization,'Bearer synthetic'); assert.equal(options.redirect,'error'); assert.equal(options.credentials,'omit'); assert.equal(options.cache,'no-store');
    return {ok:true,json:async()=>snapshot};
  }});
});
test('API failures retain safe status without exposing response text',async()=> {
  for(const status of [401,403,404,503,500]) await assert.rejects(fetchLiveSnapshot({endpoint:'https://api.example',user,fetcher:async()=>({ok:false,status})}), error=>error.status===status);
});
test('timeout covers token retrieval and does not issue fetch',async()=> {
  await assert.rejects(fetchLiveSnapshot({endpoint:'https://api.example',user:{uid:'test',getIdToken:()=>new Promise(()=>{})},timeoutMs:5,fetcher:()=>assert.fail('fetch called')}),/timed out/);
});
test('session change prevents token submission',async()=> {
  await assert.rejects(fetchLiveSnapshot({endpoint:'https://api.example',user,currentUid:()=> 'other',fetcher:()=>assert.fail('fetch called')}),/session changed/);
});
test('aborted requests do not submit tokens',async()=> {
  const controller=new AbortController(); controller.abort();
  await assert.rejects(fetchLiveSnapshot({endpoint:'https://api.example',user,signal:controller.signal,fetcher:()=>assert.fail('fetch called')}),{name:'AbortError'});
});
