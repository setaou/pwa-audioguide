#!/usr/bin/env python3
"""
Generates authentic demo assets and configurations for Tours Cathedral (Cathédrale Saint-Gatien):
1. Writes root and localized YAML configuration files (config.yml, content/{fr,en}/config.yml).
2. Downloads Wikimedia Commons public domain photographs.
3. Writes comprehensive historical markdown texts with multi-image carousels.
4. Generates multi-format audio narrations (WebM Opus & M4A AAC) via Kokoro TTS and ffmpeg.
"""

import argparse
import os
import subprocess
import urllib.request
import shutil
import time

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT_DIR, 'content')

ROOT_CONFIG_YAML = """monument:
  name: "Cathédrale Saint-Gatien de Tours"
  subtitle: "Chef-d'œuvre gothique & vitraux du XIIIe siècle"
  cover_image: "content/fr/cathedral-cover.jpg"

content_dir: "content"

default_language: "fr"
fallback_language: "en"

languages:
  - code: "fr"
    name: "Français"
    flag: "🇫🇷"
  - code: "en"
    name: "English"
    flag: "🇬🇧"
"""

CONFIG_DATA = {
    'fr': """monument:
  name: "Cathédrale Saint-Gatien de Tours"
  subtitle: "Chef-d'œuvre gothique & vitraux du XIIIe siècle"
  badge: "Monument Historique"

ui:
  select_language: "Choisir la langue / Select language"
  headphones_tip_title: "Visite avec oreillettes"
  headphones_tip_text: "Fonctionne 100% hors-ligne. Branchez vos écouteurs et laissez-vous guider au fil des étapes."
  start_tours: "Découvrir les parcours de visite"
  tours_title: "Parcours de visite"
  back_to_home: "Retour à l'accueil"
  back_to_tours: "Retour aux parcours"
  select_step: "Choisir une étape"
  offline_badge: "💾 Hors-ligne"
  offline_download: "Télécharger pour écoute hors-ligne"
  downloading: "Téléchargement {percent}%..."
  offline_ready: "✓ Disponible hors-ligne"
  steps_count: "{count} étapes"
  step_of: "Étape {current} sur {total}"
  step_loading: "Chargement..."
  step_unavailable: "Texte non disponible."
  step_error: "Erreur lors du chargement de l'étape."
  prev: "Préc"
  next: "Suiv"
  prev_step_title: "Étape précédente"
  next_step_title: "Étape suivante"
  skip_back_title: "Reculer de 10 secondes"
  skip_forward_title: "Avancer de 10 secondes"
  play_pause_title: "Lecture / Pause"
  audio_progress: "Progression audio"
  prev_image: "Image précédente"
  next_image: "Image suivante"
  carousel_slide: "Image {0}"
  settings_btn_title: "Paramètres"
  settings_title: "Paramètres"
  settings_dev_mode: "Mode développeur"
  settings_dev_mode_desc: "Contourne le Service Worker et les caches"
  settings_autoplay: "Lecture automatique"
  settings_autoplay_desc: "Lance l'audio automatiquement à chaque étape"
  settings_clear_cache: "Purger le cache et recharger"
  settings_close: "Fermer"

tours:
  - id: "express"
    title: "Visite Express - Les Essentiels"
    description: "Découvrez l'essentiel en 15 minutes : la spectaculaire façade flamboyante, l'envolée de la nef gothique et le chœur rayonnant."
    duration: "15 min"
    badge: "Express (15 min)"
    steps:
      - "facade"
      - "nave"
      - "choir-stained-glass"

  - id: "complete"
    title: "Grand Parcours Découverte"
    description: "Une exploration complète de 45 minutes : architecture flamboyante, verrières médiévales, tombeau Renaissance et cloître de la Psalette."
    duration: "45 min"
    badge: "Complet (45 min)"
    steps:
      - "facade"
      - "nave"
      - "choir-stained-glass"
      - "stained-glass-martin"
      - "royal-tomb"
      - "rose-window"
      - "cloisters"

  - id: "stained-glass"
    title: "Vitraux & Lumières Médiévales"
    description: "Une immersion approfondie de 30 minutes dans l'un des ensembles de vitraux des XIIIe et XIVe siècles les plus préservés d'Europe."
    duration: "30 min"
    badge: "Art & Vitraux"
    steps:
      - "choir-stained-glass"
      - "stained-glass-martin"
      - "stained-glass-creation"
      - "rose-window"

steps:
  - id: "facade"
    title: "La Façade Occidentale"
    text_file: "facade.md"
    audio:
      webm: "facade.webm"
      m4a: "facade.m4a"
    transitions:
      "nave":
        audio:
          webm: "facade-to-nave.webm"
          m4a: "facade-to-nave.m4a"

  - id: "nave"
    title: "La Nef et les Grandes Voûtes"
    text_file: "nave.md"
    audio:
      webm: "nave.webm"
      m4a: "nave.m4a"
    transitions:
      "choir-stained-glass":
        audio:
          webm: "nave-to-choir.webm"
          m4a: "nave-to-choir.m4a"

  - id: "choir-stained-glass"
    title: "Les Vitraux Radiants du Chœur"
    text_file: "choir.md"
    audio:
      webm: "choir.webm"
      m4a: "choir.m4a"
    transitions:
      "stained-glass-martin":
        audio:
          webm: "choir-to-martin.webm"
          m4a: "choir-to-martin.m4a"
      "royal-tomb":
        audio:
          webm: "choir-to-tomb.webm"
          m4a: "choir-to-tomb.m4a"
      "rose-window":
        audio:
          webm: "choir-to-rose.webm"
          m4a: "choir-to-rose.m4a"

  - id: "stained-glass-martin"
    title: "La Verrière Légendaire de Saint Martin"
    text_file: "martin.md"
    audio:
      webm: "martin.webm"
      m4a: "martin.m4a"
    transitions:
      "stained-glass-creation":
        audio:
          webm: "martin-to-creation.webm"
          m4a: "martin-to-creation.m4a"
      "royal-tomb":
        audio:
          webm: "martin-to-tomb.webm"
          m4a: "martin-to-tomb.m4a"

  - id: "stained-glass-creation"
    title: "La Verrière de la Création et du Salut"
    text_file: "creation.md"
    audio:
      webm: "creation.webm"
      m4a: "creation.m4a"
    transitions:
      "rose-window":
        audio:
          webm: "creation-to-rose.webm"
          m4a: "creation-to-rose.m4a"

  - id: "royal-tomb"
    title: "Le Tombeau des Enfants de Charles VIII"
    text_file: "tomb.md"
    audio:
      webm: "tomb.webm"
      m4a: "tomb.m4a"
    transitions:
      "rose-window":
        audio:
          webm: "tomb-to-rose.webm"
          m4a: "tomb-to-rose.m4a"

  - id: "rose-window"
    title: "La Grande Rose et le Grand Orgue"
    text_file: "rose.md"
    audio:
      webm: "rose.webm"
      m4a: "rose.m4a"
    transitions:
      "cloisters":
        audio:
          webm: "rose-to-cloisters.webm"
          m4a: "rose-to-cloisters.m4a"

  - id: "cloisters"
    title: "Le Cloître de la Psalette"
    text_file: "cloisters.md"
    audio:
      webm: "cloisters.webm"
      m4a: "cloisters.m4a"
""",
    'en': """monument:
  name: "Tours Cathedral (Saint-Gatien)"
  subtitle: "Gothic Masterpiece & 13th-Century Stained Glass"
  badge: "Historic Monument"

ui:
  select_language: "Select language / Choisir la langue"
  headphones_tip_title: "Earphones recommended"
  headphones_tip_text: "Operates 100% offline. Plug in your earphones and immerse yourself in the audio tour."
  start_tours: "Explore Tour Circuits"
  tours_title: "Tour Circuits"
  back_to_home: "Back to home"
  back_to_tours: "Back to tours"
  select_step: "Select a step"
  offline_badge: "💾 Offline"
  offline_download: "Download for offline visit"
  downloading: "Downloading {percent}%..."
  offline_ready: "✓ Offline Ready"
  steps_count: "{count} steps"
  step_of: "Step {current} of {total}"
  step_loading: "Loading..."
  step_unavailable: "Text not available."
  step_error: "Error loading step."
  prev: "Prev"
  next: "Next"
  prev_step_title: "Previous step"
  next_step_title: "Next step"
  skip_back_title: "Rewind 10 seconds"
  skip_forward_title: "Forward 10 seconds"
  play_pause_title: "Play / Pause"
  audio_progress: "Audio progress"
  prev_image: "Previous image"
  next_image: "Next image"
  carousel_slide: "Slide {0}"
  settings_btn_title: "Settings"
  settings_title: "Settings"
  settings_dev_mode: "Developer Mode"
  settings_dev_mode_desc: "Bypasses Service Worker and caches"
  settings_autoplay: "Autoplay"
  settings_autoplay_desc: "Starts audio automatically on each step"
  settings_clear_cache: "Clear cache and reload"
  settings_close: "Close"

tours:
  - id: "express"
    title: "Express Tour - The Highlights"
    description: "Discover the essentials in 15 minutes: the soaring flamboyant facade, the Gothic nave, and the luminous radiant choir."
    duration: "15 min"
    badge: "Express (15 min)"
    steps:
      - "facade"
      - "nave"
      - "choir-stained-glass"

  - id: "complete"
    title: "Grand Discovery Tour"
    description: "A comprehensive 45-minute journey: flamboyant architecture, medieval windows, the royal Renaissance tomb, and the serene Psalette cloister."
    duration: "45 min"
    badge: "Complete (45 min)"
    steps:
      - "facade"
      - "nave"
      - "choir-stained-glass"
      - "stained-glass-martin"
      - "royal-tomb"
      - "rose-window"
      - "cloisters"

  - id: "stained-glass"
    title: "Medieval Stained Glass & Light"
    description: "An in-depth 30-minute exploration of one of Europe's most intact ensembles of 13th- and 14th-century stained glass."
    duration: "30 min"
    badge: "Art & Windows"
    steps:
      - "choir-stained-glass"
      - "stained-glass-martin"
      - "stained-glass-creation"
      - "rose-window"

steps:
  - id: "facade"
    title: "The Western Facade"
    text_file: "facade.md"
    audio:
      webm: "facade.webm"
      m4a: "facade.m4a"
    transitions:
      "nave":
        audio:
          webm: "facade-to-nave.webm"
          m4a: "facade-to-nave.m4a"

  - id: "nave"
    title: "The Gothic Nave and Vaults"
    text_file: "nave.md"
    audio:
      webm: "nave.webm"
      m4a: "nave.m4a"
    transitions:
      "choir-stained-glass":
        audio:
          webm: "nave-to-choir.webm"
          m4a: "nave-to-choir.m4a"

  - id: "choir-stained-glass"
    title: "The Radiant Choir Stained Glass"
    text_file: "choir.md"
    audio:
      webm: "choir.webm"
      m4a: "choir.m4a"
    transitions:
      "stained-glass-martin":
        audio:
          webm: "choir-to-martin.webm"
          m4a: "choir-to-martin.m4a"
      "royal-tomb":
        audio:
          webm: "choir-to-tomb.webm"
          m4a: "choir-to-tomb.m4a"
      "rose-window":
        audio:
          webm: "choir-to-rose.webm"
          m4a: "choir-to-rose.m4a"

  - id: "stained-glass-martin"
    title: "The Saint Martin Stained Glass"
    text_file: "martin.md"
    audio:
      webm: "martin.webm"
      m4a: "martin.m4a"
    transitions:
      "stained-glass-creation":
        audio:
          webm: "martin-to-creation.webm"
          m4a: "martin-to-creation.m4a"
      "royal-tomb":
        audio:
          webm: "martin-to-tomb.webm"
          m4a: "martin-to-tomb.m4a"

  - id: "stained-glass-creation"
    title: "The Creation and Genesis Window"
    text_file: "creation.md"
    audio:
      webm: "creation.webm"
      m4a: "creation.m4a"
    transitions:
      "rose-window":
        audio:
          webm: "creation-to-rose.webm"
          m4a: "creation-to-rose.m4a"

  - id: "royal-tomb"
    title: "Tomb of the Children of Charles VIII"
    text_file: "tomb.md"
    audio:
      webm: "tomb.webm"
      m4a: "tomb.m4a"
    transitions:
      "rose-window":
        audio:
          webm: "tomb-to-rose.webm"
          m4a: "tomb-to-rose.m4a"

  - id: "rose-window"
    title: "The West Rose Window and Grand Organ"
    text_file: "rose.md"
    audio:
      webm: "rose.webm"
      m4a: "rose.m4a"
    transitions:
      "cloisters":
        audio:
          webm: "rose-to-cloisters.webm"
          m4a: "rose-to-cloisters.m4a"

  - id: "cloisters"
    title: "The Psalette Cloister"
    text_file: "cloisters.md"
    audio:
      webm: "cloisters.webm"
      m4a: "cloisters.m4a"
"""
}

