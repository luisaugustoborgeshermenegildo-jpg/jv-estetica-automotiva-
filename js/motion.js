/* Pointer depth and user-triggered navigation for the JV comparison pages. */
(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const hero = document.querySelector('.hero');
  const photo = document.querySelector('.hero-photo');
  const summary = document.querySelector('.booking-summary');
  const service = document.querySelector('#serviceSelect');
  let pointerFrame = 0;
  let summaryAnimation;

  function resetDepth() {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    photo.classList.remove('is-tracking');
    photo.style.removeProperty('--depth-x');
    photo.style.removeProperty('--depth-y');
  }

  hero.addEventListener('pointermove', event => {
    if (reducedMotion.matches || !finePointer.matches || event.pointerType === 'touch') return;
    cancelAnimationFrame(pointerFrame);
    const rect = hero.getBoundingClientRect();
    const x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
    const y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
    const depth = document.body.classList.contains('monochrome') ? 3 : 8;
    pointerFrame = requestAnimationFrame(() => {
      photo.classList.add('is-tracking');
      photo.style.setProperty('--depth-x', (-y * depth).toFixed(2) + 'deg');
      photo.style.setProperty('--depth-y', (x * depth).toFixed(2) + 'deg');
      pointerFrame = 0;
    });
  }, { passive: true });
  hero.addEventListener('pointerleave', resetDepth);
  finePointer.addEventListener('change', resetDepth);
  reducedMotion.addEventListener('change', () => {
    resetDepth();
    summaryAnimation?.cancel();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetDepth();
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip') || event.defaultPrevented ||
        event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    const headerHeight = document.querySelector('.header').getBoundingClientRect().height;
    window.scrollTo({
      top: window.scrollY + target.getBoundingClientRect().top - headerHeight - 24,
      behavior: reducedMotion.matches ? 'instant' : 'smooth'
    });
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
  });

  function markService() {
    document.querySelectorAll('.service-card').forEach(card => {
      card.classList.toggle('is-selected', card.querySelector('.pick-service')?.dataset.service === service.value);
    });
    summaryAnimation?.cancel();
    if (!reducedMotion.matches) {
      summaryAnimation = summary.animate(
        [{ opacity: .6, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }],
        { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
    }
  }
  service.addEventListener('change', markService);
  document.querySelector('#bookingForm').addEventListener('reset', () => {
    document.querySelectorAll('.service-card.is-selected').forEach(card => card.classList.remove('is-selected'));
  });
})();
