# Directives de Projet - PWA Audioguide pour Monuments Historiques

Ce fichier définit l'architecture, les conventions et les règles opérationnelles pour les agents et développeurs intervenant sur ce dépôt.

---

## 1. Vue d'Ensemble & Objectifs

- **Projet :** Application PWA (Progressive Web App) d'audioguide pour monuments historiques, conçue pour smartphone avec oreillettes, utilisable **100% hors-ligne** (Service Worker + Cache API).
- **Démo préconfigurée :** Cathédrale Saint-Gatien de Tours.
- **Principe fondamental :** Architecture **100% agnostique du monument** et internationalisée. Aucune référence à un monument ou chaîne textuelle d'interface ne doit être codée en dur dans le code applicatif. Tout est piloté par la configuration YAML et le contenu Markdown.

---

## 2. Principes Techniques & Contraintes Architecturales

1. **Zéro Bundler / Zéro Framework / Zéro Étape de Build :**
   - Vanilla JavaScript moderne (ES Modules natifs `import`/`export`), HTML5 sémantique, Vanilla CSS.
   - **Interdiction absolue** d'introduire des outils de build (Vite, Webpack, Rollup, Babel, etc.) ou des frameworks front-end (React, Vue, Svelte, Tailwind, etc.). L'application doit s'exécuter directement dans un navigateur moderne sans compilation.
2. **Dépendances Runtime Minimales :**
   - Aucune dépendance npm pour le runtime. Les bibliothèques tierces nécessaires sont embarquées et versionnées dans `js/vendor/` :
     - `js/vendor/js-yaml.min.js` : analyseur YAML pour la configuration.
     - `js/vendor/marked.min.js` : analyseur Markdown pour le contenu des étapes.
   - Les seules dépendances npm (`devDependencies`) sont réservées à l'outillage de test (`@playwright/test`).
3. **Mobile-First & Touch-First :**
   - Conteneur centré avec largeur maximale de `520px` (`#app-container`).
   - Cibles tactiles d'au moins `44px` conformes aux recommandations d'accessibilité mobile.
   - Carrousels avec gestes tactiles de balayage (swipe gauche/droite), navigation fluide et responsive.
4. **Audio Bi-Format & Timeline Virtuelle Unifiée :**
   - **Formats audio :** Source principale Opus dans conteneur WebM (`.webm`, `audio/webm; codecs=opus`) et repli AAC dans conteneur M4A (`.m4a`, `audio/mp4`) pour la compatibilité iOS Safari.
   - **Transitions audio inter-étapes :** Prise en charge des pistes de transition (`transitions`) pour accompagner le visiteur entre deux étapes.
   - **Timeline virtuelle :** Le lecteur agrège la durée de l'étape et de la transition en une timeline continue, avec seeking transparent et pulsation lumineuse du bouton « Étape suivante » dès la fin du commentaire principal.
5. **Service Worker & Streaming Hors-Ligne (HTTP Range 206) :**
   - Cache-first strategy via `CacheStorage` (`audioguide-v1`).
   - Le Service Worker synthétise des réponses `206 Partial Content` à partir des blobs en cache pour permettre le seeking audio même sans connexion réseau.

---

## 3. Structure du Répertoire

