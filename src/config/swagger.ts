import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'NAVISH ARC API',
      version: '1.0.0',
      description:
        'Enterprise Architectural Visualization & VR Platform — REST API Documentation',
      contact: {
        name: 'NAVISH Development Team',
        email: 'dev@navish.com',
      },
      license: {
        name: 'Proprietary',
        url: 'https://navish.com',
      },
    },
    servers: [
      {
        url: `${env.APP_URL}/api/${env.API_VERSION}`,
        description: 'Current Server',
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Local Development',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from POST /auth/login',
        },
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'refreshToken',
          description: 'HTTP-only refresh token cookie',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
            statusCode: { type: 'integer' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string' },
            sortBy: { type: 'string' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & token management' },
      { name: 'Users', description: 'User management' },
      { name: 'Clients', description: 'Client management' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Rooms', description: 'Room management within projects' },
      { name: 'Models', description: '3D model management' },
      { name: 'Uploads', description: 'File upload orchestration' },
      { name: 'Materials', description: 'Material configuration' },
      { name: 'Textures', description: 'Texture asset management' },
      { name: 'Lighting', description: 'Lighting configuration' },
      { name: 'Environment', description: 'HDR environment management' },
      { name: 'Viewer', description: 'VR viewer session management' },
      { name: 'Share', description: 'Secure share link management' },
      { name: 'Analytics', description: 'Analytics & reporting' },
      { name: 'Notifications', description: 'In-app notifications' },
      { name: 'Settings', description: 'User & system settings' },
      { name: 'Admin', description: 'Admin dashboard & management' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
