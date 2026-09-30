const parts = ["app.part01.txt", "app.part02.txt", "app.part03.txt", "app.part04.txt", "app.part05.txt", "app.part06.txt", "app.part07.txt", "app.part08.txt"];
const base = new URL('./parts/', import.meta.url);
const texts = await Promise.all(parts.map(async name => {
  const r = await fetch(new URL(name, base));
  if (!r.ok) throw new Error(`Impossibile caricare ${name}: ${r.status}`);
  return r.text();
}));
const src = texts.join('');
const blob = new Blob([src], {type:'text/javascript'});
const url = URL.createObjectURL(blob);
try { await import(url); } finally { setTimeout(()=>URL.revokeObjectURL(url), 30000); }
