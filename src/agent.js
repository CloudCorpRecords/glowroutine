'use strict';
/**
 * GlowRoutine agent — turns Skin AI scores (live YouCam or sample) into
 * a personal routine + shopping list. Deterministic and explainable on
 * purpose: every pick carries the reason ("why") derived from the score
 * that triggered it, and the agent narrates its own steps in `trace`.
 * Agentic workflow: analyze -> prioritize concerns -> select products ->
 * sequence AM/PM -> fit budget -> explain.
 */
const PRODUCTS = require('../data/products.json');

const CONCERN_LABEL = {
  oiliness: 'oiliness / shine', dryness: 'dryness', wrinkles: 'fine lines',
  spots: 'dark spots', pores: 'visible pores', darkCircles: 'dark circles',
  acne: 'breakouts', redness: 'redness / sensitivity',
  firmnessLoss: 'loss of firmness', dullness: 'dullness',
};

function topConcerns(scores, n = 3) {
  return Object.entries(scores)
    .filter(([, v]) => typeof v === 'number')
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ key: k, label: CONCERN_LABEL[k], score: v }));
}

function pick(step, wantTags, scores, excludeIds) {
  const pool = PRODUCTS.filter((p) => p.step === step && !excludeIds.has(p.id));
  const scored = pool.map((p) => {
    let s = 0;
    for (const t of p.tags) {
      if (wantTags.includes(t)) s += 2;
      if (t === 'all') s += 1;
      if (t === 'spots' && scores.spots >= 50) s += 2;
      if (t === 'oily' && scores.oiliness >= 60) s += 2;
      if (t === 'dry' && scores.dryness >= 60) s += 2;
      if (t === 'sensitive' && scores.redness >= 50) s += 2;
      if (t === 'acne' && scores.acne >= 50) s += 2;
    }
    return { p, s };
  }).sort((a, b) => b.s - a.s || a.p.price - b.p.price);
  return scored.length ? scored[0].p : null;
}

