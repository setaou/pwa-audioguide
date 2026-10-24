# Guide de Configuration YAML

L'audioguide PWA repose sur une architecture **100% agnostique du monument** et internationalisée : aucun nom de monument, parcours ou libellé textuel n'est codé en dur dans le code source de l'application. Tout le comportement, l'arborescence et l'interface sont pilotés par des fichiers de configuration **YAML**.

---

## 1. Vue d'Ensemble des Fichiers de Configuration

La configuration est structurée en deux niveaux :

```
audioguide/
├── config.yml                  # Configuration racine globale (monument, langues, dossiers)
└── content/                    # Dossier de contenu (paramétrable)
    ├── fr/
    │   ├── config.yml          # Configuration localisée en français (UI, parcours, étapes)
    │   ├── facade.md           # Textes descriptifs en Markdown
    │   └── ...                 # Médias (images .jpg, audios .webm, .m4a)
    └── en/
        ├── config.yml          # Configuration localisée en anglais
        └── ...
```

---

## 2. Configuration Racine (`config.yml`)

Le fichier `config.yml` à la racine définit les métadonnées globales du monument, le chemin des données de contenu et les langues disponibles.

### Structure et Paramètres

```yaml
# Métadonnées globales d'accueil
monument:
  name: "Cathédrale Saint-Gatien de Tours"
  subtitle: "Chef-d'œuvre gothique & vitraux du XIIIe siècle"
  cover_image: "content/fr/cathedral-cover.jpg"

# Dossier racine hébergeant les sous-dossiers de langues (défaut : "content")
content_dir: "content"

# Langue chargée par défaut lors d'une première visite
default_language: "fr"

# Langue de repli si une chaîne UI ou une ressource est manquante
fallback_language: "en"

# Liste des langues proposées sur l'écran d'accueil
languages:
  - code: "fr"
    name: "Français"
    flag: "🇫🇷"
  - code: "en"
    name: "English"
    flag: "🇬🇧"
```

### Description des Champs

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `monument.name` | Chaîne | **Oui** | Nom principal du monument affiché sur la page d'accueil. |
| `monument.subtitle` | Chaîne | Non | Sous-titre ou accroche descriptive. |
| `monument.cover_image` | Chaîne | **Oui** | Chemin relatif vers l'image de couverture d'accueil. |
| `content_dir` | Chaîne | Non | Répertoire des contenus (défaut : `content`). Permet d'isoler des jeux de données alternatifs (ex. : `tests/fixtures/content`). |
| `default_language` | Chaîne | **Oui** | Code ISO de la langue par défaut (`fr`, `en`, etc.). |
| `fallback_language` | Chaîne | **Oui** | Langue utilisée si une clé de traduction est absente dans la langue choisie. |
| `languages` | Liste | **Oui** | Liste des langues affichées sous forme de boutons avec drapeau sur l'accueil. |

---

## 3. Configuration par Langue (`content/<lang>/config.yml`)

Chaque sous-dossier de langue contient son propre fichier `config.yml` décrivant les traductions d'interface (`ui`), les parcours de visite (`tours`) et les étapes détaillées (`steps`).

### A. Métadonnées du Monument Localisées (`monument`)

```yaml
monument:
  name: "Cathédrale Saint-Gatien de Tours"
  subtitle: "Chef-d'œuvre gothique & vitraux du XIIIe siècle"
  badge: "Monument Historique"
```

- `name` : Nom traduit du monument.
- `subtitle` : Sous-titre traduit.
- `badge` : Étiquette textuelle affichée en haut de l'interface (ex. : *"Monument Historique"*, *"UNESCO"*).

---

### B. Dictionnaire d'Interface Utilisateur (`ui`)

Toutes les étiquettes, boutons et messages accessibles de l'interface sont déclarés ici. Certaines chaînes acceptent des variables de substitution entre accolades :
- `{count}` : Nombre d'étapes.
- `{current}` : Étape ou image courante.
- `{total}` : Nombre total d'étapes ou d'images.
- `{percent}` : Pourcentage de téléchargement hors-ligne (0 à 100).

```yaml
ui:
  # Écran d'accueil
  select_language: "Choisir la langue / Select language"
  headphones_tip_title: "Visite avec oreillettes"
  headphones_tip_text: "Fonctionne 100% hors-ligne. Branchez vos écouteurs et laissez-vous guider au fil des étapes."
  start_tours: "Découvrir les parcours de visite"

  # Écran de sélection des parcours
  tours_title: "Parcours de visite"
  back_to_home: "Retour à l'accueil"
  back_to_tours: "Retour aux parcours"
  offline_badge: "💾 Hors-ligne"
  offline_download: "Télécharger pour écoute hors-ligne"
  downloading: "Téléchargement {percent}%..."
  offline_ready: "✓ Disponible hors-ligne"
  start_tour: "Démarrer le parcours"
  tour_sheet_close: "Fermer"
  steps_count: "{count} étapes"

  # Écran d'étape & Navigation
  select_step: "Choisir une étape"
  step_of: "Étape {current} sur {total}"
  step_loading: "Chargement..."
  step_unavailable: "Texte non disponible."
  step_error: "Erreur lors du chargement de l'étape."
  prev: "Préc"
  next: "Suiv"
  prev_step_title: "Étape précédente"
  next_step_title: "Étape suivante"

  # Lecteur Audio persistant
  skip_back_title: "Reculer de 10 secondes"
  skip_forward_title: "Avancer de 10 secondes"
  play_pause_title: "Lecture / Pause"
  audio_progress: "Progression audio"

  # Carrousel d'images
  prev_image: "Image précédente"
  next_image: "Image suivante"
  carousel_slide: "Image {current} sur {total}"
```

