const parallaxBg = document.querySelector('.parallax-bg');
const parallaxFg = document.querySelector('.parallax-fg');
const nettspendParallax = document.getElementById('nettspend-parallax');

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
}

function updateParallax() {
  parallaxBg.style.transform = `translateY(${window.scrollY * -0.5}px)`;
  if (parallaxFg) {
    parallaxFg.style.transform = `translateY(${window.scrollY * -1}px)`;
  }
  if (nettspendParallax) {
    nettspendParallax.style.transform = `translateY(${window.scrollY * -0.25}px)`;
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


