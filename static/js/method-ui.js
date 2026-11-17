// Task B30: the "How it works" page. Each section is a headline plus one short line; longer text sits in closed
// "Details". Numbers come from method.js, which reads the data files; until they load, a card shows no number
// rather than an invented one.
import { $, details, el, statTile } from './dom.js';
import { t } from './i18n.js';
import { openDialog, renderLimits } from './help.js';
import { readDepth } from './planetx.js';
import { DATA_SOURCES, FAMILIAR, METHOD_FILES, bandStrip, missionFacts, pipelineSteps, resultNumbers } from './method.js';
import { wavelengthColor } from './stack.js';

let context = { nameOf: (key) => key, base: 'data/' };
let loading = null;
let data = { board: null, receipt: null, postmortem: null, depth: null };

const json = (path) => fetch(`${context.base}${path}`).then((response) => (response.ok ? response.json() : null)).catch(() => null);
const link = (href, text, extra = {}) => el('a', { href, text, ...(/^https:/.test(href) ? { rel: 'noopener' } : {}), ...extra });
const statusChip = (status) => el('span', { class: `chip method-status is-${status}`, text: t(`method.status.${status}`) });

function section(id, children) {
  return el('section', { class: 'method-section', 'aria-labelledby': `method-${id}-title` }, [
    el('h2', { id: `method-${id}-title`, text: t(`method.${id}.title`) }),
    el('p', { class: 'method-line', text: t(`method.${id}.line`) }),
    children,
  ]);
}

function missionSection() {
  const facts = missionFacts();
  const cards = el('ul', { class: 'method-facts' }, facts.map((fact) => el('li', { class: 'method-fact glass' }, [
    el('p', { class: 'stat-value', text: t(`method.fact.${fact.id}.value`, fact.values) }),
    el('p', { class: 'stat-label', text: t(`method.fact.${fact.id}.label`) }),
    el('p', { class: 'method-source' }, link(fact.source.href, t('method.fact.source', { name: fact.source.name }))),
  ])));
  const bands = bandStrip();
  const strip = el('div', { class: 'band-strip', role: 'list', 'aria-label': t('method.bands.label') }, bands.map((band) => {
    const [r, g, b] = wavelengthColor(Math.sqrt(band.low * band.high));
    return el('div', { class: 'band-cell', role: 'listitem', style: `--band-colour: rgb(${r} ${g} ${b})` }, [
      el('span', { class: 'band-name', text: t('method.bands.name', { n: String(band.n) }) }),
      el('span', { class: 'band-range', text: t('method.bands.range', { low: String(band.low), high: String(band.high) }) }),
    ]);
  }));
  return section('spherex', [
    cards,
    el('h3', { class: 'method-sub', text: t('method.bands.title') }),
    strip,
    el('p', { class: 'note', text: t('method.bands.note') }),
    details(el('p', { class: 'note', text: t('method.bands.source') })),
  ]);
}

function stepsSection() {
  const steps = pipelineSteps(data);
  return section('steps', el('ol', { class: 'method-steps' }, steps.map((step, index) => el('li', { class: 'method-step glass' }, [
    el('div', { class: 'method-step-head' }, [
      el('span', { class: 'method-num', text: String(index + 1), 'aria-hidden': 'true' }),
      el('h3', { text: t(`method.step.${step.id}.title`) }),
      statusChip(step.status),
    ]),
    el('p', { text: t(`method.step.${step.id}.text`) }),
    step.href ? el('p', { class: 'method-go' }, link(step.href, t(`method.step.${step.id}.link`), step.external ? {} : { 'data-method-link': '' })) : null,
  ]))));
}

function familiarSection() {
  return section('familiar', [
    el('ul', { class: 'method-cards' }, FAMILIAR.map((item) => el('li', { class: 'method-card glass' }, [
      el('div', { class: 'method-step-head' }, [el('h3', { text: t(`method.familiar.${item.id}.title`) }), statusChip(item.status)]),
      el('p', { text: t(`method.familiar.${item.id}.text`) }),
      el('p', { class: 'method-links' }, item.links.map(([href, name]) => link(href, name))),
    ]))),
    el('p', { class: 'method-key' }, el('strong', { text: t('method.familiar.noMatch') })),
  ]);
}

function resultCard({ id, value, label, line, href, linkKey, detail, tone = '' }) {
  return el('li', { class: 'method-card method-result glass' }, [
    el('h3', { text: t(`method.result.${id}.title`) }),
    value ? statTile({ value, label, tone }) : el('p', { class: 'note', text: t('method.result.loading') }),
    line ? el('p', { text: line }) : null,
    detail ? details(el('p', { class: 'note', text: detail })) : null,
    el('p', { class: 'method-go' }, link(href, t(linkKey), href.startsWith('?') ? { 'data-method-link': '' } : {})),
  ]);
}