IMAGES = {
    'cathedral-cover.jpg': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Tours_-_Cath%C3%A9drale_Saint-Gatien_-_Exterior_-_01.jpg',
    'facade-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/6/67/Tours_-_Cath%C3%A9drale_Saint-Gatien_-_Exterior_-_01.jpg',
    'facade-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Tours_-_Cath%C3%A9drale_Saint-Gatien_-_Exterior_-_02.jpg',
    'nave-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/4/41/Tours_-_cath%C3%A9drale_Saint-Gatien_-_nef.jpg',
    'nave-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Tours_-_Cath%C3%A9drale_Saint-Gatien_-_vo%C3%BBtes_de_la_nef.jpg',
    'choir-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Cath%C3%A9drale_de_Tours_-_verri%C3%A8re_de_Saint_Martin_1.jpg',
    'choir-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/5/5d/Tours_-_Cath%C3%A9drale_Saint-Gatien_-_Exterior_-_05.jpg',
    'martin-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Cath%C3%A9drale_Saint-Gatien_-_int%C3%A9rieur_-_vitrail_%28Tours%29_%281%29.jpg',
    'martin-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/9/91/Cath%C3%A9drale_Saint-Gatien_-_int%C3%A9rieur_-_vitrail_%28Tours%29_%282%29.jpg',
    'creation-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/a/ac/Tours_%28Indre-et-Loire%29_-_Cath%C3%A9drale_Saint-Gatien_-_Vitrail_%22La_cr%C3%A9ation%22_XIIIe_%28baie_216%29_%2851282607643%29.jpg',
    'creation-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Cath%C3%A9drale_Saint-Gatien_-_int%C3%A9rieur_-_vitrail_%28Tours%29_%283%29.jpg',
    'tomb-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/1/10/Tomb_of_the_children_of_Charles_VIII_Tours.jpg',
    'tomb-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Tomb_of_the_children_of_Charles_VIII_Tours_2.jpg',
    'rose-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Cath%C3%A9drale_de_Tours_-_rosace_et_orgue.jpg',
    'rose-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/9/94/Tours_-_Cath%C3%A9drale_Saint-Gatien_-_Exterior_-_06.jpg',
    'cloisters-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Tours_-_Clo%C3%AEtre_de_la_Psalette_-_Ext%C3%A9rieur_-_1.jpg',
    'cloisters-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/0/06/Tours_-_Clo%C3%AEtre_de_la_Psalette_-_Ext%C3%A9rieur_-_2.jpg'
}

