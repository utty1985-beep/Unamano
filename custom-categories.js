(function(){
const CUSTOM='__unamano_custom_category__';
const SEASONAL='Lavori stagionali / campagna';
const BABYSITTER='Babysitter';
const q=id=>document.getElementById(id);

function safeText(v){return String(v||'').trim().replace(/\s+/g,' ')}
function ensureBaseCategories(){
  try{
    if(typeof CATS==='undefined'||!Array.isArray(CATS))return;
    const insertBeforeAlt=(item)=>{const i=CATS.findIndex(x=>x[1]==='Altro');CATS.splice(i>=0?i:CATS.length,0,item)};
    if(!CATS.some(x=>x[1]===BABYSITTER))insertBeforeAlt(['👶',BABYSITTER]);
    if(!CATS.some(x=>x[1]===SEASONAL))insertBeforeAlt(['🌾',SEASONAL]);
  }catch(e){}
}
function ensureSelectOption(sel,value,label=value,beforeCustom=false){
  if(!sel||[...sel.options].some(o=>o.value===value))return;
  const o=document.createElement('option');o.value=value;o.textContent=label;
  const custom=[...sel.options].find(x=>x.value===CUSTOM);
  if(beforeCustom&&custom)sel.insertBefore(o,custom);else sel.appendChild(o);
}
function toggleCustom(){
  const wrap=q('umCustomCategoryWrap'),sel=q('newcat');
  if(!wrap||!sel)return;
  wrap.classList.toggle('hidden',sel.value!==CUSTOM);
  if(sel.value===CUSTOM)setTimeout(()=>q('umCustomCategory')?.focus(),0);
}
function ensurePublisherUi(){
  ensureBaseCategories();
  const sel=q('newcat');if(!sel)return;
  ensureSelectOption(sel,BABYSITTER,'👶 '+BABYSITTER,true);
  ensureSelectOption(sel,SEASONAL,'🌾 '+SEASONAL,true);
  ensureSelectOption(sel,CUSTOM,'➕ Crea una nuova categoria');
  if(!q('umCustomCategoryWrap')){
    const wrap=document.createElement('div');
    wrap.id='umCustomCategoryWrap';wrap.className='hidden';
    wrap.innerHTML='<label for="umCustomCategory">Nome nuova categoria</label><input id="umCustomCategory" maxlength="60" placeholder="Es. Vendemmia, raccolta olive, traslochi"><div class="small">Se la categoria non esiste, puoi crearla tu. Sarà poi visibile anche nei filtri della bacheca.</div>';
    sel.parentElement?.insertAdjacentElement('afterend',wrap);
  }
  if(!sel.dataset.umCustomBound){sel.dataset.umCustomBound='1';sel.addEventListener('change',toggleCustom)}
  toggleCustom();
}
function allKnownCategories(){
  const m=new Map();
  try{if(typeof CATS!=='undefined')CATS.forEach(x=>m.set(x[1],x[0]||'🧩'))}catch(e){}
  try{if(typeof jobs!=='undefined')jobs.forEach(j=>{const c=safeText(j.category);if(c&&!m.has(c))m.set(c,'🧩')})}catch(e){}
  m.set(BABYSITTER,'👶');
  m.set(SEASONAL,'🌾');
  return [...m.entries()];
}
function cityMatches(j,city){return !city||(j.city||'').toLowerCase().includes(city)}
function syncGallery(){
  const strip=q('categoryStrip');if(!strip)return;
  const cats=allKnownCategories();
  const city=(q('cityFilter')?.value||'').trim().toLowerCase();
  let open=[];try{open=(typeof jobs!=='undefined'?jobs:[]).filter(j=>j.status==='open'&&cityMatches(j,city))}catch(e){}
  const selected=q('cat')?.value||'';
  strip.classList.add('um-category-gallery');
  strip.innerHTML='';
  const items=[['','🔎','Tutto'],...cats.map(([name,icon])=>[name,icon,name])];
  items.forEach(([value,icon,label])=>{
    const count=value?open.filter(j=>j.category===value).length:open.length;
    const b=document.createElement('button');
    b.type='button';b.className='um-category-tile'+(selected===value?' active':'');b.dataset.cat=value;
    b.innerHTML=`<span class="um-category-icon">${icon}</span><span class="um-category-label">${label}</span><span class="um-category-count">${count}</span>`;
    b.addEventListener('click',()=>{if(typeof pickCat==='function')pickCat(value);setTimeout(syncGallery,0)});
    strip.appendChild(b);
  });
}
function syncFilters(){
  ensureBaseCategories();
  const cats=allKnownCategories();
  const filter=q('cat');
  if(filter)cats.forEach(([name,icon])=>ensureSelectOption(filter,name,icon+' '+name));
  syncGallery();
}
function patchCreate(){
  if(window.__umCustomCategoryPatched||typeof window.createJob!=='function')return false;
  window.__umCustomCategoryPatched=1;
  const old=window.createJob;
  window.createJob=async function(){
    const sel=q('newcat');
    if(sel?.value===CUSTOM){
      const value=safeText(q('umCustomCategory')?.value);
      if(value.length<3){if(typeof toast==='function')toast('Scrivi il nome della nuova categoria.','warn');return}
      if(value.length>60){if(typeof toast==='function')toast('Il nome della categoria è troppo lungo.','warn');return}
      ensureSelectOption(sel,value,value,true);sel.value=value;
      try{if(typeof CATS!=='undefined'&&!CATS.some(x=>x[1]===value))CATS.push(['🧩',value])}catch(e){}
    }
    const r=await old.apply(this,arguments);
    setTimeout(()=>{ensurePublisherUi();syncFilters()},80);
    return r;
  };
  return true;
}
function patchLoadJobs(){
  if(window.__umCategoryLoadPatched||typeof window.loadJobs!=='function')return false;
  window.__umCategoryLoadPatched=1;
  const old=window.loadJobs;
  window.loadJobs=async function(){const r=await old.apply(this,arguments);setTimeout(syncFilters,0);return r};
  return true;
}
function bindCity(){
  const city=q('cityFilter');
  if(city&&!city.dataset.umGalleryBound){city.dataset.umGalleryBound='1';city.addEventListener('input',()=>setTimeout(syncGallery,0))}
  const cat=q('cat');
  if(cat&&!cat.dataset.umGalleryBound){cat.dataset.umGalleryBound='1';cat.addEventListener('change',()=>setTimeout(syncGallery,0))}
}
function boot(){
  ensurePublisherUi();syncFilters();patchCreate();patchLoadJobs();bindCity();
  let n=0;const t=setInterval(()=>{n++;ensurePublisherUi();syncFilters();patchCreate();patchLoadJobs();bindCity();if((window.__umCustomCategoryPatched&&window.__umCategoryLoadPatched&&n>12)||n>60)clearInterval(t)},250);
}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();
