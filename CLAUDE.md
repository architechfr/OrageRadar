# OrageRadar — instructions de développement

## Boucle de travail

1. **Observer** : lire ce fichier, `docs/PRODUCT.md`, `docs/ROADMAP.md`, `docs/STATE.md`, puis l'état du code, avant toute modification.
2. **Planifier** : identifier UNE amélioration prioritaire (bug bloquant > build cassé > fonctionnalité incomplète > roadmap > qualité) et l'expliquer brièvement.
3. **Exécuter** : implémenter uniquement la tâche sélectionnée, sans refactoring hors sujet.
4. **Vérifier** : `node --check` sur le JS extrait, serveur local (`python -m http.server`) + tests navigateur (marqueur, animation radar, console, réseau). Une tâche n'est terminée que si sa vérification réussit.
5. **Corriger** : si la vérification échoue, diagnostiquer et corriger avant de passer à autre chose.
6. **Mémoriser** : mettre à jour `docs/STATE.md` (tâche, fichiers, tests, décisions, prochaine priorité) et `docs/ROADMAP.md` si besoin.
7. **Contrôler** : régression ? hors périmètre ? règle générale à documenter ?

Un cycle = une amélioration significative et vérifiée.

## Spécificités du projet

- **Site statique** (index.html unique, PWA) — pas de build, pas de framework. Le JS est inline dans `index.html`.
- **Déploiement** : push sur `main` → GitHub Pages (`architechfr.github.io/OrageRadar`). L'utilisateur juge sur le site live.
- **Service worker** (`sw.js`) : network-first ; **bumper `CACHE_NAME`** à chaque modification de `index.html`.
- **Philosophie module** : OrageRadar est la base météo réutilisée dans d'autres apps (module AXION `apps/chantier/meteo.html` du dépôt CADENCE-AXION, et futures apps). **Toute amélioration doit être portée dans les deux fichiers.**

## Pièges connus (ne pas re-découvrir)

- **Windy embed** : le pin ne se pose sur le lieu choisi que via `detailLat`/`detailLon` (+ `marker=true`). Le point bleu `mylocation` de Windy (géoloc IP, souvent fausse) est **indésactivable** — c'est pourquoi le mode « Radar animé » utilise notre propre carte Leaflet + RainViewer.
- **RainViewer** : ne JAMAIS monter toutes les images radar sur la carte en même temps (7× les tuiles → HTTP 429). Une seule couche active (+ la précédente en transition), liste des frames rafraîchie au plus toutes les 5 min.
- **Mobile iOS** : input < 16px ⇒ zoom automatique au focus. Garder `font-size:16px` sous 640px.
- **Alerte orage** : le `weather_code` seul rate les orages convectifs. Combiner nowcast `minutely_15`, probabilité de pluie, rafales et `cape` (≥ 1000 = « surveiller le radar »).
