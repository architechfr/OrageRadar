const DET_SOURCES = [
  { id: 'arome', name: 'AROME', detail: 'Météo-France · France HD', weight: 1.35, url: (a, b) => `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&hourly=precipitation,cape,wind_gusts_10m,weather_code&models=meteofrance_arome_france&forecast_days=2&timezone=auto` },
  { id: 'ecmwf', name: 'ECMWF IFS', detail: 'ECMWF · global', weight: 1.30, url: (a, b) => `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&hourly=precipitation,cape,wind_gusts_10m,weather_code&models=ecmwf_ifs025&forecast_days=2&timezone=auto` },
  { id: 'icon', name: 'ICON EU', detail: 'DWD · Europe', weight: 1.15, url: (a, b) => `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&hourly=precipitation,cape,wind_gusts_10m,weather_code&models=icon_eu&forecast_days=2&timezone=auto` },
  { id: 'gfs', name: 'GFS', detail: 'NOAA · global', weight: 1.00, url: (a, b) => `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&hourly=precipitation,cape,wind_gusts_10m,weather_code&models=gfs_seamless&forecast_days=2&timezone=auto` },
  { id: 'ukmo', name: 'UKMO', detail: 'Met Office · global', weight: 1.05, url: (a, b) => `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&hourly=precipitation,weather_code,wind_gusts_10m&models=ukmo_seamless&forecast_days=2&timezone=auto` },
  { id: 'gem', name: 'GEM', detail: 'Canada · global', weight: 0.90, url: (a, b) => `https://api.open-meteo.com/v1/gem?latitude=${a}&longitude=${b}&hourly=precipitation,weather_code,wind_gusts_10m&forecast_days=2&timezone=auto` },
  { id: 'jma', name: 'JMA', detail: 'Japon · global', weight: 0.85, url: (a, b) => `https://api.open-meteo.com/v1/jma?latitude=${a}&longitude=${b}&hourly=precipitation,weather_code&forecast_days=2&timezone=auto` },
  { id: 'best', name: 'Best Match', detail: 'Open-Meteo · sélection locale', weight: 1.10, url: (a, b) => `https://api.open-meteo.com/v1/forecast?latitude=${a}&longitude=${b}&hourly=precipitation,cape,wind_gusts_10m,weather_code&forecast_days=2&timezone=auto` }
];

const ENS_SOURCES = [
  { id: 'icon-eps', name: 'ICON EPS', detail: '40 membres · DWD', members: 40, model: 'dwd_icon_eps_ensemble_mean_seamless' },
  { id: 'gefs', name: 'GEFS', detail: '31 membres · NOAA', members: 31, model: 'gfs_seamless_ensemble_mean' },
  { id: 'ifs-eps', name: 'ECMWF EPS', detail: '51 membres · ECMWF', members: 51, model: 'ecmwf_ifs025_ensemble_mean' },
  { id: 'aifs-eps', name: 'AIFS Ensemble', detail: '51 membres · ECMWF IA', members: 51, model: 'ecmwf_aifs025_ensemble_mean' },
  { id: 'mogreps', name: 'MOGREPS-G', detail: '18 membres · UKMO', members: 18, model: 'ukmo_global_ensemble_mean_20km' },
  { id: 'gem-eps', name: 'GEM Ensemble', detail: '21 membres · Canada', members: 21, model: 'gem_global_ensemble_mean' },
  { id: 'weathernext', name: 'WeatherNext 2', detail: '64 membres · Google IA', members: 64, model: 'google_weathernext2_ensemble_mean' }
];

let selected = { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 };
const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

const wx = {
  0: ['☀️', 'Dégagé'], 1: ['🌤️', 'Peu nuageux'], 2: ['⛅', 'Partiellement nuageux'], 3: ['☁️', 'Couvert'],
  45: ['🌫️', 'Brouillard'], 48: ['🌫️', 'Brouillard givrant'], 51: ['🌦️', 'Bruine'], 53: ['🌦️', 'Bruine'], 55: ['🌧️', 'Bruine dense'],
  61: ['🌧️', 'Pluie faible'], 63: ['🌧️', 'Pluie modérée'], 65: ['🌧️', 'Forte pluie'], 71: ['🌨️', 'Neige faible'], 73: ['🌨️', 'Neige'],
  75: ['❄️', 'Forte neige'], 80: ['🌦️', 'Averses'], 81: ['🌧️', 'Averses'], 82: ['🌧️', 'Fortes averses'], 95: ['⛈️', 'Orage'],
  96: ['⛈️', 'Orage avec grêle'], 99: ['⛈️', 'Orage violent']
};

