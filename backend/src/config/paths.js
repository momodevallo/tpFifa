import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const publicPath = path.join(__dirname, '../..', '..', 'frontend', 'public');
export const imageCachePath = path.join(__dirname, '..', '..', 'cache', 'player-images');