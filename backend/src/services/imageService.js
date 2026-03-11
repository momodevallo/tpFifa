import fs from 'fs/promises';
import path from 'path';
import pool from '../config/db.js';
import { imageCachePath } from '../config/paths.js';

export async function recupererImageJoueurCachee(playerId, imageUrl) {
  try {
    await fs.mkdir(imageCachePath, { recursive: true });

    const extension = await trouverExtensionImage(imageUrl);
    const cacheFilePath = path.join(imageCachePath, `${playerId}.${extension}`);

    try {
      const buffer = await fs.readFile(cacheFilePath);
      return {
        buffer,
        contentType: await trouverContentTypeDepuisExtension(extension)
      };
    } catch (_error) {}

    const remoteRes = await fetch(imageUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 TP-FIFA/1.0',
        'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!remoteRes.ok) {
      console.error('Erreur fetch image distante:', remoteRes.status, remoteRes.statusText, imageUrl);
      return null;
    }

    const arrayBuffer = await remoteRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType =
      remoteRes.headers.get('content-type') || await trouverContentTypeDepuisExtension(extension);

    await fs.writeFile(cacheFilePath, buffer);

    return {
      buffer,
      contentType
    };
  } catch (error) {
    console.error('Erreur cache image joueur:', error);
    return null;
  }
}

export async function trouverExtensionImage(imageUrl) {
  const cleanUrl = String(imageUrl || '').split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'jpg';
  if (cleanUrl.endsWith('.webp')) return 'webp';
  if (cleanUrl.endsWith('.gif')) return 'gif';
  if (cleanUrl.endsWith('.svg')) return 'svg';
  return 'png';
}

export async function trouverContentTypeDepuisExtension(extension) {
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/png';
  }
}

export async function envoyerImageJoueurParDefaut(res) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#182848" />
          <stop offset="100%" stop-color="#4b6cb7" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="28" fill="url(#bg)"/>
      <circle cx="120" cy="88" r="38" fill="rgba(255,255,255,0.88)"/>
      <path d="M56 206c8-34 32-54 64-54s56 20 64 54" fill="rgba(255,255,255,0.88)"/>
      <text x="120" y="224" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.96)">JOUEUR</text>
    </svg>
  `;

  res.status(200).type('image/svg+xml').send(svg);
}

export async function recupererImageUrlJoueur(playerId) {
  const [rows] = await pool.query('SELECT image_url FROM joueurs WHERE id = ?', [playerId]);
  return String(rows[0]?.image_url || '').trim();
}