STEPS_DATA = {
    'fr': {
        'facade': {
            'text': """## La Façade Occidentale Flamboyante

La façade de la cathédrale Saint-Gatien de Tours constitue l'un des sommets incontestés du **gothique flamboyant** en France. Érigée pour l'essentiel entre le début du XVe siècle et le premier quart du XVIe siècle en pierre de tuffeau de Touraine, elle déploie une prodigieuse dentelle minérale sculptée qui semble défier la pesanteur.

![Vue d'ensemble de la façade occidentale et de ses deux tours culminant à près de 70 mètres](facade-1.jpg)
![Détail des voussures flamboyantes et des délicats gâbles ajourés des portails](facade-2.jpg)

### Une dentelle de pierre et trois portails sculptés
Observez l'élévation des trois portails en tiers-point, surmontés de hauts gâbles ajourés et de voussures foisonnantes où s'entremêlent rinceaux de feuillages, dais et figures d'anges musiciens. Bien que les statues de saints des trumeaux aient souffert des guerres de Religion, l'architecture conserve une inventivité ornementale saisissante.

### Le dialogue entre Gothique et Renaissance
Levez le regard vers le sommet des deux tours qui culminent à près de 70 mètres. Remarquez la transition : les soubassements et contreforts gothiques cèdent progressivement la place à des couronnements octogonaux coiffés de lanternons Renaissance. Cet étagement exceptionnel illustre le carrefour stylistique qui s'opère en Val de Loire sous les règnes de Charles VIII et Louis XII.""",
            'narration': "Bienvenue devant la façade occidentale de la cathédrale Saint-Gatien de Tours. Prenez le temps de lever les yeux vers cette splendide dentelle de pierre calcaire. Construite à la fin du Moyen Âge, elle incarne l'apogée du style gothique flamboyant avec ses trois portails sculptés et ses gâbles élancés. Remarquez les deux tours qui s'élèvent à près de soixante-dix mètres de hauteur : à leur sommet, les lanternons octogonaux annoncent déjà la première Renaissance française, reflet du rayonnement royal des châteaux de la Loire."
        },
        'nave': {
            'text': """## La Nef et les Grandes Voûtes Gothiques

En franchissant les portails, l'obscurité de l'entrée s'efface pour laisser place à un vaisseau de pierre d'une harmonie lumineuse exemplaire. La nef centrale s'élève à près de **29 mètres de hauteur**, guidant irrésistiblement le regard vers le chœur.

![Perspective majestueuse le long de la nef centrale vers le chœur rayonnant](nave-1.jpg)
![Détail des voûtes sur croisée d'ogives et des faisceaux de colonnettes](nave-2.jpg)

### Une construction séculaire maîtrisée
Le chantier de la nef s'est étalé sur plus de deux siècles, du XIIIe siècle jusqu'au milieu du XVe siècle. Malgré cette durée considérable, les maîtres d'œuvre successifs ont respecté le parti architectural originel, maintenant une continuité exemplaire dans le profil des nervures et l'alignement des piliers fasciculés.

### L'élévation à trois niveaux
Admirez l'équilibre de l'élévation intérieure : au rez-de-chaussée, les grandes arcades brisées ouvrent sur les collatéraux ; au niveau intermédiaire, un élégant triforium ajouré allège la structure ; au sommet, les vastes fenêtres hautes inondent l'édifice d'une clarté diffuse. L'ossature en arcs d'ogive reporte les poussées vers les arcs-boutants extérieurs, permettant ainsi d'ouvrir largement les murs à la lumière.""",
            'narration': "Vous voici au cœur de la nef de Saint-Gatien. Laissez votre regard s'élever le long des faisceaux de colonnettes jusqu'aux voûtes sur croisées d'ogives, suspendues à vingt-neuf mètres au-dessus du sol. Remarquez la remarquable homogénéité de ce vaisseau, dont la construction dura pourtant plus de deux siècles. Les grandes arcades, le triforium ajouré et les fenêtres hautes composent une élévation classique et lumineuse qui guide naturellement vos pas vers le chœur."
        },
        'choir': {
            'text': """## Les Vitraux Radiants du Chœur (XIIIe siècle)

Le chevet et l'abside de la cathédrale de Tours conservent l'un des ensembles de **verrières médiévales du XIIIe siècle** les plus exceptionnels et complets d'Europe occidentale. Contemporaines des vitraux de la Sainte-Chapelle de Paris, ces baies hautes constituent un écrin de lumière colorée d'une ferveur intacte.

![Les verrières légendaires du chœur rayonnant consacrées au Christ et aux saints](choir-1.jpg)
![Vue extérieure du chevet rayonnant et de ses arcs-boutants étagés](choir-2.jpg)

### La théologie de la lumière médiévale
Au XIIIe siècle, la lumière qui traverse le vitrail est perçue par les théologiens comme la manifestation visible du divin (la *lux divina*). Les maîtres-verriers tourangeaux ont utilisé des verres soufflés à la bouche teintés dans la masse, dominés par l'alliance mythique des rouges rubis et des bleus cobalt.

### Une disposition théologique rigoureuse
Les quinze baies hautes du chœur déploient un programme iconographique savamment articulé : au centre, la verrière axiale célèbre l'Incarnation et la Passion du Christ, entourée par les récits de l'Ancien Testament et les vies exemplaires des apôtres et des saints évangélisateurs de la Gaule.""",
            'narration': "Avancez jusqu'au fond de la cathédrale et contemplez les verrières hautes du chœur. Vous admirez ici un trésor inestimable : quinze baies du treizième siècle miraculeusement parvenues jusqu'à nous. Remarquez l'intensité vibrante du rouge rubis et la profondeur du bleu cobalt, comparables à ceux de la Sainte-Chapelle de Paris. À cette époque, la lumière filtrée par le verre était vue comme une présence céleste illuminant les récits sacrés au-dessus de l'autel."
        },
        'martin': {
            'text': """## La Verrière Légendaire de Saint Martin

Parmi les verrières du XIIIe siècle du chœur, celle consacrée à **saint Martin de Tours** revêt une importance historique et spirituelle capitale pour la Touraine et toute la chrétienté occidentale.

![La verrière légendaire racontant les épisodes marquants de la vie de saint Martin](martin-1.jpg)
![Détail d'un médaillon du XIIIe siècle montrant la finesse du trait de grisaille](martin-2.jpg)

### La bande dessinée du Moyen Âge
Organisée en registres superposés de médaillons géométriques (quadrilobes et cercles), la verrière fonctionne comme un grand livre d'images accessible à tous les pèlerins. On y reconnaît le jeune légionnaire romain partageant son manteau avec un pauvre aux portes d'Amiens, sa conversion, son baptême et ses nombreux miracles accomplis en Gaule.

### Une œuvre de mémoire locale
Devenu évêque de Tours en 371 et fondateur des abbayes de Ligugé et Marmoutier, saint Martin fit de la cité tourangelle un pôle de pèlerinage majeur du monde chrétien. Les détails anatomiques, les plis des drapés et l'expressivité des visages peints à la grisaille témoignent de la virtuosité des ateliers royaux de verriers du Val de Loire.""",
            'narration': "Tournez votre regard vers la verrière consacrée à saint Martin, grande figure de la Touraine et apôtre des Gaules. Ce vitrail se lit de bas en haut comme une chronique illustrée. Dans les médaillons médiévaux, observez la célèbre scène où Martin, encore soldat romain, tranche son manteau d'un coup d'épée pour en vêtir un mendiant. La finesse des visages peints à la grisaille et la vivacité des couleurs racontent la vie du saint évêque qui attira tant de pèlerins à Tours."
        },
        'creation': {
            'text': """## La Verrière de la Création et du Salut

Au cœur de l'abside rayonnante, la **baie 216** déploie une fresque lumineuse grandiose retraçant les origines du monde selon la Genèse et l'accomplissement du Salut chrétien.

![La verrière de la Création du XIIIe siècle et son agencement de médaillons](creation-1.jpg)
![Détail des baies supérieures de l'abside rayonnant sous le soleil](creation-2.jpg)

### Des médaillons narratifs d'une richesse infinie
Chaque médaillon de cette verrière présente une composition miniaturisée saisissante : la séparation des eaux et de la lumière, la création des astres, des animaux et du premier couple humain, Adam et Ève. La précision des gestes et la diversité des tons ocres, jaunes et verts complètent la palette royale bleu et rouge.

### L'art verrier au XIIIe siècle : prouesse technique
Réalisés par assemblage de petits morceaux de verre soufflé sertis dans des résilles de plomb, ces vitraux devaient résister aux assauts du vent tout en laissant filtrer un maximum de clarté. L'armature métallique en barlotières soutient l'ensemble et souligne le rythme architectural de la baie gothique.""",
            'narration': "Approchez-vous de la verrière de la Création, l'une des baies les plus fascinantes du treizième siècle. À travers une succession de médaillons délicats, le maître-verrier illustre la Genèse : le chaos originel, la création des étoiles, des animaux et les premiers pas d'Adam et Ève dans le jardin d'Éden. Admirez l'incroyable prouesse technique de ces artisans, assemblant des centaines de pièces de verre soufflé dans des résilles de plomb pour composer cette fresque cosmique."
        },
        'tomb': {
            'text': """## Le Tombeau des Enfants de Charles VIII et Anne de Bretagne

Érigé dans le transept sud de la cathédrale, ce monument funéraire d'une grâce infinie est unanimement reconnu comme l'un des premiers et plus purs chefs-d'œuvre de la **Renaissance française**.

![Le somptueux tombeau en marbre de Carrare sculpté par l'atelier de Michel Colombe](tomb-1.jpg)
![Détail des angelots et des rinceaux Renaissance ornant le soubassement](tomb-2.jpg)

### Un monument de deuil royal
Commandé par la reine Anne de Bretagne et le roi Charles VIII, ce cénotaphe était destiné à abriter les dépouilles de leurs enfants morts en bas âge : Charles-Orland, dauphin de France décédé à l'âge de trois ans en 1495, et son jeune frère Charles, disparu à quelques semaines de vie en 1496.

### Michel Colombe et Jérôme Pacherot : la fusion des arts
Achevé en 1506, le monument réunit le sculpteur breton **Michel Colombe** et le maître marbrier italien **Jérôme Pacherot**. Sur la dalle supérieure reposent les gisants des deux enfants royaux en prière, veillés par des anges aux ailes délicatement éployées. Sur la cuve de marbre blanc de Carrare, le décor d'arabesques, de trophées et d'angelots italianisants marque l'entrée triomphale du renouveau de l'art renaissant en Val de Loire.""",
            'narration': "Arrêtez-vous devant ce monument en marbre blanc de Carrare, pur chef-d'œuvre de la première Renaissance française achevé en quinze cent six. Commandé par Anne de Bretagne et Charles VIII pour leurs enfants morts en bas âge, ce tombeau allie la tradition des gisants médiévaux à la grâce italienne. Observez la tendresse des deux angelots soutenant les écus royaux et l'extrême finesse des arabesques sculptées sur le socle par l'atelier de Michel Colombe et Jérôme Pacherot."
        },
        'rose': {
            'text': """## La Grande Rose et le Grand Orgue Historique

Au revers de la façade occidentale, le regard est happé par l'éblouissante composition formée par la **grande rose du XIVe siècle** et le buffet sculpté du **Grand Orgue**.

![La grande rose occidentale illuminant le buffet monumental de l'orgue historique](rose-1.jpg)
![Vue détaillée du buffet Renaissance en chêne sculpté et de sa tuyauterie](rose-2.jpg)

### La géométrie rayonnante de la rose
D'un diamètre impressionnant, la rose occidentale déploie un lacis géométrique de meneaux de pierre rayonnants qui se ramifient en fleurs de lys et en quadrilobes flamboyants. À la différence des verrières du chœur, les vitraux du XIVe siècle utilisent largement le jaune d'argent et des verres plus clairs, diffusant une lumière dorée et aérienne.

### Un instrument de musique d'exception
Suspendu en nid d'hirondelle au-dessus de la tribune, le buffet en chêne massif sculpté a été offert au début du XVIe siècle par l'archevêque Martin de Beaune. Remanié à l'époque romantique, cet orgue grandiose compte aujourd'hui quatre claviers, un pédalier et cinquante-six jeux, offrant une acoustique chaleureuse réputée dans le monde entier.""",
            'narration': "Retournez-vous vers l'entrée ouest et levez la tête vers la tribune. Vous contemplez la majestueuse rose du quatorzième siècle et le magnifique buffet du grand orgue. Observez la géométrie éclatante de la rose, dont les verres plus clairs et dorés éclairent la nef au coucher du soleil. En dessous, le meuble en chêne sculpté offert par l'archevêque Martin de Beaune au seizième siècle abrite un orgue symphonique remarquable, régulièrement célébré lors de concerts prestigieux."
        },
        'cloisters': {
            'text': """## Le Cloître de la Psalette

Adossé au flanc nord du chœur de la cathédrale, le **cloître de la Psalette** forme un ensemble monastique et capitulaire préservé d'une quiétude absolue, classé au titre des Monuments Historiques.

![Les galeries voûtées du cloître de la Psalette ouvrant sur le jardin intérieur](cloisters-1.jpg)
![Détail de l'escalier à vis Renaissance et des voûtes finement nervurées](cloisters-2.jpg)

### Le lieu des chanoines et de la musique
Son nom pittoresque de « Psalette » provient des enfants de chœur qui venaient y apprendre le chant des psaumes et la liturgie au cours du Moyen Âge. Le cloître servait également de lieu de travail et de méditation pour les chanoines du chapitre cathédral.

### Une féerie d'architecture gothique et renaissance
Composé de trois galeries construites entre les années 1440 et 1520, le cloître témoigne d'une transition stylistique remarquable. Tandis que les voûtes retombent sur des culs-de-lampe figuratifs médiévaux, le célèbre escalier à vis extérieur et la librairie capitulaire annoncent la Renaissance avec leurs pilastres délicats et leurs médaillons sculptés.""",
            'narration': "Pénétrez à présent dans le cloître de la Psalette, adossé au flanc nord de la cathédrale. C'est ici que les jeunes clercs apprenaient autrefois le chant des psaumes, qui a donné son nom au lieu. En longeant ces galeries voûtées ouvrant sur un jardin paisible, admirez l'escalier à vis Renaissance et la délicatesse des sculptures. Véritable havre de paix et de silence, ce cloître offre une conclusion contemplative parfaite à votre découverte de Saint-Gatien."
        }
    },
    'en': {
        'facade': {
            'text': """## The Flamboyant Western Facade

The western facade of Saint-Gatien Cathedral in Tours stands as an undisputed pinnacle of **Flamboyant Gothic** architecture in France. Erected between the early 15th and early 16th centuries from local Touraine limestone, it presents a breathtaking stone lacework that appears to defy gravity.

![General view of the western facade and its twin towers rising nearly 70 meters](facade-1.jpg)
![Detail of the flamboyant mouldings and delicate openwork gables above the portals](facade-2.jpg)

### Stone Lace and Three Sculpted Portals
Take in the dramatic elevation of the three pointed portals, crowned with towering perforated gables and luxuriant mouldings carved with intertwined acanthus leaves, canopies, and musician angels. While some portal statues suffered during the Wars of Religion, the structural ornament retains an astounding creative vigor.

### The Dialogue between Gothic and Renaissance
Look up toward the peaks of both towers rising nearly 70 meters high. Notice the subtle architectural transition: the Gothic buttresses and spires give way to graceful octagonal domes and lantern crowns. This harmony reflects the vibrant artistic crossroads of the Loire Valley under Kings Charles VIII and Louis XII.""",
            'narration': "Welcome to the western facade of Saint-Gatien Cathedral in Tours. Take a moment to gaze up at this astonishing stone lacework carved from local limestone. Erected in the late Middle Ages, it embodies the zenith of the Flamboyant Gothic style with its three sculpted portals and towering perforated gables. Notice the twin towers rising nearly seventy meters above: at their summit, octagonal Renaissance crowns already herald the French Renaissance, reflecting the royal splendor of the Loire Valley."
        },
        'nave': {
            'text': """## The Gothic Nave and Soaring Vaults

Stepping inside, the dim threshold opens into a magnificent vessel of stone characterized by luminous harmony. The central nave reaches a lofty height of **29 meters (95 feet)**, drawing the visitor's gaze irresistibly toward the choir.

![Majestic perspective along the central nave toward the radiant choir](nave-1.jpg)
![Detail of the ribbed vaults and bundled colonnettes rising to the ceiling](nave-2.jpg)

### Centuries of Masterful Construction
Building the nave spanned more than two centuries, from the 13th through the mid-15th century. Despite this long duration, successive master builders honored the original architectural scheme, ensuring flawless continuity in the rib profiles and clustered pillars.

### The Three-Tier Elevation
Admire the equilibrium of the interior elevation: the ground floor pointed arches open onto spacious aisles; the middle level features an elegant glazed triforium that lightens the structure; and the upper clerestory windows bathe the sacred space in serene daylight. The ribbed vaulting channels structural weight down to external flying buttresses, enabling the walls to dissolve into glowing glass.""",
            'narration': "You are now standing in the central nave of Saint-Gatien Cathedral. Allow your gaze to follow the bundled stone colonnettes upward to the ribbed vaults soaring twenty-nine meters above the floor. Notice the remarkable harmony of this vast nave, whose construction took over two hundred years. The towering arches, the delicate triforium gallery, and the expansive upper windows create a classic, luminous elevation that draws you naturally toward the choir."
        },
        'choir': {
            'text': """## The Radiant Choir Stained Glass (13th Century)

The apse and choir of Tours Cathedral preserve one of Western Europe's most intact and complete ensembles of **13th-century medieval stained glass**. Contemporary with the windows of Sainte-Chapelle in Paris, these upper clerestories create a breathtaking shrine of colored light.

![The radiant stained glass windows of the choir dedicated to Christ and the saints](choir-1.jpg)
![Exterior view of the radiating apse and stepped flying buttresses](choir-2.jpg)

### Medieval Theology of Divine Light
In the 13th century, light passing through stained glass was revered by theologians as a physical manifestation of the divine (*lux divina*). Glassmakers in Tours used mouth-blown glass tinted in the molten pot, dominated by the legendary contrast of ruby reds and deep cobalt blues.

### A Rigorous Iconographic Scheme
The fifteen upper lancets of the choir present a carefully orchestrated program: the central axial window celebrates the Incarnation and Passion of Christ, flanked by Old Testament narratives and the heroic lives of the apostles and evangelists of early Gaul.""",
            'narration': "Walk forward into the high choir and look up at the upper clerestory windows. You are gazing upon a priceless artistic treasure: fifteen thirteenth-century stained glass windows miraculously preserved through the centuries. Notice the brilliant ruby reds and deep cobalt blues, comparable to the famous Sainte-Chapelle in Paris. To medieval worshippers, light filtered through colored glass was seen as divine grace illuminating sacred history above the high altar."
        },
        'martin': {
            'text': """## The Saint Martin Narrative Window

Among the choir's 13th-century windows, the one dedicated to **Saint Martin of Tours** holds profound historical and spiritual significance for the Loire Valley and Western Christendom.

![The legendary stained glass window illustrating the dramatic life of Saint Martin](martin-1.jpg)
![Detail of a 13th-century medallion highlighting the delicate grisaille painting](martin-2.jpg)

### The Graphic Novel of the Middle Ages
Arranged in stacked geometric medallions (quatrefoils and circles), the window functioned as a vivid picture story for visiting pilgrims. Recognizable scenes include the young Roman soldier cutting his cloak in two for a beggar at the gates of Amiens, his conversion, baptism, and miraculous healings.

### Commemorating the City's Patron
Elected Bishop of Tours in 371 and founder of Ligugé and Marmoutier monasteries, Saint Martin transformed Tours into one of the preeminent pilgrimage destinations of medieval Europe. The expressive painted gestures and delicate grisaille drapery highlight the mastery of Tours' glass ateliers.""",
            'narration': "Direct your attention to the stained glass window dedicated to Saint Martin, patron saint of Tours and apostle of Gaul. This window reads from bottom to top like an illustrated chronicle. Look for the iconic medallion where Martin, still a Roman cavalry officer, cuts his cloak in half with his sword to clothe a shivering beggar. The finely painted facial expressions and vivid ruby tones capture the life of the saint who drew pilgrims from across Europe to Tours."
        },
        'creation': {
            'text': """## The Creation and Genesis Window

In the heart of the radiating apse, **Bay 216** unfolds a majestic visual commentary depicting the origins of the world according to Genesis and the fulfillment of Christian salvation.

![The 13th-century Creation window and its harmonious geometric medallion layout](creation-1.jpg)
![Detail of the radiating apse clerestory windows glowing in natural daylight](creation-2.jpg)

### Richly Detailed Narrative Medallions
Each medallion in this window contains an intricate miniature world: the separation of light from darkness, the placing of heavenly bodies, the creation of animals, and Adam and Eve in the Garden. A sophisticated palette featuring ochre, warm gold, and emerald green complements the traditional royal red and blue.

### Master Crafts of the 13th Century
Crafted by assembling small fragments of mouth-blown pot metal glass joined by grooved lead cames, these windows withstand fierce weather while transmitting vibrant luminance. Robust iron armatures provide structural bracing, underscoring the Gothic framework.""",
            'narration': "Step closer to the Creation window, one of the most captivating bays of the thirteenth-century ensemble. Through a series of delicate medallions, the master glazier depicts the Book of Genesis: primordial chaos giving way to order, the birth of stars, the creation of creatures of the earth and sea, and the dawn of humankind. Marvel at the technical brilliance of these medieval craftsmen who assembled hundreds of colored glass fragments into an enduring cosmic epic."
        },
        'tomb': {
            'text': """## Tomb of the Children of Charles VIII and Anne of Brittany

Erected in the south transept, this monument of consummate grace is universally celebrated as one of the earliest and purest masterworks of the **French Renaissance**.

![The splendid Carrara marble tomb sculpted by the atelier of Michel Colombe](tomb-1.jpg)
![Detail of the Renaissance putti and delicate floral arabesques on the tomb base](tomb-2.jpg)

### A Royal Memorial of Mourning
Commissioned by Queen Anne of Brittany and King Charles VIII, this cenotaph was created to hold the remains of their young sons who died in infancy: Dauphin Charles-Orland, who passed away in 1495 at age three, and his infant brother Charles, who died in 1496 at just a few weeks old.

### Michel Colombe and Girolamo Pacherot
Completed around 1506, the work unites French master sculptor **Michel Colombe** and Italian marble carver **Girolamo Pacherot**. The children's recumbent effigies rest atop the slab in prayer, watched over by winged angels, while the base gleams with classical Italian putti, sirens, and royal coats of arms.""",
            'narration': "Pause before this white Carrara marble monument, a pure jewel of the early French Renaissance completed around fifteen hundred and six. Commissioned by Queen Anne of Brittany and King Charles the Eighth for their young sons who died in childhood, this tomb unites medieval recumbent tradition with Italian elegance. Notice the tenderness of the two cherubs supporting the royal coats of arms, and the exquisite relief carvings crafted by the workshop of Michel Colombe and Girolamo Pacherot."
        },
        'rose': {
            'text': """## The West Rose Window and Historic Grand Organ

Looking back toward the entrance, visitors are greeted by a breathtaking composition: the **14th-century Great Rose Window** and the sculpted oak casework of the **Grand Organ**.

![The great western rose window casting radiant light over the organ casework](rose-1.jpg)
![Detailed view of the Renaissance carved oak organ case and pipes](rose-2.jpg)

### Rayonnant Geometry in Stone and Glass
With its expansive diameter, the western rose displays a dazzling web of stone tracery radiating like wheel spokes into flamboyant trefoils. Unlike the deeply saturated 13th-century choir glass, this 14th-century masterpiece makes generous use of silver stain and lighter tones, flooding the nave with golden afternoon light.

### A Legendary Historic Instrument
Suspended above the western portal, the intricately carved oak organ case was donated in the early 16th century by Archbishop Martin de Beaune. Enlarged over successive centuries, this magnificent instrument features four manuals, pedals, and 56 stops, renowned internationally for its warm acoustic timbre.""",
            'narration': "Turn back toward the western entrance and look up at the gallery. You are contemplating the magnificent fourteenth-century west rose window and the splendid historic pipe organ. Notice the radiant geometric tracery of the rose, whose lighter and golden tones illuminate the nave at sunset. Suspended below, the carved oak organ case, donated in the sixteenth century by Archbishop Martin de Beaune, houses an instrument renowned throughout Europe for its acoustic power."
        },
        'cloisters': {
            'text': """## The Psalette Cloister

Adjoining the northern flank of the cathedral's choir, the **Cloister of La Psalette** is a tranquil monastic precinct of extraordinary charm, designated as a French National Monument.

![The vaulted stone galleries of La Psalette Cloister opening onto the serene courtyard](cloisters-1.jpg)
![Detail of the Renaissance spiral staircase and intricate medieval ceiling bosses](cloisters-2.jpg)

### The Song School and Chapter Haven
The poetic name *Psalette* stems from the choirboys who gathered here to practice psalm singing and liturgical music during the Middle Ages. The cloister also provided a secluded sanctuary for prayer, study, and chapter meetings for the cathedral canons.

### A Blend of Gothic and Renaissance Grace
Comprising three gallery wings built between the 1440s and 1520s, the cloister captures an evocative stylistic transition. While the vaulted walkways feature expressive medieval carved bosses, the famous openwork spiral staircase and chapter library showcase graceful early Renaissance pilasters and classical medallions.""",
            'narration': "Step now into the tranquil Cloister of La Psalette, nestled against the northern flank of the cathedral. This is where young choirboys once learned to sing the sacred psalms that gave the cloister its name. As you stroll along these vaulted galleries surrounding a peaceful garden, admire the Renaissance spiral staircase and delicately carved stonework. This serene haven provides a contemplative and inspiring conclusion to your visit of Saint-Gatien."
        }
    }
}

