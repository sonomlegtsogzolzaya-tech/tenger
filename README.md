# Vestigium: see, predict and learn with NASA SPHEREx

**NASA Space Apps Challenge — Global Nominee**

**Website:** [vestigium-82p.pages.dev](https://vestigium-82p.pages.dev)

The repository and the web address keep the project's earlier working name, `tenger`.

A web app for the NASA Space Apps 2026 challenge "Planet X and SPHEREx". It shows real SPHEREx
images of a patch of sky changing over time, makes forecasts that are frozen before they are
checked, and keeps score honestly, misses included.

- **See:** the five challenge targets (Barnard's Star, WISE 0855, Epsilon Indi B, RW Aurigae and
  R Draconis), plus Makemake, Pluto and comet 3I/ATLAS. Images come from SPHEREx DR1 and QR3. You can
  blink between two dates, view them side by side, swipe, or (only where the wavelengths, image sharpness
  and alignment all match) see a difference image. Every picture says when, at what wavelength and
  from which release it was taken.
- **Predict:** forecasts are frozen in git before the data are opened, then checked against the new
  observations with a fixed rule (95% region, D² ≤ 5.991). The scoreboard shows every outcome.
- **Learn:** a "Beat the physics" game built from the real forecasts, three printable lessons
  (distance, brightness, how sure we are) and a Planet X Lab. Planet Nine is shown only as a
  hypothesis.

## Results so far (honest version)

| Target | Trial | Result |
|---|---|---|
| Barnard's Star | Position, newest visit held out. **Retrospective** (the data had been seen) and catalogue-assisted (Gaia parallax) | **Hit**: error 1.52″, D² 2.62. Measured proper motion 10.42 ± 0.33″/yr; Gaia gives 10.393″/yr |
| Epsilon Indi B | Position, retrospective and catalogue-assisted | **Hit**: error 0.076″, D² 0.21. Proper motion 4.668 ± 0.043″/yr; the catalogue gives 4.684″/yr |
| Pluto | Position on 2026-10-01. **Prospective**: the visit was unopened when we froze the forecast. The other teammates' confirmation is still pending | **Miss**: error 5.90″, D² 6.77 against 5.991 |
| Makemake, WISE 0855, RW Aurigae, R Draconis | Frozen as **insufficient data** | No usable training detections (Makemake), every position contaminated by a neighbour star (WISE 0855), or saturated in every exposure (RW Aur, R Dra) |
| 3I/ATLAS | See only | Never a forecast |

The straight-line baseline missed all three checked trials. Two hits that were retrospective and
catalogue-assisted are demonstrations, not independent proof. Three checked trials cannot establish
that our 95% regions are calibrated.

**Why Pluto missed** (`docs/postmortem-pluto.md`, exploratory). We found Pluto: it is 0.35″ from JPL
Horizons. Our two-visit orbit forecast was 6.2″ off, mostly along Pluto's path. The main cause was
uncertainty: we treated 50 detections as independent, but they come in only six visit × detector
groups whose errors are shared. With that included, the same miss would have been inside the 95%
region. A smaller part came from fitting around the Sun instead of the solar system's centre of mass.

**Open forecasts** (shown, never counted until IRSA releases the data):
- Pluto, April 2027: v1 (the original method) and v2 (made after the miss with its lessons).
- Pluto, September/October 2027: v2.
- Makemake: frozen as insufficient data.

**Could SPHEREx see Planet X? We measured it** (`docs/planetx-depth.md`). We added 40,000 artificial
sources to 126 real exposures of already-opened fields, then ran the site's own detection on them.
- One exposure finds half of them at AB 17.1 (0.8 µm), 17.5 (3.4 µm) and 16.2 (4.6 µm). It never
  produced a false detection in 2,135 blank tests.
- The nominal Planet Nine of Linder & Mordasini (2016) would be 4.4–7.3 magnitudes fainter.
- A real search must stack many exposures along the planet's path; the WISE + NEOWISE search
  (Meisner et al. 2018) already goes deeper.

The game's "hidden planet" rounds use these artificial sources and are labelled as such.

**Blind asteroid forecasts** (`docs/asteroid-batch.md`):
- **Selection and freeze.** Eight main-belt asteroids were chosen by a rule committed before it ran.
  Their positions were forecast from our own SPHEREx measurements only, and the forecasts were frozen in
  git before any evaluation image was opened.
- **Scored.** One forecast could be checked under the frozen rules: a hit, 6.5″ off, inside its 95%
  region. Calibration is 1 of 1 (95% interval 0.025–1.0), too few to test anything.
- **Not scored.** The other six were not recovered: four ambiguous, two with too few detections.
- **After the verdicts.** JPL's positions lay inside all seven frozen regions. The recovery failed
  because SPHEREx flags moving asteroids as "outlier" pixels and our frozen rules discarded those pixels.
  We report that as the lesson, and the verdicts stand.

## Run it locally

```
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn backend.api:app --host 0.0.0.0 --port 8765
```

Open http://localhost:8765 (or http://<your-computer's-IP>:8765 from a phone on the same Wi-Fi). The
prepared targets open from `static/data` without a network connection. Typing other coordinates
downloads live SPHEREx cutouts from IRSA.

Checks:

```
.venv/bin/python -m pytest                    # science and data tests (add --network for live checks)
node --test tests/*.mjs                       # web tests
.venv/bin/python -m scripts.validate_release  # production validator for static/data
.venv/bin/python -m scripts.predict check     # hash chains of every frozen forecast
```

How the data were made: `docs/IMPLEMENTATION_STATUS.md` (every step, command and result),
`docs/DATA-CONTRACT.md` (file formats), `docs/EXPOSURE.md` (who opened which data, and when) and
`docs/RELEASE.md` (release checks).

## Limitations

- Positions use a simple bell-shaped star model, not the full SPHEREx PSF. Two sources closer than
  about 15″ are not separated.
- Very bright stars saturate SPHEREx (Barnard's Star, RW Aurigae, R Draconis), so their brightness
  cannot be measured.
- Wavelengths come from the approximate lookup table in each file (about 1 nm). Our tolerance for
  "same wavelength" (same detector array, centres within 10% of the narrower bandwidth) is our own
  choice, not an official one.
- For Barnard's Star and Epsilon Indi B, a parallax measured from SPHEREx alone disagrees with Gaia,
  so the forecasts fix the Gaia value. Visit-to-visit errors are not fully modelled.
- The Pluto forecasts rest on two or three visits. Pluto's miss is listed as prospective but marked
  pending until all four teammates confirm they never viewed its evaluation visit. One teammate saw
  that visit's archive listing (which may include JPL-predicted positions), never its pixels. The
  forecast did not use it (`docs/EXPOSURE.md`).
- On the public GitHub Pages site the prepared targets work offline. Live search for other
  coordinates needs the Vestigium server (run it locally), so it is switched off there with a note
  (see `docs/RELEASE.md`).

## Data credits and DOIs

- **NASA SPHEREx** (DR1 and QR3 Level 2 spectral images, doi:10.26131/IRSA678; the DR1 spectral cube
  is doi:10.26131/IRSA679 and is not used). "This publication makes use of data products from the
  Spectro-Photometer for the History of the Universe, Epoch of Reionization and Ices Explorer
  (SPHEREx), which is a joint project of the Jet Propulsion Laboratory and the California Institute
  of Technology, and is funded by the National Aeronautics and Space Administration."
- **NASA/IPAC Infrared Science Archive.** "This research has made use of the NASA/IPAC Infrared
  Science Archive, which is funded by the National Aeronautics and Space Administration and operated
  by the California Institute of Technology."
- **2MASS** Point Source Catalog (doi:10.26131/IRSA2) and **WISE/AllWISE**, as context only.
- **ESA Gaia DR3**, processed by the Gaia DPAC.
- **SIMBAD** and **VizieR** (CDS Strasbourg, doi:10.26093/cds/vizier), reached through the CfA mirror
  while CDS was down.
- **JPL Horizons** and the **JPL Small-Body Database**.
- **Aladin Lite** (CDS) and **Astropy**.
- **Planet Nine:** ranges quoted from Batygin & Brown 2016 (doi:10.3847/0004-6256/151/2/22), Brown &
  Batygin 2016 (doi:10.3847/2041-8205/824/2/L23), Batygin et al. 2019
  (doi:10.1016/j.physrep.2019.01.009), Brown & Batygin 2021 (doi:10.3847/1538-3881/ac2056) and Brown,
  Holman & Batygin 2024 (arXiv:2401.17977).

The About page lists every source and acknowledgement in full.

## Team

Narmandakh Garam, Erkhes Orgil, Anu-Ujin Bayarbaatar, Sonomlegtsog Zolzaya.

## What existed before Space Apps, and what we built

This repository started from open-source code (MIT licence; see Licence below and `LICENSE`). We reused
its viewer, plate renderer, stacking code and archive client.

**Before the hackathon:** that code's own 43 commits, 6–9 Nov 2026, including merges and an automated
frame-baking job. No Vestigium-specific commit is older than the start (14 Nov 2026, 09:00 Ulaanbaatar time).
The first is `58f993b` at 19:01 that day. Times are author times: some later commits were rebased, so their
commit times are a few minutes later.

**Built during the hackathon** (every commit from `58f993b` on), in plain words:

- **Checks on SPHEREx data:**
  - quality flags decoded;
  - DR1 and QR3 images found and named by release;
  - images compared only when the wavelengths really match (never the "nearest" channel);
  - catalogue lookups with a fallback mirror.

  (`79f30c3`, `763237b`, `eebea63`, `dbe4664`, `facefe2`)
- **An investigation file for every target, rebuilt from the original exposures:** Barnard's Star, WISE 0855,
  Epsilon Indi B, RW Aurigae, R Draconis, Makemake, Pluto, and 3I/ATLAS (See only). Each one says plainly
  when the data cannot answer (`49aa871`, `1c6715a` to `e815234`).
- **The Vestigium website:**
  - the Home map and the 3D scene;
  - the investigation panels;
  - difference images only where the checks allow them;
  - the design, the guided tour, the embed code and the About credits.

  (`0b49024`, `61558c8` to `a31e7b4`, `98ed7fc`, `16da115`, `08d6898`)
- **Forecasts frozen in git before checking, then scored:**
  - nine trials frozen, three checked;
  - the scoreboard and the "Watch the reveal" replay;
  - an exploratory look at the Pluto miss;
  - open Pluto forecasts for 2027.

  (`1edb723` to `9f1641c`, `b8a10e4`, `8aa29bd`, `0c1f113` to `41e8a16`, `46b4dbb`)
- **The "Beat the physics" game** built from those forecasts, with hints and a fix that stops it showing the
  answer early (`15b2846`, `a422795`, `74eb2db`).
- **Three printable lessons and the Planet X Lab:**
  - "Could SPHEREx see Planet X? We measured it": artificial planets added to real images to measure how faint
    one exposure can see;
  - the "Find the hidden planet" round.

  (`49d4d89`, `665a06c`, `d812de0`, `f1d0cc4`, `014b6c7`)
- **A batch of eight asteroid forecasts:** rules written first, forecasts frozen, then checked (`b9ef625` to
  `9cf2bfd`).
- **Release work:** validators, link and page checks, demo clips (`5f7efe7`, `e93e9a5`, `801c783`).

## AI disclosure

Planning and audit were done with OpenAI Codex and Claude. The implementation was written with Claude
Code. The team reviewed the work, made the decisions and is responsible for the result.
