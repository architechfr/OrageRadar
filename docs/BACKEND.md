# OrageRadar Weather Engine — backend

## Objectif

Le frontend GitHub Pages ne doit jamais contenir les identifiants Météo-France. Les appels authentifiés passent par des fonctions serverless Vercel.

## Variable secrète

Configurer sur Vercel :

- `METEO_FRANCE_APPLICATION_ID` : valeur d'authentification Basic fournie/générée pour l'application Météo-France. Ne jamais la committer.

Le backend échange cette valeur contre un access token temporaire via `https://portail-api.meteofrance.fr/token`, conserve le token en mémoire tant qu'il est valide, puis appelle les API publiques avec `Authorization: Bearer ...`.

## Endpoints initiaux

- `GET /api/health` : vérifie que l'authentification Météo-France fonctionne.
- `GET /api/radar` : proxy/cache des métadonnées de mosaïques radar. La route de produit binaire sera ajoutée après validation de l'abonnement et inspection de la réponse réelle du compte.

## Sécurité

- aucun secret côté navigateur ;
- CORS limité à `https://architechfr.github.io` ;
- les erreurs renvoyées au frontend ne contiennent ni token ni identifiant ;
- cache CDN de 4 min sur les métadonnées radar ;
- le frontend RainViewer actuel reste inchangé tant que le radar officiel n'est pas validé en production.

## Déploiement

1. Importer `architechfr/OrageRadar` dans Vercel.
2. Utiliser la branche de développement pour le premier preview.
3. Ajouter `METEO_FRANCE_APPLICATION_ID` dans les variables d'environnement Preview et Production.
4. Appeler `/api/health` : attendu `meteofrance: authenticated`.
5. Appeler `/api/radar` et vérifier le format retourné par l'abonnement réel.
6. Seulement après cette validation, connecter le frontend au radar Météo-France avec RainViewer en fallback.

## ⚠️ Ce fichier api/fires.js n'est pas celui déployé

`axion-chantier.vercel.app` déploie depuis le dépôt **`architechfr/AXION-CHANTIER`**, pas depuis ce dépôt OrageRadar. `api/fires.js` existe donc en double, avec un style différent (ES5, CORS multi-origines côté AXION-CHANTIER). Toute évolution de ce endpoint doit être **portée manuellement** dans `AXION-CHANTIER/api/fires.js` puis poussée là-bas pour prendre effet en production — l'oubli de ce portage a cassé la carte France à sa mise en ligne (mode `bbox` absent côté serveur réel). Le fichier de ce dépôt sert de référence/historique.

## Feux actifs — NASA FIRMS

`GET /api/fires?lat=&lon=&radius=&days=` (mode point, autour d'un lieu)
ou `GET /api/fires?bbox=west,south,east,north&days=` (mode région — utilisé
par `incendies-france.html` avec l'emprise de la France métropolitaine +
Corse, `bbox=20°` maximum en largeur/hauteur). En mode `bbox`, pas de
`distanceKm` (aucun centre) et le tri se fait par puissance radiative
décroissante ; jusqu'à 300 foyers renvoyés (`truncated: true` au-delà) contre
50 en mode point.

- Variable secrète Vercel : **`FIRMS_MAP_KEY`** (clé gratuite obtenue sur
  `firms.modaps.eosdis.nasa.gov/api/map_key/`). Comme pour Météo-France, elle
  ne doit jamais figurer dans le dépôt ni dans le frontend GitHub Pages.
- Interroge les deux satellites VIIRS 375 m (`VIIRS_NOAA20_NRT` et
  `VIIRS_SNPP_NRT`) et **fusionne les doublons** : les deux satellites
  survolent la même zone, sans regroupement le nombre de foyers serait doublé.
- Renvoie les foyers triés par distance, avec `distanceKm`, `detectedAt`,
  `confidence` (l/n/h), `power` (FRP en MW).
- `radius` borné à 10-300 km, `days` à 1-3. Cache CDN 10 min.
- Codes d'erreur : `FIRMS_KEY_MISSING` (503), `INVALID_COORDINATES` (400),
  `FIRMS_UNAVAILABLE` (502).

### Branchement du frontend

Dans `index.html`, renseigner `BACKEND_BASE` avec l'URL Vercel du projet
(ex. `https://orageradar.vercel.app`). Tant que la constante est vide et que
le site est servi par GitHub Pages, le bloc « feux actifs » reste simplement
masqué : le reste du module incendie (indice calculé, zones boisées) continue
de fonctionner sans backend.

**Attention** : une détection thermique VIIRS n'est pas nécessairement un feu
de forêt — un brûlage agricole ou une torchère industrielle déclenche le même
signal. Le libellé affiché le précise à l'utilisateur.