```
audioguide/
├── config.yml                  # Configuration générale du monument (titre, langues, content_dir)
├── index.html                  # Single Page Application (vues : home, tours, step + lecteur persistant)
├── manifest.webmanifest        # Manifeste PWA pour installation mobile
├── service-worker.js           # Mise en cache hors-ligne & synthèse Range HTTP 206
├── content/                    # Contenu réel/démo (ignoré par Git dans content/.gitignore)
│   ├── fr/                     # config.yml, textes .md, images .jpg, audios .webm/.m4a
│   └── en/
├── css/
│   └── styles.css              # Feuille de styles Vanilla CSS mobile-first
├── docs/                       # Documentation technique détaillée
│   ├── architecture.md         # Architecture technique (Vanilla JS, PWA, Service Worker Range 206)
│   ├── configuration.md        # Guide complet de configuration YAML (schémas, UI, transitions)
│   └── testing.md              # Stratégie de tests automatisés, fixtures et outils de démo
├── js/
│   ├── app.js                  # Orchestrateur SPA, routeur de vues, gestion de langue
│   ├── carousel.js             # Moteur de carrousel tactile et rendu Markdown (images consécutives)
│   ├── icons.js                # Dictionnaire d'icônes vectorielles SVG inline
│   ├── player.js               # Contrôleur audio bi-source, timeline virtuelle, seeking
│   ├── preloader.js            # Préchargement et mise en cache des parcours pour le mode hors-ligne
│   └── vendor/                 # Librairies tierces autonomes (js-yaml, marked)
├── scripts/
│   ├── serve.js                # Serveur HTTP local autonome Node.js avec support Range 206
│   ├── generate_demo_assets.py # Script de génération des assets démo (TTS Kokoro, Wikimedia, ffmpeg)
│   └── validate-demo-assets.js # Script de vérification de l'intégrité des médias de démo
└── tests/
    ├── run-all-tests.sh        # Lanceur global des tests unitaires et d'intégration
    ├── test-config.js          # Validation des schémas YAML (racine et langues)
    ├── test-carousel.js        # Tests du carrousel tactile et détection des images Markdown
    ├── test-player.js          # Tests de la machine d'état audio et timeline virtuelle
    ├── test-service-worker.js  # Tests de la synthèse Range 206 et du préchargeur
    ├── test-app-flow.js        # Tests de navigation SPA, persistance langue et pulsation bouton
    ├── test-mock-assets.js     # Tests de présence et d'intégrité des fixtures légères
    ├── fixtures/               # Jeu de données de test isolé et versionné (JAMAIS le dossier content/)
    │   ├── config.yml          # Configuration de test pointant vers content_dir: tests/fixtures/content
    │   └── content/            # Contenu fictif bilingue avec médias ultra-légers
    └── e2e/
        ├── online-flow.spec.js # Parcours utilisateur complet Playwright (en ligne)
        └── offline-tour.spec.js# Parcours Playwright 100% hors-ligne (coupure réseau contextuelle)
```

---

## 4. Commandes Essentielles & Workflows

### Serveur Local de Développement
Le serveur Node.js intégré implémente le support natif des requêtes HTTP `Range` :
```bash
npm run serve
# Écoute par défaut sur http://localhost:8080
```

### Exécution des Tests
Avant toute validation ou commit, la suite de tests doit passer à 100% :
```bash
# Lancer l'intégralité des tests (unitaires + E2E) :
npm test

# Lancer uniquement les tests unitaires et d'intégration :
npm run test:unit

# Lancer uniquement les tests E2E Playwright :
npm run test:e2e
```

### Paramètres d'URL pour le Développement et les Tests
- **Mode Dev (`?dev=1`) :** Désactive le Service Worker, vide le cache et charge les audios sous forme de `Blob` mémoire pour permettre le seek sur les serveurs HTTP statiques sans support Range.
- **Config dynamique (`?config=<chemin>`) :** Charge un fichier YAML alternatif (ex: `?config=tests/fixtures/config.yml`). C'est ce paramètre qui est utilisé pour isoler les tests Playwright des médias de démo.

### Gestion des Médias de Démo
```bash
# Valider les fichiers de démo réels :
npm run validate:demo

# Régénérer les configurations de démo uniquement :
npm run generate:demo:configs

# Régénérer les transitions de démo uniquement :
npm run generate:demo:transitions
```

---

## 5. Conventions de Développement & Règles pour l'Agent

1. **Isolation stricte des Tests et Fixtures :**
   - Ne **jamais** faire dépendre un test unitaire ou E2E du dossier `content/`. Le dossier `content/` est ignoré par Git (`content/.gitignore`) et contient des médias de démo volumineux générés dynamiquement.
   - Tous les tests doivent s'appuyer exclusivement sur `tests/fixtures/`.
2. **Internationalisation (i18n) :**
   - Tout texte d'interface doit provenir de la section `ui:` du fichier `config.yml` de la langue courante (ex: `langConfig.ui.*`).
   - Toujours prévoir le repli vers `fallbackLangConfig.ui.*` si une clé est absente dans la langue choisie.
3. **Gestion Audio & Compatibilité Navigateurs :**
   - Toujours conserver le double format : Opus WebM en premier, AAC M4A en repli.
   - Prendre en compte la politique d'autoplay des navigateurs mobiles (déclenchement après interaction utilisateur).
   - Ne pas casser la prise en charge des requêtes HTTP Range dans `scripts/serve.js` et `service-worker.js`.
4. **Style de Code & Minimalisme :**
   - Privilégier des changements chirurgicaux et directs (principe de simplicité maximale).
   - Respecter les conventions de nommage existantes (camelCase en JS, kebab-case pour les identifiants CSS/DOM et les fichiers).
   - Documenter les fonctions clés avec des blocs JSDoc concis.
   - Exécuter impérativement `npm run test:unit` après toute modification de logique JS ou de structure YAML.
