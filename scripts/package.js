import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { createGzip } from 'zlib';
import archiver from 'archiver';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist', 'chrome');
const artifactsDir = join(rootDir, 'artifacts');

if (!existsSync(artifactsDir)) {
  mkdirSync(artifactsDir, { recursive: true });
}

const outputPath = join(artifactsDir, 'chrome-webstore.zip');

async function createZip() {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Created ${outputPath} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(distDir, false);
    archive.finalize();
  });
}

createZip().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
