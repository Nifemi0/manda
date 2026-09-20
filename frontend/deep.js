const hero = document.querySelector('.hero');
const object = document.querySelector('.hero-object');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (hero && object && !reduceMotion && window.innerWidth > 1050) {
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    hero.style.setProperty('--mx', `${x * 100}%`);
    hero.style.setProperty('--my', `${y * 100}%`);
    object.style.transform = `rotateY(${(x - .5) * 7}deg) rotateX(${(.5 - y) * 5}deg) translate3d(0, 0, 0)`;
  });
  hero.addEventListener('pointerleave', () => {
    object.style.transform = 'rotateY(0deg) rotateX(0deg)';
  });
}
