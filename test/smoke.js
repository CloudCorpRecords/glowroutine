'use strict';
/** End-to-end smoke test: boots the server on a test port and walks the
 * full flow — status, profiles, sample analysis, routine, budget cap. */
const { server } = require('../server');
const PORT = 4199;
const BASE = `http://localhost:${PORT}`;

async function j(path, options) {
  const res = await fetch(BASE + path, options);
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const out = [];
  try {
    const status = await j('/api/status');
    out.push(`status mode=${status.mode} (expect sample without key)`);
    if (status.mode !== 'sample' && !process.env.YOUCAM_API_KEY) throw new Error('mode should be sample without key');

    const profiles = await j('/api/profiles');
    out.push(`profiles=${profiles.length} (expect 3)`);
    if (profiles.length !== 3) throw new Error('expected 3 sample profiles');

    const { analysis } = await j('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileId: 'elena' }) });
    out.push(`analysis source=${analysis.source} label="${analysis.label}" spots=${analysis.scores.spots}`);
    if (analysis.source !== 'sample') throw new Error('sample analysis must be labeled sample');

    const { routine } = await j('/api/routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysis, intake: { concerns: ['fine lines'], budget: null } }) });
    out.push(`routine skinType=${routine.skinType} am=${routine.am.length} pm=${routine.pm.length} list=${routine.shoppingList.length} total=$${routine.total}`);
    out.push(`concerns: ${routine.concerns.map((c) => `${c.label} ${c.score}`).join(', ')}`);
    out.push(`trace steps=${routine.trace.length}; hasSPF=${routine.shoppingList.some((p) => p.step === 'spf')}; hasRetinal=${routine.shoppingList.some((p) => p.id === 'retinal-serum')}`);
    if (!routine.shoppingList.some((p) => p.step === 'spf')) throw new Error('routine must include SPF');
    if (!routine.shoppingList.some((p) => p.step === 'cleanser')) throw new Error('routine must include cleanser');

    const { routine: capped } = await j('/api/routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysis, intake: { concerns: [], budget: 60 } }) });
    out.push(`budget $60 -> total=$${capped.total} dropped=[${capped.dropped.join(' | ')}]`);
    if (capped.total > 60) throw new Error('budget cap not enforced');
    const { routine: impossible } = await j('/api/routine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analysis, intake: { concerns: [], budget: 10 } }) });
    out.push(`budget $10 (impossible) -> total=$${impossible.total}, honest-note in trace: ${impossible.trace.some((t) => t.includes('Honest note'))}`);
    if (!impossible.trace.some((t) => t.includes('Honest note'))) throw new Error('impossible budget must be flagged honestly');

    const live = await fetch(BASE + '/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: 'AAAA' }) });
    out.push(`live-photo without key -> HTTP ${live.status} (expect 400 with clear message)`);

    const home = await fetch(BASE + '/');
    out.push(`GET / -> HTTP ${home.status}, contains GlowRoutine: ${(await home.text()).includes('GlowRoutine')}`);

    console.log('SMOKE PASS\n' + out.map((l) => '  ' + l).join('\n'));
  } finally {
    server.close();
  }
})().catch((e) => { console.error('SMOKE FAIL:', e.message); process.exit(1); });
