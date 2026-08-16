const { meteoFranceFetch, publicError } = require("../lib/meteoFrance");

// API Ciblee Donnees Radar — catalogue officiel des mosaïques.
// La documentation Météo-France expose ce catalogue via DPRadar/v1/mosaiques.
// Cette route ne renvoie encore que les métadonnées JSON ; le produit HDF5
// (ex. LAME_D_EAU maille 500 m) sera proxifié par une route binaire dédiée.
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://architechfr.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, s-maxage=240, stale-while-revalidate=60");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  try {
    const upstream = await meteoFranceFetch("/public/DPRadar/v1/mosaiques");
    const body = await upstream.text();

    if (!upstream.ok) {
      console.error("Meteo-France radar upstream error", upstream.status, body.slice(0, 300));
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        ok: false,
        error: "METEO_FRANCE_RADAR_UPSTREAM",
        upstreamStatus: upstream.status
      });
    }

    let data;
    try { data = JSON.parse(body); }
    catch (_) {
      return res.status(502).json({ ok: false, error: "METEO_FRANCE_RADAR_INVALID_JSON" });
    }

    return res.status(200).json({
      ok: true,
      source: "Meteo-France",
      product: "radar-mosaics-catalog",
      fetchedAt: new Date().toISOString(),
      data
    });
  } catch (error) {
    console.error("Meteo-France radar request failed", error.code || error.message);
    const safe = publicError(error);
    return res.status(safe.status).json({ ok: false, error: safe.code, message: safe.message });
  }
};
