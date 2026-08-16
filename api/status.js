const { getAccessToken } = require("../lib/meteoFrance");

const SOURCES = [
  { id: "meteofrance-radar", role: "observation", horizon: "now", configured: "METEO_FRANCE_APPLICATION_ID" },
  { id: "meteofrance-arome-pi", role: "nowcast-model", horizon: "0-6h", configured: "METEO_FRANCE_APPLICATION_ID" },
  { id: "meteofrance-arome", role: "high-res-model", horizon: "0-48h", configured: "METEO_FRANCE_APPLICATION_ID" },
  { id: "open-meteo", role: "model-aggregator", horizon: "multi-day", configured: null },
  { id: "rainviewer", role: "radar-fallback", horizon: "nowcast", configured: null }
];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://architechfr.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  let mfAuth = "not-configured";
  if (process.env.METEO_FRANCE_APPLICATION_ID) {
    try {
      await getAccessToken();
      mfAuth = "authenticated";
    } catch (_) {
      mfAuth = "error";
    }
  }

  return res.status(200).json({
    ok: true,
    engine: "OrageRadar Weather Engine",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    providers: SOURCES.map(source => ({
      id: source.id,
      role: source.role,
      horizon: source.horizon,
      status: source.configured ? mfAuth : "available"
    }))
  });
};
