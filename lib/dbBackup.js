import logger from './logger';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/snspokes-backups';
const MAX_BACKUPS = 7;

export async function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T').join('_');
  const filename = 'snspokes-backup-' + timestamp + '.sql';
  const filepath = path.join(BACKUP_DIR, filename);

  const host = process.env.DB_HOST || 'snspokes_db';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USER || 'snspokes_user';
  const db   = process.env.DB_NAME || 'snspokes';
  const pass = process.env.DB_PASSWORD || '';

  const cmd = 'PGPASSWORD="' + pass + '" pg_dump -h ' + host + ' -p ' + port + ' -U ' + user + ' ' + db + ' > ' + filepath;

  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        logger.error('[Backup] pg_dump failed:', error.message);
        reject(new Error('Backup failed: ' + error.message));
        return;
      }
      try {
        const size = fs.statSync(filepath).size;
        if (size < 100) {
          reject(new Error('Backup file is empty or too small'));
          return;
        }
        cleanOldBackups();
        resolve({ success: true, file: filename, size_bytes: size, timestamp });
      } catch(e) {
        reject(new Error('Backup verification failed: ' + e.message));
      }
    });
  });
}

function cleanOldBackups() {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('snspokes-backup-'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    files.slice(MAX_BACKUPS).forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f.name));
      logger.info('[Backup] Removed old:', f.name);
    });
  } catch {}
}

export function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return [];
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { name: f, size_bytes: stat.size, created_at: stat.mtime };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch { return []; }
}
