/* Main-frame-only native message port; ordinary browsers keep their background protections. */
(function(){
 'use strict';
 let port=null,wanted=false,sharing=true,audio=false;
 const send=data=>{if(port)try{port.postMessage(JSON.stringify(data));}catch{}};
 const native=window.__PFC_NATIVE_TEAM__={available:false,active:false,
   start(){wanted=true;send({command:'sharing',enabled:sharing});send({command:'audio',enabled:audio});send({command:'start'});},
   stop(){wanted=false;send({command:'stop'});},
   setSharing(enabled){sharing=!!enabled;send({command:'sharing',enabled:sharing});},
   setAudio(enabled){audio=!!enabled;send({command:'audio',enabled:audio});}
 };
 window.addEventListener('message',e=>{
   if(!['', 'null',location.origin].includes(e.origin)||e.source!=null||e.data!=='pfc-native-team-v1'||e.ports?.length!==1)return;
   if(port)port.close();port=e.ports[0];native.available=true;
   port.onmessage=event=>{try{
     const m=JSON.parse(event.data);
     if(m.event==='state'){
       native.active=!!m.active;
       window.dispatchEvent(new CustomEvent('pfc:native-state',{detail:{active:native.active}}));
     }else if(m.event==='position'&&native.active&&wanted&&sharing&&Number.isFinite(m.lat)&&Math.abs(m.lat)<=90&&Number.isFinite(m.lng)&&Math.abs(m.lng)<=180&&Number.isFinite(m.at)&&Math.abs(Date.now()-m.at)<30000){
       window.dispatchEvent(new CustomEvent('pfc:native-position',{detail:m}));
     }else if(m.event==='stop'){
       wanted=false;window.dispatchEvent(new Event('pfc:native-stop'));
     }else if(m.event==='error'&&typeof m.message==='string')window.dispatchEvent(new CustomEvent('pfc:native-error',{detail:{message:m.message}}));
   }catch{}};
   port.start();
   if(wanted)native.start();
 });
})();
