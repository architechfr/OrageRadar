// =============================================================================
//  Moteur de consensus déterministe — partagé entre la page principale et la
//  page Intelligence, pour que les deux ne donnent jamais deux réponses
//  différentes à la même question.
//
//  Sources, pondérations et formule d'accord sont alignées sur
//  assets/intelligence-v3.js (partie déterministe). Intelligence y ajoute les
//  ensembles probabilistes et publie un score de confiance global : la page
//  principale n'affiche donc PAS de score concurrent, seulement l'accord des
//  modèles, et renvoie vers Intelligence pour l'analyse complète.
//
//  ⚠ Une requête par source (et non un appel multi-modèles) : hors de son
//  domaine, AROME fait renvoyer « "latitude":nan » par Open-Meteo, ce qui
//  n'est pas du JSON valide. Isolé dans sa propre requête, l'échec ne touche
//  que cette source.
// =============================================================================

(function (global) {
  "use strict";

  var API = "https://api.open-meteo.com/v1/forecast";
  var HOURLY = "precipitation,cape,wind_gusts_10m,weather_code";

  // Poids = confiance accordée au modèle (AROME est le plus fin sur la France)
  var SOURCES = [
    { id: "arome", name: "AROME",      detail: "Météo-France · France HD", weight: 1.35, model: "meteofrance_arome_france" },
    { id: "ecmwf", name: "ECMWF IFS",  detail: "ECMWF · global",           weight: 1.30, model: "ecmwf_ifs025" },
    { id: "icon",  name: "ICON EU",    detail: "DWD · Europe",             weight: 1.15, model: "icon_eu" },
    { id: "best",  name: "Best Match", detail: "Open-Meteo · local",       weight: 1.10, model: null },
    { id: "ukmo",  name: "UKMO",       detail: "Met Office · global",      weight: 1.05, model: "ukmo_seamless" },
    { id: "gfs",   name: "GFS",        detail: "NOAA · global",            weight: 1.00, model: "gfs_seamless" },
    { id: "gem",   name: "GEM",        detail: "Canada · global",          weight: 0.90, model: "gem_seamless" },
    { id: "jma",   name: "JMA",        detail: "Japon · global",           weight: 0.85, model: "jma_seamless" }
  ];

  function clamp(v, a, b) {
    if (a === undefined) a = 0;
    if (b === undefined) b = 100;
    return Math.max(a, Math.min(b, v));
  }

  // Open-Meteo suffixe les clés quand « models= » est présent, pas sinon.
  function series(data, key) {
    var H = data.hourly || {};
    if (Array.isArray(H[key])) return H[key];
    var found = Object.keys(H).find(function (k) { return k === key || k.indexOf(key + "_") === 0; });
    return found ? H[found] : null;
  }

  function weightedRatio(rows, test) {
    var yes = 0, total = 0;
    rows.forEach(function (r) {
      var w = r.weight || 1;
      total += w;
      if (test(r)) yes += w;
    });
    return total ? (yes / total) * 100 : 0;
  }

  async function fetchSource(source, lat, lon) {
    var url = API + "?latitude=" + lat + "&longitude=" + lon
            + "&hourly=" + HOURLY
            + (source.model ? "&models=" + source.model : "")
            + "&forecast_days=2&timezone=auto";
    var response = await fetch(url);
    if (!response.ok) throw new Error("HTTP " + response.status);
    var data = JSON.parse(await response.text());
    var H = data.hourly;
    if (!H || !H.time) throw new Error("Pas de données horaires");

    var start = H.time.findIndex(function (t) { return new Date(t) >= new Date(); });
    if (start < 0) start = 0;

    var precip = series(data, "precipitation");
    if (!precip) throw new Error("Pas de précipitations");
    var window6 = precip.slice(start, start + 6).filter(Number.isFinite);
    if (!window6.length) throw new Error("Hors domaine du modèle");

    var cape = series(data, "cape"), gust = series(data, "wind_gusts_10m"), codes = series(data, "weather_code");
    var cape6 = cape ? cape.slice(start, start + 6).filter(Number.isFinite) : [];
    var gust6 = gust ? gust.slice(start, start + 6).filter(Number.isFinite) : [];
    var code6 = codes ? codes.slice(start, start + 6).filter(Number.isFinite) : [];

    return {
      id: source.id, name: source.name, detail: source.detail, weight: source.weight,
      mm: window6.reduce(function (a, b) { return a + b; }, 0),
      cape: cape6.length ? Math.max.apply(null, cape6) : null,
      gust: gust6.length ? Math.max.apply(null, gust6) : null,
      stormCode: code6.some(function (c) { return c >= 95; })
    };
  }

  // Renvoie null si moins de 3 sources répondent : un « consensus » à deux
  // voix ne mérite pas ce nom.
  async function load(lat, lon) {
    var settled = await Promise.allSettled(SOURCES.map(function (s) { return fetchSource(s, lat, lon); }));
    var rows = settled.filter(function (r) { return r.status === "fulfilled"; })
                      .map(function (r) { return r.value; });
    if (rows.length < 3) return null;

    var wetRatio = weightedRatio(rows, function (r) { return r.mm >= 0.5; });
    var stormRatio = weightedRatio(rows, function (r) { return r.stormCode || (r.cape || 0) >= 1000; });

    var weights = rows.reduce(function (a, r) { return a + (r.weight || 1); }, 0);
    var mmMean = rows.reduce(function (a, r) { return a + r.mm * (r.weight || 1); }, 0) / weights;
    var variance = rows.reduce(function (a, r) { return a + Math.pow(r.mm - mmMean, 2) * (r.weight || 1); }, 0) / weights;
    var spread = Math.sqrt(variance);

    // Même formule qu'Intelligence : la dispersion des cumuls pénalise
    // l'accord, et un partage franc du panel le pénalise davantage.
    var agreement = clamp(100 - spread * 13 - (wetRatio > 15 && wetRatio < 85 ? 10 : 0));
    var coverage = clamp((rows.length / SOURCES.length) * 100);

    return {
      rows: rows.sort(function (a, b) { return b.mm - a.mm; }),
      count: rows.length,
      total: SOURCES.length,
      wetRatio: wetRatio,
      stormRatio: stormRatio,
      mmMean: mmMean,
      spread: spread,
      agreement: agreement,
      coverage: coverage
    };
  }

  global.Consensus = { SOURCES: SOURCES, load: load, clamp: clamp };
})(window);
