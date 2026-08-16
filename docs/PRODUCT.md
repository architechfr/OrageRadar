# OrageRadar — produit

**Anticipez les orages.** Application météo PWA centrée sur la surveillance orageuse en temps réel, pensée comme **module réutilisable** pour les autres applications de Florian (Cadence Architectes).

## Fonctions

- **Carte radar animée autonome** (Leaflet + RainViewer) : historique ~1h + nowcast, marqueur fiable sur le lieu choisi, aucune géolocalisation parasite.
- **Couches de prévision Windy** (iframe) : pluie +1h, orages +1h, nuages, vent.
- **Météo actuelle + prévisions horaires** (Open-Meteo).
- **Alerte orage multi-signaux** : nowcast 15 min, codes orage 12h, probabilité de pluie, rafales, CAPE (instabilité).
- **Recherche de ville** tolérante aux fautes (géocodage Open-Meteo + score de similarité), favoris, historique (localStorage).
- **« Ma position »** : géolocalisation navigateur + reverse-geocoding (BAN) pour nommer la commune détectée, avertissement si précision > 5 km.

## Déclinaisons du module

| Instance | Emplacement | Déploiement |
|---|---|---|
| App autonome | ce dépôt (`index.html`) | GitHub Pages `architechfr.github.io/OrageRadar` |
| Module AXION chantier | `CADENCE-AXION-complet/apps/chantier/meteo.html` | Vercel `axion-chantier.vercel.app` |

Le module AXION ajoute : app bar AXION, contexte chantier par paramètres d'URL (`?lat=&lon=&ville=&chantier=&id=`), messages d'alerte orientés chantier (grues, échafaudages, levage).

## Sources de données (toutes gratuites, sans clé)

- Open-Meteo `forecast` + `geocoding` — météo, prévisions, géocodage
- RainViewer `weather-maps.json` + tuiles — radar précipitations
- CARTO `dark_all` — fond de carte sombre
- BAN `api-adresse.data.gouv.fr` — reverse-geocoding France
