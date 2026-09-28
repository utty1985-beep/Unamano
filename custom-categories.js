(function(){
const CUSTOM='__unamano_custom_category__';
const SEASONAL='Lavori stagionali / campagna';
const q=id=>document.getElementById(id);

function safeText(v){return String(v||'').trim().replace(/\s+/g,' ')}
function ensureBaseCategory(){
  try{
    if(typeof CATS!=='undefined'&&Array.isArray(CATS)&&!CATS.some(x=>x[1]===SEASONAL)){
      const alt=CATS.findIndex(x=>x[1]==='Altro');
      CATS.splice(alt>=0?alt:CATS.length,0,['🌾',SEASONAL]);
    }
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
  ensureBaseCategory();
  const sel=q('newcat');if(!sel)return;
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
  try{if(typeof CATS!=='undefined')CATS.forEach(x=>m.set(x[1],x[0]||'✨'))}catch(e){}
  try{if(typeof jobs!=='undefined')jobs.forEach(j=>{const c=safeText(j.category);if(c&&!m.has(c))m.set(c,'✨')})}catch(e){}
  m.set(SEASONAL,'🌾');
  return [...m.entries()];
}
function syncFilters(){
  ensureBaseCategory();
  const cats=allKnownCategories();
  const filter=q('cat');
  if(filter)cats.forEach(([name,icon])=>ensureSelectOption(filter,name,icon+' '+name));
  const strip=q('categoryStrip');
  if(strip){
    cats.forEach(([name,icon])=>{
      if([...strip.querySelectorAll('[data-cat]')].some(el=>el.dataset.cat===name))return;
      const chip=document.createElement('span');chip.className='chip click';chip.dataset.cat=name;chip.textContent=icon+' '+name;
      chip.addEventListener('click',()=>{if(typeof pickCat==='function')pickCat(name)});
      strip.appendChild(chip);
    });
  }
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
      try{if(typeof CATS!=='undefined'&&!CATS.some(x=>x[1]===value))CATS.push(['✨',value])}catch(e){}
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
function boot(){
  ensurePublisherUi();syncFilters();patchCreate();patchLoadJobs();
  let n=0;const t=setInterval(()=>{n++;ensurePublisherUi();syncFilters();patchCreate();patchLoadJobs();if((window.__umCustomCategoryPatched&&window.__umCategoryLoadPatched&&n>12)||n>60)clearInterval(t)},250);
}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();
