import { copyFile, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await mkdir('dist/css', { recursive: true });
await mkdir('dist/js', { recursive: true });
for (const file of ['style.css', 'forms.css', 'contact.css']) await copyFile(`css/${file}`, `dist/css/${file}`);
await copyFile('js/script.js', 'dist/js/script.js');
