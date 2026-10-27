'use strict';
/**
 * YouCam (Perfect Corp) Skin AI API client — S2S REST integration.
 *
 * Follows the documented Perfect Corp server-to-server shape:
 *   1. POST {BASE}/file/skin-analyze        (binary image)        -> { id: file_id }
 *   2. POST {BASE}/task/skin-analyze        ({ src_file_id, dst_actions, format })
 *                                                                 -> { task_id }
 *   3. GET  {BASE}/task/skin-analyze?task_id=...  (poll)          -> { status, results }
 * Auth: header  Authorization: Bearer <YOUCAM_API_KEY>
 * Base URL is overridable with YOUCAM_API_BASE because Perfect Corp
 * versions the host; the default below is the documented YCE host.
 *
 * When YOUCAM_API_KEY is not set, the app runs in SAMPLE MODE:
 * analyzeWithSample() returns clearly-labeled sample Skin AI results
 * (src/sampleData.js) so the full product flow runs end-to-end with
 * no key. Nothing in sample mode is presented as a real analysis.
 */
const API_BASE = process.env.YOUCAM_API_BASE || 'https://yce-api-01.perfectcorp.com/s2s/v1.0';

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
  if (!res.ok) throw new Error(`YouCam API ${path} -> HTTP ${res.status}`);
  return res.json();
}

/** Upload a face photo (Buffer) and start a Skin AI analysis task. */
async function startSkinAnalysis(imageBuffer, actions) {
  const file = await call('/file/skin-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: imageBuffer,
  });
  const fileId = file && file.id;
  if (!fileId) throw new Error('YouCam upload did not return a file id');
  const task = await call('/task/skin-analyze', {
    method: 'POST',
    body: JSON.stringify({
      src_file_id: fileId,
      dst_actions: actions && actions.length ? actions : [
        'skin_age', 'skin_oiliness', 'skin_moisture', 'wrinkle', 'pore',
        'spot', 'dark_circle', 'acne', 'firmness', 'radiance', 'redness',
      ],
      format: 'json',
    }),
  });
  return task.task_id || task.id;
}

/** Poll a Skin AI task until it finishes (or times out). */
async function getSkinAnalysis(taskId, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const out = await call(`/task/skin-analyze?task_id=${encodeURIComponent(taskId)}`);
    const status = String((out && out.status) || '').toLowerCase();
    if (status === 'success' || status === 'succeeded' || status === 'completed') {
      return normalizeResults(out);
    }
    if (status === 'error' || status === 'failed') {
      throw new Error('YouCam Skin AI task failed');
    }
    if (Date.now() > deadline) throw new Error('YouCam Skin AI task timed out');
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/** Map the API's per-action scores to the app's 0-100 concern scores. */
function normalizeResults(raw) {
  const results = (raw && (raw.results || raw.data)) || {};
  const pick = (...keys) => {
    for (const k of keys) {
      const v = results[k];
      const n = typeof v === 'object' && v !== null ? v.score : v;
      if (typeof n === 'number') return Math.round(n);
    }
    return null;
  };
  return {
    source: 'youcam-live',
    label: 'YouCam Skin AI analysis (live API)',
    scores: {
      oiliness: pick('skin_oiliness', 'oiliness'),
      dryness: invert(pick('skin_moisture', 'moisture')),
      wrinkles: pick('wrinkle', 'wrinkles'),
      spots: pick('spot', 'spots', 'pigmentation'),
      pores: pick('pore', 'pores'),
      darkCircles: pick('dark_circle', 'dark_circles'),
      acne: pick('acne'),
      redness: pick('redness', 'sensitivity'),
      firmnessLoss: invert(pick('firmness')),
      dullness: invert(pick('radiance')),
    },
    skinAge: pick('skin_age') || null,
  };
}

function invert(n) { return typeof n === 'number' ? Math.max(0, 100 - n) : null; }

module.exports = { hasLiveKey, startSkinAnalysis, getSkinAnalysis, API_BASE };
