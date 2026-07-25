import 'multer';
import { JwtPayload, ViewerJwtPayload } from './index';
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        permissions: string[];
      };
      viewerSession?: ViewerJwtPayload;
      requestId?: string;
      startTime?: number;
    }
  }
}

export {};
