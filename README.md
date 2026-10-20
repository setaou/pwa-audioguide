# Audioguide PWA pour Monuments Historiques

Application PWA (Progressive Web App) d'audioguide pour monuments historiques, conçue pour une écoute sur smartphone avec oreillettes, utilisable **100% hors-ligne** (Service Worker + Cache API).

Démonstration préconfigurée : **Cathédrale Saint-Gatien de Tours** (Val de Loire).

---

## 🏛️ Fonctionnalités

- **Navigation fluide en 3 écrans :**
  1. **Page d'accueil :** Nom et visuel du monument personnalisables, sélecteur de langue dynamique avec drapeaux (Français 🇫🇷 / English 🇬🇧).
  2. **Sélection du parcours :** Choix du circuit de visite avec durée estimée, nombre d'étapes et bouton optionnel de **téléchargement hors-ligne** avec jauge de progression en temps réel.
  3. **Écran d'étape :** Contenu riche en Markdown, carrousel d'images tactile swipable avec légendes, sélecteur d'étape direct en liste déroulante et boutons d'enchaînement Précédent / Suivant.
- **Lecteur Audio persistant en bas d'écran :**
  - Démarrage automatique de la lecture à l'arrivée sur l'étape ou au lancement d'un parcours (avec gestion de la politique d'autoplay des navigateurs).
  - Barre de progression avec curseur tactile de déplacement temporel (seeking).
  - Boutons de saut rapide de **-10s** et **+10s**.
  - Gros bouton tactile Play / Pause avec synchronisation immédiate de l'état.
  - Boutons Étape Précédente / Étape Suivante.
  - Arrêt automatique de la lecture à la fin de la piste (pas de saut automatique non souhaité).
- **Multi-format Audio universel :**
  - **Source principale :** Opus dans un conteneur WebM (`.webm`, `audio/webm; codecs=opus`).
  - **Source de repli (fallback) :** AAC dans un conteneur M4A (`.m4a`, `audio/mp4`) pour compatibilité iOS Safari.
  - Sélection automatique du format optimal supporté lors du préchargement hors-ligne pour économiser la bande passante et le stockage.
- **Carrousel d'images consécutives :**
  - Deux images ou plus consécutives dans le Markdown sont automatiquement détectées et converties en carrousel tactile.
  - Support des gestes tactiles (swipe horizontal gauche/droite), points indicateurs et boutons de navigation.
  - Ajustement dynamique de la hauteur du carrousel et affichage complet des photos sans rognage (`object-fit: contain`).
- **100% Hors-ligne (PWA) :**
  - Service Worker avec stratégie Cache-First pour l'ensemble des ressources applicatives et médias.
  - Synthèse des réponses HTTP `206 Partial Content` (Range requests) pour permettre le déplacement temporel (seek) dans les fichiers audio en mode hors-ligne sans connexion.
- **Architecture 100% Agnostique & Internationalisée :**
  - Aucune référence codée en dur au monument dans le code applicatif.
  - Textes d'interface utilisateur (`ui:`) et métadonnées du monument externalisés dans les fichiers de configuration YAML par langue avec gestion d'une langue de repli (`fallback_language`).
  - Dossier de contenu paramétrable (`content_dir`) pour réutiliser l'application sur n'importe quel site ou monument.

---

## 🛠️ Technologies Utilisées

- **HTML5 & Vanilla CSS :** Design responsive pensé pour mobile, thème moderne sombre ardoise avec accents cathédrale, cibles tactiles >= 44px.
- **Vanilla JavaScript (ES6+) :** Aucun framework lourd (pas de React, Vue, build step ou bundler requis).
- **Configuration :** Intégralement en **YAML** (`js-yaml` embarqué).
- **Textes :** Fichiers **Markdown** (`marked` embarqué).
- **Icônes :** Collection d'icônes vectorielles SVG intégrées (open source).
- **Formats audio :** Opus (WebM) et AAC (M4A).
- **Serveur local :** Serveur statique Node.js intégré avec support HTTP `Range` (`scripts/serve.js`).
- **Tests :** Node.js test runner pour les tests unitaires/intégration et **Playwright** pour les tests End-to-End (E2E).