> **Mécanisme de repli (Fallback) :** Si une clé est absente du fichier de la langue courante, l'application utilise automatiquement la valeur définie dans la langue de repli (`fallback_language`).

---

### C. Déclaration des Parcours (`tours`)

La liste `tours` organise les circuits proposés aux visiteurs.

```yaml
tours:
  - id: "express"
    title: "Visite Express - Les Essentiels"
    description: "Découvrez l'essentiel en 15 minutes : façade, nef et chœur."
    duration: "15 min"
    badge: "Express (15 min)"
    steps:
      - "facade"
      - "nave"
      - "choir"

  - id: "complete"
    title: "Grand Parcours Découverte"
    description: "Une exploration complète de 45 minutes à travers tout le monument."
    duration: "45 min"
    badge: "Complet (45 min)"
    steps:
      - "facade"
      - "nave"
      - "choir"
      - "cloisters"
```

#### Champs d'un parcours :
- `id` : Identifiant unique du circuit (utilisé pour les ancres URL et l'indexation de cache).
- `title` : Titre affiché sur la carte du parcours.
- `description` : Descriptif court du parcours.
- `duration` : Durée estimée affichée au visiteur (ex. : `"30 min"`).
- `badge` (optionnel) : Badge visuel mis en avant sur la carte.
- `steps` : Liste ordonnée des identifiants d'étapes (`step.id`) composant le parcours.

---

### D. Déclaration des Étapes (`steps`)

La liste `steps` recense chaque point d'intérêt avec ses contenus texte, images et pistes audio.

```yaml
steps:
  - id: "facade"
    title: "La Façade Occidentale"
    text_file: "facade.md"
    audio:
      webm: "facade.webm"
      m4a: "facade.m4a"
    # Transition optionnelle vers l'étape suivante dans le parcours
    transitions:
      "nave":
        audio:
          webm: "vers-nef.webm"
          m4a: "vers-nef.m4a"

  - id: "nave"
    title: "La Nef Lumineuse"
    text_file: "nave.md"
    audio:
      webm: "nave.webm"
      m4a: "nave.m4a"
```

#### Champs d'une étape :
- `id` : Identifiant unique de l'étape.
- `title` : Titre de l'étape affiché dans le lecteur, le sélecteur déroulant et l'en-tête.
- `text_file` : Fichier Markdown situé dans `content/<lang>/` contenant le texte et les images.
- `audio` : Pistes audio principales (dans le dossier `content/<lang>/`) :
  - `webm` : Audio encodé en Opus dans un conteneur WebM (**recommandé, débit optimisé**).
  - `m4a` : Audio encodé en AAC dans un conteneur M4A (**requis pour compatibilité iOS Safari**).
  - `mp3` (optionnel) : Format alternatif universel.
- `transitions` (optionnel) : Dictionnaire associant l'ID de l'étape suivante à une piste audio d'accompagnement à la marche.

---

## 4. Transitions Audio Inter-Étapes

Les transitions audio permettent d'accompagner le visiteur avec un guidage vocal ou une ambiance sonore pendant son déplacement physique d'un point d'intérêt au suivant.

### Fonctionnement de la Timeline Virtuelle Unifiée :
1. **Pendant le commentaire principal :** La durée totale affichée sur la barre de progression agrège la durée de l'étape et celle de la transition (`durée = étape + transition`).
2. **Fin du commentaire principal :** Le lecteur enchaîne immédiatement sur la piste de transition sans coupure ni réinitialisation du curseur.
3. **Pulsation lumineuse incitative :** Dès la fin de la piste principale ou pendant la transition, le bouton tactile **« Étape suivante »** s'anime d'une pulsation lumineuse douce pour inviter le visiteur à progresser vers l'étape suivante.
4. **Seeking continu :** Le visiteur peut se déplacer n'importe où sur l'ensemble de la timeline virtuelle unifiée.

---

## 5. Rendu Markdown & Carrousels d'Images

Le fichier Markdown référencé par `text_file` est parsé par l'application pour générer l'affichage de l'étape :

```markdown
# La Façade Occidentale

Édifiée entre le XIIIe et le XVIe siècle, la façade présente un style gothique flamboyant exceptionnel.

![Détail du portail central](facade-detail.jpg "Portail central sculpté")
![Les tours culminant à 68 mètres](facade-tours.jpg "Vue d'ensemble des tours")

Observez la finesse des voussures et la rose centrale.
```

### Règle de transformation automatique en Carrousel :
- Dès que **deux images Markdown ou plus se suivent consécutivement** (sans texte intermédiaire), le moteur les regroupe automatiquement en un **carrousel tactile swipable**.
- Les légendes des images sont extraites automatiquement de la syntaxe Markdown : `![Texte alternatif](chemin.jpg "Légende affichée")`.
- Toutes les images conservent leur ratio complet sans aucun rognage (`object-fit: contain`).

---

## 6. Validation Automatisée de la Configuration

Le projet intègre un validateur de schéma pour garantir qu'aucune coquille ou incohérence ne vienne casser l'application :

```bash
node tests/test-config.js
```

Ce script vérifie automatiquement :
- L'existence et la validité syntaxique de `config.yml` et de chaque `content/<lang>/config.yml`.
- La présence de toutes les clés d'interface requises (`ui`).
- La cohérence des identifiants : chaque étape référencée dans un circuit `tours` doit exister dans `steps`.
- La validité des cibles de transition : chaque étape cible dans `transitions` doit être une étape existante.
- La présence des deux formats audio (`webm` et `m4a`) pour chaque étape et transition.
