import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const fixturesDir = path.join(rootDir, 'tests/fixtures');
const jsYamlPath = path.join(rootDir, 'js/vendor/js-yaml.min.js');

// Load js-yaml
const jsYamlCode = fs.readFileSync(jsYamlPath, 'utf8');
const context = {};
new Function('window', 'self', 'globalThis', jsYamlCode)(context, context, context);
const jsyaml = context.jsyaml || globalThis.jsyaml;

const rootConfig = jsyaml.load(fs.readFileSync(path.join(fixturesDir, 'config.yml'), 'utf8'));
const contentDir = path.join(rootDir, rootConfig.content_dir);

// Verify cover image
const coverPath = path.join(rootDir, rootConfig.monument.cover_image);
assert(fs.existsSync(coverPath), `Mock cover image ${coverPath} must exist`);
assert(fs.statSync(coverPath).size > 0, 'Mock cover image must not be empty');

const languages = (rootConfig.languages || []).map(l => l.code);
assert(languages.length >= 2, 'Fixtures must define at least 2 languages');

for (const lang of languages) {
  const langDir = path.join(contentDir, lang);
  assert(fs.existsSync(langDir), `Directory ${langDir} must exist`);

  const langConfig = jsyaml.load(fs.readFileSync(path.join(langDir, 'config.yml'), 'utf8'));
  assert(Array.isArray(langConfig.steps), `steps array missing for ${lang}`);

  for (const step of langConfig.steps) {
    const mdPath = path.join(langDir, step.text_file);
    const webmPath = path.join(langDir, step.audio.webm);
    const m4aPath = path.join(langDir, step.audio.m4a);

    assert(fs.existsSync(mdPath), `Mock markdown file missing: ${mdPath}`);
    assert(fs.existsSync(webmPath), `Mock WebM audio missing: ${webmPath}`);
    assert(fs.existsSync(m4aPath), `Mock M4A audio missing: ${m4aPath}`);

    const mdContent = fs.readFileSync(mdPath, 'utf8');
    assert(mdContent.length > 20, `Mock markdown content in ${step.text_file} must be non-empty`);

    assert(fs.statSync(webmPath).size > 0, `Mock WebM audio ${step.audio.webm} must not be empty`);
    assert(fs.statSync(m4aPath).size > 0, `Mock M4A audio ${step.audio.m4a} must not be empty`);

    // Check all referenced images in markdown exist
    const imgRegex = /!\[.*?\]\(([^)\s]+)/g;
    let match;
    while ((match = imgRegex.exec(mdContent)) !== null) {
      const imgRef = match[1];
      if (!imgRef.startsWith('http://') && !imgRef.startsWith('https://')) {
        const resolvedImgPath = path.join(langDir, imgRef);
        assert(fs.existsSync(resolvedImgPath), `Mock referenced image does not exist: ${resolvedImgPath}`);
        assert(fs.statSync(resolvedImgPath).size > 0, `Mock image ${resolvedImgPath} must not be empty`);
      }
    }
  }
}

console.log('✓ test-mock-assets passed successfully!');