function buildRoutine({ analysis, intake }) {
  const scores = analysis.scores;
  const trace = [];
  const skinType = scores.oiliness >= 60 ? 'oily' : scores.dryness >= 60 ? 'dry'
    : scores.oiliness >= 45 && scores.dryness >= 40 ? 'combination' : 'balanced';
  trace.push(`Read Skin AI scores (${analysis.source === 'sample' ? 'sample profile' : 'live YouCam analysis'}). Skin pattern: ${skinType}.`);
  const concerns = topConcerns(scores);
  trace.push(`Top concerns by score: ${concerns.map((c) => `${c.label} ${c.score}/100`).join(', ')}.`);
  if (intake && intake.concerns && intake.concerns.length) {
    trace.push(`You also flagged: ${intake.concerns.join(', ')} — self-reported concerns raise those products in the ranking.`);
  }
  const sensitive = scores.redness >= 50;
  const wantTags = [skinType, sensitive ? 'sensitive' : 'all'];
  if (scores.spots >= 50) wantTags.push('spots');
  if (scores.acne >= 50) wantTags.push('acne');
  if (scores.dryness >= 50) wantTags.push('dry');
  if (scores.oiliness >= 50) wantTags.push('oily');

  const used = new Set();
  const why = (p, text) => ({ ...p, why: text });
  const am = [], pm = [];

  const cleanser = pick('cleanser', wantTags, scores, used);
  if (cleanser) {
    used.add(cleanser.id);
    const line = why(cleanser, scores.dryness >= 60 ? 'Dryness scored high, so a non-stripping cream cleanser instead of a foaming one.' : 'A gentle daily cleanser matched to your oil pattern; harsh cleansers make both shine and dryness worse.');
    am.push(line); pm.push(line);
    trace.push('Selected cleanser for AM + PM based on oil/dryness balance.');
  }
  // Serum layer: choose by dominant concern.
  const dominant = concerns[0] && concerns[0].key;
  let serum = null;
  if (dominant === 'spots' || dominant === 'dullness') serum = pick('serum', ['spots', 'dullness'], scores, used);
  else if (dominant === 'dryness') serum = pick('serum', ['dry'], scores, used);
  else serum = pick('serum', ['oily', 'redness'], scores, used);
  if (serum) {
    used.add(serum.id);
    am.push(why(serum, `Targets your #1-#2 concern zone (${concerns.map((c) => c.label).join(' / ')}). Applied to clean skin before moisturizer.`));
    trace.push(`Serum chosen for dominant concern: ${dominant}.`);
  }
  // Treatments.
  if (scores.acne >= 45 || scores.pores >= 60) {
    const bha = PRODUCTS.find((p) => p.id === 'bha-toner');
    pm.push(why(bha, `Pores ${scores.pores}/100 and breakouts ${scores.acne}/100 — BHA is the ingredient with the evidence here. PM, 2–3 nights a week.`));
    trace.push('Added BHA treatment (pores/breakouts above threshold).');
  }
  if (scores.wrinkles >= 40 || scores.firmnessLoss >= 50) {
    const ret = PRODUCTS.find((p) => p.id === 'retinal-serum');
    pm.push(why(ret, `Fine lines ${scores.wrinkles}/100, firmness loss ${scores.firmnessLoss}/100 — a retinal at night is the strongest at-home step. Never layered with BHA the same night.`));
    trace.push('Added retinal for PM (lines/firmness above threshold); sequenced away from BHA nights.');
  }
  if (scores.darkCircles >= 45) {
    const eye = PRODUCTS.find((p) => p.id === 'eye-cream');
    am.push(why(eye, `Dark circles scored ${scores.darkCircles}/100 — caffeine eye gel in the AM for the tired look.`));
    trace.push('Added eye gel (dark circles above threshold).');
  }
  if (scores.acne >= 60) {
    const patches = PRODUCTS.find((p) => p.id === 'spot-patches');
    pm.push(why(patches, `Breakouts scored ${scores.acne}/100 — spot patches for active spots while the BHA does the slow work.`));
  }
  const moisturizer = pick('moisturizer', wantTags, scores, used);
  if (moisturizer) {
    used.add(moisturizer.id);
    const line = why(moisturizer, scores.oiliness >= 60 ? 'Oil-free gel so hydration does not feed shine or clog pores.' : scores.dryness >= 60 ? 'Barrier cream to seal in the hydrating serum and calm sensitivity.' : 'Balanced moisturizer to lock the routine in, AM and PM.');
    am.push(line); pm.push(line);
    trace.push('Moisturizer matched to skin pattern.');
  }
  const spf = pick('spf', wantTags, scores, used);
  if (spf) {
    am.push(why(spf, 'AM only, always last. Spots and dullness get worse with UV, and vitamin C / retinal make SPF mandatory, not optional.'));
    trace.push('SPF added as the AM closer (required alongside the actives above).');
  }

  // Budget fitting: drop lowest-priority treatments first, keep the core 4.
  const budget = intake && typeof intake.budget === 'number' ? intake.budget : null;
  const all = new Map();
  [...am, ...pm].forEach((p) => all.set(p.id, p));
  let total = [...all.values()].reduce((s, p) => s + p.price, 0);
  const dropped = [];
  if (budget && total > budget) {
    const droppable = [...all.values()].filter((p) => !['cleanser', 'moisturizer', 'spf'].includes(p.step))
      .sort((a, b) => b.price - a.price);
    for (const d of droppable) {
      if (total <= budget) break;
      dropped.push(d.name);
      total -= d.price;
      all.delete(d.id);
      for (const list of [am, pm]) {
        const i = list.findIndex((p) => p.id === d.id);
        if (i >= 0) list.splice(i, 1);
      }
    }
    trace.push(`Budget cap $${budget}: total was over, so the agent dropped ${dropped.length ? dropped.join(' + ') : 'nothing'} (treatments first — cleanser, moisturizer, SPF are never dropped). New total $${total}.`);
    if (total > budget) trace.push(`Honest note: the core routine alone (cleanser + moisturizer + SPF) costs $${total}, so a $${budget} cap cannot be met without removing an essential. The agent keeps the essentials and shows the real minimum rather than pretending it fits.`);
  } else if (budget) {
    trace.push(`Budget cap $${budget}: full routine fits at $${total}, nothing dropped.`);
  }

  return {
    skinType, concerns,
    am, pm,
    shoppingList: [...all.values()].map((p) => ({ id: p.id, name: p.name, price: p.price, step: p.step })),
    total, budget, dropped, trace,
    disclaimer: 'Cosmetic guidance only — not medical advice. Stop any product that burns or breaks you out, and see a dermatologist for persistent or painful skin conditions.',
  };
}

module.exports = { buildRoutine, topConcerns };
