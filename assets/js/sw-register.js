if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/nepobabiesruntheunderground/sw.js', {
      scope: '/nepobabiesruntheunderground/'
    });
  });
}
