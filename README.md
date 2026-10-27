# GlowRoutine — Skin AI Shopping Assistant ✨

**YouCam Skin AI analysis in. A personal routine + shopping list out.**

## The problem

Skincare shopping is guesswork. A shopper standing in front of 200 serums
(physical shelf or product page) cannot tell which three products their skin
actually needs, in which order, or whether the total fits their budget. So
they over-buy actives that fight each other, skip the SPF that makes the
actives work, and abandon the routine in two weeks. Retailers get returns;
shoppers get irritation.

## What GlowRoutine does

1. **Analyze** — the shopper's face photo is analyzed by the **YouCam Skin AI
   API by Perfect Corp** (live mode), producing 0–100 scores for oiliness,
   moisture, wrinkles, pores, spots, dark circles, acne, redness, firmness,
   and radiance, plus an estimated skin age.
2. **Reason** — an agent reads the scores, names the top concerns, and
   narrates its decisions in a visible reasoning trace. No black box: every
   product in the routine carries the score-based reason it was picked.
3. **Build the routine** — AM and PM sequences with correct layering rules
   (e.g. retinal and BHA are never scheduled the same night; SPF always
   closes the morning and is treated as non-negotiable).
4. **Fit the budget** — give it a monthly cap and the agent re-plans:
   treatments drop first, the cleanser/moisturizer/SPF core never does, and
   if the cap is below the cost of the core it says so honestly instead of
   pretending.
5. **Shop** — a clean shopping-list view with per-item prices, a routine
   total, and one-click copy. In production each row deep-links to the
   retailer's product page, which is the eCommerce hook: the analysis ends
   in a basket, not a report.

## Which YouCam API it integrates, and how

**YouCam Skin AI API (Perfect Corp)** — server-to-server REST, implemented
in `src/youcam.js`:

1. `POST /file/skin-analyze` — upload the face photo, receive a `file_id`.
2. `POST /task/skin-analyze` — start analysis with `src_file_id` and the
   `dst_actions` we request (`skin_age`, `skin_oiliness`, `skin_moisture`,
   `wrinkle`, `pore`, `spot`, `dark_circle`, `acne`, `firmness`,
   `radiance`, `redness`).
3. `GET /task/skin-analyze?task_id=…` — poll until success, then normalize
   the per-action scores into the app's concern model (`normalizeResults`).

Auth is `Authorization: Bearer <YOUCAM_API_KEY>`; the host is configurable
via `YOUCAM_API_BASE`. The routine agent (`src/agent.js`) consumes live and
sample results through the exact same shape, so switching modes changes
nothing downstream.

### Sample-data mode (why, and how to go live)

The hackathon's free YouCam API account + 1,000 free units are issued as a
**redeem code emailed after Devpost registration** for the hackathon. Until
that registration happens there is no key to call the live API with, so the
shipped build defaults to **sample mode**: three clearly-labeled sample
profiles whose Skin AI results are marked "SAMPLE DATA" on screen, in the
API payload, and in this README. Sample mode exercises the identical
end-to-end flow (analysis → agent → routine → budget → shopping list).

To go live after registration:

1. Register for the YouCam API Skin AI & eCommerce VTO Hackathon on Devpost.
2. Redeem the emailed code at the YouCam developer console
   (yce.perfectcorp.com) to activate the free API account (1,000 units).
3. Set the key and restart:
   `YOUCAM_API_KEY=<your key> npm start`
   `/api/status` now reports `"mode": "live"` and photo uploads run real
   YouCam Skin AI analyses.

## Run it

```bash
npm start            # http://localhost:4173  (zero dependencies, Node >= 18)
npm run smoke        # end-to-end smoke test (boots the server, walks the flow)
```

Open the page, pick a sample profile, optionally flag concerns and a
budget, and click **Run Skin AI analysis**. Tip: `/#demo` auto-runs the
full flow (handy for judges and screenshots).

## Layout

- `server.js` — zero-dependency HTTP server + API routes
- `src/youcam.js` — YouCam Skin AI client (upload → task → poll → normalize)
- `src/agent.js` — the routine agent (concern ranking, product selection,
  AM/PM sequencing, budget fitting, reasoning trace)
- `src/sampleData.js` — labeled sample Skin AI profiles
- `data/products.json` — demo product catalog (typical drugstore prices)
- `public/` — the single-page app
- `test/smoke.js` — end-to-end smoke test
- `screenshots/` — captures of the running app

## Notes & honesty

- Cosmetic guidance only — not medical advice; the app says so in the UI.
- Demo catalog prices are illustrative; no real brand performance claims.
- No real photos of people are used anywhere in this build.

## Build Disclosure

Build Disclosure: AI-built. Built by AI agents (Tree / Muse fleet)
directed by Rene Turcios during the hackathon period; Rene set the
direction and reviewed; agents designed, coded, and tested.

MIT License — see `LICENSE`.
