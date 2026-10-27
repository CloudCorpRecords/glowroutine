# Devpost Submission — GlowRoutine (YouCam API Skin AI & eCommerce VTO Hackathon)

**Project name:** GlowRoutine — Skin AI Shopping Assistant

## Tagline

Skin AI analysis in. A personal routine + shopping list out.

## What it does

GlowRoutine turns a selfie into a shopping decision. A shopper's photo is
analyzed by the **YouCam Skin AI API**, and then an agent does the part a
report can't: it reads the scores, picks the handful of products that match
the skin's actual top concerns, sequences them into a morning and evening
routine with correct layering rules, fits the result to the shopper's
monthly budget, and hands back a priced shopping list — with a plain-English
reason attached to every single product ("Pores 74/100 and breakouts 69/100 —
BHA is the ingredient with the evidence here").

## How it uses the YouCam API

GlowRoutine integrates the **YouCam Skin AI API by Perfect Corp**
(server-to-server REST):

1. The face photo is uploaded (`POST /file/skin-analyze`).
2. An analysis task is started (`POST /task/skin-analyze`) requesting
   `skin_age`, `skin_oiliness`, `skin_moisture`, `wrinkle`, `pore`, `spot`,
   `dark_circle`, `acne`, `firmness`, `radiance`, and `redness`.
3. The task is polled to completion and the scores are normalized into the
   agent's concern model.

The Skin AI scores are the agent's only source of truth about the shopper's
skin — remove the API and there is no routine, which is exactly the point:
this is an agentic workflow built *on* the analysis, not a chatbot with a
skin quiz bolted on. Layering safety is encoded in the agent (retinal and
BHA never share a night; SPF is never dropped by the budget fitter — and if
a budget is below the cost of the essential core, the agent says so instead
of faking a fit).

## Try it / testing access

- **Live demo:** https://glowroutine-three.vercel.app — hosted build running
  in labeled sample-data mode; open `/#demo` there to auto-run the full flow.
- **Repo:** https://github.com/CloudCorpRecords/glowroutine
- Run locally: `npm start` (zero dependencies, Node ≥ 18), open
  `http://localhost:4173`, or open `/#demo` to auto-run the full flow.
- Free to test through the judging period; no account needed.
- This build runs in **sample-data mode** — three clearly-labeled sample
  Skin AI profiles — because the free YouCam API key for this hackathon is a
  redeem code emailed after Devpost registration. The live integration is
  complete and switches on with one environment variable
  (`YOUCAM_API_KEY=… npm start`); the README documents the redeem steps.

## Built with

Node.js (zero-dependency HTTP server), vanilla HTML/CSS/JS, the YouCam
Skin AI API (Perfect Corp), and a deterministic, explainable routine agent
written for this project. Demo catalog prices are illustrative.

## Screenshots

See `screenshots/` in the repo: intake in sample mode, and the full
analysis → routine → shopping-list result.

## Build Disclosure

Build Disclosure: AI-built. Built by AI agents (Tree / Muse fleet)
directed by Rene Turcios during the hackathon period; Rene set the
direction and reviewed; agents designed, coded, and tested.
