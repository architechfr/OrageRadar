// Feux actifs détectés par satellite (NASA FIRMS).
// La clé reste côté serveur : le frontend GitHub Pages ne doit jamais la voir.
// Variable d'environnement Vercel attendue : FIRMS_MAP_KEY

const FIRMS_HOST = "https://firms.modaps.eosdis.nasa.gov";

// VIIRS 375 m : la meilleure résolution disponible gratuitement.
// Deux satellites pour doubler les chances de passage récent.
const SOURCES = ["VIIRS_NOAA20_NRT", "VIIRS_SNPP_NRT"];

function toRadians(deg) { return (deg * Math.PI) / 180; }

// Distance à vol d'oiseau en km
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); });
    return row;
  });
}

// « 2026-08-17 » + « 1345 » -> ISO
function acquisitionDate(row) {
  const raw = String(row.acq_time || "").padStart(4, "0");
  const iso = `${row.acq_date}T${raw.slice(0, 2)}:${raw.slice(2, 4)}:00Z`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://architechfr.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });

  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).json({ ok: false, error: "FIRMS_KEY_MISSING" });
  }

  const days = Math.min(3, Math.max(1, Number(req.query.days) || 1));

  // Mode « bbox » : survol d'une région entière (ex. la France) plutôt que
  // d'un point avec rayon — utilisé par la carte France, sans chantier précis.
  const bboxParam = req.query.bbox;
  let mode, area, lat = null, lon = null, radiusKm = null;

  if (bboxParam) {
    const parts = String(bboxParam).split(",").map(Number);
    const [west, south, east, north] = parts;
    const valid = parts.length === 4 && parts.every(Number.isFinite)
      && west < east && south < north && (east - west) <= 20 && (north - south) <= 20;
    if (!valid) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(400).json({ ok: false, error: "INVALID_BBOX" });
    }
    mode = "bbox";
    area = parts.map(v => v.toFixed(4)).join(",");
  } else {
    lat = Number(req.query.lat);
    lon = Number(req.query.lon);
    radiusKm = Math.min(300, Math.max(10, Number(req.query.radius) || 100));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(400).json({ ok: false, error: "INVALID_COORDINATES" });
    }
    mode = "point";
    // Emprise géographique : 1° de latitude ≈ 111 km ; la longitude se
    // resserre vers les pôles, d'où la division par le cosinus de la latitude.
    const dLat = radiusKm / 111;
    const dLon = radiusKm / (111 * Math.max(0.2, Math.cos(toRadians(lat))));
    area = [lon - dLon, lat - dLat, lon + dLon, lat + dLat]
      .map(v => v.toFixed(4)).join(",");
  }

  try {
    const results = await Promise.allSettled(SOURCES.map(async source => {
      const url = `${FIRMS_HOST}/api/area/csv/${key}/${source}/${area}/${days}`;
      const response = await fetch(url);
      const text = await response.text();
      // FIRMS répond parfois en 200 avec un message d'erreur en texte brut
      if (!response.ok || /Invalid|error/i.test(text.slice(0, 40))) {
        throw new Error("FIRMS_" + response.status);
      }
      return parseCsv(text).map(row => ({ ...row, source }));
    }));

    const rows = results.filter(r => r.status === "fulfilled").flatMap(r => r.value);
    if (!rows.length && results.every(r => r.status === "rejected")) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(502).json({ ok: false, error: "FIRMS_UNAVAILABLE" });
    }

    const fires = rows
      .map(row => {
        const flat = Number(row.latitude), flon = Number(row.longitude);
        if (!Number.isFinite(flat) || !Number.isFinite(flon)) return null;
        return {
          lat: flat,
          lon: flon,
          distanceKm: mode === "point" ? Math.round(haversine(lat, lon, flat, flon) * 10) / 10 : null,
          detectedAt: acquisitionDate(row),
          confidence: row.confidence || null,   // VIIRS : l / n / h
          power: Number(row.frp) || null,       // puissance radiative (MW)
          dayNight: row.daynight || null,
          source: row.source
        };
      })
      .filter(f => f && (mode === "point" ? f.distanceKm <= radiusKm : true));

    // Les deux satellites survolent la même zone : un incendie unique est
    // détecté deux fois. Sans regroupement, le comptage serait doublé.
    // ~0,005° ≈ 500 m, l'ordre de grandeur d'un pixel VIIRS (375 m).
    const groups = new Map();
    for (const fire of fires) {
      const cell = `${fire.lat.toFixed(2)},${fire.lon.toFixed(2)}`;
      const kept = groups.get(cell);
      if (!kept || (fire.power || 0) > (kept.power || 0)) {
        groups.set(cell, kept ? { ...fire, distanceKm: Math.min(fire.distanceKm ?? Infinity, kept.distanceKm ?? Infinity) } : fire);
      }
    }
    // En mode point, les plus proches d'abord ; en mode bbox (pas de centre),
    // les plus intenses d'abord — plus utile pour une vue France entière.
    const sorter = mode === "point"
      ? (a, b) => a.distanceKm - b.distanceKm
      : (a, b) => (b.power || 0) - (a.power || 0);
    const cap = mode === "point" ? 50 : 300;
    const all = [...groups.values()].sort(sorter);
    const deduped = all.slice(0, cap);

    // Les détections FIRMS se rafraîchissent toutes les quelques heures :
    // un cache CDN de 10 min évite de solliciter le quota inutilement.
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=600");
    return res.status(200).json({
      ok: true,
      mode,
      count: deduped.length,
      truncated: all.length > deduped.length,
      nearestKm: mode === "point" && deduped.length ? deduped[0].distanceKm : null,
      radiusKm,
      bbox: mode === "bbox" ? area : null,
      days,
      fires: deduped
    });
  } catch (error) {
    console.error("FIRMS request failed", error.message);
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ ok: false, error: "FIRMS_UNAVAILABLE" });
  }
};
