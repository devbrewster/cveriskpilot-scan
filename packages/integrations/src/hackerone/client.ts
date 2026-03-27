// ---------------------------------------------------------------------------
// HackerOne REST API v1 Client (t111)
// ---------------------------------------------------------------------------

export interface HackerOneConfig {
  apiToken: string;
  apiUsername: string;
  baseUrl?: string;
}

export interface HackerOneReport {
  id: string;
  type: 'report';
  attributes: {
    title: string;
    state: string;
    created_at: string;
    disclosed_at: string | null;
    triaged_at: string | null;
    closed_at: string | null;
    severity_rating: 'none' | 'low' | 'medium' | 'high' | 'critical' | null;
    vulnerability_information: string;
    weakness: {
      id: number;
      name: string;
      external_id: string; // CWE-xxx
    } | null;
    structured_scope: {
      asset_identifier: string;
      asset_type: string;
    } | null;
    cve_ids: string[];
    bounty_amount?: string | null;
    [key: string]: unknown;
  };
  relationships?: {
    severity?: {
      data: {
        attributes: {
          rating: string;
          score: number | null;
          attack_vector: string | null;
          attack_complexity: string | null;
        };
      };
    };
    weakness?: {
      data: {
        id: string;
        attributes: {
          name: string;
          external_id: string;
        };
      };
    };
  };
}

export interface HackerOneListResponse {
  data: HackerOneReport[];
  links: {
    self: string;
    next?: string;
    prev?: string;
  };
}

export interface HackerOneSingleResponse {
  data: HackerOneReport;
}

export interface ReportFilters {
  state?: string[];
  severity?: string[];
  created_after?: string;
  created_before?: string;
  triaged_after?: string;
  page_size?: number;
  page_number?: number;
}

export class HackerOneApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'HackerOneApiError';
  }
}

const DEFAULT_BASE_URL = 'https://api.hackerone.com/v1';

export class HackerOneClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: HackerOneConfig) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    const credentials = Buffer.from(
      `${config.apiUsername}:${config.apiToken}`,
    ).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Fetch vulnerability reports for a program.
   */
  async getReports(
    programHandle: string,
    filters?: ReportFilters,
  ): Promise<HackerOneReport[]> {
    const params = new URLSearchParams();

    if (filters?.state) {
      for (const s of filters.state) {
        params.append('filter[state][]', s);
      }
    }
    if (filters?.severity) {
      for (const s of filters.severity) {
        params.append('filter[severity][]', s);
      }
    }
    if (filters?.created_after) {
      params.set('filter[created_at__gt]', filters.created_after);
    }
    if (filters?.created_before) {
      params.set('filter[created_at__lt]', filters.created_before);
    }
    if (filters?.triaged_after) {
      params.set('filter[triaged_at__gt]', filters.triaged_after);
    }
    if (filters?.page_size) {
      params.set('page[size]', String(filters.page_size));
    }
    if (filters?.page_number) {
      params.set('page[number]', String(filters.page_number));
    }

    const qs = params.toString();
    const path = `/programs/${programHandle}/reports${qs ? `?${qs}` : ''}`;

    const response = await this.request<HackerOneListResponse>('GET', path);
    return response.data;
  }

  /**
   * Fetch a single report by ID.
   */
  async getReport(id: string): Promise<HackerOneReport> {
    const response = await this.request<HackerOneSingleResponse>(
      'GET',
      `/reports/${id}`,
    );
    return response.data;
  }

  /**
   * Update a report's state or other attributes.
   */
  async updateReport(
    id: string,
    data: { state?: string; message?: string; [key: string]: unknown },
  ): Promise<HackerOneReport> {
    const response = await this.request<HackerOneSingleResponse>(
      'PATCH',
      `/reports/${id}`,
      {
        data: {
          type: 'report',
          attributes: data,
        },
      },
    );
    return response.data;
  }

  // ---------------------------------------------------------------------------
  // Request helper
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = await res.text();
      }
      throw new HackerOneApiError(
        `HackerOne API error: ${res.status} ${res.statusText}`,
        res.status,
        errorBody,
      );
    }

    return (await res.json()) as T;
  }
}
