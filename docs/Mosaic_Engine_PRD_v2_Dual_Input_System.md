

# MASTER CONTEXT ENGINEERING PROMPT & PRODUCTION PRD
## Mosaic Engine v2 — Dual-Input Adaptive Vectorization System
### (Replaces the Multi-Strategy Router with an Input-Classified, Zero-Loss Pipeline)

```text
========================================================================================
SYSTEM PROMPT / CONTEXT ENGINEERING SPECIFICATION
ROLE: Senior Vector Graphics Systems Architect & Pixel Art AI Engineer
MODULE: Mosaic Engine v2 (src/core/mosaic/)
STATUS: Replaces v1 "Multi-Strategy Vector Router" — DEPRECATES strategy dropdown
STABILITY: Production-Grade / Locked Architectural Standards
========================================================================================
```

---

# 0. WHY THE OLD SYSTEM IS BEING REPLACED

The v1 Mosaic Engine asked the user to *pick a strategy* (`default-pixel-art`,
`island-grid`, `orthogonal-contour`, `adaptive-quadtree`, `integer-resample`,
`auto-detect`) and then ran the **same continuous-shading, OKLab-smoothing,
background-classification pipeline** underneath almost all of them.

That design has one root failure:

> **Strategy selection was treated as a style choice. It is actually an
> input-type problem.**

The real world only ever hands this engine one of two fundamentally different
kinds of image, and they must never share the same math:

1. **Continuous-tone / photographic / hand-drawn source** — has gradients,
   anti-aliasing, noise, soft edges. It *needs* shading, smoothing, perceptual
   background classification, and cleanup.
2. **Already-pixelated, AI-generated pixel art** (e.g. output from the
   `Pixel_Art_Master_Prompt_v7` generation prompt) — has **zero anti-aliasing,
   a uniform integer grid, flat solid colors, and a hard-edge background**. It
   must **never** be shaded, smoothed, averaged, or blended. Any of the old
   pipeline's "quality" stages (OKLab center sampling, boundary snapping,
   fringe purification) actively **destroy** correct pixel-art data by
   introducing colors that were never in the source.

This is why the old strategy system "does not work perfectly": strategies like
`integer-resample` and `already-pixel-art` were bolted on as *options inside*
a pipeline whose default first stage (`ContinuousShading`) still ran
perceptual sampling logic that a hard-edge sprite sheet never needs and is
actively harmed by.

**v2 fixes this by making input type the first decision in the pipeline, not
a downstream toggle.**

---

# 1. NEW CORE PHILOSOPHY

```text
OLD (v1):  Image → [pick 1 of 6 strategies] → shared pipeline → export
NEW (v2):  Image → CLASSIFY INPUT → route to correct pipeline → shared export
```

### Non-Negotiable Architectural Principles (v2)

1. **Input Classification Replaces Strategy Selection.** The user (or an
   auto-detector) declares *what kind of image this is* — not *which
   algorithm to run*. The algorithm is then chosen for them, correctly, every
   time.
2. **Two Pipelines, Zero Cross-Contamination.**
   - **Pathway A — Photo/Continuous Pipeline**: shading, perceptual
     background classification, cleanup, verification.
   - **Pathway B — Pure Pixel Pipeline**: exact grid detection, exact color
     read, zero blending, zero smoothing, zero shading. Nothing in Pathway B
     is allowed to call any function from `ContinuousShading.js`,
     `PostQualityPass.js`'s snapping/harmonization code, or OKLab-blended
     resampling.
3. **Zero Color Loss Is a First-Class Guarantee for Pathway B.** The set of
   colors in the output must be a **subset** (ideally exact match) of the
   colors in the input. Any pipeline stage that would introduce a new
   interpolated color on Pathway B is a bug, not a feature.
4. **The Strategy Dropdown Is Removed From the UI.** It is replaced by an
   **Input Mode** control (`Auto` / `Photo` / `Pixel Art`) — see §7.
5. **Downstream export, tile shapes, and verification are shared** between
   both pathways so the user still gets one consistent SVG/PNG exporter,
   consistent shape options, and one quality gate — only the *upstream
   sampling logic* diverges.
