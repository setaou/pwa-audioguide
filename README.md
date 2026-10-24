# Audioguide PWA pour Monuments Historiques

Application PWA (Progressive Web App) d'audioguide pour smartphones avec oreillettes, utilisable **100% hors-ligne** (Service Worker + Cache API), sans aucun framework ni étape de compilation.

Démonstration préconfigurée : **Cathédrale Saint-Gatien de Tours**.

---

## 🏛️ Points Clés

- **100% Hors-ligne & PWA :** Téléchargement de parcours en un clic. Le Service Worker émule le support HTTP `206 Partial Content` pour permettre le déplacement temporel (seeking) dans les pistes audio même en mode avion.
- **Audio Bi-Source Universel :** Source principale Opus WebM (`.webm`) et repli AAC M4A (`.m4a`) pour compatibilité totale iOS Safari.
- **Transitions d'Inter-Étapes & Timeline Virtuelle :** Pistes d'accompagnement à la marche entre étapes, timeline continue unifiée et pulsation lumineuse incitative sur le bouton « Suivant ».
- **Carrousels Tactiles Automatiques :** Toute suite d'images consécutives dans le Markdown est automatiquement transformée en carrousel tactile swipable (`object-fit: contain`).
- **Zéro Bundler / Zéro Framework :** Vanilla JavaScript moderne (ES Modules), HTML5, Vanilla CSS. Aucun outil de build requis.
- **100% Agnostique & Internationalisé :** Aucun nom de monument ni texte d'interface codé en dur. Tout est piloté par des fichiers YAML bilingues (FR / EN).

---

## 🚀 Démarrage Rapide

Lancez le serveur local intégré (support natif des requêtes HTTP Range) :

```bash
npm run serve
```

Ouvrez ensuite votre navigateur sur **`http://localhost:8080`**.

> **Astuce de développement (`?dev=1`) :**  
> Ouvrez **`http://localhost:8080/?dev=1`** pour désactiver le Service Worker, purger les caches et charger immédiatement toute modification de code ou de contenu.

---

## 📜 Commandes Disponibles

| Commande | Description |
|---|---|
| `npm run serve` | Démarre le serveur statique local (port 8080, support HTTP Range 206) |
| `npm test` | Exécute l'ensemble des tests automatisés (`test:unit` puis `test:e2e`) |
| `npm run test:unit` | Lance les 6 suites de tests unitaires et d'intégration Node.js |
| `npm run test:e2e` | Lance les tests End-to-End dans Chromium avec Playwright |
| `npm run validate:demo` | Valide l'intégrité des médias et configurations de démo réels |
| `npm run generate:demo` | Régénère l'ensemble des médias de démo (textes, images, audios TTS) |

---

## 📁 Structure du Projet

```
audioguide/
├── config.yml              # Configuration globale du monument et langues
├── index.html              # Interface SPA (vues accueil, parcours, étape et lecteur)
├── manifest.webmanifest    # Manifeste PWA pour installation mobile
├── service-worker.js       # Stratégie de cache hors-ligne et synthèse HTTP Range 206
├── content/                # Contenus et médias de production/démo (ignoré par Git)
├── css/styles.css          # Styles Vanilla CSS mobile-first
├── js/                     # Modules applicatifs (app, player, carousel, preloader)
├── scripts/                # Serveur local (serve.js) et générateurs démo
├── tests/                  # Tests unitaires et E2E Playwright isolés sur tests/fixtures/
└── docs/                   # Documentation technique détaillée
```

---

## 📚 Documentation Détaillée

Pour aller plus loin, consultez les guides thématiques dans le dossier **[`docs/`](docs/)** :

- ⚙️ **[Configuration YAML (`docs/configuration.md`)](docs/configuration.md) :** Guide complet pour configurer un monument, définir les parcours, les étapes, les pistes audio bi-format, les transitions et les textes d'interface.
- 🏗️ **[Architecture Technique (`docs/architecture.md`)](docs/architecture.md) :** Fonctionnement interne des modules ES6, machine d'état audio, carrousel tactile et synthèse Range 206 du Service Worker.
- 🧪 **[Tests & Outils Démo (`docs/testing.md`)](docs/testing.md) :** Organisation des suites de test, isolation des fixtures et scripts de génération des médias de démonstration.
- 🤖 **[Directives Projet IA (`GEMINI.md`)](GEMINI.md) :** Règles et conventions pour les agents IA et contributeurs.
