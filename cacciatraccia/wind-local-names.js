/* Display-only local labels. Bearings and saved standard names remain the reference. */
(()=>{
 const names=['Tramontana','Grecale','Levante','Scirocco','Ostro','Libeccio','Ponente','Maestrale'];
 const labels={'Tramontana':'Voria (Tramontana · N)','Grecale':'Voria (Grecale · NE)','Ostro':'Favugna (Ostro · S)','Libeccio':'Favugna (Libeccio · SO)'};
 function canonical(value){const text=String(value||'').trim();return names.find(n=>text===n||text.includes('('+n)||text.startsWith(n+' ('))||text;}
 const api={name:value=>{const n=canonical(value);return labels[n]||n;},canonical,fromDegrees:degrees=>api.name(names[Math.round((((degrees%360)+360)%360)/45)%8])};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof window!=='undefined')window.PFC_WIND_LABELS=api;
})();