6. **Non-Destructive Cleanup Persists.** Manual overlay masks
   (`manualRemoveSet`, `manualRestoreSet`, `protectedSet`) remain the only way
   cleanup ever touches the artwork, in both pathways.

---

# 2. FULL PIPELINE ARCHITECTURE (v2)

```text
                              [ INPUT IMAGE ]
                                    |
                                    v
              +-----------------------------------------+
              | STAGE 0: InputClassifier.js               |
              | Auto-detects Photo vs Pixel Art            |
              | (or accepts explicit user override)        |
              +-----------------------------------------+
                     |                          |
        [ mode = photo ]              [ mode = pixel-art ]
                     |                          |
                     v                          v
   +--------------------------------+  +--------------------------------+
   | PATHWAY A — PHOTO PIPELINE     |  | PATHWAY B — PURE PIXEL PIPELINE|
   |--------------------------------|  |--------------------------------|
   | A1 ContinuousShading (OKLab)   |  | B1 GridScaleDetector           |
   | A2 ContourTracer               |  | B2 ExactCellSampler            |
   | A3 BackgroundClassifier        |  | B3 FlatBackgroundClassifier    |
   | A4 BackgroundRemover           |  | B4 HardEdgeBackgroundRemover   |
   | A5 PostQualityPass             |  | B5 IslandSeparator             |
   +--------------------------------+  +--------------------------------+
                     |                          |
                     +------------+-------------+
                                  |
                                  v
              +-----------------------------------------+
              | STAGE 6: MosaicCleanupEngine              |
              | (mode-aware: gentler thresholds on        |
              |  Pathway B; skips entirely if source is   |
              |  already verified 100% clean)             |
              +-----------------------------------------+
                                  |
                                  v
              +-----------------------------------------+
              | STAGE 7: MosaicVerificationEngine v2      |
              | 6-Check Quality Gate (adds Zero-Color-Loss|
              | check + Grid-Alignment check)             |
              +-----------------------------------------+
                                  |
                                  v
              +-----------------------------------------+
              | STAGE 8: TileRenderer                     |
              | (shared shape/size/spacing/rotation engine)|
              +-----------------------------------------+
                                  |
                                  v
                 [ TRUE VECTOR SVG / PNG EXPORT ]
```

---

# 3. STAGE 0 — INPUT CLASSIFICATION ENGINE (NEW, REPLACES STRATEGY PICKER)

**File:** `InputClassifier.js`

### Objective
Decide, automatically or by user confirmation, whether the source image is
**Photo/Continuous** or **Pure Pixel Art**, before any sampling happens.

### Detection Signals

| Signal | Photo indicates | Pixel Art indicates |
|---|---|---|
| **Unique color count** vs. image area | High ratio (thousands of colors) | Low ratio (often < 256, frequently < 64) |
| **Edge transition sharpness** | Gradual gradients between neighboring pixels (anti-aliasing) | Hard, instantaneous transitions — no intermediate blended pixels |
| **Grid autocorrelation** | No repeating block pattern | Strong periodic repetition at an integer block size (e.g. every 8, 16, 32 px) |
| **Run-length uniformity** | Runs of identical adjacent pixels are irregular | Runs of identical pixels align to a common integer divisor across the whole image |
| **Noise floor** | Compression artifacts / sensor noise present | Perfectly flat solid fills, zero noise |
| **Background flatness** | Backgrounds usually still have subtle variance | Background is 100% one flat color, edge-to-edge |

### Algorithm — `GridScaleDetector` (shared by Stage 0 and Pathway B)

```text
1. Build a horizontal edge map: for each row, mark x where color changes.
2. Compute the pairwise differences between consecutive edge positions.
3. Compute the GCD (greatest common divisor, with small tolerance) of all
   observed run lengths, across both axes.
4. If a consistent integer divisor N exists across ≥ 90% of scanned rows AND
   columns, and zero intermediate/anti-aliased pixel values are found at
   those transitions → classify as PIXEL ART, cellSize = N.
5. Otherwise → classify as PHOTO.
```

### Output

```json
{
  "mode": "pixel-art",
  "confidence": 0.97,
  "detectedCellSize": 16,
  "uniqueColors": 34,
  "hasAntiAliasing": false,
  "backgroundFlatness": 1.0
}
```

