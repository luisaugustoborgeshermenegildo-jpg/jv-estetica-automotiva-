import { copyFile, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await mkdir('dist/css', { recursive: true });
await mkdir('dist/js', { recursive: true });
for (const file of ['style.css', 'forms.css', 'contact.css']) await copyFile(`css/${file}`, `dist/css/${file}`);
await copyFile('js/script.js', 'dist/js/script.js');
await mkdir('dist/admin/css', { recursive: true });
await mkdir('dist/admin/js', { recursive: true });
await copyFile('admin/index.html', 'dist/admin/index.html');
await copyFile('admin/admin.css', 'dist/admin/css/admin.css');
await copyFile('admin/admin.js', 'dist/admin/js/admin.js');
