import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webm': 'audio/webm; codecs=opus',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

export function parseRange(rangeHeader, totalSize) {
  if (!rangeHeader || totalSize <= 0) {
    return null;
  }
  const cleanHeader = rangeHeader.replace(/^bytes=+/i, '').trim();
  const parts = cleanHeader.split('-');
  const startStr = parts[0];
  const endStr = parts[1];

  let start;
  let end;

  if (startStr === '') {
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix)) return null;
    start = Math.max(0, totalSize - suffix);
    end = totalSize - 1;
  } else if (endStr === '') {
    start = parseInt(startStr, 10);
    if (isNaN(start) || start >= totalSize) return null;
    end = totalSize - 1;
  } else {
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) return null;
    end = Math.min(end, totalSize - 1);
  }

  return { start, end, length: end - start + 1 };
}

export function createStaticServer(rootDir = process.cwd()) {
  return http.createServer((req, res) => {
    // Only support GET and HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      return res.end('Method Not Allowed');
    }

    const parsedUrl = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Prevent path traversal
    const resolvedRoot = path.resolve(rootDir);
    let safePath = path.resolve(path.join(resolvedRoot, pathname));
    if (!safePath.startsWith(resolvedRoot + path.sep) && safePath !== resolvedRoot) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }

    if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
      safePath = path.join(safePath, 'index.html');
    }

    if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end(`Not Found: ${pathname}`);
    }

    const stat = fs.statSync(safePath);
    const totalSize = stat.size;
    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const range = parseRange(rangeHeader, totalSize);
      if (!range) {
        res.writeHead(416, {
          'Content-Range': `bytes */${totalSize}`,
          'Content-Type': 'text/plain',
        });
        return res.end('Requested Range Not Satisfiable');
      }

      res.writeHead(206, {
        'Content-Range': `bytes ${range.start}-${range.end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': range.length,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });

      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(safePath, { start: range.start, end: range.end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });

      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(safePath).pipe(res);
    }
  });
}

// When executed directly via node scripts/serve.js
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const port = parseInt(process.argv[2] || process.env.PORT || '8080', 10);
  const server = createStaticServer();
  server.listen(port, '0.0.0.0', () => {
    console.log(`PWA Audioguide static range server running at http://localhost:${port}/`);
  });
}