### User Override

Regardless of confidence, the UI always shows the detected mode with a
one-click override:

```text
Detected: Pixel Art (16×16 grid, 34 colors) — looks right?
[ Yes, use Pixel Art mode ]   [ No, treat as Photo ]
```

This directly replaces the old "Already Pixel Art" checkbox buried inside the
strategy options — it is now the **first and primary decision** in the whole
engine, not a sub-toggle.

---

# 4. PATHWAY A — PHOTO / CONTINUOUS-TONE PIPELINE

This is a refinement of the v1 5-stage pipeline. It is used only when Stage 0
classifies the input as **Photo**.

## A1. ContinuousShading.js (unchanged from v1, improved)
- OKLab-space center sampling at `(x + 0.5) * cellSize`, `(y + 0.5) * cellSize`.
- **New in v2:** confidence-weighted sampling — if a cell straddles a hard
  edge detected by the classifier's edge map, switch that individual cell to
  dominant-color sampling instead of averaging, preventing muddy boundary
  cells even within a photo.

## A2. ContourTracer.js
- 8-connected Moore-Neighbor tracing, unchanged from v1.

## A3. BackgroundClassifier.js (LOCKED CORE STANDARD)
- OKLab ΔE distance classification into `background` / `boundary` / `design`,
  unchanged from v1.

## A4. BackgroundRemover.js (LOCKED CORE STANDARD)
- `outer` (safe, perimeter-seeded BFS) and `global` scope modes, boundary
  fringe purification, solid-black-outline protection — unchanged from v1.

## A5. PostQualityPass.js
- Vector boundary snapping, corner harmonization, Trim/Choke slider
  (−2px to +2px) — unchanged from v1.

**Nothing here changes materially** — Pathway A *is* the old v1 pipeline,
scoped correctly to the input type it was actually designed for.

---

# 5. PATHWAY B — PURE PIXEL ART PIPELINE (NEW)

This pathway is used only when Stage 0 classifies the input as **Pixel Art**
(e.g. sprite sheets generated from `Pixel_Art_Master_Prompt_v7`-style prompts:
zero anti-aliasing, uniform grid, flat isolated color regions, high-contrast
flat background, sprite islands with generous clearance).

**Guiding rule for the whole pathway:**

> If the source image is already a perfect grid of flat color cells, the only
> job of this pipeline is to **read that grid exactly and re-express it as
> vector geometry** — never to reinterpret, average, or smooth it.

## B1. GridScaleDetector.js
- Reuses the Stage 0 detector's output (`detectedCellSize`) — does not
  re-detect from scratch, avoiding drift between classification and sampling.
- Handles the "upscaled sprite" case explicitly: if the artwork was
  originally 16×16 but exported at 512×512 (a 32× integer scale), this stage
  finds the *true* underlying cell size (16×16) rather than treating every
  32×32 block of identical pixels as one "native" cell — this is what the old
  `integer-resample` strategy attempted, now guaranteed correct because
  classification happens first.

## B2. ExactCellSampler.js
- For every detected grid cell, take the color of its **center pixel** —
  no averaging, no perceptual distance blending, no dithering interpretation.
- **Validation rule:** if a cell is *not* perfectly uniform (i.e. it contains
  more than one distinct color, which should never happen on a true pixel-art
  source), flag it as a `mixel-warning` rather than silently averaging it —
  this surfaces upstream generation problems instead of hiding them.
- Guarantees: **output color set ⊆ input color set**, always.

## B3. FlatBackgroundClassifier.js
- Because pixel-art generation prompts (see §9) mandate a **100% flat,
  edge-to-edge background** with **maximum contrast** to the foreground, this
  classifier can safely use a **very tight tolerance (0–5%)** instead of the
  photo pipeline's adaptive tolerance — exactly the guarantee the v7 prompt's
  "High Contrast Boundary" section is designed to provide.
- No OKLab distance blending is used for the decision boundary itself — cell
  colors are compared for **exact or near-exact equality** to the sampled
  background swatch(es), since there is no gradient to reason about.

