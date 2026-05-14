# Intel Inbox — Bookmarklet

Permet à un contributeur de confiance d'envoyer une URL, du texte sélectionné et une note à `feedback@brusselsgovernance.be` depuis n'importe quelle page web, en un clic.

---

## Architecture

```
Bookmarklet (navigateur)
  → POST /api/intel-inbox
      Authorization: Bearer INBOX_SECRET
      { url, title, selectedText, note, contributor }
  → Resend → feedback@brusselsgovernance.be
```

Le token `INBOX_SECRET` est **personnel et rotatif**. Chaque contributeur reçoit un bookmarklet généré avec son prénom et un secret dédié (ou le secret global pour commencer).

---

## Readable source (JS avant minification)

```js
(function () {
  // Évite le double-montage
  if (document.getElementById('__intel-inbox-panel')) return;

  const ENDPOINT = 'https://governance.brussels/api/intel-inbox';
  const TOKEN    = '__TOKEN__';
  const NAME     = '__NAME__';

  // --- Panel UI ---
  const overlay = document.createElement('div');
  overlay.id = '__intel-inbox-panel';
  overlay.style.cssText = [
    'position:fixed', 'top:20px', 'right:20px', 'z-index:2147483647',
    'background:#1e293b', 'color:#f1f5f9', 'border-radius:12px',
    'padding:16px 20px', 'width:340px', 'font:14px/1.5 system-ui,sans-serif',
    'box-shadow:0 8px 32px rgba(0,0,0,.5)', 'border:1px solid #334155',
  ].join(';');

  const sel = window.getSelection?.()?.toString?.()?.trim() ?? '';
  const pageTitle = document.title.slice(0, 200);

  overlay.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <strong style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em">
        📥 BGM Intel
      </strong>
      <button id="__intel-close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px;line-height:1;padding:0">✕</button>
    </div>
    <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;word-break:break-all">
      ${pageTitle || location.href}
    </div>
    <input id="__intel-name" value="${NAME}"
      style="width:100%;box-sizing:border-box;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;padding:6px 10px;font-size:13px;margin-bottom:8px"
      placeholder="Votre prénom">
    <textarea id="__intel-note" rows="3"
      style="width:100%;box-sizing:border-box;background:#0f172a;color:#f1f5f9;border:1px solid #334155;border-radius:6px;padding:6px 10px;font-size:13px;resize:vertical;margin-bottom:12px"
      placeholder="Note (optionnelle)…"></textarea>
    ${sel ? `<div style="font-size:11px;color:#64748b;margin-bottom:12px;max-height:60px;overflow:auto;border-left:2px solid #334155;padding-left:8px">${sel.slice(0, 200)}${sel.length > 200 ? '…' : ''}</div>` : ''}
    <div style="display:flex;gap:8px">
      <button id="__intel-send"
        style="flex:1;background:#2563eb;color:#fff;border:none;border-radius:6px;padding:8px;cursor:pointer;font-size:13px;font-weight:600">
        Envoyer
      </button>
      <button id="__intel-cancel"
        style="background:#334155;color:#cbd5e1;border:none;border-radius:6px;padding:8px 12px;cursor:pointer;font-size:13px">
        ✕
      </button>
    </div>
    <div id="__intel-status" style="margin-top:8px;font-size:12px;text-align:center;min-height:18px"></div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('__intel-close').onclick   = close;
  document.getElementById('__intel-cancel').onclick  = close;

  document.getElementById('__intel-send').onclick = async function () {
    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Envoi…';

    const contributor = document.getElementById('__intel-name').value.trim() || NAME;
    const note        = document.getElementById('__intel-note').value.trim();
    const status      = document.getElementById('__intel-status');

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + TOKEN },
        body: JSON.stringify({
          url:          location.href,
          title:        document.title.slice(0, 500),
          selectedText: sel.slice(0, 5000) || undefined,
          note:         note || undefined,
          contributor,
        }),
      });

      if (res.ok) {
        status.style.color = '#4ade80';
        status.textContent = '✅ Envoyé !';
        setTimeout(close, 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        status.style.color = '#f87171';
        status.textContent = data.error ?? `Erreur ${res.status}`;
        btn.disabled = false;
        btn.textContent = 'Réessayer';
      }
    } catch (err) {
      status.style.color = '#f87171';
      status.textContent = String(err);
      btn.disabled = false;
      btn.textContent = 'Réessayer';
    }
  };
})();
```

---

## Script de génération

Le script minifie le code, remplace `__TOKEN__` et `__NAME__`, et affiche le bookmarklet prêt à coller dans le navigateur.

```bash
node scripts/gen-bookmarklet.mjs Marie
```

Sortie :

```
=== Bookmarklet pour Marie ===

javascript:(function(){...})();

Copie ce code → colle-le comme URL d'un favori dans ton navigateur.
```

---

## Rotation du token

Si un contributeur perd son bookmarklet ou si le token est compromis :

1. Régénérer `INBOX_SECRET` : `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
2. Mettre à jour dans Vercel (dashboard → Settings → Environment Variables → Production)
3. Redéployer (ou `git commit --allow-empty -m "chore: rotate INBOX_SECRET"` + push)
4. Régénérer le bookmarklet de chaque contributeur avec `node scripts/gen-bookmarklet.mjs <Prénom>`
5. Distribuer les nouveaux bookmarklets

---

## E2E smoke test (production)

Voir section ci-dessous.
