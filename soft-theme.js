(function(){
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content','#6F8FAF');

  if(document.getElementById('unamanoSoftThemeStyle')) return;
  const s=document.createElement('style');
  s.id='unamanoSoftThemeStyle';
  s.textContent=`
    :root{
      --g:#6F8FAF;
      --g2:#587493;
      --mint:#F0F4F8;
      --mint2:#E6EDF5;
      --ink:#22303D;
      --muted:#73808D;
      --line:#DBE4EC;
      --bg:#F7F9FC;
      --card:#FFFFFF;
      --orange:#D9966B;
      --danger:#B94A48;
      --dangerbg:#FCEEEE;
      --warn:#936B38;
      --warnbg:#FFF7EB;
      --ok:#587C72;
      --shadow:0 5px 16px rgba(48,66,84,.06);
    }
    body{background:var(--bg);color:var(--ink)}
    .top{border-bottom-color:var(--line);box-shadow:none}
    .logo-mark{border-radius:10px;background:linear-gradient(135deg,var(--g),#8EA8C0);box-shadow:0 4px 12px rgba(111,143,175,.16)}
    .navbtn{color:#4E5F70}.navbtn:hover{background:#F0F4F8}
    .btn{border-radius:11px;box-shadow:none}
    .p{box-shadow:none}.p:hover{background:var(--g2)}
    .s{background:#EEF3F8;color:var(--g2)}
    .g{color:#40505F;border-color:var(--line)}
    .hero{border-radius:22px;border-color:var(--line);background:radial-gradient(circle at 88% 18%,#DCE7F1 0,transparent 32%),linear-gradient(135deg,#EDF3F8,#FFFFFF 70%);box-shadow:none}
    .hero-kicker{border-color:#D8E2EB;color:var(--g2)}
    .hero p{color:#647484}
    .statpill{border-color:#DCE5ED;box-shadow:none}
    .chip{border-color:#E0E7EE;color:#536373}.chip.active{background:var(--g);border-color:var(--g)}
    .um-category-gallery{display:flex!important;gap:10px!important;overflow-x:auto!important;padding:14px 2px 8px!important;scroll-snap-type:x proximity;scrollbar-width:none}
    .um-category-gallery::-webkit-scrollbar{display:none}
    .um-category-tile{min-width:98px;max-width:112px;min-height:98px;border:1px solid #DEE6ED;background:#fff;border-radius:16px;padding:10px 9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:#4E5F70;scroll-snap-align:start;box-shadow:none}
    .um-category-tile.active{background:#EDF3F8;border-color:#AFC1D1;color:var(--g2)}
    .um-category-icon{font-size:30px;line-height:1}.um-category-label{font-size:12px;font-weight:800;text-align:center;line-height:1.15}.um-category-count{min-width:24px;height:20px;padding:0 6px;border-radius:999px;background:#F1F4F7;color:#687785;font-size:11px;font-weight:850;display:grid;place-items:center}.um-category-tile.active .um-category-count{background:#DCE7F1;color:var(--g2)}
    .card{border-radius:16px;border-color:var(--line);box-shadow:none}
    .job:hover{border-color:#C9D6E1;transform:none;box-shadow:none}
    .avatar{background:linear-gradient(135deg,#E8EEF4,#F8FAFC);border-color:#D9E3EC;color:var(--g2)}
    input,select,textarea{border-radius:10px;border-color:#D3DEE8}
    input:focus,select:focus,textarea:focus{border-color:#9CB0C2;box-shadow:0 0 0 3px rgba(111,143,175,.10)}
    .tabs{background:#EEF2F6}.tab{color:#667585}.tab.active{color:var(--g2);box-shadow:none;border:1px solid #E2E8EF}
    .metric{background:#F7F9FB;border-color:#E3E9EF}
    .appcard{border-radius:14px;border-color:var(--line)}
    .appmsg{background:#F6F8FA;color:#566676}
    .modal{border-radius:18px 18px 14px 14px;box-shadow:0 12px 36px rgba(31,45,60,.14)}
    .iconbtn{border-radius:10px}
    .toast{background:#53697D}
    .testbar{background:#53697D;color:#F4F7FA}
    .bottom{box-shadow:0 -3px 12px rgba(45,62,79,.05)}
    .site-footer a{color:var(--g)!important}
    #umAssistantBtn{box-shadow:0 5px 16px rgba(58,77,96,.16)!important}
    #umAssistantPanel{box-shadow:0 12px 34px rgba(42,58,74,.16)!important}
    @media(max-width:840px){.modal{border-radius:18px 18px 0 0}.um-category-tile{min-width:88px;min-height:90px}.um-category-icon{font-size:27px}}
  `;
  document.head.appendChild(s);
})();
