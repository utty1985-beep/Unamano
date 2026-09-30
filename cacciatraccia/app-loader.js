const parts = ["app.part01.txt", "app.part02.txt", "app.part03.txt", "app.part04.txt", "app.part05.txt", "app.part06.txt", "app.part07.txt", "app.part08.txt"];
const base = new URL('./parts/', location.href);

function showBootError(message) {
  console.error('CacciaTraccia boot error:', message);
  let box = document.getElementById('bootError');
  if (!box) {
    box = document.createElement('div');
    box.id = 'bootError';
    box.style.cssText = 'position:fixed;left:12px;right:12px;top:86px;z-index:99999;background:#fff1f0;color:#8b1e16;border:2px solid #c73a30;border-radius:14px;padding:14px;font:600 14px/1.4 system-ui;box-shadow:0 6px 28px #0002';
    document.body.appendChild(box);
  }
  box.textContent = 'Errore avvio CacciaTraccia: ' + message;
}

try {
  const texts = await Promise.all(parts.map(async name => {
    const url = new URL(name, base);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(`Impossibile caricare ${name}: ${r.status}`);
    return r.text();
  }));

  let src = texts.join('');
  src = src.replace(/^\s*import\s+\*\s+as\s+maplibregl\s+from\s+['"][^'"]+['"];?\s*/, '');

  if (!window.maplibregl) throw new Error('Libreria mappa non caricata. Controlla la connessione e ricarica.');

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = `${src}\n//# sourceURL=cacciatraccia-app.js`;
  document.body.appendChild(script);
} catch (err) {
  showBootError(err?.message || String(err));
}
