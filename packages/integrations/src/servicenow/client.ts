// ---------------------------------------------------------------------------
// ServiceNow REST API Client (t109)
// ---------------------------------------------------------------------------

export interface ServiceNowConfig {
  instanceUrl: string;
  auth:
    | { type: 'basic'; username: string; password: string }
    | { type: 'oauth2'; clientId: string; clientSecret: string; tokenUrl?: string };
}

export interface ServiceNowIncident {
  sys_id: string;
  number: string;
  short_description: string;
  description: string;
  state: string;
  priority: string;
  severity: string;
  category: string;
  subcategory: string;
  assignment_group: string;
  assigned_to: string;
  caller_id: string;
  impact: string;
  urgency: string;
  opened_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  sys_updated_on: string;
  sys_created_on: string;
  [key: string]: unknown;
}

export interface CreateIncidentData {
  short_description: string;
  description?: string;
  category?: string;
  subcategory?: string;
  priority?: string;
  severity?: string;
  impact?: string;
  urgency?: string;
  assignment_group?: string;
  assigned_to?: string;
  caller_id?: string;
  [key: string]: unknown;
}

export interface IncidentQueryFilter {
  state?: string;
  priority?: string;
  category?: string;
  assignment_group?: string;
  sysparm_query?: string;
  sysparm_limit?: number;
  sysparm_offset?: number;
}

export class ServiceNowApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ServiceNowApiError';
  }
}

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class ServiceNowClient {
  private readonly instanceUrl: string;
  private readonly config: ServiceNowConfig;
  private oauthToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: ServiceNowConfig) {
    this.instanceUrl = config.instanceUrl.replace(/\/+$/, '');
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  async createIncident(data: CreateIncidentData): Promise<ServiceNowIncident> {
    return this.request<{ result: ServiceNowIncident }>(
      'POST',
      '/api/now/table/incident',
      data,
    ).then((r) => r.result);
  }

  async updateIncident(
    sysId: string,
    data: Partial<CreateIncidentData>,
  ): Promise<ServiceNowIncident> {
    return this.request<{ result: ServiceNowIncident }>(
      'PATCH',
      `/api/now/table/incident/${sysId}`,
      data,
    ).then((r) => r.result);
  }

  async getIncident(sysId: string): Promise<ServiceNowIncident> {
    return this.request<{ result: ServiceNowIncident }>(
      'GET',
      `/api/now/table/incident/${sysId}`,
    ).then((r) => r.result);
  }

  async queryIncidents(
    filter: IncidentQueryFilter,
  ): Promise<ServiceNowIncident[]> {
    const params = new URLSearchParams();

    if (filter.sysparm_query) {
      params.set('sysparm_query', filter.sysparm_query);
    } else {
      const queryParts: string[] = [];
      if (filter.state) queryParts.push(`state=${filter.state}`);
      if (filter.priority) queryParts.push(`priority=${filter.priority}`);
      if (filter.category) queryParts.push(`category=${filter.category}`);
      if (filter.assignment_group) {
        queryParts.push(`assignment_group=${filter.assignment_group}`);
      }
      if (queryParts.length > 0) {
        params.set('sysparm_query', queryParts.join('^'));
      }
    }

    if (filter.sysparm_limit) {
      params.set('sysparm_limit', String(filter.sysparm_limit));
    }
    if (filter.sysparm_offset) {
      params.set('sysparm_offset', String(filter.sysparm_offset));
    }

    const qs = params.toString();
    const path = `/api/now/table/incident${qs ? `?${qs}` : ''}`;

    return this.request<{ result: ServiceNowIncident[] }>('GET', path).then(
      (r) => r.result,
    );
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  private async getAuthHeader(): Promise<string> {
    const { auth } = this.config;

    if (auth.type === 'basic') {
      const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      return `Basic ${credentials}`;
    }

    // OAuth2
    if (this.oauthToken && Date.now() < this.tokenExpiresAt) {
      return `Bearer ${this.oauthToken}`;
    }

    const tokenUrl =
      auth.tokenUrl ?? `${this.instanceUrl}/oauth_token.do`;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new ServiceNowApiError(
        `OAuth token request failed: ${res.status}`,
        res.status,
      );
    }

    const tokenData = (await res.json()) as OAuthTokenResponse;
    this.oauthToken = tokenData.access_token;
    // Refresh 60s before expiry
    this.tokenExpiresAt = Date.now() + (tokenData.expires_in - 60) * 1000;

    return `Bearer ${this.oauthToken}`;
  }

  // ---------------------------------------------------------------------------
  // Request helper
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.instanceUrl}${path}`;
    const authHeader = await this.getAuthHeader();

    const headers: Record<string, string> = {
      Authorization: authHeader,
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
      throw new ServiceNowApiError(
        `ServiceNow API error: ${res.status} ${res.statusText}`,
        res.status,
        errorBody,
      );
    }

    return (await res.json()) as T;
  }
}
