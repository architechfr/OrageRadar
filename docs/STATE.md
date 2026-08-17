# OrageRadar — état du projet

## Dernier cycle — détail heure par heure d'un jour à venir

**Retour terrain** : testeuse externe (sœur de l'utilisateur) — la carte 7 jours donne max/min et une pastille de risque par jour, mais pas moyen de savoir ce qui est prévu *pendant* une journée précise (ex. « mercredi prochain, qu'est-ce qui est prévu dans la journée ? »).

**Implémentation** : chaque tuile des « Prévisions 7 jours » est cliquable et ouvre une modale de détail horaire (même famille que Réglages/FAQ). Aucun nouvel appel réseau : `loadWeather()` demande déjà l'horaire sur 7 jours (`forecast_days=7`) pour la frise "Prévisions horaires" (qui n'en affiche que 8h) — ce hourly complet est maintenant conservé dans `currentHourly` et filtré par jour au clic (`H.time[i].startsWith(day.iso)`).

**Contenu de la modale** : résumé (icône, description, max/min, cumul pluie, % de pluie max) puis 24 lignes heure par heure (icône, température, % de pluie, mm si non nul, rafales, badge orage si `stormLevel >= 2` ou `cape >= 1000`, ligne teintée violet si orageuse).

**Tests** (Playwright, données Open-Meteo simulées avec un mercredi orageux 14h-17h) : 7 tuiles cliquables, modale ouverte sur la bonne date (« mercredi 19 août »), résumé correct, 24 lignes horaires générées, 4 lignes orageuses correctement détectées et surlignées. Vérification structurelle de l'ouverture/fermeture (classe `hidden` retirée/ajoutée) : correcte.

**Limite du bac à sable de test notée pour ne pas la re-découvrir** : Tailwind CDN ne génère pas les classes `fixed`/`z-[…]` dans cet environnement de test hors-ligne (`position: static` au lieu de `fixed` en `getComputedStyle`) — constaté à l'identique sur `settings-modal`, code de production non modifié et déjà validé en direct par l'utilisateur. Ce n'est donc pas un bug du code, juste une limite du test local sans accès réseau complet à Tailwind CDN ; la vérification fiable dans ce contexte est l'état de la classe `hidden`, pas le rendu visuel Playwright.

## Correctif — carte France vide en prod (mode bbox manquant côté backend)

**Symptôme signalé par l'utilisateur** : `incendies-france.html` en ligne affichait « Impossible de charger les foyers actifs pour le moment. ».

**Cause** : `api/fires.js` de ce dépôt n'est **pas** le code réellement exécuté par `axion-chantier.vercel.app`. Ce projet Vercel déploie depuis un dépôt séparé, `architechfr/AXION-CHANTIER` (attaché à cette session, cloné dans `/workspace/axion-chantier`), qui contient sa **propre version** de `api/fires.js` (style ES5, CORS multi-origines) — le mode `bbox` ajouté ici ne s'y trouvait pas, donc l'appel de la carte France échouait sur `INVALID_COORDINATES`.

