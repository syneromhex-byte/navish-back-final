import { UserRole } from '@prisma/client';

// ── Role hierarchy ─────────────────────────────────────────────────────────────
//  ADMIN > ARCHITECT > CLIENT
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.ARCHITECT]: 2,
  [UserRole.CLIENT]: 1,
};

/**
 * Check if a user's role meets the minimum required role.
 */
export const hasMinRole = (userRole: UserRole, minRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
};

/**
 * Check if a user has a specific permission string.
 */
export const hasPermission = (userPermissions: string[], required: string): boolean => {
  return userPermissions.includes(required);
};

/**
 * Check if a user has all of the specified permissions.
 */
export const hasAllPermissions = (userPermissions: string[], required: string[]): boolean => {
  return required.every((p) => userPermissions.includes(p));
};

/**
 * Check if a user has any of the specified permissions.
 */
export const hasAnyPermission = (userPermissions: string[], required: string[]): boolean => {
  return required.some((p) => userPermissions.includes(p));
};

// ── Permission strings by domain ──────────────────────────────────────────────
export const Permissions = {
  // Users
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  // Clients
  CLIENTS_READ: 'clients:read',
  CLIENTS_CREATE: 'clients:create',
  CLIENTS_UPDATE: 'clients:update',
  CLIENTS_DELETE: 'clients:delete',
  // Projects
  PROJECTS_READ: 'projects:read',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_UPDATE: 'projects:update',
  PROJECTS_DELETE: 'projects:delete',
  PROJECTS_PUBLISH: 'projects:publish',
  // Models
  MODELS_READ: 'models:read',
  MODELS_UPLOAD: 'models:upload',
  MODELS_DELETE: 'models:delete',
  // Share Links
  SHARE_CREATE: 'share:create',
  SHARE_REVOKE: 'share:revoke',
  // Analytics
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  // Admin
  ADMIN_ACCESS: 'admin:access',
  ADMIN_SETTINGS: 'admin:settings',
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

// ── Default permissions per role ──────────────────────────────────────────────
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  [UserRole.ADMIN]: Object.values(Permissions) as PermissionKey[],
  [UserRole.ARCHITECT]: [
    Permissions.USERS_READ,
    Permissions.CLIENTS_READ,
    Permissions.PROJECTS_READ,
    Permissions.PROJECTS_CREATE,
    Permissions.PROJECTS_UPDATE,
    Permissions.PROJECTS_PUBLISH,
    Permissions.MODELS_READ,
    Permissions.MODELS_UPLOAD,
    Permissions.MODELS_DELETE,
    Permissions.SHARE_CREATE,
    Permissions.SHARE_REVOKE,
    Permissions.ANALYTICS_READ,
    Permissions.ANALYTICS_EXPORT,
  ],
  [UserRole.CLIENT]: [
    Permissions.PROJECTS_READ,
    Permissions.MODELS_READ,
    Permissions.ANALYTICS_READ,
  ],
};
