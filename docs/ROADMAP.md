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

- [x] **Tableau de bord des favoris** : température, émoji et pastille de risque par lieu, en une requête groupée

- [x] **Module risque de feu de forêt** : indice 0-100, proximité boisée, foyers actifs NASA FIRMS par lieu (carte + bandeau)
- [x] **Moteur de consensus partagé** entre l'accueil et Intelligence (mêmes 8 sources, même formule d'accord)
- [x] **Installation en app, QR de partage, FAQ** dans les Réglages
- [x] **Carte France des feux actifs** (`incendies-france.html`) : tous les foyers FIRMS du pays, pas seulement autour d'un lieu
- [x] **Alerte incendie sur les favoris** (version app ouverte) : vérification à chaque rafraîchissement des favoris + notification navigateur, réglable dans Réglages

## Prochaines priorités (validées avec l'utilisateur le 16/08/2026)

1. **Réglages** : lieu d'ouverture (dernier lieu / favori principal / ma position — aujourd'hui toujours Paris), réglages du radar (vitesse, opacité, rafraîchissement auto 5 min), prévisions 7 jours avec graphique.
2. **Vigilance officielle Météo-France** — ⚠️ bloqué : l'API publique renvoie 401, il faut créer une clé gratuite sur portail-api.meteofrance.fr (action utilisateur).
3. **Scrubber temporel** sur la frise radar (le play/pause existe déjà).
4. **Notifications push** locales quand l'alerte passe au niveau orage (PWA installée).
5. Mode « chantier » partagé avec AXION dans un fichier JS commun (éviter la double maintenance).
6. Décider si `incendies-france.html` doit être porté dans AXION (`apps/chantier/meteo.html` est pensé pour un chantier précis, pas une vue pays).
7. Alerte incendie « vraie » en push serveur (notification même app fermée) — nécessite VAPID, stockage des abonnements et un cron côté backend Vercel : chantier à part entière, pas juste une itération de la version actuelle.

_Note : couche satellite infrarouge RainViewer inutilisable pour l'instant (`satellite.infrared` renvoie 0 image)._

## Idées (non priorisées)

- Historique des passages orageux sur un lieu (journal intempéries pour dossiers chantier AXION)
- Impacts de foudre temps réel (Blitzortung)
- Cumuls de pluie 24h/72h par lieu favori
