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

tours:
  - id: "essential"
    title: "Les Grands Incontournables"
    description: "Parcourez les chefs-d'œuvre majeurs : la façade flamboyante, la nef lumineuse, les vitraux et le tombeau royal."
    duration: "40 min"
    badge: "Recommandé"
    steps:
      - "facade"
      - "nave"
      - "choir-stained-glass"
      - "royal-tomb"
      - "rose-window"

  - id: "stained-glass"
    title: "Vitraux & Lumières du XIIIe"
    description: "Une immersion dans l'un des ensembles de vitraux médiévaux les plus complets de France."
    duration: "25 min"
    badge: "Art & Vitraux"
    steps:
      - "choir-stained-glass"
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
      "royal-tomb":
        audio:
          webm: "choir-to-tomb.webm"
          m4a: "choir-to-tomb.m4a"
      "rose-window":
        audio:
          webm: "choir-to-rose.webm"
          m4a: "choir-to-rose.m4a"

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

tours:
  - id: "essential"
    title: "The Highlights Tour"
    description: "Explore the cathedral's essential masterpieces: the Flamboyant facade, soaring nave, stained glass, and royal tomb."
    duration: "40 min"
    badge: "Recommended"
    steps:
      - "facade"
      - "nave"
      - "choir-stained-glass"
      - "royal-tomb"
      - "rose-window"

  - id: "stained-glass"
    title: "13th-Century Stained Glass & Light"
    description: "An immersion into one of the most complete medieval stained glass collections in France."
    duration: "25 min"
    badge: "Art & Windows"
    steps:
      - "choir-stained-glass"
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
      "royal-tomb":
        audio:
          webm: "choir-to-tomb.webm"
          m4a: "choir-to-tomb.m4a"
      "rose-window":
        audio:
          webm: "choir-to-rose.webm"
          m4a: "choir-to-rose.m4a"

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
    'tomb-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/1/10/Tomb_of_the_children_of_Charles_VIII_Tours.jpg',
    'tomb-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/3/33/Tomb_of_the_children_of_Charles_VIII_Tours_2.jpg',
    'rose-1.jpg': 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Cath%C3%A9drale_de_Tours_-_rosace_et_orgue.jpg',
    'rose-2.jpg': 'https://upload.wikimedia.org/wikipedia/commons/9/94/Tours_-_Cath%C3%A9drale_Saint-Gatien_-_Exterior_-_06.jpg'
}

