export const SCENARIO_IDS = ['healthy', 'link_failure', 'bgp_failure', 'multiple_faults'];
export async function loadDemoScenario(id, { signal, baseUrl = '/', fetcher = fetch } = {}) {
  if (!SCENARIO_IDS.includes(id)) throw new Error('Unknown demo scenario.');
  const response = await fetcher(`${baseUrl}demo/scenarios/${id}.json`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Scenario unavailable: HTTP ${response.status}`);
  const result = await response.json();
  signal?.throwIfAborted();
  if (result?.scenario?.id !== id || !Array.isArray(result?.telemetry?.routers)
      || !Array.isArray(result?.topology?.links) || !Array.isArray(result?.diagnosis?.findings)
      || !Array.isArray(result?.diagnosis?.candidate_root_causes) || !Array.isArray(result?.incidents)
      || (result.evidence !== undefined && !Array.isArray(result.evidence))) {
    throw new Error('Scenario data has an invalid structure.');
  }
  return result;
}
export function investigationContext(snapshot, { link = null, router = null } = {}) {
  const findings = (snapshot?.diagnosis?.findings || []).filter(item => link ? item.link === link : router && item.router?.toUpperCase() === router);
  const links = (snapshot?.topology?.links || []).filter(item => link ? item.id === link : router && item.id.split('-').includes(router));
  const causes = (snapshot?.diagnosis?.candidate_root_causes || []).filter(item => links.some(value => value.id === (item.suspected_link || item.candidate_link)));
  const cited = new Set([...findings, ...causes].flatMap(item => item.evidence_ids || []));
  const evidence = (snapshot?.evidence || []).filter(item => cited.has(item.id) || (link ? item.link === link : router && item.router?.toUpperCase() === router));
  return { findings, links, causes, evidence };
}
export function findingCategory(finding, causes) {
  if (finding.type === 'interface_down') return 'Physical observation';
  const physicalCause = causes.some(cause => cause.type === 'physical_link_failure' && (cause.suspected_link || cause.candidate_link) === finding.link);
  if (finding.type?.startsWith('bgp')) return physicalCause ? 'Possible downstream symptom' : 'Routing observation';
  return 'Recorded observation';
}
