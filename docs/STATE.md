# OrageRadar — état du projet

_Dernière mise à jour : 16 août 2026_

## Dernier cycle

**Tâche** : supprimer le point bleu de géolocalisation parasite qui plaçait systématiquement l'utilisateur au mauvais endroit (ex. région parisienne alors que Campagnan était sélectionné).

**Diagnostic** : le point bleu est le marqueur `mylocation` interne de l'iframe Windy, basé sur une géoloc IP, **indésactivable** (tous les paramètres candidats testés en live : ignorés).

**Solution** : le mode « Radar animé » (mode par défaut) n'utilise plus Windy — carte **Leaflet + RainViewer** en propre : fond CARTO sombre, marqueur circulaire sur le lieu choisi, animation 7 images (~1h) + nowcast, horodatage affiché. Les 4 autres modes (pluie +1h, orages +1h, nuages, vent) restent sur l'iframe Windy avec pin `detailLat`/`detailLon`.

**Fichiers modifiés** :
- `index.html` — Leaflet CDN, CSS carte, conteneur `#radar-map` + `#radar-timestamp`, bloc JS radar (~120 lignes), aiguillage `refreshMap()`
- `sw.js` — cache v4
- portage identique dans `CADENCE-AXION-complet/apps/chantier/meteo.html`

**Tests effectués** (serveur local + navigateur) :
- `node --check` sur le JS extrait : OK (les 2 fichiers)
- Sélection Campagnan : carte centrée (43.626, 3.516), marqueur exact, `0` point parasite
- Bascule radar → orages +1h → radar : iframe/carte alternent, animation stoppée puis relancée
- AXION avec `?lat=&lon=&ville=&chantier=` : marqueur sur Ferrières, contexte chantier affiché
- 48/48 tuiles chargées, 0 tuile cassée, animation active

**Erreur rencontrée et résolue** : rafale de HTTP 429 RainViewer — les 7 couches radar étaient montées simultanément sur la carte (7× les tuiles). Correctif : une seule couche active à la fois (+ précédente pendant la transition ~1s), liste des frames mise en cache 5 min, garde anti-réentrance.

**Décisions** :
- RainViewer choisi (gratuit, sans clé, mêmes données que les grandes apps) ; Windy conservé uniquement pour les couches de prévision qu'on ne peut pas répliquer gratuitement.
- Le radar autonome est le mode par défaut : c'est là que la fiabilité de localisation compte.

## Problème restant / vigilance

- **Le fichier AXION `meteo.html` a été retrouvé écrasé** (probablement par une autre session/synchro OneDrive) : les correctifs du jour ont dû être ré-appliqués. Vérifier avant tout commit AXION que les correctifs (detailLat, minutely_15, radar Leaflet) sont bien présents. Le module AXION n'est **pas encore déployé** (pipeline Vercel séparé).
- Console : 429 transitoires possibles si rechargements répétés très rapprochés (tests) — sans impact utilisateur.

## Prochaine priorité recommandée

Rafraîchissement automatique du radar toutes les 5 min + bouton play/pause (voir ROADMAP 1-2) — utile précisément pendant un épisode orageux.
