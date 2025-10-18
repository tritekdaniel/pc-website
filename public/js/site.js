// public/js/site.js
(function(){
  const topBar = document.getElementById('topBar');
  const topInner = document.getElementById('topBarInner');

  function showBar() {
    if (!topBar || !topInner) return;
    topBar.style.opacity = '1';
    topInner.style.width = '0%';
    // animate to 80% quickly
    requestAnimationFrame(()=> {
      topInner.style.width = '80%';
    });
  }
  function finishBar() {
    if (!topBar || !topInner) return;
    topInner.style.width = '100%';
    setTimeout(()=> {
      topBar.style.opacity = '0';
      topInner.style.width = '0%';
    }, 450);
  }

  // attach to all normal anchors (internal) to show loading bar on navigation
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href')||'';
    // only internal links (start with /) should trigger bar
    if (href.startsWith('/') && !href.startsWith('//')) {
      showBar();
    }
  }, true);

  // attach to every form submit - show bar and let form continue
  document.addEventListener('submit', (e) => {
    showBar();
    // in case of AJAX forms, listen for custom event to finish
    // default forms will navigate away and the success page will show.
  }, true);

  // finishBar can be called if you navigate programmatically or on page load
  window.addEventListener('load', () => {
    // small delay so user sees the completion
    setTimeout(finishBar, 160);
  });

  // expose for manual control from pages (if needed)
  window.SiteLoader = { show: showBar, done: finishBar };
})();
