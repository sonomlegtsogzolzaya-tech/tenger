# TENGER implementation status

A status file is not a claim of completion. Each entry gives what ran, with what result, and what is
still open. Session A edits only "Science/data". Session B edits only "Web".

**Correction (15 Nov 2026):** entries below that call SPHEREx Blink "the team's earlier project" or pythonhack000 a "teammate" are wrong; it is the open-source code this repository started from (MIT, see LICENSE), and the entries are left as written.

---

## Science/data (Session A)

### Current phase

**Phase H data checks done (Task H2); Planet X depth measured (A8, V12); asteroid batch frozen and verified
(A9, V13).** Release work continues on `tenger-dev`; the user fast-forwarded `main` to `8fea8b9` at 05:57 UB.
`bake.yml` disabled on GitHub. Open: three teammates' confirmation for Pluto; updating `main`; making
the repository public and enabling Pages (`docs/RELEASE.md`).

### Task A10, 15 Nov 2026 (integrity audit, Planet X wording, batch contract, submission numbers)

| Part | Files | Result |
|---|---|---|
| Integrity audit | `scripts/audit_integrity.py`, `docs/audit-integrity.md`, `tests/test_audit.py` | From git and files only. **21 trial folders pass, 7 asteroid-batch checks pass, 0 fixes needed.** Checked: prediction and receipt commits are ancestors of, and earlier than, the first commit adding any evaluation-derived file; receipt hashes and committed bytes; every D² recomputed from verification.json (largest difference 0.0003, rounding); verdicts match the scoreboard. For Pluto and the asteroids, the earliest evaluation cutout on disk is later than the prediction commit. Rules, model code and both amendments (`3dfd962`, `4d7a076`) are ancestors of the freeze `61b3cb7` and earlier than it |
| Planet X wording | `scripts/strings_en.py`, `planetx/depth.json` (regenerated, unchanged apart from timestamps) | `planetx.verdict.partial` reads "Partly within reach: one exposure finds about {percent}% …". The threshold is ≥ 5%, as on the website (no row sits at exactly 5%). 17 too-faint rows, 1 partial (lm16-280au-i, 28%) |
| Batch contract | `docs/DATA-CONTRACT.md` V14; `batches/asteroids-2026a.json` now contract 14; validator latest 14 | The batch format as produced, field by field, against Session B's B6 proposal (renamed fields, additions) |
| Submission numbers | `scripts/submission_numbers.py` → `docs/SUBMISSION-NUMBERS.md` | 46 lines, each generated from its file and field, nothing typed by hand |

