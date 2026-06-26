// e2e-only main-world bridge. The inkly content script runs in an isolated world, so
// page.evaluate (main world) cannot call the window.__inklyAIRewrite it registers there.
// This same-origin script (allowed by the page CSP) exposes a main-world __inklyAIRewrite
// that round-trips a rewrite request to the isolated-world content-script listener via
// window.postMessage and resolves with its reply.
window.__inklyAIRewrite = function (text) {
  return new Promise(function (resolve) {
    var id = Math.random().toString(36).slice(2);
    function onMsg(e) {
      var d = e.data;
      if (e.source !== window || !d || d.__inkly !== 'ai-rewrite-res' || d.id !== id) return;
      window.removeEventListener('message', onMsg);
      resolve(d.result);
    }
    window.addEventListener('message', onMsg);
    window.postMessage({ __inkly: 'ai-rewrite-req', id: id, text: text }, '*');
  });
};
