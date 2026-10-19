#!/usr/bin/env python3
"""
Generates authentic demo assets for Tours Cathedral (Cathédrale Saint-Gatien):
1. Downloads Wikimedia Commons public domain photographs.
2. Writes comprehensive historical markdown texts with multi-image carousels.
3. Generates multi-format audio narrations (WebM Opus & M4A AAC) via espeak and ffmpeg.
"""

import os
import subprocess
import urllib.request
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT_DIR, 'content')

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

def generate_audio_files():
    print("Generating WebM (Opus) and M4A (AAC) audio files via espeak and ffmpeg...")
    for lang, steps in STEPS_DATA.items():
        lang_dir = os.path.join(CONTENT_DIR, lang)
        voice = 'fr' if lang == 'fr' else 'en-us'

        for step_id, data in steps.items():
            narration = data['narration']
            temp_wav = f"/tmp/narrate_{lang}_{step_id}.wav"
            webm_dest = os.path.join(lang_dir, f"{step_id}.webm")
            m4a_dest = os.path.join(lang_dir, f"{step_id}.m4a")

            print(f"  -> Synthesizing voice for [{lang}] {step_id}...")
            # 1. Generate WAV with espeak
            subprocess.run([
                'espeak', '-v', voice, '-s', '140', '-w', temp_wav, narration
            ], check=True)

            # 2. Encode to WebM Opus with ffmpeg
            subprocess.run([
                'ffmpeg', '-y', '-i', temp_wav,
                '-c:a', 'libopus', '-b:a', '48k',
                webm_dest
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

            # 3. Encode to M4A AAC with ffmpeg
            subprocess.run([
                'ffmpeg', '-y', '-i', temp_wav,
                '-c:a', 'aac', '-b:a', '64k',
                m4a_dest
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

            if os.path.exists(temp_wav):
                os.remove(temp_wav)

def main():
    download_images()
    write_markdown_files()
    generate_audio_files()
    print("✓ All demo assets successfully generated!")

if __name__ == '__main__':
    main()
