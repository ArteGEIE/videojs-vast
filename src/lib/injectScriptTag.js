export function injectScriptTag(src, onLoadCallback, onErrorCallback) {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = src;
  script.async = true;
  script.onload = onLoadCallback;
  script.onerror = onErrorCallback;
  document.body.appendChild(script);
}
