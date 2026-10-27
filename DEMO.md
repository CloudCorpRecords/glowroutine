# Demo Video Script — GlowRoutine (target 2:00, hard cap 3:00)

Format: screen recording of the live app (desktop browser), voiceover.
Public upload (YouTube preferred). No real photos of people are used; the
demo runs on a labeled sample profile.

| Time | On screen | Narration |
|---|---|---|
| 0:00–0:15 | Title + app home, sample-mode banner visible | "This is GlowRoutine. Skincare shopping is guesswork — two hundred serums, no idea which three your skin needs. GlowRoutine turns a skin analysis into a routine and a shopping list." |
| 0:15–0:40 | Explain the API step; show README integration diagram / src/youcam.js briefly | "Under the hood is the YouCam Skin AI API by Perfect Corp. In live mode the app uploads a face photo, starts a Skin AI analysis task, and polls for scores across eleven actions — oiliness, moisture, wrinkles, spots, pores, acne, redness, firmness, and more. This recording uses a clearly-labeled sample profile, because the free hackathon API key arrives as a redeem code after Devpost registration — the integration is finished and switches on with one environment variable." |
| 0:40–1:05 | Click "Run Skin AI analysis" (Maya sample profile); score bars appear | "Here are the analysis results: dark spots 71, oiliness 68, visible pores 58. Now the agent goes to work — and it shows its reasoning. It names the top concerns, then selects products score by score." |
| 1:05–1:35 | Scroll the AM/PM routine; hover the "why" on the serum + SPF | "Every product carries its reason: a niacinamide serum aimed at the spots-and-shine zone the analysis flagged. SPF always closes the morning; the agent treats it as non-negotiable, because UV undoes everything the actives do. In the code, stronger actives like retinal and BHA are also never scheduled on the same night." |
| 1:35–1:55 | Set budget to $45, re-run; dropped item + new total ($43) visible | "Now the eCommerce part. The full routine is fifty-four dollars. Give it a forty-five-dollar budget and the agent re-plans: treatments drop first, the cleanser-moisturizer-SPF core never does. And if a budget is below the cost of that core, it says so honestly instead of pretending." |
| 1:55–2:10 | Shopping list + Copy button; closing card | "The output is a priced shopping list — in production, each row deep-links to the retailer. Analysis in, basket out. That's GlowRoutine, built on the YouCam Skin AI API." |

## Recording checklist
- [ ] Browser at http://localhost:4173, window ≥1280px wide
- [ ] Start from a fresh load; use the Maya sample profile (matches screenshots/02)
- [ ] Keep the sample-data banner in frame at least once (honesty is on-camera)
- [ ] End card: project name, "YouCam Skin AI API", repo URL placeholder
- [ ] Upload public/unlisted-visible per hackathon rules (publicly visible required)
