// Task B40: on a plain visit to Home, the title block gets its words as soon as the English strings arrive, before
// the rest of the page's code has loaded, so Home's largest text paints early. main.js redoes all text as before.
import { applyTranslations } from './i18n.js';

if (!location.search || location.search === '?') {
  const hero = document.getElementById('home-hero');
  if (hero) {
    applyTranslations(hero);
    document.body.classList.add('booted');
  }
}
