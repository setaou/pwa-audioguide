# Architecture Technique

Ce document détaille les choix d'architecture logicielle, le fonctionnement interne des modules et les mécanismes sous-jacents de la PWA Audioguide.

---

## 1. Principes Fondamentaux

- **Zéro Bundler / Zéro Framework / Zéro Build Step :** L'application est écrite en JavaScript moderne standardisé (ES Modules natifs), HTML5 et Vanilla CSS. Elle ne requiert aucune étape de compilation (pas de Webpack, Vite, Babel ou Rollup).
- **Dépendances tierces isolées :** Les deux seules bibliothèques tierces indispensables (`js-yaml` et `marked`) sont embarquées sous forme minifiée dans `js/vendor/`.
- **Approche Mobile-First & Touch-First :** Interface optimisée pour un usage sur smartphone avec un gabarit centré (`max-width: 520px`), des zones d'interaction `>= 44px` et des contrôles gestuels tactiles (swipe).
- **Architecture 100% Hors-Ligne :** Conçue dès l'origine pour une utilisation en zone blanche ou sous des voûtes épaisses sans couverture réseau mobile.

---

## 2. Modules et Composants Applicatifs

```
js/
├── app.js       # Orchestrateur global et routeur SPA
├── player.js    # Contrôleur audio bi-source et timeline virtuelle
├── carousel.js  # Moteur Markdown et carrousel tactile swipable
├── preloader.js # Gestionnaire de téléchargement et de mise en cache
├── icons.js     # Bibliothèque vectorielle d'icônes SVG
└── vendor/      # Parseurs autonomes (js-yaml, marked)
```

### A. Orchestrateur & Routeur (`js/app.js`)
- **Machine d'états de navigation :** Gère les 3 vues principales (`view-home`, `view-tours`, `view-step`) sans rechargement de page.
- **Gestion linguistique :**
  - Charge dynamiquement `config.yml` puis les configurations de langue correspondantes.
  - Sauvegarde le choix de langue dans `localStorage`.
  - Applique les libellés de l'interface (`ui:`) avec repli transparent vers `fallback_language`.
- **Paramètres de requête supportés :**
  - `?dev=1` : Désactive le Service Worker, vide le cache et télécharge les audios sous forme de Blob mémoire.
  - `?config=<chemin>` : Permet d'injecter une configuration alternative (ex. fixtures de test).

### B. Contrôleur Audio (`js/player.js`)
- **Gestion Bi-Source :** Construit les éléments `<source>` en priorisant Opus WebM (`audio/webm; codecs=opus`) puis AAC M4A (`audio/mp4`).
- **Timeline Virtuelle Unifiée :**
  - Agrège la durée de l'étape et de la transition audio associée (`durée_totale = étape + transition`).
  - Gère la transition sans coupure à la fin de la piste principale.
  - Maintient une position temporelle continue lors du seeking interactif sur la seekbar.
- **Pulsation incitative :** Anime le bouton « Étape suivante » d'une pulsation lumineuse douce dès la fin du commentaire principal ou pendant la transition.

### C. Moteur de Carrousel Tactile (`js/carousel.js`)
- **Détection automatique dans le Markdown :** Intercepte les séquences d'images consécutives pour les assembler dans un composant carrousel tactile.
- **Interactions tactiles :** Gestion native des événements `touchstart`, `touchmove`, `touchend` pour le glissement horizontal (swipe).
- **Respect du ratio photo :** Utilise `object-fit: contain` et adapte dynamiquement la hauteur du conteneur pour éviter tout recadrage intempestif des œuvres ou détails architecturaux.

### D. Préchargeur Hors-Ligne (`js/preloader.js`)
- Télécharge l'ensemble des ressources nécessaires à un parcours (textes Markdown, images, audios).
- Sélectionne automatiquement le format audio optimal supporté par l'environnement (`canPlayType`) afin d'économiser la bande passante et le stockage local de l'appareil.
- Remonte la progression en temps réel pour alimenter la jauge de téléchargement de l'interface.

---

## 3. Fonctionnement Hors-Ligne & Service Worker

Le fichier `service-worker.js` assure l'autonomie totale de l'application :

1. **Stratégie Cache-First :** L'App Shell (fichiers HTML, CSS, JS, icônes et configurations) ainsi que les médias mis en cache sont servis prioritairement depuis le `CacheStorage`.
2. **Synthèse des Requêtes HTTP Range (`206 Partial Content`) :**
   - Les navigateurs mobiles effectuent systématiquement des requêtes d'en-tête `Range: bytes=...` lorsqu'un utilisateur déplace le curseur de lecture audio (seeking).
   - En mode hors-ligne standard, le `CacheStorage` ne répond qu'en `200 OK`, ce qui bloque le seeking sur certains navigateurs (notamment Safari iOS).
   - Le Service Worker analyse l'en-tête `Range`, découpe la portion d'octets demandée dans le `ArrayBuffer` du média en cache et renvoie une réponse HTTP `206 Partial Content` synthétique avec les en-têtes `Content-Range` et `Content-Length` appropriés.

---

## 4. Serveur Statique Local (`scripts/serve.js`)

Pour le développement local et les tests automatisés, un serveur Node.js minimaliste est fourni :
- Ne dépend d'aucun module externe (`node:http`, `node:fs`, `node:path`).
- Implémente le support complet des en-têtes `Range` (`206 Partial Content`).
- Associe les types MIME exacts pour les formats audio (`.webm`, `.m4a`).
