'use strict';
/** GlowRoutine server — zero-dependency Node http. Serves the SPA and:
 *  GET  /api/status          -> { mode: 'live'|'sample', apiBase }
 *  GET  /api/profiles        -> sample profiles (demo mode)
 *  POST /api/analyze         -> { profileId } sample analysis, OR
 *                               { imageBase64 } live YouCam analysis (needs key)
 *  POST /api/routine         -> { analysis, intake } -> agent routine + list
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const youcam = require('./src/youcam');
const { PROFILES } = require('./src/sampleData');
const { buildRoutine } = require('./src/agent');

const PUB = path.join(__dirname, 'public');
const PORT = process.env.PORT || 4173;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function send(res, code, body, type = 'application/json') {
  const data = type === 'application/json' ? JSON.stringify(body) : body;
  res.writeHead(code, { 'Content-Type': type });
  res.end(data);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 12 * 1024 * 1024) reject(new Error('body too large')); chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/status') {
      return send(res, 200, { mode: youcam.hasLiveKey() ? 'live' : 'sample', apiBase: youcam.API_BASE });
    }
    if (url.pathname === '/api/profiles') {
      return send(res, 200, Object.values(PROFILES).map((p) => ({ id: p.id, name: p.name, blurb: p.blurb })));
    }
    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      const body = await readBody(req);
      if (body.imageBase64) {
        if (!youcam.hasLiveKey()) return send(res, 400, { error: 'No YOUCAM_API_KEY configured. Use a sample profile, or set the key (see README) to run a live YouCam Skin AI analysis.' });
        const buf = Buffer.from(body.imageBase64, 'base64');
        const taskId = await youcam.startSkinAnalysis(buf, body.actions);
        const analysis = await youcam.getSkinAnalysis(taskId);
        return send(res, 200, { analysis });
      }
      const profile = PROFILES[body.profileId] || PROFILES.maya;
      return send(res, 200, { analysis: profile });
    }
    if (url.pathname === '/api/routine' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.analysis || !body.analysis.scores) return send(res, 400, { error: 'analysis with scores is required' });
      const routine = buildRoutine({ analysis: body.analysis, intake: body.intake || {} });
      return send(res, 200, { routine });
    }
    // static
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.join(PUB, path.normalize(rel));
    if (!file.startsWith(PUB) || !fs.existsSync(file)) return send(res, 404, 'not found', 'text/plain');
    return send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
  } catch (e) {
    return send(res, 500, { error: String(e && e.message || e) });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`GlowRoutine on http://localhost:${PORT} (mode: ${youcam.hasLiveKey() ? 'live YouCam' : 'sample data'})`));
}
module.exports = { server };
