# OrageRadar — roadmap

## Fait

- [x] PWA (manifest + service worker network-first)
- [x] Recherche tolérante aux fautes, favoris, historique
- [x] Responsive mobile : header en colonne, input 16px (anti-zoom iOS)
- [x] Pin Windy sur le lieu choisi (`detailLat`/`detailLon`)
- [x] Alerte orage multi-signaux (nowcast, probabilité, rafales, CAPE)
- [x] « Ma position » nommée par reverse-geocoding + avertissement précision
- [x] **Carte radar autonome Leaflet + RainViewer** (mode par défaut) — supprime le point bleu parasite de Windy
- [x] Tuiles radar visibles au zoom ville (`maxNativeZoom: 7`)
- [x] Animation sans clignotement (préchargement + fondu enchaîné)
- [x] Fond éclairci + noms de communes au-dessus du radar
- [x] Bouton lecture/pause + légende d'intensité
- [x] Choix du rendu radar : carte précise **ou** Windy, préférence mémorisée

- [x] **Anticipation « la pluie arrive dans X min »** + provenance des cellules + frise 3 h

- [x] **Comparaison des modèles** AROME / ECMWF / ICON / GFS avec verdict d'accord ou de désaccord

## Prochaines priorités (validées avec l'utilisateur le 16/08/2026)

1. **Tableau de bord des favoris** : température + alerte de chaque lieu d'un coup d'œil (plusieurs chantiers).
2. **Réglages** : lieu d'ouverture (dernier lieu / favori principal / ma position — aujourd'hui toujours Paris), réglages du radar (vitesse, opacité, rafraîchissement auto 5 min), prévisions 7 jours avec graphique.
3. **Vigilance officielle Météo-France** — ⚠️ bloqué : l'API publique renvoie 401, il faut créer une clé gratuite sur portail-api.meteofrance.fr (action utilisateur).
4. **Scrubber temporel** sur la frise radar (le play/pause existe déjà).
5. **Notifications push** locales quand l'alerte passe au niveau orage (PWA installée).
6. Mode « chantier » partagé avec AXION dans un fichier JS commun (éviter la double maintenance).

_Note : couche satellite infrarouge RainViewer inutilisable pour l'instant (`satellite.infrared` renvoie 0 image)._

## Idées (non priorisées)

- Historique des passages orageux sur un lieu (journal intempéries pour dossiers chantier AXION)
- Impacts de foudre temps réel (Blitzortung)
- Cumuls de pluie 24h/72h par lieu favori
