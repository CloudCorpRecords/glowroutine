'use strict';
/**
 * YouCam (Perfect Corp) Skin AI API client — V2 server-to-server REST.
 *
 * Follows the current YouCam API document (AI Skin Analysis guide):
 *   1. POST {BASE}/file/skin-analysis   JSON { files: [{ content_type,
 *      file_name, file_size }] }  -> { data: { files: [{ file_id,
 *      requests: [{ method: 'PUT', url, headers }] }] } }
 *   2. PUT the image bytes to the pre-signed URL from step 1.
 *   3. POST {BASE}/task/skin-analysis   { src_file_id, dst_actions, format }
 *                                       -> { data: { task_id } }
 *   4. GET  {BASE}/task/skin-analysis/<task_id>  (poll)
 *                                       -> { data: { task_status, results } }
 * Auth: header  Authorization: Bearer <YOUCAM_API_KEY>  (the V2 API takes
 * the raw API key; the older V1 token-init flow is not used here).
 * Base URL is overridable with YOUCAM_API_BASE; the default is the
 * documented API server host.
 *
 * Scores: the API returns HEALTH scores (ui_score / raw_score, higher =
 * healthier skin). GlowRoutine's agent works in CONCERN scores (higher =
 * worse), so normalizeResults() inverts: concern = 100 - ui_score.
 * `skin_age` arrives as its own output entry and is passed through.
 *
 * When YOUCAM_API_KEY is not set, the app runs in SAMPLE MODE:
 * analyzeWithSample() returns clearly-labeled sample Skin AI results
 * (src/sampleData.js) so the full product flow runs end-to-end with
 * no key. Nothing in sample mode is presented as a real analysis.
 */
const API_BASE = process.env.YOUCAM_API_BASE || 'https://yce-api-01.makeupar.com/s2s/v2.0';

function hasLiveKey() {
  return Boolean(process.env.YOUCAM_API_KEY);
}

async function call(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* non-JSON body */ }
  if (!res.ok) {
    const detail = (json && (json.error || json.error_code)) || text.slice(0, 200);
    throw new Error(`YouCam API ${path} -> HTTP ${res.status}: ${detail}`);
  }
  return json;
}

/** SD skin concerns GlowRoutine maps into its routine agent. */
const DEFAULT_ACTIONS = [
  'oiliness', 'moisture', 'wrinkle', 'age_spot', 'pore',
  'dark_circle_v2', 'acne', 'firmness', 'radiance', 'redness',
];

/** Upload a face photo (Buffer) and start a Skin AI analysis task. */
async function startSkinAnalysis(imageBuffer, actions) {
  const init = await call('/file/skin-analysis', {
    method: 'POST',
    body: JSON.stringify({
      files: [{
        content_type: 'image/jpeg',
        file_name: 'glowroutine-photo.jpg',
        file_size: imageBuffer.length,
      }],
    }),
  });
  const f = init && init.data && init.data.files && init.data.files[0];
  if (!f || !f.file_id) throw new Error('YouCam file init did not return a file_id');
  const req = (f.requests && f.requests[0]) || {};
  if (!req.url) throw new Error('YouCam file init did not return an upload URL');
  const putHeaders = { ...(req.headers || {}) };
  if (!putHeaders['Content-Type'] && !putHeaders['content-type']) {
    putHeaders['Content-Type'] = 'image/jpeg';
  }
  const put = await fetch(req.url, {
    method: req.method || 'PUT',
    headers: putHeaders,
    body: imageBuffer,
  });
  if (!put.ok) throw new Error(`YouCam image upload (PUT) -> HTTP ${put.status}`);
  await put.text();

  const task = await call('/task/skin-analysis', {
    method: 'POST',
    body: JSON.stringify({
      src_file_id: f.file_id,
      dst_actions: actions && actions.length ? actions : DEFAULT_ACTIONS,
      format: 'json',
    }),
  });
  const taskId = task && task.data && task.data.task_id;
  if (!taskId) throw new Error('YouCam task create did not return a task_id');
  return taskId;
}

/** Poll a Skin AI task until it finishes (or times out). */
async function getSkinAnalysis(taskId, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const out = await call(`/task/skin-analysis/${encodeURIComponent(taskId)}`);
    const data = (out && out.data) || {};
    const status = String(data.task_status || '').toLowerCase();
    if (status === 'success' || status === 'succeeded' || status === 'completed') {
      return normalizeResults(data);
    }
    if (status === 'error' || status === 'failed') {
      const detail = (data.error && (data.error.error || data.error.error_code)) || 'unknown error';
      throw new Error(`YouCam Skin AI task failed: ${detail}`);
    }
    if (Date.now() > deadline) throw new Error('YouCam Skin AI task timed out');
    await new Promise((r) => setTimeout(r, 3000));
  }
}

/** Map the API's per-action HEALTH scores to the app's 0-100 CONCERN scores. */
function normalizeResults(data) {
  const output = (data && data.results && data.results.output) || [];
  const byType = {};
  for (const e of output) {
    if (e && e.type && !byType[e.type]) byType[e.type] = e;
  }
  const health = (type) => {
    const e = byType[type];
    if (!e) return null;
    if (typeof e.ui_score === 'number') return e.ui_score;
    if (typeof e.score === 'number') return e.score;
    if (typeof e.raw_score === 'number') return Math.round(e.raw_score);
    return null;
  };
  const concern = (type) => {
    const h = health(type);
    return h === null ? null : Math.max(0, Math.min(100, 100 - Math.round(h)));
  };
  const age = byType.skin_age;
  return {
    source: 'youcam-live',
    label: 'YouCam Skin AI analysis (live API)',
    scores: {
      oiliness: concern('oiliness'),
      dryness: concern('moisture'),
      wrinkles: concern('wrinkle'),
      spots: concern('age_spot'),
      pores: concern('pore'),
      darkCircles: concern('dark_circle_v2') !== null ? concern('dark_circle_v2') : concern('dark_circle'),
      acne: concern('acne'),
      redness: concern('redness'),
      firmnessLoss: concern('firmness'),
      dullness: concern('radiance'),
    },
    skinAge: age && typeof age.score === 'number' ? Math.round(age.score) : null,
  };
}

module.exports = { hasLiveKey, startSkinAnalysis, getSkinAnalysis, API_BASE };
