import { clientRepository } from '../../repositories/client.repository';
import { ApiError } from '../../utils/ApiError';
import { uploadToS3, buildS3Key } from '../../config/aws';
import { S3Prefix } from '../../types';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import type { CreateClientDto, UpdateClientDto } from '../../validators/client.validator';

export class ClientService {
  async createClient(dto: CreateClientDto) {
    try {
      return await clientRepository.create(dto);
    } catch (err: any) {
      if (err?.code === 'P2002') throw ApiError.conflict('Email already registered');
      throw err;
    }
  }

  async getClientById(id: string) {
    const client = await clientRepository.findById(id);
    if (!client) throw ApiError.notFound('Client not found');
    return client;
  }

  async getClientByUserId(userId: string) {
    const client = await clientRepository.findByUserId(userId);
    if (!client) throw ApiError.notFound('Client profile not found');
    return client;
  }

  async listClients(query: { page: number; limit: number; search?: string; isActive?: boolean; sortBy: string; sortOrder: 'asc' | 'desc' }) {
    return clientRepository.findMany(query);
  }

  async updateClient(id: string, dto: UpdateClientDto) {
    const existing = await clientRepository.findById(id);
    if (!existing) throw ApiError.notFound('Client not found');
    return clientRepository.update(id, dto);
  }

  async uploadLogo(clientId: string, file: Express.Multer.File): Promise<string> {
    const buffer = await sharp(file.buffer)
      .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 85 })
      .toBuffer();

    const key = buildS3Key(S3Prefix.AVATARS, 'clients', clientId, `${uuidv4()}.webp`);
    const url = await uploadToS3(key, buffer, 'image/webp');

    await clientRepository.uploadLogo(clientId, url);
    return url;
  }

  async deleteClient(id: string): Promise<void> {
    const existing = await clientRepository.findById(id);
    if (!existing) throw ApiError.notFound('Client not found');
    await clientRepository.softDelete(id);
  }
}

export const clientService = new ClientService();