**Correctif** : mode `bbox` porté dans `AXION-CHANTIER/api/fires.js` en respectant son style existant (pas une réécriture). Testé en local (fetch simulé) : bbox OK avec dédoublonnage satellite, mode point inchangé (aucun risque de régression sur le module chantier ni l'alerte favoris). Poussé sur `main` de ce dépôt (déploiement Vercel automatique) — accord explicite de l'utilisateur requis et obtenu, car hors du dépôt/branche désignés pour cette session.

**Point de vigilance retenu pour les prochains cycles** : `api/fires.js` existe en double, dans deux dépôts, avec des styles différents. Toute future évolution du backend feux actifs doit être portée **manuellement** dans `AXION-CHANTIER/api/fires.js` (le fichier de ce dépôt sert de référence/historique mais n'est pas déployé tel quel). Envisager à terme de documenter ceci plus clairement dans `docs/BACKEND.md`, voire de faire de `AXION-CHANTIER` la seule source de vérité pour ce fichier.

**Priorité confirmée par l'utilisateur** : malgré ce détour backend, OrageRadar reste le projet prioritaire de cette session — l'intervention sur AXION-CHANTIER est un moyen, pas un changement de périmètre.

## Dernier cycle — alerte incendie sur les favoris + FIRMS confirmée en prod

**Vérification FIRMS** : l'utilisateur a confirmé par capture d'écran Vercel que `FIRMS_MAP_KEY` est bien configurée sur le projet `axion-chantier` (scope Production and Preview, ajoutée avant les derniers déploiements) — l'accès direct m'était bloqué (réseau du bac à sable + connecteur Vercel MCP sans visibilité sur ce projet). Test live sur téléphone confirmé : bandeau vert « Aucun feu détecté... », indice 72/100, tout fonctionne.

**Carte France mise en ligne** : la branche du cycle précédent a été fusionnée sur `main` sur demande explicite de l'utilisateur (push direct, fast-forward, pas de PR).

**Alerte incendie sur les favoris** (version choisie par l'utilisateur face à deux options : légère aujourd'hui vs push serveur plus tard) :
- Réutilise le mode point existant de `/api/fires` (un appel par favori, rayon 25 km, `days=1`) — pas de changement backend nécessaire.
- Bandeau `#fav-fire-alert` au-dessus de la liste des favoris, alimenté par `checkFavoritesFires()` appelée dans `renderFavorites()` aux côtés de `refreshFavoritesWeather()`, même cadence (10 min, dégradation silencieuse par favori en cas d'échec réseau).
- Case à cocher « Alerte incendie sur mes favoris » dans Réglages : à l'activation, `Notification.requestPermission()` est demandée ; si refusée ou API absente, la case revient à décoché (le bandeau visuel reste actif dans tous les cas, seule la notification navigateur est conditionnée à l'option + permission).
- Déduplication des notifications par `localStorage.notifiedFires` (clé `lat,lon@foyer_lat,foyer_lon`) pour ne pas renotifier le même foyer à chaque rafraîchissement.
- **Limite assumée et documentée (FAQ)** : ce n'est pas un vrai push serveur — l'alerte ne se déclenche que si l'app est ouverte ou récemment rouverte. Le push complet (VAPID + abonnements + cron) reste en roadmap comme chantier séparé.

**Tests** (Playwright, backend `/api/fires` mocké) : bandeau correct avec un favori en alerte (« Incendie détecté près de votre favori — Avignon (12.4 km) »), case Réglages testée dans les deux sens (permission accordée → sauvegardée `true`, refusée → repasse à `false`), modale se ferme bien dans les deux cas malgré le `await` ajouté sur `saveSettingsFromUI()`, aucune erreur JS non attendue.

## Cycle précédent — carte France des feux actifs

**Besoin** : le module incendie ne montrait les foyers FIRMS qu'autour d'un seul lieu (rayon 100 km). L'utilisateur veut une vue d'ensemble de tous les foyers actifs sur la France.

**Backend** (`api/fires.js`) : nouveau mode `bbox=west,south,east,north` en plus du mode `lat/lon/radius` existant — même endpoint, deux usages. En mode bbox : pas de centre donc pas de `distanceKm`, tri par puissance radiative décroissante (plus pertinent qu'une distance sans point de référence), jusqu'à 300 foyers renvoyés au lieu de 50 (`truncated: true` si dépassement). Emprise France testée : `-5.3,41.2,9.9,51.3` (métropole + Corse), sous la limite FIRMS de 20°×20°.

**Frontend** : nouvelle page autonome `incendies-france.html` (même famille que `intelligence.html` — page dédiée avec son propre header et lien « Retour à OrageRadar », pas une section de plus dans l'accueil déjà chargé). Carte Leaflet plein cadre sur la France, sélecteur 24 h/48 h/72 h, rafraîchissement auto 10 min (aligné sur le cache CDN), légende par ancienneté identique à la carte chantier. Lien croisé ajouté des deux côtés : bouton « Carte France » dans le header de l'accueil, lien « Voir tous les foyers actifs en France » sous la carte du module incendie local.

**Tests** (Playwright + serveur local, CDN Leaflet mocké car bloqué par le réseau du bac à sable) : `node --check` OK sur `api/fires.js` et le JS extrait des deux pages HTML ; page France sans erreur JS non interceptée, bandeau d'erreur correct quand le backend est injoignable (`Impossible de charger les foyers actifs pour le moment.`), bascule 24h/48h/72h fonctionnelle ; page d'accueil : les 2 liens vers `incendies-france.html` présents, aucune régression sur les blocs radar/incendie existants (échecs RainViewer/Open-Meteo observés sont dus au réseau restreint du bac à sable, pas à ce changement).

**Non fait** : portage dans le module AXION (`CADENCE-AXION/apps/chantier/meteo.html`) — ce dépôt n'est pas attaché à cette session. Une vue France entière a moins de sens sur une page mono-chantier ; à trancher avec l'utilisateur avant de porter tel quel. Vérification en prod que `FIRMS_MAP_KEY` est bien configurée sur le projet Vercel `axion-chantier` toujours en attente (bloqué par le réseau du bac à sable lors de la tentative précédente, à confirmer côté utilisateur).

## Rattrapage mémoire (cycles non documentés ici avant ce jour)

Trois cycles ont eu lieu entre le module incendie initial et celui du jour, sans mise à jour de ce fichier :
- **Carte des foyers actifs par chantier** (c2cc005) : carte Leaflet avec cercles proportionnels à la puissance radiative, couleur par ancienneté — base reprise et généralisée à la France ce cycle-ci.
- **Moteur de consensus partagé** (a00d0ba, `assets/consensus.js`) : répondait exactement au « reste à faire » du cycle précédent (unifier l'accueil et Intelligence sur les mêmes 8 sources) — considérer ce point comme résolu.
- **Installation en app, QR de partage, FAQ** (225322c) : ajoutés aux Réglages.

## Cycle précédent — module risque de feu de forêt

**Besoin** : chantiers proches de massifs boisés, partout en France, avec un état live.

**Sources testées avant de choisir** :
| Source | Résultat du test | Décision |
|---|---|---|
| Open-Meteo (calcul du danger) | toutes variables OK, discrimine bien (Provence VPD 1,41 / HR 56 % contre Landes 0,25 / 90 %) | **retenu** — sans clé, précis au point |
| EFFIS / Copernicus WMS | `GetMap` HTTP 200 | utilisable en couche carte |
| EFFIS interrogation au point | « Search returned no results » | écarté |
| NASA FIRMS (feux actifs) | HTTP 400 « Invalid MAP_KEY » | **en attente d'une clé gratuite (action utilisateur)** |
| Météo des forêts (data.gouv) | archives annuelles seulement (`mdf.2026.csv.gz`) | le live passe par la clé Météo-France |

**Indice** : 0-100 pondérant humidité de l'air (25 %), pouvoir asséchant VPD (20 %), pluie sur 7 jours (22 %), vent (13 %), température (10 %), humidité du sol (10 %, poids reporté sur l'air si la donnée manque). Quatre niveaux avec consigne chantier (travaux par points chauds, extincteurs, arrêtés préfectoraux).

**Honnêteté affichée** : l'indice est présenté comme indicatif ; la Météo des forêts de Météo-France et les arrêtés préfectoraux restent les références officielles.

**Proximité boisée** (OpenStreetMap / Overpass) : `out count` au lieu d'une liste tronquée — le plafond faisait afficher le même total partout (30/30). Le libellé annonce une **présence**, pas une surface : le nombre de polygones OSM ne mesure pas l'étendue d'un massif (Paris centre 38 petits squares contre Draguignan 2 grands massifs). Cache définitif par lieu car Overpass renvoie 429 dès le 3ᵉ appel.

**Bug corrigé dans les moteurs Intelligence (v2 et v3)** : UKMO était appelé sur `/v1/ukmo`, inexistant (404). `Promise.allSettled` masquait l'échec : la page annonçait 8 sources et n'en utilisait que 7. Le bon appel est `models=ukmo_seamless`. Vérifié : « 8 sources actives sur 8 ».

**Liens croisés** : l'accueil renvoie désormais vers Intelligence (le retour existait déjà).

**Reste à faire** : unifier le moteur des deux pages (l'accueil compare 4 modèles avec un verdict binaire, Intelligence calcule un score de confiance sur 8 sources — deux réponses différentes à la même question). _Résolu depuis, voir « Rattrapage mémoire » ci-dessus._

## Cycle précédent — 
_Dernière mise à jour : 16 août 2026 (soir, cycle 7)_

## Dernier cycle — tableau de bord des favoris

**Objectif** (priorité n° 1 restante) : voir l'état de tous les lieux suivis sans cliquer l'un après l'autre — pour AXION, surveiller plusieurs chantiers d'un coup d'œil.

**Trouvaille** : Open-Meteo accepte **plusieurs coordonnées dans une seule requête** (`latitude=48.85,43.62&longitude=2.35,3.51`) et renvoie un tableau de résultats. Un seul appel réseau suffit donc pour tous les favoris, quel qu'en soit le nombre.

**Rendu par favori** : émoji du temps, nom, température, et une pastille de risque quand il y en a un — « orage » (violet), rafales en km/h, « pluie », ou « instable » (CAPE ≥ 1000).

**Garde-fous** :
- `renderFavorites()` est appelée à chaque changement de lieu ; un **cache de 10 min** avec signature de la liste évite de refaire l'appel à chaque rendu. Vérifié : 5 rendus consécutifs = 0 requête, ajout d'un favori = exactement 1 requête.
- `favWeatherLoading` empêche la boucle `renderFavorites → refresh → renderFavorites`.
- Un seul favori : l'API renvoie un **objet** et non un tableau — normalisé par `Array.isArray`.

**Tests** : 4 favoris dont Mexico (pastille « orage » correcte), favori unique, clic (navigation OK), suppression, ajout. Alerte, anticipation et comparaison de modèles vérifiées intactes dans les deux apps.

## Cycle précédent — comparaison des modèles de prévision

**Objectif** (priorité n° 1 validée avec l'utilisateur) : croiser plusieurs sources, ce qu'aucune app grand public ne propose. Répond à « il est intéressant de pouvoir vérifier avec plusieurs technologies ».

**Modèles interrogés** via `models=` d'Open-Meteo (gratuit, sans clé) : AROME (Météo-France, 1,3 km — le plus fin sur les orages en France), ECMWF (référence européenne), ICON (Allemagne, Europe), GFS (États-Unis, global). Fenêtre : cumul de précipitations et CAPE max sur 6 h.

**Rendu** : un verdict d'ensemble puis une ligne par modèle (barre proportionnelle, cumul en mm, éclair si CAPE ≥ 1000).
- accord sec : « Les 4 modèles s'accordent : pas de pluie attendue »
- accord humide : « Les 4 modèles s'accordent : pluie attendue — prévision fiable »
- désaccord : « Désaccord : 1 modèle sur 4 annonce de la pluie (GFS isolé) — prévision incertaine, surveiller le radar »

**⚠️ Piège majeur découvert** : AROME est un modèle national. Interrogé hors de son domaine, Open-Meteo répond `"latitude":nan` — **ce n'est pas du JSON valide**, `JSON.parse` lève une exception et emporterait toute la fonctionnalité. Parade : `try/catch` puis nouvelle requête sans les modèles marqués `local`. Les modèles absents de la réponse (ICON hors d'Europe) sont simplement ignorés, et la carte se masque s'il reste moins de 2 modèles.

**Autre garde-fou** : jeton de requête (`modelsRequestToken`) pour ignorer une réponse tardive si l'utilisateur a changé de lieu entre-temps.

**Tests** : Campagnan (désaccord réel — GFS 2,5 mm contre 0 pour les 3 autres, cas idéal), Paris (accord + instabilité signalée par 1 modèle), Tokyo (repli effectif : AROME et ICON écartés, comparaison sur ECMWF/GFS). Anticipation et alerte orage vérifiées intactes. Aucune erreur en console hormis le service worker, propre au bac à sable local.

## Cycle précédent — anticipation « la pluie arrive dans X min »

**Objectif** : tenir la promesse du nom (« Anticipez les orages »). L'app disait le temps qu'il fait, pas quand il va changer.

**Découverte importante sur le point bleu Windy** (l'utilisateur avait raison de douter de mon diagnostic) : le marqueur `mylocation` n'apparaît **que** avec `overlay=radar` (0 en `overlay=rain`, vérifié en direct), et **pas** à cause de `radarRange`. Cause réelle : le radar Windy est un produit *régional* (réseaux radar nationaux) — Windy géolocalise par IP pour choisir le réseau à charger. Les couches de prévision sont des grilles de modèle globales, donc aucune géolocalisation. Non supprimable (iframe cross-origin). Nuance utile : ce point marque « où Windy croit que vous êtes » — il paraît absurde seulement quand on consulte une ville lointaine.

**Implémentation** : bloc « anticipation » sous l'alerte, alimenté par `minutely_15` (+ `forecast_minutely_15=12` = 3 h) et `wind_direction_700hPa` (vent directeur des cellules).
- Titre : « Pluie dans 45 min », « Orage dans 1 h 15 », « Précipitations en cours — accalmie vers 20:15 », ou « Rien à l'horizon des 3 prochaines heures ».
- Provenance : « arrive du sud-ouest » (article inclus dans la table des points cardinaux pour l'élision).
- Frise de 12 barres (15 min chacune), hauteur et couleur selon l'intensité, violet pour l'orage, infobulle avec les mm.
- Version AXION : le message orage ajoute « anticiper la sécurisation ».

**Tests** : cas réels (Paris sec, Mexico pluvieux) + cas injectés (pluie dans 45 min, orage dans 1 h 15, pluie continue, accalmie, échelle de couleurs, 8 directions cardinales).

**Piège rencontré** : mon premier jeu de test générait des horaires en UTC alors qu'Open-Meteo renvoie l'heure locale (`timezone=auto`) — le test échouait, pas le code. Toujours fabriquer les horaires de test en heure locale.

## Cycle précédent — Windy rendu au choix de l'utilisateur

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

Faire tester en conditions réelles l'alerte incendie sur les favoris (activer la notification dans Réglages, un vrai favori proche d'un foyer actif si l'actualité le permet, sinon test avec un favori temporaire proche d'un foyer visible sur la carte France). Ensuite : décider si `incendies-france.html` doit être porté dans AXION, ou passer à la vigilance officielle Météo-France (bloquée sur une clé API à créer par l'utilisateur).