## B4. HardEdgeBackgroundRemover.js
- Same BFS flood-fill scope modes (`outer` / `global`) as Pathway A's
  remover, but **the fringe purifier is disabled by default**, because a true
  pixel-art source has no anti-aliased fringe pixels to purify. If the
  classifier detects any semi-transparent or blended edge pixels anyway
  (e.g. a badly-generated sprite), it raises a `unexpected-antialiasing`
  warning rather than silently blending them away.
- Solid-outline protection (RGB < 70 / `#000000`) is retained, since retro
  pixel art frequently uses hard black outlines that must never erode.

## B5. IslandSeparator.js
- Directly implements the sprite-sheet requirements from the v7 generation
  prompt: **8-connected component segmentation**, each island tracked with an
  ID (`Design 1`, `Design 2`, …), bounding box, and independent verification.
- Enforces the same **minimum island clearance** the generation prompt asks
  for (16–24 grid units) as a *sanity check*: if two detected islands are
  closer than the expected clearance, warn that they may have been
  incorrectly generated as touching/merged sprites.
- Preserves **1-cell-wide thin features** (stems, pointers, EKG lines from
  the example heart sheet) by explicitly whitelisting any connected run of
  cells that is exactly 1 cell wide, so cleanup (Stage 6) never treats a thin
  intentional line as "noise."

### What Pathway B explicitly SKIPS

| Skipped stage/behavior | Why |
|---|---|
| `ContinuousShading` (OKLab center-sampling for blending) | Source has no gradients to reconstruct |
| Boundary vector snapping / corner harmonization | Source edges are already grid-aligned; snapping would move correct geometry |
| Anti-alias / fringe purification | Source has zero anti-aliasing by construction |
| Adaptive/global color distance smoothing | Would introduce colors not present in source |
| Morphological Trim/Choke (dilate/erode) | Would change intentional pixel-art silhouette shapes |
| Multi-strategy routing (`island-grid` vs `orthogonal-contour` vs `adaptive-quadtree`, etc.) | Unnecessary — one exact algorithm handles all pure pixel-art input |

---

# 6. SHARED DOWNSTREAM STAGES

## Stage 6 — MosaicCleanupEngine.js (mode-aware)
- **Pathway A:** full noise/orphan-pixel purge behavior, unchanged from v1.
- **Pathway B:** cleanup runs in a **much gentler, opt-in mode** — it only
  acts on cells explicitly outside every detected island's bounding box
  (true floating noise), and always respects the 1-cell thin-feature
  whitelist from B5. If Stage 7's verification already reports 100% clean,
  Stage 6 is skipped entirely to avoid any risk of altering correct pixel
  art.

## Stage 7 — MosaicVerificationEngine v2 (6-Check Gate)

Adds two new checks to the original 5:

1. **Outside Noise** — zero floating orphan cells (both pathways).
2. **Edge Geometry** — stair-step ratios follow disciplined pixel-art rhythms
   (both pathways).
3. **Internal Noise** — no single-pixel contrast anomalies inside solid fills
   (both pathways).
4. **Protection Integrity** — `protectedSet` cells fully preserved (both
   pathways).
5. **Design Boundaries** — every island has a fully closed, clean 4-side
   perimeter (both pathways).
6. **NEW — Zero Color Loss** *(Pathway B only)* — output palette must be a
   subset of input palette; any new interpolated color fails this check.
7. **NEW — Grid Alignment** *(Pathway B only)* — every emitted cell boundary
   must land exactly on a multiple of the detected `cellSize`; any
   off-grid rectangle fails this check.

`is100Clean` now requires **all applicable checks for the active pathway** to
pass — Pathway A is unaffected by checks 6–7, which are skipped (not failed)
for photo-mode input.

## Stage 8 — TileRenderer.js (shared)
- Same 5 tile geometries (square, circle, triangle, hexagon, diamond), same
  parametric controls (`msTileSize`, `msTileSpacing`, `msTileRotation`) as
  v1 §5 — this layer is genuinely shape-agnostic and works identically
  whichever pathway produced the underlying grid.
- **Note:** for Pathway B, `msTileSize` is locked to the detected cell size
  by default (editable, but changing it is now clearly framed in the UI as
  "resample pixel art at a different scale," not as part of vectorization
  correctness).