---

## 📁 Structure des Fichiers

```
audioguide/
├── .github/
│   └── workflows/
│       └── ci.yml              # Pipeline GitHub Actions (tests unitaires & E2E)
├── .gitignore                  # Fichiers et dossiers ignorés par git
├── config.yml                  # Configuration générale du monument & langues
├── index.html                  # Interface SPA de l'application PWA
├── manifest.webmanifest        # Manifeste PWA pour installation mobile
├── package.json                # Dépendances et scripts de développement
├── package-lock.json           # Arbre des dépendances verrouillé
├── playwright.config.js        # Configuration de la suite de tests E2E Playwright
├── README.md                   # Documentation du projet
├── service-worker.js           # Cache hors-ligne & streaming partiel 206
├── content/                    # Configuration et assets des parcours de visite
├── css/
│   └── styles.css              # Styles Vanilla CSS responsive
├── js/
│   ├── app.js                  # Routeur et orchestrateur de l'application
│   ├── carousel.js             # Moteur Markdown & carrousel tactile swipable
│   ├── icons.js                # Bibliothèque d'icônes SVG
│   ├── player.js               # Contrôleur audio bi-source & seekbar
│   ├── preloader.js            # Préchargeur de parcours pour le mode hors-ligne
│   └── vendor/
│       ├── js-yaml.min.js      # Parseur YAML open source
│       └── marked.min.js       # Parseur Markdown open source
├── scripts/
│   ├── generate_demo_assets.py # Script de génération des médias et configs démo
│   ├── serve.js                # Serveur HTTP statique léger avec support HTTP Range 206
│   └── validate-demo-assets.js # Vérification des médias réels de démonstration
└── tests/
    ├── e2e/                    # Suites de tests End-to-End Playwright
    │   ├── offline-tour.spec.js# Test E2E du cycle complet 100% hors-ligne (coupure réseau)
    │   └── online-flow.spec.js # Test E2E du parcours utilisateur complet
    ├── fixtures/               # Jeu de données de test versionné (isolé de la démo)
    │   ├── config.yml          # Configuration fictive pour les tests unitaires et E2E
    │   └── content/            # Contenu fictif bilingue (fr/en) avec images et audios légers
    │       ├── en/             # Étapes et configurations de test en anglais
    │       └── fr/             # Étapes et configurations de test en français
    ├── run-all-tests.sh        # Lanceur global des tests unitaires et d'intégration
    ├── test-app-flow.js        # Test de navigation entre écrans et content_dir
    ├── test-carousel.js        # Test du carrousel d'images consécutives
    ├── test-config.js          # Validation des schémas YAML
    ├── test-mock-assets.js     # Vérification des fichiers et médias fictifs
    ├── test-player.js          # Test de la machine d'état audio
    └── test-service-worker.js  # Test des requêtes Range 206 et du préchargeur
```

---

## 🚀 Lancement Rapide

### 1. Serveur local recommandé (avec support Range)

Le projet intègre un serveur HTTP Node.js autonome (`scripts/serve.js`) qui implémente le support natif des en-têtes `Range` (`206 Partial Content`) nécessaires au déplacement temporel (seeking) dans les fichiers audio :

```bash
npm run serve
# ou : node scripts/serve.js [port] (par défaut : 8080)
```

Ouvrez ensuite votre navigateur sur **`http://localhost:8080`**.

### 2. Autres serveurs statiques alternatifs

Vous pouvez également utiliser n'importe quel serveur HTTP statique :

```bash
# Avec Python 3 :
python3 -m http.server 8080

# Ou avec npx serve :
npx serve -l 8080 .
```

---

## 🎛️ Paramètres d'URL Utiles

L'application accepte des paramètres de requête dans l'URL pour simplifier le développement et les tests automatisés :

### Mode Développement (`?dev=1`)
Ouvrez : **`http://localhost:8080/?dev=1`**

