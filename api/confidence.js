const { probabilityConsensus } = require("../lib/confidence");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://architechfr.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const result = probabilityConsensus(body);
    return res.status(200).json({ ok: true, engine: "confidence-v0.1", ...result });
  } catch (_) {
    return res.status(400).json({ ok: false, error: "INVALID_INPUT" });
  }
};
