#!/usr/bin/env node

/**
 * Lightweight HTTP static server with HTTP Range 206 support.
 * Designed for local testing and Playwright E2E suites.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export function parseRange(rangeHeader, totalLength) {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null;
  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const rawStart = parts[0];
  const rawEnd = parts[1];

  let start = NaN;
  let end = NaN;

  if (rawStart === '' && rawEnd !== '') {
    const suffix = parseInt(rawEnd, 10);
    if (isNaN(suffix) || suffix <= 0) return null;
    start = Math.max(0, totalLength - suffix);
    end = totalLength - 1;
  } else {
    start = parseInt(rawStart, 10);
    end = rawEnd ? parseInt(rawEnd, 10) : totalLength - 1;
  }

  if (isNaN(start) || isNaN(end) || start < 0 || start > end || start >= totalLength) {
    return null;
  }

  end = Math.min(end, totalLength - 1);
  return { start, end, length: end - start + 1 };
}

export function createStaticServer(rootDir = ROOT_DIR) {
  return http.createServer((req, res) => {
    // Only GET and HEAD supported
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      return res.end('Method Not Allowed');
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);
    if (pathname.endsWith('/')) {
      pathname += 'index.html';
    }

    const safePath = path.normalize(path.join(rootDir, pathname));
    if (!safePath.startsWith(rootDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }

    fs.stat(safePath, (err, stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('Not Found');
        }
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('Internal Server Error');
      }

      let filePath = safePath;
      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        try {
          stats = fs.statSync(filePath);
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          return res.end('Not Found');
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const totalSize = stats.size;
      const rangeHeader = req.headers.range;

      if (rangeHeader) {
        const parsed = parseRange(rangeHeader, totalSize);
        if (!parsed) {
          res.writeHead(416, {
            'Content-Range': `bytes */${totalSize}`,
            'Content-Type': 'text/plain',
          });
          return res.end('Requested Range Not Satisfiable');
        }

        const { start, end, length } = parsed;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': length,
          'Content-Type': contentType,
        });

        if (req.method === 'HEAD') return res.end();
        const stream = fs.createReadStream(filePath, { start, end });
        stream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Accept-Ranges': 'bytes',
          'Content-Type': contentType,
        });

        if (req.method === 'HEAD') return res.end();
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
      }
    });
  });
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectRun) {
  const port = parseInt(process.argv[2] || process.env.PORT || '8080', 10);
  const server = createStaticServer(ROOT_DIR);
  server.listen(port, '0.0.0.0', () => {
    console.log(`PWA Audioguide static range server running at http://localhost:${port}/`);
  });
}
