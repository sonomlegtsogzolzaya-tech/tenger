// Task B40: the game from the targets, and the Sky map opening like a planetarium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FLY_KEYS, OPEN_FOV } from '../static/js/skymap.js';
import { t } from '../static/js/i18n.js';

const read = (path) => JSON.parse(readFileSync(new URL(`../static/data/${path}`, import.meta.url), 'utf8'));
const html = readFileSync(new URL('../static/index.html', import.meta.url), 'utf8');
const early = readFileSync(new URL('../static/js/early.js', import.meta.url), 'utf8');
const index = read('index.json');

test('a game round exists for exactly Barnard\'s Star, Epsilon Indi B and Pluto, matched by trial', () => {
  const rounds = index.game_rounds.map((path) => read(path));
  const withRound = index.targets.filter((target) => rounds.some((round) => target.prediction.trial_ids.includes(round.trial_id))).map((target) => target.key);
  assert.deepEqual(withRound.sort(), ['barnard', 'epsindib', 'pluto']);
  assert.equal(t('play.guess'), 'Play: guess where it goes next');
  assert.equal(t('hero.playGame'), 'Play Beat the physics');
  assert.match(html, /<button id="pop-play" type="button" class="quiet pop-play" data-t="play.guess" hidden><\/button>/);
  assert.match(html, /<button id="changed-play" type="button" class="quiet" data-t="play.guess"><\/button>/);
  assert.match(html, /<a id="hero-game" class="hero-game" href="\?page=game" data-page-link="game" data-t="hero.playGame"><\/a>/);
});

test('the Sky map opens at about 60° with constellations on and the six Fly to chips in order', () => {
  assert.equal(OPEN_FOV, 60);
  assert.deepEqual(FLY_KEYS, ['barnard', 'epsindib', 'wise0855', 'rwaur', 'rdra', 'pluto']);
  assert.match(html, /<button id="skymap-lines" type="button" role="switch" aria-checked="true"/);
});

test('the early text runs only on a plain Home address (no other page flashes Home)', () => {
  assert.match(early, /if \(!location\.search \|\| location\.search === '\?'\)/);
  assert.ok(html.indexOf('src="js/early.js') < html.indexOf('src="js/main.js'));
});