function resultsSection() {
  const n = resultNumbers(data);
  const cards = [
    resultCard({
      id: 'pluto',
      value: n.pluto?.error ?? null,
      label: n.pluto ? t(`method.result.pluto.${n.pluto.status === 'hit' ? 'hit' : 'miss'}`) : '',
      tone: n.pluto ? (n.pluto.status === 'hit' ? 'is-hit' : 'is-miss') : '',
      line: n.pluto?.why ? t('method.result.pluto.why') : null,
      detail: n.pluto ? [t('method.result.pluto.detail'), n.pluto.pending ? t('method.result.pendingNote') : ''].filter(Boolean).join(' ') : null,
      href: '?page=predictions&trial=pluto-position-2026b', linkKey: 'method.result.pluto.link',
    }),
    resultCard({
      id: 'practice',
      value: n.practice ? t('method.result.ofN', { k: String(n.practice.hits), n: String(n.practice.n) }) : null,
      label: n.practice ? t('method.result.practice.label') : '',
      tone: n.practice && n.practice.hits === n.practice.n ? 'is-hit' : '',
      line: n.practice ? n.practice.items.map((item) => t('method.result.practice.item', { name: context.nameOf(item.key), error: item.error })).join(' · ') : null,
      detail: n.practice ? t('method.result.practice.detail') : null,
      href: '?page=predictions', linkKey: 'method.result.practice.link',
    }),
    resultCard({
      id: 'asteroids',
      value: n.asteroids ? t('method.result.ofN', { k: String(n.asteroids.hits), n: String(n.asteroids.checked) }) : null,
      label: n.asteroids ? t('method.result.asteroids.label') : '',
      tone: n.asteroids && n.asteroids.checked && n.asteroids.hits === n.asteroids.checked ? 'is-hit' : '',
      line: n.asteroids ? t('method.result.asteroids.line', { rest: String(n.asteroids.notScorable), few: String(n.asteroids.few), unclear: String(n.asteroids.unclear) }) : null,
      detail: n.asteroids ? [t('method.result.asteroids.detail', { total: String(n.asteroids.total) }), n.asteroids.pending ? t('method.result.pendingNote') : ''].filter(Boolean).join(' ') : null,
      href: '?page=predictions', linkKey: 'method.result.asteroids.link',
    }),
    resultCard({
      id: 'planetx',
      value: n.planetX ? t(n.planetX.low === n.planetX.high ? 'method.result.planetx.one' : 'method.result.planetx.value', { low: String(n.planetX.low), high: String(n.planetX.high) }) : null,
      label: n.planetX ? t('method.result.planetx.label') : '',
      line: n.planetX ? t('method.result.planetx.line') : null,
      detail: n.planetX ? t('method.result.planetx.detail') : null,
      href: '?page=learn&lesson=lab', linkKey: 'method.result.planetx.link',
    }),
  ];
  return section('results', el('ul', { class: 'method-cards method-results' }, cards));
}

function cannotSection() {
  const host = el('div', { class: 'method-cannot' });
  renderLimits(host, { only: 'cannot' });
  return section('cannot', [
    host,
    el('p', { class: 'method-go' }, el('button', { type: 'button', class: 'quiet', text: t('method.cannot.open'), 'aria-haspopup': 'dialog', onclick: () => openDialog('limits') })),
  ]);
}

function sourcesSection() {
  return section('sources', [
    el('ul', { class: 'method-cards method-sources' }, DATA_SOURCES.map((source) => el('li', { class: 'method-card glass' }, [
      el('div', { class: 'method-step-head' }, [el('h3', { text: t(`method.source.${source.id}.name`) }), source.status ? statusChip(source.status) : null]),
      el('p', { text: t(`method.source.${source.id}.use`) }),
      el('p', { class: 'method-links' }, source.links.map(([href, name]) => link(href, name))),
    ]))),
    el('p', { class: 'method-go' }, link('?page=about', t('method.sources.about'), { 'data-method-link': '' })),
  ]);
}

function draw() {
  $('method-body').replaceChildren(missionSection(), stepsSection(), familiarSection(), resultsSection(), cannotSection(), sourcesSection());
  for (const anchor of $('method-body').querySelectorAll('a[data-method-link]')) {
    anchor.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      context.onNavigate?.(anchor.getAttribute('href'));
    });
  }
}

/** context: { nameOf, base, onNavigate(href) } from main.js. */
export function initMethod(next) {
  context = { ...context, ...next };
}

/** Draws the page at once (without numbers if they are not loaded yet) and again when the files arrive. */
export function showMethod() {
  if (!$('method-body').childElementCount) draw();
  loading ??= Promise.all([json(METHOD_FILES.board), json(METHOD_FILES.receipt), json(METHOD_FILES.postmortem), json(METHOD_FILES.depth)])
    .then(([board, receipt, postmortem, depth]) => {
      data = { board, receipt, postmortem, depth: readDepth(depth) };
      draw();
    });
  return loading;
}
