// Zips the built `dist/` into a versioned, Web-Store-ready archive at the repo
// root (e.g. gcal-weather-0.1.0.zip). Run after `npm run build`.
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const archiver = createRequire(import.meta.url)('archiver');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(root, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const outPath = resolve(root, `gcal-weather-${version}.zip`);

const output = createWriteStream(outPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Packaged ${outPath} (${archive.pointer()} bytes)`);
});
archive.on('warning', (err) => {
  if (err.code !== 'ENOENT') throw err;
});
archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);
// Zip the *contents* of dist/ so manifest.json sits at the archive root.
archive.directory(distDir, false);
await archive.finalize();
