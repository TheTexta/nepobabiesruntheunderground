const parallaxBg = document.querySelector('.parallax-bg');
const parallaxFg = document.querySelector('.parallax-fg');
const nettspendParallax = document.getElementById('nettspend-parallax');

// extra delta applied during macOS rubber band scrolling
let overscrollDelta = 0;

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
  const y = window.scrollY + overscrollDelta;
  parallaxBg.style.transform = `translateY(${y * -0.5}px)`;
  if (parallaxFg) {
    parallaxFg.style.transform = `translateY(${y * -1}px)`;
  }
  if (nettspendParallax) {
    nettspendParallax.style.transform = `translateY(${y * -0.25}px)`;
  }
  overscrollDelta = 0;
  ticking = false;
}

let ticking = false;

function requestTick() {
  if (!ticking) {
    window.requestAnimationFrame(updateParallax);
    ticking = true;
  }
}

window.addEventListener(
  'scroll',
  () => {
    requestTick();
  },
  { passive: true }
);

window.addEventListener(
  'wheel',
  (e) => {
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const maxScrollY = docHeight - window.innerHeight;
    const atTop = window.scrollY <= 0 && e.deltaY < 0;
    const atBottom = window.scrollY >= maxScrollY && e.deltaY > 0;
    if (atTop || atBottom) {
      overscrollDelta += e.deltaY;
      requestTick();
    }
  },
  { passive: true }
);

window.addEventListener('load', resizeParallax);
window.addEventListener('resize', resizeParallax);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(resizeParallax);
}
