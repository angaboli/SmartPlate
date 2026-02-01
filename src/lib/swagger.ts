export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SmartPlate API',
    version: '0.2.0',
    description:
      'REST API for SmartPlate — AI-powered nutrition tracking, recipe discovery, and meal planning. Includes RBAC (user/editor/admin) and recipe publication workflow.',
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
        description: 'Returns published recipes for public/user. Editors/admins can filter by any status.',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by title' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category (e.g. SafariTaste)' },
          { name: 'goal', in: 'query', schema: { type: 'string' }, description: 'Filter by goal (balanced, high-protein, light, energy-boost)' },
          { name: 'aiRecommended', in: 'query', schema: { type: 'boolean' }, description: 'Filter AI-recommended recipes' },
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/RecipeStatus' }, description: 'Filter by status (editor/admin only)' },
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
      post: {
        tags: ['Recipes'],
        summary: 'Create a recipe',
        description: 'Creates a new recipe in draft status. Requires editor or admin role.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateRecipeInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Recipe created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Recipe' },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden — requires editor/admin role' },
        },
      },
    },
    '/recipes/{id}': {
      get: {
        tags: ['Recipes'],
        summary: 'Get recipe by ID',
        description: 'Published recipes are public. Non-published visible to author/editor/admin.',
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
      put: {
        tags: ['Recipes'],
        summary: 'Update a recipe',
        description: 'Only the author or admin can update. Resets rejected recipes to draft.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateRecipeInput' },
            },
          },
        },
        responses: {
          '200': { description: 'Recipe updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recipe' } } } },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Recipe not found' },
        },
      },
      delete: {
        tags: ['Recipes'],
        summary: 'Delete a recipe',
        description: 'Only the author or admin can delete.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Recipe deleted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Recipe not found' },
        },
      },
    },
    '/recipes/{id}/submit': {
      post: {
        tags: ['Recipes'],
        summary: 'Submit recipe for review',
        description: 'Author submits a draft/rejected recipe for editorial review.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Recipe submitted for review', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recipe' } } } },
          '400': { description: 'Recipe is not in a submittable state' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Only the author can submit' },
          '404': { description: 'Recipe not found' },
        },
      },
    },
    '/recipes/{id}/review': {
      post: {
        tags: ['Recipes'],
        summary: 'Review a recipe',
        description: 'Editor/admin publishes or rejects a pending recipe.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['published', 'rejected'] },
                  reviewNote: { type: 'string', description: 'Reason for rejection (optional)' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Review applied', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recipe' } } } },
          '400': { description: 'Recipe is not pending review' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Requires editor/admin role' },
          '404': { description: 'Recipe not found' },
        },
      },
    },
    '/cook-later': {
      get: {
        tags: ['Cook Later'],
        summary: 'List saved recipes',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of saved recipes' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Cook Later'],
        summary: 'Save a recipe',
        description: 'Only published recipes can be saved.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['recipeId'],
                properties: {
                  recipeId: { type: 'string' },
                  tag: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Recipe saved' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Recipe not found or not published' },
          '409': { description: 'Recipe already saved' },
        },
      },
    },
    '/imports/extract': {
      post: {
        tags: ['Imports'],
        summary: 'Extract recipe data from URL',
        description: 'Fetches the given URL and extracts recipe data using JSON-LD and Open Graph. Does not save anything to the database. Rate limited to 10 requests/hour per user.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri', example: 'https://www.allrecipes.com/recipe/12345/' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Extracted recipe data',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExtractedRecipe' },
              },
            },
          },
          '400': { description: 'Invalid URL format' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded (10/hour)' },
          '500': { description: 'Failed to fetch or parse URL' },
        },
      },
    },
    '/imports': {
      post: {
        tags: ['Imports'],
        summary: 'Save imported recipe',
        description: 'Creates a Recipe (auto-published, isImported: true), an Import audit record, and a SavedRecipe entry in a single transaction. Rate limited to 10/hour per user.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SaveImportInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Import saved — returns import record, recipe, and saved recipe',
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
          '429': { description: 'Rate limit exceeded' },
        },
      },
      get: {
        tags: ['Imports'],
        summary: 'List import history',
        description: 'Returns the authenticated user\'s import history with linked recipe info.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of imports',
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List all users',
        description: 'Admin only. Returns id, email, name, role, createdAt.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/UserSummary' },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Requires admin role' },
        },
      },
    },
    '/admin/users/{id}/role': {
      patch: {
        tags: ['Admin'],
        summary: 'Change user role',
        description: 'Admin only. Cannot change own role.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { $ref: '#/components/schemas/Role' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Role updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserSummary' } } } },
          '400': { description: 'Invalid role or self-demotion' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Requires admin role' },
          '404': { description: 'User not found' },
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
      Role: {
        type: 'string',
        enum: ['user', 'editor', 'admin'],
        description: 'User role for RBAC',
      },
      RecipeStatus: {
        type: 'string',
        enum: ['draft', 'pending_review', 'published', 'rejected'],
        description: 'Recipe publication status',
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string', example: '0.2.0' },
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
              role: { $ref: '#/components/schemas/Role' },
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
      CreateRecipeInput: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', example: 'My New Recipe' },
          description: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          prepTimeMin: { type: 'integer', nullable: true },
          cookTimeMin: { type: 'integer', nullable: true },
          servings: { type: 'integer', nullable: true },
          calories: { type: 'integer', nullable: true },
          category: { type: 'string', example: 'Regular' },
          goal: { type: 'string', nullable: true },
          ingredients: { type: 'array', items: { type: 'string' } },
          steps: { type: 'array', items: { type: 'string' } },
        },
      },
      UpdateRecipeInput: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          prepTimeMin: { type: 'integer', nullable: true },
          cookTimeMin: { type: 'integer', nullable: true },
          servings: { type: 'integer', nullable: true },
          calories: { type: 'integer', nullable: true },
          category: { type: 'string' },
          goal: { type: 'string', nullable: true },
          ingredients: { type: 'array', items: { type: 'string' } },
          steps: { type: 'array', items: { type: 'string' } },
        },
      },
      Recipe: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          authorId: { type: 'string', nullable: true },
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
          status: { $ref: '#/components/schemas/RecipeStatus' },
          publishedAt: { type: 'string', format: 'date-time', nullable: true },
          reviewNote: { type: 'string', nullable: true },
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
      ImportStatus: {
        type: 'string',
        enum: ['pending', 'completed', 'failed'],
        description: 'Import processing status',
      },
      ExtractedRecipe: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'Spicy Thai Basil Chicken' },
          description: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          prepTimeMin: { type: 'integer', nullable: true, example: 15 },
          cookTimeMin: { type: 'integer', nullable: true, example: 25 },
          servings: { type: 'integer', nullable: true, example: 4 },
          ingredients: { type: 'array', items: { type: 'string' } },
          steps: { type: 'array', items: { type: 'string' } },
          provider: { type: 'string', enum: ['instagram', 'tiktok', 'youtube', 'website'] },
          isPartial: { type: 'boolean', description: 'True if ingredients/steps could not be extracted' },
        },
      },
      SaveImportInput: {
        type: 'object',
        required: ['url', 'title', 'ingredients', 'steps'],
        properties: {
          url: { type: 'string', format: 'uri' },
          title: { type: 'string', example: 'Spicy Thai Basil Chicken' },
          description: { type: 'string', nullable: true },
          imageUrl: { type: 'string', nullable: true },
          prepTimeMin: { type: 'integer', nullable: true },
          cookTimeMin: { type: 'integer', nullable: true },
          servings: { type: 'integer', nullable: true },
          calories: { type: 'integer', nullable: true },
          ingredients: { type: 'array', items: { type: 'string' } },
          steps: { type: 'array', items: { type: 'string' } },
          tag: { type: 'string', nullable: true, description: 'Meal type tag (breakfast, lunch, dinner, snack)' },
        },
      },
      UserSummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', example: 'admin@smartplate.app' },
          name: { type: 'string', nullable: true },
          role: { $ref: '#/components/schemas/Role' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};
