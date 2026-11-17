# Demo clips for the 30-second video

## The 30-second video, Vestigium (task B27: the main screens, a person using the site)

`vestigium-demo-30s.mp4`: **30.000 s** (900 frames), **2,678,935 bytes**, 1280×720, H.264 High, yuv420p, 30 fps, no
audio track. English captions are burned in; `vestigium-demo-30s.srt` has the same text, and
`vestigium-demo-30s-contact.png` has one frame per shot.
- **Earlier versions kept:** `-v3` is B26 (cursor, the earlier story) and `-v2` is B25.
- **Recording.** Recorded on the build with Session A's B27a fix (an open target fully covers the 3D scene) and the
  team logo.
  - Shots 1–5 are one continuous take driven by real mouse events, with B26's cursor: a 24 px white arrow with a
    soft shadow, eased curved moves (at most 95 px per video frame), click ripples and smooth wheel scrolling.
  - The chip's tooltip is the browser's own `title` text, which a screen recording never captures, so the script
    draws that same text the same way, as it does the cursor.
  - Shot 4's caption sits at the top, clear of the cursor at the Contrast slider.
  - The title card has no cursor.

| Time | Shot | Caption | Checked against |
|---|---|---|---|
| 0–5 s | Home's 3D first screen, the scene turning; the cursor drifts across | Vestigium: watch the sky move in real NASA SPHEREx pictures. | — |
| 5–10 s | A smooth scroll down to the full 3D Solar System; the time slider dragged right (1 → 6, a month per second: the planets orbit), then LIVE | A live 3D map: the planets follow JPL’s orbits through time. | The scene's JPL elements (B10) |
| 10–13 s | A smooth scroll back up to "Or pick a target"; a hover on WISE 0855 (its tooltip shows), then a click on Barnard's Star | Pick one of the five NASA challenge targets. | — |
| 13–20 s | Barnard's Star blinking AllWISE 2010 ↔ SPHEREx 2026; Contrast dragged right (1 → 2.4) | Real pictures, 2010 and 2026: Barnard's Star moved about 168″. | Years from the frames' own labels; 168″ from the page's finding |
| 20–26 s | "What changed" (opened at 17.9 s, under shot 4's caption; the measured finding: 10.4174 ± 0.3267″/yr, Gaia 10.3933), then "Estimate motion" (the browser quick look, labelled not validated): it tracks the star for about 1.3 s, counts up from 0 to 9.94 ± 0.48″/yr and holds that value with the "Catalogue 10.39″/yr" row above the caption from 21.6 to 24.3 s (B28); then the brightness-over-time chart | We measure how it moves from the pictures and check it against Gaia. | The user's caption, no numbers |
| 26–30 s | Title card: the team logo, nama2323.github.io/tenger, the four names, "Data: NASA SPHEREx via NASA/IPAC IRSA", "Also inside: blind forecasts and a Planet X test" | (the card's own text) | — |

The recorded clicks, from the last run:
- 7.0–8.0 s the time slider drag; 8.8 s LIVE;
- 12.2 s Barnard's Star (the target opens after the 3D flight, at 14.2 s);
- 16.3 s the Contrast drag;
- 17.9 s "What changed"; 19.5 s "Estimate motion" (the final value shows at 21.6 s and holds until 24.3 s).

Each click was checked on its target, and the expected state followed: live time, Barnard's Star open, contrast
up, the motion result and the chart. While Barnard's Star is open, no 3D label or control is visible or under the
pointer.

The B21/B26 shot list (the Pluto reveal and the Planet X Lab) describes the `-v2` and `-v3` files.

While recording, every shot was checked:
- no exception;
- no request to `dev-fixtures` or onrender.com;
- the page HTML names neither the base project nor its author;
- the page title and visible text never say "TENGER".

**Re-make** (about 1 minute; Chrome with the Mac's GPU, ffmpeg, Node 22+):

```bash
node docs/screens/demo/make-video.mjs
```

`ONLY=<shot id>` records one shot and prints its frame times and the numbers it read. A label change on the site
needs no edit here, since captions take their numbers from the page and the files.

The B9 video below (`tenger-demo-30s.*`) shows the earlier name and design; it is kept as a record and superseded
by this one.

## The 30-second video (task B9)

`tenger-demo-30s.mp4`: **30.000 s** (900 frames), **3,062,603 bytes**, 1280×720, H.264 High, yuv420p, 30 fps, no
audio track. English captions burned in (34 px, bottom, dark box, at most 2 lines), the same text and line breaks in
`tenger-demo-30s.srt`, and one frame per shot in `tenger-demo-30s-contact.png`. Made with `make-video.mjs` from the
deployed site (https://nama2323.github.io/tenger, `main` = `4efc3e0`) on 15 Nov 2026. Real screen recordings of the
site only: no generated images, video, voice or music. The captions and the title card are text drawn by Chrome in
the site's own font and stylesheet (`video/caption.html`, `video/title-card.html`).

| Time | Shot | Caption | Checked against |
|---|---|---|---|
| 0–4 s | Home in 3D, the flight to Pluto, Pluto's images | TENGER: see the sky change in NASA SPHEREx images. | — |
| 4–7 s | Barnard's Star blinking A ↔ B | Real images, 2010 and 2026: Barnard's Star moved. | Years read from the two frames' own labels while recording: "A · AllWISE 2010", "B · Aug 22, 2026" |
| 7–13 s | The Pluto reveal: evaluation image, training track, frozen 95% region with "Frozen in git b2df072 on 2026-11-14 14:49 UTC" | We locked a Pluto forecast in GitHub before opening the newest images. | `trials/pluto-position-2026b` (prospective; team confirmation pending, shown on screen) |
| 13–19 s | The straight line far away, the observed position, the verdict "Miss, D = 2.60 > 2.45" | 6 arcsec off: 3,000x closer than a straight line, but just outside our 95% region. A published miss. | `verification.json`: model 5.90″ (D² 6.77 > 5.991); straight line 19,870″ (5.52°), 3,368× farther |
| 19–23 s | "Why we missed" on the Pluto card, then the open 2027 forecasts | We found why, and froze new forecasts for 2027. | `trials/pluto/postmortem.json`; open forecasts for 2027-04-25 and 2027-09-29 |
| 23–27 s | Planet X Lab, "Measured by TENGER", the headline and the first curve | Could SPHEREx see Planet X? We measured it: for the nominal Planet Nine, one image is 4 to 7 magnitudes too shallow. | `planetx/depth.json`: the nominal Linder & Mordasini planet is 4.36 (0.8 µm), 5.32 (3.4 µm) and 7.28 (4.6 µm) mag below one exposure's 50% depth |
| 27–30 s | Title card: TENGER: Predict the Sky, nama2323.github.io/tenger, the team, "Data: NASA SPHEREx via NASA/IPAC IRSA" | (the card's own text) | README team line |

Two captions differ from the first brief:
- **Shot 2:** the site has no 2MASS frames, so the blink is AllWISE 2010 against SPHEREx 2026 (the user's
  replacement text).
- **Shot 6:** adds "for the nominal Planet Nine". 4 to 7 magnitudes is the nominal planet; the closest published case
  (280 AU) is only 0.36 mag short and one exposure would catch it about 1 time in 4, as the page itself says.

While recording, every shot's page was checked:
- no exception;
- no request to `dev-fixtures` or onrender.com;
- the page HTML names neither the base project nor its author.

B9 re-make: `make-video.mjs` as of commit d707691 (the script now makes the B21 video).

Silent clips of the **public site** (no `?fixtures`, real data only), recorded on 15 Nov 2026 from a local
server with `record.mjs` in this folder. Every clip: MP4, H.264 (High), yuv420p, 1280×720, 30 fps, no audio.
During recording the page made no request to `dev-fixtures` and threw no error (`clips.json`).

| Clip | Length | Size | What it shows |
|---|---|---|---|
| `a-home-3d.mp4` | 5.7 s | 1.06 MB | Home in 3D: the Solar System scene (planet orbits from JPL elements, the Kuiper Belt, the hypothetical Planet Nine only as faint published ranges, stars on an outer shell, "Distances not to scale"), a slow turn, then the camera flies to Pluto and its investigation opens. The page clock is stepped by hand, one frame per 1/30 s, so the motion is smooth on software WebGL. |
| `b-predictions.mp4` | 6.1 s | 1.30 MB | Predictions: the scoreboard as counted in scoreboard.json, the frozen-prediction cards (Barnard's Star and ε Indi B hits, the Pluto miss), "Why we missed" opening on the Pluto card (labelled exploratory, after the reveal), then the open Pluto v2 forecasts ("check back when IRSA releases the data"). |
| `c-game-epsindib.mp4` | 6.3 s | 0.14 MB | Beat the physics, ε Indi B: the chart in offsets from the last measurement with dated groups of dots; Hint 1 (direction arrow) and Hint 2 (30-day straight-line ruler to the target date); a typed guess; lock; the reveal of the straight line, the frozen physics model with its region, and the real observation. |
| `d-planetx-lab.mp4` | 5.3 s | 1.03 MB | Planet X Lab, "Could SPHEREx see Planet X? We measured it": the "Measured by TENGER" chip, the headline with our depths ("one exposure would catch it about 1 time in 4", re-recorded after the wording fix), the 17-of-18 sentence with the interpolated 28%, then the WISE W1 band (array D4) recovery curve with its 95% band, the 50% and 90% depths, numbered published predictions and the WISE limit. |
| `e-hidden-planet.mp4` | 6.0 s | 0.16 MB | Find the hidden planet (pair 1, ε Indi B field, I band): the two real frames blink with the "Artificial planet added for this game" label, a tap near the moving dot, Check my guess: where the planet was put in both frames, "2.0 pixels × 3″ = 6.0″", the pipeline's result, and "not a detection, never counted outside this game". |
| `f-asteroid-batch.mp4` | 5.5 s | 0.82 MB | Predictions, the asteroid batch after Session A's check (`9cf2bfd`): "1 of 1 landed inside our 95% regions", "Of all 8 asteroids: 1 inside its 95% region; 4 ambiguous (not counted); 3 insufficient data (not counted)", "far too few to test", the second model and the straight line counted apart, the exploratory JPL line; then the cards (frozen forecast regions, the reason each was not scored, JPL after the verdict, and 345 Tercidina inside its region). Recorded 15 Nov after the verification. |

## Re-recording

```bash
node docs/screens/demo/record.mjs http://localhost:8766 docs/screens/demo
```

Needs Google Chrome, ffmpeg and Node 22+; name clips after the folder to record only those
(`... docs/screens/demo b-predictions e-hidden-planet`). Page clips use Chrome's screencast, timed by arrival,
resampled to a constant 30 fps; the 3D clip steps the page clock. If a clip would exceed 2.9 MB the encoder
raises the CRF. The first frame of each page clip is the page already loaded and scrolled into place; it counts from the start of recording (a still page sends its first frame late), which (f) needed and which leaves clips a–e unchanged until re-recorded.
