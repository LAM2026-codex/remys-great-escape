import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Content-versioned URLs prevent browsers from reusing artwork from older releases.
const hash = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12);
const world = await readFile('src/world.js', 'utf8');
const game = (await readFile('src/game.js', 'utf8')).replace('./world.js', `./world.js?v=${hash(world)}`);
const css = await readFile('style.css', 'utf8');
const html = (await readFile('index.html', 'utf8'))
  .replace('src="src/game.js"', `src="src/game.js?v=${hash(game)}"`)
  .replace('href="style.css"', `href="style.css?v=${hash(css)}"`);
await mkdir('_site/src', { recursive: true });
await Promise.all([
  writeFile('_site/index.html', html),
  writeFile('_site/style.css', css),
  writeFile('_site/src/game.js', game),
  writeFile('_site/src/world.js', world),
]);
