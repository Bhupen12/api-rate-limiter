import { Router } from 'express';
import { ApiResponse } from '@monorepo/shared';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  requireAdmin,
  requireAnyRole,
  requireEditor,
  requireModerator,
  requireViewer,
} from '../middleware/role-guard.middleware';

const router: Router = Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// Route accessible by viewers and above
router.get('/viewer-content', requireViewer, (req, res) => {
  res.json({
    success: true,
    data: { message: 'This content is visible to viewers and above' },
    message: 'Viewer content accessed successfully',
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Route accessible by moderators and above
router.get('/moderator-content', requireModerator, (req, res) => {
  res.json({
    success: true,
    data: { message: 'This content is visible to moderators and above' },
    message: 'Moderator content accessed successfully',
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Route accessible by editors and above
router.get('/editor-content', requireEditor, (req, res) => {
  res.json({
    success: true,
    data: { message: 'This content is visible to editors and above' },
    message: 'Editor content accessed successfully',
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Route accessible only by admins
router.get('/admin-content', requireAdmin, (req, res) => {
  res.json({
    success: true,
    data: { message: 'This content is visible only to admins' },
    message: 'Admin content accessed successfully',
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Route accessible by editors OR moderators (using requireAnyRole)
router.get(
  '/editor-or-moderator-content',
  requireAnyRole(['editor', 'moderator']),
  (req, res) => {
    res.json({
      success: true,
      data: { message: 'This content is visible to editors or moderators' },
      message: 'Editor or moderator content accessed successfully',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
);

export { router as protectedRoutes };
