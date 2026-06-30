# ExoGameFinder

**Trouve le bon jeu CSE en 10 secondes.**

ExoGameFinder est une PWA mobile-first pour aider les utilisateurs du CSE à choisir rapidement un jeu de société disponible. La V1 fonctionne avec des données locales JSON et un repository `localStorage`. L’architecture prévoit un passage progressif vers Supabase pour l’authentification, les contributions et la validation collaborative.

## Installation

```bash
npm install
npm run dev
```

La commande de build production est :

```bash
npm run build
```

## Déploiement Render

Le fichier `render.yaml` permet de créer un Static Site Render directement depuis le dépôt GitHub.

Render utilisera :

- Build command : `npm ci && npm run build`
- Publish directory : `dist`
- Rewrite SPA : `/*` vers `/index.html`

Après le push GitHub, connecter le dépôt `exovv/ExoGameFinder` dans Render avec l'option Blueprint ou Static Site.

## Pages principales

- `/` : accueil, baseline, accès Finder, ludothèque et admin.
- `/finder` : assistant en étapes pour filtrer par joueurs, durée, ambiance, difficulté et lieu.
- `/library` : ludothèque complète avec recherche, filtres et tri.
- `/game/:id` : fiche jeu détaillée avec image, lieux, règles, liens et actions de contribution.
- `/admin` : administration collaborative en mode démo local.

## Mode démo

Sans configuration Supabase, l’application utilise automatiquement `localStorageRepository`.

Le repository initialise les données depuis `src/data/exogamefinder.seed.json`, normalise les titres, applique `src/data/titleAliases.ts`, fusionne les doublons par titre normalisé, conserve les lieux dans `locations`, et marque les titres ambigus ou incomplets sans inventer les données manquantes.

Le stockage local contient :

- les jeux normalisés ;
- les contributions ;
- les lieux ;
- l’audit log.

Les boutons d’import/export JSON dans l’administration permettent de sauvegarder ou restaurer l’état local.

## Administration collaborative

La V1 simule les rôles sans authentification réelle :

- `visitor` ;
- `contributor` ;
- `moderator` ;
- `admin`.

L’administration contient :

- dashboard avec métriques, import/export et dernières modifications ;
- table filtrable de jeux avec statuts `verified`, `to-check`, `ambiguous`, `missing-image`, `missing-rules` ;
- formulaire d’édition complet ;
- file de contributions avec diff lisible et validation/rejet ;
- panneau d’enrichissement des images via BoardGameGeek ;
- gestion des lieux : Croix, Imprimerie, Maillerie 1, Maillerie 2, Mons, Lot initial, plus ajout/désactivation/export ;
- audit log des changements.

En V2, `supabaseRepository` peut être activé avec :

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Si ces variables sont absentes, l’app ne bloque pas et reste en mode local.

## Structure des données

Les types principaux sont dans `src/types/game.ts` :

- `Game` ;
- `Contribution` ;
- `AppRole` ;
- `RulesKnowledge` ;
- `DataQuality` ;
- `GameCategory` ;
- `LanguageDependency`.

Les champs inconnus restent `null`, `unknown`, `missing-image`, `missing-rules` ou `to-check`. Les jeux ambigus comme `Star Wars`, `Dune`, `E.T.`, `En bizarre compagnie`, `Le Grand Jeu`, `Sauve Mouton` et `Robin Wood` sont marqués `ambiguous`.

## Recommandation

La fonction `scoreGame(game, filters)` applique les pondérations demandées : compatibilité joueurs, durée, difficulté, ambiance, lieu, bonus duel/coop/grand groupe, état des règles et pénalité d’ambiguïté.

Un jeu incompatible avec le nombre de joueurs n’est jamais remonté en premier. Le mode `includeAlmostCompatible` permet seulement de l’afficher plus bas pour exploration.

## Enrichissement BoardGameGeek

La base locale contient déjà 144 couvertures récupérées depuis des pages publiques BoardGameGeek dans `src/data/gameImageOverrides.json`. Les 7 titres marqués `ambiguous` restent volontairement sans image automatique pour éviter les mauvaises associations.

Le script d’enrichissement est disponible avec :

```bash
npm run enrich:bgg
```

Depuis les règles BGG 2025, l’API XML exige un token d’application. Définir le token côté terminal avant de lancer le script :

```powershell
$env:BGG_API_TOKEN="votre-token-bgg"
npm run enrich:bgg
```

Il :

- lit la base normalisée ;
- recherche les jeux via l’API XML BoardGameGeek ;
- tient compte des titres alternatifs ;
- récupère `bggId`, `bggUrl`, `imageUrl`, `thumbnailUrl` ;
- utilise un cache local `.cache/bgg-image-cache.json` ;
- espace les appels pour éviter les requêtes trop rapprochées ;
- produit `reports/bgg-enrichment-report.json` ;
- écrit les enrichissements dans `src/data/gameImageOverrides.json`, sans modifier le seed brut.

Les titres ambigus ne sont pas enrichis automatiquement. Ils sont listés dans le rapport pour correction manuelle.

## PWA

L’app inclut :

- `public/manifest.webmanifest` ;
- `public/sw.js` ;
- `public/exogamefinder-icon.svg` ;
- enregistrement du service worker en production.

## Limites connues

- Pas d’authentification réelle en V1.
- Les validations de contribution ne modifient pas encore automatiquement les champs ciblés.
- Les images sont stockées dans un fichier d’overrides séparé du seed JSON, pour éviter les enrichissements destructifs.
- Le bundle production dépasse légèrement 500 kB à cause de l’admin et de Supabase dans le même chunk.

## Prochaines améliorations

- Supabase Auth avec politiques de rôles.
- Tables Supabase `games`, `contributions`, `locations`, `audit_log`.
- Application automatique des contributions approuvées.
- Recherche BGG assistée directement dans l’admin.
- Code splitting des routes admin et fiche jeu.
- Mode offline plus riche pour les images déjà consultées.
