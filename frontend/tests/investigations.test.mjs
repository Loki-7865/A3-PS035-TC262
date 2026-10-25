import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { savedTime, selectInvestigations, snapshotOf, sourceOf } from '../src/utils/investigationList.js';

const records = [
  { id: 'legacy', title: 'Legacy', source: 'demo' },
  { id: 'a', title: 'Alpha', source: 'demo', scenarioId: 'bgp_failure', status: 'saved', createdAt: { seconds: 2 } },
  { id: 'b', title: 'Beta', source: 'live', scenarioId: 'network', status: 'reviewed', createdAt: { seconds: 3 } },
  { id: 'c', title: 'Corrupt', snapshotJson: '{bad', createdAt: { seconds: 1 } },
];
test('legacy and malformed snapshots remain searchable without fabricated provenance', () => {
  assert.equal(snapshotOf(records[0]), null); assert.equal(snapshotOf(records[3]), null);
  assert.equal(sourceOf(records[3]), 'unknown'); assert.equal(savedTime(records[0]), null);
  assert.equal(selectInvestigations(records, { search: 'legacy' })[0].id, 'legacy');
});
test('newest, oldest and alphabetical sorting retain all records and put missing dates last', () => {
  assert.deepEqual(selectInvestigations(records).map(r => r.id), ['b','a','c','legacy']);
  assert.deepEqual(selectInvestigations(records, { sort: 'oldest' }).map(r => r.id), ['c','a','b','legacy']);
  assert.deepEqual(selectInvestigations(records, { sort: 'title' }).map(r => r.id), ['a','b','c','legacy']);
});
test('combined search, source, scenario and status filters', () => {
  assert.equal(selectInvestigations(records, { search: 'BGP FAILURE', source: 'demo', scenario: 'bgp_failure', status: 'saved' }).length, 1);
  assert.equal(selectInvestigations(records, { source: 'live', status: 'saved' }).length, 0);
  assert.equal(selectInvestigations(records, { source: 'unknown' }).length, 1);
});
test('search covers records beyond the visible first ten', () => {
  const many = Array.from({length: 40}, (_, i) => ({ id: String(i), title: `Report ${i}` }));
  assert.equal(selectInvestigations(many, { search: 'Report 39' })[0].id, '39');
});
test('date ranges are inclusive and exclude records with unknown dates', () => {
  const dated = [{ id: 'a', createdAt: '2026-10-26T23:59:59' }, { id: 'b', createdAt: '2026-10-25T00:00:00' }, { id: 'c' }];
  assert.deepEqual(selectInvestigations(dated, { from: '2026-10-26', to: '2026-10-26' }).map(r => r.id), ['a']);
});
test('all four untouched demo fixtures have complete snapshot collections and searchable scenario names', async () => {
  for (const id of ['healthy', 'link_failure', 'bgp_failure', 'multiple_faults']) {
    const snapshot = JSON.parse(await readFile(new URL(`../public/demo/scenarios/${id}.json`, import.meta.url)));
    assert.equal(snapshot.scenario.id, id);
    for (const value of [snapshot.telemetry.routers, snapshot.topology.links, snapshot.diagnosis.findings, snapshot.diagnosis.candidate_root_causes, snapshot.evidence ?? [], snapshot.incidents]) assert.ok(Array.isArray(value));
    assert.equal(selectInvestigations([{ id, snapshotJson: JSON.stringify(snapshot) }], { search: snapshot.scenario.name }).length, 1);
  }
});

const auth = { currentUser: { uid: 'owner' } };
let requested, deleted, failure, saved, documents = [];
mock.module('../src/services/firebase.js', { namedExports: { auth, db: {} } });
mock.module('firebase/firestore', { namedExports: {
  addDoc: async (path, record) => { saved = {path, record}; return {id: 'saved-fixture'}; },
  serverTimestamp: () => 'server-time',
  collection: (_db, ...path) => path, doc: (_db, ...path) => path,
  documentId: () => '__name__', orderBy: (...value) => ({ order: value }),
  limit: value => ({ limit: value }), startAfter: value => ({ cursor: value }),
  query: (path, ...constraints) => ({ path, constraints }),
  getDocs: async q => { requested = q; if (failure) throw failure; return { docs: documents, size: documents.length }; },
  deleteDoc: async path => { if (failure) throw failure; deleted = path; },
} });
const { loadInvestigationBatch, deleteInvestigation, historyError } = await import('../src/services/investigationHistory.js');
test('history reads authenticated owner path with bounded cursor pages and includes missing dates', async () => {
  documents = Array.from({length: 25}, (_, i) => ({ id: String(i), data: () => ({ id: 'untrusted', title: 'Metadata only' }) }));
  const first = await loadInvestigationBatch();
  assert.deepEqual(requested.path, ['users','owner','investigations']);
  assert.ok(requested.constraints.some(c => c.limit === 25));
  assert.deepEqual(requested.constraints[0], { order: ['__name__'] });
  assert.equal(first.records[0].id, '0'); assert.equal(first.hasMore, true);
  documents = [];
  const last = await loadInvestigationBatch(first.cursor);
  assert.equal(requested.constraints[1].cursor, first.cursor); assert.equal(last.hasMore, false);
});
test('delete is owner scoped, validates IDs, requires authentication and preserves failures', async () => {
  await deleteInvestigation('record'); assert.deepEqual(deleted, ['users','owner','investigations','record']);
  await assert.rejects(deleteInvestigation('../another-user'), /Invalid/);
  auth.currentUser = null;
  await assert.rejects(deleteInvestigation('record'), /sign in/); await assert.rejects(loadInvestigationBatch(), /sign in/);
  auth.currentUser = { uid: 'owner' }; failure = { code: 'permission-denied' };
  await assert.rejects(deleteInvestigation('record')); await assert.rejects(loadInvestigationBatch());
  assert.match(historyError(failure), /Access denied/); failure = null;
});

const { saveInvestigation } = await import('../src/services/investigations.js');
test('healthy scenario saves with an empty evidence list while preserving its snapshot', async () => {
  const snapshot = JSON.parse(await readFile(new URL('../public/demo/scenarios/healthy.json', import.meta.url)));
  assert.equal(await saveInvestigation({uid:'owner'}, snapshot), 'saved-fixture');
  assert.deepEqual(saved.path, ['users','owner','investigations']);
  const restored = JSON.parse(saved.record.snapshotJson);
  assert.deepEqual(restored.evidence, []);
  assert.deepEqual(restored.diagnosis, snapshot.diagnosis);
  assert.equal(saved.record.evidenceCount, 0);
});
