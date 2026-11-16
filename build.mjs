import { createHash } from 'node:crypto';
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
// Versão Monochrome, para o cliente comparar em /monochrome.
await copyFile('monochrome.html', 'dist/monochrome.html');
await mkdir('dist/css', { recursive: true });
await mkdir('dist/js', { recursive: true });
for (const file of ['style.css', 'monochrome.css', 'mono-app.css', 'forms.css', 'app.css']) await copyFile(`css/${file}`, `dist/css/${file}`);
for (const file of ['foam.js', 'monochrome.js', 'script.js', 'app.js', 'mono-app.js']) await copyFile(`js/${file}`, `dist/js/${file}`);
await copyFile('manifest.webmanifest', 'dist/manifest.webmanifest');
await cp('icons', 'dist/icons', { recursive: true });
await mkdir('dist/assets', { recursive: true });
for (const file of ['moto.webp', 'detalhe.webp']) await copyFile(`assets/${file}`, `dist/assets/${file}`);
await mkdir('dist/admin/css', { recursive: true });
await mkdir('dist/admin/js', { recursive: true });
await copyFile('admin/index.html', 'dist/admin/index.html');
await copyFile('admin/admin.css', 'dist/admin/css/admin.css');
await copyFile('admin/admin.js', 'dist/admin/js/admin.js');

// Cabeçalhos de segurança e link /app para a Cloudflare (mesmo conteúdo do netlify.toml).
const CSP = "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
await writeFile('dist/_headers', `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: ${CSP}

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json
`);
await writeFile('dist/_redirects', '/app /monochrome?instalar=1 302\n');

// Service worker com versão calculada a partir dos arquivos publicados:
// qualquer mudança no site gera um cache novo nos celulares.
const hash = createHash('sha256');
for (const entry of (await readdir('dist', { recursive: true, withFileTypes: true })).sort((a, b) => `${a.parentPath}/${a.name}`.localeCompare(`${b.parentPath}/${b.name}`))) {
  if (!entry.isFile()) continue;
  const path = `${entry.parentPath}/${entry.name}`;
  hash.update(path.replaceAll('\\', '/'));
  hash.update(await readFile(path));
}
const version = hash.digest('hex').slice(0, 10);
await writeFile('dist/sw.js', (await readFile('sw.js', 'utf8')).replace('__VERSAO__', version));
console.log(`Service worker versão ${version}`);
