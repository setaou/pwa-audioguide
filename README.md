# Audioguide PWA pour Monuments Historiques

Application PWA (Progressive Web App) d'audioguide pour monuments historiques, conçue pour une écoute sur smartphone avec oreillettes, utilisable **100% hors-ligne** (Service Worker + Cache API).

Démonstration préconfigurée : **Cathédrale Saint-Gatien de Tours** (Val de Loire).

---

## 🏛️ Fonctionnalités

- **Navigation fluide en 3 écrans :**
  1. **Page d'accueil :** Nom du monument personnalisable, visuel grand format, sélecteur de langue (Français 🇫🇷 / English 🇬🇧).
  2. **Sélection du parcours :** Choix du circuit de visite avec durée estimée, nombre d'étapes et bouton optionnel de **téléchargement hors-ligne** avec jauge de progression.
  3. **Écran d'étape :** Contenu riche en Markdown, carrousel d'images tactile swipable avec légendes, sélecteur d'étape direct en liste déroulante et boutons d'enchaînement.
- **Lecteur Audio persistant en bas d'écran :**
  - Barre de progression avec curseur tactile de déplacement temporel (seeking).
  - Boutons de saut rapide de **-10s** et **+10s**.
  - Gros bouton tactile Play / Pause.
  - Boutons Étape Précédente / Étape Suivante.
  - Arrêt automatique de la lecture à la fin de la piste (pas de saut automatique non souhaité).
- **Multi-format Audio universel :**
  - **Source principale :** Opus dans un conteneur WebM (`.webm`, `audio/webm; codecs=opus`).
  - **Source de repli (fallback) :** AAC dans un conteneur M4A (`.m4a`, `audio/mp4`) pour compatibilité iOS Safari.
  - Sélection automatique du format compatible lors du préchargement hors-ligne pour économiser la bande passante.
- **Carrousel d'images consécutives :**
  - Deux images ou plus consécutives dans le Markdown sont automatiquement converties en carrousel tactile.
  - Support des gestes tactiles (swipe horizontal gauche/droite), points indicateurs et boutons de navigation.
- **100% Hors-ligne (PWA) :**
  - Service Worker avec stratégie Cache-First.
  - Synthèse des réponses HTTP `206 Partial Content` (Range requests) pour permettre le déplacement temporel (seek) dans les fichiers audio en mode hors-ligne.

---

## 🛠️ Technologies Utilisées

- **HTML5 & Vanilla CSS :** Design responsive pensé pour mobile, thème moderne sombre ardoise avec accents cathédrale, cibles tactiles >= 44px.
- **Vanilla JavaScript (ES6+) :** Aucun framework lourd (pas de React, Vue, build step ou bundler requis).
- **Configuration :** Intégralement en **YAML** (`js-yaml` embarqué).
- **Textes :** Fichiers **Markdown** (`marked` embarqué).
- **Icônes :** Collection d'icônes vectorielles SVG intégrées (open source).
- **Formats audio :** Opus (WebM) et AAC (M4A).

---

## 📁 Structure des Fichiers