TRANSITIONS_DATA = {
    'fr': {
        'facade-to-nave': "Franchissez maintenant les grands portails sculptés pour pénétrer dans la fraîcheur et la majesté de la nef centrale.",
        'nave-to-choir': "Avancez lentement le long de l'allée centrale vers la lumière colorée qui irradie depuis le chœur et l'abside.",
        'choir-to-martin': "Déplacez-vous de quelques pas sur votre gauche pour contempler de près la grande verrière dédiée à saint Martin.",
        'choir-to-tomb': "Dirigez-vous vers le croisillon sud du transept, sur votre droite, pour vous approcher du monument de marbre royal.",
        'choir-to-rose': "Revenez au centre de la croisée du transept et tournez-vous vers l'ouest pour contempler la grande rose.",
        'martin-to-creation': "Poursuivez votre déambulation le long du chevet vers la verrière voisine consacrée à la Création et aux origines.",
        'martin-to-tomb': "Traversez le chœur en direction du transept sud pour vous approcher du tombeau de marbre des enfants royaux.",
        'creation-to-rose': "Revenez doucement vers la nef centrale et levez les yeux vers le mur occidental pour découvrir la grande rose.",
        'tomb-to-rose': "Quittez le transept sud et avancez dans la nef vers la sortie pour admirer la rose occidentale et le grand orgue.",
        'rose-to-cloisters': "Dirigez-vous vers le bras nord du transept pour emprunter la porte donnant sur le havre de paix du cloître de la Psalette."
    },
    'en': {
        'facade-to-nave': "Step now through the monumental carved portals into the cool serenity and soaring heights of the nave.",
        'nave-to-choir': "Walk slowly along the central aisle toward the radiant colored light glowing from the high choir and apse.",
        'choir-to-martin': "Take a few steps to your left in the ambulatory to closely admire the legendary narrative window of Saint Martin.",
        'choir-to-tomb': "Make your way to the south transept on your right to approach the delicate royal marble monument.",
        'choir-to-rose': "Return to the transept crossing and turn back toward the west to take in the great rose window and organ.",
        'martin-to-creation': "Continue around the ambulatory to the neighboring clerestory window illustrating the Creation and Genesis.",
        'martin-to-tomb': "Cross through the choir towards the south transept to approach the royal children's marble tomb.",
        'creation-to-rose': "Step back into the central nave and cast your eyes upward to the western wall to behold the great rose window.",
        'tomb-to-rose': "Leave the south transept and face the western entrance to admire the rose window and the Renaissance organ case.",
        'rose-to-cloisters': "Head toward the north transept doorway to discover the tranquil Renaissance haven of the Psalette Cloister."
    }
}

