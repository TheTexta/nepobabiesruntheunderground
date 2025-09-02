const parallaxBg = document.querySelector('.parallax-bg');
const parallaxFg = document.querySelector('.parallax-fg');
const nettspendParallax = document.getElementById('nettspend-parallax');
const bassvictimParallax = document.getElementById('bassvictim-section');


// TODO add the pilleater section to parallax.
// TODO add the pillsieat-overaly section to parallax

function resizeParallax() {
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight
  );
  const maxScrollY = docHeight - window.innerHeight;
  const neededHeight = window.innerHeight + maxScrollY * 0.5;

  parallaxBg.style.height = `${neededHeight}px`;
  if (parallaxFg) {
    parallaxFg.style.height = `${neededHeight}px`;
  }
  if (nettspendParallax) {
    nettspendParallax.style.height = `${neededHeight}px`;
  }
   if (bassvictimParallax) {
    bassvictimParallax.style.height = `${neededHeight}px`;
  }
}

function updateParallax() {
  parallaxBg.style.transform = `translateY(${window.scrollY * -0.5}px)`;
  if (parallaxFg) {
    parallaxFg.style.transform = `translateY(${window.scrollY * -1}px)`;
  }
  if (nettspendParallax) {
    nettspendParallax.style.transform = `translateY(${window.scrollY * -0.25}px)`;
  }
  if (bassvictimParallax) {
    bassvictimParallax.style.transform = `translateY(${window.scrollY * -0.35}px)`;
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

window.addEventListener('load', resizeParallax);
window.addEventListener('resize', resizeParallax);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(resizeParallax);
}

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

  const bass = document.getElementById('bassvictim-section');
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