## Export Engine (unchanged from v1, §6)
- True Vector SVG (`SvgExporter.js`): Editable / Optimized (RLE) / Grouped-by-
  color (default) / Object Island modes.
- Crisp PNG (`PngExporter.js`): nearest-neighbor, integer multipliers, zero
  smoothing.

---

# 7. UI CHANGE — REPLACING THE STRATEGY DROPDOWN

### Before (v1, removed)

```text
Strategy: [ Default ▾ Island Grid  Orthogonal  Quadtree  Integer Resample  Auto ]
```

### After (v2)

```text
Input Type:  ( Auto-detect )  ( Photo )  ( Pixel Art )

  Auto-detect result: "Pixel Art detected — 16×16 grid, 34 colors, no
  anti-aliasing." [Use this] [Treat as Photo instead]
```

- **Auto-detect** (default): runs `InputClassifier.js`, shows its result and
  confidence, pre-selects the matching pathway, lets the user override with
  one click.
- **Photo**: forces Pathway A regardless of detection.
- **Pixel Art**: forces Pathway B regardless of detection — this is the exact
  functional replacement for the old `already-pixel-art` / `integer-resample`
  checkboxes, now a first-class, top-level mode instead of a buried toggle.

No control that maps to a removed internal strategy (`orthogonal-contour`,
`adaptive-quadtree`, `island-grid` as *user-facing choices*) is exposed
anymore — those were implementation details that the classifier now decides
internally, correctly, every time.

---

# 8. THE "SMOOTH DESIGN PROCESS" — LIVE PROCESSING UX FLOW

To make the pipeline feel smooth and trustworthy rather than a black box:

```text
Upload
  ↓
"Analyzing image..."  → InputClassifier runs (typically < 200ms)
  ↓
Show detected mode + confidence + [confirm / override]
  ↓
"Building grid..."   → Pathway A or B sampling stage runs
  ↓
Live low-res preview appears immediately (fast pass, debounced)
  ↓
User adjusts sliders (tile size, background tolerance, noise threshold)
  ↓
Debounced re-processing → cancel stale jobs → only latest result renders
  ↓
"Verifying..."       → Stage 7 gate runs, badge shows PASS/FAIL per check
  ↓
If FAIL: highlight exactly which check failed and on which island
  ↓
100% CLEAN badge → Export enabled
```

Key smoothness rules (carried over and reinforced from the Pixel Art PRD):

- Every slider interaction is **debounced**, cancels the previous in-flight
  job, and only ever renders the latest result.
- Heavy stages (`GridScaleDetector`, `BackgroundRemover`, `Verification`) run
  in a **Web Worker** so the UI thread never blocks.
- Preview quality is intentionally lower than export quality; full-resolution
  processing runs only on export, never on every slider tick.
- The verification gate is always visible as a live status strip, not a
  final surprise at export time.

---

# 9. WHY THIS MATCHES THE PIXEL ART GENERATION PROMPT (v7)

The `Pixel_Art_Master_Prompt_v7` generation prompt is written to *guarantee*
exactly the properties Pathway B assumes. Each of its sections maps directly
onto a Mosaic v2 stage:

| v7 Prompt Section | Guarantees | Mosaic v2 Stage That Relies On It |
|---|---|---|
| §01 Modular Grid & Integer Scale | Every pixel block shares one uniform size (8/16/32) | `GridScaleDetector` — grid detection succeeds cleanly |
| §02 Pixel Purity & Hard-Edge Control | Zero anti-aliasing, disciplined stair-stepping | `ExactCellSampler`, Check 2 (Edge Geometry) |
| §03 Palette & Color Discipline | High-contrast flat background, 0–5% tolerance viable | `FlatBackgroundClassifier` tight-tolerance mode |
| §04 Sprite Island Clearance & Layout | 16–24 unit clearance between icons, no touching sprites | `IslandSeparator` sanity checks, per-object Check 5 |
| §05 Vector & Mosaic Compatibility | Manhattan-compatible geometry, 1-cell thin feature preservation | Thin-feature whitelist in `IslandSeparator`; export stays true-vector |