def download_images():
    print("Downloading and optimizing Wikimedia Commons photos...")
    headers = {
        'User-Agent': 'AudioguideToursApp/1.0 (https://github.com/audioguide; contact@audioguide.local) Python-urllib'
    }

    cache_dir = '/tmp/audioguide_img_cache'
    os.makedirs(cache_dir, exist_ok=True)

    for filename, url in IMAGES.items():
        cached_file = os.path.join(cache_dir, filename)
        if not os.path.exists(cached_file) or os.path.getsize(cached_file) < 1000:
            print(f"  -> Downloading {filename} from Wikimedia...")
            raw_tmp = cached_file + '.raw'
            req = urllib.request.Request(url, headers=headers)
            success = False
            for attempt in range(4):
                try:
                    time.sleep(1.0)
                    with urllib.request.urlopen(req) as resp, open(raw_tmp, 'wb') as f:
                        f.write(resp.read())
                    
                    # Resize and optimize to 800px width with ffmpeg for lightweight mobile PWA
                    subprocess.run([
                        'ffmpeg', '-y', '-i', raw_tmp,
                        '-frames:v', '1',
                        '-vf', 'scale=800:-1',
                        '-q:v', '3',
                        cached_file
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

                    if os.path.exists(raw_tmp):
                        os.remove(raw_tmp)
                    success = True
                    break
                except Exception as e:
                    print(f"  Attempt {attempt + 1} warning downloading {filename}: {e}")
                    time.sleep(2)
            if not success:
                print(f"  FAILED to download {filename}")

        # Distribute optimized image to content/fr and content/en
        for lang in ['fr', 'en']:
            dest_dir = os.path.join(CONTENT_DIR, lang)
            os.makedirs(dest_dir, exist_ok=True)
            dest_file = os.path.join(dest_dir, filename)
            if os.path.exists(cached_file):
                shutil.copyfile(cached_file, dest_file)

def write_markdown_files():
    print("Writing markdown content files...")
    for lang, steps in STEPS_DATA.items():
        lang_dir = os.path.join(CONTENT_DIR, lang)
        os.makedirs(lang_dir, exist_ok=True)
        for step_id, data in steps.items():
            md_path = os.path.join(lang_dir, f"{step_id}.md")
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(data['text'].strip() + '\n')
            print(f"  -> Wrote {md_path}")

def get_kokoro_model():
    models_dir = os.path.join(ROOT_DIR, '.cache', 'kokoro')
    os.makedirs(models_dir, exist_ok=True)
    model_path = os.path.join(models_dir, 'kokoro-v1.0.onnx')
    voices_path = os.path.join(models_dir, 'voices-v1.0.bin')

    # Copy from /tmp if already downloaded, or download
    if not os.path.exists(voices_path) or os.path.getsize(voices_path) < 1000:
        if os.path.exists('/tmp/kokoro_models/voices-v1.0.bin'):
            shutil.copyfile('/tmp/kokoro_models/voices-v1.0.bin', voices_path)
        else:
            print("Downloading Kokoro voices pack...")
            urllib.request.urlretrieve(
                'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin',
                voices_path
            )

    if not os.path.exists(model_path) or os.path.getsize(model_path) < 1000:
        if os.path.exists('/tmp/kokoro_models/kokoro-v1.0.onnx'):
            shutil.copyfile('/tmp/kokoro_models/kokoro-v1.0.onnx', model_path)
        else:
            print("Downloading Kokoro ONNX model (300MB)...")
            urllib.request.urlretrieve(
                'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx',
                model_path
            )

    from kokoro_onnx import Kokoro
    return Kokoro(model_path, voices_path)

def encode_audio(temp_wav, webm_dest, m4a_dest):
    # 1. Encode to WebM Opus with ffmpeg
    subprocess.run([
        'ffmpeg', '-y', '-i', temp_wav,
        '-c:a', 'libopus', '-b:a', '64k',
        webm_dest
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # 2. Encode to M4A AAC with ffmpeg
    subprocess.run([
        'ffmpeg', '-y', '-i', temp_wav,
        '-c:a', 'aac', '-b:a', '96k',
        m4a_dest
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    if os.path.exists(temp_wav):
        os.remove(temp_wav)

def generate_audio_files(transitions_only=False):
    print("Generating high-fidelity neural audio files via Kokoro TTS (Kokoro-82M)...")
    import soundfile as sf
    kokoro = get_kokoro_model()

    for lang in ['fr', 'en']:
        lang_dir = os.path.join(CONTENT_DIR, lang)
        voice = 'ff_siwis' if lang == 'fr' else 'af_heart'
        lang_code = 'fr-fr' if lang == 'fr' else 'en-us'

        if not transitions_only:
            steps = STEPS_DATA.get(lang, {})
            for step_id, data in steps.items():
                narration = data['narration']
                temp_wav = f"/tmp/kokoro_{lang}_{step_id}.wav"
                webm_dest = os.path.join(lang_dir, f"{step_id}.webm")
                m4a_dest = os.path.join(lang_dir, f"{step_id}.m4a")

                print(f"  -> Synthesizing Kokoro voice for [{lang}] {step_id} (voice: {voice})...")
                samples, sample_rate = kokoro.create(
                    narration,
                    voice=voice,
                    lang=lang_code,
                    speed=1.0
                )
                sf.write(temp_wav, samples, sample_rate)
                encode_audio(temp_wav, webm_dest, m4a_dest)

        transitions = TRANSITIONS_DATA.get(lang, {})
        for trans_id, trans_text in transitions.items():
            temp_wav = f"/tmp/kokoro_{lang}_{trans_id}.wav"
            webm_dest = os.path.join(lang_dir, f"{trans_id}.webm")
            m4a_dest = os.path.join(lang_dir, f"{trans_id}.m4a")

            print(f"  -> Synthesizing Kokoro transition for [{lang}] {trans_id} (voice: {voice})...")
            samples, sample_rate = kokoro.create(
                trans_text,
                voice=voice,
                lang=lang_code,
                speed=1.0
            )
            sf.write(temp_wav, samples, sample_rate)
            encode_audio(temp_wav, webm_dest, m4a_dest)

def write_config_files():
    print("Writing demo YAML configuration files...")
    root_config_path = os.path.join(ROOT_DIR, 'config.yml')
    with open(root_config_path, 'w', encoding='utf-8') as f:
        f.write(ROOT_CONFIG_YAML.strip() + '\n')
    print(f"  -> Wrote {root_config_path}")

    for lang, content in CONFIG_DATA.items():
        lang_dir = os.path.join(CONTENT_DIR, lang)
        os.makedirs(lang_dir, exist_ok=True)
        config_path = os.path.join(lang_dir, 'config.yml')
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(content.strip() + '\n')
        print(f"  -> Wrote {config_path}")

def main():
    parser = argparse.ArgumentParser(description="Generate demo assets and configuration files.")
    parser.add_argument('--configs-only', action='store_true', help="Only generate YAML configuration files")
    parser.add_argument('--transitions-only', action='store_true', help="Only generate transition audio files")
    parser.add_argument('--skip-audio', action='store_true', help="Skip heavy Kokoro neural audio synthesis")
    parser.add_argument('--skip-images', action='store_true', help="Skip downloading Wikimedia images")
    args = parser.parse_args()

    write_config_files()
    if args.configs_only:
        print("✓ Demo configuration files successfully generated!")
        return

    if not args.skip_images and not args.transitions_only:
        download_images()
    if not args.transitions_only:
        write_markdown_files()
    if not args.skip_audio:
        generate_audio_files(transitions_only=args.transitions_only)
    print("✓ All demo assets successfully generated!")

if __name__ == '__main__':
    main()
