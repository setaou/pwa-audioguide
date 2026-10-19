import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const languages = ['fr', 'en'];
const expectedSteps = ['facade', 'nave', 'choir', 'tomb', 'rose'];

// Verify cover image
const coverPath = path.join(rootDir, 'content/fr/cathedral-cover.jpg');
assert(fs.existsSync(coverPath), 'Cover image content/fr/cathedral-cover.jpg must exist');
assert(fs.statSync(coverPath).size > 1000, 'Cover image must not be empty');

for (const lang of languages) {
  const langDir = path.join(rootDir, 'content', lang);
  assert(fs.existsSync(langDir), `Directory content/${lang} must exist`);

  for (const step of expectedSteps) {
    const mdPath = path.join(langDir, `${step}.md`);
    const webmPath = path.join(langDir, `${step}.webm`);
    const m4aPath = path.join(langDir, `${step}.m4a`);

    assert(fs.existsSync(mdPath), `Markdown file missing: content/${lang}/${step}.md`);
    assert(fs.existsSync(webmPath), `WebM audio missing: content/${lang}/${step}.webm`);
    assert(fs.existsSync(m4aPath), `M4A audio missing: content/${lang}/${step}.m4a`);

    const mdContent = fs.readFileSync(mdPath, 'utf8');
    assert(mdContent.length > 50, `Markdown content in ${step}.md must be substantive`);

    const webmSize = fs.statSync(webmPath).size;
    const m4aSize = fs.statSync(m4aPath).size;
    assert(webmSize > 500, `WebM audio ${step}.webm must be > 500 bytes (was ${webmSize})`);
    assert(m4aSize > 500, `M4A audio ${step}.m4a must be > 500 bytes (was ${m4aSize})`);

    // Check all referenced images exist
    const imgRegex = /!\[.*?\]\(([^)\s]+)/g;
    let match;
    while ((match = imgRegex.exec(mdContent)) !== null) {
      const imgRef = match[1];
      if (!imgRef.startsWith('http://') && !imgRef.startsWith('https://')) {
        const resolvedImgPath = path.join(langDir, imgRef);
        assert(fs.existsSync(resolvedImgPath), `Referenced image does not exist: ${resolvedImgPath}`);
        assert(fs.statSync(resolvedImgPath).size > 500, `Image ${resolvedImgPath} is too small or empty`);
      }
    }
  }
}

console.log('✓ test-demo-assets passed successfully!');
