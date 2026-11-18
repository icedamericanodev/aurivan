/* KaiSip home page (home.html). Progressive enhancement only: every section,
   link and screenshot is readable, and the waitlist form works, with
   JavaScript switched off. This script makes no network request and stores
   nothing; the form posts straight to Kit. */

// Older Safari (before 14) has addListener instead of addEventListener on
// media queries.
const onMediaChange = (query, handler) => {
  if (query.addEventListener) query.addEventListener('change', handler);
  else if (query.addListener) query.addListener(handler);
};

// Header: a hairline appears once the page has scrolled. Its background is in
// the stylesheet, so it stays readable without this script.
(() => {
  const header = document.querySelector('.site-header');
  const sentinel = document.querySelector('.header-sentinel');
  if (!header || !sentinel || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('is-stuck', !entry.isIntersecting);
  }).observe(sentinel);
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
    if (observer) observer.disconnect();
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
  onMediaChange(wide, update);
})();
