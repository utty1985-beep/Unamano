// The shared evaluation is a website only; keep user data and remove app-shell caches.
(() => {
  'use strict';
  window.__PFC_ONLINE_TRIAL__ = true;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  const scopeRoot = new URL('./', document.currentScript.src).href;
  if ('serviceWorker' in navigator) {
    const serviceWorkers = navigator.serviceWorker;
    const register = serviceWorkers.register.bind(serviceWorkers);
    serviceWorkers.register = (url, options) => {
      if (new URL(url, location.href).href.startsWith(scopeRoot)) {
        return Promise.reject(new Error('Versione di prova disponibile solo online'));
      }
      return register(url, options);
    };
    serviceWorkers.getRegistrations().then(registrations => Promise.all(
      registrations.filter(registration => registration.scope.startsWith(scopeRoot))
        .map(registration => registration.unregister())
    )).catch(console.warn);
  }
  if ('caches' in window) caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('passione-funghi-caccia-') ||
      (key.startsWith('cacciatraccia-') && !key.includes('tiles')))
      .map(key => caches.delete(key))
  )).catch(console.warn);
  const style = document.createElement('style');
  style.textContent = '#installBtn,#ctInstallAppBtn,#ctOfflineAreaBtn{display:none!important}' +
    '#pfcTrialOffline{position:fixed;inset:0;z-index:2147483647;background:#173f2b;color:white;display:grid;place-content:center;padding:28px;text-align:center;font:18px/1.5 system-ui}' +
    '#pfcTrialOffline[hidden]{display:none}';
  document.head.appendChild(style);
  function showNetworkState() {
    let notice = document.getElementById('pfcTrialOffline');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'pfcTrialOffline';
      notice.setAttribute('role', 'alert');
      notice.innerHTML = '<strong>Versione di prova online</strong><p>Collegati a Internet per continuare.</p>';
      document.body.appendChild(notice);
    }
    notice.hidden = navigator.onLine;
    if (navigator.onLine) {
      const subtitle = document.querySelector('.brand small');
      if (subtitle) subtitle.textContent = 'Versione di prova · Solo online';
    }
  }
  document.addEventListener('DOMContentLoaded', showNetworkState, {once: true});
  window.addEventListener('online', showNetworkState);
  window.addEventListener('offline', showNetworkState);
})();
