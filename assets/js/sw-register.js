if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Determine the correct path based on the current location
    const isGitHubPages = window.location.hostname === 'thetexta.github.io';
    const swPath = isGitHubPages ? '/nepobabiesruntheunderground/sw.js' : './sw.js';
    const scope = isGitHubPages ? '/nepobabiesruntheunderground/' : './';
    
    navigator.serviceWorker.register(swPath, { scope });
  });
}
