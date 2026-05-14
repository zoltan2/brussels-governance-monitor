#!/usr/bin/env node
/**
 * Generates a personal intel-inbox bookmarklet.
 * Usage: node scripts/gen-bookmarklet.mjs <Prénom>
 *
 * Reads INBOX_SECRET from .env.local (or INBOX_SECRET env var).
 * Outputs the bookmarklet URL to paste as a browser bookmark.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --- Load INBOX_SECRET ---
function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(root, '.env.local'), 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^INBOX_SECRET=(.+)$/);
      if (m) return m[1].trim();
    }
  } catch {
    // file not found
  }
  return null;
}

const token = process.env.INBOX_SECRET ?? loadEnvLocal();
if (!token) {
  console.error('Error: INBOX_SECRET not found in .env.local or environment.');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(24).toString(\'hex\'))"');
  process.exit(1);
}

const name = process.argv[2] ?? 'Anonyme';

// --- Readable source template ---
const source = `(function(){
if(document.getElementById('__intel-inbox-panel'))return;
var ENDPOINT='https://governance.brussels/api/intel-inbox';
var TOKEN='${token}';
var NAME='${name}';
var sel=(window.getSelection&&window.getSelection().toString().trim())||'';
var o=document.createElement('div');
o.id='__intel-inbox-panel';
o.style.cssText='position:fixed;top:20px;right:20px;z-index:2147483647;background:#1e293b;color:#f1f5f9;border-radius:12px;padding:16px 20px;width:340px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.5);border:1px solid #334155';
var pt=document.title.slice(0,200);
o.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><strong style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em">📥 BGM Intel</strong><button id="__intel-close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;line-height:1;padding:0">✕</button></div><div style="font-size:12px;color:#94a3b8;margin-bottom:8px;word-break:break-all">'+pt+'</div><input id="__intel-name" value="'+NAME+'" style="width:100%;box-sizing:border-box;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;padding:6px 10px;font-size:13px;margin-bottom:8px" placeholder="Votre prénom"><textarea id="__intel-note" rows="3" style="width:100%;box-sizing:border-box;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;padding:6px 10px;font-size:13px;resize:vertical;margin-bottom:12px" placeholder="Note (optionnelle)…"></textarea>'+(sel?'<div style="font-size:11px;color:#64748b;margin-bottom:12px;max-height:60px;overflow:auto;border-left:2px solid #334155;padding-left:8px">'+sel.slice(0,200)+(sel.length>200?'…':'')+'</div>':'')+'<div style="display:flex;gap:8px"><button id="__intel-send" style="flex:1;background:#2563eb;color:#fff;border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:13px;font-weight:600">Envoyer</button><button id="__intel-cancel" style="background:#334155;color:#cbd5e1;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;font-size:13px">✕</button></div><div id="__intel-status" style="margin-top:8px;font-size:12px;text-align:center;min-height:18px"></div>';
document.body.appendChild(o);
var close=function(){o.remove();};
document.getElementById('__intel-close').onclick=close;
document.getElementById('__intel-cancel').onclick=close;
document.getElementById('__intel-send').onclick=async function(){
var btn=this;btn.disabled=true;btn.textContent='Envoi…';
var contributor=document.getElementById('__intel-name').value.trim()||NAME;
var note=document.getElementById('__intel-note').value.trim();
var status=document.getElementById('__intel-status');
try{
var res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN},body:JSON.stringify({url:location.href,title:document.title.slice(0,500),selectedText:sel.slice(0,5000)||undefined,note:note||undefined,contributor:contributor})});
if(res.ok){status.style.color='#4ade80';status.textContent='✅ Envoyé !';setTimeout(close,1500);}
else{var d=await res.json().catch(function(){return{};});status.style.color='#f87171';status.textContent=d.error||('Erreur '+res.status);btn.disabled=false;btn.textContent='Réessayer';}
}catch(err){status.style.color='#f87171';status.textContent=String(err);btn.disabled=false;btn.textContent='Réessayer';}
};
})();`;

const bookmarklet = 'javascript:' + encodeURIComponent(source);

console.log(`\n=== Bookmarklet pour ${name} ===\n`);
console.log(bookmarklet);
console.log('\nCopie ce code → colle-le comme URL d\'un favori dans ton navigateur.\n');