This is the intended contract: **if the source image was generated following
the v7 prompt, Pathway B should be able to reach 100% CLEAN with zero manual
cleanup**, because every property the verification gate checks for was
already engineered into the generation prompt itself.

---

# 10. UPDATED STATE SCHEMA (JSON)

```json
{
  "mosaic": {
    "enabled": true,
    "inputMode": "auto",
    "detectedMode": "pixel-art",
    "detectionConfidence": 0.97,
    "photoPipeline": {
      "shading": { "colorSpace": "oklab" },
      "bgRemoval": {
        "scope": "outer",
        "tolerance": 15,
        "purifyFringe": true,
        "protectBlackOutlines": true
      },
      "trim": 0.0
    },
    "pixelArtPipeline": {
      "detectedCellSize": 16,
      "exactSampling": true,
      "allowMixelWarnings": true,
      "bgRemoval": {
        "scope": "outer",
        "tolerance": 3,
        "purifyFringe": false,
        "protectBlackOutlines": true
      },
      "islandClearanceExpected": 16,
      "thinFeatureProtection": true
    },
    "tile": {
      "shape": "square",
      "size": 16,
      "spacing": 0,
      "rotation": 0
    },
    "cleanup": {
      "enabled": true,
      "noiseThreshold": 25,
      "edgeSensitivity": 30,
      "autoClean": true
    },
    "verification": {
      "checksApplicable": [
        "outsideNoise",
        "edgeGeometry",
        "internalNoise",
        "protectionIntegrity",
        "designBoundaries",
        "zeroColorLoss",
        "gridAlignment"
      ],
      "is100Clean": false
    },
    "manualOverrides": {
      "remove": [],
      "restore": [],
      "protected": []
    }
  }
}
```

Note: the old `"strategy": "default-pixel-art"` field is **removed**.
`inputMode` / `detectedMode` fully replace it. A migration shim should map
any saved project with a legacy `strategy` field to `detectedMode: "pixel-art"`
if `strategy` was `island-grid`/`integer-resample`, otherwise to `"photo"`.

---

# 11. GOLDEN TESTS (NEW, MODE-SPECIFIC)

## Pathway A (Photo) — unchanged behavior from v1
- Solid color photo → uniform output.
- Gradient photo → smooth progression.
- Noisy photo with soft background → correct background removal within
  adaptive tolerance.

## Pathway B (Pixel Art) — NEW

### Test 1 — Exact Color Preservation
Input: a 16×16-cell sprite with 12 unique flat colors.
Expected: output SVG uses **exactly** those 12 colors, zero additions.

### Test 2 — Upscaled Sprite Detection
Input: a 16×16 sprite exported at 512×512 (32× nearest-neighbor scale).
Expected: `GridScaleDetector` reports `detectedCellSize` corresponding to the
*original* 16×16 grid, not 512 individual "cells."

### Test 3 — Multi-Sprite Sheet Segmentation
Input: the 3×5 heart-icon sheet from the v7 example prompt.
Expected: 15 distinct islands detected, each with a clean closed boundary,
zero merged/touching islands.

### Test 4 — Thin Feature Survival
Input: a sprite containing a 1-cell-wide EKG heartbeat line.
Expected: the line survives Stage 6 cleanup unmodified.

### Test 5 — Tight Background Tolerance
Input: sprite sheet with a pure white background and near-white (but
distinct) foreground highlight color.
Expected: `FlatBackgroundClassifier` at 0–5% tolerance does not misclassify
the near-white highlight as background.

### Test 6 — Mixel Detection
Input: a deliberately corrupted cell containing 2 colors instead of 1.
Expected: `mixel-warning` raised, cell is **not** silently averaged.

### Test 7 — No Shading Artifacts
Input: any Pathway B image.
Expected: `ContinuousShading.js` is never invoked (assert via call count in
test harness = 0).

### Test 8 — Zero-Color-Loss Gate
Input: any Pathway B image with intentionally reduced tolerance settings.
Expected: Check 6 (`zeroColorLoss`) fails loudly if any output color is not
present in the source palette, rather than silently passing.

---

# 12. MIGRATION PLAN FROM v1 → v2

## Phase 0 — Audit
Inventory every call site currently reading `mosaic.strategy` from saved
projects or UI state. No code changes.

