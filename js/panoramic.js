/* Local, pointer-driven typography for the selected panoramic proposal. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const selector = 'h2, h3, h4, p, a, button, li, label, legend';
  const excluded = '#hero-title, .motion-word, .brand, .skip, .preview-note, .version-links, .booking-summary, .form-feedback, .slots, .submit-button, .honeypot, select, textarea, svg, [aria-hidden="true"], noscript';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent.trim() && node.parentElement.closest(selector) &&
        !node.parentElement.closest(excluded)) nodes.push(node);
  }
  nodes.forEach(node => {
    const host = node.parentElement.closest(selector);
    host.dataset.fluidText = '';
    const fragment = document.createDocumentFragment();
    const accessible = document.createElement('span');
    accessible.className = 'fluid-readable';
    accessible.textContent = node.textContent;
    fragment.append(accessible);
    const visual = document.createElement('b');
    visual.className = 'fluid-run';
    visual.setAttribute('aria-hidden', 'true');
    fragment.append(visual);
    node.textContent.split(/(\s+)/).forEach(word => {
      if (!word.trim()) {
        visual.append(document.createTextNode(word));
        return;
      }
      const wrapper = document.createElement('b');
      wrapper.className = 'fluid-word';
      wrapper.setAttribute('aria-hidden', 'true');
      Array.from(word).forEach(character => {
        const letter = document.createElement('i');
        letter.className = 'fluid-letter';
        letter.textContent = character;
        wrapper.append(letter);
      });
      visual.append(wrapper);
    });
    node.replaceWith(fragment);
  });

  let active;
  let letters = [];
  let frame = 0;
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    letters.forEach(({ element }) => element.style.removeProperty('translate'));
    active = null;
    letters = [];
  }
  document.addEventListener('pointermove', event => {
    if (reduced.matches || !pointer.matches || event.pointerType === 'touch') return;
    const host = event.target.closest('[data-fluid-text]');
    if (host !== active) {
      reset();
      if (!host) return;
      active = host;
      letters = Array.from(host.querySelectorAll('.fluid-letter'), element => {
        const rect = element.getBoundingClientRect();
        return { element, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
    }
    if (!active) return;
    cancelAnimationFrame(frame);
    const amplitude = active.matches('h2, h3, h4') ? 4 : 1.5;
    frame = requestAnimationFrame(() => {
      letters.forEach(({ element, x, y }) => {
        const dx = event.clientX - x;
        const dy = event.clientY - y;
        const influence = Math.max(0, 1 - Math.hypot(dx, dy) / 150);
        element.style.translate = (dx / 150 * amplitude * influence).toFixed(2) + 'px ' +
          (-amplitude * influence).toFixed(2) + 'px';
      });
      frame = 0;
    });
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset);
  window.addEventListener('scroll', reset, { passive: true });
  window.addEventListener('resize', reset, { passive: true });
  pointer.addEventListener('change', reset);
  document.addEventListener('visibilitychange', reset);
  const animations = new Set();
  reduced.addEventListener('change', () => {
    reset();
    if (reduced.matches) animations.forEach(animation => animation.cancel());
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (reduced.matches) return;
      const animation = entry.target.animate(
        [{ opacity: .5, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
        { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    });
  }, { threshold: .15 });
  document.querySelectorAll('main h2, .care-details article, .steps li, .footer-top h2')
    .forEach(element => observer.observe(element));
})();
