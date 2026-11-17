// About: what TENGER is, its methods and limits, data credits with DOIs and the required acknowledgements,
// software and font licences, the base project, the team and the AI disclosure.
// (The game is in game-ui.js, lessons in learn-ui.js.) Every sentence comes from the English resource;
// only proper names, licence identifiers and URLs live here.
import { $, details, el } from './dom.js';
import { t } from './i18n.js';
import { renderLimits } from './help.js';
import { reservedRegions, reservedSource } from './reserved.js';

export const METHODS = ['seasons', 'quality', 'matching', 'holdout', 'receipts', 'recovery', 'scoring'];
// pixel, crossBand, comet and future moved here from the "can and can't" dialog (task B19).
export const LIMITS = ['saturation', 'contaminated', 'pixel', 'crossBand', 'parallax', 'trials', 'comet', 'future', 'approx'];

/** Data sources and services the code or the published data use. `ack` is a required acknowledgement. */
export const SOURCES = [
  {
    id: 'spherex',
    ack: 'ack.spherex',
    links: [
      ['https://doi.org/10.26131/IRSA678', 'about.link.doiDr1'],
      ['https://doi.org/10.26131/IRSA679', 'about.link.doiCube'],
      ['https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_dr1.html', 'about.link.overview'],
    ],
  },
  { id: 'irsa', ack: 'ack.irsa', links: [['https://irsa.ipac.caltech.edu/', 'about.link.website']] },
  { id: 'wise', ack: 'ack.wise', links: [['https://irsa.ipac.caltech.edu/Missions/wise.html', 'about.link.website']] },
  { id: 'twomass', ack: 'ack.twomass', links: [['https://doi.org/10.26131/IRSA2', 'about.link.doi2mass']] },
  {
    id: 'gaia',
    ack: 'ack.gaia',
    links: [
      ['https://www.cosmos.esa.int/gaia', 'about.link.website'],
      ['https://www.cosmos.esa.int/web/gaia/dpac/consortium', 'about.link.gaiaDpac'],
    ],
  },
  { id: 'simbad', ack: 'ack.simbad', links: [['https://simbad.cds.unistra.fr/', 'about.link.website']] },
  { id: 'vizier', ack: 'ack.vizier', links: [['https://doi.org/10.26093/cds/vizier', 'about.link.doiVizier']] },
  { id: 'sesame', links: [['https://cds.unistra.fr/cgi-bin/Sesame', 'about.link.website']] },
  { id: 'vsx', links: [['https://www.aavso.org/vsx/', 'about.link.website']] },
  { id: 'horizons', links: [['https://ssd.jpl.nasa.gov/horizons/', 'about.link.website']] },
  { id: 'most', links: [['https://irsa.ipac.caltech.edu/applications/MOST/', 'about.link.website']] },
  { id: 'sbdb', links: [['https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html', 'about.link.website']] },
  { id: 'standish', links: [['https://ssd.jpl.nasa.gov/planets/approx_pos.html', 'about.link.website']] },
  { id: 'aladin', ack: 'ack.aladin', links: [['https://aladin.cds.unistra.fr/AladinLite/', 'about.link.website']] },
  { id: 'celestial', links: [['https://github.com/ofrohn/d3-celestial', 'about.link.website']] },
];

/**
 * Published values the site compares with or draws (Planet X Lab, 3D Home), with where they are used. Citations
 * are proper names, so they live here; what each is used for is in the English resource.
 */
