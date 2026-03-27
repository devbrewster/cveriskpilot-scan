// ---------------------------------------------------------------------------
// OpenAPI v3.1 Specification for CVERiskPilot API (t113)
// ---------------------------------------------------------------------------

export interface OpenAPISpec {
  openapi: string;
  info: Record<string, unknown>;
  servers: Array<Record<string, unknown>>;
  paths: Record<string, unknown>;
  components: Record<string, unknown>;
  security: Array<Record<string, unknown>>;
  tags: Array<Record<string, unknown>>;
}

export const openApiSpec: OpenAPISpec = {
  openapi: '3.1.0',
  info: {
    title: 'CVERiskPilot API',
    version: '1.0.0',
    description:
      'Vulnerability Management SaaS platform API. Provides endpoints for managing vulnerability cases, findings, uploads, AI-powered remediation, and real-time streaming.',
    contact: {
      name: 'CVERiskPilot Support',
      email: 'support@cveriskpilot.io',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: '{protocol}://{host}',
      description: 'CVERiskPilot API Server',
      variables: {
        protocol: { default: 'https', enum: ['https', 'http'] },
        host: { default: 'app.cveriskpilot.io' },
      },
    },
  ],
  tags: [
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Cases', description: 'Vulnerability case management' },
    { name: 'Findings', description: 'Vulnerability findings' },
    { name: 'Uploads', description: 'Scan report uploads' },
    { name: 'Streaming', description: 'Server-Sent Events for real-time updates' },
  ],
  security: [
    { BearerAuth: [] },
    { ApiKeyAuth: [] },
    { CookieAuth: [] },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from /api/auth/login',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for programmatic access',
      },
      CookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session',
        description: 'Session cookie for browser-based access',
      },
    },
    schemas: {
      // -----------------------------------------------------------------------
      // Auth schemas
      // -----------------------------------------------------------------------
      SignupRequest: {
        type: 'object',
        required: ['email', 'password', 'name', 'organizationName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
          organizationName: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/User' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: {
            type: 'string',
            enum: ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER', 'API_SERVICE'],
          },
          organizationId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // -----------------------------------------------------------------------
      // Case schemas
      // -----------------------------------------------------------------------
      Severity: {
        type: 'string',
        enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      },
      CaseStatus: {
        type: 'string',
        enum: [
          'OPEN',
          'TRIAGED',
          'IN_PROGRESS',
          'REMEDIATED',
          'CLOSED',
          'FALSE_POSITIVE',
          'RISK_ACCEPTED',
        ],
      },
      VulnerabilityCase: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { $ref: '#/components/schemas/Severity' },
          status: { $ref: '#/components/schemas/CaseStatus' },
          cveIds: { type: 'array', items: { type: 'string' } },
          cweIds: { type: 'array', items: { type: 'string' } },
          cvssScore: { type: 'number', nullable: true },
          cvssVector: { type: 'string', nullable: true },
          epssScore: { type: 'number', nullable: true },
          epssPercentile: { type: 'number', nullable: true },
          kevListed: { type: 'boolean' },
          kevDueDate: { type: 'string', format: 'date', nullable: true },
          findingCount: { type: 'integer' },
          organizationId: { type: 'string', format: 'uuid' },
          assignedTeamId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateCaseRequest: {
        type: 'object',
        required: ['title', 'severity'],
        properties: {
          title: { type: 'string', maxLength: 500 },
          description: { type: 'string' },
          severity: { $ref: '#/components/schemas/Severity' },
          cveIds: { type: 'array', items: { type: 'string' } },
          cweIds: { type: 'array', items: { type: 'string' } },
          cvssScore: { type: 'number', minimum: 0, maximum: 10 },
          cvssVector: { type: 'string' },
          assignedTeamId: { type: 'string', format: 'uuid' },
        },
      },
      UpdateCaseRequest: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 500 },
          description: { type: 'string' },
          severity: { $ref: '#/components/schemas/Severity' },
          status: { $ref: '#/components/schemas/CaseStatus' },
          assignedTeamId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      CaseListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/VulnerabilityCase' },
          },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },

      // -----------------------------------------------------------------------
      // Finding schemas
      // -----------------------------------------------------------------------
      Finding: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { $ref: '#/components/schemas/Severity' },
          cveIds: { type: 'array', items: { type: 'string' } },
          cweIds: { type: 'array', items: { type: 'string' } },
          cvssScore: { type: 'number', nullable: true },
          scannerType: { type: 'string' },
          scannerName: { type: 'string' },
          assetName: { type: 'string' },
          packageName: { type: 'string', nullable: true },
          packageVersion: { type: 'string', nullable: true },
          caseId: { type: 'string', format: 'uuid', nullable: true },
          organizationId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateFindingRequest: {
        type: 'object',
        required: ['title', 'severity', 'scannerType', 'scannerName', 'assetName'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { $ref: '#/components/schemas/Severity' },
          cveIds: { type: 'array', items: { type: 'string' } },
          cweIds: { type: 'array', items: { type: 'string' } },
          cvssScore: { type: 'number', minimum: 0, maximum: 10 },
          scannerType: { type: 'string' },
          scannerName: { type: 'string' },
          assetName: { type: 'string' },
          packageName: { type: 'string' },
          packageVersion: { type: 'string' },
        },
      },
      FindingListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Finding' },
          },
          total: { type: 'integer' },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
        },
      },

      // -----------------------------------------------------------------------
      // Upload schemas
      // -----------------------------------------------------------------------
      UploadResponse: {
        type: 'object',
        properties: {
          jobId: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
          },
          fileName: { type: 'string' },
          format: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // -----------------------------------------------------------------------
      // Streaming schemas
      // -----------------------------------------------------------------------
      SSEEvent: {
        type: 'object',
        description: 'Server-Sent Event payload',
        properties: {
          event: {
            type: 'string',
            enum: [
              'case:created',
              'case:updated',
              'case:status_changed',
              'finding:created',
              'upload:completed',
              'upload:failed',
              'notification',
            ],
          },
          data: { type: 'object' },
          id: { type: 'string' },
          retry: { type: 'integer' },
        },
      },

      // -----------------------------------------------------------------------
      // Error schemas
      // -----------------------------------------------------------------------
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
          details: { type: 'object' },
        },
      },
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        schema: { type: 'integer', minimum: 1, default: 1 },
        description: 'Page number',
      },
      PageSizeParam: {
        name: 'pageSize',
        in: 'query',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
        description: 'Number of items per page',
      },
      SeverityFilter: {
        name: 'severity',
        in: 'query',
        schema: { $ref: '#/components/schemas/Severity' },
        description: 'Filter by severity',
      },
      StatusFilter: {
        name: 'status',
        in: 'query',
        schema: { $ref: '#/components/schemas/CaseStatus' },
        description: 'Filter by status',
      },
      SearchParam: {
        name: 'search',
        in: 'query',
        schema: { type: 'string' },
        description: 'Full-text search query',
      },
      SortParam: {
        name: 'sort',
        in: 'query',
        schema: { type: 'string', default: 'createdAt:desc' },
        description: 'Sort field and direction (e.g., severity:asc, createdAt:desc)',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
  paths: {
    // -----------------------------------------------------------------------
    // Auth endpoints
    // -----------------------------------------------------------------------
    '/api/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create a new account',
        operationId: 'signup',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SignupRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Account created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '409': {
            description: 'Email already registered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate and obtain a token',
        operationId: 'login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'End the current session',
        operationId: 'logout',
        responses: {
          '200': { description: 'Logged out successfully' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Cases endpoints
    // -----------------------------------------------------------------------
    '/api/cases': {
      get: {
        tags: ['Cases'],
        summary: 'List vulnerability cases',
        operationId: 'listCases',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PageSizeParam' },
          { $ref: '#/components/parameters/SeverityFilter' },
          { $ref: '#/components/parameters/StatusFilter' },
          { $ref: '#/components/parameters/SearchParam' },
          { $ref: '#/components/parameters/SortParam' },
          {
            name: 'kevOnly',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Only return KEV-listed cases',
          },
          {
            name: 'assignedTeamId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by assigned team',
          },
          {
            name: 'cveId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by CVE ID',
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of cases',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CaseListResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Cases'],
        summary: 'Create a new vulnerability case',
        operationId: 'createCase',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCaseRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Case created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VulnerabilityCase' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/cases/{id}': {
      get: {
        tags: ['Cases'],
        summary: 'Get a vulnerability case by ID',
        operationId: 'getCase',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Case details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VulnerabilityCase' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Cases'],
        summary: 'Update a vulnerability case',
        operationId: 'updateCase',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCaseRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Case updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VulnerabilityCase' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Cases'],
        summary: 'Delete a vulnerability case',
        operationId: 'deleteCase',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '204': { description: 'Case deleted' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Findings endpoints
    // -----------------------------------------------------------------------
    '/api/findings': {
      get: {
        tags: ['Findings'],
        summary: 'List vulnerability findings',
        operationId: 'listFindings',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PageSizeParam' },
          { $ref: '#/components/parameters/SeverityFilter' },
          { $ref: '#/components/parameters/SearchParam' },
          {
            name: 'caseId',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by associated case',
          },
          {
            name: 'scannerType',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by scanner type',
          },
          {
            name: 'assetName',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by asset name',
          },
        ],
        responses: {
          '200': {
            description: 'Paginated list of findings',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FindingListResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Findings'],
        summary: 'Create a new finding',
        operationId: 'createFinding',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateFindingRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Finding created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Finding' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // -----------------------------------------------------------------------
    // Upload endpoint
    // -----------------------------------------------------------------------
    '/api/uploads': {
      post: {
        tags: ['Uploads'],
        summary: 'Upload a scan report for parsing',
        operationId: 'uploadScanReport',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Scan report file (JSON, XML, CSV, XLSX)',
                  },
                  format: {
                    type: 'string',
                    enum: [
                      'nessus',
                      'qualys',
                      'openvas',
                      'sarif',
                      'cyclonedx',
                      'spdx',
                      'osv',
                      'csaf',
                      'csv',
                      'xlsx',
                      'json',
                    ],
                    description: 'Explicit format hint (auto-detected if omitted)',
                  },
                  clientId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Target client ID for MSSP mode',
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Upload accepted for processing',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '413': {
            description: 'File too large',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // -----------------------------------------------------------------------
    // SSE Streaming endpoint
    // -----------------------------------------------------------------------
    '/api/stream': {
      get: {
        tags: ['Streaming'],
        summary: 'Subscribe to real-time events via SSE',
        operationId: 'streamEvents',
        parameters: [
          {
            name: 'events',
            in: 'query',
            schema: { type: 'string' },
            description:
              'Comma-separated list of event types to subscribe to (e.g., case:created,finding:created)',
          },
          {
            name: 'lastEventId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Last received event ID for resuming a stream',
          },
        ],
        responses: {
          '200': {
            description: 'SSE event stream',
            content: {
              'text/event-stream': {
                schema: { $ref: '#/components/schemas/SSEEvent' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
  },
};