**Checks:** `pytest` 207 passed, 2 skipped; `node --test` 207 passed (after rebasing on Session B's `1a4f27a`);
validator 120 files, 0 failures; audit exit 0.

**User decisions, 15 Nov:**
- The base code is named only in README's Licence line; LICENSE and git history are unchanged. The
  `credit.base-project` key was removed (`5bfa3d3`).
- The exploratory 7-of-7 Horizons result stays on the site and in the submission text. It is always
  labelled exploratory, never the calibration.
- The team statement for the asteroid batch and Pluto will come later today.

### Task A9, 15 Nov 2026 (blind asteroid batch with a calibration result; contract V13)

| Step | Files and commits | Result |
|---|---|---|
| Rules first | `docs/asteroid-batch.md`, `scripts/asteroids.py` (`b9ef625`, 02:40 UB) | The selection rule, training, models, freeze-then-verify, scoring and calibration were committed and pushed before the selection ran. The user's MOST integrity rule is in `docs/EXPOSURE.md`: evaluation rows are cut to identifiers and times in memory, the star check is blind, and raw tables are saved only after the freeze. 1000 Piazzia was excluded (its full table had been fetched during a feasibility test). |
| Selection | `docs/exposure/asteroids/selection.json` (`0def564`, 02:55 UB) | JPL SBDB numbered MBAs with 9 ≤ H ≤ 11, by H. MOST footprint rows; ≥ 3 DR1/QR3 visits; training-visit V 11.5–16; blind 15″ star check (Gaia G < 18, AllWISE W1 < 15). 32 examined; first 8: 491, 1021, 363, 714, 345, 286, 162, 379 |
| Model code before data | `scripts/asteroid_forecast.py` (`8268808`) | v2 `MethodV2` with the frame as a parameter; start from our first-visit motion over a 0.8–4.0 AU grid; synthetic N-body model error (24 orbits with our fitted a, e, i; Sun + 4 giants); spacecraft term |
| Amendments before the freeze | `3dfd962` 05:52, `4d7a076` 05:53, `8fea8b9` (timestamps corrected) | The user chose the heliocentric primary for every object (barycentric v2 χ²/dof 332 on 345; heliocentric 4.5) and stated the one-rule wording. Barycentric v2 is the frozen secondary. C_fit is the largest of MC, jackknife and the χ²-scaled formal covariance, per axis; resampling won on every axis of every object |
| Training | `cache/asteroids/<n>/training-measured.json` → `trials/asteroid-<n>-position/training.json` | Every training exposure from MOST (2,041 cutouts). A3 fit, S/N ≥ 10, ≤ 3″ from MOST, no Gaia G < 18 within 12″. Kept per object: 97, 81, 92, 159, 80, 43 (286: visit 2 dropped), 51, 59 |
| Freeze | `61b3cb7` "predict: freeze asteroid batch" (06:03 UB), receipts `ffe833f`, raw MOST + integrity test `358d487` | Primary heliocentric 95% regions from 16″ × 10″ to 286″ × 22″; 286 frozen insufficient. The integrity test (both coordinates of any evaluation row, whole numbers) passes |
| Verification | `9cf2bfd` (06:36 UB) | 345 hit (D² 0.12, 6.5″); 491 and 1021 insufficient; 363, 714, 162, 379 ambiguous; 286 insufficient. **Calibration 1 of 1 inside (Clopper–Pearson 0.025–1.0)**. Secondary 1/1; straight line 0/1 (3.1° off) |
| After the verdicts (exploratory, not counted) | `verification.json` `horizons_after_verdict`; `docs/exposure/asteroids/exploratory-outlier.json` | JPL Horizons lies inside the frozen primary 95% region for 7 of 7 (median errors 3.4–62″). Cause of the failures: SPHEREx flags moving asteroids' pixels OUTLIER and `tenger-mask-v1` rejects them. With only OUTLIER kept, 491 and 1021 become hits (D² 0.08, 1.94; measured − Horizons ≤ 0.2″); 363, 714, 162 and 379 stay ambiguous (large regions, one static reference) |
| Site data | `batches/asteroids-2026a.json`, `scoreboard.json` `asteroid_batch`, `index.json` `batch_paths`, strings (196 keys) | Batch trials are kept out of the per-category counts. Validator: 120 files, 0 failures |

**Checks:** `pytest` 203 passed, 2 skipped (network); validator 120 files, 0 failures;
`predict check` all trials intact; `tests/test_asteroids_integrity.py` passes after the freeze.

**Limits:**
- N = 1 scored, so calibration is not tested.
- The team statement is pending for all eight objects.
- Training identification was guided by JPL positions; the fit and the forecast used none.
- The synthetic model-error fits start from the true orbit, so they may understate fit failures.
- Static rejection uses one reference image.
- Planet X wording follow-up (Session B's request): `planetx/depth.json` verdicts carry
  `recovered_fraction`. One row is `planetx.verdict.partial` (28%); the summary matches the website
  (`f1d0cc4`).

### Task A8, 15 Nov 2026 ("Could SPHEREx see Planet X? We measured it."; contract V12)

| Part | Files | Result |
|---|---|---|
| Injection-recovery library | `backend/injection.py` (new) | Reads the DR1/QR3 `EPSF` table (21 × 21 zones, 5× oversampled, "x-fast then y"). Picks the zone whose centre is nearest the source (parent pixel via `CRPIX1A/2A`, as in IRSA's tutorial). Injects unit-flux ePSF × F_ν ÷ pixel solid angle into an in-memory copy of IMAGE. Recovers with the site's `astrometry.fit_position` at S/N ≥ 5 within 1 px; the threshold is set only during the call, and the file is unchanged because its hash belongs to frozen forecasts. Also: ePSF photometry, Wilson intervals, isotonic completeness depths. The task's rule `iplane = y·11 + x + 1` (121 zones, 10×) describes the older QR1/QR2 PSF cube. It is the same x-fast ordering, with the DR1 grid size |
| Measurement run | `scripts/planetx.py` (new) | 7 exposed fields (5 challenge fields, Pluto and Makemake training visits) × 3 bands (0.75–0.87 µm D1, 3.25–3.55 µm D4, 4.45–4.75 µm D6) × 6 exposures = 126. Re-downloaded with EPSF; all 126 SHA-256 equal the investigations' `source_sha256`. Catalogue exclusion uses Gaia DR3 + AllWISE within 15″ (VizieR CfA mirror; IRSA TAP gave 502 and timeouts). **40,066 injections and 2,135 blank controls**, deterministic (seed 20261115), about 30 s on 6 processes |
| Outputs | `scripts/planetx_build.py` (new), `static/data/planetx/depth.json`, `planetx/hidden-planet.json`, `planetx/hidden/*.webp` | Curves with 95% Wilson intervals, 50%/90% depths per field and pooled, false-detection rates, ZODI per field, published comparison values with locations, motion from the observer's geometry, verdicts, and a stacked-depth *projection*. Four hidden-planet pairs. Everything is `"artificial": true`, `"counts": false` |
| Published numbers | `docs/planetx-depth.md` | Read in the papers themselves:<br>• Linder & Mordasini 2016 (abstract, Sect. 4.2): I 21.0, W1 20.1, W2 20.1 at 700 AU, plus their 1/r⁴ rule for 280 and 1120 AU (no I/W1/W2 for other masses).<br>• Fortney et al. 2016, Table 2 (622 AU): W1/W2 for 40 and 50 K and three methane abundances; system not stated, read as Vega (labelled).<br>• Meisner et al. 2018: W1 < 16.7 (90%).<br>• WISE Vega→AB offsets +2.699 and +3.339; I +0.45 (Blanton & Roweis 2007, Table 1).<br>• SPHEREx pre-launch per-channel full-mission and single-visit values (Public-products file; Crill et al. 2025) |
| Contract V12, strings | `docs/DATA-CONTRACT.md`, `scripts/strings_en.py` → `strings.en.json` (182 keys) | Artificial content is allowed only under `planetx/`. Every text key in the planetx files exists |
| Validator | `scripts/validate_release.py` | Artificial nodes outside `planetx/` fail. Files under `planetx/` need top-level `artificial: true`. Every image there must be referenced. Curves must equal their counts (Wilson, fractions, depths). Models need reference, DOI or URL, and location. The stacked depth must be labelled a projection. String keys must exist |
| Exposure record | `docs/EXPOSURE.md` | Nothing new opened (127 already-exposed exposures re-downloaded, identical bytes) |

**Results (pooled 50% single-exposure depth, AB):**
- 0.8 µm: **17.09** (17.01–17.18).
- 3.4 µm: **17.48** (17.40–17.54).
- 4.6 µm: **16.16** (16.11–16.20).
- 90% depths: 15.40, 16.03 and 15.40.
- False detections: 0 of 705, 0 of 713 and 0 of 717 blanks (≤ 0.5%).

**Checks:**
- **PSF mapping:** the nearest zone fits better than the swapped zone for 483 of 789 isolated stars
  (61%, 95%: 58–65%), and for 75% at 0.8 µm. The zone choice moves the depth by ≤ 0.11 mag.
- **Flux scale:** the median recovered flux is 97.0%, 96.6% and 99.5%.
- **Realism:** the site's fit finds real stars like injections where both are bright.

**Verdict:**
- The nominal Planet Nine (Linder & Mordasini, 700 AU) is 4.4 / 5.3 / 7.3 mag too faint for one exposure.
- Closest cases: the same planet at perihelion at 0.8 µm (0.4 mag) and Fortney's brightest 50 K
  methane-poor case at 3.4 µm (1.3 mag).
- One exposure is 1.9 mag shallower than the WISE + NEOWISE W1 limit.
- Within one visit the planet moves 1–790″ (300–1000 AU), so only a shift-and-stack search could
  reach deeper.

**Checks run:**
- `pytest tests/test_injection.py tests/test_validate_release.py`: 16 passed (PSF mapping on a real
  fixture, inject-then-measure, faint non-recovery, blank controls on noise, Wilson values,
  completeness, in-memory only, validator rules).
- Full-suite results are in the commit report.

**Limits:**
- Single exposures in one channel each.
- The site's Gaussian detector is about 1 mag shallower than an optimal ePSF fit.
- The injected sources' photon noise was not added.
- Six exposures per field and band.
- Broad-band model magnitudes are compared with narrow channels (direction stated per band).
- The new test fixture `tests/fixtures/spherex_spherex_dr1_2025W46_1A_0076_2_D6_epsf.fits.gz` is a real,
  exposed WISE 0855 cutout. Its ePSF planes outside the 3 × 3 zones around it are zeroed (recorded in
  its header).

### Task H2, 15 Nov 2026 (release checks for data and science; fix, don't add)

| Part | Files | Result |
|---|---|---|
| Production validator | `scripts/validate_release.py` (new), `tests/test_validate_release.py` (new, 4 tests) | Runs on `static/data`. It checks known kinds, major version 1 and a contract version not older than the kind (stale files fail), and rejects any `"example": true`. Artificial content must be `synthetic`, and real lesson inputs need a source. It requires source metadata (observation URLs and SHA-256, measurement method/value/σ, catalogue sources, sourced index distances, `derived_from` hashes, scene sources and Planet Nine references). Hash chains: `predict.check`, each `prediction.json` byte-equal to the copy in its receipt commit, model code hashes (v1 files; v2 trials use `forecast_v2.code_sha256`) and verification → prediction hashes. Every JSON in `static/dev-fixtures` must carry `"example": true`, because fixtures ship with `static/`. Legacy viewer files (`targets.json`, `results.json`, `meta.json`, `sky/`, `gaia/`) are listed, not validated. **Result: 77 contract files, 0 failures** |
| What it found | `static/data/lessons/how-sure.json` | `derived_from` still held the scoreboard hash from before A7's rebuild. Regenerated with `python -m scripts.build_records`; only the hash changed |
| Numbers on the site against their sources | validator `check_numbers` | The scoreboard equals a fresh `build_scoreboard.build` run. Game rounds and lessons equal a fresh `build_records` run. Index statuses follow the verifications, and index distances equal 1000/parallax. Post-mortem and hindcast numbers match the frozen verification. In `scene3d.json`, the frozen forecast, observed position, training count, star distances and our-orbit labels match their files. Session B's hard-coded figures in `js/i18n.js` (Gaia 10.4″, pixel 6.2″) agree with the data. **No mismatches** |
| README | `README.md` | Rewritten for TENGER: See/Predict/Learn; results (2 retrospective catalogue-assisted hits, the prospective Pluto miss and its post-mortem cause, 4 insufficient-data trials, open forecasts never counted); how to run and check; limitations; data credits and DOIs (matching the About page); team; SPHEREx Blink base (MIT); AI disclosure |
| No automatic rebake | `.github/workflows/bake.yml` | `schedule` removed, `workflow_dispatch` kept. Scheduled workflows run from the default branch, so `main` keeps the weekly schedule until it is updated (next run would have been Mon 16 Nov 04:17 UTC, 12:17 UB). On the user's go-ahead the workflow was then **disabled on GitHub** (`gh workflow disable bake.yml -R Nama2323/tenger`; state `disabled_manually`; `pages.yml` still active) |
| Pages check | `.github/workflows/pages.yml` (unchanged) | Uploads `static/` on a push to `main` that touches `static/**`, or on manual dispatch. `static/` is 139 MB, 1,461 files, none over 50 MB, no symlinks, only relative paths. Simulated by serving a copy of `static/` alone from `/tenger/` with no backend: Home (3D), Barnard's Star in See, Predictions and the scoreboard load. The only 404s are the expected `verification.json` files of unverified trials. On `*.github.io`, live search calls the Render service, whose CORS allows only `pythonhack000.github.io` (not changed: team decision 6). Repository private, Pages not enabled (API 404) |
| Release notes | `docs/RELEASE.md` (new) | Acceptance matrix, known limits, local run command, and the exact steps for the team to make the repository public and deploy Pages (not done here) |

**Checks (after rebasing on Session B's `16da115`):** `pytest` 179 passed, 2 skipped (network);
`node --test tests/*.mjs` 152 passed, 0 failed; `python -m scripts.validate_release` 0 failures;
`python -m scripts.predict check` 13 of 13 intact.

**Not done (by instruction or outside this task):** nothing pushed to `main`, no tag, no deploy, no
repository setting changed except disabling `bake.yml` (approved by the user after H2). Session B's request to add `n_exposures`/`n_visits` to `postmortem.json`
was declined in H2. `scripts/postmortem.py` is part of the code hash of the frozen v2 open forecasts,
so changing it would break their hash chain, and H2 is fix-only.

### Task A1, 14 Nov 2026 (git base `58f993b`, branch `tenger-dev`)

**Environment**

- Python 3.12.14 (`/opt/homebrew/bin/python3.12`) in `.venv`. `requirements.txt` installed unpinned.
  Resolved versions: astropy 8.0.2, numpy 2.5.4, scipy 1.18.1, fastapi 0.162.7, uvicorn 0.54.0,
  httpx 0.28.1, pillow 13.0.0, pytest 9.2.0. No lock file exists yet.
- Node.js was not installed on this Mac. Installed `node` v26.13.1 with Homebrew to run the JS tests.

**Baseline (before any change)**

| Command | Result |
|---|---|
| `.venv/bin/python -m pytest` | **54 passed** (11.7 s) |
| `node --test tests/*.mjs` | **39 passed, 0 failed** |
| `.venv/bin/uvicorn backend.api:app --host 0.0.0.0 --port 8765` | Started. `GET /` 200 |
| Browser, `http://localhost:8765/?target=<key>` for barnard, wise0855, epsindib, rwaur, rdra | All five open from bundled data. `meta.json`, `frames.bin.gz`, thumbnails 200. Name, motion box and date strip render |
| Browser console | Non-fatal: `data/sky/Moc.fits` 404. Aladin Lite 3.8.2 logs `ERR_NAME_NOT_RESOLVED` / `Failed to fetch` from an external call inside `createSky` (`static/js/sky.js:36`). The sky tiles still load |
| `/api/resolve?q=Vega` | 200 in 15.8 s: the CDS Sesame call times out (12 s), then the CfA mirror answers |

After A1 changes: **59 passed** (54 + 5 new in `tests/test_exposure_inventory.py`). JS: 39 passed.

**Network from this Mac (14 Nov 2026, about 11:20 UTC)**

| Service | Probe | Result | Blocks if down |
|---|---|---|---|
| IRSA SIA v2 | `SIA?COLLECTION=spherex_dr1&POS=…&RESPONSEFORMAT=CSV` | 200, 1.2 s | Archive discovery, live mode, bake |
| IRSA SIA self-description | `MAXREC=0` | 200. Collections: `spherex_dr1`, `spherex_dr1_cube`, `spherex_dr1_deep`, `spherex_qr3`, `spherex_qr3_deep` (QR2 no longer listed) | Release discovery |
| IRSA TAP | `TAP_SCHEMA.tables` for schema `spherex` | 200, 0.8 s (`spherex.obscore`, `observation`, `plane`, …) | Metadata joins, Gaia overlay (`gaia_dr3_source` 200, 9 s) |
| IRSA cutouts | DR1 `2025W33_2C_0321_1` D6, Barnard, 0.02° (an already-exposed frame) | 200, 3.95 MB `application/fits`, `SIMPLE = T`, 18 s. Only the header card was checked | Live frames, bake, every new measurement |
| IRSA AllWISE IBE / HiPS | `p3am_cdd` search, HiPS `properties` | 200 / 200 | WISE context, sky map |
| JPL Horizons API | Pluto, 2026-11-14 to 15, geocentric | 200, 1.0 s | Makemake/Pluto ephemerides, Solar System checks |
| SIMBAD (CDS, Strasbourg) | `sim-tap/sync` and `sim-id` | **404 "This page is currently unavailable"** | — |
| SIMBAD (CfA mirror) | `simbad.cfa.harvard.edu/simbad/sim-tap/sync` | 200, 1.8 s | Use instead of CDS while CDS is down |
| VizieR (CDS) | `vizier.cds.unistra.fr/viz-bin/asu-tsv` | **404**. TAPVizieR timed out (60 s) | `config.VIZIER_URL` points here (not referenced by any current code path) |
| VizieR (CfA mirror) | `vizier.cfa.harvard.edu/viz-bin/asu-tsv` | 200, 2.1 s | Use for VSX/AllWISE catalogue lookups |
| Sesame (CDS / CfA) | name lookup | CDS: timeout, 60 s. CfA: 200, 1.0 s | Name search (falls back to CfA, slow) |
| 3I/ATLAS page and table | `comet3iatlas/index.html`, `obscore_3I_Atlas.vot` | 200 / 200 (259 rows) | Comet See view |

**Exposure inventory** (`docs/EXPOSURE.md`, `docs/exposure/*.json`, generator
`scripts/exposure_inventory.py`, metadata only)

- Exposed = every obs_id in any committed `meta.json` (2–7 versions per target), the 1,241 processed
  `.npz` frames (all also bundled at some point) and the audit's one DR1 cutout.
- For all five challenge targets, the newest DR1/QR3 observation in the archive is already exposed.
  The 9 Nov bake took everything released then. Never-opened exposures exist only inside visits that
  also contain exposed frames. So no `prospective_unexposed` trial is possible for a challenge
  target with current data. `retrospective_holdout` is possible.
- Makemake (184 obs_ids, 4 visits) and Pluto (120 obs_ids, 5 visits) have no exposed pixels. Each
  can support a prospective trial if the team confirms nobody opened them. If the model uses an
  orbit or ephemeris prior, the trial is `catalogue_assisted`. Detection itself is unvalidated.
- 3I/ATLAS: 259 table rows, 133 obs_ids (Aug and Dec 2025). See-only.

**Data contract**: `docs/DATA-CONTRACT.md` version 1 covers the site index, investigation, trial,
prediction, receipt, verification, scoreboard, game round and lesson. Enums, paths, one example each
(all JSON examples parse; all carry `"example": true`).

**Files added in A1**: `docs/EXPOSURE.md`, `docs/exposure/{summary,barnard,wise0855,epsindib,rwaur,rdra,makemake,pluto,3i_atlas}.json`,
`docs/exposure/SHA256SUMS`, `docs/DATA-CONTRACT.md`, `docs/IMPLEMENTATION_STATUS.md`,
`scripts/exposure_inventory.py`, `tests/test_exposure_inventory.py`. No application file changed.

### Task A7, 15 Nov 2026 (Pluto open forecast v2 with the post-mortem's lessons)

**Method v2** (`scripts/forecast_v2.py`):
- **Data:** all Pluto detections held, 50 training plus the 4 identified 2026 detections (re-measured
  with the A3 fit), in 3 visits and 7 visit × array groups.
- **Frame:** barycentric two-body with the solar-system mass, with light time; observer = Earth plus
  the header spacecraft vector.
- **Uncertainty:** the envelope, separately along and across the track, of a group Monte Carlo (300
  draws; one offset per group with σ_g = max(group residual RMS 0.134″, 0.2″), exposures resampled
  within groups) and a leave-one-group-out jackknife. σ_g² and the unknown spacecraft position are
  then added.
- **Fit:** χ²/dof 2.32.

**Frozen v2 open forecasts** (never counted; v1 `pluto-position-open-2027a` unchanged).
Order: manifests `ab61b6b` → predictions `fd758e5` ("predict: freeze pluto open forecast v2") →
receipts `16ff3df`.

| Trial | Reference | Position | 95% along × across |
|---|---|---|---|
| `pluto-position-open-2027a-v2b` | 2027-04-25 (MJD 61520) | RA 310.371228°, Dec −22.947119° | 26.4″ × 8.9″ |
| `pluto-position-open-2027b-v2b` | 2027-09-29 (MJD 61677) | RA 308.018418°, Dec −23.798488° | 15.2″ × 11.5″ |

v1 said 54.1″ × 1.06″ for April. v2 sits 13.1″ from v1 along the track and 0.9″ across it, with a
cross-track size about 8 times larger.

**Defect, handled openly.** The first v2 manifests (`33a4171`, ids `…-v2`) were frozen without the
starting state and with the earlier uncertainty wording, because two edits to the freeze code had not
applied. The frozen code could not predict them. They were **never predicted**; they stay untouched
with an `abandoned.json` beside each (`6efcd3d`, reason, hash and replacement), and they are skipped by
the index and listed separately on the scoreboard. The freeze → predict flow was then rehearsed end to
end in a scratch copy before re-freezing as `…-v2b`.

**Exploratory hindcast** (`trials/pluto/hindcast-v2.json`, never counted). Method v2 was trained on
the two training visits only and compared with the 2026 observation:

| Method | Error | 95% region | D² |
|---|---|---|---|
| v1 (frozen) | 5.90″ | 6.04″ × 2.49″ | 6.77 (miss) |
| v2 (hindcast) | 5.27″ | 21.2″ × 15.6″ (along × across) | 0.40 (would have been a hit) |

v2 would not have been more accurate, but it would have been honest about its uncertainty. It was
designed after the miss, so it proves nothing on its own.

**Index.** `index.json` statuses come from the verification files (since `d66b6f3`): Barnard hit,
Eps Ind B hit, Pluto miss, matching `scoreboard.json`. Regenerated again here with the v2 forecasts.

**Tests:** `tests/test_forecast_v2.py` covers frozen, open and intact forecasts; v1 unchanged; open
forecasts not counted; abandoned manifests never predicted; prediction without network from its
folder alone; no rewrite; tampered training refused; the hindcast labelled exploratory.

### Task A6, 14 Nov 2026 (data for the 3D views)

`static/data/scene3d.json` (kind `tenger.scene3d/1`, contract V9), built by
`python -m scripts.build_scene3d`:
- **Pluto and Makemake, catalogue:** JPL SBDB orbital elements (Pluto solution 1, epoch JD 2457588.5;
  Makemake solution 130, epoch JD 2461200.5, with sigmas). Heliocentric ecliptic positions on
  2026-11-14 00:00 TDB from JPL Horizons (Pluto 35.64 au from the Sun, Makemake 52.74 au; Earth
  included). Drawable orbit points for each.
- **Pluto, ours (modeled):** the frozen A4 state as ecliptic elements: a 40.45 au, e 0.293,
  i 17.17°, Ω 110.33°, ω 111.76°, against SBDB's 39.59 au, 0.252, 17.15°, 110.29°, 113.71°. Our
  position today is 0.04 au from Horizons'. Labelled two-visit and Sun-only.
- **Stars:** RA/Dec, parallax and distance from each evidence file's catalogue entry. Barnard
  1.83 pc, WISE 0855 2.28 pc, Eps Ind B 3.69 pc, RW Aur 183 pc (cautioned: unresolved binary, poor
  Gaia fit), R Dra 799 pc.
- **Planet Nine:** hypothetical. Only the quantities stated in five cited abstracts (Batygin & Brown
  2016; Brown & Batygin 2016; Batygin et al. 2019; Brown & Batygin 2021; Brown, Holman & Batygin
  2024, which excludes 78% of the 2021 parameter space), with DOIs. No position or orbit is given.
- **Pluto loop:**
  - SPHEREx heliocentric positions (Earth plus header spacecraft vector) and the fitted Pluto
    positions for all 50 training detections and all 20 evaluation exposures (4 with measured
    positions);
  - the frozen forecast and the observed position (miss, D² 6.77);
  - the 2027 open-forecast track (13 points).

Tests: `tests/test_scene3d.py` (circular-orbit elements, ellipse points, ecliptic rotation, source
labels, Planet Nine cited and never placed, loop completeness) and `tests/test_static_data.py`
(every key, including `credit.sbdb`, has English text).

README: team section added (Narmandakh Garam, Erkhes Orgil, Anu-Ujin Bayarbaatar, Sonomlegtsog
Zolzaya), as passed on from the user by Session B. The rest of the README still describes SPHEREx
Blink and needs release prep.

### Task A5b, 14 Nov 2026 (exploratory post-mortem of the Pluto miss; nothing re-scored)

`docs/postmortem-pluto.md` and `static/data/trials/pluto/postmortem.json` (generated by
`scripts/postmortem.py`, all labelled "exploratory, after the reveal", `counts: false`). The frozen
trial, prediction, verification and scoreboard were read, never written.

- **Identification is right.** Observed − Horizons (moved to SPHEREx) = 0.35″. The frozen forecast −
  Horizons = 6.22″.
- **Shape.** The miss is mostly along the track: +5.69″ (z 2.29), against 1.57″ across it (z 1.50).
  The ellipse had the right orientation (PA 78° vs residual 245°/65°), but it was too small.
- **Cause (a), the main one: uncertainty too small.** Shared offsets within the 6 visit × array
  groups are not in the frozen covariance. With group offsets of 0.1/0.2/0.4″ added, the actual miss
  scores D² 3.46/1.65/0.45, which would all have been hits. A training-only jackknife (leaving out
  one group) gives a 95% region of 22.6″ × 13.0″ (D² 0.70).
- **Cause (b), secondary: model frame.** Barycentric instead of heliocentric improves the error from
  5.76″ to 5.13″. Full N-body adds nothing more. Light time (0.34″) and the spacecraft offset (0.92″)
  were already modelled. Pluto–Charon is about 0.1″ or less.
- **Cause (c), excluded: measurement.** 0.35″ from Horizons; C_obs σ 0.3″.
- **2027 open forecast** (frozen, unchanged): the along-track 54″ is adequate, but the cross-track
  1.06″ is probably 2–4× too small at group offsets of 0.2–0.4″.
- **Next time:** group-level resampling for C_pred, barycentric frame, at least three visits, and
  along/across-track sizes in the report.

Tests: `tests/test_postmortem.py` (post-mortem propagator = frozen propagator; GM total;
ellipse axes) and `tests/test_static_data.py` (post-mortem labelled exploratory, matches the frozen
verdict, no `trial.json`, not on the scoreboard).

### Task A5, 14 Nov 2026 (phase F part 2: verify, scoreboard, game, lessons; branch `tenger-dev`)

**Before opening anything.** The team update was recorded and pushed first (`63d53bd`):
- **Narmandakh** did the earlier research. That covers the Makemake viewing and five Pluto training
  cutouts (exact UTC times in `docs/EXPOSURE.md`).
- For Pluto's evaluation dates he saw **listing metadata only** (possibly JPL-predicted positions),
  never pixels.
- The other three teammates have not answered, so Pluto stays `prospective_unexposed` with
  `confirmation_pending`.

**Integrity gate.** `scripts/verify.py` refuses a trial unless all of these hold:
- the trial → training → prediction → receipt hashes match;
- `prediction.json` is byte-identical to the file in the receipt's commit (`git show`);
- the model code still has the frozen hash.

All three predicted trials passed. Pluto's evaluation visit was opened only afterwards, at
15:17:11 UTC, with cutouts centred on the **frozen model** (never on the listing's positions).

**Outcomes** (model = frozen physics model; baseline = frozen straight line, scored on the same data
with the same C_obs)

| Trial | Category | Exposures used | Model: mean residual (E, N) | Model error, D² | Verdict | Baseline error, D² |
|---|---|---|---|---|---|---|
| `barnard-position-2026b` | retrospective (+ catalogue-assisted) | 28 of 117 (89 refused: saturated-core fits) | (−1.31″, −0.78″) | 1.52″, **2.62** | **hit** | 3.11″, 786 (miss) |
| `epsindib-position-2026b` | retrospective (+ catalogue-assisted) | 113 of 120 | (+0.010″, −0.075″) | 0.076″, **0.21** | **hit** | 0.26″, 18.1 (miss) |
| `pluto-position-2026b` | **prospective, confirmation pending** | 4 of 20 (all D3; D6 never detected, as in training) | (−5.37″, −2.45″) | 5.90″, **6.77** | **miss** (threshold 5.991) | 5.5°, 1.3×10⁵ (miss) |
| `makemake-position-2026a`, `wise0855-position-2026a`, `rwaur-brightness-2026a`, `rdra-brightness-2026a` | retrospective | — | — | — | **insufficient_data** (frozen so at A4) | — |
| `pluto-position-open-2027a`, `makemake-position-open-2027a` | open forecasts | — | — | — | not counted; IRSA has not released the data | — |

**Pluto recovery.**
- **Pre-registered rules:** S/N ≥ 10 within 15″ of the frozen model, plus the static-source check on
  another date. Every peak with S/N ≥ 5 within 30″ is kept as an alternative (20 listed).
- **Result:** 4 exposures identified; none had two passing sources.
- **Motion consistency** (added at verification by the task instruction, and recorded as such):
  χ² 12.3 on 6 degrees of freedom, against a limit of 19.8. The identification passes.
- **After the verdict:** JPL Horizons, moved to the spacecraft position, sits 0.22″ E, 0.27″ N from
  the identified source, so the identification is right. The frozen orbit sits 5.59″ E, 2.72″ N from
  Horizons: the miss is the two-visit orbit's extrapolation over 5 months, not an identification
  error. This comparison is in `after_verdict_comparison` and does not affect the status.

**Correction made before Session B used the files.** The first baseline D² values were computed with
the baseline residuals' own scatter. The trial defines C_obs as the observed-position covariance,
which is the same for model and baseline. The baseline D² values were recomputed: Barnard
774 → 786, Eps Ind B 18.08 → 18.08, Pluto 74,423 → 133,738. All three remain misses. The old
values are kept in each file's `corrections` list. Model numbers and statuses are unchanged.
`verify.py` now scores the baseline with the model's C_obs.

**Scoreboard (derived).**
- Retrospective: 2 hits, 0 misses, 4 insufficient_data.
- Prospective: 1 miss (Pluto, `counts_as_prospective: false` until all four teammates confirm;
  `counts_as_prospective_if_confirmed: true`).
- Open forecasts listed separately, never counted.

No success rate is computed. Three checked trials cannot establish 95% calibration.

**Game and lessons** (Session B's lesson ids; every input has a `source_ref`):

| Record | Content |
|---|---|
| `game/barnard-position.json`, `game/epsindib-position.json`, `game/pluto-position.json` | Frame centred on the frozen model at the reveal time; training points = per-visit-and-array means; baseline, model (C_pred), actual (r̄, C_obs, image); scale = frozen 95% semi-major axis (2.32″, 0.41″, 6.06″). There is no brightness round because no verified brightness trial exists |
| `lessons/distance.json` | Pluto moved 4.09° between the two training visits (0.0200°/day). Sunlight takes 4.90 h to reach it at the fitted 35.34 au (modelled). Barnard's Star is 1.83 pc away (Gaia parallax) |
| `lessons/brightness.json` | Two Eps Ind B wavelength-matched, field-star-calibrated ratios as magnitudes with z (both: no clear change). Barnard: saturated in 356 of 356 pictures, so no brightness can be measured |
| `lessons/how-sure.json` | Pluto D² 6.77 vs 5.991 → miss. For N = 3: expected 2.85 hits, P(all) = 0.857 if independent; observed 2/3. The teacher note says what 3 trials can and cannot show |

**`reserved.json`.** The Makemake and Pluto regions stay listed (readers may keep blocking), with
`status: "released"` and a reason. Pluto is verified; Makemake was frozen as insufficient, so it has
nothing to protect. 3I/ATLAS stays reserved.

**Tests** (`tests/test_verify.py` plus the extended `tests/test_static_data.py`):
- **Tamper refusal:** a changed prediction, a missing receipt, and no rewrite of verification files.
- **Scoring:** D² from the mean residual and combined covariance; the C_obs fit floor; a singular
  covariance gives `invalid_comparison`; fewer than 3 identified gives `insufficient_data`; the
  baseline uses the same C_obs; published D² values match the published covariances to 2%.
- **Scoreboard:** counts, open forecasts excluded, a pending prospective trial not counted.
- **Recovery:** a static star near the forecast is listed and rejected; two passing sources make the
  trial ambiguous; inconsistent motion makes it ambiguous.
- **Strings:** every key in the trial, verification, game and lesson files has English text.

`.venv/bin/python -m pytest`: **158 passed, 2 skipped**. `node --test`: 132 of 133. The one failure
is Session B's check that the new strings are copied into `i18n.js`.

**Limits.**
- Pluto's category depends on three teammates who haven't answered yet.
- The verifier fits single sources: close pairs (≲15″) fail to fit, and in Pluto's crowded field
  several strong peaks were therefore not identified. They are kept as alternatives, not used.
- Barnard's holdout used only 28 of 117 exposures (saturated-core wing fits).
- Both hits are retrospective and catalogue-assisted, so they are demonstrations, not independent
  validations.

### Task A4, 14 Nov 2026 (phase F part 1: freeze and predict; branch `tenger-dev`)

**Order of events (all on `origin/tenger-dev`):**
1. Team viewing recorded in `docs/EXPOSURE.md` (`ef61149`).
2. Model code, tests and contract V5 (`1edb723`).
3. Nine trial manifests and training measurements (`486e723`).
4. One "predict: freeze <target>" commit per trial: `6c13e88` barnard, `84e4fee` epsindib, `b2df072` pluto, `24e215a` makemake, `d6999ef` wise0855, `70d15a9` rwaur, `df778bb` rdra, `d317a51` pluto open forecast, `7afe037` makemake open forecast.
5. Receipts with full SHAs (`ba1d3c8`).

`python -m scripts.predict check` reports every hash chain intact.

**Team statement.** The task message left two placeholders unfilled: the viewer's name ("[Name]")
and the other teammates' answer ("[confirmed none / not answered yet]"). They are recorded as given,
and the other teammates are treated as **not answered yet**. What was seen: Makemake's training
visits and its **evaluation visit** (2026-06-09, 06-12); Pluto's training visits only.

**Trials, categories and why**

| Trial | Category (labels) | Prediction | Why |
|---|---|---|---|
| `pluto-position-2026b` | **prospective_unexposed**, `confirmation_pending` | **predicted**: 2026-10-01 (MJD 61314.65), 95% semi-axes 2.5″ × 6.1″ | Evaluation visit (2026-09-29 → 10-02, QR3, D3/D6) not reported viewed and never opened by Session A. The forecast is our own heliocentric two-body fit to 50 training detections (2 visits). No JPL orbit or ephemeris input: Horizons only centred the training cutouts (`ephemeris_use`). All 8 starting distances (5–100 au) converge to one bound orbit (35.34 au, χ²/dof 1.99; near-best spread 0.01″). Pending until every teammate confirms |
| `barnard-position-2026b` | retrospective_holdout (+ catalogue_assisted) | predicted: 95% semi-axes 2.3″ | Holdout = visit 2 (2026-08-16 → 09-22), already seen. Parallax fixed to Gaia DR3 because the free fit is unusable (A3: 0.95″ vs 0.547″). Two training visits sit ±0.44″ off the catalogue track; this visit systematic sets the uncertainty |
| `epsindib-position-2026b` | retrospective_holdout (+ catalogue_assisted) | predicted: 95% semi-axes 0.4″ | Holdout = visit 3 (2026-09-27), seen. Parallax fixed to the Gaia EDR3 value via SIMBAD (free fit inconsistent, z = 7). Uncertainty from per-visit-and-array means (308 training positions, 3 visits) |
| `makemake-position-2026a` | retrospective_holdout | **insufficient_data** (`predict.no-training-positions`) | Evaluation visit seen by the team. No single-exposure training detection; only 1 validated joint epoch: an orbit is unconstrained |
| `wise0855-position-2026a` | retrospective_holdout (+ catalogue_assisted) | insufficient_data (`predict.no-training-positions`) | Every training position contaminated (A3) |
| `rwaur-brightness-2026a` | retrospective_holdout, exploratory | insufficient_data (`predict.no-period-model`) | Only 15 single-exposure fluxes at assorted wavelengths, with no wavelength-matched pair across training visits. Unresolved binary: no defensible range |
| `rdra-brightness-2026a` | retrospective_holdout (+ catalogue_assisted) | insufficient_data (`predict.no-training-measurements`) | Saturated in every exposure: nothing for a VSX-period model to phase |
| `pluto-position-open-2027a` | prospective_unexposed, **open forecast** | predicted: reference 2027-04-25 (MJD 61520), track 2027-03-26 → 05-25 every 5 days; at the reference 95% semi-axes 1.1″ × 54″ (along track) | Next visit expected near 04-25 (cadence of the training visits). Same orbit fit; not counted in the scoreboard; `check_after_utc` 2027-05-15 |
| `makemake-position-open-2027a` | prospective_unexposed, open forecast | insufficient_data | Orbit unconstrained (as above) |
| 3I/ATLAS | see_only | — | Never a trial |

Eligible for scoring when the evaluation data are measured: **3 trials**. Pluto is prospective,
pending confirmation; Barnard and Eps Ind B are retrospective. Four trials are frozen as
`insufficient_data` and count as such. One open forecast (Pluto) waits for IRSA.

**Model vs baseline on the training data.**
- **Pluto:** orbit χ²/dof 1.99 (residual RMS 0.29″, 0.30″). The straight-line baseline can't follow
  the parallax loop, and its forecast lies 5.5° from the orbit's. Fitting the October visit alone
  mispredicts April by about 4,000″, so one visit can't constrain an orbit.
- **Barnard:** χ²/dof 8.2 at exposure level, 2.9 at visit level.
- **Eps Ind B:** 5.7 at exposure level, 9.5 at visit level.

The baselines (no parallax) are in each `prediction.json` under `diagnostics`.

**Scoring as frozen.**
- **Hit rule:** D² = r̄ᵀ S⁻¹ r̄ ≤ 5.991, with S = C_pred + C_obs.
- **Residual:** r̄ is the mean, over identified holdout exposures, of observed − frozen model. The
  model is evaluated with each exposure's own observer position.
- **Observed covariance:** C_obs is the sample covariance divided by N; fewer than 3 identified
  exposures means insufficient_data.
- **Pluto identification is pre-registered:** search around the frozen model only (no ephemeris
  query), S/N ≥ 10, static-source check, ambiguity rule.

**Tests** (`tests/test_predict.py`, `tests/test_static_data.py`) cover:
- **Orbit:** synthetic recovery with the forecast inside D² < 13.8; convergence from every starting
  distance; a one-visit arc flagged as unconstrained.
- **Categories:** label precedence.
- **Isolation:** holdout rows ignored even when poisoned; evaluation rows reduced to IDs and times;
  prediction runs with no network and no files outside the trial folder.
- **Integrity:** repeated predictions byte-identical; tampering with training, trial or prediction
  detected; predictions never rewritten; insufficient trials frozen as such; published hash chains
  intact; open forecasts not counted.

`.venv/bin/python -m pytest`: **144 passed, 2 skipped**.

**Published for Session B:**
- `static/data/trials/<id>/{trial,training,prediction,receipt}.json`
- `scoreboard.json`: retrospective 2 waiting + 4 insufficient; prospective 1 waiting; open forecasts listed separately
- `index.json`: `trials`, `scoreboard_path`, and per target `prediction.status` / `trial_ids` / `open_forecast_ids`
- `reserved.json`: evaluation paths stay closed until verified
- Contract V5

**Limits.**
- Pluto's category depends on teammates who haven't answered yet.
- The orbit model is Sun-only (planetary perturbations neglected over a 7-month arc). Pluto–Charon
  photocentre motion is left in the residuals.
- The spacecraft position at the evaluation time is a covariance term in the headline prediction;
  verification uses the real header positions.
- The Barnard and Eps Ind B uncertainties rest on only two or three visits.
- Horizons positions for the evaluation exposures exist in the repository (A1 inventory,
  `reserved.json`); the prediction code provably does not read them.

### Task A3, 14 Nov 2026 (phases C–D, branch `tenger-dev`)

**Exposure rule applied** (recorded in `docs/EXPOSURE.md`, "Task A3 change"): all current DR1/QR3
exposures of the five challenge targets opened; Makemake and Pluto training visits only (holdout
visits closed, refused in code); 3I/ATLAS See-only.

**Pipeline** (all on native pixels; previews and viewer bundles are made from the same exposures)

| Step | Where | What it does |
|---|---|---|
| Acquisition | `scripts/acquire.py`, `scripts/acquire_body.py` | Fixed field (0.1°, cutout 0.145°) for the five targets; R Dra sampled to 300 of 2,493. Moving bodies: cutouts centred on the Horizons position of each training exposure; holdout rows raise `HoldoutViolation` before any request. 3I/ATLAS: official table rows resolved to their DR1 products by SIA (the table's QR2 datalinks no longer resolve) |
| Quality gate | `backend/investigation.py` | `L2DQAFLG` must be `Pass`; target inside the cutout; flag schema known (A2) |
| Position | `backend/astrometry.py` | Pixel-integrated Gaussian, masked pixels excluded, 1/VARIANCE weights, east/north covariance via the full WCS. Saturated core → wing fit (35″). Identification gate: within 3″ of the catalogue track and no other Gaia source within 12″ |
| Motion | `backend/astrometry.py`, `scripts/build_investigation.py` | WLS with parallax fixed to the catalogue (main, catalogue-assisted), free (exploratory) or absent (baseline). Observer = Earth (astropy ephemeris) + spacecraft header position. Uncertainty = larger of exposure-level (scaled by √χ²) and visit-level fits (`sigma_basis`) |
| Control | same | Isolated Gaia stars (G 10–15.5) measured identically; their fitted motions compared with Gaia (`control`), their residual scatter sets a per-exposure floor |
| Photometry | `backend/processing.py`, `scripts/build_investigation.py` | 12″ aperture with fractional pixel weights, ZODI and annulus median removed, VARIANCE errors. Brightness ratios only through wavelength-matched pairs, divided by the median ratio of field stars (G 10–17) on the same dates; floors from same-date repeatability and field-star scatter |
| Faint moving bodies | `backend/stacking.py` | Joint forced fit of one offset to all exposures of an epoch (native pixels, own WCS/VARIANCE/mask, robust loss); time-shuffled null test; reference = Horizons moved to the spacecraft position |
| Comparisons | `backend/investigation.py` | Every pair of epochs in the same array; brightness grade at the target, field grade over the plate, `difference` only if both quantitative |
| Outputs | `static/data/<key>/investigation.json`, `epochs/*.webp`, `meta.json`, `frames.bin.gz`, `index.json`, `reserved.json`, `strings.en.json` | Contract V3 (and V4 for brightness game rounds) |

**Results per target** (from the published files, dataset `a3-2026-11-14`, pipeline `tenger-a2-2026.11.14`)

| Target | Exposures used / listed | Status | Main result | Checks and limits |
|---|---|---|---|---|
| Barnard's Star | 356 / 358 (DR1 + QR3; 2 failed downloads) | measured | μ = **10.42 ± 0.33″/yr** (parallax fixed to Gaia; σ from the visit-level fit). Gaia DR3 10.393 (z = 0.07) | Control: 14 field stars, all agree with Gaia (median Δ 0.040″/yr). Floor 0.15″. Saturated core: wing fits in arrays 4–6. Free parallax 0.95 ± 0.04″ vs 0.547″ (z = 9): visit systematics, flagged. Brightness: saturated in every exposure → 0 of 8 ratios. No difference image passes |
| WISE 0855 | 256 / 258 (DR1) | insufficient_data | No motion, no brightness: every fit near the track is outside the 3″ gate or contaminated by a Gaia G = 16.3 star 4–12″ from the track | Catalogue: SIMBAD via CfA (Kirkpatrick+2021). Context: 2MASS non-detection (kept as such); AllWISE W2 27 exposures, 2010. 4 difference-image pairs pass all gates |
| Epsilon Indi B | 458 / 460 (DR1 + QR3) | measured | μ = **4.668 ± 0.043″/yr**, catalogue 4.684 (z = −0.37). 16 of 20 matched brightness ratios measured, all consistent with no change (3–25%) | Control: 5 field stars, 3 agree → **not passed** (flagged). Free parallax 0.369 ± 0.014″ vs 0.271″ (z = 7), flagged. Repeatability floor 1.6%. 6 difference-image pairs |
| RW Aurigae | 335 / 335 | insufficient_data | Brightness refused: flagged (saturated/bloom) pixels in the aperture in 318 exposures; 0 of 9 ratios | Blended binary (1.2″). 1 difference-image pair |
| R Draconis | 299 / 2,493 (sample of 300; deep + wide, DR1 + QR3) | insufficient_data | Brightness refused: saturated in all 299; 0 of 17 ratios | 7 visits; 3 difference-image pairs |
| Makemake | 234 / 236 training rows (DR1) | measured (partial) | Not seen in single exposures. Joint fits: **1 validated epoch** (v0-d2, −0.32″ E/+0.92″ N of the spacecraft-corrected ephemeris, S/N 9.3), 2 candidates, 9 below S/N 5 | Static-source check, time-shuffled null test. Holdout visit closed |
| Pluto | 218 / 218 training rows (DR1) | measured (partial) | **9 validated epochs** (S/N 11–26, offsets within 0.9″), 3 candidates, 4 too sparse or faint | Array-to-array scatter about 0.4″ within a visit. Holdout visit closed |
| 3I/ATLAS | 258 / 259 official-table rows | See-only | 12 body-centred previews (Aug, Dec 2025); no measurements, no trial | Table's QR2 links no longer resolve; DR1 products found by SIA. 1 row has no DR1 product (listed as unavailable) |

**What Session B gets** (all under `static/data/`): `index.json` (eight targets, sourced map distances,
`reserved_path`, `strings_path`), `<key>/investigation.json` (contract V3), `<key>/epochs/*.webp`
(one preview per epoch, same exposures as the measurements), rebuilt `<key>/meta.json` +
`frames.bin.gz` for the five challenge targets (epochs map to them through `epochs[].viewer` and
`viewer.visits`, whose `date_utc` equals the viewer's step id), `reserved.json` (Makemake/Pluto
holdout paths, 3I/ATLAS path), `strings.en.json` (English text for every key emitted; B copies it into
`i18n.js`). Contract V4 adds brightness game rounds. B confirmed all of these render (messages
between sessions, 14 Nov).

**Commands and results** (14 Nov 2026, 22:29 UB)

| Command | Result |
|---|---|
| `.venv/bin/python -m pytest` | **133 passed, 2 skipped** (network). New A3 tests: `test_astrometry.py` (synthetic stars: masks, VARIANCE, saturation, parallax, refusals), `test_investigation.py` (no cross-array or nearest-channel comparisons, PSF/registration gates, FOV centring, identification gate, contamination, reproducibility), `test_stacking.py` (joint fit, null test, spacecraft correction), `test_static_data.py` (every emitted key has English text, no example data, previews exist, viewer mapping, holdout never opened, reserved paths), fractional-aperture test |
| `.venv/bin/python -m pytest --network tests/test_network.py` | 2 passed (A2) |
| `node --test tests/*.mjs` | 106 of 107 here at 22:29; the failure was B's check that every new `strings.en.json` key is copied into `i18n.js` (`context.*`). B copied them in `3dc1e22` and reports 115/115 |
| Full rebuild twice (`build_investigation` ×5 `--cached-only`, `build_body` ×3) | **All 52 published data files byte-identical** between the two runs |
| Server + in-app browser, `?target=` for all five, plus Pluto | All open from the rebuilt bundles with their evidence files; **0 `/api/` requests** |

**Exposure accounting.** Opened in A3: every current DR1/QR3 exposure of the five challenge targets
(R Dra: the 300 sampled), Makemake and Pluto training visits only (holdout windows refused in code,
newest opened exposure MJD 61049.26 and 61172.96), and 3I/ATLAS. The tables are in
`docs/EXPOSURE.md`. Raw cutouts stay in the git-ignored `cache/`, with SHA-256 values in each
observation record.

### Still open after A3

- **Saturation.** Barnard, RW Aur and R Dra saturate SPHEREx in nearly every exposure. Their
  brightness is `insufficient_data`. Wing or PSF-wing photometry of saturated stars, and ePSF fits,
  are not implemented.
- **Visit-level systematics.** For the saturated Barnard star and for Eps Ind B, the free parallax
  disagrees with Gaia (z = 9 and 7). Motion uncertainties therefore use the visit-level fit. The
  cause (wing-fit asymmetry, array-dependent offsets of about 0.4″) is not modelled.
- **WISE 0855** needs a joint along-track fit in arrays 5–6 that models the neighbour star. That is
  the only route to a measurement there.
- **Moving bodies.** Only 1 Makemake epoch passes the null test. Detectability of the closed holdout
  visits is unknown (Task A4 must allow `insufficient_data`).
- **Checks still `not_checked`:** background in comparisons. The registration check reads header
  flags only, and `FINAST` is 0 in every sampled file, so it barely discriminates.
- WCS-WAVE (≈1 nm) is used instead of the CWAVE/CBAND product. The 10%-of-bandwidth tolerance is
  adopted, not validated.
- `static/data/results.json` and `scripts/results.mjs` remain legacy (no longer shown by B).
- `astroquery` is not installed (httpx mirror helpers only). Dependencies are unpinned.

### Task A2, 14 Nov 2026 (phase B, git base `a646a75`, branch `tenger-dev`)

**What changed (commits `79f30c3`, `763237b`, `eebea63`, `dbe4664`, this docs commit)**

| Area | Files | Change |
|---|---|---|
| Releases | `backend/archive.py`, `backend/config.py` | Discovery reads the SIA self-description with no collection and accepts `spherex_(dr\|qr)N[_deep]`. `spherex_dr1_cube` is excluded (a different product). Fallback list is DR1, DR1-deep, QR3, QR3-deep. Each `Exposure` keeps collection, product version (`l2b-v27-2026-228`), `t_max`, release date and publisher DID. `obs_key` = `<collection>:<obs_id>:D<n>`. `select_products` keeps one product per (obs_id, detector): data release over quick release (`BLINK_RELEASE_PRIORITY`, default `dr,qr`), then release number, then product version. Optional `BLINK_COLLECTIONS` allow-list. |
| Cache keys | `backend/framestore.py`, `backend/jobs.py` | Frame path `frames/<job>/<tag>/<key>.npz`. The tag hashes pipeline version (`tenger-a2-2026.11.14`), frame schema 2, mask policy and grid. The key holds collection, obs_id, detector and product version. A stored frame whose `cache.tag` differs is rebuilt. Old QR-only caches (`data/frames/<job>/<key>.npz`, `data/search/*.json`, `data/collections.json`) are never read. They were not deleted. Search cache moved to `search/v2/`, collections to `collections-v2.json`. |
| Flags | `backend/flags.py` (new), `backend/processing.py` | Decodes current `MSKNnnnn`/`MSKMnnnn`/`MSKDnnnn` and historical `HIERARCH MP_<NAME> = bit`. Each flag keeps bit, name, description, action and reason. No schema, `MSKM != 1<<n`, a bit outside 0–31, two names on one bit, or MSKN/MP_ disagreement → `UnknownFlagSchema` and the exposure is refused (counted in the job summary `rejected`). Policy `tenger-mask-v1`: keep `SOURCE`, `FULLSAMPLE`; reject every other named flag, unknown names and undefined bits. Stricter than before: `DICHROIC` and `PHANMISS` are now rejected. |
| Native data | `backend/processing.py`, `backend/jobs.py` | `NativeProduct` keeps IMAGE, VARIANCE, FLAGS, ZODI, celestial WCS and WCS-WAVE at original resolution and dtype. `native_aperture_photometry` works on these pixels: ZODI and annulus median removed, error from VARIANCE (aperture sum plus the annulus-median term), pixel solid angle from the WCS. Any rejected pixel in the aperture gives `insufficient_data` with per-flag counts. The 160-px plate (`display_native` + `reproject`) is display only. Jobs keep each cutout minus its PSF table under `native/` (`BLINK_KEEP_NATIVE=0` turns it off) and record the SHA-256 and size of the bytes received. |
| Spectral matching | `backend/spectral.py` (new), `backend/jobs.py` | `grade_pair` gives `quantitative` / `qualitative` / `invalid` with a reason key. Tolerance: same array and centres within 10% of the narrower bandwidth (floor 1 nm, the IRSA-quoted WCS-WAVE accuracy). This is a TENGER choice, not an official criterion. `grade_field` checks the plate corners separately, so a match at the star does not validate a difference image. `match_epochs` pairs exposures explicitly, each used once. The job no longer silently uses the array midpoint when WCS-WAVE fails: it records `responseStatus: "unknown"` and `response: null`, and the midpoint is used only to place the frame on the band slider. |
| Catalogues | `backend/catalogs.py` (new), `backend/config.py` | SIMBAD TAP and VizieR ASU try CDS first, then the CfA mirror. `configure_astroquery()` points astroquery at the first reachable host if astroquery is installed (it is not a dependency). Sesame already had the CfA fallback. |
| Contract | `docs/DATA-CONTRACT.md` | Version 2 appended (additive): new frame metadata fields, mask policy, reason keys, viewer rule for time comparisons. |

**Verification against real files** (all already-exposed Barnard-field exposures, `center=269.44648,4.76867&size=0.02`)

| Product | Software | FLAGS schema | Rejected pixels (new / old decoder) |
|---|---|---|---|
| DR1 `2025W33_2C_0321_1` D6, `l2b-v27-2026-228` | 7.0.5 | `MSKN/MSKM/MSKD`, 22 planes incl. CROSSTALK, GHOST*, STREAK, BLOOM, SNOWBALL, HALO | **17 / 144** (old: 0) |
| QR3 `2026W33_2A_0594_4` D6, `l2b-v27-2026-241` | 7.0.5 | `MSKN/MSKM/MSKD` (same 22) | 9 / 144 (header check only, file not kept) |
| QR2 `2025W33_2C_0321_1` D6, `l2b-v20-2025-266` | 6.4+psffix1 | `MP_*` (16 keys, incl. PHANTOM, REFERENCE) | 14 / 144 (old: 14) |

Extensions: DR1/QR3 `IMAGE, FLAGS, VARIANCE, ZODI, EPSF, WCS-WAVE`; QR2 has `PSF` in place of `EPSF`.
This matches the IRSA SPHEREx data-products page. The IRSA tutorial confirms that flag names travel as
`MSKNnnnn` with `MSKDnnnn` descriptions in the FLAGS header. Neither IRSA page says which flags to
mask, so `tenger-mask-v1` is our own documented choice. WCS-WAVE at Barnard's position (D6): centre
4.929 µm, bandwidth 0.037 µm. IRSA says WCS-WAVE is for visualization (about 1 nm accuracy) and the
separate Spectral WCS product (CWAVE/CBAND) is the science reference. We do not read that product yet.

On the DR1 cutout, Barnard's Star itself falls on OVERFLOW/BLOOM/TRANSIENT pixels in D6. Native
photometry therefore returns `insufficient_data`, not a flux.

**Tests**

| Command | Result |
|---|---|
| `.venv/bin/python -m pytest` | **101 passed, 2 skipped** (the 2 network tests). Baseline was 59 |
| `.venv/bin/python -m pytest --network tests/test_network.py` | **2 passed**: IRSA lists `spherex_dr1` and `spherex_qr3` and no cube; SIMBAD answered from the CfA mirror (CDS TAP returned 404 at 20:12 UB) |
| `node --test tests/*.mjs` | **39 passed, 0 failed** (unchanged) |
| Server `.venv/bin/uvicorn backend.api:app --port 8765`, browser `?target=` barnard, wise0855, epsindib, rwaur, rdra | All five open from bundled data, plate dates and frame counts shown, **0 `/api/` requests** (no live job started near a target) |

Updated tests that endorsed the old behaviour: `test_archive.py` (self-description now includes DR1
and excludes cubes; DR beats QR; cache key carries release and product version), `test_framestore.py`
(versioned tag, old unversioned files ignored). New: `test_flags.py`, `test_native_product.py` (real
DR1 and QR2 fixtures), `test_spectral.py`, `test_jobs_pipeline.py` (offline pipeline on the DR1
fixture), `test_catalogs.py` (mirror fallback with a mock transport), `test_network.py` (marked
`network`), `tests/conftest.py` (`--network` or `TENGER_NETWORK=1`).

Fixtures (`tests/fixtures/`, see its README): DR1 11 kB and QR2 9 kB gzip copies of the cutouts above
with the PSF table removed, plus two SIA metadata rows. Original SHA-256 values are recorded in the
README and in each file's `TGRSRC` card.

**Exposure accounting.** Pixels opened this task: DR1 and QR2 products of `2025W33_2C_0321_1` D6
and the QR3 product of `2026W33_2A_0594_4` D6. Both obs_ids were already in the exposed set (bundled
frames and the earlier audit), so the exposed set does not change. No Makemake, Pluto or never-opened
challenge-target observation was requested. SIA metadata was read for the Barnard position and a
neutral position (0, 0). Bake and live jobs were not run.

### Still open after A2

- **Browser-side band choice (Session B).** `resolveBand` in `static/js/stack.js` still swaps in the
  nearest channel that has data, per date step, in blink mode. Difference mode compares whole-array
  stacks whose wavelengths differ across the plate. Contract V2.4 states the rule. The backend
  grades exist, but nothing sends them to the browser yet: the investigation manifest (phase C) is
  meant to carry them.
- **Bundled data is legacy.** `static/data/*/meta.json` and `frames.bin.gz` were built by the old
  pipeline: QR2/QR3 only, MP_ mask (DR1 masks were never applied), no VARIANCE or response width.
  The same holds for `static/data/results.json` and `scripts/results.mjs` (`wingBrightness` compares
  brightness across dates within one array without response matching). Rebuilding needs a bake,
  which `docs/EXPOSURE.md` forbids until the trial manifests are frozen. Bake/build_site were not
  run or re-tested with the new metadata.
- **Science WCS.** Responses come from WCS-WAVE (about 1 nm). The CWAVE/CBAND Spectral WCS product
  is not read. Measurements do not yet use the EPSF (PSF photometry, PSF-matching checks) or
  registration checks. `grade_field` assumes a linear wavelength gradient across the plate.
- **Tolerance.** The 10%-of-bandwidth match is adopted, not validated. No flux-error budget for a
  given shift has been derived.
- **Native photometry** uses whole pixels (no fractional apertures), and a median background with
  a Gaussian π/2 variance factor. VARIANCE covariance between neighbouring pixels is ignored.
- `astroquery` is not installed. Only the httpx helpers are exercised.

### Open limits (from A1, still true)

- Exposure of Makemake/Pluto through tools outside this repo (public Render live mode, IRSA Viewer)
  cannot be ruled out from files. A team statement is needed before any `prospective_unexposed` label.
- CDS Strasbourg SIMBAD/VizieR outage: the code now falls back to CfA automatically.
- Dependencies are unpinned (versions in A1 above).
- Docker build, rebake, deployment and real-phone checks: not run.

### Next action (proposed)

- Collect the three remaining teammates' statements on Pluto's evaluation visit. When all four
  confirm, regenerate `scoreboard.json` so the Pluto row counts as prospective. Never edit the trial
  files.
- Keep `bake.yml` disabled during judging (done 15 Nov; `docs/RELEASE.md`, step 0).
- After Sunday 14:00: the team makes the repository public, enables Pages and fast-forwards `main`
  (`docs/RELEASE.md`). Run `python -m scripts.validate_release` before every data commit.
- When IRSA releases Pluto's spring-2027 visit, check `pluto-position-open-2027a` with the same
  verifier.

---

## Web (Session B)

### Map of the inherited UI (read before B1, git `a646a75`)

Plain ES modules, no build step, served as is from `static/`.

| File | Lines | Role |
|---|---:|---|
| `index.html` | 183 | One page: header (logo, name/coordinate search with "Top places" list, demo, RU/EN toggle), landing `#hero` (title, WISE 0855 "proof" blink, five challenge cards), `#about` (results table from `results.json`, three text columns), `#observatory` (plate canvas + six detector tiles, side panel with motion result, spectrum/light-curve chart and tools, footer deck with film strip, From/To range, One/Side-by-side, band slider) |
| `js/main.js` | 1452 | Everything else: app state, plate rendering and paint cache, film strip, play loop, From/To range, compare view, follow/lock camera, Gaia/AllWISE overlays, static vs live loading (`openStatic`/`openLive` + job polling), auto spectrum + motion, URL (`target`, `ra`, `dec`, `fov`, `embed`), landing cards, results table, search list, guided demo actions |
| `js/plate.js` | 302 | Canvas renderer: stacks per band, stretch limits, mono/composite/difference painting, overlays (Gaia rings, track, expected-motion ring, pick cross, scale bar, N/E) |
| `js/stack.js` | 272 | Pure maths: channel/detector ranges, median stacking, `visitsOf`, `resolveBand` (nearest-channel fallback), tangent-plane projection, decoders |
| `js/science.js` | 337 | Browser photometry, spectrum, centroid tracking, proper-motion fit, control stars |
| `js/chart.js` | 121 | SVG spectrum and light-curve charts (molecule reference lines) |
| `js/viewport.js` | 43 | Zoom/pan maths |
| `js/api.js` | 82 | Static loader with retries (`data/…`), live API client (`LIVE_SERVER` on github.io) |
| `js/i18n.js` | 328 | English + Russian strings, default from `navigator.language` |
| `js/names.js`, `js/sky.js`, `js/tour.js` | 54/76/116 | Offline name list; Aladin Lite all-sky background; scripted demo |
| `css/style.css` | 553 | Dark glass theme, amber accent, one breakpoint at 1000 px |

Problems found for TENGER: the landing presents the legacy `results.json` motion numbers as "Tested on all
five challenge targets"; the motion box says "the motion is real"; "Sum" is a per-pixel median;
Difference subtracts the first date over a broad band with no validation; single-channel views silently
use the nearest channel per date; Russian is chosen automatically for Russian browsers; many controls
are under 44 px; there is no page/panel/A/B/band state in the URL.

### Task B1, 14 Nov 2026 (phase E: TENGER interface; base `a646a75`, worktree branch `web`)

**What changed**

| Area | Files | Result |
|---|---|---|
| Shell and navigation | `index.html`, `js/main.js`, `css/style.css` | TENGER header with Investigate (Home), Beat the physics, Learn, About. Pages are sections of one HTML file, switched by `page=` with history (Back works). Skip link, focus moves to the page heading. |
| English resource | `js/i18n.js` | One English table for every visible string (≈510 keys, including all contract enums, notes, captions, charts, panels). English is forced as default; the inherited Russian table stays in the file but is no longer offered (it does not cover the new pages). |
| Home | `js/home.js`, `js/map.js`, `js/targets.js` | Prominent RA/Dec + FOV form with a local parser (`js/coords.js`: degrees, `hms`/`dms`, colons, spaces, unicode minus); name search kept; five official shortcuts plus Makemake, Pluto and 3I/ATLAS as "Not available yet"; schematic log-distance map with the required caption, arbitrary-angle check, colour **and** shape per family (stars amber circle, variables purple diamond, Solar System cyan ring, hypothetical orange dashed ring), unplaced/clamped notes and label placement that avoids other names and dots; target list built from the same entries. The real Aladin sky is an opt-in "Pick a position on the real sky" panel that only fills the coordinate form. |
| Data loading | `js/contract.js` | Reads `data/index.json`, `<key>/investigation.json`, `trials/<id>/{trial,prediction,receipt,verification}.json`, game rounds and lessons per DATA-CONTRACT v1. Each result is `ok`, `missing`, `unsupported` (newer major), `invalid` (wrong kind, unsafe path) or `error`. `?fixtures=1` switches the base to `dev-fixtures/` and shows a page-wide "Example data, not an observation" banner. |
| Investigation | `js/main.js`, `js/panels.js`, `js/caption.js` | Panels in order See, What changed, Prediction, Evidence, Spectrum (optional), with a sticky panel bar. See keeps the inherited renderer, viewport, detector tiles, follow-camera, Gaia/AllWISE overlays and live mode, and adds Blink / Side by side / Swipe / Difference with explicit A/B observation (epoch) IDs, swap, "Only A and B". Caption strip per plate: UTC time or range, wavelength (array range, or the channel actually shown with a substitution warning), releases with counts, IRSA source link, status chip (processed / context / difference), full observation-ID list, plus an A/B warning (cross-mission, different channels, broad band). |
| Difference gate | `js/main.js` | Difference is offered only when the investigation file lists a quantitative comparison of exactly this A/B pair with `difference` allowed. No such file exists, so it is off everywhere, with the reason shown. The old first-date broad-band difference is no longer reachable. |
| Honesty fixes | `js/main.js`, `js/i18n.js` | Legacy `results.json` numbers are no longer shown (only its thumbnails are used). Motion is no longer measured automatically; the button lives in "Explore in your browser (not validated)" and the wording no longer says "the motion is real". "Sum" is called "All dates (median)". Prediction/Evidence/What changed show "not published yet" states when files are missing. |
| Reserved-sky guard | `js/reserved.js` | Live jobs are refused within 2° (plus half the field diagonal) of Barnard, WISE 0855, ε Indi B, RW Aur, R Dra and the Makemake/Pluto path boxes from `docs/EXPOSURE.md`. Prepared frames still open; a different FOV for a prepared target falls back to the prepared field with a note. |
| URLs | `js/route.js` | Old `ra`, `dec`, `fov`, `target`, `embed` links work. Added `page`, `panel`, `band` (`all`, `d1`–`d6`, `c0`–`c101`), `a`, `b`, `mode`, `v`; `id` is an alias of `target`; coordinates win over a conflicting target (note shown); bad values are dropped with a note; a data-version mismatch or a missing A/B ID is reported. "Copy share link" copies the full state. |
| Accessibility | `css/style.css`, `js/main.js` | Real buttons; 44 px minimum for every control (measured); ←/→ change date (B outside Blink), Space plays/pauses or flips the swipe; `prefers-reduced-motion` stops autoplay, blinking thumbnails and smooth scrolling; every chart has a "Show the data as a table" disclosure; token contrast checked in tests. |
| Game / Learn / About | `js/pages.js` | Beat the physics explains the reveal order and the bounded `exp_decay_v1` score and lists published rounds (none yet). Learn lists the three lessons and the Planet X Lab as "In preparation". About gives sources, methods/limits, credits (base project, IRSA, SPHEREx, WISE, Gaia, Aladin, fonts) and the AI disclosure. |
| Fixtures | `static/dev-fixtures/` | Index (8 targets + hypothetical Planet Nine), Barnard investigation, a verified example position trial (hash chain trial → prediction → receipt is real), an R Dra brightness trial with no receipt/verification, a game round and a lesson. Every file has `"example": true`; distances and numbers are invented or approximate. |

**Commands and results** (14 Nov 2026, Node v26.13.1, Chrome headless via DevTools protocol)

| Command | Result |
|---|---|
| `node --test tests/*.mjs` | **84 passed, 0 failed** (39 inherited, one of them rewritten because it endorsed nearest-channel substitution, + 45 new in `route`, `coords`, `contract`, `i18n`, `targets`, `caption`, `contrast`) |
| `.venv/bin/python -m pytest` (after rebase on `origin/tenger-dev` with A2) | 101 passed, 2 skipped (no Python file changed by B1) |
| `.venv/bin/uvicorn backend.api:app --port 8766` from this worktree | Serves the site; `data/index.json` 404 (not published yet, handled) |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` | 10 page states × 360/390/768/1280. Measured `innerWidth` = requested width every time; `scrollWidth` = `clientWidth` (no horizontal scroll) everywhere; no control under 44 px; no script errors. Report: `docs/screens/viewport-report.json` |
| In-app browser (Claude desktop, 1024 px pane) | Keyboard (Space, ←/→), Blink/Side/Swipe, Difference refused with reason, band change, share link round trip (mode, band, A/B, panel restored), conflicting link, unknown target, version mismatch, embed mode: all as described above |
| Guard check, in-page with `/api/observe` trapped | `?target=barnard&fov=0.5`, `?ra=201&dec=21` (Makemake path), `?ra=270.5&dec=5`, `?target=rdra&ra=248.9&dec=66.0`: **0** live requests, notices shown |
| Live mode at RA 40°, Dec +60° (far from all eight targets) | Job started on the local server, QR3 frames arrived, caption showed their times and release |

Screenshots: `docs/screens/<page>-<width>.png`. They show the real app; they are not evidence of validated
science. Fixture screenshots (`home-fixtures-map`, `prediction-fixtures`) show the example banner.

**Waiting on Session A**

- `static/data/index.json`: until it exists the distance map shows its waiting text, prediction statuses read
  "No prediction published yet", and Prediction says "The prediction ledger is not published yet".
- `<key>/investigation.json` per target: needed for validated What changed values, Evidence tables, the
  Difference gate (comparisons with `difference`) and the Spectrum flag. The viewer's A/B IDs are legacy
  visit dates (`2026-08-23`, `allwise`); epoch IDs (`e1`, `e2`) from investigation files are not yet mapped to
  frames. A preview asset per epoch, or a mapping from epochs to legacy frames, is needed for that.
- Trials, receipts, verifications, game rounds and lessons: the panels render them already (checked with
  fixtures) and show "waiting"/"not checked yet" for missing parts.
- Makemake, Pluto, 3I/ATLAS: stay "Not available yet" until the index lists them with products.
- Keys used by data (`limit.*`, `explain.*`, `ident.*`, `quantity.*`, `credit.*`): unknown keys show a visible
  "(description not written yet)" text. Session A should send the list of keys it writes so the English text
  can be added.

**Limits and open points**

- Viewer frames are still the legacy prepared frames (QR2/QR3, approximate channel wavelengths, flags not
  re-validated). After rebasing on Session A's contract version 2, the nearest-channel substitution
  (`resolveBand`) was removed (V2.4): a date with no exposure in the chosen channel shows "No frames in this
  band for this date" and the caption says so. Labelling Blink/Side by side with the comparison grade (V2.4)
  needs investigation files and is not done yet. The new V2.1 frame fields (`responseStatus`, `obsKey`, …) are
  not read by the viewer yet.
- The reserved regions are a copy of `docs/EXPOSURE.md` in `js/reserved.js`; 3I/ATLAS has no region (no path
  data here). Update the list when predictions are frozen or regions change. *(B2: now read from `data/reserved.json`, A3.)*
- The guided demo (`js/tour.js`) is no longer reachable from the UI: its captions relied on the old landing
  and on the unvalidated motion number. Kept in the repository. *(Fixed in B2: rewritten and reachable again.)*
- No real-phone check yet; only emulated widths in headless Chrome and the desktop pane.
- `backend/api.py` CORS and `js/api.js` `LIVE_SERVER` are unchanged (team decision 6).

**Next action (proposed)**: phase F/G web work once Session A publishes the index and the first trial:
scoreboard page from `scoreboard.json`, the Beat the physics round player, and printable lessons.

### Task B2, 14 Nov 2026 (phase G: Beat the physics; rebased on A3 `49aa871`)

**What changed**

| Area | Files | Result |
|---|---|---|
| Scoring and checks | `js/game.js` (pure) | `exp_decay_v1` exactly as DATA-CONTRACT §11: `round(100·e^(−error/scale))`, bounded 0–100, a perfect guess scores 100, never divides by the baseline error. Non-finite or negative error, scale ≤ 0, non-finite scale or an unknown formula → score `null` and raw errors only. Raw errors in the round's `units` (position fields are arcsec; `arcmin`/`deg` rounds are converted). Ties are reported; "physics lost" only when the straight line is strictly closer. Rounds with a bad quantity, training points, reveal time or baseline/model/actual are refused with the reason shown. |
| Round player | `js/game-ui.js`, `index.html`, `css/style.css` | One round at a time with a round picker (`?page=game&round=<id>`). Training points (dates, table as well), the player taps a guess, moves it with arrow keys (Shift = 5×) or the four nudge buttons, or types offsets/values; Enter or "Lock in my guess". Reveal in order: straight-line baseline → frozen model and its 95% region (prediction covariance with `region_d2`, or ±z·σ for brightness) → real observation with its image (or "no image"). Results table: raw error with units and score for you, straight line and model, the closest highlighted, the official trial result from `verification.json`, and the score rule with the round's scale. Axes before the reveal come from the training points only, so they do not hint at the answer. Best score per round in `localStorage`, read and written inside try/catch. No backend, no leaderboard. |
| Shared labels | `js/labels.js`, `js/panels.js` | Category, status, example and "counts as prospective" chips come from one module used by the Prediction panel and the game; "counts as prospective" is shown only from a `scoreboard.json` row, never computed by the page. |
| Example rounds | `static/dev-fixtures/` | Three rounds behind `?fixtures=1`: Barnard position (retrospective; the straight line beats the model, the model region still holds), Makemake position (catalogue-assisted, arcmin), R Dra brightness (retrospective, mag). Their trials, receipts, verifications and an example scoreboard; an artificial image; a waiting RW Aur trial for the Prediction panel. All `"example": true`. Without `?fixtures=1` the game says no rounds are published and offers a link to the example rounds. |
| Demo tour | `js/tour.js`, `js/main.js` | Rewritten and reachable again ("Play the guided demo" on Home, stop button in a caption bar): Home → Barnard blink (AllWISE context vs SPHEREx, catalogue ring) → follow camera → Swipe → Side by side → R Dra through the six arrays → hand-over to Beat the physics. It shows no measured motion or brightness numbers; reduced motion skips the swipe animation and autoplay. |
| A3: reserved sky | `js/reserved.js` | Reads `data/reserved.json` (V3.3: `tenger.reserved/1`, distance to every `path` point, margin plus half the field diagonal) from real data even in fixture mode. Valid file → it is authoritative (Makemake and Pluto holdout paths, the 3I/ATLAS path; the five challenge targets are open since A3). Missing, unreadable, example or partly malformed file → the built-in list stays in force. |
| A3: strings | `js/i18n.js`, `js/main.js` | The 67 keys of `data/strings.en.json` are copied into the English resource (Session A's wording wins for its keys; my About acknowledgements moved to `ack.*`). At run time the file only fills keys that are still missing, so the site never shows a raw key. A test fails if a published key is missing from `i18n.js`. |
| A3: epochs and comparisons | `js/epochs.js`, `js/main.js`, `js/panels.js` | Epochs are one array in one visit (`v<visit>-d<array>`, `viewer.visit` = the viewer's visit). For the viewer's A/B dates and the chosen array (detector or channel), the page finds the same-array comparison: the caption shows "A and B in array D6: Quantitative" with the reason texts, the all-band view says grades are per array, and Difference is enabled only when that comparison lists `difference`. Evidence shows how many epochs belong to dates in the viewer and the reasons per comparison. |
| A3: index fields | `js/targets.js`, `js/home.js` | `status_reason_key` explains "Not available yet" on cards, the list and the investigation page; index `thumbnails` (with paths under `data/`) replace the legacy blink pair when present. |

**Commands and results**

| Command | Result |
|---|---|
| `node --test tests/*.mjs` | **104 passed, 0 failed** (adds `tests/game.test.mjs`: score bounds, zero/negative/non-finite inputs, perfect baseline, units, ties, invalid rounds, answer-free axes, storage failures; `tests/epochs.test.mjs`: per-array comparisons, the real `reserved.json`, malformed reserved files; strings coverage in `tests/i18n.test.mjs`) |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` | 13 page states incl. `game`, `game-example`, `game-example-revealed`, `game-rdra-revealed` at 360/390/768/1280: measured viewport = requested, no horizontal scroll, no control under 44 px, no script errors (see `viewport-report.json`) |
| In-app browser | Played all three example rounds (tap, Enter, arrow keys, typed values); reveal order and results as above; the Barnard example reports "physics lost"; the tour ran Home → Barnard → follow → swipe and stopped on request; fixture Barnard with D6 enables Difference, D1 and all-band do not |

**Waiting on Session A**

- `static/data/index.json`, real `game/<round>.json`, trials, verifications and `scoreboard.json` (expected
  Sunday morning). The game, Prediction panel and target statuses read them as soon as they exist; nothing
  else needs to change. Real investigation files will switch each target from "not published" to real
  evidence one by one; the viewer keeps the bundled frames, which A3 rebuilds per V3.5.
- The contract has no scalar shape for game rounds yet. The page reads brightness rounds as
  `training_points[{t_mjd, value}]`, `baseline/model/actual {value}` (model may carry `sigma`), `units`
  `"mag"` (brighter up) or a flux unit, and `actual.image` as a path under `data/` or
  `{path, content_type}`. Please confirm or append the shape in the contract.
- The epoch preview images (`epochs[].assets.preview`) are not shown yet; the viewer uses the bundle frames.

**Limits**

- The game is an educational demonstration, not a blind study of players: the round data are in the page.
- Region drawing needs the prediction covariance (position) or `sigma` and `z_max` (brightness); without them
  the page says the region is unavailable.
- Not checked on a real phone; emulated widths and the desktop pane only.

**Next action (proposed)**: when Session A publishes the real rounds, play each one at 360 and 1280 px and
re-capture `docs/screens/`; then the scoreboard page and printable lessons (phase G/H).

### B2 follow-up, 14 Nov 2026 (after Session A's `1c6715a`: first real investigation, index, reserved, strings)

Requested by Session A:

- **Paths with spaces**: `tests/contract.test.mjs` and `tests/i18n.test.mjs` built folder paths from
  `URL.pathname`, which keeps `%20` and failed with ENOENT in `/Users/…/Hackathon Astrolemma`. Both now use
  `fileURLToPath`. Checked by copying `static/` and `tests/` into a scratch folder whose path has a space:
  105/105 pass there.
- **New data keys** (`limit.blended-binary`, `limit.few-visits-parallax`, `limit.visit-systematics`,
  `quantity.parallax_arcsec`): the copied block in `js/i18n.js` is regenerated from `strings.en.json`
  (71 keys). The test keeps failing on any key Session A adds later until it is copied; at run time the page
  fills such keys from the file, so users never see a raw key.

Real data now on the site (`data/index.json`, `data/barnard/investigation.json`, rebuilt Barnard bundle):

- Home: the map draws 7 targets at Session A's cited distances (Gaia DR3 / SIMBAD parallaxes, JPL Horizons);
  3I/ATLAS has no distance and is listed as unplaced. Prediction statuses read "No prediction published yet".
- Barnard: chip "Frames from the investigation (quality-gated DR1/QR3)" because the evidence file has
  `legacy: null` and the bundle carries `dataset_version` (V3.1/V3.5); A/B dates are the file's
  `viewer.visits` (2025-08-29, 2026-03-20, 2026-08-22). What changed shows Session A's explanations, the
  SPHEREx proper motion next to the Gaia catalogue value (content chips "Measured" / "Catalogue"), the values
  that could not be measured folded away with their reasons, and the limitations once. Evidence covers all
  18 epochs. No comparison allows a difference image, so Difference stays off with its reason.
- WISE 0855, ε Indi B, RW Aur, R Dra: the index says `unavailable` (`unavailable.no-validated-product`).
  Their bundled frames stay viewable so the five-target viewer is kept (CLAUDE.md), labelled
  "Legacy frames only; no validated product yet" and "Prepared frames (legacy, not yet re-validated)". If
  the team prefers to hide them until validated, it is one line in `isViewable` (`js/targets.js`).
- `node --test tests/*.mjs`: **105 passed** (adds a test that all five challenge targets stay viewable with the
  real index while unvalidated ones are marked legacy-only). Screenshots regenerated (see below).

### Task R1, 14 Nov 2026 (visual redesign; rebased on Session A's `915c551`)

Goal: TENGER looks like its own product, clearly different from SPHEREx Blink, without changing features,
URL parameters, contract readers, the reserved-sky guard, accessibility or tests. Mood reference only: a
"mission console" (NASA Eyes was not copied: no code, images or logos).

| Page | Commit | What changed |
|---|---|---|
| Design system, Home | `style(web): R1 Home as a map console…` | Tokens at the top of `style.css` (background `#05070d`, glass panels `#0a0f1a` at 85% with backdrop blur and `#1e2738` border, text `#e6edf7`, muted `#8d9bb0`, accent `#5cc8ff`, stars `#ffe08a`, variables `#c9a0ff`, Solar System `#5cc8ff`, Planet Nine `#ffa94d`, hit `#5fd38d`, miss `#ffb547`, waiting `#8d9bb0`), 8 px grid, 12 px radius, one shadow. Self-hosted Space Grotesk / Inter / JetBrains Mono (`static/fonts/`, OFL texts and README; the Google Fonts request is gone). Slim top bar with an orbit mark (phone: Menu). Home is a full-screen map console: starfield, glowing Sun and markers, the "Schematic: not a sky map" note, colour key, floating search card (one box for a name or RA/Dec, FOV, Top places, Real sky, Guided demo, the five challenge shortcuts) and a collapsible Targets rail grouped by type, a bottom sheet on phones. Notices are dismissible toasts. |
| Investigate | `style(web): R1 Investigate as a glass panel…` | A 420 px glass panel slides in over the map (200 ms; a full-screen sheet on phones) with sticky section tabs and titles. The viewer moved to a stage with a bottom time bar: epoch ticks with dates and small previews, play/pause, A and B markers, and the Blink / Swipe / Side by side / Difference control. Caption strip, A/B pickers, wavelength (bands, six arrays) and more controls are in See. Escape closes the panel. New preview mode for evidence files with epoch previews but no frame bundle (Makemake): A/B on the preview images, captions from the epoch records, comparison grade of the pair. |
| Beat the physics | `style(web): R1 Beat the physics…` | Page header, round tabs, glass round panel; plot colours from the design system (you: accent ring; baseline: grey square; model: yellow diamond and region; real observation: green cross). DATA-CONTRACT V4: brightness units `mag_ab`, `ujy`, `ratio`; magnitudes are drawn brighter-up. |
| Learn, About | `style(web): R1 Learn and About` | Numbered lesson cards, the Planet X Lab card in Planet Nine orange; About as cards with a Fonts section (names, designers, links to the three OFL texts). |

Removed from the old look: the "What moved?"-style hero, amber pill buttons, Unbounded/Commissioner fonts,
the old header, landing cards and the full-page AllWISE background behind Home (the Aladin sky is now an
opt-in "Real sky" panel).

**Checks**

| Check | Result |
|---|---|
| `node --test tests/*.mjs` | **106 passed** (contrast test now checks the R1 tokens: text, muted, accent, category and verdict colours ≥ 4.5:1 on background, panel and raised surfaces; dark text on accent ≥ 4.5:1) |
| `docs/screens/capture.mjs`, all pages at 360/390/768/1280 (+1440 for the redesign shots) | Measured viewport = requested; no horizontal scroll; no control under 44 px; no script errors except the expected 404s for files not published yet. Two bugs found on the way and fixed: a `filter` on the dimmed Home made it the containing block for its fixed starfield and sheet (16 px overflow on phones); map labels could stick out of the map on direct investigation links |
| In-app browser | Search (name, coordinates with FOV, invalid numbers), Real sky panel (Aladin loads), rail toggle, chips, open/close the panel, Escape, Space and ←/→ on the plate, swipe, tour start/stop; `/api/observe` trapped during a reserved-path search: 0 requests |

Screenshots: `docs/screens/*.png` (all pages, four widths) and `docs/screens/redesign/` (before and after at 390
and 1440 px, see its README).

**Also in this task**: re-copied `strings.en.json` (85 keys after rebasing on Session A's WISE 0855 commit
`f07081a`); contract V4 brightness units in the game. WISE 0855 now opens with its own evidence file
(available; motion insufficient because a neighbour contaminates it), checked at 390 and 1280 px. Pluto (Session A `7b23199`, partial with previews) opens in preview mode like Makemake; 3I/ATLAS keeps the unavailable state.

**Limits**: not checked on a real phone. The time bar shows evenly spaced epoch ticks (with dates) rather than a
proportional time axis, so uneven gaps between visits are read from the labels. Preview mode shows previews
only (no zoom, spectrum or motion quick look), as the evidence file provides no frames for Makemake.

### Follow-up to Session A's `496d2af` (all five challenge targets rebuilt), 14 Nov 2026

- Rebased; `strings.en.json` re-copied (88 keys). All five challenge targets are `available` with `legacy: null`
  and rebuilt bundles, so the "legacy frames only" label no longer appears (it was derived from the index, no
  code change needed). Their frames are labelled "Frames from the investigation (quality-gated DR1/QR3)".
- **Difference images** are now possible where Session A allows them (Epsilon Indi B 6 pairs, WISE 0855 4,
  RW Aur 1, Barnard 0). The page enables Difference only for the A/B dates of a comparison whose `modes`
  include `difference`, and only with that comparison's single detector array selected (not a channel and not
  the all-band composite). The caption and the difference status line list every check the comparison left
  open, e.g. "Not checked: background." When a quantitative comparison covers the pair, the generic
  "different wavelengths within this range" warning is no longer shown next to it.
- **Brightness ratios** in What changed show the field-star-calibrated value ± sigma and, under it, the raw
  ratio with its statistical error and the field-star control (number of stars, median ratio, scatter).
- Checked in the browser: Epsilon Indi B, D1, A 2025-05-10 / B 2026-04-25 → Difference on, caption "Not
  checked: background"; D5 (registration unverified) and all bands → Difference off.
- `node --test tests/*.mjs`: **107 passed** (new test reads the real Epsilon Indi B file: D1 allows a
  difference image with background `not_checked`, D5 does not, every allowed pair has PSF and registration
  `pass`).

### Task B3, 14 Nov 2026 (phase G: lessons and the Planet X Lab)

| Part | Files | Result |
|---|---|---|
| Lesson maths | `js/lessons.js` (pure) | Small-angle distance d[pc] = b[au]/θ[″] and the shift of a fixed body; Δm = 2.5 log₁₀(F₁/F₂); reflected dimming 1/r⁴ (10 log₁₀ of the distance ratio); H from diameter and albedo; V = H + 5 log₁₀(rΔ) at zero phase; Gaussian tail (erfc, error < 1.2e-7), 2D inside-probability 1 − e^(−k²/2), the 95% radius √(−2 ln 0.05) = 2.4477, false alarms E = N·P(Z > k), all-inside 0.95ᴺ; the Lab model (H, V near opposition with Δ = r − 1 au, apparent diameter, yearly parallax for a body at rest, circular-orbit drift with P² = a³, light time). |
| Lessons | `js/learn-ui.js`, `index.html`, `css/style.css` | Learn shows three lesson cards and the Lab; `?page=learn&lesson=distance|brightness|sure|lab` opens one. Each lesson: the idea, the formula in MathML (native browser rendering, no library to vendor) with the same formula in words, its assumptions, a worked example, three exercises with answers behind toggles, a teacher note, a link to the source investigation (Makemake for 1 and 2, Barnard's prediction panel for 3). Lesson 1 says a parallax-only distance for Makemake or Pluto is a model illustration because they move along their orbits. Lesson 2 says V cannot be compared with SPHEREx near-infrared AB depth and decides no detectability; no AB 18.4 anywhere. Lesson 3 explains 2.45 versus 2, false alarms with the independence caveat, and shows the scoreboard's checked trials, hits, misses, other outcomes and open forecasts per trial type straight from `scoreboard.json` (no rate computed; "no checked trials published yet" today). |
| Records | `js/lessons.js` `readLessonRecord` | Until Session A publishes lesson records (task A5), every lesson uses synthetic practice values computed by the tested functions and labelled "Synthetic practice values … not observations". A record with lesson_id `distance`, `brightness` or `how-sure` (aliases accepted) replaces the worked example and exercises automatically; inputs show their content type, `synthetic` flag, and a warning if a non-synthetic input has no `source_ref`; prompts come from `prompt_key` with `{input}` placeholders. Example records are labelled. |
| Planet X Lab | `js/learn-ui.js` | Sliders for distance (200–1200 au), diameter (5,000–60,000 km) and albedo (0.05–0.8). Results: V, H, apparent diameter, yearly parallax, orbital drift and period, light time, each with its assumption written beside it. Planet Nine is labelled hypothetical and not observed. "Could SPHEREx see it?" answers that this visible-band model cannot decide it (no same-band model adopted). |
| Print | `css/style.css` | Printing from Learn gives a plain white worksheet (no navigation or backgrounds), formulas in black, writing space under each exercise, links printed as text, and the answers on a separate last page. Checked with headless Chrome PDF export: lesson 2 and lesson 3 print as four A4 pages with the answer key alone on page 4. |

**Checks**: `node --test tests/*.mjs` **115 passed** (adds `tests/lessons.test.mjs`: every formula against known values, the synthetic answers, record reading and the unsourced-input flag, scoreboard counts without rates, Lab monotonicity checks such as double albedo = 0.75 mag brighter). The i18n tests confirm every key used by `learn-ui.js` exists in the English resource (prompts, answers, MathML and assumptions all live there). Learn, a lesson, lesson 3 with the example scoreboard and the Lab: no horizontal scroll and no control under 44 px at 360/390/768/1280.

**Waiting on Session A**: lesson records (A5). Lesson ids expected: `distance`, `brightness`, `how-sure`; prompt and teacher texts in `strings.en.json`; numbers with `synthetic` and `source_ref` as in contract §12.

### Task B4, 14 Nov 2026 (phase F/G: the prediction ledger and the reveal; rebased on Session A's A4 `9003251`)

Field names agreed with Session A before A4 froze anything (now DATA-CONTRACT V5): `open_forecast`, `labels`,
`confirmation_pending`, `holdout.data_state` / `check_after_utc`, `prediction_status`, `track`, `training.json`,
`scoreboard.open_forecasts`, `observed.image` geometry, full 40-character receipt SHAs. For A5, the reveal also reads
`residuals.<model|baseline>.reference`, `c_pred_arcsec2` and `observed.cov_arcsec2` = C_obs as scored (Session A's
scoring frame, DATA-CONTRACT V6), so the reveal draws and re-checks exactly what was scored.

| Part | Files | Result |
|---|---|---|
| Predictions page | `index.html`, `js/ledger-ui.js`, `js/ledger-parts.js`, `js/ledger.js` (pure), `js/route.js`, `js/main.js` | Nav item between Investigate and Beat the physics, `?page=predictions`. Built only from `index.json` `trials`, `scoreboard.json` and each trial's `trial`/`prediction`/`receipt`/`verification` files. One card per trial: target, quantity, short status chip (waiting, hit, miss, ambiguous, insufficient data, invalid comparison, see only), every category label (category first), what was predicted for which UTC date (position with 95% semi-axes, or value ± σ, or "no defensible prediction" with Session A's reason key), "Frozen in git `<7-char sha>` on `<UTC>`" linking to `github.com/Nama2323/tenger/commit/<full sha>` (no link for example receipts or an all-zero SHA), the team-confirmation-pending note, raw residuals of model and straight line once verified (east, north, error, D = √d²), and a "Watch the reveal" button for verified position trials. Status comes from `verification.json`, then V5 `prediction_status` (insufficient data at freeze is never "waiting"), then a frozen prediction (waiting); a scoreboard row that disagrees is shown as a warning. Cards: checked, then waiting, then insufficient data. |
| Scoreboard summary | `js/ledger.js` `scoreboardTable` | Category × status table with exactly the categories and statuses present in `counts`; no totals, no percentage, no expected-hit number. Open forecasts and See-only targets are listed by name as "never counted". A disclosure explains the four trial types. |
| Open forecasts | `js/ledger-ui.js` | Separate section "Open forecasts: check back when IRSA releases the data", only for trials the files label (`open_forecast`, `holdout.data_state: not_released` or `scoreboard.open_forecasts`; never inferred from dates). Chart (north up, east left, scale bar): the predicted position and its 95% region to scale, the `track` with each point's own 95% ellipse and first/last dates, a zoom on the reference-time region when it is too small to see, the straight line drawn only if it is on the chart (otherwise its distance is given), and a data table. "Can be checked after `<check_after_utc>`" or "no date announced". Real Pluto forecast: 13-point track with its retrograde loop; Makemake: insufficient data. |
| The reveal | `js/reveal.js`, `css/style.css` | Full-screen `<dialog>`, `?page=predictions&trial=<id>` opens it directly (for recording). Steps on click (picture or button), Space or →; ← back, Home/End: (1) evaluation image, whole, with the prediction area marked; (2) a 1.1 s zoom to that area, training track drawn in with its dates; (3) frozen 95% region (C_pred) growing in, with the receipt line and the category note ("not a blind test" for retrospective); (4) straight-line baseline continuing the track; (5) observed position with its offset; (6) verdict banner (Hit/Miss, D vs 2.45) with the dashed test region (C_pred + C_obs), raw residual table and which of model and straight line was closer. One callout label per step, placed in the free direction (never over markers, the track or the banner). The page recomputes d² from the drawn positions and shows a warning if it disagrees with `verification.json` by more than 2% (the recorded result is never changed). Images are drawn only with centre, pixel scale and north-up/east-left orientation, pixelated so SPHEREx pixels stay visible. Under `prefers-reduced-motion` there is no zoom or entry animation. At 1280×720 the stage is 570 px and every step fits without scrolling. |
| Shortcuts and limits | `js/help.js`, `index.html` | "?" key (and Shift+/) or the "?" button in the top bar opens a keyboard-shortcut sheet (every page, viewer, game, reveal; each row matches a real handler). "Can and can't see" in the top bar (in the Menu on phones) opens "What TENGER can and can't see" on every page. Both are native modal dialogs (Escape, focus kept inside); Escape no longer also closes the investigation panel while a dialog is open. The nav becomes the Menu below 980 px (it has six items now). |
| Investigate panel | `js/panels.js` | Reads V5 `training.obs[]` / `holdout.obs[]` (it said "0 earlier observations" for the A4 trials), shows every label and the confirmation-pending warning, and links to the ledger (to the reveal when verified). |
| Fixtures | `static/dev-fixtures/tools/make-trials.mjs` | Writes labelled example trials with real hash chains: Barnard hit (straight line closer) and Epsilon Indi B miss, both with `training.json` and an **artificial** 48×48 px evaluation image (6.2″ pixels, labelled "Artificial", "Example data, not an observation"); Pluto waiting (confirmation pending); WISE 0855 insufficient at freeze; Pluto open forecast with a 4-point track and Makemake open forecast; the example scoreboard regenerated from them. Positions, covariances, dates and images are invented. |
| Switch to real files | `js/main.js` | The page shows the fixtures (with its own banner) until the real `index.json` lists trials or a scoreboard, then the real files, with no code change. This happened when Session A pushed A4 during this task. `?fixtures=1` still forces the examples, which is the only way to see a reveal until A5 publishes a verification. |
| Lesson 3 | `js/lessons.js`, `js/learn-ui.js` | Its "Open forecasts" column counted `waiting`; under V5 open forecasts are not in `counts`, so the column is now "Waiting for the check" and the text says open forecasts are listed on the Predictions page. |
| Strings | `js/i18n.js` | ~220 new English keys; `strings.en.json` re-copied (112 keys after A4). |

**Checks**

| Check | Result |
|---|---|
| `node --test tests/*.mjs` | **133 passed, 0 failed** (adds `tests/ledger.test.mjs`, 18 tests: trial ids, real-vs-fixture switch, open forecasts only from labels (a far-future date alone is not one), status order and the scoreboard-conflict warning, all labels, receipt links only for real commits, scoreboard counts copied unchanged with no rate field, open forecasts and See-only never counted, fixture hash chains training → trial → prediction → receipt/verification, reveal geometry = recorded residual and D = √d², a tampered residual is flagged, A5 reference frame with C_pred from verification, image placement refusals, forecast tracks and zoom, card order, scale bars, the `trial` route parameter, English text for every step/status/shortcut/limit) |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` | 137 captures, all pages at 360/390/768/1280 plus the reveal at 1280×720 (every step for Barnard, the verdict for the Epsilon Indi B miss): measured viewport = requested, no horizontal scroll, no control under 44 px, no script errors (only the expected 404s for verification/receipt files that do not exist yet) |
| In-app browser | Real ledger after A4 (7 trial cards, 2 open forecasts, scoreboard from the file); fixture reveal stepped with Space, →, ←, End, clicks on the picture; Escape closes it and the URL drops `trial`; the "?" key and both top-bar dialogs; the nav fits at 990 px and becomes the Menu at 768 px |

Screenshots: `docs/screens/predictions*.png`, `predictions-reveal-<step>-<size>.png` (for the video: 1280x720),
`shortcuts-*.png`, `limits-*.png`. Every reveal screenshot shows example data (artificial image, invented numbers);
no trial has been verified yet.

**Limits**

- No real reveal exists until Session A publishes verifications (A5). Until then the reveal can only be shown with
  `?page=predictions&fixtures=1&trial=barnard-position-example` (hit) or `…epsindib-position-example` (miss), which
  are labelled example data throughout. Do not record those frames as results.
- `baseline_track` (V5, open forecasts) is not drawn; the forecast chart shows the straight line only when it falls
  on the chart. The forecast chart does not draw the training track (it is far from the forecast window).
- Labels in the reveal avoid markers, the training track and the banner, but a training date can still touch an ellipse
  when points are crowded (seen on the Epsilon Indi B example at 390 px).
- Commit links point to the private repository until it is made public (Sunday 14:00).
- Not checked on a real phone; emulated widths and the desktop pane only.

**Next action (proposed)**: when A5 lands, open each verified trial's reveal at 1280×720, record the video take, and
re-capture `docs/screens/`; read A5's lesson records in Learn.

### Task H1a, 14–15 Nov 2026 (phase H: release preparation that does not depend on A5; rebased on Session A's A6 `43e8731`)

No new features. What changed:

| Part | Files | Result |
|---|---|---|
| About / Data Sources | `index.html`, `js/pages.js`, `js/i18n.js`, `css/style.css` | What TENGER is and the See / Predict / Learn story. **How TENGER works**: seasons and visits, quality checks, wavelength matching (same array, 10% of the narrower bandwidth, no nearest channel), hold-out predictions and trial types, frozen git receipts, recovery of moving bodies (the pre-registered A4 rule), scoring (D² ≤ 5.991, \|z\| ≤ 1.96, the game's bounded score). **Limits**: saturation (Barnard, RW Aur, R Dra), contaminated targets (WISE 0855 neighbour, RW Aur binary), parallax-only illustrations, a small number of trials (counts are left to the scoreboard; no number is copied), approximations. **What TENGER can and can't see** (same keys as the top-bar dialog). **Data, DOIs and acknowledgements**: SPHEREx (doi:10.26131/IRSA678, doi:10.26131/IRSA679 cited, cube not used), IRSA, WISE/AllWISE, 2MASS PSC (doi:10.26131/IRSA2), Gaia DR3, SIMBAD, VizieR (doi:10.26093/cds/vizier), Sesame, AAVSO VSX (named prior, not needed), JPL Horizons, JPL SBDB (orbits in A6's `scene3d.json`), Aladin Lite (including that it reports its start-up settings and the page address to CDS); required acknowledgements quoted; `ack.spherex` is the exact text of `docs/tenger-context/context/IRSA-acknowledgement.txt` (a test compares them). **Software and licences** from the installed package metadata (Aladin Lite GPL-3.0, Astropy with its citation, NumPy, SciPy, Pillow, FastAPI, Starlette, Uvicorn, HTTPX, pytest, Node.js) plus a table of all 35 Python packages; fonts (OFL). **Built on SPHEREx Blink** (pythonhack000, MIT). **Team**: Narmandakh Garam, Erkhes Orgil, Anu-Ujin Bayarbaatar, Sonomlegtsog Zolzaya (names from the user, no roles; also sent to Session A for the README). **AI disclosure**: planning and audit with OpenAI Codex and Claude; implementation with Claude Code; team review; no AI-generated images. DOIs were resolved on doi.org and their landing pages checked (IRSA678 = DR1 spectral images, IRSA679 = DR1 all-sky cube, IRSA2 = 2MASS PSC). |
| Fixes found on the way | `js/i18n.js`, `css/style.css` | The map text said Solar System distances are from the Sun; the index gives geocentric distances (JPL Horizons), now said so. "Can't see" listed RW Aur and R Dra as saturated but not Barnard's Star. `body.example-data` set `--banner` without re-declaring `--chrome`, so the example banner covered the top 40 px of the investigation (custom properties resolve where declared). |
| Guided tour | `js/tour.js`, `js/main.js`, `index.html` | Home → Pluto (preview blink) → Predictions (scrolls to a "Watch the reveal" button when one exists) → Beat the physics → Learn. Step-by-step with **Next** / **Skip the tour** and "step n of 5", no timers. Starts by itself **once per browser** (`localStorage` key `tenger.tour.v1`, read and written in try/catch) only on a plain visit to Home: never with a target, coordinates, page, trial, example data or `embed=1`, and not at all when storage is blocked (it could not remember, so it waits for the "Guided tour" button). Keyboard focus stays on Next while targets open; on desktop the bar sits over the side panel during an investigation so the picture and time bar stay visible. |
| Embed | `index.html`, `js/main.js`, `js/route.js`, `css/style.css` | `?embed=1` now matches the R1 layout (the old rule hid `.top`, which no longer exists): no top bar, map, tour, footer or other panels; the viewer and See only; Escape does not close it; an **Open in TENGER ↗** link opens the same view on the full site. **Copy embed code** next to "Copy share link" copies `<iframe src="…&embed=1" title="TENGER: <name>" width="100%" height="640" loading="lazy" allowfullscreen>` (escaped, no `fixtures`); if the clipboard is blocked the code appears in a read-only box to copy by hand. |
| Open Graph | `index.html`, `og.png` | `og:*` and `twitter:card` tags; `og.png` is a 1200×630 headless-Chrome screenshot of this site (Barnard's Star, AllWISE 2010 next to SPHEREx 2026, side by side), palette PNG 127 KB (grey and colour palettes built separately so the amber catalogue ring keeps its colour). The tags are static English in `<head>` because crawlers do not run scripts. `og:image` is relative until the public address is chosen. |
| Performance | `css/style.css`, `js/main.js`, `js/ledger-ui.js`, `js/learn-ui.js`, `index.html` | Layout shift fixed: the content stays invisible until main.js has shown the page the address asks for (4 s safety net); the Predictions page shows its heading and one loading line until the ledger is drawn; the Home map and the Learn cards appear when their data are drawn; `main` has a 100vh minimum so the footer never jumps. Lesson cards use `h2` (heading order). Images were already `loading="lazy"`; preview images and frame bundles load only when a target is opened. |
| Captures | `docs/screens/capture.mjs` | Marks the tour as seen before each capture; adds About sections, the tour, embed and the OG sizes. |
| Sky tiles | `js/sky.js` | The Real sky panel probed `alasky.cds.unistra.fr/AllWISE/RGB-W4-W2-W1`, which now answers 404, so it always fell back to the coarse local copy. It now uses IRSA's mirror of the same survey (`ivo://CDS/P/allWISE/color`, CORS `*`, the URL the backend already uses); checked in the in-app browser (tiles from IRSA). |
| Strings | `js/i18n.js` | `strings.en.json` re-copied after A5 and A6 (142 keys); the copy test fails until this is done. |

**Links** (15 Nov 2026, from this Mac; checker in the session scratchpad, not shipped)

| What | Result |
|---|---|
| 39 distinct URLs in `static/` code and HTML | All answer 200 after fixes, except: `github.com/Nama2323/tenger/commit/` (the prefix of receipt links; the repository is private until Sunday 14:00, and all 9 receipt SHAs exist on `origin/tenger-dev`) and `spherex-blink.onrender.com` (200, live service, left as is per team decision 6). Fixed: SIMBAD home (`/simbad/` gave 404, now `simbad.cds.unistra.fr/`), Starlette and Uvicorn (old domains no longer resolve; now `starlette.dev`, `uvicorn.dev`, from their package metadata), the CDS AllWISE tile URL (see Sky tiles). |
| DOIs | `10.26131/IRSA678`, `IRSA679`, `IRSA2` and `10.26093/cds/vizier` resolve; the IPAC landing pages name the right datasets |
| 2,442 IRSA source URLs in `static/data/**/*.json` | All 2,438 distinct files answer HEAD 200. The cutout form of the links (`?center=…&size=…`): 4 of 25 sampled returned a FITS header; the rest got "503 Server busy, retry later" from IRSA, also for 6 single, spaced requests soon after. About 20 minutes later 2 more returned FITS headers (200). That was IRSA load, not broken links; nothing was changed |

**Lighthouse 12.8.2, mobile (default simulated throttling), local server**

| Page | Before | After | FCP / LCP / TBT / CLS after |
|---|---|---|---|
| Home | Perf 81, A11y 100, BP 100, SEO 100 (CLS 0.18) | Perf 86, A11y 100, BP 100, SEO 100 | 1.7 s / 4.0 s / 0 ms / 0 |
| Predictions | 64 / 100 / 96 / 100 (CLS 0.69) | 91 / 100 / 96 / 100 | 1.7 s / 3.3 s / 0 ms / 0 |
| Beat the physics | 85 / 100 / 100 / 100 (CLS 0.16) | 92 / 100 / 100 / 100 | 1.3 s / 3.3 s / 0 ms / 0 |
| Learn | 85 / 98 / 100 / 100 (CLS 0.16, heading order) | 93 / 100 / 100 / 100 | 1.7 s / 3.2 s / 0 ms / 0 |

Not fixed (not cheap or not ours): Predictions best-practices 96 = console 404s for `verification.json` of trials that have none (insufficient data at freeze, open forecasts; the page reads them as "missing"); render-blocking CSS (one 17 kB file); no long cache lifetimes (server or Pages setting); no minification (no build step by design). Home's LCP element is the tour text on a first visit. Page weights before opening a target: about 300 kB (fonts 100 kB); a target's frame bundle loads only when it is opened (Barnard 5.9 MB).

**Images over 200 kB**: none in Session B's folders. Three remain in `static/data/sky/Norder3/` (Session A's folder: `Allsky.jpg` 734 kB, `Npix450.jpg` 214 kB, `Npix451.jpg` 217 kB), the offline copy of the sky tiles, loaded only if IRSA is unreachable when Real sky opens. Not recompressed here (folder ownership).

**Checks**

| Check | Result |
|---|---|
| `node --test tests/` | **141 passed, 0 failed** (adds `tests/release.test.mjs`, 8 tests: the SPHEREx acknowledgement equals the IRSA file word for word; both DOIs and every source, licence, method, limit, team and disclosure key exist; AI disclosure wording; tour order, once-per-browser rules, blocked storage, Next/Skip sequence; embed code escaping; OG tags and og.png 1200×630 under 200 kB) |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` | 163 captures: every page state at 360/390/768/1280 plus the About sections, the tour (Home, Pluto), embed, the embed-code fallback, the reveal at 1280×720 and the two OG candidates. Measured viewport = requested; no horizontal scroll; no control under 44 px; every page ready; the only console errors are 404s for trial files that do not exist (`verification.json` of unverified trials, the fixtures' missing receipt) |
| In-app browser | Tour from a fresh visit (auto-start, Enter on Next through all five steps, focus kept on Next, Finish, no restart on reload); embed at 1024 px; Copy embed code (clipboard blocked in the pane, so the fallback box appeared with the escaped iframe); About at 375 px (no horizontal scroll); Real sky with IRSA tiles; a real reveal (Barnard, verdict step) with no console errors |

**Not done / limits**

- Built on A5/A6 data but does not present them beyond what B2–B4 already read: the Pluto post-mortem ("Why we missed", `trials/pluto/postmortem.json`), the 3D scene (`scene3d.json`) and the lesson records' new wording are not shown or checked in detail. Session A's message: post-mortem is exploratory, after the reveal, and changes no verdict.
- `og:image` is relative; make it absolute when the public address is chosen. Receipt links work only once the repository is public.
- Embed: the iframe uses the address it was copied from (localhost while testing). The embedded page is the whole app in embed mode, so it downloads the same files.
- Not checked on a real phone; emulated widths and the desktop pane only.

**Next action (proposed)**: when the public address is chosen, set absolute `og:url`/`og:image`; then a web task for A5/A6 content (post-mortem in Predictions and Lesson 3, the real reveals at 1280×720 for the video).

### Task R2, 15 Nov 2026 (3D Home scene with the 2D map as fallback; display colours in See)

| Part | Files | Result |
|---|---|---|
| Library | `static/vendor/three/` | three.js **0.187.0** (MIT, `LICENSE` kept). The npm package now ships only unminified builds (2.1 MB for `three.core.js` + `three.module.js`), so the classes the scene uses were bundled and minified once with esbuild 0.25.12 into one ES module, `three-tenger.min.js`: **575 kB, 141.7 kB gzip**. The README gives the entry list, the command, the size and the SHA-256. The site still has no build step. |
| Orbit maths | `js/orbits.js` (pure, no three.js) | Planets from JPL's approximate Keplerian elements (Standish, Table 1, 1800–2050) for today's date: elements + rates, ω = ϖ − Ω, M = L − ϖ, Kepler by Newton iteration, rotation into the J2000 ecliptic. Orbit lines at that date's elements. ICRS → ecliptic for star directions (ε = 84381.448″, as in `scene3d.json`). Log scale R = 10·log₁₀(1 + r / 0.25 au). Seeded illustrative Kuiper Belt (30–50 au). Planet Nine: every published semi-major-axis range in `scene3d.json`, each with its citation (380–980 au, Brown & Batygin 2016; 400–800 au, Batygin et al. 2019; 300–520 au, Brown & Batygin 2021); none → label only. |
| Scene | `js/space3d.js` | Sun with glow sprites; eight planets (sizes exaggerated, Saturn with rings, Earth labelled "SPHEREx orbits it"); faint reference rings 1, 10, 100, 1,000 au with labels; orbit lines in the accent token; Kuiper Belt dots labelled "illustration"; Pluto and Makemake at their JPL Horizons positions with their SBDB orbits from `scene3d.json`; Planet Nine only as faint shaded rings for those published ranges (no point, no orbit line, no edges), labelled "hypothetical" with the three citations and "Not observed: no known position or orbit" (user's note, 15 Nov); the five challenge stars in their real directions (Gaia DR3 / SIMBAD) on an outer shell the camera never leaves, each with a dashed sightline and a label "name · distance" on its near part (a label whose sightline points at the camera fades, so it never sits on the Sun); decorative background stars. CSS2D labels in the R1 fonts; HUD (date, camera target, "Distances not to scale: log scale · sizes exaggerated") in JetBrains Mono. Default viewpoint chosen from the data: no target star within 57° of the line of sight, Pluto and Makemake more than 85° away from it. |
| Interaction | `js/space3d.js`, `js/space-ui.js`, `js/main.js`, `index.html` | OrbitControls (drag, pinch, wheel; damping off under reduced motion); clicking Pluto, Makemake or a star (or its label), choosing a target in the rail, a Home shortcut, the search or the tour flies the camera there (1.4 s, ease in-out; instant under reduced motion) and then opens the existing investigation panel. Stars are approached from behind the Sun. "Reset view", "Top view", "2D view"/"3D view" (the choice is remembered, best effort). On phones the scene sits in the page column; a vertical swipe scrolls the page, a sideways drag turns the scene. The canvas and its labels are `aria-hidden`; the Targets list stays the accessible path. |
| Loading and fallbacks | `js/space-ui.js` | three.js and the scene are fetched only when Home is on screen, after the page's own work, in an idle callback; the 2D map is shown until the 3D scene exists. 2D instead when: no WebGL (or the context fails), `deviceMemory` < 2 GB, a software renderer (SwiftShader, llvmpipe), frames slower than 60 ms during the opening move, `prefers-reduced-motion` (with "3D view" offered), embed mode, or a script error. A note under the colour key says which. Pixel ratio capped at 2; frames are drawn only while the camera moves (controls, damping, flights). |
| See: display colours | `js/plate.js`, `js/stack.js`, `js/main.js`, `js/targets.js`, `index.html`, `css/style.css` | "All bands" is now painted in display colours (D5–D6 red, D3–D4 green, D1–D2 blue, each with its own stretch) when the date has frames in all three groups; a badge on the plate says "Display colours, not for measurement", the caption lists the three ranges, and **Grayscale** sits on the time bar (one click). Dates missing a group, AllWISE context frames, single arrays and Difference stay grey; the caption says why. Preview targets (Pluto, Makemake, 3I/ATLAS) use Session A's per-visit composites (contract V10, `composites_path`, asked for in this task and published in `d66b6f3`): a step whose epoch is listed in a visit's `epoch_ids` shows that visit's display colours, with the badge and a caption saying the colours use their own stretch per visit; steps outside those visits (Pluto's fixed-field pair) stay grey. The old caption said "in false colour" while the composite was painted grey; now it says what is shown. Measurements never used these pixels and still don't. |
| About | `js/pages.js`, `js/i18n.js` | three.js 0.187.0 (MIT) under Software, JPL's approximate planetary elements (Standish) under Data. |

**Added JavaScript (gzip -9)**: three.js bundle 141.7 kB + `space3d.js` 7.2 kB + `orbits.js` 4.0 kB, all loaded lazily; `space-ui.js` 2.5 kB loads with the page. Total **155.4 kB**, under the 300 kB aim.

**Checks**

| Check | Result |
|---|---|
| `node --test tests/` (after rebasing on Session A's A7 `41e8a16`, strings re-copied: 148 keys) | **152 passed, 0 failed**. New `tests/orbits.test.mjs`: Kepler solver; planet positions against JPL Horizons (DE441, jup365, ura184, nep098 vectors at JD 2461358.5 TDB) within 3× JPL's nominal error (actual: Mercury 21.9″, Mars 12.4″, Jupiter 86.9″, Saturn 265.4″, Uranus 0.1″, Neptune 31.5″; distances within 0.006 au); the Earth–Moon barycentre against the Earth position in `scene3d.json`; Julian dates; orbit lines through the planets; log scale; ICRS → ecliptic; Kuiper Belt bounds and repeatability; Planet Nine only as a range from the file; display colours only with all three groups; the 2D fallback rules. |
| Browser, in-app pane (1024 px) and phone width (390 px) | 3D loads after the page; flight from the rail to Pluto, then the investigation; Escape back to Home keeps the camera; Reset/Top; 2D ↔ 3D toggle remembered; display colours ↔ Grayscale with the caption and badge following; no console errors. |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` | **175 captures**: every page state at 360/390/768/1280 plus the 3D Home (default, top view, after picking Pluto) at all four widths. Measured viewport = requested; no horizontal scroll; no control under 44 px; every page ready; the only console errors are 404s for trial files that do not exist (`verification.json` of unverified trials, a fixture's missing receipt). The capture forces reduced motion, so the other Home shots show the 2D map, its "3D view" button and the reduced-motion note. Chrome now gets `--enable-unsafe-swiftshader` so the 3D shots render headless |
| Lighthouse 12.8.2 mobile | Home **66** (was 86): FCP 1.9 s, LCP 4.3 s, TBT 750 ms, CLS 0; this is the cost of three.js on Home. Predictions 91, Beat the physics 91, Learn 90 (unchanged, CLS 0); accessibility 100 on all four. With software WebGL forced (SwiftShader) Home scores 45 (TBT 9.5 s): creating a software context alone took 2.8 s at 4× CPU throttle, which is why software renderers now get the 2D map. An earlier WebGL test-context probe cost 2.5 s there and was removed. |
| Video | `docs/screens/3d/flight-to-pluto-1280x720.mp4` (4.2 s, 30 fps, headless Chrome with a stepped clock, so it is smooth on any machine) and a still `flight-to-pluto-arriving-1280x720.png`; `docs/screens/3d/flight.mjs` re-records it. |

Screenshots: `docs/screens/home-3d*.png` (default, top view, after picking Pluto, four widths). The other captures run with reduced motion forced, so they show the 2D map with the "3D view" button and its note.

**Asked of Session A, and delivered (`d66b6f3`, contract V10)**

- Per-visit composite previews for Pluto, Makemake and 3I/ATLAS (now read, see above).
- `index.json` `prediction.status` after A5: Barnard and Epsilon Indi B now `hit`, Pluto `miss`, so the chips no longer say "waiting". No web change needed.
- `strings.en.json` re-copied (148 keys after A7).

A7 (Pluto open forecasts v2, hindcast) arrived during this task: the Predictions page lists the two new open forecasts next to the v1 one without errors (the index leaves out the abandoned trials). Their `revises` link, the along/cross-track sizes and the hindcast are not shown yet.

**Limits**

- A picture, not an ephemeris: planet positions err by up to ~4.5′ (Saturn) against Horizons, distances are logarithmic, sizes exaggerated. The Planet Nine rings lie in the ecliptic plane only to show distance ranges; the papers' inclinations (11–30° across the estimates) are not drawn.
- Pluto and Makemake are drawn at the scene file's date (14 Nov 2026), the planets at today's date.
- Not checked on a real phone or a real GPU-less device; the slow-device rule is a frame-time threshold, not a benchmark.
- MERGED-PLAN §8 listed elaborate 3D navigation as deferred; this task was requested explicitly.

**Next action (proposed)**: record the final video take from `flight.mjs` once the data are frozen; check the 3D view on a real phone.

### Task R3, 15 Nov 2026 (Pluto's story in 3D, "Why we missed", released regions, Home performance; rebased on Session A's H2 `623cceb`)

| Part | Files | Result |
|---|---|---|
| Why Pluto loops | `js/loop.js` (pure), `js/loop3d.js`, `js/loop-ui.js`, `index.html` (`?page=loop`), `js/route.js`, `css/style.css` | A page with a 3D scene from `scene3d.json` `pluto_loop` and `our_orbit`: the Sun; SPHEREx's orbit (Earth from JPL's approximate elements, within 0.00007 au of the FITS-header positions) drawn **8×** larger than it is; markers at the 50 training (blue) and 20 evaluation (orange) exposure positions; Pluto's path from TENGER's frozen orbit (two-body propagation of `our_orbit`, within 0.0002 au of every `fitted_pluto_au`) and the fitted positions; each exposure's sight line from the drawn telescope through Pluto's real position to a sky sphere, where the sight lines trace the apparent loop (bright up to the slider date); the 2026 check point; the 2027 forecast tracks, v1 from `scene3d.json` and both v2 from their `prediction.json` (RA/Dec + geocentric distance). Time slider (with the date), **View from SPHEREx** (camera at the telescope, looking along its sight line, narrow field), **Top view**, **Reset view**, **2D view**. The label says "Distances not to scale: SPHEREx's orbit is drawn 8 times larger…, so the loop looks about 8 times bigger. Pluto's real yearly shift is about 1.6°" (from the data). Pluto is near the ecliptic (−4°), so its loop is flat: in 3D it reads as a back-and-forth swing. Below it, always, a **true-scale chart** of the apparent path (RA/Dec, east left) with the measured positions, the 2027 tracks and the slider date, and an **arcsecond inset** of the 2026 check (frozen 95% region 6.04″ × 2.49″ at PA 78° and the observation 5.9″ away, from `postmortem.json`). The chart is the 2D fallback (no WebGL, software renderer, reduced motion without opting in, embed). Linked from the Pluto investigation header, the Pluto trial and forecast cards on Predictions, and Lesson 1. |
| Why we missed | `js/postmortem.js` (pure), `js/postmortem-ui.js`, `js/ledger-ui.js`, `js/reveal.js` | A folded section on the Pluto trial card and an open one at the end of the Pluto reveal, chip "Exploratory, after the reveal", every number from `postmortem.json`: we found Pluto 0.35″ from JPL; the forecast was 6.2″ from JPL (5.9″ from our measurement), mostly along the track (5.7″ along, 1.6″ across: about 5.5 hours of Pluto's motion); main cause, too-confident uncertainty (the training detections fell into only 6 groups; shared errors of 0.1/0.2/0.4″ per group would give D² 3.46/1.65/0.45; the training-only jackknife gives 22.6″ × 13.0″, D² 0.70); second cause, the frame (5.76″ → 5.13″ barycentric; 5.14″ N-body); what we changed (the v2 method's name from `hindcast-v2.json`). Then the **exploratory hindcast** (old v1 vs new v2 on the same 2026 check: 5.90″ / 6.04″ × 2.49″ / D² 6.77 / miss, against 5.27″ / 21.2″ × 15.6″ / D² 0.40 / "would have been a hit (not a test)") and the **v1 and v2 open forecasts side by side** (v1 54.1″ × 1.06″ ellipse axes; v2 April 26.4″ × 8.9″ and Sept/Oct 15.2″ × 11.5″ along × across). Files that are not exploratory, or that claim to count, are refused. The v2 forecast cards show Session A's "made after the 2026 miss" label. Session A could not add the number of training exposures (50) to `postmortem.json` without breaking the code hash of the frozen v2 forecasts, so the text says "fell into only 6 groups" and switches to the count automatically if a later file states it. |
| Lesson 3 | `js/learn-ui.js`, `js/main.js` | A second worked example, "why the Pluto forecast was too sure of itself": independent errors average as 1/√N, errors shared within G groups only as 1/√G; the frozen region, the miss (D² 6.77), the jackknife region and its D² from `postmortem.json`; labelled exploratory. Prints with the lesson. |
| Released regions | `js/reserved.js`, `js/pages.js`, `index.html` | `reserved.json` V10: a region is lifted only by `status: "released"` **with** a `release_reason_key`; no status, another status, or a release without a reason keeps it reserved (fail closed, tested). Pluto (verified) and Makemake (nothing to verify) no longer block live loading; 3I/ATLAS still does. About lists every region with "Released: live loading allowed" or "Reserved: live loading paused" and the reason text; if the file cannot be read, it says the built-in list is in force. |
| View toggle fix | `js/space-ui.js` | With the delayed start, the Home button said "2D view" while the 2D map was still showing (the 3D view chosen but not started), and clicking it switched 3D off and saved "2D". It now names the view that is not on screen, and "3D view" starts 3D at once; the idle start and a click cannot create two scenes. Found because the 3D screenshots failed. |
| Offline sky tiles | `tests/release.test.mjs` | Already true, now tested: `data/sky` appears only in `sky.js`, which tries IRSA's survey first; `createSky` is called once, from `openSkyContext`, which runs only when the Real sky panel opens. Home loads none of these tiles. |
| Home performance | `js/space-ui.js` | three.js now starts on the visitor's first interaction (pointer move or press, touch, wheel, key) or, failing that, once the page has loaded and then stayed idle for 4 s (`requestIdleCallback`). The 2D map is the page until then. Lighthouse mobile, Home: **85** (FCP 1.9 s, LCP 4.1 s, TBT 0 ms, CLS 0), up from 66. In Lighthouse's run three.js was not fetched at all: its measuring window closes before the 4 s idle start, so the score does not include the 3D start-up. That cost now comes after the page is usable: under 0.25 s of main-thread time in a 4×-throttled CPU profile with hardware WebGL. |

**Checks**

| Check | Result |
|---|---|
| `node --test tests/` | **165 passed, 0 failed**. New: `tests/loop.test.mjs` (orbit propagation vs `fitted_pluto_au` and `position_now`; directions from the data vectors vs measured RA/Dec within 3″; telescope position vs FITS-header positions; sight lines through Pluto onto the sphere; drawn loop wider than the true one by roughly the exaggeration; the loop model's exposures, check and v1/v2 tracks, v2 points rebuilt from RA/Dec + distance), `tests/postmortem.test.mjs` (every number from the files; refusals; hindcast; 95% axes from covariance eigenvalues; v1/v2 rows; 1/√G), release-region and offline-tile tests. |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` | **213 captures** (every page state at 360/390/768/1280, the new states, and 1280×720 for the loop page, Why we missed and the Pluto reveal's end): measured viewport = requested, no horizontal scroll, no control under 44 px, every page ready, no console errors other than 404s for trial files that do not exist. The 3D shots first failed: see the toggle fix above |
| Lighthouse 12.8.2 mobile | Home **86** (FCP 1.2 s, LCP 4.2 s, TBT 0 ms, CLS 0; three.js not fetched in its window, see above), Predictions 90, Beat the physics 90, Learn 89; accessibility 100 and CLS 0 on all four; best practices 96 on Predictions (the expected 404s) |
| In-app browser | Loop page: 3D scene, slider, View from SPHEREx (the loop face-on as a flat swing), Top/Reset, the true-scale chart and inset; Why we missed on the Pluto card and at the end of the reveal; Lesson 3's example; About's reserved list; no console errors. |

Screenshots: `docs/screens/loop*.png` (2D at four widths; 3D default, from SPHEREx and top view, incl. 1280×720 for recording), `predictions-why-*.png`, `reveal-pluto-why-*.png`, `learn-lesson-sure-pluto-*.png`, `learn-lesson-distance-loop-*.png`, `about-reserved-*.png`.

**Limits**

- The 3D loop is exaggerated 8× by design (labelled); the arcsecond-level comparison is in the inset and in "Why we missed", not in the 3D.
- The 3D draws Pluto from our two-body orbit for any date (light time ignored for drawing) and the telescope as the Earth–Moon barycentre.
- Not checked on a real phone or a real GPU-less device.

`python -m scripts.validate_release` (Session A's validator) on this tree: 77 contract files checked, 0 failures.

### B5 part 0, 15 Nov 2026: public address (site live at https://nama2323.github.io/tenger/)

- `og:url` and `og:image` are now absolute (`https://nama2323.github.io/tenger/`, `…/og.png`); a test checks both. The live
  page and `og.png` answer 200.
- Receipt links checked on the public repository: all 11 receipts open `github.com/Nama2323/tenger/commit/<full sha>` with
  HTTP 200, and each SHA is the matching "predict: freeze …" commit (the two v2 Pluto open forecasts share `fd758e5`).
- `node --test tests/`: 165 passed.

### Task B5, 15 Nov 2026 ("Could SPHEREx see Planet X? We measured it" and "Find the hidden planet")

Shapes agreed with Session A before either file existed (to become DATA-CONTRACT V12): artificial content lives
only under `static/data/planetx/`; kinds `tenger.planetx_depth/1` and `tenger.hidden_planet/1`, both with top-level
`artificial: true` and `counts: false`. Until Session A publishes them, the page reads labelled examples from
`static/dev-fixtures/planetx/` (made by `dev-fixtures/tools/make-planetx.mjs`: invented curves, synthetic frames,
every file `"example": true`) and switches to the real files automatically, file by file.

| Part | Files | Result |
|---|---|---|
| Measured panel (Planet X Lab) | `js/planetx.js` (pure), `js/planetx-ui.js`, `js/learn-ui.js` | Under "Could SPHEREx see it?": per band (published band, SPHEREx array, μm range) the pooled recovery-fraction curve with its 95% interval band (from the file, else Wilson from the counts), dashed 50% and 90% levels and the depth lines with values (the file's depths and intervals; missing ones interpolated from the curve), published Planet Nine predictions drawn only where the file gives a same-band AB value (others listed, not drawn), the WISE limit, the overall verdict text (`verdict_key`) and per-band gaps, the mission-sensitivity statement. Beside it, the assumptions in plain words (injections per point, single exposures, the detection rule from `method`, the interval, what depth means, the same-band rule, plus the file's `assumption_keys`); under it a data table per band (magnitude, added, found, fraction, interval) and per field (exposures, depths, false detections in blanks). `stacked_projection` is never read. Chip "Measured by TENGER" for the real file, "Example data, not an observation" plus a note for the example. |
| Find the hidden planet | `js/planetx-ui.js`, `index.html` (`#hidden-round` on Beat the physics) | Optional round under the regular ones: the two frames of a pair blink (or Frame A / Frame B; no autoplay under reduced motion), the label "Artificial planet added for this game" on the picture and in the chips before and after the reveal. Tap (or arrow keys, Shift ×5, Enter) to guess; "Check my guess" reveals where the planet was put in both frames, the pipeline's positions, the distance in pixels and arcseconds, inside or outside the tolerance circle, whether the pipeline found it (with its lowest S/N) and "not a detection, never counted outside this game". The reader refuses a file without `artificial: true` and `counts: false`, frames outside `planetx/`, frames marked anything but artificial, or a pair without injected positions in both frames. The example round's text says its frames are synthetic (not "real SPHEREx pictures"). |
| Links | `index.html`, `js/learn-ui.js` | "Could SPHEREx see Planet X? We measured it" on Home (search card) and Predictions (page head), and one line in Lesson 2, all to `?page=learn&lesson=lab#measured` (scrolls to the panel). |
| Public address (part 0, `023d604`) | `index.html` | Absolute `og:url`/`og:image`; receipt links checked (see the B5 part 0 note above). |

**Checks**

| Check | Result |
|---|---|
| `node --test tests/` | **172 passed, 0 failed**. New `tests/planetx.test.mjs`: Wilson intervals against known values; 50%/90% depth interpolation; magnitude ranges; the V12 depth reader (pooled curves, depth intervals, interpolated missing depths, same-band models only, WISE limit, projections never read, refusals); the example files labelled; hidden-planet refusals (no `artificial`, `counts` not false, frames outside `planetx/`, a frame marked otherwise, one frame, one injected position); tap distances in pixels and arcseconds; every label in English. The fixture test knows the two new kinds |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` | **229 captures** incl. `learn-lab-measured`, `learn-lesson-brightness-planetx`, `game-hidden`, `game-hidden-revealed` at 360/390/768/1280: measured viewport = requested, no horizontal scroll, no control under 44 px, every page ready, no console errors other than 404s for files not published yet |
| In-app browser | Lab panel with the example data (chart, interval band, depth lines, markers, assumptions, table); hidden-planet round: blink, tap, reveal with both injected positions, the pipeline's positions, distance and verdict; labels before and after; no console errors besides the expected 404s for the unpublished real files. |

**Waiting on Session A**: `static/data/planetx/depth.json`, `hidden-planet.json` and frames (target before 10:00 UB),
plus the strings for their `verdict_key`, `note_key`, `assumption_keys`, `statement_key` and `rule_key`. Nothing in
the page has to change when they land; I will check the real files in the browser then.

**Loading**: the Planet X files are fetched only when Learn or Beat the physics opens (Home and Predictions load just the two small modules), so the 404s for the unpublished real files never appear on other pages. Lighthouse mobile after B5: Home 85, Predictions 90 (best practices 100 on Home).

**Limits**: the gap line in the panel does not say which depth the gap is measured from (the file's verdict text
should); per-field curves are shown as tables, not charts; not checked on a real phone.

### Task B6, 15 Nov 2026 (asteroid batch: calibration on Predictions and in Lesson 3)

**State of A9**: Session A has no A9 task, so there is no real asteroid batch, no agreed schema and no decision on
whether a batch counts on the scoreboard. Session A said those are the user's decisions. B6 is built against an
**invented, labelled example** and the shape Session B proposed (below); it switches to a real batch on its own once
`index.json` lists one in `batch_paths[]`.

**Proposed shape (not in DATA-CONTRACT yet)**: each asteroid is a normal trial (`trials/<id>/{trial,prediction,
receipt,verification}.json`, trial with `target_name` and `batch_id`); one summary per batch,
`batches/<id>.json`, schema `tenger.batch/1`, with `team_statement_pending`, `trial_ids[]`, `calibration {n, k_inside,
level, interval, interval_method, expected_inside, independence_note_key}`, `rows[] {trial_id, name, d, d2, inside,
model_error_arcsec, baseline_error_arcsec, status, excluded_reason_key}` and `note_keys[]`.

**Never a test scoreboard on the public page**: the invented example is read only in `?fixtures=1` mode. Without a
real batch the Predictions page and Lesson 3 show nothing about it and request no fixture file (checked in the
browser). A batch file under `static/data/` that says `"example": true` is refused.

| Part | Files | Result |
|---|---|---|
| Batch reader and maths | `js/batch.js` (pure) | `readBatch` (counts and interval from the file when it has them; otherwise counted from the rows with excluded rows left out, exact interval computed and flagged), exact Clopper–Pearson interval, `coverageVerdict` (95% inside / above / below the interval), `chartRows`, `baselineWins` (ties count for neither), `whatIfRows` (same share, 4× and 16× the tries). |
| Predictions: "Asteroid batch" | `js/batch-ui.js`, `js/ledger-ui.js`, `index.html` (`#ledger-batch-host` after the scoreboard), `css/style.css` | Chips (category, example, **Team statement pending** while the file says so) and a note. Summary at the top: "k of N landed inside our 95% regions", the interval with its method, whether 95% lies inside it, the expected count, why a small N is wide, the independence assumption. A dot chart of each asteroid's D against the dashed 2.45 line (inside/outside colours, data table). A scatter of model error against straight-line error with the diagonal and the count each way. One card per asteroid: small sky plot (forecast, 95% test region from forecast plus measurement covariance, observed cross; north up, east left), forecast RA/Dec and date, region half-axes, observed offset and D, straight-line error, verdict chip, and the freeze commit link (none for an example or zero receipt). Batch trials are not shown again as single cards. |
| Lesson 3 worked example | `js/batch-ui.js` (`lessonBatchSection`), `js/learn-ui.js` (`setBatch`), `js/main.js` (`ensureBatch`, loaded when Predictions or Learn opens) | "Did our 95% regions hold 95% of the time?": k of N and the share, what k of N means (expected count, chance), why a small N is not proof (the exact interval and its width), a what-if table with the same share at 4× and 16× the tries (labelled computed, not measured), the independence caveat and the source file. Every number from the batch file except the labelled what-if rows. |
| Example fixture | `dev-fixtures/tools/make-batch.mjs` → `dev-fixtures/batches/asteroids-example.json`, `dev-fixtures/trials/asteroid-NN-example/` | 12 invented asteroids, all `"example": true`, zero commit SHA, hash chain trial → prediction → receipt/verification, residuals built so each D² = rᵀS⁻¹r exactly (10 of 12 inside; the straight line wins 3). |
| B5 follow-up (Session A's answer) | `js/planetx.js`, `js/i18n.js` | The gap line now says it is the prediction minus our pooled 50% single-exposure depth (positive = fainter than one exposure reaches); `limitation_keys` are read alongside `assumption_keys`. |

**Checks**

| Check | Result |
|---|---|
| `node --test tests/` | **180 passed, 0 failed**. New `tests/batch.test.mjs`: the 2.4477 limit; Clopper–Pearson against known values; intervals narrowing with N; coverage verdicts; the reader from file vs counted (excluded rows, D-only rows, ties, refusals); the example consistent with its own trial files (D² from residual and region, verdicts, batch ids); the loader never returns the example on the public page, switches to a listed real batch and refuses a real-path batch marked as an example; every label in English. Contract fixture test knows `batches/` (kind `batch`); `planetx.test.mjs` checks `limitation_keys`. |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` (B6 pages, merged into the full report) | `predictions-batch`, `predictions-batch-charts`, `predictions-batch-cards`, `learn-lesson-sure-batch` at 360/390/768/1280, plus `predictions` and `learn-lesson-sure` again: measured viewport = requested, no horizontal scroll, no control under 44 px; report now 245 entries, none wide. Console errors only 404s for fixture trials without verification files and the unpublished Planet X files. |
| In-app browser | `?page=predictions&fixtures=1`: section, summary, both charts, 12 cards; `?page=learn&lesson=sure&fixtures=1`: worked example and what-if table. Public `?page=predictions` and `?page=learn&lesson=sure`: no batch section and no batch or fixture requests. |

**Needs the user**: give Session A the A9 task (or drop it). Decide whether a batch counts on the main scoreboard and
whether one freeze commit covers all its trials; the page does not depend on either answer.

**Limits**: the shape is Session B's proposal until it is in DATA-CONTRACT; with only the example, nothing about the
batch is visible on the public site; not checked on a real phone.

### Fixes after B6, 15 Nov 2026 (Planet X band arrays and pixel scale; Session A's real A8 files checked)

| Fix | Files | Result |
|---|---|---|
| Example W1 on the wrong array | `dev-fixtures/tools/make-planetx.mjs`, `dev-fixtures/planetx/depth.json` | W1 (3.35 µm) moved from D3 (1.63–2.41 µm) to **D4 (2.42–3.82 µm)**; example regenerated (only the W1 lines changed; the generator is seeded). |
| Band ↔ array check | `js/planetx.js` (`PUBLISHED_BAND_UM`, `bandWavelengthCheck`, reusing `DETECTOR_RANGES` from `js/stack.js`), `js/planetx-ui.js` | Johnson I 0.80 µm, W1 3.35 µm, W2 4.60 µm must lie inside the array the file names, and the file's own wavelengths inside that array. The panel shows a warning on any band that fails. Test runs on the example **and on Session A's real `depth.json`**: i → D1 (0.75–0.87 µm used), w1 → D4 (3.25–3.55), w2 → D6 (4.45–4.75), nominal wavelengths within 0.1 µm. |
| Pixel scale of the hidden-planet frames | `js/planetx.js` (`tapReport`, `NATIVE_PIXEL_ARCSEC`), `js/planetx-ui.js`, `js/i18n.js` | The scale is still read per frame from the file. Session A's real frames say **3″ per picture pixel**: they were resampled from ~6.15″ detector pixels when aligned. Checked independently: in all four pairs, the injected positions' pixel distance × 3″ matches their RA/Dec separation to 0.2%; the 2.05-px tolerance = 6.15″ = one detector pixel. The reveal now writes the sum out ("12.4 pixels × 3″ = 37.2″", circle "2.05 pixels (6.15″)") and adds one line saying the frames were resampled. Tests: shown arcsec = shown px × that frame's `pixel_arcsec` for every pair in the example and the real file; the real scale agrees with the sky positions. |
| Real A8 files in the browser | `js/planetx.js`, `js/planetx-ui.js`, `js/i18n.js`, `css/style.css` | Found and fixed with the real data: the headline sentence's numbers were blank ("AB , and :"); it is now filled from `verdict_summary.values`. The 18 verdicts were 18 repeated paragraphs with "± 0.0"; they are now one sentence ("18 of 18 … closest Linder & Mordasini 280 AU in Johnson I: 0.36 ± 0.04 mag, factor 1.4") and a table (prediction, band, predicted AB, our 50% depth, gap ± σ to 0.01 mag, flux factor; WISE limit row named). Chart markers carried the same long reference and overlapped; they are now numbered, with a key under each chart (scenario and AB). "Each point: —" now counts injections from the curves (479–485). `limitation_keys` shown. |
| Strings | `js/i18n.js` | Session A's `strings.en.json` re-copied (V12: 168 keys not already defined here). |

**Checks**: `node --test tests/` **185 passed, 0 failed**. Captures `learn-lab-measured`, new `learn-lab-measured-w1`, `game-hidden`, `game-hidden-revealed`, `learn-lesson-brightness-planetx` at 360/390/768/1280 with the real files: report 249 entries, no horizontal scroll, no control under 44 px, every page ready, no console errors other than 404s. Session A's validator: 79 contract files, 0 failures.

### Task B7 part 0, 15 Nov 2026 (Beat the physics: answer leak fixed)

**The leak**: every round file measures positions from "the frozen model at the reveal time", and the page drew
them in that frame, so before the reveal the chart's 0,0 (where the zero gridlines cross), the typed offsets and the
training table were all measured from the model's answer. Tapping the crossing tied the model every time.

**Fix** (`js/game.js`, `js/game-ui.js`, `js/i18n.js`; data files unchanged): before the reveal everything on screen
is an offset from the **last training measurement** (axes, typed offsets, status line and training table say so).
The view comes only from the training points plus, around the last measurement, their own least-squares speed ×
the days to the target in every direction (`guessView`); after the reveal it may widen to show everything
(`revealView`). Guesses are stored and scored in the file's frame, so scores are unchanged. Scalar rounds were
not affected (their axis is the measured value).

**Checks**: `node --test tests/` 187 passed. New tests on every real and example position round: the pre-reveal
state is identical when the model, baseline and actual are moved anywhere; no coordinate shown equals any of them
(as offsets from the last measurement); the screen's 0,0 is the last measurement, not the model; the view holds the
training points and speed × days in every direction; it only widens after the reveal and then shows all three;
a typed offset at the actual's offset scores as the actual. In the browser (real Barnard, ε Indi B, Pluto rounds):
the zero gridlines cross on the last dot, typing 0, 0 puts the guess there, the axis labels fit.

### Task B7, 15 Nov 2026 (Beat the physics: help players predict)

Part 0 (the answer leak) was published on its own as `a422795`, see above. User decisions recorded for B6: the
invented batch stays behind `?fixtures=1`; when Session A's real batch lands it is its own block on Predictions and
is **not** added to the main hit/miss headline (B6 already shows it only as its own section).

| Part | Files | Result |
|---|---|---|
| How to predict | `js/game-help.js` (`howToBox`), `js/game-ui.js` | A box above the chart, open on the first visit, then remembered closed (best-effort storage; open every time if storage is blocked). Text per round type (`game.js roundType`): stars (Barnard's Star, ε Indi B): straight drift plus the yearly loop, four steps (direction, speed between dated dots, extend to the target date, allow for the bend); Pluto (and Makemake): moves along its orbit, Earth's motion makes it loop backwards once a year, link "Why Pluto loops"; brightness rounds: rising/fading, rate, turning. |
| Dates | `js/game.js` (`dateClusters`), `js/game-help.js` (`timelineStrip`, `clusterDate`) | Every group of dots (one SPHEREx visit, dots ≤ 30 days apart) is labelled on the chart with its dates ("2025-08-21 – 08-27"). Under the chart a time line: one mark per visit at its start date, the target date, the stretch from the last measurement to the target, and "The target date is N days after the last measurement (date)". Positions follow the days; dates alternate rows so close visits never touch. |
| Hints | `js/game.js` (`trainingMotion`, `hintDirection`, `hintRuler`), `js/game-help.js` (`hintBody`, `hintOverlay`), `js/game-ui.js` | Optional, one at a time, position rounds only, all from the training points on screen: 1 "Which way?" arrow along the least-squares direction of motion with the compass word; 2 "How far?" dashed ruler from the last measurement with a tick every 30 days to the target date, the speed per day and the distance, "a straight-line extrapolation: it ignores the bend"; 3 "Why the path bends" one sentence for the round type and a small labelled sketch of the yearly loop. The results table says "You (with N hints)"; the score formula is unchanged. Hints lock with the guess. |
| After the reveal | `js/game.js` (`resultExplanation`), `js/game-help.js` (`explainResult`) | One line with the errors from the round file's `outcome` block (positions as fallback): e.g. Pluto "The straight line missed by 19,870″ (5.5°) because it ignores the loop that Earth's motion adds every year; the physics model, which follows both Earth and Pluto, missed by 5.9″. That was outside the model's own 95% region, so the trial counts as a miss." When the straight line was closer it says so ("Physics is allowed to lose"). |

**Checks**

| Check | Result |
|---|---|
| `node --test tests/` | **191 passed, 0 failed**. The leak test now also covers the date groups, the hint direction and the ruler (the pre-reveal state does not change when the answers move; no shown coordinate equals them). New: round types; one date group per visit on the real rounds (2/3/2); date labels; hint direction is a unit vector, ruler ticks every 30 days and its end at speed × days; compass words; angle text; the explanation uses the file's outcome numbers (Barnard 3.1073/1.5188″, Pluto 19869.7467/5.8991″ and "outside"), the example where the straight line wins says so; English strings for every round type. |
| `node docs/screens/capture.mjs http://localhost:8766 docs/screens` (game pages, merged) | New `game-howto`, `game-hints`, `game-timeline`, `game-pluto-hints`, `game-explained`, plus `game`, `game-example`, `game-example-revealed`, `game-rdra-revealed` again, at 360/390/768/1280: no horizontal scroll (the first time-line design overflowed at 768 and was redrawn), no control under 44 px, every page ready, no console errors. Report: 269 entries. |
| Keyboard (in-app browser, real ε Indi B round) | Tab to "How to predict", Enter opens it; Enter on the hint button shows hints 1 and 2 and keeps focus there; arrow keys on the chart move the guess from the last measurement (0.18″ steps), Enter locks it and moves focus to the next reveal step; the hint button is disabled after the lock. |

**Limits**: the yearly-loop sketch is a schematic, not the round's real loop; the hint direction uses all training
dots, so for Pluto (two visits) it is the line between the visits; not checked on a real phone.

### Task B8, 15 Nov 2026 night (release QA, credits, demo clips)

**Release QA in public mode** (no `?fixtures`; headless Chrome crawl of 52 URLs: every page, lesson, the Lab, the
loop, all 8 targets × 4 panels, viewer modes, a reveal, embed and a coordinate search; every visible button
clicked once on 11 main pages):

| Found | Fix | After |
|---|---|---|
| 8 failing requests (404, logged as console errors) for `verification.json` of trials that cannot have one yet | `js/contract.js` `verificationNotDue`: no request when `prediction_status` is `insufficient_data` or an open forecast is before its `check_after_utc` (contract V5); every other trial is read as before. Test with a request spy. | 0 failing requests, 0 console errors |
| "Full screen" threw an uncaught "Permissions check failed" when the browser refused (also real users in an embed without `allowfullscreen`) | `js/main.js`: the refusal shows a note | 0 button errors |
| Hidden-planet reveal said "moving —″" with Session A's real file (`motion_arcsec` is `{east, north, total}` in V12) | `js/planetx.js` reads the object or a number; test on the real file | "moving 46″" |
| Session A's V13 strings (`batch.*`, `train.*`) made the copy test fail on `tenger-dev` after `e93e9a5` (I pushed before re-running; now every push is gated on 0 failures) | Re-copied (179 keys); our own sentence renamed `batch.assumeIndependent` so Session A's `batch.independence` keeps its wording, and a real batch's note replaces ours instead of repeating it (`b8b0e67`) | 194 tests pass |

No request to `dev-fixtures` on any public page. Links: all 43 external links on the site resolve (200); all 11
"frozen in git" receipts open their commit (200), and each commit contains that trial's `prediction.json`
(GitHub API); every DOI redirects from doi.org to its record (A&A and IOP pages answer scripts with a bot check,
not a broken link); the 3 font licence files are served.

**Lighthouse mobile** (simulated throttling; `?page=learn&lesson=lab` for the Lab; two runs where they differed):

| Page | Performance | Accessibility | Best practices | SEO | LCP |
|---|---|---|---|---|---|
| Home | 81, 82 | 100 | 100 | 100 | 4.6 s (the first-visit tour text) |
| Predictions | 87 | 100 | 100 | 100 | 3.8 s |
| Beat the physics | 88 | 100 | 100 | 100 | 3.9 s |
| Learn | 87 | 100 | 100 | 100 | 3.9 s |
| Planet X Lab | 80, 82 | 100 | 100 | 100 | 4.9 s |

Home is above the ≥ 80 target from R3 but below B5's 85–86; not changed (fixes only).

**Credits** (`js/pages.js`, `index.html`, `js/i18n.js`): About adds IRSA MOST (A9: training exposures only;
evaluation rows cut to identifiers and times) and the A9 use of JPL Horizons (compared only after each verdict), and
a new list "Published values we compare with": Linder & Mordasini 2016, Fortney et al. 2016, Meisner et al. 2018,
Blanton & Roweis 2007, Cutri et al. 2012 (WISE Explanatory Supplement IV.4.h), SPHEREx Public-products, Crill et
al. 2025, and the five Planet Nine orbit papers drawn on the 3D Home, each with DOI/arXiv/URL links (all checked).
The IRSA SPHEREx acknowledgement is unchanged (test: word for word against the IRSA file). New test: every DOI in
the published data is linked on About.

**Demo clips** (`docs/screens/demo/`, recorder `record.mjs`, README): a Home 3D (5.7 s), b Predictions (6.1 s),
c Beat the physics ε Indi B with Hint 2 and the reveal (6.3 s), d Planet X Lab W1 (5.0 s), e Find the hidden planet
(6.0 s); all 1280×720 H.264 yuv420p 30 fps, 0.14–1.30 MB, public site, no fixture request, no page error.
(f) asteroid batch **skipped**: not published by Session A yet.

**Checks**: `node --test tests/` 194 passed, 0 failed. Captures of the touched pages at 360/390/768/1280 (65,
incl. new `about-refs`): no horizontal scroll, no control under 44 px, every page ready, **no console errors**;
report 273 entries. Session A's validator: 79 contract files, 0 failures.

### Planet X wording fix, 15 Nov 2026 morning (user's rule; plus a lesson regression found on the way)

**Planet X Lab** (`js/planetx.js`, `js/planetx-ui.js`, `js/i18n.js`, `css/style.css`). "18 of 18 published values
are fainter than one exposure reaches" overstated the closest case. Now every published value is read against the
same band's pooled curve in `planetx/depth.json`:

- `recoveredAt`: the fraction found at that magnitude. It is linear in magnitude between the two neighbouring
  tested points and labelled "interpolated", with both points' Wilson 95% intervals. Beyond the faintest test there
  is no value, only that point's upper bound.
- `reachOf`: under 5% found = "Too faint for one exposure". At least 5% and fainter than our 50% depth =
  "Below our 50% depth; found in about N% of single exposures". At or brighter than the 50% depth = within reach.
- On Session A's file: Linder & Mordasini at 280 AU (AB 17.45, Johnson I) = 0.415 + 0.8 × (0.250 − 0.415) =
  **28%**, between AB 17.25 (41.5%, 37.2–46.0%) and 17.50 (25.0%, 21.3–29.0%). The other 17 values are 0% or
  beyond the curve (upper bound 0.8%).
- The gap table gains "Found in one exposure" and "What it means" columns. The gap column reads "± our error",
  with a note: the ± is our measurement error only, and the planet's predicted brightness is uncertain by far more
  (mass, albedo, distance).
- Headline (`planetx.headline`, using the file's `verdict_summary.values`): "Only the closest published case comes
  within reach, and one exposure would catch it about 1 time in 4." It falls back to the file's own sentence if the
  values are missing or the nominal planet is not under 5% in every band.
- Session A told the rule, the suggested keys (`planetx.verdict.partial`, optional `recovered_fraction`) and the
  sentence. A test checks the file's verdict keys against the curve once A10 lands. Until then, the only mismatch
  allowed is "too faint" on a row between 5% and 50%.
- Layout fix: opening the 18-row table stretched the page to 1632 px at 360. Fixed with `minmax(0, 1fr)` columns
  on `.lesson`, `.lab-view` and the Planet X grids.

**Lesson regression (live since `3c7e7c1`, 02:36).** Re-copying Session A's V12 strings dropped 11 keys that the web
also defined: `lesson.distance.q1–q3`, `lesson.brightness.q1–q2`, and both lessons' `.title`, `.formula` and
`.teacher`. Session A's real exercises were therefore filled into the web's example templates and printed blanks
("With a baseline of , a star shifts by ."). Fixed:

- The web's own keys are renamed (`lesson.*.math` for the MathML, `lesson.*.synthetic.q*` and
  `lesson.*.synthetic.teacher`), and Session A's 11 keys are copied back (190 keys).
- Record numbers go into Session A's sentences bare, to 4 significant figures. Before: "4.086182°° in 203.890759
  unit.d days". Now: "4.086° in 203.9 days".
- Answers use 4 significant figures and show the file's z ("0.064 mag (z = −1.142)").
- Units without text never print their key. New: `d`, `h`, `min`, `deg/d`, `expected hits`; `fraction` and
  `probability` print as plain numbers.
- New tests: the web may not redefine a Session A key with different text (only `planetx.title` is allowed, a
  heading without the full stop); every lesson record's prompt is filled from its own inputs, and every unit has
  English text.

**Demo clip (d)** re-recorded with the new headline (5.3 s, 1.03 MB).

**Checks**: `node --test tests/` 201 passed, 0 failed. Captures of every Learn page and the new `learn-lab-reach`
(the table open) at 360/390/768/1280: no horizontal scroll, no control under 44 px.

**After Session A's A10 follow-up (`f1d0cc4`)**: re-copied its strings (191 copied + 3 the web defines;
new `planetx.verdict.partial`). `depth.json` now carries `recovered_fraction` per verdict; the test that the
file's verdict keys agree with the curve is active and passes. The file's headline and the page's are identical
(new test).

### Asteroid batch, real file (A9 frozen: `61b3cb7`, `ffe833f`), 15 Nov 2026 morning

Session A's frozen batch is now listed in `index.json`. With the B6 code it would have read "0 of 0 landed inside …
consistent with 95%", sent 7 failing requests for verification files that cannot exist yet, and broken the card
layout. Fixed:

- `js/batch.js`: V13 row fields (`model_*`, `secondary_*`, `baseline_*`; the example's bare names still read). The
  secondary and straight-line calibration blocks are read separately. With nothing checked there is no interval
  and no coverage verdict.
- `js/batch-ui.js`: "8 asteroid forecasts frozen in git on 2026-11-14 21:54 UTC. None has been checked yet.",
  then "7 waiting for their check; 1 could not be forecast (insufficient data) and will not be counted." Once
  scored, the second model and the straight line each get their own "k of N" line, never added into the primary.
  Cards show "Waiting for its check" and "95% forecast region (measurement error added at the check)"; 286 Iclea
  shows "Insufficient data" with the file's reason. The file's independence and team-statement notes appear once.
- No failing requests: the ledger skips the trials the scoreboard's `asteroid_batch.rows` names, and the batch
  loader does not request `verification.json` for a row whose status is `waiting` (`contract.js`
  `trial(id, { waiting })`). New test with a request spy.
- Card layout: a card without a plot gives its facts the full width (it was one character per line at 1280).
- Once Session A lists a real batch, the invented example no longer shows in `?fixtures=1` mode either (the loader
  test now stubs an index without `batch_paths`).

Clip (f) not recorded yet: Session A is verifying the batch now, and a clip of 8 "waiting" cards would be stale
within the hour. It will be recorded once the calibration is in.

**Checks**: 206 tests pass. Captures `predictions-asteroids` and `predictions-asteroids-cards` at
360/390/768/1280: no console error, no failing request, no horizontal scroll. Session A's validator: 112 files,
0 failures.

### Live site check, 15 Nov 2026 morning (after the user updated `main` to `8fea8b9`)

- **Files.** All 157 text files on https://nama2323.github.io/tenger/ are byte-identical to `main`'s `static/`.
  All 1,277 binary files are served (200).
- **Crawl.** Every page, lesson, the Lab, the loop, 8 targets × 4 panels, viewer modes, embed and a coordinate
  search: 52 URLs, every button on 11 pages, run against the live site and against `main` served locally. Live:
  no failing request, no `dev-fixtures` request, no button error. The only console errors are on the coordinate
  search (below).
- **Same as local on every page changed tonight** (Predictions, Beat the physics, Learn and its lessons, the Lab,
  Find the hidden planet, About). The remaining text differences were timing (blink frame A or B, "Loading…" on the
  slower network, the 3D loop's speed fallback under load) or the single-threaded local test server dropping
  connections.
- **Live only, 1: coordinate search does not work.** `api.js` calls `https://spherex-blink.onrender.com`, whose
  CORS allows only `https://pythonhack000.github.io`. From `nama2323.github.io` the request is blocked and the
  viewer says "The images did not load. Check the connection and try again." Locally the uvicorn backend answers.
  Changing the Render service or `LIVE_SERVER` needs the user's decision (CLAUDE.md).
- **Live only, 2: a misleading label during the first load.** On a first visit the See panel says "Prepared frames
  (legacy, not yet re-validated)" while the ~6 MB `frames.bin.gz` downloads (about 2–13 s here), then switches to
  "Frames from the investigation (quality-gated DR1/QR3)". `framesKind()` reads the investigation file, which is
  fetched after the frames. Locally the load is too fast to see it. This predates tonight.
- **Not live yet:** the Planet X wording, the lesson fix and the real asteroid batch block (on `tenger-dev` at
  `082c98d`).

### SPHEREx Blink credit moved from the pages to README, 15 Nov 2026 (user's decision)

- **Removed from the site:** the footer line "Built on the team's earlier project SPHEREx Blink (MIT licence)."
  (every page) and the "Built on SPHEREx Blink" card on About (`index.html`, `js/pages.js` `BASE_PROJECT`, keys
  `footer.base`, `about.baseTitle`, `about.base`, `about.link.source`). The footer keeps the data credit line.
  The Team card now spans the About grid so no half-empty row is left. Session A's `credit.base-project` key is
  listed in `index.json` `credits_keys` but no page renders it. Data notes that say where legacy frames came from
  ("Prepared frames from the earlier SPHEREx Blink build") stay, because they describe data provenance.
- **README.md**, new section "What existed before Space Apps, and what we built":
  - TENGER started from SPHEREx Blink (MIT, notice kept in `LICENSE`); its viewer, plate renderer, stacking code
    and archive client are reused.
  - SPHEREx Blink's 43 commits of 6–9 Nov 2026 (pythonhack000, merges by sabr.sf, the frame-baking job).
  - No TENGER commit before 14 Nov 09:00 Ulaanbaatar time; the first is `58f993b`, 19:01. Author times are used,
    because rebased commits have later commit times.
  - A plain-words list of what was built, with commit references (every one checked to be on `tenger-dev`).
- **Untouched:** `LICENSE`, git history, `LIVE_SERVER` and the backend's CORS.
- **Test** (`tests/release.test.mjs`): no footer line or About card for the base project, the data credit is still
  in the footer, the README section is present, and `LICENSE` is MIT. The batch loader test now covers both the
  frozen state (no verification request) and Session A's checked batch (`9cf2bfd`; verification files read).
  Session A's strings re-copied (193 + 3; new `batch.exploratory-horizons`, `batch.outlier-flag`).
- **Checks:** 207 tests pass. Captures `home`, `about`, `about-refs` and the new `about-footer` at 360 and 1280:
  no horizontal scroll, no control under 44 px, no console error.

### Asteroid batch after Session A's check (`9cf2bfd`), and demo clip (f), 15 Nov 2026

Session A's verification: 345 Tercidina inside (D² 0.12); 4 ambiguous; 3 insufficient data. Calibration 1 of 1
(Clopper–Pearson 0.025–1.0). The page now shows:

- **Summary.**
  - "1 of 1 landed inside our 95% regions", then "Of all 8 asteroids: 1 inside its 95% region; 4 ambiguous (not
    counted); 3 insufficient data (not counted)".
  - Instead of "consistent with honest 95% regions" (an interval that covers almost everything says nothing), it
    says "With 1 scored … far too few to test".
  - The second frozen model (1 of 1) and the straight line (0 of 1) each get their own line.
  - Session A's OUTLIER-flag note explains why most objects were not scored.
- **Exploratory JPL comparison** (`exploratory_horizons_coverage`). It is read only when it says `exploratory: true,
  counts: false`, has its own "Exploratory" chip, and ends "This is not the calibration above" (7 of 7 inside for
  both models). Each card adds "JPL, after the verdict: 3.4″ from the forecast, inside the frozen region
  (exploratory, not counted)".
- **Cards.**
  - "Ambiguous" and "Insufficient data" chips, each with the file's reason.
  - Unscored cards say "95% forecast region" with a note that the measurement error is added at scoring (the long
    label had squeezed phone layouts).
  - The model-versus-straight-line chart leaves room for five-digit ticks (11,082″).
- **Lesson 3 corrections.**
  - It no longer says "We froze 1 asteroid forecasts" (frozen 8 ≠ scored 1).
  - It no longer says "with only 1 asteroids".
  - It no longer claims "1 of 1 … can only show they are not badly wrong"; it now says "says almost nothing about
    our regions yet: the true hit rate could still be anywhere from 3% to 100%".
- **Demo clip (f)** `docs/screens/demo/f-asteroid-batch.mp4`: 5.5 s, 0.82 MB, 1280×720 H.264 30 fps, public page, no
  error. The recorder now counts a page clip's first frame from the start of recording; a still page's first
  frame arrives late, which had cut the opening hold short.
- **Checks:** 208 tests pass (new: the scored-batch rules; a block that claims to count is refused). Captures
  `predictions-asteroids`, `predictions-asteroids-cards` and `learn-lesson-sure-batch` (now the public page) at
  360/390/768/1280: no console error, no failing request, no horizontal scroll.

### Base-code wording and live search on the public site, 15 Nov 2026 (user's decision; replaces the earlier SPHEREx Blink requests)

- **Website** (`static/`): no page, script, style or data file the site serves names SPHEREx Blink or pythonhack000.
  - The legacy-frame notes now say "made by the open-source code this site started from"; code comments use the
    same wording.
  - Session A removed `credit.base-project` from `strings.en.json` and `index.json`; the copy follows (192 + 3).
  - The astronomy "Blink" view keeps its name.
- **Wording outside the site:**
  - README.md: the "What existed before…" section now says "open-source code (MIT licence; see Licence below and
    `LICENSE`)".
  - README.md has exactly one credit line, in a new "Licence" section: "Parts of the code come from SPHEREx Blink
    (https://github.com/pythonhack000/spherex-blink, MIT licence); see LICENSE."
  - CLAUDE.md decisions 1 and 6, and docs/PROMPTS.md (5 phrases), no longer call the base code the team's or its
    author a teammate. docs/EXPOSURE.md was reworded by Session A.
  - Dated logs and audit records are unchanged; one dated correction line is at the top of this file.
  - `LICENSE` is byte-identical (a test pins its SHA-256); git history is untouched.
- **Live search** (`static/js/api.js`, `static/js/main.js`):
  - `LIVE_SERVER` / `API_BASE` are removed, and `liveAvailable()` is false on `*.github.io`. There every live call
    throws before any request.
  - A coordinate search, a name outside the prepared list, or a Gaia overlay with no prepared list shows: "Live
    search needs the TENGER server, which is not running on this public site; the prepared targets work."
  - Run locally, live calls go to the same origin as before. `backend/api.py` is unchanged.
- **Tests:**
  - `tests/live.test.mjs`: on github.io no live call fetches anything; locally the call goes to `/api/…` on the
    same origin; no served file names onrender.com.
  - `tests/release.test.mjs`: no served file names SPHEREx Blink or pythonhack000, while "Blink" stays; README
    has exactly the one credit line, in the Licence section; the LICENSE hash is unchanged.
  - 213 pass.
- **Browser check:**
  - `docs/screens/github-io-check.mjs` serves `static/` as `https://nama2323.github.io/tenger/` in headless
    Chrome, so the page really runs on a github.io host. At 360 and 1280: the coordinate search and the name
    search both show the note; Barnard's Star (prepared) loads its frames; About has no mention.
  - About 630 requests in all, every one to that origin: none to onrender.com, no `/api/` request, no console
    error. Screenshots `live-off-coords-*` and `live-off-name-*`.
  - Captures `home`, `about`, `about-footer` at 360/1280: no horizontal scroll.

### Live site after the user's update of `main` (`4efc3e0`), and B9: the 30-second video, 15 Nov 2026

- **Live check.**
  - Files: all 1,577 on https://nama2323.github.io/tenger/ match `main`. 296 text files are byte-identical; 1,281
    binaries return 200 at the exact size.
  - Crawl: 52 pages and states, every button on 11 pages. 19,383 requests, all to nama2323.github.io; none failed,
    none to onrender.com, `/api/` or `dev-fixtures`. No console error, and no page text names the base project.
  - In the browser: the Planet X headline ("about 1 time in 4"), the 28% line and the ± note; the lessons (Session
    A's exercises, 4 significant figures, z in the answer); the checked asteroid batch; the data-only footer; and the
    live-search note for both coordinate and name search.
- **B9 video** `docs/screens/demo/tenger-demo-30s.mp4`:
  - 30.000 s (900 frames), 3,062,603 bytes, 1280×720, H.264 High, yuv420p, 30 fps, no audio.
  - Captions are burned in from Chrome-rendered PNGs, since this ffmpeg has no text filters; there is a matching
    `.srt` and a contact sheet.
  - `make-video.mjs` records the deployed site shot by shot, and every caption number was checked against the data
    files (README in that folder).
  - Shot 2: AllWISE 2010 against SPHEREx 2026; the site has no 2MASS frames. Shot 6 adds "for the nominal Planet
    Nine".
- **Recording fix.** A headless Chrome left by a failed first run kept its port with a busy software GPU process.
  Later runs connected to it, and the viewer drew about 2 frames a second. The script now uses a fresh port, Chrome
  on the Mac's GPU (Metal), and always closes its Chrome.

### Task B10, 15 Nov 2026: a time control for the 3D Solar System on Home

- **Control bar** (`index.html` `#space-time`, `js/time-ui.js`, `css/style.css`). It sits under the scene, centred
  beside the console on wide screens and below the scene on phones, and contains:
  - LIVE, active while live (`aria-pressed`);
  - play/pause;
  - the date and time, large, in UTC;
  - a stepped speed slider: centre paused; right forward and left backward, in steps of real time, 5 min/s, 1 h/s,
    1 day/s, 1 week/s, 1 month/s and 1 year/s; the rate is shown under it ("1 month/s", "-1 day/s") and spoken
    through `aria-valuetext`;
  - keyboard (Home only, not while typing): Space plays or pauses, ←/→ step the rate, L returns to live. Listed in
    the shortcuts dialog.
- **Clock** (`js/time.js`, pure). Range 1900-01-01 to 2050-01-01 UTC, inside the 1800–2050 validity of JPL's
  approximate elements; at an end it stops with a short note and can move back. A month is a twelfth of a Julian
  year. On load it is live at real speed; with prefers-reduced-motion it starts paused and moves only when asked.
  The "Planets on …" line follows the shown date.
- **Scene** (`js/space3d.js` `setTime`, `js/orbits.js`).
  - Planets move with the existing JPL approximate-elements code, and their orbits are redrawn after a decade of
    change. Earth's "SPHEREx orbits it" label moves with Earth.
  - Pluto and Makemake move by Kepler's equation from the JPL Small-Body Database elements already in
    `scene3d.json` (solution 1, epoch JD 2457588.5; solution 130, epoch JD 2461200.5), so no new contract version
    was needed. At the file's date they land 0.037 au and 0.0001 au from JPL Horizons.
  - Without elements a body would stay at its Horizons date with "shown for …" (code path kept; not used).
  - Stars, the Kuiper Belt illustration and the Planet Nine rings stay fixed.
- **Animation loop.**
  - At fast speeds: one update per display frame. At real speed: one per second (it looks still). While paused,
    at a stop, with the tab hidden or with the scene off screen: none.
  - Away from live, the time waits while hidden, so it does not jump.
  - The control loads with the 3D view, not with the page.
- **Size.** Home's first load +1.4 KB gzip (markup, styles, strings); the lazy 3D bundle +5.4 KB gzip.
- **Checks.**
  - `tests/time.test.mjs` (8): rate steps and labels; live on load; reduced motion paused with no auto-advance;
    forward, backward, pause and play, live; the 1900/2050 stops and moving back; UTC formatting; positions at the
    scene epoch match the check values (Earth vs DE441, Pluto and Makemake Kepler vs Horizons); elements used only
    when complete. 221 tests pass.
  - Headless Chrome on the GPU (`localhost`):
    - On load, live at real time, matching the UTC clock.
    - Animation frames: 3 in 3 s live; 0 paused; about 120 per second at 1 week/s; 0 with the tab hidden (time
      waits); 0 after stopping at 2050.
    - Real key presses: Space, → ×5 (1 week/s), ← ×8 (-1 h/s), L (live).
    - 1 year/s stops at 2050-01-01 00:00:00 with the note.
    - Reduced motion: paused, 0 frames, the date unchanged.
  - Captures `home-time` at 360/390/768/1280: no horizontal scroll, every control at least 44 px, no console error.
  - Lighthouse mobile Home: 83 and 83 (accessibility, best practices, SEO 100; CLS 0; TBT 0 ms).

### Task B11, 15 Nov 2026: fly to any body in the 3D Solar System on Home

- **Choosing a body** (`js/space3d.js`, `js/focus-ui.js`, `index.html` `#space-fly`).
  - The Sun, the eight planets, Pluto and Makemake can be chosen by a click or tap on the dot or its label, or from
    the "Fly to" list next to Reset view and Top view. Keyboard: Tab to "Fly to", Enter opens the list, Tab to a body,
    Enter flies there; the list then closes and focus returns to "Fly to".
  - A click or tap counts for the body nearest the pointer within 22 px (a 44 px target) or on its disc
    (`js/focus.js` `pickOnScreen`, screen space instead of invisible hit spheres). A click on a label right over
    another body's dot (within 8 px) means that body.
  - Pluto and Makemake (challenge targets) still open their investigation after the flight, as before; from the
    list they are only flown to. Stars keep their earlier flight and investigation.
- **Following.** The camera flies to the body and keeps it centred while time runs (it also aims at the body's new
  place during the flight); panning is off while a body is followed. "Camera on: …" names the body ("Earth", not
  the label text). Esc or Reset view returns to the home view. Esc first closes the "Fly to" list or the Planet Nine
  note if open, and leaves an open investigation to the page's own Esc (capture phase), so one press does one thing.
- **Zoom limits** (`js/focus.js`).
  - Closest: per body, 2.5 × its drawn size (Saturn with its rings), where the body about fills the view; Earth
    0.725 scene units, Mercury 0.425, the Sun 2.25. For each inner planet this is under 0.75 of the closest approach
    of its neighbours' orbits in the scene, so zoomed in they sit well apart. The home view keeps 1.2.
  - Farthest, from any target: the whole scene, star shell and glows included (radius 155.75 plus a 26-unit target
    reach, with 8 % to spare), fits the narrower half-angle of the free view: 548 scene units on landscape screens,
    607 at a phone's 0.89 aspect (the home view stays at 86–112).
- **Labels** (`js/focus.js` `chooseLabels`).
  - In order: the followed body's label, then Sun and challenge targets, Earth, planets, Planet Nine, rings and
    notes; nearer first within a kind (a label already showing counts 15 % nearer, so labels do not flicker).
  - Each label takes its first free place around its point (right, left, above, below; its current place tried
    first). A place under a panel (search console, tools, the "Fly to" list when open, the camera note, time bar,
    colour key, caption) or outside the scene box is not free, not even for the followed body; with no free place
    the label fades. On phones the panels sit below the scene, so only overlaps count.
  - Sizes are read once (and after a resize or the fonts load); panels are measured again when they change size or
    open/close. The followed body's label gets a dark backing, since close up it sits on the body.
  - A wheel over a label zooms the scene like one over the canvas.
- **Planet Nine.** The scene now shows only a short label, "Planet Nine? (hypothetical)". The explanation with the
  cited ranges opens in the colour key when the faint ring, that label or the key's entry (now a button with
  `aria-expanded`) is pointed at (it closes when the pointer leaves) or clicked (it stays until clicked again, Esc,
  a click elsewhere in the scene, or the key is closed). On phones the colour key is under the scene and a tap
  scrolls it into view. The ring brightens while the note is open. On wide screens the colour key now scrolls
  instead of running under the time bar.
- **Time control, reduced motion, accessibility.** B10's control is unchanged and drives the follow. Reduced motion:
  every flight is a jump, no animation frames, no label fades. Every new control is a real button or summary,
  at least 44 px, labelled; the shortcuts dialog lists Enter ("Fly to" list) and Esc.
- **Size.** Home's first load +1.3 KB gzip (markup, styles, strings); the lazy 3D part +7.9 KB gzip
  (`space3d.js` +3.1, new `focus.js` 2.9 and `focus-ui.js` 1.9).
- **Checks.**
  - `tests/focus.test.mjs` (11): the focus bodies and their names; the "Fly to" markup and shortcut rows; closest
    zoom per body (outside the body, fills much of the view, closer than its flight); neighbours of the inner
    planets well apart at the closest zoom; the zoom-out limit fits the whole scene for aspects 0.6–2.2; picking
    (a planet in front of the Sun, 22 px reach, nearer wins a tie); the overlap order (focused, importance,
    distance, no flicker); no label under a panel; moving to a free side; staying inside the scene; Planet Nine's
    short label and the note in the key. 232 tests pass.
  - Headless Chrome on the GPU (`localhost`, real mouse, wheel and key events):
    - Keyboard: Tab to "Fly to", Enter, Tab ×4, Enter: "Camera on: Earth", list closed, focus back on "Fly to".
    - Following Earth at 1 month/s for 3 s (three months of simulated time): Earth moved 0 px on screen.
    - Wheel in on Earth stops at the closest zoom (Earth fills the view); wheel out from Earth and from the home
      view stops with the whole star shell in view.
    - Clicks: Mars's dot (lying under Earth's label) → Mars; a planet label → that planet; Pluto → its
      investigation, "Camera on: Pluto"; first Esc closes the investigation only, the second returns home.
    - Planet Nine: hover on the key entry and on the ring opens the note (ring cursor "pointer"), leaving closes
      it; a click on the label keeps it; Esc closes it. At 1280 with the note open the key ends at 632 px, above
      the time bar (649 px).
    - At 360/390/768/1280, fresh loads, home view, "Fly to" open and a body followed: no label under a panel, no
      two labels overlapping, no horizontal scroll, no control under 44 px, no console error.
    - Reduced motion: the list jumps to Jupiter at once; 0 animation frames in 2 s; no label transition; Esc
      returns at once.
  - Captures `home-fly`, `home-flylist` (360/390/768/1280) and `home-nine-1280` in `docs/screens/`.
  - Lighthouse mobile Home: 83 and 83 (accessibility, best practices, SEO 100; CLS 0; TBT 0 ms), as after B10.
  - Not checked on a real phone.
- **Live time after the first screen.** Leaving the first screen gives back live time if the visitor was live,
  otherwise their own speed (`time-ui` `isLive`/`goLive`). Checked: scrolled to the full section at 1280, the time
  bar reads LIVE with today's date, at real-time speed.
- **Demo video.** Re-made with `node docs/screens/demo/make-video.mjs`: shot 1 now shows the first screen over the
  turning 3D scene, then the full 3D section on LIVE time. The video is 30.000 s and 900 frames, now 2,501,831
  bytes, and the recording checks raised no problem. I checked the contact sheet and two frames of shot 1.

### Task B12, 15 Nov 2026: every page readable at a glance

A judge found the site hard to scan. Each page and section now leads with one headline that states the finding,
one key number or picture, and at most one short line; longer explanations, method notes, caveats and citations
sit in a closed "Details" disclosure right under the part they explain. Nothing was deleted, no number changed,
and every honesty label stays, as short chips: Blind, Retrospective demo, Catalogue-assisted, Exploratory,
Artificial, Pending, Measured, Hypothetical, Quick look, not validated. The full trial-type names stay in the
"what the trial types mean" lists. Published page by page to `tenger-dev` (cbfa67a, 37386b1, 109d84b, f83b322,
431e565, eeea349, then a second pass).

- **Shared pieces** (`js/dom.js`): `details()` (a native `<details class="more-info">`, keyboard-usable and announced
  as expanded or collapsed, 44 px summary) and `statTile()`; `.headline`, `.stat-tiles` and the 70-character line
  limits in `css/style.css`.
- **Home.**
  - The left panel keeps the pitch ("See the infrared sky change. Predict. Check."), the search and the challenge
    target chips.
  - How to search is read out with the search box (`aria-describedby`), shown at the top of the place list while
    the box is empty, and listed in the "?" dialog (now "Help and keyboard shortcuts").
  - Top places, Real sky, the guided tour and the Planet X link sit under "Guided tour and more". The target list
    starts folded.
  - The colour key keeps its items. Its long notes and the full scale caption are under "About this map". The
    on-scene caption is a chip: "Schematic · not to scale" (3D) or "Schematic · not a sky map" (2D).
- **Predictions.**
  - The headline is "Pluto: blind forecast, missed by 5.9 arcsec, published". Three tiles: blind 1 miss; asteroid
    batch 1 of 1 hit, 7 not scorable; demos 2 hits, 4 with too little data.
  - All of these are counted from `scoreboard.json` by `glanceModel()` in `js/ledger.js` (tested). If there is not
    exactly one blind result, the page keeps its plain title.
  - The full scoreboard, its notes and the trial types sit under one disclosure. Section titles state what they
    hold ("7 frozen predictions: 2 hits, 1 miss, 4 with too little data"; "4 open forecasts, checked when IRSA
    releases the data").
  - Each card shows its result, chips and error as the key number; position, receipt, residuals and notes are under
    Details. The asteroid batch states "1 of 1 landed inside our 95% regions" and "7 of 8 could not be scored",
    with the D chart in view; the interval, the caveats, the error chart and the eight asteroid cards are under
    Details.
- **Planet X Lab.**
  - The headline is "Could SPHEREx see Planet X? Not in one image: 4 to 7 magnitudes too faint.", with two tiles:
    our measured 3.4 µm 50% depth, AB 17.48 (Measured), and the nominal Planet Nine, AB 22.80 (Hypothetical).
    One line covers the closest published case (about 1 time in 4).
  - These come from the nominal case's gap rows (`glanceOf()` in `js/planetx.js`, tested); an example file gives no
    headline.
  - The measured section now comes before the model playground. The method, the full verdict, every published value,
    the assumptions and the references are under Details. With a lesson or the Lab open, the Learn heading steps
    aside.
- **Beat the physics.**
  - The headline is "Can your guess beat the physics model?", with one line; the full rules and the score formula
    are under Details.
  - Each round has a one-line task; "How to predict" starts closed. Results show the verdict, the raw-error table
    and the official result first.
  - The hidden-planet round keeps an "Artificial" chip and one line.
- **Investigate.**
  - The viewer keeps the expected shift in view ("Between A and B (16.1 years) the catalogue motion predicts a
    shift of about 168″"). How to read the picture is under "How to look"; the zoom hint and keys are under the See
    panel's Details.
  - The A/B captions show the time and a short wavelength; the full wavelength, release, status, source and IDs are
    one click away.
  - Panel leads are under Details. What changed leads with its finding. A trial shows type and result chips, the
    errors and the plot.
- **Learn.** The headline is "Three printable lessons and a Planet X lab". Each lesson card carries a "Real record"
  or "Synthetic practice values" chip. The lessons themselves are unchanged (printable worksheets).
- **About.** The headline is "See, predict and check with real NASA SPHEREx data". Each method and limit is one
  disclosure under its title; reserved paths, can and can't see, data sources, references, software and fonts are
  under disclosures. Team and the AI disclosure stay in view.
- **Visible words on the first screen** (headless Chrome, 390×844 and 1280×800, after the page and fonts load; Home
  after its 3D view starts; every visible word of text, numbers included, inside the viewport). Before = 53dc6e4,
  after = this task:

| Page | 390 before | 390 after | change | 1280 before | 1280 after | change |
|---|---:|---:|---:|---:|---:|---:|
| Home | 77 | 51 | −34% | 299 | 140 | −53% |
| Predictions | 105 | 84 | −20% | 136 | 110 | −19% |
| Planet X Lab | 104 | 93 | −11% | 166 | 111 | −33% |
| Beat the physics | 157 | 77 | −51% | 205 | 103 | −50% |
| Investigate: See panel (Barnard's Star) | 73 | 60 | −18% | 214 | 182 | −15% |
| Investigate: Prediction panel (Pluto) | 140 | 80 | −43% | 216 | 153 | −29% |
| Investigate: What changed (Barnard's Star) | 142 | 121 | −15% | 237 | 175 | −26% |
| Investigate: Evidence (RW Aurigae) | 111 | 115 | +4% | 202 | 140 | −31% |
| Learn | 87 | 77 | −11% | 156 | 127 | −19% |
| About | 174 | 53 | −70% | 401 | 76 | −81% |
| All ten views | 1170 | 811 | −31% | 2232 | 1317 | −41% |

  Home at 1280, Beat the physics and About were cut by half or more; the others were not. What is left is mostly
  controls, chips, numbers, the 3D labels (Home at 390 shows more of the scene now, so its labels rose from 21 to
  28 words; text outside the labels went from 56 to 23) and the start of the next section, which now fits on the
  first screen. On a phone the RW Aurigae Evidence panel shows 4 more words, because more of the panel now fits on
  the first screen.
- **Checks.**
  - 235 tests pass (`node --test`). New tests: the Predictions headline and tiles against `scoreboard.json`, and
    the rule that there is no headline without exactly one blind result; the Lab headline against the gap rows.
  - All eight views at 360/390/768/1280 with disclosures closed: no horizontal scroll, no console error, no Details
    summary under 44 px. A Details opens with Tab and Enter on every page.
  - With every disclosure open, Predictions, the Lab and Beat the physics overflow at 360 px by 14–17 px. They did
    the same before B12 (a forecast chart, the Lab's charts, the game's training table).
  - B11's 3D check at 360/390/768/1280: no label under a panel, no overlaps, "Fly to" works ("Camera on: Earth",
    "Saturn", "Mars"), the Planet Nine note opens in the key, no errors.
  - One round of Beat the physics was played to the end (verdict, table, official result, Details).
  - Lighthouse mobile: Home 83 and 83 (accessibility, best practices and SEO 100), as after B11. Accessibility was
    100 on Predictions, the Lab, Beat the physics, Learn, About and an investigation.
  - Before and after screenshots: `docs/screens/b12-<page>-<390|1280>-<before|after>.png` for Home, Predictions, the
    Lab, Beat the physics, Investigate (See, and the Prediction panel), Learn and About.
  - Size: +7.9 KB gzip over the changed files, all loaded with the first page.
  - Not checked on a real phone.
- **Live time after the first screen.** Leaving the first screen gives back live time if the visitor was live,
  otherwise their own speed (`time-ui` `isLive`/`goLive`). Checked: scrolled to the full section at 1280, the time
  bar reads LIVE with today's date, at real-time speed.
- **Demo video.** Re-made with `node docs/screens/demo/make-video.mjs`: shot 1 now shows the first screen over the
  turning 3D scene, then the full 3D section on LIVE time. The video is 30.000 s and 900 frames, now 2,501,831
  bytes, and the recording checks raised no problem. I checked the contact sheet and two frames of shot 1.

### Task B14, 15 Nov 2026: the visible brand is now Vestigium

- **Renamed (text people see only):**
  - The header wordmark and every page `<title>` (built from `site.title`).
  - `og:title`, `og:site_name` and the `og:image` alt text. The meta description never named the site.
  - Every English string that said TENGER (31 values in `js/i18n.js`), covering About, the help dialog, the Planet
    X Lab, the lessons, the tour, the embed title and "Open in Vestigium".
  - Printed lessons now carry a header, shown only on paper: "Vestigium · nama2323.github.io/tenger".
  - README title and text, with one line saying the repository and address keep the working name `tenger`.
  - The footer never named the site.
- **New web manifest** (`site.webmanifest`): there was none before; `name` and `short_name` are Vestigium.
- **Not changed:**
  - The repository name, the web address (nama2323.github.io/tenger) and the `tenger-dev` branch.
  - Frozen trial files, storage keys (`tenger.*`), schema ids (`tenger.trial/1` …), file paths, code identifiers
    and code comments.
  - No frozen or hashed file contains the visible name. Two items in Session A's files were sent to Session A:
    - `static/data/scene3d.json` `our_orbit.source` ("TENGER A4 frozen fit …", not shown on any page).
    - The pipeline version `tenger-a2-2026.11.14` that the Evidence panel shows from each `investigation.json`
      (an identifier tied to config and code hashes; left as it is).
  - The B9 demo video still shows the old wordmark (not re-recorded).
- **Logo in one place: `static/img/logo.svg`** (the current icon, with its colours written into the file).
  - The header `<img>`, the favicon and the manifest use it directly.
  - `img/apple-touch-icon.png` (180×180, iOS ignores SVG touch icons) and `og.png` (the site at 1200×630, Barnard's
    Star side by side, 256 colours, 130 KB) are rendered from the running site with headless Chrome, not drawn.
  - After the Vestigium logo arrives: replace `logo.svg`, then re-render those two PNGs the same way.
- **Checks.**
  - 239 tests pass. New `tests/brand.test.mjs` (4) checks that no English string, `index.html` outside comments,
    the manifest, the README or `static/data/strings.en.json` says TENGER, and that the logo is wired up as above
    (PNG sizes read from the files). `tests/live.test.mjs` and `tests/release.test.mjs` now expect the new name.
  - Headless Chrome at 390 and 1280 on Home, Predictions, Beat the physics, Learn, a lesson, About and an
    investigation: wordmark "Vestigium", logo loaded, favicon `img/logo.svg`, titles such as
    "Predictions · Vestigium", no old name in the page text, no horizontal scroll, no console errors.
  - Lighthouse mobile Home: 80 and 81 (accessibility, best practices and SEO 100; TBT 0 ms; CLS 0.005). This is
    lower than B12's 83 and 83: FCP 1.9–2.3 s against 1.4–1.5 s, with another session busy on the same machine.
  - Not checked on a real phone.
- **Live time after the first screen.** Leaving the first screen gives back live time if the visitor was live,
  otherwise their own speed (`time-ui` `isLive`/`goLive`). Checked: scrolled to the full section at 1280, the time
  bar reads LIVE with today's date, at real-time speed.
- **Demo video.** Re-made with `node docs/screens/demo/make-video.mjs`: shot 1 now shows the first screen over the
  turning 3D scene, then the full 3D section on LIVE time. The video is 30.000 s and 900 frames, now 2,501,831
  bytes, and the recording checks raised no problem. I checked the contact sheet and two frames of shot 1.

### Task B16, 15 Nov 2026: a first screen that explains the site, Real sky only where it works

- **First screen** (`index.html` `#home-hero`, `css/style.css`).
  - Headline "Watch the sky move.", the two lines as given, and a primary button "Watch Barnard's Star move"
    (full width on phones).
  - The Planet X card (one link, orange, "New" chip, 3 px focus ring): "Could SPHEREx see Planet X? We measured
    it." and "Not in one image: 4 to 7 magnitudes too faint." The numbers come from `depth.json` through
    `glanceOf()` and are fetched once the page has loaded; only that file is fetched, the game's pictures are not.
  - Two text links ("Try to beat our physics", "See our predictions"), then "Or pick a target" with the target
    chips, and a smaller search box ("Search a target name").
  - The field-size menu is gone from Home: a search opens the default 6′ field, and Investigate keeps its own
    field-size menu under More tools. "Guided tour and more" (Guided tour, Top places, Real sky) moved into the
    top menu, shown as "More" on wide screens (accessible name unchanged).
  - The old Planet X text link on Home is replaced by the card. A "Planet X" menu item with an orange "New" dot
    sits between Predictions and Beat the physics, also in the phone menu.
- **The 3D map is below the first screen.** On wide screens Home scrolls inside itself: the first screen, then
  the map at the same full size as before. An investigation hides the first screen, so the map behind it stays
  where it was, and Back restores where Home was scrolled. On phones the map follows the first screen as before.
  The time control is one compact row (LIVE, play, date, slider), and the colour key stays closed until tapped.
- **"Watch Barnard's Star move"** opens Barnard's Star in Investigate without the 3D flight, Blink playing
  AllWISE 2010 (A) against the newest SPHEREx picture (B). The line under the picture now reads "Between these
  two pictures, 16 years apart, the star moved about 168″." Years and shift are computed from the frame dates and
  the catalogue proper motion, as before. A "catalogue motion" chip says where the shift comes from.
- **Real sky only where it can work.** On github.io (`api.liveAvailable()` false) the Real sky button and panel
  are removed and the all-sky library is never loaded; with the local server they work as before. In Investigate
  the AllWISE 2010 picture stays as frame A.
- **Checks.**
  - 239 tests pass.
  - First screen at 390×844: headline 88–176 px, the two lines to 341 px, the button to 415 px, the Planet X card
    to 574 px, no scrolling. At 360×780 the card ends at 592 px; at 768 and 1280 everything up to the links fits.
    No horizontal scroll and no console error at 360/390/768/1280.
  - "Watch Barnard's Star move" at 390 and 1280: Blink playing after 0.30 s and 0.28 s; A "AllWISE 2010", B
    "2026-08-22" (the newest); the frame alternates between them; the line reads as above; Back returns Home
    with the first screen in view and Blink stopped.
  - The card and the "Planet X" menu item open the Lab with its headline in view, from Home, Predictions, Beat
    the physics, Learn, a lesson, About and an investigation. Also checked: the phone menu, and the keyboard
    (Tab to "Planet X", Enter).
  - github.io copy: the site served under the hostname nama2323.github.io (local HTTPS with the hostname mapped
    to it). No Real sky button or panel, 0 requests to the all-sky service, and every request went to
    nama2323.github.io.
  - B11's 3D check at 360/390/768/1280 after scrolling to the map: no label under a panel or overlapping,
    Fly to works ("Camera on: Earth / Saturn / Mars"), the Planet Nine note opens in the key. The phone time row
    keeps LIVE, play, date and slider on one line; the date ticks, and pause holds it.
  - Lighthouse mobile Home: 83, 82, then 86 after reserving the card line's height (layout shift 0.013;
    accessibility, best practices and SEO 100).
  - Screenshots `docs/screens/b16-home-<360|390|768|1280>-<before|after>.png`, `b16-watch-barnard-*`,
    `b16-planetx-lab-390`, `b16-menu-390`, `b16-nav-1280`, `b16-githubio-menu-390`, `b16-time-row-390`.
  - Not checked on a real phone.
- **Live time after the first screen.** Leaving the first screen gives back live time if the visitor was live,
  otherwise their own speed (`time-ui` `isLive`/`goLive`). Checked: scrolled to the full section at 1280, the time
  bar reads LIVE with today's date, at real-time speed.
- **Demo video.** Re-made with `node docs/screens/demo/make-video.mjs`: shot 1 now shows the first screen over the
  turning 3D scene, then the full 3D section on LIVE time. The video is 30.000 s and 900 frames, now 2,501,831
  bytes, and the recording checks raised no problem. I checked the contact sheet and two frames of shot 1.

### Task B15, 15 Nov 2026 (done by Session A at the user's request; Predictions page and Pluto reveal only)

Session B was told before the work started (B14 rename and B16 Home are rebased in; the brand stays Vestigium).

- **Page** (`static/index.html` Predictions section, `static/js/ledger-ui.js`, new `static/js/predict-story.js`, CSS appended to `static/css/style.css`):
  - The top now has the eyebrow, the headline "Can we predict where things in space will be?", one line, and the button "See how it works with Pluto", which opens the Pluto reveal at step 1. The three stat tiles are gone; their numbers are in the results.
  - "How a prediction works": four numbered steps (4 across from 1001 px, 2×2 from 601 to 1000 px, stacked below that), "What physics?" closed under step 2, and the arcsecond note.
  - "What happened" has two groups. Real tests: Pluto (miss) and Asteroid 345 Tercidina (hit). Practice runs: Barnard's Star and Epsilon Indi B. Each card has the name, Hit/Miss, a "Real test" or "Practice run" chip, one sentence, a grey "confirmation pending" note while the files say pending, "Watch the reveal", and a small Investigate link. "Used Gaia's distance", the trial type, the receipt, the residuals and the old card text are in each card's closed Details.
  - "Could not be tested: 4 targets and 7 asteroids …" has its list, with reasons, under "Which ones, and why"; the 4 old target cards are there too.
  - "8 asteroids, predicted at once" has its one-line explanation; the whole batch section (D chart, table, 8 cards) is under the closed "All 8 asteroids".
  - The "Check us in 2027" card puts the 4 open forecast cards under "All locked forecasts".
  - "7 frozen predictions: 2 hits, 1 miss, 4 with too little data", the scoreboard table, the trial types and See-only are inside "Full scoreboard and trial types".
  - Nothing was deleted, and every number is computed from `scoreboard.json`, the trial files and the batch block.
- **Reveal** (`static/js/reveal.js`):
  - Steps are now track → region → lock → observed → baseline → verdict, with one plain sentence each.
  - Step 3 shows the commit line from `receipt.json`. Practice runs get an honest lock sentence instead ("we had already seen these pictures").
  - The evaluation image stays behind every step. Each step's earlier text, the D values and the residual table are under "More detail". "Why we missed" starts closed.
  - The forward button reads "Next" and its aria-label names the next step. Asteroid trials show their catalogue name.
- **Strings**: 44 `story.*` keys and 15 `reveal.*` keys were added to `static/js/i18n.js`. Eight `reveal.s.*`/`reveal.lab.*` and four `reveal.next.*` were reworded in plain words.
- **Test** `tests/predictions-page.test.mjs` (5 tests):
  - The words D², retrospective, prospective, catalogue-assisted and trial type appear only inside `<details>` in the page markup and in the story text.
  - The hosts of the full record sit inside a `<details>`.
  - Every number outside Details matches `scoreboard.json`, the batch rows and the open-forecast trial files within display rounding (Pluto 5.8991″ → 5.9″, 19869.7″ → 5.5°, ratio 3368 → "over 3,000"; 345 6.5249″ → 6.5″; Barnard 1.5188″ → 1.52″; ε Indi B 0.0755″ → 0.08″; 4, 7, 8 and 1 from the rows; 2027 and April/September from the forecasts' `holdout.t_mjd`).
  - The reveal has six steps, and Pluto's oval date and its "just outside" wording come from its files (D = 2.60 against a limit of 2.45).
- **Checks** (real viewport sizes, set through Chrome DevTools `Emulation.setDeviceMetricsOverride`):
  - At 360/390/768/1280 the page width equals the viewport width (`scrollWidth`) and nothing overflows.
  - No restricted word appears in the DOM outside `<details>`.
  - At 390×844 with no Details open, the headline, the line and the button end at 359 px, and the four steps fill 435 to 974 px, so one scroll shows them.
  - The button opens step 1, five Next clicks reach "Step 6 of 6: Verdict", and Esc or Close returns focus to the opener at the same scroll position.
  - Summary text counts as part of its Details: the user named one of them "Full scoreboard and trial types".
- **Results**: `node --test tests/*.mjs`: 244 pass, 0 fail, both before and after the rebase onto B16 (`5806dbd`). The four-width DOM and reveal check passed again after the rebase.
- **Screenshots** `docs/screens/b15-before-predictions-{360,390,768,1280}.png`, `b15-after-predictions-{360,390,768,1280}.png`, `b15-after-predictions-full-{390,1280}.png`, `b15-after-reveal-verdict-{390,1280}.png`.
- **Limits**:
  - The node test reads the markup and the story text, not a live DOM. The DOM check above was run in headless Chrome and is not part of `node --test`.
  - The "too faint, too bright, or too few clean pictures" summary is the user's wording; the exact reason of each target is under "Which ones, and why".

### Task B17, 15 Nov 2026: the target view for a first-time visitor

- **Top bar.** "← All targets" on the left (its accessible name is "All targets"). A single "Share" button opens a
  small menu with "Copy link" and "Copy embed code"; after copying, the button reads "Copied" for 2 s. The status
  line says the same to screen readers. Escape closes the menu first, and a click elsewhere closes it too.
- **Under the name**, one plain line from the data (`js/describe.js` `plainLine`, tested), using the target's kind
  and its map distance in light-years, computed with the same constants as the map and the target list:
  - "A fast-moving star, 6 light-years away." (Barnard's Star)
  - "A brown dwarf, 7.4 light-years away." (WISE 0855); "A brown dwarf, 12 light-years away." (Epsilon Indi B)
  - "A variable star, 598 light-years away." (RW Aurigae); "A variable star, 2,607 light-years away." (R Draconis)
  - "A dwarf planet in our Solar System." (Pluto, Makemake)
  - "An interstellar comet passing through our Solar System." (3I/ATLAS)
  - "A position you chose in the sky." (a custom position)

  The kind label, the RA/Dec/field line and the chips moved into a closed "About this target".
- **Above the picture**, one caption: "Watch the star in the orange ring jump between the two pictures." The Solar
  System version is "Watch the object in the orange ring move."; variable stars get "… change brightness between
  the two pictures." Targets with no picture yet get no caption.
- **Directly under the picture**, the finding in large text, with the "catalogue motion" chip: "Between these two
  pictures, 16 years apart, Barnard's Star moved about 168″, about a tenth of the full Moon's width."
  - The years and the shift come from the frame dates and the catalogue proper motion, as before.
  - The comparison uses a full Moon 31′ (1,860″) across (`moonShare`, tested).
  - The same sentence no longer appears again in the time bar. Timeline, Pause, the mode switch and "How to look"
    are unchanged.
- **Checks.**
  - 247 tests pass. The new `tests/describe.test.mjs` (3) covers the plain lines, the light-year rounding and the
    Moon comparison.
  - At 390×844, after "Watch Barnard's Star move" and without scrolling: name (124–153 px), plain line (157–181),
    caption (257–298), the blinking picture (311–675) and the finding (688–783) are all in view, and the
    coordinates are not. At 1280×800 all of them are in view too.
  - Share: the menu shows the two options. Copy link put the page URL on the clipboard (equal to `location.href`)
    and the button read "Copied", then "Share" again after 2 s. Escape closed the menu and kept the
    investigation; Copy embed code copied the `<iframe>`.
  - "About this target": one Tab from the name, then Enter, opens it, showing the RA/Dec/field line, the three chips
    and the kind.
  - All 8 targets at 360/390/768/1280 (32 views): no console error and no horizontal scroll.
  - Screenshots: `docs/screens/b17-watch-<390|1280>-<before|after>.png`, `b17-share-menu-390`,
    `b17-about-open-390`, `b17-target-<pluto|rwaur|wise0855|3i-atlas>-390`.
  - Not checked on a real phone.
- **Live time after the first screen.** Leaving the first screen gives back live time if the visitor was live,
  otherwise their own speed (`time-ui` `isLive`/`goLive`). Checked: scrolled to the full section at 1280, the time
  bar reads LIVE with today's date, at real-time speed.
- **Demo video.** Re-made with `node docs/screens/demo/make-video.mjs`: shot 1 now shows the first screen over the
  turning 3D scene, then the full 3D section on LIVE time. The video is 30.000 s and 900 frames, now 2,501,831
  bytes, and the recording checks raised no problem. I checked the contact sheet and two frames of shot 1.

### Task B19, 15 Nov 2026: "What Vestigium can and can't do"

- **The dialog** (top bar button "Can and can’t do"; the same lists on the About page) is rewritten.
  - Title "What Vestigium can and can’t do" and the new subtitle.
  - "It can" (green, 8 items) and "Its limits, and what we do about them" (amber, 4 items). Each limit is
    followed by a muted line starting with "→" saying what we do about it.
  - Two columns on wide screens (dialog up to 1220 px); on phones "It can" comes first, then the limits.
  - `js/help.js` `renderLimits`, `CAN_DO`, `LIMITS_DO`.
- **Numbers from the files** (`js/limits.js` `limitsNumbers`, tested), fetched the first time the list is drawn.
  Until they arrive, a sentence is shown without its number, never with an invented one. All four numbers match
  the brief:
  - "within 0.3%": `barnard/investigation.json` gives 10.4174″/yr measured against Gaia's 10.3933″/yr, a 0.23%
    difference, rounded up to 0.1 so "within" stays true.
  - "40,066 artificial planets": the sum of `injected` over the three bands' pooled curves in
    `planetx/depth.json`.
  - "4 to 7 magnitudes": the nominal Planet Nine's gap rows (`glanceOf`, as on the Lab).
  - "about 15″": `core_radius_arcsec` in the pipeline settings, which is also the detection fit radius.
- **Checked against the files, typed in the strings:** DR1 and QR3 (`index.json` releases); 0.75 to 5 µm (the
  composite range); grades 8 to 11 (`gradeBand` of the three lesson records); 2027 forecasts (the open forecasts'
  check dates); saturated targets (RW Aurigae 318 of 335 pictures flagged, R Draconis 299 of 299, Barnard's Star
  with the saturated-core limit).
- **The old Planet Nine claim is gone.** "… cannot say whether SPHEREx could detect it" was in the dialog and in
  the Lab's "Could SPHEREx see it?" text. The Lab now says the visible-light number alone does not tell, and that
  the measured depth above answers it for the published predictions (one image is too shallow).
- **Moved to About, Limits** (nothing deleted): "Pixel size", which now reads as one pixel being 6.2″ with
  positions measured to a fraction of it, so it no longer contradicts the "can" list; "Brightness across
  wavelengths" (with WISE and 2MASS); "Comet 3I/ATLAS"; "The future". The old "saturated" and "proof" items are
  covered by the new limits 3 and 4 and by About's "Saturation" entry.
- **Checks.**
  - 251 tests pass. New `tests/limits.test.mjs` (4): the numbers against the files; every item and "→" line
    present; the old sentence in no site file or the README; the moved items in About's Limits.
    `tests/ledger.test.mjs` now checks the new lists.
  - 390×844: opened from the header button via the menu; the dialog scrolls inside itself (1430 px of content
    in 794 px); focus stays inside after 6 Tabs; Esc and Close both close it.
  - 1280×800: two columns; every item at most 2 lines; focus stays inside; Esc and Close both close it. No
    console errors.
  - Screenshots: `docs/screens/b19-limits-<390|1280>-<before|after>.png` and `b19-limits-390-after-end.png`.
  - Not checked on a real phone.
- **Live time after the first screen.** Leaving the first screen gives back live time if the visitor was live,
  otherwise their own speed (`time-ui` `isLive`/`goLive`). Checked: scrolled to the full section at 1280, the time
  bar reads LIVE with today's date, at real-time speed.
- **Demo video.** Re-made with `node docs/screens/demo/make-video.mjs`: shot 1 now shows the first screen over the
  turning 3D scene, then the full 3D section on LIVE time. The video is 30.000 s and 900 frames, now 2,501,831
  bytes, and the recording checks raised no problem. I checked the contact sheet and two frames of shot 1.

### Task B18, 15 Nov 2026 (done by Session A at the user's request; reveal inset)

- **Problem**: the Pluto verdict map spans degrees (2° scale bar) because the straight-line guess is 5.5° away. At that scale the 5.9″ miss and the oval sit under one mark.
- **Change** (`static/js/reveal.js`, CSS at the end of `static/css/style.css`, one string `reveal.inset.title`):
  - Steps 4–6 add an inset in the top-right corner of the map: 40% of the map's width, 44% on phones.
  - The inset is titled "Zoomed in N×", where N is the real magnification (main span ÷ inset span) to two significant figures; the inset is drawn at exactly that factor.
  - It shows only the forecast centre, the oval, the real position, a thin line labelled with the file's model error ("5.9″") and a scale bar in arcseconds. The oval is the frozen 95% oval on steps 4–5 and the verdict's 95% test oval on step 6, as on the main map.
  - The main map marks the zoomed area with a small square joined to the inset by a thin line. The compass moves beside the scale bar while the inset is shown.
  - A miss just outside the oval (D between 1 and 1.5 times the limit) is framed on the line from forecast to observation. Otherwise the whole oval is framed around the forecast centre.
  - No "just outside by" line is shown: no trial file records that distance.
- **When**: the inset appears only where the main map hides the oval or the miss under one mark: an oval under 14 px (semi-major axis) or a miss under 12 px.
  - Pluto: steps 4–5 at 2,600×, step 6 at 6,000×.
  - Asteroid 345: 3,100×.
  - Epsilon Indi B: 8.8× and 8.7×.
  - Barnard's Star: none, because its oval and its 1.52″ miss are already visible on the map.
- **Test** `tests/reveal-inset.test.mjs` (4 tests), using the real trial files:
  - The factor has two significant figures, and the inset is drawn at exactly that factor.
  - Pluto's forecast centre and real position are inside the inset. Its real position lies 0.28″ outside the test oval, which is at least 6 px on a 390 px phone and at least 9 px on desktop; the inset's cross reaches 3 px on a phone and 5 px on desktop.
  - The label equals the scoreboard's 5.8991″, shown as 5.9″.
  - The inset appears for Pluto, 345 and Epsilon Indi B, and not for Barnard's Star.
  - The trial files hold no "outside by" value.
- **Checks**:
  - In headless Chrome at 390×844 and 1280×800 on step 6, the dashed oval and the real-position cross are two separate marks, and "5.9″" is readable.
  - Steps 1–3 have no inset; steps 4–6 have it for Pluto, 345 and Epsilon Indi B.
  - `node --test tests/*.mjs`: 248 pass before the rebase onto B17 (`0133e4d`) and 255 after the rebase onto B19 (`5fecc0e`); the step check passed again after the rebase.
- **Screenshots**: `docs/screens/b18-pluto-step6-{390,1280}.png`, `b18-asteroid-345-step6-390.png`, `b18-epsindib-step6-390.png`.
- **Limits**: on phones the inset covers part of the main map's track and one date label on steps 4–6; step 1 shows the full track. Not checked on a real phone.

### Task B21, 15 Nov 2026: the 30-second demo video re-made from the current build

- `docs/screens/demo/vestigium-demo-30s.mp4`: **30.000 s** (900 frames), **2,176,545 bytes**, 1280×720, H.264
  High, yuv420p, 30 fps, no audio. Captions are burned in; `vestigium-demo-30s.srt` matches them line for line
  (6 cues). `vestigium-demo-30s-contact.png` is the contact sheet.
- Shots as briefed:
  - home first screen → 3D map;
  - "Watch Barnard's Star move" → blink;
  - Predictions' four steps → the Pluto reveal from step 1;
  - the verdict with the zoomed inset;
  - "Why we missed" → "Check us in 2027";
  - the Planet X card → the Lab's top;
  - the title card with the current logo file, the name, the address, the team and the data credit.
- Real screen recordings of the site only, no generated media. The captions take their numbers from the page and
  the files while recording: the frame years 2010 and 2026, the finding's 168″, Pluto's 5.90″ miss, and the
  straight line's 3,368× (which must be at least 3,000×).
- Every number matches `docs/SUBMISSION-NUMBERS.md`. "3,000×" is the brief's round figure for 3,368×, which is in
  `verification.json` and not in the numbers file.
- The recording checks found:
  - no exception;
  - no request to `dev-fixtures`;
  - no "SPHEREx Blink" or "pythonhack000" in any page;
  - no "TENGER" in any page title or visible text.
  The B9 video (`tenger-demo-30s.*`) is kept and superseded.
- Re-make in about a minute with `node docs/screens/demo/make-video.mjs`. The script serves this checkout's
  `static/` itself; the docs/screens/demo README lists the shots and sources. No page of the site was changed for
  this task.

### Task B20, 15 Nov 2026 (done by Session A at the user's request; Beat the physics for a first-time player)

Session B was told and stayed off the game files. Only the game page and its strings changed.
- **Top** (`game.headline`, `game.leadShort`):
  - The headline is "Can you guess where it goes next?", followed by one line telling the player to tap the next position.
  - The round picker is three plain buttons ordered by difficulty: "Barnard's Star · Easy", "Epsilon Indi B · Medium", "Pluto · Hard" (`game.js roundDifficulty`).
  - The trial-type chips moved into each round's closed "About this round", led by "Practice run" for the stars or "Real test" for Pluto. The earlier chips ("Retrospective demo", "Blind", "Not counted as prospective"), the task and the trial note are kept there.
- **Chart first**:
  - The round title is "Where will Barnard's Star be on 21 Aug 2026?", with the date in words from `reveal_t_mjd`. The chart follows directly.
  - "How to predict", the timeline and the training table moved below the chart.
  - At 390×844 the whole chart (479–811 px) is on the first screen.
- **Easy mode** (on by default; the Easy / Hard switch sits beside the chart):
  - The track is joined in date order with an arrowhead, and the visit dates are labelled.
  - Hints 1 and 2 are drawn and written out without being asked. Hint 2's ruler has month ticks ("1 mo" …) and ends in a hollow circle labelled with the target date.
  - Pluto adds "Pluto loops once a year because Earth moves. Why Pluto loops" (link to `?page=loop`).
  - Hard mode hides the arrowhead, the hint arrow and the ruler; its hints work as before.
- **Controls**:
  - A compass (N, E) and a scale bar ("2″ (the Moon is 1,800″ wide)") replace the axis titles and tick numbers.
  - A tap places the marker, and a second tap moves it.
  - The number boxes and arrow buttons are in a closed "Type it or use keys instead"; arrow keys on the chart still work.
  - "Check my guess" replaces "Lock in my guess" and stays disabled until a marker is placed. It plays the reveal in the fixed order (straight line, then model, then real position, 0.7 s apart, none under reduced motion).
- **Result**:
  - The result opens with "You were X away. The straight line was Y away, and our physics Z.", using the round file's positions.
  - Stars follow: ★★★ inside the model's 95% oval (the round's `cov_arcsec2` and `region_d2`), ★★ closer than the straight line, ★ otherwise.
  - Then come "Try the next round" (easy → medium → hard → back to easy) and "Play this round again".
  - The verdict, the score table (its player row says "You (Easy mode)" or "You (Hard mode[, n hints])"), the official result, the star rule, the explanation and the score rule are in a closed "Scores and details". The mark legend is under "What the marks mean".
- **Answer-leak rule**:
  - `preRevealState` gains an `easy` part (scale bar, month ticks, target date). The existing leak test and the new `tests/game-easy.test.mjs` confirm that moving the model, baseline and actual positions changes nothing drawn before the reveal, and that no drawn pair equals an answer.
  - `roundStars` and `scoreRound` are called only from `showResults()`.
- **Test** `tests/game-easy.test.mjs` (5 tests):
  - the Easy-mode leak check above;
  - the star rules;
  - the straight-line and physics errors match the scoreboard (within 0.01″ or 1 part in 10⁵; Pluto's 19,870″ differs by 0.05″ between the round file's offsets and the verification);
  - the title, picker, difficulty and scale-bar strings.
- **Results**: `node --test tests/*.mjs`: 260 pass, 0 fail, before and after the rebase onto B21 (`c610187`); the keyboard flow passed again after the rebase.
- **Browser checks** (headless Chrome at exact sizes):
  - At 360/390/768/1280 the page width equals the viewport width.
  - Keyboard: Tab to the chart, arrows place and move the marker, and Enter checks. The plain line and stars appear, and focus moves to "Try the next round", which opens Epsilon Indi B.
  - A second tap moves the marker, with one marker on the chart.
  - Hard mode removes the hint arrow, the ruler and the track arrowhead; Hint 1 still works on request.
  - Pluto's Easy line links to `?page=loop`.
- **Screenshots**: `docs/screens/b20-before-game-{390,1280}.png`, `b20-before-game-result-{390,1280}.png`, `b20-after-game-{390,1280}.png` (before a guess), `b20-after-game-result-{390,1280}.png` (after the reveal).
- **Limits**:
  - Visit dates are labelled per group of dots (one SPHEREx visit), not per dot: Epsilon Indi B has 18 dots in a few visits.
  - Dates use the en-GB short month ("27 Sept 2026").
  - The hidden-planet round (`planetx-ui.js`) is unchanged.
  - Not checked on a real phone.
- **Live time after the first screen.** Leaving the first screen gives back live time if the visitor was live,
  otherwise their own speed (`time-ui` `isLive`/`goLive`). Checked: scrolled to the full section at 1280, the time
  bar reads LIVE with today's date, at real-time speed.
- **Demo video.** Re-made with `node docs/screens/demo/make-video.mjs`: shot 1 now shows the first screen over the
  turning 3D scene, then the full 3D section on LIVE time. The video is 30.000 s and 900 frames, now 2,501,831
  bytes, and the recording checks raised no problem. I checked the contact sheet and two frames of shot 1.

### Task B22, 15 Nov 2026: "Why we missed" at full width on Predictions

Layout only: no text or number on the page changed.
- **The card with "Why we missed"** (the Pluto card) spans the full content width from 768 px up; the other result
  cards keep their grid.
- **A card's open details use the whole card:** B12's 70-character cap does not apply inside cards.
- **"Why we missed" lays out as a block,** so it never grows past its card.
- **Its tables keep a minimum width of 560 px** and scroll sideways inside their own box on phones, never the page.
- **"Check us in 2027" moves right under the Pluto card** while "Why we missed" is open, and goes back when it
  closes (`js/ledger-ui.js` `keepCheckUnderWhy`).

Checked with "Why we missed" open (before → after):

| Width | Pluto card | Table cells one word per line | Fewest characters per line of long text | Page scrolls sideways |
|---|---|---|---|---|
| 1280 | 400 → 1232 px (full width) | "95% region" → none (every cell 1 line) | 35 → 101 | no → no |
| 768 | 352 → 720 px (full width) | 4 cells → none (at most 2 lines) | 31 → 58 | no → no |
| 390 | 358 px | 2 cells → none (tables scroll in their own 288 px box) | 31 (the card is the screen's width) | no → no |

At every width "Check us in 2027" follows the Pluto card directly, 16 px below it.

- **Demo video:** re-made with `node docs/screens/demo/make-video.mjs`. Shot 5 (0:20–0:24) now reads "Why we missed"
  at full width, then scrolls to the 2027 card right under it. The video is still 30.000 s and 900 frames, now
  2,265,379 bytes, and the recording checks raised no problem. I looked at the contact sheet and at four frames of
  shot 5.
- **Tests:** 260 pass.
- **Screenshots:** `docs/screens/b22-why-missed-<390|768|1280>-<before|after>.png` and
  `b22-why-missed-<width>-after-2027.png`.
- Not checked on a real phone.

### Task B23, 15 Nov 2026: Contrast in view under the picture

- **Placement.** The existing Contrast slider (`#contrast`, 0.4 to 4) moved out of the closed panel into the main
  viewer controls, right after the Blink / Swipe / Side by side / Difference switch. On phones it has its own row
  under that switch. It has a "Contrast" label and a small "Reset" text button that sets it back to 1. The slider
  is at least 160 px wide and 44 px tall; its `aria-valuetext` reads, for example, "1.5 times".
- **What it changes, unchanged from before.** It stays display only: one stretch for every date, now covering the
  AllWISE frame too (`sharedLimits` and `withContrast`), and no measurement reads it. Moving it repaints the frame on
  screen, and Blink keeps playing, painting each next frame with the new value.
- **Memory.** The value is kept in memory while the visitor switches targets in the page; nothing is written to
  storage.
- **"More tools".** The panel ("More controls" before) keeps field of view, speed, Negative, Gaia stars, AllWISE and
  flagged pixels. In preview mode (Pluto, Makemake and 3I/ATLAS, whose images are previews) the Contrast control is
  hidden, since it does not act on preview images.
- **Checks** (headless Chrome, Barnard's Star):
  - The slider is shown without opening anything at 360, 390 and 1280. At 390 it is 219×44 px on its own row,
    8 px under the switch; at 1280 it is 180×44 px on the switch's row, in view.
  - Side by side, contrast 1 → 3, counting bright pixels: AllWISE 2010 went from 27,325 to 51,679 and SPHEREx 2026
    from 11,338 to 22,337, so fainter stars show in both frames.
  - Blink kept playing through a change (`aria-pressed` true, the frames still alternating). Reset returned it to
    1 ("1.0 times"). Two ArrowRight presses gave 1.2. The accessibility tree names it "Contrast" (slider).
  - Set to 2.5, then "← All targets" and the Epsilon Indi B chip: the slider still reads 2.5 and nothing was stored.
  - No horizontal scroll at 360, 390 or 1280, and no console errors. 260 tests pass.
  - Screenshots: `docs/screens/b23-contrast-<390|1280>-<before|after>.png` and `b23-contrast-1280-side-3x.png`.
  - Not checked on a real phone.
- **Live time after the first screen.** Leaving the first screen gives back live time if the visitor was live,
  otherwise their own speed (`time-ui` `isLive`/`goLive`). Checked: scrolled to the full section at 1280, the time
  bar reads LIVE with today's date, at real-time speed.
- **Demo video.** Re-made with `node docs/screens/demo/make-video.mjs`: shot 1 now shows the first screen over the
  turning 3D scene, then the full 3D section on LIVE time. The video is 30.000 s and 900 frames, now 2,501,831
  bytes, and the recording checks raised no problem. I checked the contact sheet and two frames of shot 1.

### Task B24, 15 Nov 2026 (done by Session A at the user's request; Challenge a friend in Beat the physics)

No login, no server and no storage. Only the game page and its strings changed; Session B is on the viewer contrast slider.
- **New `static/js/challenge.js`** (pure):
  - `cleanName` accepts letters of any script, spaces and hyphens, at most 20 characters; anything else is refused.
  - `challengeUrl` builds `?page=game&round=<id>&from=<name>&stars=<1–3>&mode=<easy|hard>` from the page's origin and path, dropping any other parameter and the hash. It refuses bad values.
  - `readChallenge` validates every URL value against the playable rounds. A link with any bad value is ignored, with no error shown.
  - `challengeOutcome` gives win, tie or loss.
- **Game page** (`static/js/game-ui.js`, strings `challenge.*`, a CSS block):
  - After a round's result, "Challenge a friend" opens a small form ("Your first name (optional)"). It builds the link, copies it to the clipboard and shows "Link copied", or shows the link to copy by hand when the clipboard is refused. Where the browser has `navigator.share`, it also offers "Share…".
  - Opening a challenge link starts that round in that mode. A banner above the round reads "Narmandakh got ★★ on Barnard's Star (Easy). Can you beat it?", or "A friend got …" without a name.
  - After the reveal, the result says "You got ★★★. You win!", "You got ★★★. It's a tie." or "You got ★. Narmandakh wins this time.", followed by "Challenge them back".
  - The challenge is read once when the page loads (the page then rewrites its own URL) and kept only in memory.
  - Each round's "About this round" says "Challenge links are not verified scores."
- **Safety**:
  - Names and banner text are set as text (`textContent` through `el(…, { text })`); the game code has no `innerHTML`.
  - The link carries only the round, name, stars and mode: never the guess, the model, the baseline, the real position or a training point.
  - `challenge.js` has no storage, `fetch` or beacon calls.
  - The best score that Beat the physics already keeps in `localStorage` (earlier task, best-effort) is unchanged; the challenge itself stores nothing.
- **Test** `tests/challenge.test.mjs` (5 tests):
  - Names: crafted `<script>`, `<img onerror>`, quotes, `&`, over 20 characters, digits and a leading hyphen are refused.
  - Crafted links (HTML or script in the name, stars 4 or 2.5 or HTML, an unknown or HTML round, a missing mode) are ignored.
  - The source checks: no HTML parsing; the banner and outcome are set as text; no storage or network in the challenge code.
  - For all three real rounds, the link's query keys are only page, round, from, stars and mode. The only number in the query is the star count, and none of the round's coordinates appears at 1–4 decimals.
  - Win, tie and loss, and the English texts.
- **Results**: `node --test tests/*.mjs`: 265 pass, 0 fail.
- **Browser checks** (headless Chrome at exact sizes, with clipboard permission and focus emulation):
  - At 390 and 1280: finishing the Barnard round with ★★★, then "Challenge a friend", the name "Narmandakh" and "Copy the link", shows "Link copied". The clipboard then held `…?page=game&round=barnard-position&from=Narmandakh&stars=3&mode=easy`. Focus moves to the name box when the form opens.
  - Opening links in a fresh page:
    - stars=2, guess ★★★: banner shown, same round and Easy mode, "You win!".
    - stars=3, guess ★★★: "It's a tie."
    - stars=3, guess ★: "Narmandakh wins this time."
    - A Hard-mode Pluto link with no name: "A friend got ★★ on Pluto (Hard)", with Hard mode selected.
    - Two crafted links (`<img onerror>` in the name; `<b>` with stars=9): no banner, no error, and no extra element in the page; the round opens normally.
  - Without focus emulation, headless Chrome refuses the clipboard, and the page correctly falls back to "Copy this link:" with the link selected.
- **Screenshots**: `docs/screens/b24-challenge-banner-{390,1280}.png`, `b24-challenge-outcome-{390,1280}.png`, `b24-challenge-link-copied-{390,1280}.png`.
- **Limits**:
  - The share sheet was only seen offered in phone emulation; it was not opened on a real phone.
  - Stars in a link are self-reported: the round's Details says so.

### Task B25, 15 Nov 2026: the live 3D Solar System behind the first screen

- **Desktop.** The same 3D scene (one WebGL view, not a second one) is the background of Home's first screen.
  - The 3D stage sticks to the top of Home. The headline, the two lines, "Watch Barnard's Star move" and the Planet
    X card lie over its left side on a dark wash (0.86–0.88 opaque behind the text column, fading out to the right).
  - Scrolling slides the text off and fades in the full 3D section: target list, tools, Fly to, time control,
    colour key and caption.
  - Over the first screen, dragging on the scene outside the text turns it, and the wheel scrolls the page, since
    the scene does not zoom while the first screen shows.
- **Phones.** The scene lies behind the first screen (0.78 opaque wash) and takes no touch, so dragging over it
  scrolls the page. "Explore in 3D", under the links, opens the scene full screen with Fly to and the time
  control; "Close" (or Esc) returns, and focus moves to Close and back.
- **Motion.** While at least half of the first screen is in view, the scene turns slowly and time drifts forward
  at one day per second; the visitor's speed comes back afterwards. With reduced motion it is a still frame (the 2D
  map, as `chooseView` already picks). Off screen or in a hidden tab nothing moves: the time control waits, and
  without turning the scene draws no frames.
- **Loading.** The text paints first. The 3D view still loads after the page, now 1.2 s after load instead of 4 s
  (`IDLE_START_MS`). The 2D fallback is unchanged when WebGL is unavailable. Labels in the scene stay out from
  behind the text, which counts as a label blocker.
- **Contrast.** The muted lines on the first screen are #c3cddb, so even over the brightest pixel (the Sun) they
  keep at least 6.8:1 on phones and 8.8:1 on desktop, and the links at least 5.8:1. This is computed from the
  wash's opacity, not measured from pixels.
- **Pluto reveal.** On steps 1 and 6, a link "See it in 3D: why Pluto loops" opens the existing 3D loop view
  (`?page=loop`, which takes no date). The step is remembered (sessionStorage, best effort), so Back reopens the
  reveal on the same step. Every chart stays flat.
- **Checks** (headless Chrome on the GPU):
  - Text painted at 0.12 s at 1280 and 0.11 s at 390. The 3D scene was turning behind it from 1.48 s and 1.46 s:
    two frames 0.7 s apart differ, and the time step is "day".
  - At 390×844 the Planet X card ends at 574 px, so the button and card fit without scrolling. No horizontal
    scroll at either width.
  - 1280: a drag point on the scene lands on the scene. Six wheel steps over it scrolled Home by 480 px. Scrolled
    to the full section, the tools and the time bar are visible and the speed is back to real time.
  - 390: of 95 points across the first screen, none lands on the scene, no element there has a touch-action that
    blocks scrolling, and the canvas has `pointer-events: none`. A real touch drag could not be simulated in
    headless Chrome (not even on the old build), so scrolling by finger is not checked on a device.
  - "Explore in 3D" opens: the scene is 593 px tall under the tools, with Fly to, the time control and Close, and
    focus on Close. Close returns, with focus back on "Explore in 3D".
  - Reduced motion: two frames 1.5 s apart are identical (the 2D map).
  - Reveal: the link shows on step 1, is hidden on step 2 and shows on step 6 ("Verdict"). It opens the loop view
    with its 3D canvas, and Back returns to the reveal on "Verdict".
  - Lighthouse mobile Home: 84 and 84 (TBT 20 ms, CLS 0.013; accessibility, best practices and SEO 100).
  - 260 tests pass.
  - Screenshots: `docs/screens/b25-home-<1280|390>-<before|after>.png`, `b25-home-1280-full3d.png`,
    `b25-explore-390.png`, `b25-home-1280-reduced.png` and `b25-reveal-step6.png`.
  - Not checked on a real phone.

### Task B26, 15 Nov 2026: the demo video as a person using the site

- `docs/screens/demo/vestigium-demo-30s.mp4`: **30.000 s** (900 frames), **3,426,294 bytes**, 1280×720, H.264
  High, yuv420p, 30 fps, no audio. Captions and timings are as before (same .srt). The B25 version is kept as
  `vestigium-demo-30s-v2.mp4`.
- **How it is recorded.** Shots 1–6 are now one continuous take driven by real mouse events (move, hover, click,
  drag, wheel), so hover styles and clicks happen as they would for a visitor.
  - The page draws a 24 px white arrow cursor with a dark outline and a soft shadow at the mouse position, and a
    ring ripple on each click. The script injects it only while recording and removes it before the captions and
    the title card, so the title card has no cursor.
  - Moves are eased (ease-in-out), slightly curved and 400 to 700 ms long; scrolling is 24 small wheel steps over
    700 to 820 ms.
  - The cursor stays clear of the captions (shot 2's caption moves to the top for the Contrast drag).
- **The story as briefed:**
  1. the 3D first screen, then a click on "Watch Barnard's Star move";
  2. the blink, with Contrast dragged 1 → 2.4;
  3. "Predictions", a scroll past the four steps and back, "See how it works with Pluto", then "Next";
  4. to the verdict with the 6,000× inset, the cursor resting near it;
  5. "Close", "Why we missed" and the 2027 card;
  6. "Planet X" to the Lab's top;
  7. the title card.
- **Checks**, all from the recording run:
  - All 12 clicks landed on their targets (the element under the pointer was the target), and the expected page
    or step followed each time.
  - The cursor's largest step between two video frames was 115 px.
  - No page in the take showed "TENGER", "SPHEREx Blink" or "pythonhack000".
  - The contact sheet and eight sampled frames show the cursor in shots 1–6 and none on the title card.
- Re-make with `node docs/screens/demo/make-video.mjs` (about 1 minute). No page of the site was changed.

### Bug fix B27a, 15 Nov 2026 (done by Session A at the user's request): an open target covers the 3D scene

- **Cause**: since B25, Home (still on screen, inert, behind an investigation) is the live 3D scene. Nothing covered it, so its controls, labels and planets showed around and through the Investigate view.
- **Fix**, changing nothing else:
  - `static/css/style.css` (block at the end): with `body[data-page="investigate"]`, the Investigate view has an opaque `var(--bg)` background. The 3D host and all its labels, the 3D tools (Reset view, Top view, Fly to, 2D view), the HUD, the time bar, the 3D caption, the colour key, the left console and the first screen get `visibility: hidden` and `pointer-events: none`.
  - `static/js/space3d.js`: the controller gains `setPaused(on)` and `isPaused()`. While paused, `requestRender` schedules no frame and a pending frame is cancelled; un-pausing requests a frame.
  - `static/js/space-ui.js`: once the 3D view starts, a `MutationObserver` on `body[data-page]` pauses the scene while the page is `investigate` and resumes it otherwise. `stop3d` disconnects it.
- **Checks** (headless Chrome with software WebGL; the 3D view started, with its canvas present):
  - At 1280, 768 and 390, with Barnard's Star, WISE 0855 and Pluto open, no 3D element is visible.
  - A grid of `elementFromPoint` probes every 20–25 px over the whole view hit nothing inside Home.
  - The Investigate background is rgb(5, 7, 13). Back ("All targets") returns to Home.
  - Screenshots: `docs/screens/b27a-barnard-open-{1280,390}.png`.
  - `node --test tests/*.mjs`: 265 pass.
- **Pause and resume, checked by Session B on the Mac's GPU** (headless Chrome with `--use-angle=metal --enable-gpu`, counting WebGL `drawArrays`/`drawElements` calls per second). My own headless run used software GL, where the counter read 0 even on Home.
  - On Home's first screen: 2,700 draws/s, and the scene visibly turns.
  - With Barnard's Star opened from its chip, after the flight: 0 draws/s, and `elementFromPoint(1000, 400)` is not in `#space3d`.
  - After `history.back()`: 2,469 draws/s, turning again, with hero mode back on.
  - "Watch Barnard's Star move" is under its centre and opens Barnard's Star again. A point on the scene outside the text lands in `#space3d`, so drag-to-turn reaches it.
  - No exceptions.

- **Not verified**:
  - That rendering actually stops while a target is open and restarts after Back, with Home's controls working again.
  - The WebGL draw counter read 0 even on Home in headless Chrome, so it cannot show a pause.
  - The in-app browser was hidden, so it drew no animation frames.
  - The pause and resume are therefore checked by code only (the observer and `setPaused`). They need a look with a visible browser.

### Task B27 (logo), 15 Nov 2026: the team's Vestigium logo

- **Files.** The team's files are copied unchanged from `vestigium-logo.zip` into `static/img/`, one place, as
  B14 set up (each file checked to be byte-identical to the zip):
  - `vestigium-logo-white.png` (712×176), `vestigium-logo-navy.png` (712×176), `vestigium-mark-white.svg`;
  - `favicon.svg`, `favicon-32.png`, `favicon-180.png`, `favicon-192.png`, `favicon-512.png`.

  The SVGs were checked: no scripts or outside links. B14's stand-ins `img/logo.svg` and
  `img/apple-touch-icon.png` are removed.
- **Where each file is used:**
  - Header: `vestigium-logo-white.png`, ring and wordmark together, 30 px tall (26 px on phones), alt "Vestigium".
    It replaces the old icon and text; at 390 it sits 121 px clear of Menu, so the mark-plus-text fallback was
    not needed.
  - Browser tab: `favicon.svg` and `favicon-32.png`.
  - Home screen (apple-touch-icon): `favicon-180.png`.
  - Web manifest: `favicon-192.png` and `favicon-512.png`.
  - Printed lessons: `vestigium-logo-navy.png` beside the site address.
  - `og.png` was re-rendered from the site (now showing the logo and the B27a target view), 256 colours, 107 KB.
    The demo video's title card uses the white logo.
- **Checks.**
  - At 390 and 1280 on 2× screens, the logo needs 52 and 60 device pixels of height and the file has 176, so it
    stays sharp.
  - Every icon and the manifest load (HTTP 200). The printed lesson header shows the navy logo. No console errors.
  - `tests/brand.test.mjs` now checks the new wiring (header, tab, home-screen and manifest icons, print logo,
    PNG sizes, clean SVGs) and still checks that no visible text says TENGER. 265 tests pass.
  - Screenshots: `docs/screens/b27-header-390-2x.png`, `b27-header-1280-2x.png` and `b27-print-header.png`.
  - The tab icon itself cannot be seen in headless Chrome, so that check is the icon files loading, not a look at
    a real tab.

### Task B27, 15 Nov 2026: the demo video re-made with only the main screens

- `docs/screens/demo/vestigium-demo-30s.mp4`: **30.000 s** (900 frames), **2,678,935 bytes**, 1280×720, H.264
  High, yuv420p, 30 fps, no audio, captions burned in, with `.srt` and a contact sheet. B26's video is kept as
  `vestigium-demo-30s-v3.mp4`.
- **Recording.** Recorded once on `tenger-dev` with Session A's B27a fix and the team logo (fe69382), using the
  B26 cursor (real mouse events, eased curved moves, click ripples, smooth wheel scrolling).
- **Shots:**
  1. the 3D first screen with the cursor drifting;
  2. a scroll to the full 3D map, the time slider dragged 1 → 6 (planets orbiting), then LIVE;
  3. a scroll back up, a hover on WISE 0855 with its tooltip, then a click on Barnard's Star;
  4. the blink with Contrast dragged 1 → 2.4;
  5. "What changed", then "Estimate motion", with the result and the brightness chart;
  6. the title card with the new logo and "Also inside: blind forecasts and a Planet X test".
- **Shot 5 caption.** It is the user's sentence, "We measure how it moves from the pictures and check it against
  Gaia." On screen: the measured finding (10.4174 ± 0.3267″/yr, Gaia DR3 10.3933, from `investigation.json`) and
  the browser quick look (9.94 ± 0.48″/yr, labelled "not validated").
- **Tooltip.** The WISE 0855 tooltip is the chip's own `title` text, drawn by the recording overlay, because a
  screen recording never captures the browser's native tooltip.
- **Checks:**
  - The contact sheet shows the five screens and the title card.
  - Every click hit its target, with the expected state after: live time, Barnard's Star open, contrast up, the
    motion result and the chart. The cursor's largest step was 95 px per frame.
  - With Barnard's Star open, no 3D label or control is visible or under the pointer.
  - The years (2010, 2026) and the 168″ are read from the page.
  - No page in the take showed "TENGER", "SPHEREx Blink" or "pythonhack000".
- **Script changes** (`make-video.mjs`):
  - Wheel scrolling is now time-driven and lets each step settle.
  - The scroll down is made over the left column and by the first screen's full height, because the colour key
    keeps the wheel to itself and the first screen is taller than 720 px.
  - "Estimate motion" is brought into view with `scrollIntoView` before the cursor moves (the user's step).

### Task B28, 15 Nov 2026: the motion count-up never goes below zero; the video holds the final value

- **Site.** In "What changed" → "Estimate motion", the big number counted up from below zero (−0.49, −0.21). The
  cause: the timer started from `performance.now()`, but a frame's own time can come slightly before that, so the
  progress went negative and the ease-out turned it into a negative number.
  - The count-up now uses `countUpShown(value, elapsedMs, durationMs)` in `static/js/describe.js`. It clamps the
    progress to 0–1, so the number goes from 0 to the value and never below 0 or past it.
  - The count-up now takes 0.8 s (was 0.9 s). With reduced motion the final value shows at once.
  - Files: `static/js/main.js` (`countUp`), `static/js/describe.js`, `tests/describe.test.mjs` (new test: 0 at the
    start and for a frame time before it, monotonic, never past the value, exactly the value at the end).
- **Checks in Chrome** (Barnard's Star, 1280×720, the GPU):
  - Reduced motion: the big number is written once, 9.94.
  - No reduced motion: 46 steps from 0.00 to 9.94, final 0.82 s after the result (polled every 50 ms). The
    lowest value shown was 0.00 and the highest 9.94.
- **Video, shot 5** (`docs/screens/demo/make-video.mjs`). "What changed" is now clicked at 17.9 s, still under
  shot 4's caption (the stage keeps blinking beside the panel). "Estimate motion" is clicked at 19.5 s; the quick
  look tracks the star for about 1.3 s, then counts up.
  - The final value, 9.94″/yr, shows from 21.6 s and is held, with the "Catalogue 10.39″/yr" row (y 474–500, the
    caption starts at y 576), until 24.3 s; then the panel scrolls to the brightness chart.
  - The script now fails the run if: the value is final after 21.8 s; the Catalogue row is covered or under the
    caption; or any value the big number showed (all 45 recorded as they were written) is below 0 or past the
    final value.
  - `vestigium-demo-30s.mp4`: **30.000 s** (900 frames), **2,728,271 bytes**, 1280×720, H.264 High, yuv420p,
    30 fps, no audio; `.srt` and contact sheet re-made.
  - The frames at 22, 23 and 24 s (n = 660, 690, 720) were extracted and looked at: each shows 9.94″/yr and the
    Catalogue 10.39″/yr row clear of the caption. Every click hit; the largest cursor step was 56 px per frame;
    no problems were reported.
- **Tests:** `node --test` 266 pass.

### Task B30, 15 Nov 2026 (done by Session A at the user's request): "How it works", evidence downloads, footer
- **New page `?page=method`** ("How it works"): `static/js/method.js` (pure: facts, steps, numbers, links), `static/js/method-ui.js` (renderer), `static/css/method.css` (own file, so Session B's Home work in style.css stays apart), section `#page-method` in `index.html`, `'method'` added to `PAGES` in `route.js`, the `method.*` strings plus `nav.method`, `footer.spaceApps` and `download.*` in `i18n.js`. Each section is a headline, one short line, and cards; longer text sits in closed Details. The header menu item is left to Session B (header off limits during B29).
- **Where every number and fact comes from:**
  - Wavelengths "0.75 to 5 µm": `WAVE_MIN`/`WAVE_MAX` in `static/js/stack.js`. The IRSA DR1 overview says "from 0.75 to 5.0 um across the entire sky" (https://irsa.ipac.caltech.edu/data/SPHEREx/docs/overview_dr1.html, read 15 Nov 2026).
  - "6" detector arrays and the D1–D6 ranges (0.75–1.09, 1.1–1.62, 1.63–2.41, 2.42–3.82, 3.83–4.41, 4.42–5 µm): `DETECTOR_RANGES` in `static/js/stack.js` (same as `backend/processing.py`). The Caltech instrument page says "Six 2K x 2K HgCdTe detector arrays" with Bands 1–6 at exactly these ranges (https://spherex.caltech.edu/page/instrument).
  - "Every 6 months": the JPL mission page says "Every six months, SPHEREx will survey the entire sky" (https://www.jpl.nasa.gov/missions/spherex/).
  - "March 2025": the IRSA DR1 overview says "launched in March 2025"; the JPL page gives March 11, 2025.
  - "NASA/IPAC IRSA": the IRSA SPHEREx mission page (https://irsa.ipac.caltech.edu/Missions/spherex.html) serves DR1.
  - Pluto "5.9″", Miss: `scoreboard.json` row `pluto-position-2026b`, fields `model_error_arcsec` (5.8991) and `status`. "Why: our oval was too small" is shown only when `trials/pluto/postmortem.json` (exploratory, `frozen.d2` 6.7728 > 5.991) is present, and is labelled as found after the reveal. "Team confirmation pending" on the Check step comes from the row's `confirmation_pending`.
  - Practice runs "2 of 2" and "1.52″" / "0.08″": `scoreboard.json` rows `barnard-position-2026b` and `epsindib-position-2026b` (`status`, `model_error_arcsec` 1.5188 and 0.0755), which match `counts.retrospective_holdout.hit` = 2.
  - Asteroid batch "1 of 1", "7 not scorable", "(3)" and "(4)": `scoreboard.json` `asteroid_batch.counts` (hit 1, miss 0, insufficient_data 3, ambiguous 4, invalid_comparison 0), plus `team_statement_pending`.
  - Planet X "4 to 7" magnitudes: `planetx/depth.json` through `readDepth` and `glanceOf` (`planetx.js`), the same numbers as the "Can and can't do" dialog (`limits.js`).
  - The 15″ in "What this cannot tell you": Barnard's `investigation.json` `pipeline.settings.core_radius_arcsec`, through the dialog's own code (`help.js` `renderLimits(host, { only: 'cannot' })`).
  - The Lock link: `trials/pluto-position-2026b/receipt.json` `commit` (b2df072…). The Model and Check links open the Pluto reveal at steps 2 and 6 through a new `?step=1–6` parameter, which is read once when the reveal opens and is not written back.
- **Honest statuses:** all eight steps are "Done" because each step's result is visible on the site. Check reads "Done · team confirmation pending" from the scoreboard. "Ruling out the familiar": stars come from Gaia DR3 (`backend/investigation.py`, `scripts/build_investigation.py`), with SIMBAD for WISE 0855 and Epsilon Indi B. Asteroids come from JPL Horizons and the SBDB, through IRSA MOST (`scripts/asteroids.py`, including the Gaia DR3/AllWISE 15″ star check). **IMCCE SkyBoT is not called anywhere in our code**; its two cards were removed in B30b.
- **Download the data (JSON):** in Investigate's Evidence tab, a link to the target's published `investigation.json` (path from `index.json`, served from the source's own base). On every prediction card's Details (story cards, scoreboard cards and asteroid batch cards), links to that trial's published files that loaded (`trial`, `prediction`, `receipt`, `training`, `verification`). These are existing files only; no data file is new or changed.
- **Links:** "How it works →" at the top of Predictions, under About's headline, and in the "Can and can't do" dialog (the link closes the dialog).
- **Footer:** "Built for the NASA Space Apps Challenge 2026. Not affiliated with or endorsed by NASA." is added to the site footer. **Limit:** the footer is hidden on Home and Investigate by an existing rule (`style.css`: `body[data-page="home"] .site-footer, body[data-page="investigate"] .site-footer { display: none; }`). Both pages are Session B's and off limits during B29, so the line was not on those two pages at first. **Resolved by Session B in `4941fa1` (B29f):** the line is on Home (`.famous-foot`) and at the end of the Investigate panel (`.inv-foot`), and "How it works" is in the header menu. Session A re-checked on top of `4941fa1` in headless Chrome at 1280 and 390. Exactly one copy of the line is visible on Home and one on Investigate, the menu has "How it works", there is no sideways scroll, and `node --test` passes 276 of 276.
- **Checks (real runs):**
  - `node --test tests/`: 271 of 271 pass after rebasing onto `e1f1ab0` (270 before). This includes the new `tests/method-page.test.mjs` (5 tests): numbers equal the files' fields; eight steps in order; the Lock commit; the pending status; `?step=` parsing; facts with https mission sources; only services we call are listed (B30b); the four limits equal the dialog's; every trial's files exist; the footer and the three links are in `index.html`.
  - `python -m scripts.validate_release`: 120 contract files checked, 0 failures.
  - Headless Chrome (CDP, exact viewports):
    - At 360, 390 and 1280, `scrollWidth` equals the viewport width (no sideways scroll) and no element ends past the right edge.
    - On the first screen no visible paragraph is longer than 3 lines (measured; two longer card lines were shortened).
    - All nine headline values render from the files.
    - `?target=barnard&panel=evidence` shows "Download the data (JSON): investigation.json"; fetching `data/barnard/investigation.json` returns 200 with `tenger.investigation/1`.
    - On Predictions there are 16 download lines, including 8 batch cards, and all 55 linked files return 200. The top link is `?page=method`.
    - `?page=predictions&trial=pluto-position-2026b&step=2` opens the reveal on step 2 ("Physics predicts Pluto's path…"), and `&step=6` opens the verdict ("5.9″ from our forecast, just outside the oval: a miss").
  - Accessibility: sections use `aria-labelledby` and headings, and cards are list items with an h3. The band strip is a labelled list, Details are native `<details>`/`<summary>` (keyboard and screen-reader ready), and each download link has an `aria-label` naming the file and the target.
- **Screenshots:** `docs/screens/b30-method-360.png`, `docs/screens/b30-method-390.png`, `docs/screens/b30-method-1280.png` (full page), `docs/screens/b30-reveal-step2-390.png`.
- **Not verified:** a real phone, and screen-reader speech (only the markup was checked).

### Task B29 (with additions a–e), 15 Nov 2026: Home is the Solar System, moving on its own

- **One view.** The 3D Solar System fills Home under the header. The separate text-first screen and the second 3D
  section are gone (no `home-spacer`, no old target rail).
  - A compact title block sits top-left: "Watch the sky move.", "Real NASA SPHEREx pictures of stars and worlds that
    move.", the "Watch Barnard's Star move" button and a "New: Could SPHEREx see Planet X?" chip. The chip links to the
    Lab; its measured line from `depth.json` is the chip's tooltip and screen-reader text.
  - Search is a small icon in the header (`#head-search`); the same form opens under it.
- **Famous targets** (`static/js/home.js` `renderFamous`, `describe.js` `famousLine`). 8 cards: the five challenge
  targets, Pluto, Makemake and 3I/ATLAS. Each card has a still thumbnail, the name and one line from the data files:
  - Stars: kind and light-years ("fast-moving star · 6 ly").
  - Pluto and Makemake: "dwarf planet · our blind forecast", from `open_forecast_ids` in `index.json` (now read
    by `targets.js`).
  - 3I/ATLAS: "interstellar comet · pictures only" (See only).
  - Each card's accessible name also carries the data status and the prediction status.
- **Choosing a card** (or a target's 3D label):
  - The camera flies there, the card is pressed and the 3D label is highlighted.
  - A popup shows the same line, the status ("Images ready · Hit: inside the preregistered region") and "See the
    pictures", which opens Investigate on See with Blink playing.
  - Esc, the × button or a click on empty space closes it; the camera returns to the whole view.
  - Back from Investigate also closes it and returns the camera home.
- **Motion with no input** (`space-ui.js` `watchAuto`, pure `shouldTurn`):
  - The camera turns once in about 2 minutes (OrbitControls speed 0.5, timed in seconds). Time runs at 1 day/s.
  - A drag, wheel or touch on the scene takes over; the turn resumes 5 s after the last one.
  - It stops while a target is chosen, on another page, with Investigate open (the scene also pauses, B27a), with
    the scene off screen or in a hidden tab.
  - b. The **Auto rotate** switch (`role="switch"`) replaces the visible Pause/Play. Off stops both the turn and the
    time; on resumes both. It is on by default and off under reduced motion (a still frame).
- **Decluttered controls:**
  - One compact time bar bottom-centre: LIVE, Auto rotate, date, speed.
  - Reset view, Top view, Fly to and 2D/3D as an icon toolbar bottom-left, with tooltips and accessible names.
  - The colour key and "About this map" are behind a small "Key" button, which also holds the "Planets on …
    (JPL approximate elements)" line and the camera's target.
  - "Schematic · not to scale" stays on screen as a chip.
  - The dataset credit line moved into "About this map".
- **Additions:**
  - a. A hint over the scene: "8 targets · tap a card or label · drag to rotate" (phones: "8 targets · tap a
    card"); the count comes from the data. It fades on the first pointer, touch, wheel or key on Home and returns on
    reload.
  - c. Filter chips above the rail: All, Stars, Brown dwarfs, Variable stars, Solar System (kinds from the data
    files). A chip dims the other cards and their 3D labels to 35% and outlines the matching labels; nothing is
    hidden. The choice is announced ("Brown dwarfs: 2 of 8 targets highlighted.") in a polite live region.
  - d. Layer switches in the Key (Orbits, Labels, Kuiper Belt, Planet Nine range), all on, applied at once without
    reloading (`space3d.js` `setLayer`). A hidden Planet Nine range no longer takes clicks.
  - e. Key line: "Sizes and distances are not to scale; label colour shows the kind of object."
- **Phones:**
  - The Solar System fills the first screen, the title on top and a swipe row (filter chips and cards) at the bottom.
    The Key and the chip sit just above the row.
  - The scene takes no touch, so dragging scrolls the page (no trap). "Explore in 3D" opens it full screen as before;
    the popup sits over the row.
- **Guided tour.** It no longer starts by itself on a first visit; the hint does that job and the tour stays under
  More. This was needed for Lighthouse: the tour's late text was the largest paint.
- **Checks** (headless Chrome on the GPU; `node --test`):
  - 1280×800 and 390×844, no input:
    - The scene is on screen 0.65 s and 0.58 s after navigation.
    - Over 1 s the picture changed and the date ran about 1 day.
    - Auto rotate is on, rate "1 day/s".
  - All 8 cards are visible without scrolling at 1280. At 390 a touch swipe reaches the last card
    (`scrollLeft` 1370 of 1370).
  - Barnard's Star card:
    - It flies, highlights the label "Barnard's Star · 1.83 pc (6 ly)" and opens the popup with focus on "See the
      pictures".
    - Esc closes it and focus returns to the card; Enter reopens it.
    - "See the pictures" opens Investigate (Barnard's Star, Blink pressed, playing).
    - Back returns Home with the popup closed and the scene moving.
  - Filter "Brown dwarfs" and the Orbits and Kuiper Belt layers off: both states are unchanged after flying to
    WISE 0855 and back. The Labels switch hides and shows the labels.
  - Auto rotate off: the date and the picture hold. On: the date runs again.
  - 360×740: nothing overflows sideways, also with the Key, a popup or the search box open.
  - Reduced motion:
    - The 2D map, pixel-identical 1.5 s apart.
    - With 3D switched on, still (Auto rotate off).
    - The popup works.
  - No WebGL (`--disable-webgl`): the 2D map with its 7 markers, the note, all 8 cards; the popup opens WISE 0855 in
    Investigate. The only console messages are three.js's own "could not create a WebGL context", as before B29.
  - Header search: the icon opens the box with focus in it; "Epsilon Indi B" opens that target.
  - No console errors in any other run.
  - Lighthouse mobile on Home (uvicorn, two runs): performance 81 and 82, accessibility 100, best practices 100,
    SEO 100, CLS 0 (before the fixes: 73 and 74, LCP the tour text, CLS 0.094).
  - `node --test`: 270 pass. New: `tests/home-b29.test.mjs` (`shouldTurn`, turn and time rates, card lines from
    `index.json`, Home wiring). `tests/focus.test.mjs` was updated for the icon Fly to button.
- **Screenshots** (`docs/screens/`):
  - Before and after: `b29-home-1280-before.png` and `b29-home-1280-after.png`; `b29-home-390-before.png` and
    `b29-home-390-after.png`.
  - Chip selected: `b29-chip-1280.png`, `b29-chip-390.png`.
  - Key open: `b29-key-1280.png`, `b29-key-390.png`.
  - Popup: `b29-popup-1280.png`, `b29-popup-390.png`.
  - Other states: `b29-home-360.png`, `b29-explore-390.png`, `b29-home-1280-reduced.png`,
    `b29-home-1280-nowebgl.png`, `b29-search-1280.png`.
- **Limits:**
  - Checked in headless Chrome with touch emulation, not on a real phone.
  - The 2D map has no fly-to (the popup still opens).
  - The demo video (B28) still shows the previous Home.


### Task B30b, 15 Nov 2026 (done by Session A at the user's request): SkyBoT removed, logo checked, sources audited
- **SkyBoT removed:** the "IMCCE SkyBoT" cards in "Ruling out the familiar" and "Data sources" are gone, with their four strings and the now unused `method.status.notUsed` (`static/js/method.js`, `static/js/i18n.js`, `static/css/method.css`). "No match means ‘not in these catalogues’, not ‘new’." stays. The test now requires the page to list only `stars`/`asteroids` and `irsa`/`jpl`/`gaia`/`cds`, with no SkyBoT or IMCCE text in the page code or any English string.
- **Header logo:** new screenshots, each in a fresh temporary Chrome profile (no cache, no service worker; `navigator.serviceWorker.getRegistrations()` returns 0; the site registers none). At 1280 and 390 the header shows the new Vestigium logo: `img/vestigium-logo-white.png`, loaded at 712×176, shown at 121×30 (1280) and 105×26 (390). **Why the old icon showed:** the first B30 screenshots were taken before B30 was rebased, from a working tree that did not yet have the logo commit `fe69382`. It was not a cache problem, and nothing needed fixing. `docs/screens/b30-method-1280.png` and `-390.png` are replaced.
- **Submission sources against the code and data** (report only; nothing changed). Every listed source is really used:
  - SPHEREx DR1 and QR3: release fields and file names in `static/data/*/investigation.json`, `backend/`, `scripts/` (e.g. `pluto/verification/spherex_qr3_…webp`).
  - AllWISE: `backend/context.py`, `static/data/barnard/wise.bin.gz`, the Real sky tiles, and the Gaia/AllWISE star check in `scripts/asteroids.py`.
  - 2MASS catalogue: `backend/context.py` (2MASS PSC Ks from IRSA `fp_psc`), shown as context in the barnard, epsindib and wise0855 `investigation.json`.
  - WISE Explanatory Supplement: the W1 limit in `scripts/planetx_build.py` → `planetx/depth.json`.
  - IRSA MOST: `scripts/asteroids.py`.
  - JPL Horizons: `scripts/` (trials, postmortem, build_body, build_scene3d) and 18 data files.
  - JPL SBDB: `scripts/asteroids.py`, `scripts/build_scene3d.py`.
  - JPL approximate planet positions (Standish): `static/js/orbits.js`, `static/js/time.js`.
  - Gaia DR3: `backend/gaia.py`, `backend/investigation.py`, `scripts/`, 18 data files.
  - SIMBAD and VizieR: `backend/catalogs.py`, `scripts/build_investigation.py`, `scripts/asteroids.py`.
  - Aladin Lite 3.8.2: `static/js/sky.js`, loaded on demand from jsDelivr. Note that the Real sky panel is offered only where the local server runs.
  - SPHEREx Blink: the base code (LICENSE, git history).
  - Planet Nine papers:
    - Linder & Mordasini 2016, Fortney et al. 2016 and Meisner et al. 2018: `scripts/planetx_build.py` → `planetx/depth.json`.
    - Batygin & Brown 2016, Brown & Batygin 2016, Batygin et al. 2019, Brown & Batygin 2021 and Brown, Holman & Batygin 2024: `scripts/build_scene3d.py` → `scene3d.json`.
  - Blanton & Roweis 2007: the I-band Vega→AB offset 0.45 in `scripts/planetx_build.py` → `planetx/depth.json`.
  - Astropy: `backend/` and `scripts/`.
  - three.js: `static/vendor/three`.
  - Fonts: the three woff2 files and OFL licences in `static/fonts/`.
  - GitHub Pages: the repository is public, and `.github/workflows/pages.yml` on `main` uploads `static/`. The last run succeeded at 10:53 UTC. The pages API reports the site at https://nama2323.github.io/tenger/ with `status` null.
  - **Not used: none of the listed sources.** The only service the page had listed without using it was SkyBoT, now removed.
  - **Count:** the eight Planet Nine papers are the three in `depth.json` (Linder & Mordasini 2016, Fortney et al. 2016, Meisner et al. 2018, a WISE/NEOWISE Planet Nine search) and the five in `scene3d.json`; all eight are used.
- **Checks:** `node --test tests/` 275 of 275 pass after rebasing onto B29 (`f32e27e`). On top of B29, `?page=method` at 1280 and 390 still shows the new logo, 2 catalogue cards, 4 source cards, no SkyBoT text and no sideways scroll. The header menu item for "How it works" is still Session B's to add.

### Task B29f, 15 Nov 2026: "How it works" in the menu; the Space Apps line on Home and Investigate

- **Menu.** "How it works" (Session A's B30 page, `?page=method`) is in the header menu between "Predictions" and
  "Planet X", in the same order in the phone menu. Checked at 360, 390, 768, 1024, 1100, 1101 and 1280: the order is
  Investigate, Predictions, How it works, Planet X. Clicking it opens the page.
- **Header width.** With the B29 search icon and the extra item, the full menu no longer fits below about 1090 px, so
  the menu collapses into "Menu" at 1100 px and below (it was 980). At 1101 px the "?" button ends at 1085 px, inside
  the 16 px margin.
- **Space Apps line** (Session A's request; `footer.spaceApps`). Home and Investigate hide the site footer, so the
  line also sits:
  - at the bottom of the Famous targets rail (phones: under the swipe row);
  - at the end of the Investigate panel.

  The phone row's reserved height default was raised to 176 px to match, so Home still has no layout shift.
- **Checks:**
  - `node --test` 276 pass (new: menu order and the two lines).
  - All B29 checks at 1280 and 390 pass again. 360: no sideways overflow with the Key, a popup or the search open.
  - Lighthouse mobile on Home: 83 and 81, CLS 0.
  - No console errors.


### Task B31, 15 Nov 2026 (done by Session A at the user's request): the Colour slider under the picture
- **What:** under the picture, right after Contrast, a "Colour" slider with seven steps: All · D1 · D2 · D3 · D4 · D5 · D6. Above it is one line: "SPHEREx sees every patch of sky in 102 colours, recorded by 6 detector arrays. Slide to see each one." (102 is `CHANNELS` and 6 is the size of `DETECTOR_RANGES` in `static/js/stack.js`.) Beside the slider, the current step and its range are shown from the same table (`D3 · 1.63–2.41 µm`, `All · 0.75–5.00 µm`), and this is also the slider's `aria-valuetext`.
- **How:** the slider calls the existing `setBand()`, the same path as the six array tiles and `?band=`. Each step shows that array's real per-array image for both A and B. The URL `band` value updates (`all`, `d1` … `d6`) and is read back on reload, and `setBand()` keeps the slider in step with the tiles and the URL. Display only: a single array is painted with `sharedLimits()`, one stretch per array for every date. No measurement, data file or caption number changes.
- **Off when a picture has one colour:** when A or B is AllWISE, for preview-only targets (e.g. Pluto) and with no frames, the slider is `disabled`. Hovering the control shows "Only one colour is available for this picture. Pick two SPHEREx dates as A and B to see each colour." (the second sentence was added at the user's request; the title is on the control's box and the input), and screen readers get the same sentence through `aria-describedby`. **Note:** Barnard's Star, WISE 0855 and the other fast movers open with AllWISE 2010 as A, so the slider starts disabled there. It turns on as soon as A and B are both SPHEREx dates, for example `?target=barnard&a=2025-08-29&b=2026-08-22`. That is exactly rule 3. **User's decision (15 Nov 2026): keep it as is.** Barnard's Star keeps its AllWISE 2010 vs SPHEREx default pair.
- **Files:**
  - `static/index.html`: the control after `.contrast-control`, and the link to `css/colour-step.css`.
  - `static/js/main.js`: `buildColourStep`, `syncColourStep`, `singleColour`, `colourStepText`; `render()` calls `syncColourStep()`.
  - `static/js/i18n.js`: `colourStep.*`.
  - `static/css/colour-step.css`: new.
  - `tests/colour-step.test.mjs`: new, 3 tests.
- **Checks (real runs):**
  - `node --test tests/`: 279 of 279 pass.
  - CDP script with real key presses (`Input.dispatchKeyEvent`), in a fresh Chrome profile. Barnard's Star (`a=2025-08-29&b=2026-08-22`) and RW Aurigae (default pair), each at 1280×900 and 390×844:
    - All seven steps give seven different pictures of the same date (B), from a fingerprint of the plate's pixels. None is empty, and each is painted at most 22 ms after the input.
    - The URL `band` goes all → d1 … d6.
    - With D2 chosen, Blink keeps playing: Pause stays pressed, and the plate shows both A and B within 3 s.
    - With the slider focused: ArrowRight, ArrowRight, ArrowLeft, Home give D3, D4, D3, All, with the URL following.
    - After choosing D5 and reloading, the URL had `band=d5`, and the page comes back with the slider on D5, "D5 · 3.83–4.41 µm" and a picture.
  - At 360×780 on Barnard's Star, Pluto, RW Aurigae and WISE 0855, `scrollWidth` is 360 (no sideways scroll), and the control ends at x = 335. It is disabled, with the sentence, on Barnard's Star (A = AllWISE), WISE 0855 (A = AllWISE) and Pluto (previews), and enabled on RW Aurigae.
- **Screenshots:** `docs/screens/b31-barnard-1280.png`, `b31-barnard-390.png`, `b31-rwaur-1280.png`, `b31-rwaur-390.png` (all on D3), `b31-rwaur-360.png`, and `b31-{barnard,pluto,wise0855}-360-disabled-check.png`.
- **Not verified:** a real phone or touch dragging (only keys and input events were driven), and screen-reader speech.

### Task B33, 15 Nov 2026 (done by Session A at the user's request): header menu labels never wrap
- **Problem:** at 1280 px the full menu was squeezed and labels wrapped onto two lines ("How it / works", "Planet / X", "Beat the / physics"). With every label on one line at the old 16 px button sides, the full header needs 1288 px, so it cannot fit at 1280. Collapsing there would have hidden "Can and can't do" inside "Menu".
- **Change (header CSS only, `static/css/style.css`):**
  - `.nav button, .nav-more > summary { white-space: nowrap; }` and `.nav > * { flex: none; }`, so no label can wrap or be squeezed.
  - In the one-line state, button sides go from 16 px to 11 px (summary 10 px).
  - The full menu shows from **1240 px**, and at 1239 px and below it collapses into "Menu" (it was 1101/1100).
  - The `.reveal-body` rules that shared the old 1100 px block stay at 1100 px, unchanged.
- **How 1240 was chosen (measured):** at 1240 px the free space between the logo and the menu is 33 px, so the one-line header needs 1207 px. The extra 33 px covers a classic Windows scrollbar (about 17 px; media widths include it, but the fixed top bar does not get that space) plus rounding.
- **Checks (real runs):**
  - CDP sweep, resizing 1 px at a time from **1101 to 1920 px (820 widths) on About, Home and Barnard's Star in Investigate: 0 failures on each.** At every width:
    - no label is taller than one line and every item sits on one row;
    - no item overlaps the next, and neither the top bar nor the page scrolls sideways;
    - the logo, the search icon and "?" are fully on screen;
    - from 1240 up, "Can and can't do" is on screen; from 1239 down, "Menu" is.
  - Free space at 1280 / 1366 / 1440 / 1920: 73 / 159 / 233 / 713 px.
  - The opened "Menu" at 360, 768 and 1239 px: every item fits inside the drop-down, nothing is clipped, and there is no sideways scroll.
  - `node --test tests/`: 279 of 279 pass.
- **Screenshots (header strip):** `docs/screens/b33-header-{1239,1240,1280,1366,1440,1920}.png`, and the opened menu at `docs/screens/b33-menu-open-{360,768,1239}.png`.
- **Not verified:** Windows with classic scrollbars, which is covered by the 33 px margin but not run, and a real 1280 laptop screen.

### Task B29g, 15 Nov 2026: Home's target lines say no more than the record

- **Source.** Every word now comes from `scoreboard.json`, which `loadData` already reads before Home is drawn:
  - its see-only list;
  - the target's scored row: status, `category` (retrospective_holdout = "Practice run", prospective_unexposed =
    "Real test", the Predictions page's own chips), `confirmation_pending` and `model_error_arcsec`.

  Pure functions: `describe.js` `famousResult` and `famousLine`. `index.json`'s `open_forecast_ids` is no longer used
  for the wording. Makemake has an open forecast, but its `prediction.json` says `prediction_status:
  insufficient_data` with no model, so B29's "our blind forecast" overstated it.
- **Cards.** Stars keep kind and distance (they claim nothing about forecasts):
  - Pluto: "dwarf planet · blind forecast, confirmation pending".
  - Makemake: "dwarf planet · too little data to forecast".
  - 3I/ATLAS: "interstellar comet · pictures only".

  Card lines now wrap instead of ending in an ellipsis, which had cut "confirmation pending" to "co…". The rail was
  tightened so all 8 cards still fit at 1280×720, and phone cards are 264 px wide with one height (66 px).
- **Popup result line**, in plain words with the trial type (replacing "Images ready · Hit: inside the
  preregistered region"):
  - Barnard's Star: "Practice run: hit, 1.52″ off" (1.5188).
  - Epsilon Indi B: "Practice run: hit, 0.08″ off" (0.0755).
  - Pluto: "Real test: missed by 5.9″" (5.8991).
  - WISE 0855, RW Aurigae, R Draconis, Makemake: "Too little data to forecast".
  - 3I/ATLAS: "Pictures only".

  Each card's accessible name uses the same two lines. Home's visible text no longer contains "preregistered"
  (checked in the browser).
- **Tests:** `tests/home-b29g.test.mjs` checks every card and popup line against `scoreboard.json` for all 8 targets:
  - the exact lines above;
  - "pictures only" exactly for the see-only list, and "too little data" exactly for `insufficient_data`;
  - "blind" only for a scored real test, "confirmation pending" only where the row says so;
  - the error matches `model_error_arcsec`;
  - Makemake's open forecast is not called a forecast;
  - without the scoreboard no card claims anything.

  `node --test` 279 pass.
- **Checks:** all B29 interaction checks pass again at 1280 and 390. Lighthouse mobile on Home 84, CLS 0 (the
  phone row's reserved height default is now 190 px).
- **Screenshots:** `docs/screens/b29g-rail-1280.png`, `b29g-popup-barnard-1280.png`,
  `b29g-popup-makemake-1280.png`.
- **Independent review** (two read-only reviewers that had not seen this work):
  - Re-derived from the files, every Home line matches the record and nothing overstates a result.
  - Fixed from their low findings:
    - Without `scoreboard.json` the popup now says "Forecast status unavailable" (it said "No forecast yet", which
      the trial files contradict), and 3I/ATLAS keeps "pictures only" from `index.json`.
    - A trial type other than practice run or real test is not named on a card.
    - An exploratory row is never the headline.
    - Screen readers hear the status once, not twice.
  - Left for the user:
    - Pluto's card wording (requested) does not show the miss; the popup does.
    - "Too little data" for RW Aurigae, whose record says no period model was justified (15 measurements exist).
    - Outside B29g, the "Can and can't do" dialog (B19's dictated texts) says every forecast was locked before the
      newest pictures were opened, which is untrue for the two practice runs. It also says "every teammate confirms"
      (still pending), and that RW Aurigae's brightness cannot be measured.

  `node --test` 280 pass.

### Task B32, 15 Nov 2026: a new deploy never runs with old cached files

- **Cause.** After the 21:19 deploy, a browser showed raw string keys ("nav.method", "hero.lineShort") and "Cannot
  read properties of null (reading 'setAttribute')". GitHub Pages lets browsers cache every file for 10 minutes and
  the module addresses never changed, so the new `index.html` ran with old cached modules.
- **Reproduced.** A local server with Pages-like caching (`Cache-Control: max-age=600` and an ETag on every file).
  One Chrome profile loaded the build before B29 (`e1f1ab0`), then the server switched to the 21:19 build
  (`0f5153b`) and the page was reloaded normally. Result: 10 raw keys on Home (`nav.method`, `hero.lineShort`,
  `famous.title`, `footer.spaceApps`, …) and no target cards.
- **Build version on everything.**
  - `.github/scripts/stamp-build.mjs` writes one version into `static/index.html`:
    - `<meta name="build">`;
    - an import map that sends every module under `js/` and `vendor/` (57 today, static and dynamic imports) to
      `<file>?v=<version>`;
    - `?v=<version>` on every stylesheet and on `js/main.js`.
  - The Publish site workflow (`.github/workflows/pages.yml`) runs it with the commit (`${GITHUB_SHA::12}`) before
    uploading, so every deploy gets a new version automatically.
  - The committed `index.html` carries `dev`.
  - Data files: `js/dom.js` `installVersionedFetch()` (called first in `main.js`) adds `?v=<build>` to every
    same-site `data/` request. The API and other sites are untouched.
  - Images keep their addresses, so they are not re-downloaded on every deploy.
- **No raw keys, no crash on a missing part.**
  - `t()` returns nothing for a key with no text (it returned the key); `has()` still tells them apart.
  - The page shell (`main.js`) looks elements up with `part()`, which gives a detached stand-in and one console
    warning instead of null. Other modules, which test for null, keep `$()`, and so does the one null check in
    `main.js` (`#ambient`).
- **Checks:**
  - Same profile, normal reload, Pages-like caching:
    - build before B29 → this build (stamped `1205772abcde`) → a next deploy (`nextdeploy01`);
    - and the 21:19 build → this build.

    Each step: no raw keys, all 8 cards, "How it works" in the menu, no errors.
  - Investigate (all five tabs), Predictions, How it works, Learn and Beat the physics: no errors.
  - All B29 interaction checks at 1280 and 390 pass, with no errors or warnings.
  - `node --test` 288 pass. New: `tests/build-stamp.test.mjs`:
    - the committed map lists every module (re-stamping changes nothing);
    - a deploy stamp versions every module, stylesheet, the main script and the meta;
    - every static and dynamic import goes through the map;
    - data requests carry the build and others do not;
    - a missing key shows nothing.
- **Header.** The menu wrapping at 1280 (Session A's B31 note) is fixed by Session A's B33 (one line from 1240 px);
  my own header change was dropped in favour of it.
- **Limit.** The pre-B32 builds that browsers may already hold cannot be changed retroactively. After this deploy the
  new `index.html` asks for new module addresses, so it loads matching files even while old ones are cached.

### Task B32a, 15 Nov 2026: "Can and can't do" says no more than the files (dialog, About, How it works)

- **Source.** The three lines the B29g review flagged now come from the data, through `limits.js` `honestyFacts`
  (pure) and `help.js` `honestyTexts`. One renderer draws the dialog, the About card and How it works, so all three
  changed together.
  - **Forecasts.** "Our real tests (Pluto and the asteroids) are locked on GitHub before the newest pictures are
    opened. Practice runs (Barnard's Star, Epsilon Indi B) use data we had already seen, and are labelled that way."
    - Real tests: scoreboard rows with `category: prospective_unexposed` (Pluto), plus the asteroid batch, whose
      category and all 8 trials are `prospective_unexposed`.
    - Practice runs: scored `retrospective_holdout` rows (the two hits).
  - **Time stamp.** "→ We log who opened which data, and a test stays marked ‘confirmation pending’ until all four
    teammates confirm." It replaces "every teammate confirms": Pluto's trial says "other teammates not answered yet"
    and its row has `confirmation_pending: true`. The number four is the user's; the files do not record it.
  - **Saturation.** "Very bright stars saturate SPHEREx, so their brightness cannot be measured (Barnard's Star and
    R Draconis)." A target is listed when its investigation has no usable brightness and most pictures were refused
    for flagged pixels:
    - Barnard's Star: 0 of 356 usable, 356 flagged.
    - R Draconis: 0 of 299 usable, 299 flagged.
    - Not listed: Epsilon Indi B (338 of 458 usable); WISE 0855 (no usable pictures, but 198 of 256 refused for
      neighbour light, which the blend line covers).

    The → line: "For Barnard's Star we use the position instead; R Draconis is marked ‘too little data’. RW Aurigae
    has 15 brightness measurements, but no regular pattern to forecast from." The 15 is `n_training_points`, and
    the reason is `predict.no-period-model`.
  - The dialog reads Barnard's investigation (already loaded), `index.json`, `scoreboard.json`, and the brightness
    trials' predictions and investigations (RW Aurigae, R Draconis), only when the list opens. Until then each line
    shows without names.
- **Same claim elsewhere:**
  - About, "Saturation": now names Barnard's Star and R Draconis, and gives RW Aurigae its real reason.
  - About, the VSX source note: "R Dra has saturated or flagged pixels on the star in every exposure" (299 of 299);
    it said "is saturated".
  - Lessons only mention Barnard's flagged pixels, which is right, so they were left alone.
- **Download links.** The "Download the data (JSON)" links (Session A's B30 note) now carry `?v=<build>` too
  (`dom.js` `downloadLine`). The file still saves under its own name, and the response is 200.
- **Tests:** `tests/limits-honesty.test.mjs`:
  - the facts from the files;
  - the dialog's partial load gives the same saturated set as all 8 investigations;
  - the exact three lines;
  - no names before the files load;
  - no English string says RW Aurigae saturates, that each forecast was locked before the pictures were opened, or
    that every teammate confirms;
  - About's saturated list.

  `node --test` 291 pass.
- **Browser** (1280 and 390): the dialog shows the three lines with no errors, and About and How it works show the
  same.
- **Screenshots:** `docs/screens/b32a-limits-can-1280.png`, `b32a-limits-cannot-1280.png`,
  `b32a-limits-can-390.png`, `b32a-limits-cannot-390.png`.
- **B33.** Session A's 25f823a is accepted, so B33 was not re-done here.
- **Precision fix** (Session A's science check). The line now reads "RW Aurigae’s forecast had 15 brightness
  measurements to learn from, but no regular pattern to forecast from." The 15 is the frozen trial's training set:
  `training.json` has 15 points and `n_training_points` is 15. The investigation has 17 usable measurements; the
  2026 W36–38 season was held out for the check. "Has 15" understated the total.
  - Session A also confirmed the rest against the files: the saturation counts, the trial categories, and "until all
    four teammates confirm" (`docs/EXPOSURE.md`).
  - The test now pins the 15 to `training.json`.
  - The two "limits" screenshots were re-taken.

  `node --test` 291 pass.

### Task B35, 15 Nov 2026: "More to explore" on Home (pictures only), no archive objects in public search

- **Rows.** Under the 8 Famous target cards (unchanged), "More to explore" lists the search list's prepared objects,
  grouped as in search: Fast stars (6), Galaxies (4), Nebulae (4), Star clusters (3). Each card has:
  - its thumbnail;
  - "Pictures only: no forecast";
  - its one-line description (the search list's `hook_*` text).

  Wide screens: the rows sit in the rail under the targets and the whole rail scrolls; all 8 targets stay visible
  at 1280×800. Phones: a swipe row per group below the first screen, which is now 40 px short so the heading shows.
  Code: `home.js` `exploreGroups`, `renderExplore`; `main.js` `placeExplore`.
- **Click.** The same popup as a target: name, "Pictures only: no forecast" as its first line, then the
  description, and "See the pictures" (Investigate, Blink). There is no 3D flight, since these objects are not in
  the scene. That none of the 17 has a trial is checked against `scoreboard.json` and `index.json`.
- **Public site.** All 17 were opened one by one on a github.io build (static files served as
  `https://nama2323.github.io/tenger/` in headless Chrome). Each opened Investigate with its pictures drawn (A/B
  dates, lit pixels), with no errors and no request to a server. None failed, so none is left out (`exploreGroups`
  takes an exclusion list if one ever does).
- **Search.** "More famous objects" (`names.js` CATALOG, loaded from the archive through our server) are not
  listed on the public site, and a typed one gives the "needs the Vestigium server" note. With the local server they
  stay, as before. On the github.io build the list shows Fast stars, Galaxies, Nebulae, Star clusters and NASA
  challenge; locally it also shows More famous objects.
- **Checks:**
  - 1280 and 390: the new rows appear below the 8 cards, and Andromeda's card → popup → Investigate works.
  - 360: no sideways overflow.
  - No console errors.
  - Lighthouse mobile on Home: 80, 80 and 81 (meets the rule, with a thin margin).
  - `node --test` 295 pass (new `tests/explore-b35.test.mjs`).
- **Screenshots:** `docs/screens/b35-home-1280.png`, `b35-home-390.png`, `b35-explore-390.png`,
  `b35-popup-1280.png`.

### Task B36, 15 Nov 2026: the all-sky Sky map (Aladin Lite with IRSA's SPHEREx survey)

- **Opening.** A "Sky map" button (icon in Home's toolbar; on phones a button beside "Explore in 3D") opens a
  full-width map over Home; Close or Esc returns, and the 3D scene pauses meanwhile.
  - `static/js/skymap.js` and Aladin Lite (CDS, 3.8.2, from jsDelivr) load only when the map is opened, so Home's
    speed is unchanged: Lighthouse mobile 81, CLS 0.002.
- **Survey.** IRSA's official SPHEREx DR1 all-sky HiPS, `hips/SPHEREx/spherex_allsky_cube` ("SPHEREx DR1 all-sky
  data cube", 102 wavelengths, PNG tiles, cross-origin allowed), live, labelled "SPHEREx survey tiles, live from
  NASA/IPAC IRSA".
  - Aladin asks for the cube's middle slice, which IRSA does not serve (404), so the layer is set to its first
    slice before it is drawn; tiles then load with 200.
  - If IRSA's survey does not answer within 3 s (checked while the library loads), the map uses 2MASS, labelled
    "2MASS, not SPHEREx". That happened once in testing, with a slow IRSA response, and the label was right.
  - Aladin's start-up logger is off (`log: false`).
- **Markers.**
  - The 8 Famous targets in their colours, and the 17 "More to explore" objects in white.
  - Fixed targets sit at their `index.json` footprint centre.
  - Pluto, Makemake and 3I/ATLAS have no fixed place, so each is marked at the centre of our latest SPHEREx picture
    of it (its JPL Horizons position in the investigation file), with that date in the label, e.g. "Pluto
    (2026-05-12)".
  - Clicking a marker opens Investigate (See, Blink).
- **Empty sky.** Clicking shows "RA …°, Dec …°. Pictures for any position need our server; on this site, pick a
  marked object." There is no request to our server.
- **Constellation lines.** A switch, off by default. The d3-celestial line data (Olaf Frohn, BSD-3-Clause) is
  fetched from jsDelivr the first time it is turned on, with the label "Constellation lines are a guide, not SPHEREx
  data".
- **About.** It credits Aladin Lite (CDS) for the Sky map and the Real sky panel, and adds d3-celestial as a
  source. The SPHEREx source now says the all-sky cube is the Sky map's backdrop, for display only (it said Vestigium
  does not use it).
- **Checks** (github.io build: static files served as `https://nama2323.github.io/tenger/` in headless Chrome, with
  live IRSA and jsDelivr):
  - 1280 and 390: the map opens in 1.5 s and 1.2 s with the SPHEREx survey.
  - Barnard's Star: zoomed to its footprint centre (269.44648, +4.768669), a click on that exact pixel hits its
    marker and opens Investigate.
  - Pluto: zoomed to its latest observation centre (308.553874, −22.941289), the same.
  - An empty-sky click shows the note; constellation lines load; Close returns to Home.
  - No requests to our server, no sideways scroll, no console errors.
  - `node --test` 298 pass (new `tests/skymap-b36.test.mjs`; the import map now lists 58 modules).
- **Limits:**
  - Zoomed in to 3°, the SPHEREx tiles had not arrived 1.5 s later in the test. The whole-sky view draws fully.
  - At 390 the whole-sky labels crowd each other; zoom (+/−) separates them.
  - The survey shows one SPHEREx wavelength slice (Aladin's mapping of the first frame); no wavelength is labelled.
- **Screenshots:** `docs/screens/b36-skymap-1280.png`, `b36-skymap-390.png`, `b36-lines-1280.png`,
  `b36-empty-1280.png`, `b36-empty-390.png`, `b36-barnard-1280.png`, `b36-pluto-1280.png`, `b36-home-390.png`.

### Task B32b, 15 Nov 2026: the build-stamp script runs from paths with spaces

- `.github/scripts/stamp-build.mjs` did nothing, and printed nothing, when the checkout path had a space (Session A's
  "Hackathon Astrolemma" folder). Its "run as a script" check compared the percent-encoded `import.meta.url` with
  the raw `process.argv[1]`. It now compares `pathToFileURL(process.argv[1]).href` (Session A's suggestion). CI was
  not affected.
- New test in `tests/build-stamp.test.mjs`: runs the script on a tiny site in a folder named "site with space" and
  checks the stamp. `node --test` 299 pass.



### Task B34, 15 Nov 2026 (done by Session A at the user's request): "Path through time (3D)" in What changed
- **What:** in Investigate → What changed, a closed panel "Path through time (3D)".
  - The floor is the sky around the target: east left, north away from the viewer (up on screen), with a grid and an arcsecond scale bar (1, 2 or 5 × 10ⁿ″).
  - Height is time, on a vertical axis with each visit's date.
  - Each dot is one position measured by us from SPHEREx, joined in date order and labelled "Measured by us from SPHEREx".
  - Controls: "Shadow on the floor" (a switch) flattens the path onto the sky. Drag to turn, scroll or pinch to zoom (OrbitControls on the label layer), and "Reset view".
  - Caption: "The floor is the sky (east left, north up); height is time. Drag to turn."
  - three.js (the bundled `vendor/three/three-tenger.min.js`) is imported only when the panel opens. Without WebGL, or if the download fails, the same path is drawn from above as a 2D SVG with dates. The turning controls and caption are then hidden, and a note says why. A failed download is not cached, so the next opening retries.
  - Under reduced motion there is no auto-spin and no damping. Otherwise the view spins slowly until the first drag. It draws only while something moves and the stage is on screen (IntersectionObserver, so it stops on a hidden page), never more than one frame per frame.
- **Which targets, and the data (only published files, nothing new):** dots are `astrometry.per_exposure` rows in `static/data/<key>/investigation.json` with `status: measured`, finite RA/Dec, and identified as the target.
  - For stars that means `identified === true` and no contaminant. For Solar System bodies it means `identification === 'body'`.
  - Offsets are gnomonic (the same formulae as `backend/astrometry.py tangent_offsets_arcsec`): from `astrometry.reference` for stars, and from the first measured position for bodies, which have none.
  - Barnard's Star: **77** dots in 3 visits. Epsilon Indi B: **421** in 4 visits (the one unidentified detection is left out). Pluto: **50** in 2 visits (6 "candidate" and 7 "static_source" detections are left out).
  - **No panel** for WISE 0855 (all 62 measured detections are `identified: false`, contaminant), Makemake (its 3 are a static source), RW Aurigae, R Draconis and the rest (no positions).
  - Details holds the counts, the method, and a table of every dot (time UTC, east ″, north ″).
- **No model line, on purpose (independent review, below):** the first version drew `astrometry.fit_linear` as "Model (computed)". The review showed that this is the no-parallax straight line, which the trials use as their *baseline* (`baseline.id` "linear-tangent-plane"; their model is "linear-pm-fixed-parallax"). It must not be shown under the model's name. The trials' model publishes no path over these dates: the stars' `prediction.json` `track` is null, and Pluto's tracks are for 2027. So, following "if our model path is in the published files", no line is drawn. The panel says "Our files have no computed model path over these dates, so only the measured dots are drawn."
- **Files:**
  - New: `static/js/path3d.js` (pure data), `static/js/path3d-ui.js` (three.js scene and 2D fallback), `static/css/path3d.css`, `tests/path3d.test.mjs`.
  - `static/index.html`: the `#changed-path` host in What changed, the stylesheet link, and the import map re-stamped with `node .github/scripts/stamp-build.mjs static dev` after rebasing on `1b5a189`.
  - `static/js/main.js`: one `renderPath3d` call in `refreshPanels`, re-drawn only when the target changes.
  - `static/js/i18n.js`: `path3d.*`.
- **Independent review (a background workflow of 2 reviewers plus 13 adversarial checks; read only):**
  - 5 defects confirmed and fixed:
    - **High:** the render loop could schedule two frames per frame (`update()` fires 'change', which already queued one), doubling every frame. Now it schedules only when none is pending. Measured afterwards: 1 then 7 animation-frame requests per second in headless (software rendering), bounded.
    - The "Model (computed)" line was the straight-line baseline, so it was removed (see above).
    - The "no model path" note over-claimed (Pluto has 2027 tracks), so it is now limited to "over these dates".
    - A failed three.js download was cached for good and called "cannot draw 3D". It now retries, with its own note.
    - The date labels' CSS shift was overwritten by the label renderer, so the labels are now placed by position.
  - 9 claims refuted (e.g. Pluto's epoch null test, 2D scale, ResizeObserver loop, a lazy-import race, rendering on a hidden page, which the IntersectionObserver already handles).
- **Checks (real runs):**
  - `node --test tests/`: 305 of 305 pass after rebasing on `1b5a189` (B35, B36 and the stamp-script fix). That includes 6 new tests. For each of Barnard's Star, Epsilon Indi B and Pluto, every dot equals its file row: the same `obs_key`, the same `mjd`, and the offset within 10⁻⁶″ of an independent 3D-unit-vector projection, in date order and on the floor. There is no model line, and the stars' prediction tracks are null. The other targets get no panel. The strings are exact, three.js is imported dynamically only, and the reduced-motion rule is in the source.
  - **Real GPU, final build** (the app's browser pane, Apple M3 Pro, WebGL2, loaded from `127.0.0.1` so that no old `?v=dev` file was cached), from clicking the panel to the first 3D frame:
    - **1280 px:** Barnard's Star 42 ms, Epsilon Indi B 28 ms, Pluto 30 ms;
    - **about 390 px:** 26, 27 and 25 ms;
    - three.js import 6–7 ms; 77 / 421 / 50 dots; no errors; no sideways scroll.
  - Before the rebase it was 23–40 ms. On `localhost` the pane had cached an old `space-ui.js?v=dev`, because every local build is "dev". That is a local-only effect: deploys stamp the commit.
  - Headless Chrome, a fresh profile per run, software WebGL (SwiftShader), 3 targets × 1280×900 and 390×844, CDP mouse and key events, final build:
    - every case draws in 3D, spins normally, and is pixel-identical over 1 s under reduced motion;
    - a 140 px drag changes the picture;
    - **Reset with the Enter key gives back a pixel-identical first view**;
    - Space on the Shadow switch turns it on and changes the picture;
    - animation-frame requests stay bounded (0–15 per second; software rendering is slow);
    - no sideways scroll; **no console errors or exceptions**.
    - Software rendering is much slower than a GPU: the first open took 0.43–2.8 s there and a second open 85–326 ms.
    - Two earlier runs ended without output and passed on rerun; they were most likely a debug-port clash between my own runs.
  - Without WebGL (headless with no GPU) at 360×780 for the three targets: the 2D view with 77/421/50 dots and the note, controls and turning caption hidden, `scrollWidth` 360.
- **Screenshots:** `docs/screens/b34-{barnard,epsindib,pluto}-{1280,390}.png` (3D, reduced motion, final build) and `docs/screens/b34-{barnard,epsindib,pluto}-nowebgl-360.png` (2D fallback).
- **Found while checking:** `stamp-build.mjs` did nothing when the repository path contained a space. Session A reported it, and Session B fixed it in `1b5a189`.
- **Not verified:** touch pinch on a real phone, screen-reader speech, and real-GPU timing on the final rebased build.

### Task B40, 15 Nov 2026: play from the targets; the Sky map opens like a planetarium

- **Game from the targets.**
  - Home's popup and Investigate → What changed show "Play: guess where it goes next" for the targets that have a
    Beat the physics round: Barnard's Star, Epsilon Indi B and Pluto, matched by trial ID (`barnard-position`,
    `epsindib-position`, `pluto-position`). No other target shows the button.
  - It opens that round in Easy mode; the browser's Back returns to Home (popup) or to the investigation.
  - Home's title block has a "Play Beat the physics" link.
- **Sky map.**
  - It opens on the chosen target (the popup's target, else the open investigation, else Barnard's Star) with a
    60° field in a SIN view.
  - Constellation lines and names are on by default; the names come from d3-celestial `constellations.json`, the
    same BSD-3 source.
  - Drag pans. The bottom-left readout shows "RA …°, Dec …° · field …°".
  - A row of Fly to chips (Barnard's Star, Epsilon Indi B, WISE 0855, RW Aurigae, R Draconis, Pluto with its
    picture date) pans smoothly (1.5 s).
  - The markers and the empty-sky note are unchanged.
- **D1–D6 layers: skipped.** IRSA's HiPS list has one SPHEREx all-sky layer (the DR1 cube), no separate per-band
  layers.
- **Home speed.** With B40, Home measured 80 and 79 (the tree before B40 measured 79–81 tonight).
  - Preloading the 51 start modules made it worse (74, 74: the first paint was delayed), so it was reverted.
  - The fix: a small module, `js/early.js`, fills Home's title block as soon as `i18n.js` arrives, on a plain Home
    address only, so Home's largest text paints before the rest of the code. LCP went from about 5 s to 3.3–4.4 s.
  - Lighthouse mobile: 90, 82, 86; CLS 0.014.
  - The stamp script now versions every module script tag, not only `main.js`.
- **Checks** (github.io build in headless Chrome, at 1280 and 390):
  - The three popup buttons open the right rounds in Easy mode, and Back returns to Home; WISE 0855 has none.
  - What changed → Barnard's round (Easy), and Back returns to Barnard's investigation. The title link opens the
    game.
  - The Sky map opens in 1.2 s and 1.3 s on Barnard's Star ("RA 269.4465°, Dec +4.7687° · field 60°"), with lines
    and names fetched.
  - The Pluto chip pans to RA 308.5539°, Dec −22.9413°, and the Epsilon Indi B chip to RA 331.0964°, Dec −56.8011°.
  - A click on Epsilon Indi B's marker opens it in Investigate.
  - No console errors.
  - `node --test` 308 pass (new `tests/play-skymap-b40.test.mjs`).
- **Screenshots:** `docs/screens/b40-skymap-1280.png`, `b40-skymap-390.png`, `b40-chip-pluto-1280.png`,
  `b40-chip-pluto-390.png`, `b40-popup-play-1280.png`.

### Task B37, 15 Nov 2026: "Where is this in the sky?" in Beat the physics (branch `game-sky`, base `31091c0`)

- **What.** Each position round (Barnard's Star, Epsilon Indi B, Pluto) gets a round sky window below the guessing
  area. It shows IRSA's SPHEREx DR1 all-sky HiPS, live, in Aladin Lite (the same module as B36). It loads when it
  scrolls into view, and one view is reused from round to round. Every earlier part of the round is unchanged: I
  compared all 25 parts of the round area with the live site (`31091c0`) and played a full round with all four
  reveal steps.
- **View.** Stereographic, seen from inside the sky like a planetarium, with zoom-out capped at 120° so it never
  becomes a globe. Presets are 60°, 2°, 10′ and "the chart". Our own −/+ buttons and an "N° across" readout sit
  under the circle, because the circle hides Aladin's corner controls. Constellation lines and names (d3-celestial)
  have a switch and are labelled as a guide drawing, not SPHEREx data.
- **Wavelength.** A slider covers the cube's frames from its `properties` (`data_cube_crval3_arr`), 0.75–4.99 µm. It
  skips frames 50 and 51, which IRSA documents as blank (dichroic) and which return 404. Aladin picks a cube frame on
  an even frequency scale (`setSliceNumber(42)` fetched frame 17), so frames are requested by frequency. I checked
  in the browser that the frame on the slider is the tile IRSA serves (0, 10, 42, 101).
  - Found here: B36's Sky map "first slice" actually shows frame 95 (4.74 µm). It names no wavelength, so I left
    it unchanged.
- **Colour.** One wavelength drawn through a colour map (Magma by default, then Inferno, Viridis, Rainbow, and
  Black and white), with a false-colour note. A blue/green/red composite of three frames did not work in Aladin
  3.8.2: copies of the same survey shared one frequency, and additive blending did not combine them.
- **Honesty.** The ring marks the last training measurement, and the square marks the pre-reveal chart area
  (`guessView`). A test shows the panel is identical with baseline, model, actual and outcome removed. The notes
  give the chart size against the picture's 12.9″ pixel ("too small to see" only when the chart spans under three
  pixels; Pluto's 8.4° chart is visible). They also give the survey dates (2025-04-24 to 2026-05-14, not the guess
  date).
- **Files.** `static/js/game-sky.js` (new), `static/js/skymap.js` (shared Aladin loader, properties reader,
  constellation lines and names; a names failure no longer removes the lines), `static/js/coords.js`
  (`tangentToSky`), `static/js/game-ui.js`, `static/js/i18n.js`, `static/css/style.css`, `static/index.html`
  (re-stamped import map), `tests/game-sky.test.mjs` (new, 8 tests).
- **Tests.** `node --test tests/*.mjs`: 313 of 313 pass. pytest was not run (no `.venv` in this checkout; no Python
  changed).
- **Not verified:** phone widths. Chrome would not narrow below 1100 px, so the one-column layout under 900 px is
  untested.

### Fix CF2, 16 Nov 2026 (Session A, at the user's request): live server only on the local machine
- **Why:** the Space Apps project link is now the Cloudflare Pages copy, https://vestigium-82p.pages.dev. `liveAvailable()` in `static/js/api.js` only checked for `github.io`, so on pages.dev it returned true. Archive-only objects came back into search, Real sky could appear, and coordinate search called a server that does not exist there.
- **Change:** `liveAvailable()` is true only for `LOCAL_HOSTS` = `localhost`, `127.0.0.1`, `[::1]`, `::1` (case-insensitive). Every other host behaves like the public site: github.io, pages.dev, a custom domain and a LAN address.
  - It is the only hostname test in the site. Every caller already uses it: main.js's archive-only search group and objects, coordinate search, the Real sky button and panel, and the live API calls in api.js.
  - home.js and skymap.js mention github.io only in comments. A new test fails if any other module starts testing the host itself.
  - Unchanged on github.io (public) and localhost (live).
  - **Changed for LAN addresses:** a phone opening `http://<mac-ip>:8765` now gets the public behaviour. The prepared targets all work; live search does not.
- **tenger-dev now contains main:** before committing, `tenger-dev` was fast-forwarded to `origin/main` `aa8439c` (the merge of PR #1, which includes B37). This commit sits on top, so main can be updated by a plain fast-forward push. The `cloudflare-mirror` branch was left alone.
- **Checks (real runs):**
  - `node --test tests/`: 317 of 317 pass. `tests/live.test.mjs`:
    - github.io, `vestigium-82p.pages.dev`, `cloudflare-mirror.vestigium-82p.pages.dev`, `vestigium.example.org` and `192.168.1.20` are public: `liveAvailable()` false, and five live calls each reject with `liveUnavailable` and fetch nothing;
    - `localhost`, `127.0.0.1`, `[::1]` and `LOCALHOST` are live: a request to the same origin's `/api/observe`;
    - no other module tests the host.
  - Headless Chrome, a coordinate search for "10 00 24 +02 12 00" on Home:
    - on `localhost` the Real sky button and panel are present, and the search calls `/api/observe` and `/api/job/…` (unchanged);
    - on `172.20.10.3` (this Mac's LAN address, now public) there is no Real sky button or panel and **no `/api/` request**;
    - neither host made any onrender.com request.
  - **B37's sky view in Beat the physics, before the reveal** (Barnard's Star, 1280 and 390):
    - **Swapped answers (headless):** the round was opened twice in one browser, the second time with the round files' `model`, `baseline` and `actual` replaced in the browser by far-away values (3 files swapped). The panel's text was identical both times, at both widths, with no console errors and no sideways scroll. The sky picture itself stays black in headless Chrome, so its pixel comparison proves nothing and is not counted.
    - **Real GPU** (the app's browser, a fresh address): at the chart zoom only the yellow ring ("where SPHEREx last measured it", 29 Mar 2026, a training point) and the blue chart square are drawn. There is no forecast, straight-line or true-position marker, no console errors, and `scrollWidth` 390 at 390. `tests/game-sky.test.mjs` already checks that the ring and square come from the training points only.
    - **Note (not from our answer files):** the panel says the IRSA survey picture blends observations from 24 Apr 2025 to 14 May 2026. That is after Barnard's last training point but before the round's target date (21 Aug 2026).
    - At the chart zoom a diamond of the sky stayed black in the app's browser, apparently survey tiles not yet loaded there.
  - Screenshots: `docs/screens/cf2-game-sky-barnard-{1280,390}.jpg`.
- **Cloudflare copy:** at the time of the fix, https://vestigium-82p.pages.dev still served the old rule with build "dev", that is, main before this fix. It gets the fix when main is updated with this commit and Cloudflare rebuilds.
