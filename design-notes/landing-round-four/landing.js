/* KaiSip landing, review round four. Progressive enhancement only: every
   section, link and screenshot is readable with JavaScript switched off. */

// Header: gain a soft backdrop once the page has scrolled.
(() => {
  const header = document.querySelector('.site-header');
  const sentinel = document.querySelector('.header-sentinel');
  if (!header || !sentinel || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('is-stuck', !entry.isIntersecting);
  }).observe(sentinel);
})();

// Section reveals. Browsers with scroll-driven animations handle these in CSS;
// this is the fallback. Nothing is pre-hidden, so a failed script cannot strand
// an invisible section.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (window.CSS && CSS.supports('animation-timeline: view()')) return;
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!reduced.matches) entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

// Story: on wide screens the five screenshots share one sticky phone and
// cross-fade as each step reaches the middle of the window. No scroll
// hijacking: the page scrolls normally. On small screens (and without
// JavaScript) each step simply shows its own screenshot.
(() => {
  const story = document.querySelector('.story');
  if (!story || !('IntersectionObserver' in window)) return;
  const stage = story.querySelector('.story-stage');
  const holder = story.querySelector('.stage-screens');
  const list = story.querySelector('.story-steps');
  const steps = [...story.querySelectorAll('.step')];
  const shots = steps.map(step => step.querySelector('.step-shot'));
  const images = shots.map(shot => shot.querySelector('img'));
  const wide = matchMedia('(min-width: 900px) and (min-height: 560px)');
  let observer;
  const activate = index => {
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    images.forEach((image, i) => image.classList.toggle('is-active', i === index));
    list.style.setProperty('--progress', (index + 1) / steps.length);
  };
  const update = () => {
    observer?.disconnect();
    if (wide.matches) {
      images.forEach(image => holder.append(image));
      stage.hidden = false;
      story.classList.add('is-enhanced');
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) activate(steps.indexOf(entry.target)); });
      }, { rootMargin: '-50% 0px -50% 0px' });
      steps.forEach(step => observer.observe(step));
      if (!steps.some(step => step.classList.contains('is-active'))) activate(0);
    } else {
      images.forEach((image, i) => shots[i].append(image));
      stage.hidden = true;
      story.classList.remove('is-enhanced');
    }
  };
  update();
  wide.addEventListener('change', update);
})();

// Voices: one flowing row. The copy stays in normal document flow; the moving
// duplicate is hidden from assistive technology and cannot take focus.
(() => {
  const section = document.querySelector('.voices');
  if (!section) return;
  const controls = section.querySelector('.motion-controls');
  const pause = section.querySelector('.pause-quotes');
  const read = section.querySelector('.read-quotes');
  const viewport = section.querySelector('.quote-viewport');
  const group = section.querySelector('.quote-group');
  if (!controls || !pause || !read || !viewport || !group) return;
  // Without visibility observation, keep the readable static grid.
  if (!('IntersectionObserver' in window)) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const duplicate = group.cloneNode(true);
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.setAttribute('inert', '');
  group.after(duplicate);
  const setPaused = value => {
    section.classList.toggle('user-paused', value);
    pause.setAttribute('aria-pressed', String(value));
    pause.textContent = value ? 'Resume motion' : 'Pause motion';
  };
  pause.addEventListener('click', () => setPaused(!section.classList.contains('user-paused')));
  read.addEventListener('click', () => {
    const reading = section.classList.toggle('is-reading');
    read.setAttribute('aria-pressed', String(reading));
    read.textContent = reading ? 'Return to moving cards' : 'Read all feedback';
    pause.hidden = reading;
    syncFocusable();
  });
  // A touch or pen contact pauses until the learner chooses to resume.
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') setPaused(true);
  }, { passive: true });
  // While moving, the row is a keyboard stop: focusing it holds it still.
  const syncFocusable = () => {
    const moving = section.classList.contains('is-moving') && !section.classList.contains('is-reading');
    if (moving) {
      viewport.tabIndex = 0;
      viewport.setAttribute('role', 'group');
      viewport.setAttribute('aria-label', 'Sample feedback, moving row. Motion pauses while focused.');
    } else {
      viewport.removeAttribute('tabindex');
      viewport.removeAttribute('role');
      viewport.removeAttribute('aria-label');
    }
  };
  const updatePreference = () => {
    section.classList.toggle('is-moving', !preference.matches);
    controls.hidden = preference.matches;
    syncFocusable();
  };
  updatePreference();
  preference.addEventListener('change', updatePreference);
  const updateVisibility = () => section.classList.toggle('tab-hidden', document.hidden);
  document.addEventListener('visibilitychange', updateVisibility);
  updateVisibility();
  new IntersectionObserver(([entry]) => {
    section.classList.toggle('in-view', entry.isIntersecting);
  }, { threshold: 0.08 }).observe(section);
})();

// Waitlist mockup: validates in the browser only. No request, no storage.
(() => {
  const form = document.querySelector('.waitlist-form');
  if (!form) return;
  const status = form.querySelector('.waitlist-status');
  form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = 'Preview complete. In the live version, this would request launch updates. Your information has not been sent or saved.';
  });
  form.addEventListener('input', () => { status.textContent = ''; });
  // Disabled in the static HTML so a no-JavaScript visit cannot submit an email.
  form.querySelector('.waitlist-fields').disabled = false;
})();

// Replay lives only in the private review bar, never in the product page.
(() => {
  const button = document.querySelector('.replay-motion');
  if (!button) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => { button.hidden = preference.matches; };
  update();
  preference.addEventListener('change', update);
  button.addEventListener('click', () => {
    if (preference.matches) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.classList.add('motion-reset');
    void document.body.offsetWidth;
    document.body.classList.remove('motion-reset');
  });
})();
