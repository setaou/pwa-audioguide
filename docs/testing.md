# Guide des Tests & Outils de Démonstration

Ce document décrit l'organisation des tests automatisés, la stratégie d'isolation des données de test et les scripts de génération des médias de démonstration.

---

## 1. Stratégie d'Isolation des Tests

Pour garantir des tests fiables, rapides et reproductibles en intégration continue (CI) sans dépendre de fichiers audio ou d'images volumineux :

- Le dossier **`content/`** (contenant les médias réels de démonstration de la Cathédrale de Tours) est **strictement ignoré par Git** (`content/.gitignore`).
- Les tests unitaires et E2E s'exécutent exclusivement contre le dossier **`tests/fixtures/`**, qui contient :
  - `tests/fixtures/config.yml` : Configuration racine pointant vers `content_dir: "tests/fixtures/content"`.
  - `tests/fixtures/content/fr/` et `en/` : Fichiers YAML, Markdown, images JPEG minimales et pistes audio réelles ultra-courtes en `.webm` et `.m4a`.

---

## 2. Exécution des Tests

### Lancer l'Intégralité de la Suite
```bash
npm test
```
Cette commande exécute d'abord les tests unitaires/intégration puis la suite End-to-End Playwright.

### Tests Unitaires & d'Intégration
```bash
npm run test:unit
# ou directement : bash tests/run-all-tests.sh
```

La suite valide séquentiellement 6 axes critiques :
1. **`test-config.js` :** Validation stricte des schémas YAML (racine et langues, intégrité des clés UI, correspondances tours/steps et transitions).
2. **`test-carousel.js` :** Parsing Markdown et regroupement des images consécutives en carrousel tactile.
3. **`test-player.js` :** Machine d'état du lecteur audio, support bi-source, timeline virtuelle unifiée et transitions.
4. **`test-service-worker.js` :** Algorithme de découpage HTTP Range 206 et logique de mise en cache du préchargeur.
5. **`test-app-flow.js` :** Navigation SPA, changement de langue, persistance `localStorage`, paramètre `content_dir` et cycle de pulsation lumineuse du bouton Suivant.
6. **`test-mock-assets.js` :** Vérification de l'existence et de l'intégrité de l'ensemble des fichiers fixtures.

### Tests End-to-End (E2E avec Playwright)
```bash
npm run test:e2e
# ou : npx playwright test
```

Playwright démarre automatiquement le serveur local `scripts/serve.js` et exécute les scénarios dans un navigateur Chromium réel :
- **`tests/e2e/online-flow.spec.js` :** Parcours utilisateur complet : choix de langue, sélection d'un circuit, navigation d'étape en étape, interaction avec le carrousel, lecture audio, enchaînement automatique des transitions et seeking.
- **`tests/e2e/offline-tour.spec.js` :** Téléchargement préalable du parcours dans `CacheStorage`, **coupure réseau complète** (`context.setOffline(true)`), puis vérification du bon fonctionnement 100% hors-ligne (textes, images, streaming audio avec seeking).

---

## 3. Paramètres d'URL pour Débogage et Tests Manuels

Lors de vos tests dans un navigateur :

- **`http://localhost:8080/?dev=1` :**
  - Désactive et désenregistre le Service Worker.
  - Purge le `CacheStorage` et force le rechargement réseau immédiat sans cache.
  - Décode les pistes audio en mémoire (`Blob` URL) pour permettre le seek même si le serveur HTTP utilisé ne gère pas les requêtes `Range`.
- **`http://localhost:8080/?config=tests/fixtures/config.yml` :**
  - Charge l'application sur le jeu de fixtures de test plutôt que sur le contenu de démonstration réel.

---

## 4. Outils de Démonstration (Tours)

Pour générer ou valider les données réelles du monument de démonstration (Cathédrale Saint-Gatien de Tours) :

```bash
# Valider la cohérence des médias réels de démo :
npm run validate:demo

# Générer uniquement les fichiers de configuration config.yml :
npm run generate:demo:configs

# Générer uniquement les pistes audio de transition inter-étapes :
npm run generate:demo:transitions

# Régénérer l'ensemble des médias démo (textes, images Wikimedia, audios TTS Kokoro) :
npm run generate:demo
```

> **Prérequis pour `generate:demo` :** Python 3 avec les paquets du venv (`.venv/`) et l'utilitaire système `ffmpeg` pour la conversion et l'encodage des formats audio WebM Opus et M4A AAC.
