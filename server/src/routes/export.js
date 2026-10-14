/* ═══════════════════ EXPORT ROUTES ═══════════════════ */
import { Router } from 'express';
import { getOne } from '../db.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, exportSchema } from '../middleware/validate.js';
import { authenticate, attachOrg } from '../middleware/auth.js';
import { exportLimiter } from '../middleware/rateLimit.js';
import { audit } from '../middleware/audit.js';
import { NotFoundError, AppError } from '../errors.js';

const router = Router();

/* ═══ Export yaratish ═══ */
router.post('/', authenticate, attachOrg, exportLimiter, validate(exportSchema), asyncHandler(async (req, res) => {
  const { project_id, format, options } = req.body;

  // Loyihani olish
  let project = null;
  if (project_id) {
    project = await getOne('SELECT * FROM projects WHERE id = $1 AND is_deleted = false', [project_id]);
    if (!project) throw new NotFoundError('Project not found');
  }

  // Format bo'yicha export
  let result;
  switch (format) {
    case 'obj':
      result = await exportOBJ(project, options);
      break;
    case 'bpj':
      result = await exportBPJ(project, options);
      break;
    case 'giblab':
      result = await exportGibLab(project, options);
      break;
    case 'xnc':
      result = await exportXNC(project, options);
      break;
    case 'dxf':
      result = await exportDXF(project, options);
      break;
    case 'gcode':
      result = await exportGCode(project, options);
      break;
    case 'cutlist':
      result = await exportCutlist(project, options);
      break;
    case 'smeta':
      result = await exportSmeta(project, options);
      break;
    case 'project':
      result = await exportProject(project, options);
      break;
    default:
      throw new AppError(`Unknown format: ${format}`, 400);
  }

  // Export tarixini saqlash
  await getOne(
    `INSERT INTO exports (project_id, user_id, org_id, format, file_size, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [project_id, req.user.id, req.orgId, format, result.size || 0, JSON.stringify(result.metadata || {})]
  );

  audit('export', 'project', project_id, null, { format }, req);

  res.json(result);
}));

/* ═══ Export tarixi ═══ */
router.get('/history/:projectId', authenticate, asyncHandler(async (req, res) => {
  const { getMany } = await import('../db.js');
  const history = await getMany(
    `SELECT e.*, u.name as user_name
     FROM exports e
     LEFT JOIN users u ON e.user_id = u.id
     WHERE e.project_id = $1
     ORDER BY e.created_at DESC LIMIT 50`,
    [req.params.projectId]
  );
  res.json(history);
}));

/* ═══════════════════ EXPORT FUNCTIONS ═══════════════════ */

async function exportOBJ(project, options) {
  // Frontend'da ishlaydi, backend fallback
  return {
    format: 'obj',
    content: '# Smart3D OBJ Export\n# Project: ' + (project?.name || 'draft') + '\n',
    filename: `${project?.name || 'project'}.obj`,
    size: 100,
    metadata: { note: 'Client-side export recommended' },
  };
}

async function exportBPJ(project, options) {
  return {
    format: 'bpj',
    content: '',
    filename: `${project?.name || 'project'}.bpj`,
    size: 0,
    metadata: { note: 'Use frontend export for binary BPJ' },
  };
}

async function exportGibLab(project, options) {
  return {
    format: 'giblab',
    content: '',
    filename: `${project?.name || 'project'}.project`,
    size: 0,
    metadata: { note: 'Use frontend export for GibLab' },
  };
}

async function exportXNC(project, options) {
  return {
    format: 'xnc',
    content: '',
    filename: `${project?.name || 'project'}.csv`,
    size: 0,
  };
}

async function exportDXF(project, options) {
  return {
    format: 'dxf',
    content: '',
    filename: `${project?.name || 'project'}.dxf`,
    size: 0,
  };
}

async function exportGCode(project, options) {
  return {
    format: 'gcode',
    content: '',
    filename: `${project?.name || 'project'}.nc`,
    size: 0,
  };
}

async function exportCutlist(project, options) {
  return {
    format: 'cutlist',
    content: '',
    filename: `${project?.name || 'project'}_cutlist.csv`,
    size: 0,
  };
}

async function exportSmeta(project, options) {
  return {
    format: 'smeta',
    content: '',
    filename: `${project?.name || 'project'}_smeta.csv`,
    size: 0,
  };
}

async function exportProject(project, options) {
  return {
    format: 'project',
    content: JSON.stringify(project, null, 2),
    filename: `${project?.name || 'project'}.json`,
    size: JSON.stringify(project).length,
  };
}

export default router;
