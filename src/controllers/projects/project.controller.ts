import { Request, Response } from 'express';
import { projectService } from '../../services/projects/project.service';
import { shareService } from '../../services/share/share.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class ProjectController {
  createProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const project = await projectService.createProject(req.body, req.user.id);
    return ApiResponse.created(res, project, 'Project created successfully');
  });

  getProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const project = await projectService.getProjectById(req.params.id, req.user.id, req.user.role);
    return ApiResponse.success(res, project);
  });

  listProjects = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const result = await projectService.listProjects(req.query as any, req.user.id, req.user.role);
    return ApiResponse.paginated(res, result.data, result.meta);
  });

  updateProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const project = await projectService.updateProject(req.params.id, req.body, req.user.id, req.user.role);
    return ApiResponse.success(res, project, 'Project updated successfully');
  });

  deleteProject = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await projectService.deleteProject(req.params.id, req.user.id, req.user.role);
    return ApiResponse.success(res, null, 'Project deleted successfully');
  });

  uploadThumbnail = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.sendStatus(400);
    const url = await projectService.uploadThumbnail(req.params.id, req.file);
    return ApiResponse.success(res, { thumbnailUrl: url }, 'Project thumbnail uploaded successfully');
  });

  addMember = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const member = await projectService.addMember(
      req.params.id,
      req.body.userId,
      req.body.role,
      req.user.id,
      req.user.role,
    );
    return ApiResponse.success(res, member, 'Member added successfully');
  });

  removeMember = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    await projectService.removeMember(req.params.id, req.params.userId, req.user.id, req.user.role);
    return ApiResponse.success(res, null, 'Member removed successfully');
  });

  createVersion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.sendStatus(401);
    const version = await projectService.createVersion(
      req.params.id,
      req.body.version,
      req.body.description,
      req.user.id,
    );
    return ApiResponse.created(res, version, 'Version snapshot created successfully');
  });

  getVersions = asyncHandler(async (req: Request, res: Response) => {
    const versions = await projectService.getVersions(req.params.id);
    return ApiResponse.success(res, versions);
  });
  getByShareToken = asyncHandler(async (req: Request, res: Response) => {
    const token = req.params.token;
    const result = await shareService.accessShareLink({ token }, req.ip);
    return ApiResponse.success(res, result.project);
  });
}

export const projectController = new ProjectController();
