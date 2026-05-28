import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specialties = JSON.parse(readFileSync(path.join(__dirname, '../config/specialties.json'), 'utf-8'));

router.get('/specialties', (req, res) => {
  res.json(specialties);
});

export default router;
