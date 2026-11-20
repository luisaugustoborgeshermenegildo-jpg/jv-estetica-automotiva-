import { copyFile, mkdir, rm, cp } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await mkdir('dist/css', { recursive: true });
await mkdir('dist/js', { recursive: true });
for (const file of ['style.css', 'forms.css', 'contact.css', 'fonts.css']) await copyFile(`css/${file}`, `dist/css/${file}`);
await copyFile('js/script.js', 'dist/js/script.js');
await mkdir('dist/admin/css', { recursive: true });
await mkdir('dist/admin/js', { recursive: true });
await copyFile('admin/index.html', 'dist/admin/index.html');
await copyFile('admin/admin.css', 'dist/admin/css/admin.css');
await copyFile('admin/admin.js', 'dist/admin/js/admin.js');

await cp('css/assets', 'dist/css/assets', { recursive: true });
await copyFile('css/creditos.html', 'dist/css/creditos.html');

await copyFile('css/monochrome.css', 'dist/css/monochrome.css');
await copyFile('css/monochrome.html', 'dist/css/monochrome.html');

await copyFile('css/original.html', 'dist/css/original.html');
await copyFile('css/motion.css', 'dist/css/motion.css');
await copyFile('css/melhorias.css', 'dist/css/melhorias.css');
await copyFile('js/motion.js', 'dist/js/motion.js');

await copyFile('js/panoramic.js', 'dist/js/panoramic.js');
