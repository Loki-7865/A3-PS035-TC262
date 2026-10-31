export const textValue = (value, fallback = "") => typeof value === "string" && value.trim() ? value : fallback;
export const titleOf = (record) => textValue(record.title, "Untitled investigation");
export const sourceOf = (record) => ["demo", "live"].includes(record.source) ? record.source : "unknown";
export function savedTime(record) {
  const value = record.createdAt;
  const time = value?.toMillis?.() ?? (typeof value?.seconds === "number" ? value.seconds * 1000 : typeof value === "string" ? Date.parse(value) : NaN);
  return Number.isFinite(time) ? time : null;
}
export function snapshotOf(record) {
  try {
    const value = record.snapshotJson ? JSON.parse(record.snapshotJson) : record.snapshot;
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
export function searchText(record) {
  const snapshot = snapshotOf(record);
  const classifications = [snapshot?.diagnosis?.findings, snapshot?.diagnosis?.candidate_root_causes, snapshot?.incidents]
    .flatMap((items) => Array.isArray(items) ? items : [])
    .flatMap((item) => item && typeof item === "object" ? [item.type, item.fault_type, item.classification, item.category, item.title, item.summary, item.description] : []);
  return [titleOf(record), record.scenarioId, snapshot?.scenario?.name, sourceOf(record), ...classifications]
    .filter((value) => typeof value === "string").join(" ").replaceAll("_", " ").toLowerCase();
}
export function selectInvestigations(records, { search = "", source = "all", scenario = "all", status = "all", sort = "newest", from = "", to = "" } = {}) {
  const needle = search.trim().replaceAll("_", " ").toLowerCase();
  const start = from ? new Date(`${from}T00:00:00`).getTime() : null;
  const end = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
  return records.filter((record) => {
    const time = savedTime(record);
    return (source === "all" || sourceOf(record) === source)
      && (scenario === "all" || textValue(record.scenarioId, "unknown") === scenario)
      && (status === "all" || textValue(record.status, "unknown") === status)
      && (!needle || searchText(record).includes(needle))
      && (start === null || (time !== null && time >= start))
      && (end === null || (time !== null && time <= end));
  }).sort((a, b) => {
    if (sort === "title") return titleOf(a).localeCompare(titleOf(b)) || a.id.localeCompare(b.id);
    const at = savedTime(a), bt = savedTime(b);
    if (at === null || bt === null) return at === bt ? a.id.localeCompare(b.id) : at === null ? 1 : -1;
    return (sort === "oldest" ? at - bt : bt - at) || a.id.localeCompare(b.id);
  });
}
