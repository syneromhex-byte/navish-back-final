import { Request, Response } from 'express';
import { clientService } from '../../services/clients/client.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { asyncHandler } from '../../utils/asyncHandler';

export class ClientController {
  createClient = asyncHandler(async (req: Request, res: Response) => {
    const client = await clientService.createClient(req.body);
    return ApiResponse.created(res, client, 'Client created successfully');
  });

  getClient = asyncHandler(async (req: Request, res: Response) => {
    const client = await clientService.getClientById(req.params.id);
    return ApiResponse.success(res, client);
  });

  listClients = asyncHandler(async (req: Request, res: Response) => {
    const result = await clientService.listClients(req.query as any);
    return ApiResponse.paginated(res, result.data, result.meta);
  });

  updateClient = asyncHandler(async (req: Request, res: Response) => {
    const client = await clientService.updateClient(req.params.id, req.body);
    return ApiResponse.success(res, client, 'Client updated successfully');
  });

  uploadLogo = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) return res.sendStatus(400);
    const url = await clientService.uploadLogo(req.params.id, req.file);
    return ApiResponse.success(res, { logoUrl: url }, 'Client logo uploaded successfully');
  });

  deleteClient = asyncHandler(async (req: Request, res: Response) => {
    await clientService.deleteClient(req.params.id);
    return ApiResponse.deleted(res, req.params.id, 'client', 'Client deleted successfully');
  });
}

export const clientController = new ClientController();