export const REFERENCES = [
  { id: 'lm16', cite: 'Linder & Mordasini 2016, A&A 589, A134', links: [['https://doi.org/10.1051/0004-6361/201628350', 'doi:10.1051/0004-6361/201628350'], ['https://arxiv.org/abs/1602.07465', 'arXiv:1602.07465']] },
  { id: 'f16', cite: 'Fortney et al. 2016, ApJL 824, L25', links: [['https://doi.org/10.3847/2041-8205/824/2/L25', 'doi:10.3847/2041-8205/824/2/L25'], ['https://arxiv.org/abs/1604.07424', 'arXiv:1604.07424']] },
  { id: 'meisner18', cite: 'Meisner et al. 2018, AJ 155, 166', links: [['https://doi.org/10.3847/1538-3881/aaae70', 'doi:10.3847/1538-3881/aaae70'], ['https://arxiv.org/abs/1712.04950', 'arXiv:1712.04950']] },
  { id: 'blanton07', cite: 'Blanton & Roweis 2007, AJ 133, 734', links: [['https://doi.org/10.1086/510127', 'doi:10.1086/510127']] },
  { id: 'wiseSupplement', cite: 'Cutri et al. 2012, WISE All-Sky Release Explanatory Supplement, section IV.4.h', links: [['https://irsa.ipac.caltech.edu/data/WISE/docs/release/All-Sky/expsup/sec4_4h.html', 'irsa.ipac.caltech.edu']] },
  { id: 'publicProducts', cite: 'SPHEREx team, Public-products: point-source sensitivity (pre-launch estimate)', links: [['https://github.com/SPHEREx/Public-products', 'github.com/SPHEREx/Public-products']] },
  { id: 'crill25', cite: 'Crill et al. 2025, ApJS 281, 10 (SPHEREx Sky Simulator)', links: [['https://arxiv.org/abs/2505.24856', 'arXiv:2505.24856']] },
  { id: 'bb16', cite: 'Batygin & Brown 2016, AJ 151, 22', links: [['https://doi.org/10.3847/0004-6256/151/2/22', 'doi:10.3847/0004-6256/151/2/22']], use: 'planetNine' },
  { id: 'bb16b', cite: 'Brown & Batygin 2016, ApJL 824, L23', links: [['https://doi.org/10.3847/2041-8205/824/2/L23', 'doi:10.3847/2041-8205/824/2/L23']], use: 'planetNine' },
  { id: 'babb19', cite: 'Batygin, Adams, Brown & Becker 2019, Physics Reports', links: [['https://doi.org/10.1016/j.physrep.2019.01.009', 'doi:10.1016/j.physrep.2019.01.009']], use: 'planetNine' },
  { id: 'bb21', cite: 'Brown & Batygin 2021, AJ 162, 219', links: [['https://doi.org/10.3847/1538-3881/ac2056', 'doi:10.3847/1538-3881/ac2056']], use: 'planetNine' },
  { id: 'bhb24', cite: 'Brown, Holman & Batygin 2024, arXiv:2401.17977', links: [['https://doi.org/10.48550/arXiv.2401.17977', 'doi:10.48550/arXiv.2401.17977']], use: 'planetNine' },
];

/** Libraries and tools, with the licence of the version in use (Python: installed package metadata, 14 Nov 2026). */
export const SOFTWARE = [
  { name: 'three.js 0.187.0', use: 'about.sw.three', licence: 'MIT', href: 'https://threejs.org/' },
  { name: 'Aladin Lite 3.8.2', use: 'about.sw.aladin', licence: 'GPL-3.0', href: 'https://github.com/cds-astro/aladin-lite' },
  { name: 'Python 3.12', use: 'about.sw.python', licence: 'PSF-2.0', href: 'https://www.python.org/' },
  { name: 'Astropy', use: 'about.sw.astropy', licence: 'BSD-3-Clause', href: 'https://www.astropy.org/', ack: 'ack.astropy' },
  { name: 'NumPy', use: 'about.sw.numpy', licence: 'BSD-3-Clause', href: 'https://numpy.org/' },
  { name: 'SciPy', use: 'about.sw.scipy', licence: 'BSD-3-Clause', href: 'https://scipy.org/' },
  { name: 'Pillow', use: 'about.sw.pillow', licence: 'MIT-CMU', href: 'https://python-pillow.github.io/' },
  { name: 'FastAPI', use: 'about.sw.fastapi', licence: 'MIT', href: 'https://fastapi.tiangolo.com/' },
  { name: 'Starlette', use: 'about.sw.starlette', licence: 'BSD-3-Clause', href: 'https://starlette.dev/' },
  { name: 'Uvicorn', use: 'about.sw.uvicorn', licence: 'BSD-3-Clause', href: 'https://uvicorn.dev/' },
  { name: 'HTTPX', use: 'about.sw.httpx', licence: 'BSD-3-Clause', href: 'https://www.python-httpx.org/' },
  { name: 'pytest', use: 'about.sw.pytest', licence: 'MIT', href: 'https://pytest.org/' },
  { name: 'Node.js', use: 'about.sw.node', licence: 'MIT', href: 'https://nodejs.org/' },
];

/** Every package in the Python environment (`importlib.metadata`, 14 Nov 2026), including dependencies. */
export const PYTHON_PACKAGES = [
  ['annotated-doc', 'MIT'], ['annotated-types', 'MIT'], ['anyio', 'MIT'], ['astropy', 'BSD-3-Clause'],
  ['astropy-iers-data', 'BSD-3-Clause'], ['certifi', 'MPL-2.0'], ['click', 'BSD-3-Clause'], ['fastapi', 'MIT'],
  ['h11', 'MIT'], ['httpcore', 'BSD-3-Clause'], ['httptools', 'MIT'], ['httpx', 'BSD-3-Clause'],
  ['idna', 'BSD-3-Clause'], ['iniconfig', 'MIT'], ['numpy', 'BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0'],
  ['opentelemetry-api', 'Apache-2.0'], ['packaging', 'Apache-2.0 OR BSD-2-Clause'], ['pillow', 'MIT-CMU'],
  ['pip', 'MIT'], ['pluggy', 'MIT'], ['pydantic', 'MIT'], ['pydantic_core', 'MIT'], ['pyerfa', 'BSD-3-Clause'],
  ['Pygments', 'BSD-2-Clause'], ['pytest', 'MIT'], ['python-dotenv', 'BSD-3-Clause'], ['PyYAML', 'MIT'],
  ['scipy', 'BSD-3-Clause'], ['starlette', 'BSD-3-Clause'], ['typing-inspection', 'MIT'],
  ['typing_extensions', 'PSF-2.0'], ['uvicorn', 'BSD-3-Clause'], ['uvloop', 'MIT OR Apache-2.0'],
  ['watchfiles', 'MIT'], ['websockets', 'BSD-3-Clause'],
];

