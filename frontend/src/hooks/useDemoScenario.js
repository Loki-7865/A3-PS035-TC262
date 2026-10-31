import { useEffect, useState } from 'react';
import { loadDemoScenario } from '../services/demoScenarios';

export function useDemoScenario(scenarioId, revision) {
  const key = `${scenarioId}:${revision}`;
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    loadDemoScenario(scenarioId, { signal: controller.signal, baseUrl: import.meta.env.BASE_URL })
      .then(data => { if (!controller.signal.aborted) setResult({ key, data, error: '' }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, data: null, error: error.message }); });
    return () => controller.abort();
  }, [scenarioId, key]);
  // A scenario or reload change invalidates the old snapshot during render, before effects run.
  const current = result?.key === key ? result : null;
  return { data: current?.data || null, error: current?.error || '', loading: !current };
}
