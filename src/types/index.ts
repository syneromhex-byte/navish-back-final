import { UserRole, UserStatus, ProjectStatus, ModelStatus, ModelFormat, ShareLinkStatus, UploadStatus, NotificationType, AnalyticsEventType, AuditAction } from '@prisma/client';

// Re-export Prisma enums for convenience
export { UserRole, UserStatus, ProjectStatus, ModelStatus, ModelFormat, ShareLinkStatus, UploadStatus, NotificationType, AnalyticsEventType, AuditAction };

// ── JWT Payload ───────────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;        // userId
  role: UserRole;
  email: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export interface ViewerJwtPayload {
  sub: string;        // shareLinkId
  projectId: string;
  type: 'viewer';
  allowDownload: boolean;
  iat?: number;
  exp?: number;
}

// ── Pagination ─────────────────────────────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── API Response ──────────────────────────────────────────────────────────────
export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: unknown[];
}

// ── Upload Types ──────────────────────────────────────────────────────────────
export interface InitiateUploadDto {
  fileName: string;
  fileSize: number;
  mimeType: string;
  parts?: number;  // For multipart upload
}

export interface PresignedPart {
  partNumber: number;
  presignedUrl: string;
}

export interface InitiateUploadResponse {
  uploadSessionId: string;
  uploadId?: string;    // S3 multipart upload ID
  presignedUrl?: string; // Single-part presigned URL
  presignedParts?: PresignedPart[];
  s3Key: string;
}

export interface CompletePart {
  partNumber: number;
  eTag: string;
}

export interface CompleteUploadDto {
  uploadSessionId: string;
  parts?: CompletePart[];
  modelName?: string;
  projectId?: string;
  roomId?: string;
}

// ── Share Link Types ──────────────────────────────────────────────────────────
export interface ShareLinkCreateDto {
  projectId: string;
  clientId?: string;
  password?: string;
  expiresAt?: Date;
  maxAccessCount?: number;
  allowDownload?: boolean;
  isOneTime?: boolean;
}

// ── Viewer Session ────────────────────────────────────────────────────────────
export interface ViewerSession {
  projectId: string;
  roomId?: string;
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
  activeMaterials?: Record<string, string>;
  activeLighting?: string;
}

// ── S3 Key Prefixes ───────────────────────────────────────────────────────────
export const S3Prefix = {
  MODELS: 'models',
  TEXTURES: 'textures',
  HDR: 'hdr',
  THUMBNAILS: 'thumbnails',
  SCREENSHOTS: 'screenshots',
  AVATARS: 'avatars',
  TEMP: 'temp',
} as const;