## Phase 1 — Add InputClassifier.js
Build and unit-test `GridScaleDetector` + classification logic in isolation.
Does not yet change the live pipeline.

## Phase 2 — Build Pathway B in Parallel
Implement `ExactCellSampler`, `FlatBackgroundClassifier`,
`HardEdgeBackgroundRemover`, `IslandSeparator` as new, additive modules.
Pathway A remains the only active pipeline in production during this phase.

## Phase 3 — Wire the New Input Type UI
Add the `Auto / Photo / Pixel Art` control alongside (not yet replacing) the
old strategy dropdown, behind a feature flag.

## Phase 4 — Shadow-Run Verification
For a sample set of real images, run both v1 strategies and v2 pathways,
diff the outputs, and confirm Pathway B produces zero-color-loss results
where v1 did not.

## Phase 5 — Cutover
Remove the strategy dropdown from the UI. Route all traffic through Stage 0.
Keep the old strategy engines in the codebase, unexported, for one release
as a rollback safety net.

## Phase 6 — Legacy Project Migration
Apply the `strategy` → `inputMode`/`detectedMode` shim described in §10 to
any `.pixelart`/`.mosaic` saved project files.

## Phase 7 — Remove Deprecated Strategy Code
Once Phase 5 has been stable for one release cycle, delete
`SpriteIslandEngine.js`, `OrthogonalContourEngine.js`,
`AdaptiveQuadtreeEngine.js`, `MosaicStrategyDetector.js` as standalone
user-facing strategies (their useful internal logic, if any, is already
absorbed into Pathway A/B where it belongs).

---

# 13. AI AGENT IMPLEMENTATION DIRECTIVE

```text
========================================================================================
AI AGENT IMPLEMENTATION DIRECTIVE — MOSAIC v2
1. Do not modify Pathway A's locked BackgroundClassifier/BackgroundRemover
   logic beyond what §4 specifies. It is a proven standard.
2. Pathway B must NEVER call ContinuousShading, boundary snapping, corner
   harmonization, fringe purification, or Trim/Choke dilation/erosion.
   Adding any of these to Pathway B is a regression, not an enhancement.
3. Stage 0 (InputClassifier) must run before any sampling stage, always.
   No pipeline stage may run before classification completes.
4. The "Zero Color Loss" and "Grid Alignment" verification checks are
   mandatory gates for Pathway B — a build that lets Pathway B output pass
   without these checks is not release-ready.
5. The strategy dropdown UI control must be fully removed, not just hidden,
   once Phase 5 (§12) is reached. Do not leave dead strategy code wired to
   any active UI control.
6. All SVG output MUST remain true vector geometry (zero raster <image> tags)
   from both pathways.
7. Verify every change against the Pathway A AND Pathway B golden test suites
   (§11) — a change that only passes one pathway's tests is incomplete.
8. Run the full Vitest suite (`npm run test`) and confirm all 7 verification
   checks behave correctly per-pathway (5 shared + 2 Pathway-B-only) before
   reporting a phase complete.
========================================================================================
```

---

# 14. DEFINITION OF DONE

- [ ] `InputClassifier.js` correctly distinguishes photo vs. pixel-art input
      with ≥ 95% accuracy on a labeled test set.
- [ ] Pathway A behaves identically to the audited v1 pipeline (no
      regression).
- [ ] Pathway B introduces zero new colors on any pure pixel-art test image.
- [ ] Pathway B correctly detects true cell size on upscaled sprite sheets.
- [ ] Multi-sprite sheets segment into correct, separately-verified islands.
- [ ] 1-cell-wide thin features survive cleanup in Pathway B.
- [ ] Verification gate exposes 7 checks total, with the 2 new checks scoped
      correctly to Pathway B only.
- [ ] Strategy dropdown is removed from the UI; Input Type (`Auto` / `Photo`
      / `Pixel Art`) is the only routing control exposed to the user.
- [ ] Legacy `.mosaic`/`.pixelart` project files with an old `strategy` field
      load correctly via the migration shim.
- [ ] All golden tests (§11, both pathways) pass.
- [ ] No console errors; production build succeeds.
