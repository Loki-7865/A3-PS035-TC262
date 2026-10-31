import { useEffect, useRef, useState } from 'react';
import { buildReportExport, EXPORT_SECTIONS, reportFilename } from '../utils/reportExport';
import { saveReportNotes } from '../services/reportNotes';
import '../styles/ReportTools.css';

function ReportValue({ value }) {
  if (value === null || value === undefined) return <span>Not recorded</span>;
  if (Array.isArray(value)) return value.length ? <ol>{value.map((item,index)=><li key={index}><ReportValue value={item} /></li>)}</ol> : <span>No records</span>;
  if (typeof value === 'object') return <dl>{Object.entries(value).map(([key,item])=><div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd><ReportValue value={item} /></dd></div>)}</dl>;
  return <span>{String(value)}</span>;
}
export default function ReportTools({ record, uid }) {
  const [savedNotes,setSavedNotes] = useState(typeof record.notes === 'string' ? record.notes : '');
  const [draft,setDraft] = useState(savedNotes);
  const [saving,setSaving] = useState(false);
  const [feedback,setFeedback] = useState('');
  const [selected,setSelected] = useState({});
  const [preview,setPreview] = useState(null);
  const pending=useRef(false), active=useRef(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function save() {
    if(pending.current) return;
    pending.current=true;setSaving(true);setFeedback('');
    const captured=draft;
    try { await saveReportNotes(uid,record.id,captured); if(active.current) {setSavedNotes(captured);setPreview(null);setFeedback('Notes saved.');} }
    catch { if(active.current) setFeedback('Notes could not be saved. Check your access and try again. Your draft is retained.'); }
    finally {pending.current=false;if(active.current)setSaving(false);}
  }
  function download() {
    try {
      const blob=new Blob([JSON.stringify(preview,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob), anchor=document.createElement('a');
      anchor.href=url;anchor.download=reportFilename(record);anchor.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setFeedback('JSON download requested.');
    } catch {setFeedback('Download could not start. Please try again.');}
  }
  return <>
    <section className="report-tools" aria-label="Report tools">
      <h2>Operator notes</h2><p>Notes are separate from the captured evidence. Avoid credentials or private configuration. Saving replaces this report’s notes.</p>
      <label htmlFor="report-notes">Notes (up to 10,000 characters)</label><textarea id="report-notes" maxLength={10000} rows={5} value={draft} onChange={event=>setDraft(event.target.value)} />
      <button disabled={saving || draft===savedNotes} onClick={save}>{saving?'Saving notes…':'Save notes'}</button>
      {draft!==savedNotes && <p>Unsaved draft. Exports use saved notes only.</p>}
      <h2>Export report</h2><p>Choose what to include, then review the preview. Network identifiers and free-text evidence may be sensitive. Raw telemetry, configuration and authentication fields are excluded; review selected text before sharing.</p>
      <fieldset><legend>Include in export (metadata is always included)</legend>{EXPORT_SECTIONS.map(key=><label key={key}><input type="checkbox" checked={!!selected[key]} onChange={event=>{setSelected(previous=>({...previous,[key]:event.target.checked}));setPreview(null);}} />{key === 'diagnosis' ? 'Findings and suspected causes' : key === 'notes' ? 'Saved operator notes' : key}</label>)}</fieldset>
      <button onClick={()=>setPreview(buildReportExport({...record,notes:savedNotes},selected))}>Prepare export preview</button>
      {preview && <div className="report-export-actions"><button onClick={download}>Download JSON</button><button onClick={()=>window.print()}>Print / Save as PDF</button><p>Choose “Save as PDF” in your browser’s print dialog. Only the prepared report below is printed.</p></div>}
      {feedback && <p role="status">{feedback}</p>}
    </section>
    {preview && <section className="report-export-preview" aria-label="Export preview"><h2>NETSCOPE investigation report</h2><ReportValue value={preview} /></section>}
    {!preview && <p className="report-print-empty">Prepare an export preview to print this report.</p>}
  </>;
}
