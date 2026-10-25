// Isolated, loopback-only UI fixture. No Firebase modules or production data are loaded.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root, configFile: false, plugins: [{
    name: 'isolated-investigations-fixture', enforce: 'pre',
    resolveId(id) { if (id === '/fixture.jsx') return '\0fixture.jsx'; },
    load(id) {
      if (id === '\0fixture.jsx') return `import React from 'react'; import { createRoot } from 'react-dom/client'; import { BrowserRouter } from 'react-router'; import Investigations from '/src/pages/Investigations.jsx'; import '/src/index.css'; createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(Investigations)));`;
      if (id.endsWith('/contexts/authState.js')) return `export const useAuth = () => ({currentUser:{uid:'synthetic-test-owner'}});`;
      if (id.endsWith('/services/investigationHistory.js')) return `
        const params = new URLSearchParams(location.search);
        const all = Array.from({length: params.has('empty') ? 0 : 31}, (_,i) => ({id:String(i),title:i===0?'Legacy metadata':i===30?'Final searchable report':'Investigation '+String(i).padStart(2,'0'),source:'demo',scenarioId:i%2?'bgp_failure':'link_failure',status:'saved',...(i===0?{}:{createdAt:{seconds:1793000000+i*100},findingsCount:i%5,rootCausesCount:i%3,evidenceCount:11,incidentsCount:2,snapshotJson:'{}'})}));
        let loadAttempts=0;
        export async function loadInvestigationBatch(cursor=0) { await new Promise(resolve=>setTimeout(resolve,300)); if(params.has('load-error') && !loadAttempts++) throw Error('Fixture load error'); return {records:all.slice(cursor,cursor+25),cursor:cursor+25,hasMore:cursor+25<all.length}; }
        export async function deleteInvestigation(id) { await new Promise(resolve=>setTimeout(resolve,400)); if(params.has('delete-error')) throw Error('Fixture permission denied'); const index=all.findIndex(r=>r.id===id); if(index>=0) all.splice(index,1); }
        export const historyError = () => 'Fixture: access denied. Please try again.';
      `;
    },
    configureServer(server) { server.middlewares.use(async (req,res,next) => { if (req.url.split('?')[0] !== '/') return next(); res.setHeader('Content-Type','text/html'); res.end(await server.transformIndexHtml(req.url, '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/fixture.jsx"></script></body></html>')); }); },
  }, react()], server:{host:'127.0.0.1',port:5180,strictPort:true},
});
await server.listen(); server.printUrls();