STEPS_DATA = {
    'fr': {
        'facade': {
            'text': """## La Façade Occidentale Flamboyante

La façade de la cathédrale Saint-Gatien de Tours est l'un des sommets du style **gothique flamboyant** en France. Élevée au début du XVIe siècle, elle impressionne par sa délicate dentelle de pierre et la richesse sculpturale de ses trois portails.

![Vue majestueuse de la façade et de ses deux tours culminant à près de 70 mètres](facade-1.jpg)
![Détail des voussures et du décor flamboyant des portails occidentaux](facade-2.jpg)

Remarquez les deux tours : elles s'achèvent par des couronnements en dôme de style **Renaissance**, illustrant la transition architecturale entre le Moyen Âge et la Renaissance française sous les rois de France en Val de Loire.""",
            'narration': "Bienvenue devant la façade occidentale de la cathédrale Saint-Gatien de Tours. Levez les yeux vers cette véritable dentelle de pierre calcaire. Construite à la fin du Moyen Âge, cette façade offre trois portails sculptés surmontés de pignons ajourés. Les deux tours culminent à près de soixante-dix mètres de hauteur et sont couronnées par des lanternons de style Renaissance."
        },
        'nave': {
            'text': """## La Nef et les Grandes Voûtes Gothiques

En franchissant le portail, pénétrez dans un volume monumental et élancé. La nef centrale s'élève à **29 mètres de hauteur**, baignée d'une clarté remarquable grâce à ses grandes baies et son triforium ajouré.

![Perspective majestueuse le long de la nef vers le chœur](nave-1.jpg)
![Détail des voûtes sur croisée d'ogives et de l'élévation gothique rayonnante](nave-2.jpg)

La construction de la nef s'est étalée sur plusieurs générations, du XIIIe au XVe siècle, tout en conservant une parfaite harmonie dans les proportions et les nervures des croisées d'ogives.""",
            'narration': "Vous voici dans la nef de la cathédrale Saint-Gatien. Prenez le temps d'admirer la sensation d'élévation et d'élan vertical. Les voûtes culminent à vingt-neuf mètres de hauteur. L'élévation à trois niveaux comprend les grandes arcades, le triforium ajouré et les fenêtres hautes qui inondent l'espace d'une lumière douce."
        },
        'choir': {
            'text': """## Les Vitraux Radiants du Chœur (XIIIe siècle)

Le chœur de Saint-Gatien conserve l'un des trésors les plus précieux du patrimoine médiéval français : sa collection de **vitraux du XIIIe siècle**.

![Les verrières légendaires du chœur rayonnant consacrées à la vie du Christ et aux saints](choir-1.jpg)
![Vue extérieure du chevet rayonnant et de ses arcs-boutants étagés](choir-2.jpg)

Les verrières de l'abside, contemporaines de la Sainte-Chapelle de Paris, se distinguent par l'intensité de leurs rouges et de leurs bleus cobalt profonds. Elles narrent l'histoire sainte et la vie de saint Martin, patron de la Touraine.""",
            'narration': "Avancez vers le fond du chœur. Vous admirez ici un ensemble exceptionnel de vitraux du treizième siècle, miraculeusement préservés à travers les siècles. Observez l'éclat des rouges et la profondeur des bleus de cobalt. Ces verrières racontent notamment la légende de saint Martin, grande figure de la ville de Tours."
        },
        'tomb': {
            'text': """## Le Tombeau des Enfants de Charles VIII et Anne de Bretagne

Dans le transept sud repose un chef-d'œuvre de la première Renaissance française : le tombeau en marbre de Carrare de Charles-Orland et Charles, enfants du roi **Charles VIII** et de la reine **Anne de Bretagne**.

![Le tombeau de marbre blanc sculpté par l'atelier de Michel Colombe](tomb-1.jpg)
![Détail des angelots soutenant les écus aux armes de France et de Bretagne](tomb-2.jpg)

Sculpté vers 1506 par l'atelier du maître tourangeau **Michel Colombe** et de Jérôme Pacherot, ce monument funéraire allie la tradition des gisants français aux motifs italiens sculptés sur le socle.""",
            'narration': "Arrêtez-vous devant ce magnifique tombeau en marbre blanc de Carrare. Il a été commandé par la reine Anne de Bretagne et le roi Charles VIII pour leurs enfants morts en bas âge. Réalisé vers quinze cent six par l'atelier de Michel Colombe, il marque l'éclosion de la Renaissance artistique dans le Val de Loire avec ses angelots et ses arabesques délicates."
        },
        'rose': {
            'text': """## La Grande Rose et le Grand Orgue Historique

En vous retournant vers la façade ouest, contemplez la majestueuse rose du XIVe siècle ainsi que le buffet du **Grand Orgue**, suspendu au revers du portail central.

![La grande rose occidentale illuminant le buffet de l'orgue historique](rose-1.jpg)
![Vue d'ensemble de la tribune et des tuyaux du grand orgue Renaissance](rose-2.jpg)

Donné par l'archevêque Martin de Beaune au début du XVIe siècle, le buffet en chêne sculpté abrite aujourd'hui un instrument symphonique prestigieux régulièrement joué lors de concerts et d'offices.""",
            'narration': "En vous retournant vers la sortie, levez la tête pour contempler la grande rose occidentale du quatorzième siècle et le splendide buffet du grand orgue. Ce meuble en chêne sculpté date du seizième siècle. Il abrite l'un des plus beaux instruments de la région, réputé pour sa sonorité chaude et puissante."
        }
    },
    'en': {
        'facade': {
            'text': """## The Flamboyant Western Facade

The western facade of Saint-Gatien Cathedral in Tours is a celebrated masterpiece of **Flamboyant Gothic** architecture. Completed in the early 16th century, it is famed for its delicate limestone tracery and sculpted portals.

![Majestic view of the western facade and the two towers rising nearly 70 meters](facade-1.jpg)
![Close-up of the sculpted flamboyant arches of the central portals](facade-2.jpg)

Notice the twin towers: their summits are capped with graceful **Renaissance octagonal domes**, marking the transition between the Middle Ages and the French Renaissance in the royal Loire Valley.""",
            'narration': "Welcome to the western facade of Tours Cathedral. Look up at this astonishing stone lace carved from local limestone. Erected between the fourteenth and sixteenth centuries, it features three sculpted portals surmounted by perforated gables and twin towers crowned with Renaissance domes."
        },
        'nave': {
            'text': """## The Gothic Nave and Soaring Vaults

Stepping inside reveals a breathtaking sense of harmony and light. The central nave reaches a height of **29 meters (95 feet)**, illuminated by expansive clerestory windows.

![Spectacular perspective along the nave toward the choir](nave-1.jpg)
![Ribbed vaults detail demonstrating Rayonnant gothic structural harmony](nave-2.jpg)

Constructed progressively from the 13th to 15th centuries, the nave retains structural equilibrium with its tripartite elevation: arcade, glazed triforium, and upper windows.""",
            'narration': "You are now standing in the central nave of Saint-Gatien Cathedral. Take in the soaring verticality of the vaults rising twenty-nine meters above the stone floor. Notice how the three-tier elevation draws light into the sacred space."
        },
        'choir': {
            'text': """## The 13th-Century Radiant Stained Glass

The apse and choir ambulatory preserve one of France's most intact and luminous ensembles of **13th-century stained glass windows**.

![The luminous radiant stained glass windows depicting biblical scenes and Saint Martin](choir-1.jpg)
![Exterior view of the radiating chapels and stepped flying buttresses](choir-2.jpg)

Contemporary with Sainte-Chapelle in Paris, these masterworks shine with vibrant ruby reds and intense cobalt blues, illustrating the life of Christ and Saint Martin of Tours.""",
            'narration': "Walk toward the choir at the eastern end. You are gazing upon a pristine collection of thirteenth-century stained glass windows. Notice the deep cobalt blues and glowing reds, depicting biblical narratives and the legends of Saint Martin."
        },
        'tomb': {
            'text': """## Tomb of the Children of Charles VIII

Located in the south transept is an exquisite monument of the early French Renaissance: the Carrara marble tomb of Charles-Orland and Charles, sons of **King Charles VIII** and **Queen Anne of Brittany**.

![The white Carrara marble monument sculpted by Michel Colombe's workshop](tomb-1.jpg)
![Close-up of the sculpted Renaissance cherubs supporting royal armorial shields](tomb-2.jpg)

Carved around 1506 by master sculptor **Michel Colombe** and Italian artist Girolamo Pacherot, this monument harmonizes French recumbent effigies with elegant Italianate Renaissance motifs.""",
            'narration': "Stop before this remarkable tomb carved in white Carrara marble. Commissioned by Queen Anne of Brittany and King Charles the Eighth for their young children, it was created around fifteen hundred and six by the workshop of Michel Colombe, heralding the arrival of the Renaissance in France."
        },
        'rose': {
            'text': """## The West Rose Window & Historic Grand Organ

Looking back toward the entrance, admire the 14th-century west rose window framed by the splendid historic **Grand Organ** case.

![The flamboyant western rose window casting colorful light upon the organ](rose-1.jpg)
![The Renaissance carved oak case and pipes of the cathedral organ](rose-2.jpg)

Donated in the early 16th century by Archbishop Martin de Beaune, the intricately carved oak casework houses a renowned pipe organ celebrated for its acoustic power.""",
            'narration': "Turning back toward the entrance, gaze up at the fourteenth-century western rose window and the grand organ. The carved oak case was donated in the sixteenth century and remains one of the finest historic instruments in the Loire Valley."
        }
    }
}

