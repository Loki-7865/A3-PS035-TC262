import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
const auth = { currentUser: { uid: 'owner' } };
let reads = [], subscription, failure = false, stopCount = 0, changeSession = false;
mock.module('../src/services/firebase.js', { namedExports: { auth, db: {} } });
mock.module('firebase/firestore', { namedExports: {
  collection: (_db,...path) => ({path}), query: (reference,...constraints) => ({...reference,constraints}),
  where: (...values) => ({where:values}), orderBy: (...values) => ({order:values}), limit: value => ({limit:value}),
  getCountFromServer: async reference => {
    reads.push(reference);
    if (failure) throw Object.assign(new Error('denied'),{code:'permission-denied'});
    if (changeSession) auth.currentUser = { uid: 'different-owner' };
    return {data:()=>({count: reference.constraints ? reference.constraints[0].where[2] === 'demo' ? 24 : 3 : 31})};
  },
  onSnapshot: (reference,options,success,error) => { subscription={reference,options,success,error}; return ()=>{stopCount++;}; },
} });
const { loadWorkspaceCounts, subscribeRecentInvestigations } = await import('../src/services/dashboard.js');
test('aggregate counts are owner scoped, include undated/unclassified records and do not load documents', async () => {
  reads=[]; const result=await loadWorkspaceCounts();
  assert.equal(result.total,31); assert.equal(result.demo,24); assert.equal(result.live,3);
  assert.ok(result.checkedAt instanceof Date); assert.equal(reads.length,3);
  reads.forEach(value=>assert.deepEqual(value.path,['users','owner','investigations']));
  assert.equal(reads[0].constraints,undefined);
});
test('recent listener limits reads to five newest dated reports, forwards cache status and cleans up', () => {
  let latest; const stop=subscribeRecentInvestigations(result=>{latest=result;},()=>{});
  assert.deepEqual(subscription.reference.constraints,[{order:['createdAt','desc']},{limit:5}]);
  assert.equal(subscription.options.includeMetadataChanges,true);
  subscription.success({docs:[{id:'real-id',data:()=>({id:'forged-id',title:'Report'})}],metadata:{fromCache:true}});
  assert.equal(latest.records[0].id,'real-id'); assert.equal(latest.cached,true);
  stop(); assert.equal(stopCount,1);
});
test('denied counts and listener errors are surfaced, not converted to zero', async () => {
  failure=true; await assert.rejects(loadWorkspaceCounts(),{code:'permission-denied'}); failure=false;
  let error; subscribeRecentInvestigations(()=>{},value=>{error=value;});
  subscription.error({code:'permission-denied'}); assert.equal(error.code,'permission-denied');
});
test('signed-out access and results after an account change are rejected or ignored', async () => {
  auth.currentUser=null;
  await assert.rejects(loadWorkspaceCounts(),/sign in/);
  assert.throws(()=>subscribeRecentInvestigations(()=>{},()=>{}),/sign in/);
  auth.currentUser={uid:'owner'}; let emitted=false;
  subscribeRecentInvestigations(()=>{emitted=true;},()=>{emitted=true;});
  changeSession=true; await assert.rejects(loadWorkspaceCounts(),/session changed/); changeSession=false;
  subscription.success({docs:[],metadata:{fromCache:false}}); subscription.error(new Error('old request'));
  assert.equal(emitted,false); auth.currentUser={uid:'owner'};
});
