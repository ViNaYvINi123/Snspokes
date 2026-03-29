import logger from './logger';
// Automated DB backup using pg_dump inside Docker
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = process.env.BACKUP_DIR || '/tmp/snspokes-backups';
const MAX_BACKUPS = 7; // keep 7 days

export async function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `snspokes-backup-${timestamp}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  const cmd = [
    'docker exec snspokes_db pg_dump',
    `-U ${process.env.DB_USER || 'snspokes_user'}`,
    process.env.DB_NAME || 'snspokes',
  ].join(' ');

  return new Promise((resolve, reject) => {
    const child = exec(cmd);
    const stream = fs.createWriteStream(filepath);

    child.stdout.pipe(stream);
    child.on('close', code => {
      if (code === 0) {
        const size = fs.statSync(filepath).size;
        cleanOldBackups();
        resolve({ success: true, file: filepath, size_bytes: size, timestamp });
      } else {
        reject(new Error(`pg_dump exited with code ${code}`));
      }
    });
    child.stderr.on('data', d => logger.error('[Backup]', d));
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
      logger.info('[Backup] Removed old backup:', f.name);
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
      .sort((a, b) => b.created_at - a.created_at);
  } catch { return []; }
}
