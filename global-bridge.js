(function(){
  function sync(){
    try{if(typeof session!=='undefined')window.session=session}catch(e){}
    try{if(typeof sb!=='undefined')window.sb=sb}catch(e){}
  }
  sync();
  let n=0;
  const t=setInterval(()=>{n++;sync();if(n>240)clearInterval(t)},250);
  window.addEventListener('focus',sync);
})();
