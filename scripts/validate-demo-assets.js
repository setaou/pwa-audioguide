import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const languages = ['fr', 'en'];

// Verify js-yaml and load parser
const jsYamlPath = path.join(rootDir, 'js/vendor/js-yaml.min.js');
assert(fs.existsSync(jsYamlPath), 'js/vendor/js-yaml.min.js must exist');
const jsYamlCode = fs.readFileSync(jsYamlPath, 'utf8');
const yamlCtx = {};
new Function('window', 'self', 'globalThis', jsYamlCode)(yamlCtx, yamlCtx, yamlCtx);
const jsyaml = yamlCtx.jsyaml || globalThis.jsyaml;

// Verify Root config.yml
const rootConfigPath = path.join(rootDir, 'config.yml');
assert(fs.existsSync(rootConfigPath), 'Root config.yml must exist');
const rootConfig = jsyaml.load(fs.readFileSync(rootConfigPath, 'utf8'));
assert(rootConfig.monument && typeof rootConfig.monument.name === 'string', 'Root config.yml must define monument.name');
assert(Array.isArray(rootConfig.languages) && rootConfig.languages.length >= 2, 'Root config.yml must define languages');

// Verify cover image
const coverPath = path.join(rootDir, 'content/fr/cathedral-cover.jpg');
assert(fs.existsSync(coverPath), 'Cover image content/fr/cathedral-cover.jpg must exist');
assert(fs.statSync(coverPath).size > 1000, 'Cover image must not be empty');

for (const lang of languages) {
  const langDir = path.join(rootDir, 'content', lang);
  assert(fs.existsSync(langDir), `Directory content/${lang} must exist`);

  // Verify language config.yml
  const langConfigPath = path.join(langDir, 'config.yml');
  assert(fs.existsSync(langConfigPath), `Language config missing: content/${lang}/config.yml`);
  const langConfig = jsyaml.load(fs.readFileSync(langConfigPath, 'utf8'));
  assert(langConfig.monument && typeof langConfig.monument.name === 'string', `content/${lang}/config.yml must define monument.name`);
  assert(Array.isArray(langConfig.tours) && langConfig.tours.length >= 3, `content/${lang}/config.yml must define at least 3 tours`);
  assert(Array.isArray(langConfig.steps) && langConfig.steps.length >= 8, `content/${lang}/config.yml must define at least 8 steps`);

  // Verify tours: express (15 min), complete (45 min), stained-glass (30 min)
  const toursMap = new Map(langConfig.tours.map(t => [t.id, t]));
  assert(toursMap.has('express'), `Tour express missing in ${lang}`);
  assert.strictEqual(toursMap.get('express').duration, '15 min', `Tour express duration must be 15 min in ${lang}`);
  assert.strictEqual(toursMap.get('express').steps.length, 3, `Tour express must have 3 steps in ${lang}`);

  assert(toursMap.has('complete'), `Tour complete missing in ${lang}`);
  assert.strictEqual(toursMap.get('complete').duration, '45 min', `Tour complete duration must be 45 min in ${lang}`);
  assert.strictEqual(toursMap.get('complete').steps.length, 7, `Tour complete must have 7 steps in ${lang}`);

  assert(toursMap.has('stained-glass'), `Tour stained-glass missing in ${lang}`);
  assert.strictEqual(toursMap.get('stained-glass').duration, '30 min', `Tour stained-glass duration must be 30 min in ${lang}`);
  assert.strictEqual(toursMap.get('stained-glass').steps.length, 4, `Tour stained-glass must have 4 steps in ${lang}`);

  const stepIds = new Set(langConfig.steps.map(s => s.id));
  for (const tour of langConfig.tours) {
    for (const stepId of tour.steps) {
      assert(stepIds.has(stepId), `Tour ${tour.id} references missing step: ${stepId}`);
    }
  }

  // Verify each step in configuration
  for (const step of langConfig.steps) {
    assert(step.text_file, `Step ${step.id} missing text_file`);
    assert(step.audio && step.audio.webm && step.audio.m4a, `Step ${step.id} missing dual audio sources`);

    const mdPath = path.join(langDir, step.text_file);
    const webmPath = path.join(langDir, step.audio.webm);
    const m4aPath = path.join(langDir, step.audio.m4a);

    assert(fs.existsSync(mdPath), `Markdown file missing: content/${lang}/${step.text_file}`);
    assert(fs.existsSync(webmPath), `WebM audio missing: content/${lang}/${step.audio.webm}`);
    assert(fs.existsSync(m4aPath), `M4A audio missing: content/${lang}/${step.audio.m4a}`);

    const mdContent = fs.readFileSync(mdPath, 'utf8');
    assert(mdContent.length > 100, `Markdown content in ${step.text_file} must be substantive`);

    const webmSize = fs.statSync(webmPath).size;
    const m4aSize = fs.statSync(m4aPath).size;
    assert(webmSize > 500, `WebM audio ${step.audio.webm} must be > 500 bytes (was ${webmSize})`);
    assert(m4aSize > 500, `M4A audio ${step.audio.m4a} must be > 500 bytes (was ${m4aSize})`);

    // Check all referenced images exist
    const imgRegex = /!\[.*?\]\(([^)\s]+)/g;
    let match;
    let imgCount = 0;
    while ((match = imgRegex.exec(mdContent)) !== null) {
      imgCount++;
      const imgRef = match[1];
      if (!imgRef.startsWith('http://') && !imgRef.startsWith('https://')) {
        const resolvedImgPath = path.join(langDir, imgRef);
        assert(fs.existsSync(resolvedImgPath), `Referenced image does not exist: ${resolvedImgPath}`);
        assert(fs.statSync(resolvedImgPath).size > 500, `Image ${resolvedImgPath} is too small or empty`);
      }
    }
    assert(imgCount >= 1, `Step ${step.id} must reference at least one image`);
  }

  // Verify transition audio files
  for (const step of langConfig.steps) {
    if (step.transitions) {
      assert(typeof step.transitions === 'object', `Step ${step.id} transitions must be an object`);
      for (const [targetStepId, transObj] of Object.entries(step.transitions)) {
        assert(stepIds.has(targetStepId), `Transition from ${step.id} targets unknown step: ${targetStepId}`);
        const audioConf = transObj.audio || transObj;
        assert(audioConf.webm, `Transition from ${step.id} to ${targetStepId} missing webm audio`);
        assert(audioConf.m4a, `Transition from ${step.id} to ${targetStepId} missing m4a audio`);

        const transWebm = path.join(langDir, audioConf.webm);
        const transM4a = path.join(langDir, audioConf.m4a);

        assert(fs.existsSync(transWebm), `Transition WebM missing: content/${lang}/${audioConf.webm}`);
        assert(fs.existsSync(transM4a), `Transition M4A missing: content/${lang}/${audioConf.m4a}`);

        const transWebmSize = fs.statSync(transWebm).size;
        const transM4aSize = fs.statSync(transM4a).size;
        assert(transWebmSize > 500, `Transition WebM ${audioConf.webm} must be > 500 bytes (was ${transWebmSize})`);
        assert(transM4aSize > 500, `Transition M4A ${audioConf.m4a} must be > 500 bytes (was ${transM4aSize})`);
      }
    }
  }
}

console.log('✓ Demo assets validated successfully!');
