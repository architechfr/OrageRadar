# OrageRadar — état du projet

_Dernière mise à jour : 16 août 2026 (soir, cycle 4)_

## Dernier cycle — Windy rendu au choix de l'utilisateur

**Retour utilisateur** : « j'avoue j'aimais bien Windy » — le passage du radar à notre carte Leaflet lui a été imposé sans alternative.

**Décision** : ne pas choisir à sa place. Les deux rendus coexistent :
- **« Radar animé »** = carte Leaflet/RainViewer, repère fiable sur le lieu choisi (par défaut).
- **« Radar Windy »** = rendu Windy d'origine, plus riche, mais avec son point bleu de géoloc IP.
Chaque bouton porte une infobulle expliquant le compromis.

**Implémentation minimale** : `refreshMap()` n'envoie sur la carte Leaflet que le mode `radar` ; tout autre mode passe déjà par l'iframe. Une entrée `windyradar` dans `getModeConfig` + un bouton ont donc suffi.

**Préférence mémorisée** : `localStorage.mapMode` est relu au démarrage (`highlightMapMode` extrait de `setMapMode`), avec validation par l'existence du bouton correspondant — sinon retour à `radar`.

**Tests** : bascule aller-retour dans les 2 apps, persistance vérifiée après rechargement complet (mode `windyradar` restauré, bon bouton actif, iframe centrée sur `detailLat`), animation Leaflet stoppée en mode Windy et relancée au retour, légende masquée hors mode radar.

**Règle générale** : quand une amélioration technique retire une expérience que l'utilisateur appréciait, proposer les deux et mémoriser son choix plutôt que d'arbitrer à sa place.

## Cycle précédent — qualité d'affichage de la carte radar

**Retour utilisateur** : « carte très sombre, ça clignote tout le temps, on a perdu en beauté et lisibilité ».

**Diagnostic** :
- *Clignotement* : `showRadarFrame` montait/démontait les couches à chaque image → chaque image se re-téléchargeait à chaque tour de boucle. Ce montage à la demande était le contournement du 429 — devenu inutile depuis `maxNativeZoom: 7` (une image ne pèse plus que ~4 tuiles).
- *Trop sombre* : fond CARTO `dark_all` très sombre, et ses libellés passaient **sous** la couche radar → noms de villes noyés.

**Correctifs** (les 2 apps) :
- **Préchargement complet** : les 7 couches sont montées d'emblée en opacité 0 ; l'animation ne démarre qu'une fois toutes les tuiles chargées (garde-fou 6 s). Mesuré : **0 requête réseau pendant l'animation**.
- **Fondu enchaîné** CSS `transition: opacity .32s` au lieu d'un basculement sec.
- **Fond éclairci** : `dark_nolabels` + `filter: brightness(1.9) saturate(1.15)`.
- **Libellés au-dessus du radar** : pane Leaflet dédié `labels` (zIndex 650) avec `dark_only_labels` → noms de communes lisibles même sous une cellule.
- **Opacité radar** 0.7 → 0.8, cadence 800 → 900 ms.
- **Bouton lecture/pause** + **légende d'intensité** (dégradé bleu→violet).

**Tests** : préchargement 7/7 couches, 0 requête pendant l'animation, filtre et pane vérifiés, pause fige bien l'image et reprend, marqueur sur Campagnan, module AXION idem via URL chantier. `node --check` OK sur les deux fichiers.

**Règle générale** : une animation de tuiles ne doit jamais démonter ses couches — précharger, puis ne jouer que sur l'opacité. Le rate-limit se règle en bornant `maxNativeZoom`, pas en démontant.

## Cycle précédent (correctif régression)

**Bug** : depuis la carte radar autonome, plus aucune carte visible au zoom ville — tuiles RainViewer remplacées par le filigrane « Zoom Level Not Supported » (voile sombre), signalé par capture d'écran utilisateur sur mobile (Campagnan, zoom 12).

**Diagnostic** (sondage direct des tuiles, analyse pixel) : RainViewer ne sert les tuiles 256px que jusqu'au **zoom 7** ; au-delà, il renvoie un PNG filigrane de 1370 octets (voile noir alpha 140 + texte). La sélection d'une ville zoome à 12-13 → toutes les tuiles étaient le filigrane.

**Correctif** : `maxNativeZoom: 7, maxZoom: 19` sur les couches radar (les 2 apps) — Leaflet agrandit lui-même les tuiles z7 aux zooms ville. Vérifié : au zoom 12, seules des tuiles z=7 sont demandées, 0 cassée, marqueur exact, animation OK. Cache SW v5.

**Règle générale apprise** : pour toute source de tuiles tierce, sonder la limite de zoom réelle (taille/contenu des réponses à z croissant) AVANT de câbler la carte, et poser `maxNativeZoom` en conséquence.

## Cycle précédent

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