TRANSITIONS_DATA = {
    'fr': {
        'facade-to-nave': "Franchissez à présent les grands portails pour pénétrer dans la fraîcheur et la majesté de la nef.",
        'nave-to-choir': "Avancez lentement le long de la nef centrale en direction du chœur et des verrières lumineuses.",
        'choir-to-tomb': "Dirigez-vous maintenant vers le transept sud, sur votre droite, pour découvrir le tombeau royal.",
        'choir-to-rose': "Revenez vers l'allée centrale et retournez-vous pour contempler la grande rose occidentale.",
        'tomb-to-rose': "Quittez le transept sud et retournez-vous vers l'entrée ouest pour admirer la rose et le grand orgue."
    },
    'en': {
        'facade-to-nave': "Step now through the central portals into the luminous nave of the cathedral.",
        'nave-to-choir': "Walk slowly along the central aisle of the nave toward the radiant stained glass of the choir.",
        'choir-to-tomb': "Turn now to the south transept on your right to discover the royal marble tomb.",
        'choir-to-rose': "Head back along the nave and look up to admire the great western rose window above the organ.",
        'tomb-to-rose': "Leave the south transept and face the western portal to admire the rose window and grand organ."
    }
}

import time

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
                    time.sleep(2.5) # Courtesy delay to respect Wikimedia API guidelines
                    with urllib.request.urlopen(req) as resp, open(raw_tmp, 'wb') as f:
                        f.write(resp.read())
                    
                    # Resize and optimize to 800px width with ffmpeg for lightweight mobile PWA
                    subprocess.run([
                        'ffmpeg', '-y', '-i', raw_tmp,
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
                    time.sleep(3)
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
