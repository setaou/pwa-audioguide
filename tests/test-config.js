import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Minimal YAML parser check or using js-yaml vendor bundle
const rootDir = process.cwd();
const rootConfigPath = path.join(rootDir, 'config.yml');
const fixturesConfigPath = path.join(rootDir, 'tests/fixtures/config.yml');
const frConfigPath = path.join(rootDir, 'tests/fixtures/content/fr/config.yml');
const enConfigPath = path.join(rootDir, 'tests/fixtures/content/en/config.yml');
const jsYamlPath = path.join(rootDir, 'js/vendor/js-yaml.min.js');

assert(fs.existsSync(jsYamlPath), 'js/vendor/js-yaml.min.js must exist');
assert(fs.existsSync(rootConfigPath), 'config.yml must exist');
assert(fs.existsSync(fixturesConfigPath), 'tests/fixtures/config.yml must exist');
assert(fs.existsSync(frConfigPath), 'tests/fixtures/content/fr/config.yml must exist');
assert(fs.existsSync(enConfigPath), 'tests/fixtures/content/en/config.yml must exist');

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
assert.strictEqual(rootConfig.fallback_language, 'en', 'rootConfig must define fallback_language as en');
if (rootConfig.content_dir !== undefined) {
  assert(typeof rootConfig.content_dir === 'string' && rootConfig.content_dir.length > 0, 'content_dir must be a non-empty string when provided');
}

// 1b. Verify Fixtures Root Config (with explicit content_dir)
const fixturesConfig = jsyaml.load(fs.readFileSync(fixturesConfigPath, 'utf8'));
assert.strictEqual(fixturesConfig.content_dir, 'tests/fixtures/content', 'fixturesConfig must specify content_dir');

// 2. Helper to verify Language Config
function verifyLanguageConfig(langPath, langCode) {
  const cfg = jsyaml.load(fs.readFileSync(langPath, 'utf8'));
  assert(Array.isArray(cfg.tours), `${langCode} must have tours array`);
  assert(cfg.tours.length >= 1, `${langCode} must have at least one tour`);
  assert(Array.isArray(cfg.steps), `${langCode} must have steps array`);
  assert(cfg.steps.length >= 1, `${langCode} must have at least one step`);

  // Verify localized monument and UI metadata
  assert(cfg.monument, `${langCode} must have localized monument metadata`);
  assert(typeof cfg.monument.name === 'string' && cfg.monument.name.length > 0, `${langCode} monument.name must be non-empty`);
  assert(typeof cfg.monument.subtitle === 'string', `${langCode} monument.subtitle must be a string`);
  assert(typeof cfg.monument.badge === 'string', `${langCode} monument.badge must be a string`);

  assert(cfg.ui && typeof cfg.ui === 'object', `${langCode} must define localized ui strings object`);
  const requiredUiKeys = [
    'select_language',
    'headphones_tip_title',
    'headphones_tip_text',
    'start_tours',
    'tours_title',
    'back_to_home',
    'back_to_tours',
    'select_step',
    'offline_badge',
    'offline_download',
    'downloading',
    'offline_ready',
    'steps_count',
    'step_of',
    'step_loading',
    'step_unavailable',
    'step_error',
    'prev',
    'next',
    'prev_step_title',
    'next_step_title',
    'skip_back_title',
    'skip_forward_title',
    'play_pause_title',
    'audio_progress'
  ];

  for (const k of requiredUiKeys) {
    assert(cfg.ui[k] !== undefined, `${langCode} ui is missing key: ${k}`);
  }

  const stepIds = new Set(cfg.steps.map(s => s.id));

  // Verify steps definitions
  for (const step of cfg.steps) {
    assert(step.id, 'step must have id');
    assert(step.title, `step ${step.id} must have title`);
    assert(step.text_file, `step ${step.id} must have text_file`);
    assert(step.audio, `step ${step.id} must have audio`);
    assert(step.audio.webm, `step ${step.id} must have audio.webm`);
    assert(step.audio.m4a, `step ${step.id} must have audio.m4a`);

    // Verify optional transitions schema if present on step
    if (step.transitions) {
      assert(typeof step.transitions === 'object', `step ${step.id} transitions must be an object`);
      for (const [targetStepId, transObj] of Object.entries(step.transitions)) {
        assert(stepIds.has(targetStepId), `step ${step.id} transition targets unknown step: ${targetStepId}`);
        const audioConf = transObj.audio || transObj;
        assert(audioConf.webm && audioConf.m4a, `transition to ${targetStepId} must provide webm and m4a audio`);
      }
    }
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