```
audioguide/
├── config.yml                  # Configuration générale du monument & langues
├── index.html                  # Interface SPA de l'application PWA
├── manifest.webmanifest        # Manifeste PWA pour installation mobile
├── service-worker.js           # Cache hors-ligne & streaming partiel 206
├── css/
│   └── styles.css              # Styles Vanilla CSS responsive
├── js/
│   ├── app.js                  # Routeur et orchestrateur de l'application
│   ├── player.js               # Contrôleur audio bi-source & seekbar
│   ├── carousel.js             # Moteur Markdown & carrousel tactile swipable
│   ├── preloader.js            # Préchargeur de parcours pour le mode hors-ligne
│   ├── icons.js                # Bibliothèque d'icônes SVG
│   └── vendor/
│       ├── marked.min.js       # Parseur Markdown open source
│       └── js-yaml.min.js      # Parseur YAML open source
├── content/
│   ├── fr/
│   │   ├── config.yml          # Définition des parcours et étapes en français
│   │   ├── cathedral-cover.jpg # Photo de couverture
│   │   ├── facade.md           # Texte de l'étape
│   │   ├── facade.webm         # Piste audio WebM Opus
│   │   ├── facade.m4a          # Piste audio M4A AAC
│   │   ├── facade-1.jpg        # Photos de l'étape
│   │   ├── facade-2.jpg
│   │   └── ...                 # Autres étapes (nave, choir, tomb, rose) à plat
│   └── en/
│       ├── config.yml          # Définition des parcours et étapes en anglais
│       ├── facade.md
│       ├── facade.webm
│       ├── facade.m4a
│       └── ...
├── scripts/
│   ├── generate_demo_assets.py # Script de génération des médias et configs démo
│   └── validate-demo-assets.js # Vérification des fichiers et médias réels de démonstration
└── tests/
    ├── fixtures/               # Contenu et configurations fictifs pour les tests
    ├── run-all-tests.sh        # Lanceur global de tests (isolé du contenu de démo)
    ├── test-config.js          # Validation des schémas YAML
    ├── test-carousel.js        # Test du carrousel d'images consécutives
    ├── test-player.js          # Test de la machine d'état audio
    ├── test-service-worker.js  # Test des requêtes Range 206 et du préchargeur
    ├── test-app-flow.js        # Test de navigation entre écrans et content_dir
    └── test-mock-assets.js     # Vérification des fichiers et médias fictifs
```

---

## 🚀 Lancement Rapide

Pour servir l'application localement avec support du Service Worker :

```bash
# Avec Python 3 :
python3 -m http.server 8080

# Ou avec Node.js :
npx serve -l 8080 .
```

Ouvrez ensuite votre navigateur sur `http://localhost:8080`.

### 🛠️ Mode Développement (`?dev=1`)

Pour modifier le code, les textes Markdown ou les configurations YAML sans interférence de cache :

Ouvrez simplement : **`http://localhost:8080/?dev=1`**

Ce mode active automatiquement des comportements adaptés au développement local :
- **Désactivation du Service Worker & purge du cache :** Désenregistre les Service Workers actifs, supprime les entrées `CacheStorage` et force les requêtes en `cache: 'no-cache'`. Toute modification de fichier est visible immédiatement après actualisation.
- **Support du déplacement audio (seeking) sur serveurs basiques :** Les serveurs locaux légers (comme `python3 -m http.server`) ne supportent pas les en-têtes HTTP `Range` (`206 Partial Content`). En mode dev, le lecteur audio télécharge la piste sous forme de `Blob` mémoire (`URL.createObjectURL`), permettant le déplacement temporel (scrubbing / seeking) sans nécessiter de serveur compatible Range.

### Installation sur Smartphone (PWA)
1. Ouvrez l'URL sur Chrome (Android) ou Safari (iOS).
2. Choisissez **"Ajouter à l'écran d'accueil"** (ou "Installer l'application").
3. L'audioguide se lance en plein écran comme une application native et fonctionne même en mode avion.

---

## 🧪 Tests Automatisés

L'ensemble des fonctionnalités de l'audioguide est couvert par des tests unitaires et d'intégration autonomes, isolés du contenu de démo via des fixtures dédiées (`tests/fixtures/`) :

```bash
bash tests/run-all-tests.sh
```

Le chemin vers le dossier contenant les données de visite peut être personnalisé dans `config.yml` via la directive optionnelle `content_dir` (par défaut `content`).

---

## 🎙️ Médias et Configurations de Démonstration

Pour régénérer les configurations YAML, les textes, photos Wikimedia et pistes audio synthétisées (TTS Kokoro + encodage ffmpeg) :

```bash
# Générer uniquement les fichiers config.yml de démo :
npm run generate:demo:configs
# ou : python3 scripts/generate_demo_assets.py --configs-only

# Tout régénérer (configs, photos, textes, audio) :
npm run generate:demo
# ou : python3 scripts/generate_demo_assets.py
```

Pour valider l'intégrité des médias et configurations de démonstration (Tours) :

```bash
npm run validate:demo
# ou : node scripts/validate-demo-assets.js
```
