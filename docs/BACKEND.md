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
