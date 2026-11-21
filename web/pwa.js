// PWA registration is enabled only on secure web origins; it is harmless in Android WebView/file previews.
(() => {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(error => {
      console.warn('MDOT PRO offline support could not be enabled:', error);
    });
  });
})();
