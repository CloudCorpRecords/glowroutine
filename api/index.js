'use strict';
/** Vercel serverless entry: hand every request to the GlowRoutine
 * Node http server (server.js serves both the API and the SPA). */
const { server } = require('../server');

module.exports = (req, res) => {
  server.emit('request', req, res);
};