- **Désactivation du Service Worker & purge du cache :** Désenregistre les Service Workers actifs, vide le `CacheStorage` et force le chargement des fichiers avec `cache: 'no-cache'`. Toute modification de code, de texte Markdown ou de fichier YAML est immédiatement visible à l'actualisation.
- **Support du déplacement audio sur serveurs basiques :** Sur les serveurs ne supportant pas les requêtes `Range` (comme `python3 -m http.server`), le mode dev télécharge la piste audio sous forme de `Blob` mémoire (`URL.createObjectURL`), rendant le seeking audio fonctionnel sans serveur compatible Range.

### Configuration Personnalisée (`?config=...`)
Ouvrez par exemple : **`http://localhost:8080/?config=tests/fixtures/config.yml`**

- Permet de charger un fichier de configuration racine alternatif à la volée.
- Utilisé notamment par la suite de tests E2E Playwright pour exécuter les tests sur des fixtures isolées sans altérer le contenu réel du monument.

---

## 📱 Installation sur Smartphone (PWA)

1. Ouvrez l'URL sur Chrome (Android) ou Safari (iOS).
2. Choisissez **"Ajouter à l'écran d'accueil"** (ou "Installer l'application").
3. L'audioguide se lance en plein écran comme une application native et fonctionne même en mode avion après téléchargement préalable d'un parcours.

---

## 🧪 Tests Automatisés

Le projet dispose d'une couverture de tests complète, à la fois unitaire, d'intégration et end-to-end, entièrement isolée du contenu de démo grâce à un jeu de données dédié (`tests/fixtures/`).

### Exécuter tous les tests
```bash
npm test
```
Cette commande exécute séquentiellement les tests unitaires puis la suite Playwright E2E.

### Tests unitaires et d'intégration
```bash
npm run test:unit
# ou : bash tests/run-all-tests.sh
```
Valide en 6 étapes :
1. Les schémas de configuration YAML et la conformité des données.
2. Le moteur de parsing Markdown et le regroupement d'images en carrousel tactile.
3. La machine d'état du lecteur audio bi-source (Opus/AAC) et le calcul de timeline.
4. Le Service Worker, la synthèse des réponses `206 Partial Content` et le préchargeur.
5. Le routeur applicatif, la navigation inter-écrans et la prise en charge de `content_dir`.
6. L'intégrité des médias et fixtures de test.

### Tests End-to-End (E2E Playwright)
```bash
npm run test:e2e
# ou : npx playwright test
```
Exécute les tests dans un navigateur Chromium réel :
- **`tests/e2e/online-flow.spec.js` :** Vérifie le changement de langue, la persistance dans `localStorage`, la sélection d'un circuit, la navigation entre étapes, l'interaction avec le carrousel, la lecture audio, le saut temporel (+10s) et la pause.
- **`tests/e2e/offline-tour.spec.js` :** Enregistre le Service Worker, télécharge le parcours hors-ligne dans le `CacheStorage`, **coupe complètement la connexion réseau** (`setOffline(true)`), puis valide la navigation, l'affichage des textes/images et la lecture/seeking audio 100% hors-ligne.

---

## 📜 Commandes NPM Disponibles

| Commande | Description |
|---|---|
| `npm run serve` | Démarre le serveur statique local Node.js avec support Range 206 (port 8080) |
| `npm test` | Exécute l'ensemble des tests (`test:unit` puis `test:e2e`) |
| `npm run test:unit` | Lance la suite de tests unitaires et d'intégration |
| `npm run test:e2e` | Lance la suite de tests end-to-end avec Playwright |
| `npm run validate:demo` | Valide l'intégrité des médias et configurations réels de la démo de Tours |
| `npm run generate:demo:configs` | Génère uniquement les fichiers `config.yml` de démo pour Tours |
| `npm run generate:demo` | Génère l'ensemble des médias de démo (textes, images, audio TTS Kokoro) |

---

## 🎙️ Médias et Configurations de Démonstration

Pour régénérer les configurations YAML, les textes, photos Wikimedia et pistes audio synthétisées (TTS Kokoro + encodage ffmpeg) :

```bash
# Générer uniquement les fichiers config.yml de démo :
npm run generate:demo:configs

# Tout régénérer (configs, photos, textes, audio) :
npm run generate:demo
```

Pour valider l'intégrité des médias et configurations de démonstration (Tours) :

```bash
npm run validate:demo
```
