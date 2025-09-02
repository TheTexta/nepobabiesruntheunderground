const parallaxBg = document.querySelector('.parallax-bg');
const parallaxFg = document.querySelector('.parallax-fg');
const nettspendContainer = document.getElementById('nettspend-parallax');
const nettspendParallax =
  nettspendContainer ? nettspendContainer.querySelector('.parallax-layer') : null;
const bassvictimContainer = document.getElementById('bassvictim-section');
const bassvictimParallax =
  bassvictimContainer ? bassvictimContainer.querySelector('.parallax-layer') : null;


// TODO add the pilleater section to parallax.
// TODO add the pillsieat-overaly section to parallax

function applyParallax(element, speed, container = element) {
  const offset = window.scrollY - container.offsetTop;
  element.style.transform = `translateY(${offset * speed}px)`;
}

function updateParallax() {
  if (parallaxBg) {
    applyParallax(parallaxBg, -0.5);
  }
  if (parallaxFg) {
    applyParallax(parallaxFg, -1);
  }
  if (nettspendParallax && nettspendContainer) {
    applyParallax(nettspendParallax, -0.25, nettspendContainer);
  }
  if (bassvictimParallax && bassvictimContainer) {
    applyParallax(bassvictimParallax, -0.35, bassvictimContainer);
  }
  ticking = false;
}

let ticking = false;
window.addEventListener(
  'scroll',
  () => {
    if (!ticking) {
      window.requestAnimationFrame(updateParallax);
      ticking = true;
    }
  },
  { passive: true }
);

window.addEventListener('DOMContentLoaded', () => {
  const logoForeground = document.getElementById('logo-foreground');
  const logoBackground = document.getElementById('logo-background');
  if (logoForeground && logoBackground) {
    logoForeground.addEventListener('mouseover', () => {
      logoBackground.style.filter = 'invert(1)';
    });
    logoForeground.addEventListener('mouseout', () => {
      logoBackground.style.filter = 'invert(0)';
    });
  }

  const bass = bassvictimContainer;
  if (bass) {
    const lines = bass.querySelectorAll('.bassvictim_text p');
    let revealTimeouts = [];
    bass.addEventListener('mouseenter', () => {
      revealTimeouts = [];
      lines.forEach((p, i) => {
        const timeoutId = setTimeout(() => {
          p.classList.add('reveal');
        }, i * 30);
        revealTimeouts.push(timeoutId);
      });
    });
    bass.addEventListener('mouseleave', () => {
      revealTimeouts.forEach(clearTimeout);
      revealTimeouts = [];
      lines.forEach((p) => p.classList.remove('reveal'));
    });
  }

  const pilleaterForeground = document.getElementById('pilleater-foreground');
  const pilleaterBackground = document.getElementById('pilleater-background');
  if (pilleaterForeground && pilleaterBackground) {
    let flashed = false;
    setInterval(() => {
      pilleaterBackground.style.filter = flashed ? 'invert(0)' : 'invert(1)';
      flashed = !flashed;
    }, 140);
  }
});


