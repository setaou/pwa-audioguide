import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Minimal YAML parser check or using js-yaml vendor bundle
const rootDir = process.cwd();
const rootConfigPath = path.join(rootDir, 'config.yml');
const frConfigPath = path.join(rootDir, 'content/fr/config.yml');
const enConfigPath = path.join(rootDir, 'content/en/config.yml');
const jsYamlPath = path.join(rootDir, 'js/vendor/js-yaml.min.js');

assert(fs.existsSync(jsYamlPath), 'js/vendor/js-yaml.min.js must exist');
assert(fs.existsSync(rootConfigPath), 'config.yml must exist');
assert(fs.existsSync(frConfigPath), 'content/fr/config.yml must exist');
assert(fs.existsSync(enConfigPath), 'content/en/config.yml must exist');

// Load js-yaml using vm or Function to verify it works in browser/node
const jsYamlCode = fs.readFileSync(jsYamlPath, 'utf8');
const context = {};
const fn = new Function('window', 'self', 'globalThis', jsYamlCode);
fn(context, context, context);
const jsyaml = context.jsyaml || globalThis.jsyaml;
assert(jsyaml && typeof jsyaml.load === 'function', 'jsyaml.load must be available');

// 1. Verify Root Config
const rootConfig = jsyaml.load(fs.readFileSync(rootConfigPath, 'utf8'));
assert(rootConfig.monument, 'rootConfig must have monument');
assert(typeof rootConfig.monument.name === 'string', 'monument.name must be string');
assert(typeof rootConfig.monument.cover_image === 'string', 'monument.cover_image must be string');
assert(Array.isArray(rootConfig.languages), 'languages must be array');
assert(rootConfig.languages.length >= 2, 'languages must have at least fr and en');
const langCodes = rootConfig.languages.map(l => l.code);
assert(langCodes.includes('fr'), 'languages must include fr');
assert(langCodes.includes('en'), 'languages must include en');

// 2. Helper to verify Language Config
function verifyLanguageConfig(langPath, langCode) {
  const cfg = jsyaml.load(fs.readFileSync(langPath, 'utf8'));
  assert(Array.isArray(cfg.tours), `${langCode} must have tours array`);
  assert(cfg.tours.length >= 1, `${langCode} must have at least one tour`);
  assert(Array.isArray(cfg.steps), `${langCode} must have steps array`);
  assert(cfg.steps.length >= 1, `${langCode} must have at least one step`);

  const stepIds = new Set(cfg.steps.map(s => s.id));

  // Verify steps definitions
  for (const step of cfg.steps) {
    assert(step.id, 'step must have id');
    assert(step.title, `step ${step.id} must have title`);
    assert(step.text_file, `step ${step.id} must have text_file`);
    assert(step.audio, `step ${step.id} must have audio`);
    assert(step.audio.webm, `step ${step.id} must have audio.webm`);
    assert(step.audio.m4a, `step ${step.id} must have audio.m4a`);
  }

  // Verify tours definitions
  for (const tour of cfg.tours) {
    assert(tour.id, 'tour must have id');
    assert(tour.title, `tour ${tour.id} must have title`);
    assert(Array.isArray(tour.steps), `tour ${tour.id} must have steps list`);
    assert(tour.steps.length >= 1, `tour ${tour.id} must have at least one step`);
    for (const stepId of tour.steps) {
      assert(stepIds.has(stepId), `tour ${tour.id} references missing stepId: ${stepId}`);
    }
  }
}

verifyLanguageConfig(frConfigPath, 'fr');
verifyLanguageConfig(enConfigPath, 'en');

console.log('✓ test-config passed successfully!');
