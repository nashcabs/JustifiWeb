import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const assets = [
  ['public/assets/Parallax/background.jpg', 2400],
  ['public/assets/Parallax/background.png', 2400],
  ['public/assets/Parallax/Cloud1.png', 2400],
  ['public/assets/Parallax/Cloud2.png', 2400],
  ['public/assets/Parallax/Cloud3.png', 2400],
  ['public/assets/Parallax/Cloud4.png', 2400],
  ['public/assets/Parallax/Cloud5.svg', 2400],
  ['public/assets/Parallax/Cloud6.png', 2400],
  ['public/assets/Parallax/School.svg', 2400],
  ['public/assets/Parallax/Coin1.png', 512],
  ['public/assets/Parallax/Coin2.png', 512],
  ['public/assets/Parallax/Coin3.png', 512],
  ['public/assets/Background/g3.jpg', 2400],
  ['public/assets/Background/g4.jpg', 2400],
  ['public/assets/Background/mdps.svg', 400],
  ['public/assets/Index/Alex.svg', 1000],
  ['public/assets/Index/alfonso.svg', 1000],
  ['public/assets/Index/Cora.svg', 1000],
  ['public/assets/Index/Cynthia.svg', 1000],
  ['public/assets/Index/Guzman.svg', 1000],
  ['public/assets/Index/Ian.svg', 1000],
  ['public/assets/Index/Justice.svg', 1000],
  ['public/assets/Index/Lawson.svg', 1000],
  ['public/assets/Index/Riri.svg', 1000],
];

await mkdir(path.join(root, 'public/assets/optimized'), { recursive: true });

for (const [relativeSource, maxWidth] of assets) {
  const source = path.join(root, relativeSource);
  const output = path.join(
    root,
    'public/assets/optimized',
    `${path.basename(relativeSource, path.extname(relativeSource))}-${path.extname(relativeSource).slice(1)}.webp`,
  );

  await sharp(source)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toFile(output);
}

console.log(`Optimized ${assets.length} assets into public/assets/optimized.`);