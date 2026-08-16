# OrageRadar — roadmap

## Fait

- [x] PWA (manifest + service worker network-first)
- [x] Recherche tolérante aux fautes, favoris, historique
- [x] Responsive mobile : header en colonne, input 16px (anti-zoom iOS)
- [x] Pin Windy sur le lieu choisi (`detailLat`/`detailLon`)
- [x] Alerte orage multi-signaux (nowcast, probabilité, rafales, CAPE)
- [x] « Ma position » nommée par reverse-geocoding + avertissement précision
- [x] **Carte radar autonome Leaflet + RainViewer** (mode par défaut) — supprime le point bleu parasite de Windy

## Prochaines priorités

1. **Bouton play/pause + scrubber** sur l'animation radar (contrôler la lecture, figer une image)
2. **Rafraîchissement automatique** du radar toutes les 5 min quand l'onglet est actif (orage en cours = données fraîches sans recharger)
3. **Nowcast RainViewer en évidence** : distinguer visuellement les images « prévision » (souvent 0 à 30 min) des images passées
4. **Notifications push** locales quand l'alerte passe au niveau orage (PWA installée)
5. Échelle de couleurs radar (légende dBZ simplifiée : faible / modéré / fort / grêle)
6. Mode « chantier » partagé avec AXION dans un fichier JS commun (éviter la double maintenance)

## Idées (non priorisées)

- Historique des passages orageux sur un lieu (journal intempéries pour dossiers chantier AXION)
- Impacts de foudre temps réel (Blitzortung)
- Cumuls de pluie 24h/72h par lieu favori
