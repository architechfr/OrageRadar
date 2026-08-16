const { getAccessToken, publicError } = require("../lib/meteoFrance");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://architechfr.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    await getAccessToken();
    return res.status(200).json({
      ok: true,
      service: "orageradar-weather-engine",
      meteofrance: "authenticated",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Meteo-France health check failed", error.code || error.message);
    const safe = publicError(error);
    return res.status(safe.status).json({ ok: false, error: safe.code, message: safe.message });
  }
};
