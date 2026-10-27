'use strict';
const $ = (id) => document.getElementById(id);
let lastCart = [];

async function init() {
  const status = await (await fetch('/api/status')).json();
  $('modeBanner').textContent = status.mode === 'live'
    ? '🟢 LIVE mode — YouCam Skin AI API key configured'
    : '🟡 SAMPLE-DATA mode — demo Skin AI results, clearly labeled (no API key yet)';
  const profiles = await (await fetch('/api/profiles')).json();
  const sel = $('profileSelect');
  profiles.forEach((p) => {
    const o = document.createElement('option');
    o.value = p.id; o.textContent = p.name; o.dataset.blurb = p.blurb;
    sel.appendChild(o);
  });
  const setBlurb = () => { $('profileBlurb').textContent = sel.selectedOptions[0].dataset.blurb || ''; };
  sel.addEventListener('change', setBlurb); setBlurb();
}

function bar(label, v) {
  return `<div class="bar"><div class="lbl"><span>${label}</span><span>${v}/100</span></div>` +
    `<div class="track"><div class="fill" style="width:${v}%"></div></div></div>`;
}
const LABELS = { oiliness: 'Oiliness', dryness: 'Dryness', wrinkles: 'Fine lines', spots: 'Dark spots', pores: 'Visible pores', darkCircles: 'Dark circles', acne: 'Breakouts', redness: 'Redness', firmnessLoss: 'Firmness loss', dullness: 'Dullness' };

function stepLi(p) {
  return `<li><span class="price">$${p.price}</span><span class="pname">${p.name}</span><span class="why">${p.why}</span></li>`;
}

async function run() {
  const intake = {
    concerns: [...document.querySelectorAll('input[name=concern]:checked')].map((c) => c.value),
    budget: $('budget').value ? Number($('budget').value) : null,
  };
  const aRes = await (await fetch('/api/analyze', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId: $('profileSelect').value }),
  })).json();
  const analysis = aRes.analysis;
  $('analysisCard').classList.remove('hidden');
  $('sourceLabel').textContent = analysis.label;
  $('scores').innerHTML = Object.entries(analysis.scores).map(([k, v]) => bar(LABELS[k] || k, v)).join('');
  $('skinAge').textContent = analysis.skinAge ? `Estimated skin age: ${analysis.skinAge}` : '';

  const rRes = await (await fetch('/api/routine', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis, intake }),
  })).json();
  const r = rRes.routine;
  $('routineCard').classList.remove('hidden');
  $('skinTypeLine').innerHTML = `Skin pattern: <b>${r.skinType}</b> · Top concerns: <b>${r.concerns.map((c) => c.label).join(', ')}</b>`;
  $('trace').innerHTML = r.trace.map((t) => `<li>${t}</li>`).join('');
  $('amList').innerHTML = r.am.map(stepLi).join('');
  $('pmList').innerHTML = r.pm.map(stepLi).join('');
  $('disclaimer').textContent = r.disclaimer;

  lastCart = r.shoppingList;
  $('cartCard').classList.remove('hidden');
  $('cartList').innerHTML = r.shoppingList.map((p) =>
    `<li><label style="font-weight:400"><input type="checkbox" checked> ${p.name} — <b>$${p.price}</b> <span class="hint">(${p.step})</span></label></li>`).join('');
  $('cartTotal').textContent = `Routine total: $${r.total}${r.budget ? ` · budget cap $${r.budget}${r.dropped.length ? ` · dropped to fit: ${r.dropped.join(', ')}` : ' · fits ✓'}` : ''}`;
  $('routineCard').scrollIntoView({ behavior: 'smooth' });
}

$('analyzeBtn').addEventListener('click', run);
$('copyBtn').addEventListener('click', async () => {
  const text = 'GlowRoutine shopping list\n' + lastCart.map((p) => `- ${p.name} — $${p.price}`).join('\n');
  try { await navigator.clipboard.writeText(text); $('copyBtn').textContent = 'Copied ✓'; }
  catch { $('copyBtn').textContent = 'Copy failed — select the list manually'; }
});
init().then(() => {
  // Deep link for demos/screenshots: index.html#demo auto-runs the full flow.
  if (location.hash === '#demo') run();
});