/** Self-hosted fonts and their licence files (static/fonts/README.md). */
const FONTS = [
  { key: 'font.spaceGrotesk', family: 'Space Grotesk', licence: 'fonts/OFL-SpaceGrotesk.txt', class: 'font-head' },
  { key: 'font.inter', family: 'Inter', licence: 'fonts/OFL-Inter.txt', class: 'font-text' },
  { key: 'font.jetbrainsMono', family: 'JetBrains Mono', licence: 'fonts/OFL-JetBrainsMono.txt', class: 'font-mono' },
];

export const TEAM = ['about.team.member1', 'about.team.member2', 'about.team.member3', 'about.team.member4'];
export const AI_DISCLOSURE = ['about.ai.planning', 'about.ai.code', 'about.ai.review', 'about.ai.images'];

const external = (href, text) => el('a', { href, text, rel: 'noopener' });

/** One closed disclosure per term (task B12): its title in view, its text one click (or Enter) away. */
const definitions = (prefix, ids) => ids.map((id) => details(el('p', { text: t(`${prefix}.${id}`) }), { label: t(`${prefix}.${id}.title`), className: 'about-term' }));

function sourceItem(source) {
  return el('li', { class: 'source' }, [
    el('h3', { text: t(`about.src.${source.id}.name`) }),
    el('p', { text: t('about.use', { text: t(`about.src.${source.id}.use`) }) }),
    source.ack ? el('blockquote', { class: 'ack' }, [el('p', { text: t(source.ack) })]) : null,
    el('p', { class: 'source-links' }, source.links.map(([href, key]) => external(href, t(key)))),
  ]);
}

function softwareItem(item) {
  return el('li', {}, [
    el('strong', {}, external(item.href, item.name)),
    el('span', { text: ` · ${t(item.use)} · ` }),
    el('code', { text: item.licence }),
    item.ack ? el('blockquote', { class: 'ack' }, [el('p', { text: t(item.ack) })]) : null,
  ]);
}

export function renderAbout() {
  $('about-methods').replaceChildren(...definitions('about.m', METHODS));
  $('about-limits').replaceChildren(...definitions('about.l', LIMITS));
  // The same "can and can't do" lists as the dialog in the top bar (task B19).
  renderLimits($('about-see'));
  $('about-data').replaceChildren(...SOURCES.map(sourceItem));
  $('about-refs').replaceChildren(...REFERENCES.map((ref) => el('li', { class: 'source' }, [
    el('h3', { text: ref.cite }),
    el('p', { text: t('about.use', { text: t(`about.ref.${ref.use ?? ref.id}`) }) }),
    el('p', { class: 'source-links' }, ref.links.map(([href, label]) => external(href, label))),
  ])));
  $('about-software').replaceChildren(...SOFTWARE.map(softwareItem));
  $('about-packages').replaceChildren(
    el('thead', {}, el('tr', {}, [el('th', { scope: 'col', text: t('about.pkgName') }), el('th', { scope: 'col', text: t('about.pkgLicence') })])),
    el('tbody', {}, PYTHON_PACKAGES.map(([name, licence]) => el('tr', {}, [el('td', { text: name }), el('td', {}, el('code', { text: licence }))]))),
  );
  $('about-fonts').replaceChildren(...FONTS.map((font) => el('li', {}, [
    el('strong', { class: font.class, text: font.family }),
    el('span', { text: t(font.key) }),
    el('a', { href: font.licence, text: t('font.licence') }),
  ])));
  $('about-team').replaceChildren(...TEAM.map((key) => el('li', { text: t(key) })));
}

/**
 * The reserved sky regions in force (from reserved.json, V10): released paths no longer block live loading;
 * the others still do. Called after the data load. nameOf(key) gives a target's display name.
 */
export function renderReserved(nameOf) {
  const items = reservedRegions().map((region) => el('li', { class: `reserved-item is-${region.status}` }, [
    el('strong', { text: nameOf(region.key) ?? region.key }),
    el('span', { class: `chip chip-reserved-${region.status}`, text: t(`about.reserved.${region.status}`) }),
    region.reasonKey ? el('span', { class: 'note', text: t(region.reasonKey) }) : null,
    region.untilKey ? el('span', { class: 'note', text: t(region.untilKey) }) : null,
  ]));
  $('about-reserved').replaceChildren(...items);
  $('about-reserved-source').textContent = reservedSource() === 'file' ? '' : t('about.reserved.builtIn');
}
