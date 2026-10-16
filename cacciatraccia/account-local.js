/* Local data belong to the last verified account. Never save passwords in backups. */
(()=>{'use strict';
const KEYS=['cacciatraccia-direct-v5','cacciatraccia-direct-v5-snapshots','cacciatraccia-active-track-v1','pfc-v661-settings','cacciatraccia-hunt-day-v1','pfc-alert-settings-v1','cacciatraccia-weather-v2','cacciatraccia-offline-area-last'];
const OWNER='pfc-local-owner-v1',PROFILE='pfc-offline-profile-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function capture(){return Object.fromEntries(KEYS.map(k=>[k,localStorage.getItem(k)]));}
function apply(values){for(const k of KEYS){if(values[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,values[k]);}}
function selectAccount(user){
 if(!user?.id)throw Error('Account non valido');const old=localStorage.getItem(OWNER);
 if(old&&old!==user.id){
  const before=capture(),target=read('pfc-local-account:'+user.id)||{};
  // Write the old account first. If space is insufficient, keep its active data intact.
  localStorage.setItem('pfc-local-account:'+old,JSON.stringify(before));
  try{apply(target);localStorage.setItem(OWNER,user.id)}catch(e){apply(before);throw Error('Memoria insufficiente per cambiare account. Esporta prima un backup locale.');}
 }else localStorage.setItem(OWNER,user.id);
}
window.PFC_LOCAL={keys:KEYS,selectAccount,
 remember(user){localStorage.setItem(PROFILE,JSON.stringify({id:user.id,email:user.email||'',verifiedAt:new Date().toISOString()}))},
 profile(){const p=read(PROFILE);return p?.id&&p.id===localStorage.getItem(OWNER)?p:null},
 forget(){localStorage.removeItem(PROFILE)},
 settings(){return Object.fromEntries(KEYS.slice(3).map(k=>[k,localStorage.getItem(k)]))}
};
})();
