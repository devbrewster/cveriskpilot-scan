// ---------------------------------------------------------------------------
// @cveriskpilot/api-docs — TypeScript SDK Generator (reads OpenAPI spec)
// ---------------------------------------------------------------------------

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { openApiSpec } from './spec';

// ---------------------------------------------------------------------------
// Internal types for parsing the spec
// ---------------------------------------------------------------------------

interface OperationParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: Record<string, unknown>;
  description?: string;
}

interface OperationObject {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: Array<OperationParameter | { $ref: string }>;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: Record<string, unknown> }>;
  };
  responses?: Record<string, unknown>;
  security?: Array<Record<string, unknown>>;
}

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

const HTTP_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

const METHODS_WITH_BODY = new Set<HttpMethod>(['post', 'put', 'patch']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a `$ref` parameter to its inline definition in the spec.
 * Only handles `#/components/parameters/...` refs.
 */
function resolveParamRef(ref: string): OperationParameter | null {
  const match = ref.match(/^#\/components\/parameters\/(.+)$/);
  if (!match) return null;
  const params = (openApiSpec.components as Record<string, unknown>)?.parameters as
    | Record<string, OperationParameter>
    | undefined;
  return params?.[match[1]] ?? null;
}

/**
 * Derive a camelCase method name from the HTTP method + path when no
 * operationId is provided.
 *
 * Examples:
 *   GET  /api/cases        -> getCases
 *   POST /api/cases        -> createCases
 *   GET  /api/cases/{id}   -> getCasesById
 */
function deriveMethodName(method: HttpMethod, path: string): string {
  const verbMap: Record<string, string> = {
    get: 'get',
    post: 'create',
    put: 'update',
    patch: 'update',
    delete: 'delete',
    head: 'head',
    options: 'options',
  };

  const segments = path
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean);

  const parts = segments.map((seg) => {
    if (seg.startsWith('{') && seg.endsWith('}')) {
      const paramName = seg.slice(1, -1);
      return 'By' + paramName.charAt(0).toUpperCase() + paramName.slice(1);
    }
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  });

  return (verbMap[method] ?? method) + parts.join('');
}

/**
 * Extract path parameter names from a URL template.
 * e.g., `/api/cases/{id}` -> ['id']
 */
function extractPathParams(path: string): string[] {
  const matches = path.matchAll(/\{(\w+)\}/g);
  return Array.from(matches, (m) => m[1]);
}

/**
 * Escape a string for safe inclusion inside a JSDoc comment.
 */
function escapeJsDoc(text: string): string {
  return text.replace(/\*\//g, '* /').replace(/\n/g, '\n   * ');
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

/**
 * Generate the full TypeScript source code for a typed CVERiskPilot API client.
 *
 * The produced code is standalone — it depends only on the global `fetch` API
 * available in Node.js 18+ and all modern browsers.
 */
export function generateSdkSource(): string {
  const lines: string[] = [];

  // -- File header --------------------------------------------------------
  lines.push('// ---------------------------------------------------------------------------');
  lines.push('// CVERiskPilot TypeScript SDK — Auto-generated from OpenAPI spec');
  lines.push('// Do not edit manually. Re-generate with @cveriskpilot/api-docs.');
  lines.push('// ---------------------------------------------------------------------------');
  lines.push('');

  // -- Client options interface -------------------------------------------
  lines.push('export interface CVERiskPilotClientOptions {');
  lines.push('  /** Base URL of the CVERiskPilot API (e.g. "https://app.cveriskpilot.com"). */');
  lines.push('  baseUrl: string;');
  lines.push('  /** API key for X-API-Key header authentication. */');
  lines.push('  apiKey?: string;');
  lines.push('  /** JWT bearer token for Authorization header authentication. */');
  lines.push('  token?: string;');
  lines.push('}');
  lines.push('');

  // -- Client class -------------------------------------------------------
  lines.push('export class CVERiskPilotClient {');
  lines.push('  private readonly baseUrl: string;');
  lines.push('  private readonly apiKey?: string;');
  lines.push('  private readonly token?: string;');
  lines.push('');
  lines.push('  constructor(options: CVERiskPilotClientOptions) {');
  lines.push('    // Strip trailing slash for consistent URL building');
  lines.push("    this.baseUrl = options.baseUrl.replace(/\\/+$/, '');");
  lines.push('    this.apiKey = options.apiKey;');
  lines.push('    this.token = options.token;');
  lines.push('  }');
  lines.push('');

  // -- Private helper: build headers ------------------------------------
  lines.push('  private headers(extra?: Record<string, string>): Record<string, string> {');
  lines.push('    const h: Record<string, string> = { ...extra };');
  lines.push('    if (this.token) {');
  lines.push('      h["Authorization"] = `Bearer ${this.token}`;');
  lines.push('    }');
  lines.push('    if (this.apiKey) {');
  lines.push('      h["X-API-Key"] = this.apiKey;');
  lines.push('    }');
  lines.push('    return h;');
  lines.push('  }');
  lines.push('');

  // -- Private helper: build query string --------------------------------
  lines.push('  private qs(params?: Record<string, unknown>): string {');
  lines.push('    if (!params) return "";');
  lines.push('    const parts: string[] = [];');
  lines.push('    for (const [k, v] of Object.entries(params)) {');
  lines.push('      if (v !== undefined && v !== null) {');
  lines.push('        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);');
  lines.push('      }');
  lines.push('    }');
  lines.push('    return parts.length ? `?${parts.join("&")}` : "";');
  lines.push('  }');
  lines.push('');

  // -- Generate methods for each path + operation --------------------------
  const paths = openApiSpec.paths as Record<string, Record<string, unknown>>;

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OperationObject | undefined;
      if (!operation) continue;

      const methodName = operation.operationId ?? deriveMethodName(method, path);
      const pathParams = extractPathParams(path);
      const hasBody = METHODS_WITH_BODY.has(method) && !!operation.requestBody;

      // Resolve all parameters (inline + $ref)
      const queryParams: OperationParameter[] = [];
      if (operation.parameters) {
        for (const rawParam of operation.parameters) {
          let param: OperationParameter | null = null;
          if ('$ref' in rawParam && typeof rawParam.$ref === 'string') {
            param = resolveParamRef(rawParam.$ref);
          } else {
            param = rawParam as OperationParameter;
          }
          if (param && param.in === 'query') {
            queryParams.push(param);
          }
        }
      }

      // --- JSDoc ----------------------------------------------------------
      const docLines: string[] = [];
      if (operation.summary) {
        docLines.push(escapeJsDoc(operation.summary));
      }
      if (operation.description) {
        if (docLines.length) docLines.push('');
        docLines.push(escapeJsDoc(operation.description));
      }
      docLines.push('');
      docLines.push(`\`${method.toUpperCase()} ${path}\``);
      if (operation.tags?.length) {
        docLines.push(`Tags: ${operation.tags.join(', ')}`);
      }

      lines.push('  /**');
      for (const dl of docLines) {
        lines.push(`   * ${dl}`);
      }
      lines.push('   */');

      // --- Signature ------------------------------------------------------
      const params: string[] = [];

      // Path parameters are individual positional args
      for (const pp of pathParams) {
        params.push(`${pp}: string`);
      }

      // Query parameters collected into an optional object
      if (queryParams.length > 0) {
        const qpEntries = queryParams
          .map((qp) => `${qp.name}?: string | number | boolean`)
          .join('; ');
        params.push(`query?: { ${qpEntries} }`);
      }

      // Body for POST/PUT/PATCH
      if (hasBody) {
        params.push('body?: Record<string, unknown>');
      }

      lines.push(`  async ${methodName}(${params.join(', ')}): Promise<Response> {`);

      // --- Build URL with path param substitution -------------------------
      let urlExpr: string;
      if (pathParams.length > 0) {
        // Template literal for path param replacement
        const templatePath = path.replace(/\{(\w+)\}/g, (_m, name) => '${' + name + '}');
        urlExpr = '`${this.baseUrl}' + templatePath + '`';
      } else {
        urlExpr = `\`\${this.baseUrl}${path}\``;
      }

      if (queryParams.length > 0) {
        lines.push(
          `    const url = ${urlExpr} + this.qs(query as Record<string, unknown> | undefined);`,
        );
      } else {
        lines.push(`    const url = ${urlExpr};`);
      }

      // --- Fetch call -----------------------------------------------------
      if (hasBody) {
        lines.push(`    return fetch(url, {`);
        lines.push(`      method: "${method.toUpperCase()}",`);
        lines.push(
          `      headers: this.headers({ "Content-Type": "application/json" }),`,
        );
        lines.push(`      body: body ? JSON.stringify(body) : undefined,`);
        lines.push(`    });`);
      } else {
        lines.push(`    return fetch(url, {`);
        lines.push(`      method: "${method.toUpperCase()}",`);
        lines.push(`      headers: this.headers(),`);
        lines.push(`    });`);
      }

      lines.push('  }');
      lines.push('');
    }
  }

  // -- Close class --------------------------------------------------------
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// File writer
// ---------------------------------------------------------------------------

/**
 * Generate the SDK source and write it to the given output path.
 * Creates parent directories if they do not exist.
 */
export async function writeSdk(outputPath: string): Promise<void> {
  const source = generateSdkSource();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, source, 'utf-8');
}
