import * as esbuild from 'esbuild';
import { copyFileSync, cpSync, mkdirSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');
const distDir = join(rootDir, 'dist', 'chrome');

const isWatch = process.argv.includes('--watch');

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });

const entryPoints = [
  { in: join(srcDir, 'background', 'service-worker.ts'), out: 'background/service-worker' },
  { in: join(srcDir, 'pages', 'blocked', 'blocked.ts'), out: 'pages/blocked/blocked' },
  { in: join(srcDir, 'pages', 'options', 'options.ts'), out: 'pages/options/options' },
  { in: join(srcDir, 'content', 'link-rewriter.ts'), out: 'content/link-rewriter' },
];

const buildOptions = {
  entryPoints: entryPoints.map((e) => e.in),
  outdir: distDir,
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: !isWatch,
  sourcemap: isWatch,
  entryNames: '[dir]/[name]',
  outbase: srcDir,
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      console.log('Build complete');
    }

    copyFileSync(join(srcDir, 'manifest.json'), join(distDir, 'manifest.json'));

    mkdirSync(join(distDir, 'rules'), { recursive: true });
    copyFileSync(join(rootDir, 'rules', 'ruleset_base.json'), join(distDir, 'rules', 'ruleset_base.json'));

    cpSync(join(rootDir, 'assets'), join(distDir, 'assets'), { recursive: true });

    // Copy locales for i18n
    cpSync(join(srcDir, '_locales'), join(distDir, '_locales'), { recursive: true });

    copyFileSync(join(srcDir, 'pages', 'blocked', 'blocked.html'), join(distDir, 'pages', 'blocked', 'blocked.html'));
    copyFileSync(join(srcDir, 'pages', 'blocked', 'blocked.css'), join(distDir, 'pages', 'blocked', 'blocked.css'));
    copyFileSync(join(srcDir, 'pages', 'options', 'options.html'), join(distDir, 'pages', 'options', 'options.html'));
    copyFileSync(join(srcDir, 'pages', 'options', 'options.css'), join(distDir, 'pages', 'options', 'options.css'));

    console.log('Assets copied');
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
}

build();
