// Spoke version control - save, restore, diff versions
import { query } from './db';

export async function saveVersion(spokeId, data, changedBy = 'system', changeNote = '') {
  try {
    // Get current max version
    const vRes = await query(
      'SELECT MAX(version) as max_v FROM sn_spoke_versions WHERE spoke_id=$1',
      [spokeId]
    );
    const nextVersion = (parseInt(vRes.rows[0]?.max_v) || 0) + 1;

    await query(
      `INSERT INTO sn_spoke_versions (spoke_id, version, data, changed_by, change_note)
       VALUES ($1,$2,$3,$4,$5)`,
      [spokeId, nextVersion, JSON.stringify(data), changedBy, changeNote || '']
    );

    // Keep only last 10 versions
    await query(
      `DELETE FROM sn_spoke_versions WHERE spoke_id=$1 AND version < (
        SELECT MIN(version) FROM (
          SELECT version FROM sn_spoke_versions WHERE spoke_id=$1 ORDER BY version DESC LIMIT 10
        ) t
      )`,
      [spokeId]
    );

    // Update spoke version counter
    await query('UPDATE sn_spokes SET version=version+1 WHERE id=$1', [spokeId]);

    return { success: true, version: nextVersion };
  } catch (err) {
    console.error('[Versions] Save failed:', err.message);
    return { success: false };
  }
}

export async function getVersions(spokeId) {
  const result = await query(
    `SELECT id, version, changed_by, change_note, created_at,
     LEFT(data::text, 100) as preview
     FROM sn_spoke_versions WHERE spoke_id=$1 ORDER BY version DESC`,
    [spokeId]
  );
  return result.rows;
}

export async function getVersion(spokeId, version) {
  const result = await query(
    'SELECT * FROM sn_spoke_versions WHERE spoke_id=$1 AND version=$2',
    [spokeId, parseInt(version)]
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  return { ...row, data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data };
}

export async function restoreVersion(spokeId, version) {
  const ver = await getVersion(spokeId, version);
  if (!ver) throw new Error('Version not found');

  const data = ver.data;
  await query(
    `UPDATE sn_spokes SET
      name=$1, description=$2, official_description=$3, personal_tip=$4,
      ai_description=$5, setup_steps=$6, actions=$7, common_errors=$8,
      code_example=$9, tags=$10, updated_at=NOW()
     WHERE id=$11`,
    [
      data.name, data.description, data.official_description, data.personal_tip,
      data.ai_description, JSON.stringify(data.setup_steps || []),
      JSON.stringify(data.actions || []), JSON.stringify(data.common_errors || []),
      data.code_example, data.tags || [], spokeId,
    ]
  );

  // Save a new version noting the restore
  await saveVersion(spokeId, data, 'admin', `Restored from v${version}`);
  return { success: true };
}
