export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SmartPlate API',
    version: '0.1.0',
    description:
      'REST API for SmartPlate — AI-powered nutrition tracking, recipe discovery, and meal planning.',
    contact: {
      name: 'SmartPlate Team',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Returns server status and verifies database connectivity.',
        responses: {
          '200': {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
          '503': {
            description: 'Database connection failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthError',
                },
              },
            },
          },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RegisterInput',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '409': { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginInput',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '401': { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tokens refreshed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Tokens',
                },
              },
            },
          },
          '401': { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout (revoke refresh token)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged out' },
        },
      },
    },
    '/recipes': {
      get: {
        tags: ['Recipes'],
        summary: 'List recipes',
        description: 'Returns all recipes with optional filters.',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by title' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (e.g. SafariTaste)' },
          { name: 'goal', in: 'query', schema: { type: 'string' }, description: 'Filter by goal (balanced, high-protein, light, energy-boost)' },
          { name: 'aiRecommended', in: 'query', schema: { type: 'boolean' }, description: 'Filter AI-recommended recipes' },
        ],
        responses: {
          '200': {
            description: 'List of recipes',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Recipe' },
                },
              },
            },
          },
        },
      },
    },
    '/recipes/{id}': {
      get: {
        tags: ['Recipes'],
        summary: 'Get recipe by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Recipe details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Recipe' },
              },
            },
          },
          '404': { description: 'Recipe not found' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string', example: '0.1.0' },
        },
      },
      HealthError: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          timestamp: { type: 'string', format: 'date-time' },
          message: { type: 'string', example: 'Database connection failed' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', minLength: 8, example: 'MyP@ssw0rd' },
          name: { type: 'string', example: 'John Doe' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'user@example.com' },
          password: { type: 'string', example: 'MyP@ssw0rd' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'cmk...' },
              email: { type: 'string', example: 'user@example.com' },
              name: { type: 'string', example: 'John Doe', nullable: true },
            },
          },
          tokens: {
            $ref: '#/components/schemas/Tokens',
          },
        },
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbG...' },
          refreshToken: { type: 'string', example: 'eyJhbG...' },
        },
      },
      Recipe: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string', example: 'Grilled Chicken Quinoa Bowl' },
          description: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          prepTimeMin: { type: 'integer', nullable: true, example: 15 },
          cookTimeMin: { type: 'integer', nullable: true, example: 25 },
          servings: { type: 'integer', nullable: true, example: 2 },
          calories: { type: 'integer', nullable: true, example: 420 },
          category: { type: 'string', example: 'Regular' },
          goal: { type: 'string', nullable: true, example: 'high-protein' },
          aiRecommended: { type: 'boolean' },
          isImported: { type: 'boolean' },
          sourceUrl: { type: 'string', nullable: true },
          sourceProvider: { type: 'string', nullable: true },
          ingredients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string', example: '200g quinoa' },
                sortOrder: { type: 'integer' },
              },
            },
          },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string', example: 'Cook quinoa according to package directions' },
                sortOrder: { type: 'integer' },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};
