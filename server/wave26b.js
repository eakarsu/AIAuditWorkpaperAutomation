'use strict';
function csvCell(v){ if(v===null||v===undefined) return ''; const s=typeof v==='object'?JSON.stringify(v):String(v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function toCsv(rows, cols){ const c=cols||(rows[0]?Object.keys(rows[0]):[]); if(!c.length) return ''; return [c.join(','), ...rows.map(r=>c.map(k=>csvCell(r[k])).join(','))].join('\n'); }
function providerConfigured(env){ env=env||process.env; return Boolean((env.OPENROUTER_API_KEY&&env.OPENROUTER_API_KEY!=='your_openrouter_api_key_here'&&env.OPENROUTER_API_KEY!=='your_openrouter_key_here')||env.OPENAI_API_KEY); }
const num=v=>{ const n=Number(v); return Number.isFinite(n)?n:0; };
function formatValue(v){ if(v===false) return 'false'; if(v===0) return '0'; if(v===''||v===null||v===undefined) return '(empty)'; if(typeof v==='object') return JSON.stringify(v); return String(v); }

function workpaperStatusSummary(rows){ rows=rows||[]; const by={}; rows.forEach(r=>{by[r.status||'unknown']=(by[r.status||'unknown']||0)+1;});
 return {feature:'workpaper-status-summary',aiGenerated:false,source:'deterministic-fallback',sections:[{label:'Workpapers reviewed',value:rows.length},{label:'By status',value:by},{label:'Draft count',value:by['Draft']||0},{label:'Has workpapers',value:rows.length>0}]}; }
function auditAreaMix(rows){ rows=rows||[]; const by={}; rows.forEach(r=>{by[r.audit_area||'unknown']=(by[r.audit_area||'unknown']||0)+1;});
 return {feature:'audit-area-mix',aiGenerated:false,source:'deterministic-fallback',sections:[{label:'Workpapers reviewed',value:rows.length},{label:'By audit area',value:by},{label:'Distinct audit areas',value:Object.keys(by).length}]}; }
function reviewReadiness(rows){ rows=rows||[]; const unreviewed=rows.filter(r=>!r.reviewed_by).length;
 return {feature:'review-readiness',aiGenerated:false,source:'deterministic-fallback',sections:[{label:'Workpapers reviewed',value:rows.length},{label:'Awaiting reviewer',value:unreviewed},{label:'Reviewed count',value:rows.length-unreviewed},{label:'All reviewed',value:rows.length>0&&unreviewed===0}]}; }
module.exports={toCsv,providerConfigured,formatValue,workpaperStatusSummary,auditAreaMix,reviewReadiness,FEATURES:{'workpaper-status-summary':workpaperStatusSummary,'audit-area-mix':auditAreaMix,'review-readiness':reviewReadiness}};