function weatherInfo(code) { return wx[code] || ['🌤️', 'Variable']; }
function setBar(id, v) { $(id + '-v').textContent = Math.round(v) + '%'; $(id + '-b').style.width = clamp(v) + '%'; }
function debounce(fn, d = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), d); }; }
function series(d, key) { const H = d.hourly || {}; if (Array.isArray(H[key])) return H[key]; const k = Object.keys(H).find(x => x === key || x.startsWith(key + '_')); return k ? H[k] : null; }
function indexNow(H) { let s = H.time.findIndex(t => new Date(t) >= new Date()); return s < 0 ? 0 : s; }
function formatTime(d) { return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
function normalizePlace(v) { return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

async function geocode(query, count = 7) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=${count}&language=fr&format=json`);
  if (!r.ok) throw new Error('Recherche de ville indisponible.');
  const d = await r.json();
  return d.results || [];
}

function selectPlace(p) {
  selected = { name: p.name, country: p.country || '', lat: p.latitude, lon: p.longitude };
  $('city-input').value = p.name;
  $('suggestions').classList.add('hidden');
}

async function resolveInputLocation() {
  const q = $('city-input').value.trim();
  if (!q) throw new Error('Saisissez une ville ou une commune.');
  if (normalizePlace(q) === normalizePlace(selected.name)) return selected;

  const results = await geocode(q, 10);
  if (!results.length) throw new Error(`Lieu introuvable : ${q}`);

  const nq = normalizePlace(q);
  const exact = results.find(p => normalizePlace(p.name) === nq);
  const french = results.find(p => p.country === 'France');
  const match = exact || french || results[0];
  selectPlace(match);
  return selected;
}

async function suggestions() {
  const q = $('city-input').value.trim();
  if (q.length < 2) { $('suggestions').classList.add('hidden'); return; }
  try {
    const results = await geocode(q, 7);
    const box = $('suggestions');
    box.innerHTML = '';
    results.forEach(p => {
      const b = document.createElement('button');
      b.className = 'w-full text-left px-4 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0';
      b.textContent = p.name + (p.admin1 ? ' · ' + p.admin1 : '') + ' — ' + (p.country || '');
      b.onclick = () => { selectPlace(p); analyze(); };
      box.appendChild(b);
    });
    box.classList.toggle('hidden', !results.length);
  } catch (_) {}
}

async function runAnalysisFromInput() {
  $('suggestions').classList.add('hidden');
  $('error').classList.add('hidden');
  $('dashboard').classList.add('hidden');
  $('loading').classList.remove('hidden');
  try {
    await resolveInputLocation();
    await analyze(true);
  } catch (e) {
    $('error').textContent = 'Analyse impossible : ' + e.message;
    $('error').classList.remove('hidden');
    $('loading').classList.add('hidden');
  }
}

$('city-input').addEventListener('input', debounce(suggestions));
$('city-input').addEventListener('keydown', e => { if (e.key === 'Enter') runAnalysisFromInput(); });
$('analyze').addEventListener('click', runAnalysisFromInput);

async function getCurrent() {
  const u = `https://api.open-meteo.com/v1/forecast?latitude=${selected.lat}&longitude=${selected.lon}&current=temperature_2m,apparent_temperature,weather_code,cloud_cover,wind_gusts_10m&timezone=auto`;
  return (await fetch(u)).json();
}

async function getDet(source) {
  const r = await fetch(source.url(selected.lat, selected.lon));
  const text = await r.text();
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = JSON.parse(text), H = d.hourly;
  if (!H?.time) throw new Error('No hourly');
  const s = indexNow(H), p = series(d, 'precipitation'), cape = series(d, 'cape'), gust = series(d, 'wind_gusts_10m'), codes = series(d, 'weather_code');
  if (!p) throw new Error('No precip');
  const p6 = p.slice(s, s + 6).filter(Number.isFinite);
  if (!p6.length) throw new Error('Outside domain');
  const c6 = cape ? cape.slice(s, s + 6).filter(Number.isFinite) : [];
  const g6 = gust ? gust.slice(s, s + 6).filter(Number.isFinite) : [];
  const w6 = codes ? codes.slice(s, s + 6).filter(Number.isFinite) : [];
  return { ...source, mm: p6.reduce((a, b) => a + b, 0), cape: c6.length ? Math.max(...c6) : null, gust: g6.length ? Math.max(...g6) : null, code: w6[0] ?? 0, stormCode: w6.some(c => c >= 95) };
}

async function getEns(source) {
  const u = `https://ensemble-api.open-meteo.com/v1/ensemble?latitude=${selected.lat}&longitude=${selected.lon}&hourly=precipitation,precipitation_spread,wind_gusts_10m,wind_gusts_10m_spread&models=${source.model}&forecast_days=2&timezone=auto`;
  const r = await fetch(u);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json(), H = d.hourly;
  if (!H?.time) throw new Error('No hourly');
  const s = indexNow(H), p = series(d, 'precipitation'), ps = series(d, 'precipitation_spread'), g = series(d, 'wind_gusts_10m'), gs = series(d, 'wind_gusts_10m_spread');
  if (!p) throw new Error('No precip');
  const p6 = p.slice(s, s + 6).filter(Number.isFinite), ps6 = ps ? ps.slice(s, s + 6).filter(Number.isFinite) : [], g6 = g ? g.slice(s, s + 6).filter(Number.isFinite) : [], gs6 = gs ? gs.slice(s, s + 6).filter(Number.isFinite) : [];
  if (!p6.length) throw new Error('Outside domain');
  const mean = p6.reduce((a, b) => a + b, 0);
  const spread = ps6.length ? Math.sqrt(ps6.reduce((a, b) => a + b * b, 0) / ps6.length) : 0;
  return { ...source, mm: mean, spread, gust: g6.length ? Math.max(...g6) : null, gustSpread: gs6.length ? Math.max(...gs6) : null };
}

async function analyze(loadingAlreadyShown = false) {
  $('suggestions').classList.add('hidden');
  $('error').classList.add('hidden');
  $('dashboard').classList.add('hidden');
  if (!loadingAlreadyShown) $('loading').classList.remove('hidden');
  try {
    const [current, detSet, ensSet] = await Promise.all([
      getCurrent(),
      Promise.allSettled(DET_SOURCES.map(getDet)),
      Promise.allSettled(ENS_SOURCES.map(getEns))
    ]);
    const det = detSet.filter(x => x.status === 'fulfilled').map(x => x.value);
    const ens = ensSet.filter(x => x.status === 'fulfilled').map(x => x.value);
    if (det.length < 3) throw new Error('Pas assez de modèles déterministes disponibles.');
    render(current, det, ens);
    await loadRadar();
  } catch (e) {
    $('error').textContent = 'Analyse impossible : ' + e.message;
    $('error').classList.remove('hidden');
  } finally {
    $('loading').classList.add('hidden');
  }
}

function weightedRatio(rows, test) {
  let yes = 0, total = 0;
  rows.forEach(r => { const w = r.weight || 1; total += w; if (test(r)) yes += w; });
  return total ? yes / total * 100 : 0;
}

function dispersionLabel(v) {
  if (v < 0.20) return 'faible';
  if (v < 0.60) return 'modérée';
  return 'forte';
}

function confidenceText(v) {
  if (v >= 85) return 'très élevée';
  if (v >= 72) return 'élevée';
  if (v >= 58) return 'correcte';
  return 'faible';
}

function renderQuickRead({ rainProb, stormProb, confidence, start, end }) {
  const conf = confidenceText(confidence);
  let title, weather, action;
  if (stormProb >= 60) {
    title = `Risque orageux significatif à ${selected.name}`;
    weather = `Orage possible (${Math.round(stormProb)}%), avec un signal pluie de ${Math.round(rainProb)}%.`;
    action = 'Surveillez le radar et les prochaines mises à jour, surtout à l’approche des cellules.';
  } else if (rainProb >= 65) {
    title = `Pluie probable à ${selected.name}`;
    weather = `Le consensus estime la pluie probable à ${Math.round(rainProb)}% sur l’horizon analysé.`;
    action = 'Prévoir une évolution humide ; le radar précise le timing à très court terme.';
  } else if (rainProb <= 25 && stormProb <= 25) {
    title = `Temps majoritairement sec à ${selected.name}`;
    weather = `Peu de signal pluie (${Math.round(rainProb)}%) et peu de signal orage (${Math.round(stormProb)}%).`;
    action = 'Pas de phénomène marqué détecté pour l’instant sur les 6 prochaines heures.';
  } else {
    title = `Prévision encore partagée à ${selected.name}`;
    weather = `Pluie ${Math.round(rainProb)}% · orage ${Math.round(stormProb)}% : les scénarios ne convergent pas complètement.`;
    action = 'La situation mérite une nouvelle lecture plus tard ; le radar devient prioritaire à court terme.';
  }

  $('quick-title').textContent = title;
  $('analysis-window').textContent = `Analyse ${formatTime(start)} → ${formatTime(end)} · horizon 6 h · ${selected.name}${selected.country ? ', ' + selected.country : ''}`;
  $('quick-weather').textContent = weather;
  $('quick-when').textContent = `De maintenant (${formatTime(start)}) jusqu’à environ ${formatTime(end)}.`;
  $('quick-action').textContent = action;
  $('quick-confidence').textContent = `Fiabilité ${Math.round(confidence)}% · ${conf}`;
  $('place-horizon').textContent = `Horizon analysé : maintenant → ${formatTime(end)} (+6 h)`;
}

function render(currentData, det, ens) {
  const cur = currentData.current || {};
  const [icon, desc] = weatherInfo(cur.weather_code);
  const start = new Date();
  const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);

  $('place').textContent = selected.name + (selected.country ? ' — ' + selected.country : '');
  $('weather-icon').textContent = icon;
  $('condition').textContent = desc;
  $('temp-pill').textContent = '🌡️ ' + Math.round(cur.temperature_2m ?? 0) + '°C · ressenti ' + Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 0) + '°';
  $('cloud-pill').textContent = '☁️ ' + Math.round(cur.cloud_cover ?? 0) + '% nuages';
  $('gust-pill').textContent = '💨 ' + Math.round(cur.wind_gusts_10m ?? 0) + ' km/h';

  const wetRatio = weightedRatio(det, r => r.mm >= 0.5);
  const stormRatio = weightedRatio(det, r => r.stormCode || (r.cape ?? 0) >= 1000);
  const weights = det.reduce((a, r) => a + (r.weight || 1), 0);
  const mmMean = det.reduce((a, r) => a + r.mm * (r.weight || 1), 0) / weights;
  const variance = det.reduce((a, r) => a + Math.pow(r.mm - mmMean, 2) * (r.weight || 1), 0) / weights;
  const spread = Math.sqrt(variance);
  const agreement = clamp(100 - spread * 13 - (wetRatio > 15 && wetRatio < 85 ? 10 : 0));
  const capes = det.map(r => r.cape).filter(Number.isFinite);
  const maxCape = capes.length ? Math.max(...capes) : 0;
  const instability = clamp(stormRatio * 0.55 + clamp(maxCape / 20) * 0.45);
  const detCoverage = clamp(det.length / DET_SOURCES.length * 100);
  const ensCoverage = clamp(ens.length / ENS_SOURCES.length * 100);
  const ensWet = ens.length ? ens.filter(e => e.mm >= 0.5).length / ens.length * 100 : 50;
  const ensSpread = ens.length ? ens.reduce((a, e) => a + e.spread, 0) / ens.length : 20;
  const ensembleConfidence = clamp(100 - ensSpread * 14);
  const coverage = detCoverage * 0.55 + ensCoverage * 0.45;
  const precipSignal = clamp(wetRatio * 0.48 + ensWet * 0.37 + clamp(mmMean * 10) * 0.15);
  const confidence = clamp(agreement * 0.34 + ensembleConfidence * 0.25 + coverage * 0.22 + Math.max(wetRatio, 100 - wetRatio) * 0.19);
  const rainProb = clamp(wetRatio * 0.45 + ensWet * 0.40 + Math.min(15, mmMean * 5));
  const stormProb = clamp(stormRatio * 0.68 + instability * 0.32 * (rainProb > 35 ? 1 : 0.5));

  $('rain-prob').textContent = Math.round(rainProb) + '%';
  $('storm-prob').textContent = Math.round(stormProb) + '%';
  $('confidence').textContent = Math.round(confidence) + '%';
  $('confidence-ring').style.setProperty('--p', Math.round(confidence) + '%');
  $('confidence-label').textContent = confidence >= 85 ? 'Confiance très élevée' : confidence >= 72 ? 'Confiance élevée' : confidence >= 58 ? 'Confiance correcte' : 'Prévision incertaine';
  $('source-count').textContent = `${det.length} modèles + ${ens.length} ensembles · ${ens.reduce((a, e) => a + e.members, 0)} membres d’ensemble`;

  setBar('agreement', agreement);
  setBar('precip', precipSignal);
  setBar('instability', instability);
  setBar('coverage', coverage);
  setBar('ensemble', ensembleConfidence);

  renderQuickRead({ rainProb, stormProb, confidence, start, end });

  $('verdict').textContent = stormProb >= 60
    ? `⛈️ D’ici ${formatTime(end)}, OrageRadar détecte un scénario convectif sérieux. Le radar doit confirmer le timing précis.`
    : rainProb >= 65
      ? `🌧️ D’ici ${formatTime(end)}, le scénario humide domine. Les ensembles renforcent le signal de pluie.`
      : rainProb <= 25
        ? `☀️ Jusqu’à environ ${formatTime(end)}, modèles et ensembles restent majoritairement secs.`
        : `🌦️ Jusqu’à environ ${formatTime(end)}, les scénarios restent partagés : la confiance est volontairement limitée.`;

  $('model-badge').textContent = `${det.length}/${DET_SOURCES.length} modèles · ${ens.length}/${ENS_SOURCES.length} ensembles`;

  $('models').innerHTML = '';
  det.sort((a, b) => b.mm - a.mm).forEach(r => {
    const d = document.createElement('div');
    const ri = weatherInfo(r.code);
    d.className = 'model-card bg-slate-950/65 border border-slate-800 rounded-2xl p-4';
    d.innerHTML = `<div class="flex justify-between gap-2"><div><div class="font-bold">${r.name}</div><div class="text-xs text-slate-500">${r.detail}</div></div><div class="text-2xl">${r.stormCode ? '⛈️' : r.mm >= .5 ? '🌧️' : ri[0]}</div></div>
      <div class="grid grid-cols-3 gap-2 mt-4 text-center">
        <div><div class="text-[11px] text-slate-500">Cumul 0→+6 h</div><div class="font-semibold">${r.mm.toFixed(1)} mm</div></div>
        <div><div class="text-[11px] text-slate-500">CAPE max</div><div class="font-semibold">${Number.isFinite(r.cape) ? Math.round(r.cape) : '—'}</div></div>
        <div><div class="text-[11px] text-slate-500">Influence moteur</div><div class="font-semibold">×${(r.weight || 1).toFixed(2)}</div></div>
      </div>`;
    $('models').appendChild(d);
  });

  $('ensembles').innerHTML = '';
  ens.forEach(e => {
    const d = document.createElement('div');
    d.className = 'model-card bg-slate-950/65 border border-violet-900/50 rounded-2xl p-4';
    const certainty = clamp(100 - e.spread * 14);
    const spreadText = dispersionLabel(e.spread);
    d.innerHTML = `<div class="flex justify-between"><div><div class="font-bold">${e.name}</div><div class="text-xs text-slate-500">${e.detail}</div></div><div class="text-xl">${e.mm >= .5 ? '🌧️' : '🌤️'}</div></div>
      <div class="mt-4">
        <div class="flex justify-between text-xs"><span>Cumul moyen 0→+6 h</span><b>${e.mm.toFixed(1)} mm</b></div>
        <div class="flex justify-between text-xs mt-2"><span>Dispersion ${spreadText}</span><b>${e.spread.toFixed(2)}</b></div>
        <div class="bar mt-3"><div class="fill" style="width:${certainty}%"></div></div>
      </div>`;
    $('ensembles').appendChild(d);
  });

  $('explain').innerHTML = [
    ['Consensus pluie', `${Math.round(wetRatio)}% du poids des modèles principaux prévoit au moins 0,5 mm sur les 6 prochaines heures.`],
    ['Dispersion déterministe', `Écart-type des cumuls : ${spread.toFixed(1)} mm. Plus cette valeur est basse, plus les modèles racontent la même histoire.`],
    ['Ensembles probabilistes', `${ens.length} systèmes actifs. Dispersion moyenne ${dispersionLabel(ensSpread)} (${ensSpread.toFixed(2)}).`],
    ['Convection', capes.length ? `CAPE max ${Math.round(maxCape)} J/kg. Ce signal est croisé avec la pluie et les codes orageux ; il n’est jamais utilisé seul.` : 'Le CAPE n’est pas disponible sur toutes les sources ; les autres signaux restent exploités.']
  ].map(x => `<div class="bg-slate-950/55 border border-slate-800 rounded-2xl p-4"><div class="font-semibold mb-1">${x[0]}</div><div class="text-slate-400">${x[1]}</div></div>`).join('');

  $('sources').innerHTML = [...DET_SOURCES, ...ENS_SOURCES].map(s => `<span class="tinyPill rounded-full px-3 py-1.5 text-xs">${det.some(r => r.id === s.id) || ens.some(r => r.id === s.id) ? '●' : '○'} ${s.name}</span>`).join('');
  $('dashboard').classList.remove('hidden');
}

analyze();
