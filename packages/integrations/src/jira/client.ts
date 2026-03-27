// -----------------------------------------------------------------------------
// Jira REST API v3 client
// -----------------------------------------------------------------------------

import type {
  JiraClientConfig,
  JiraIssue,
  JiraCreateIssueRequest,
  JiraCreateIssueResponse,
  JiraTransitionsResponse,
  JiraSearchResponse,
  JiraError,
} from './types';

export class JiraApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly jiraErrors?: JiraError,
  ) {
    super(message);
    this.name = 'JiraApiError';
  }
}

export class JiraClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: JiraClientConfig) {
    // Normalise base URL — strip trailing slash
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    const credentials = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${path}`;

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new JiraApiError(
        `Network error communicating with Jira: ${(err as Error).message}`,
        0,
      );
    }

    // 204 No Content (e.g. successful transition)
    if (res.status === 204) {
      return undefined as unknown as T;
    }

    const responseBody = await res.text();

    if (!res.ok) {
      let jiraErrors: JiraError | undefined;
      try {
        jiraErrors = JSON.parse(responseBody) as JiraError;
      } catch {
        // not JSON — leave undefined
      }

      throw new JiraApiError(
        `Jira API error ${res.status}: ${responseBody}`,
        res.status,
        jiraErrors,
      );
    }

    if (!responseBody) {
      return undefined as unknown as T;
    }

    return JSON.parse(responseBody) as T;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Create a new Jira issue. */
  async createIssue(payload: JiraCreateIssueRequest): Promise<JiraCreateIssueResponse> {
    return this.request<JiraCreateIssueResponse>('POST', '/issue', payload);
  }

  /** Fetch a single issue by key (e.g. "VULN-123"). */
  async getIssue(issueKeyOrId: string, fields?: string[]): Promise<JiraIssue> {
    const params = fields ? `?fields=${fields.join(',')}` : '';
    return this.request<JiraIssue>('GET', `/issue/${issueKeyOrId}${params}`);
  }

  /** Update an existing issue's fields. */
  async updateIssue(
    issueKeyOrId: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    await this.request<void>('PUT', `/issue/${issueKeyOrId}`, { fields });
  }

  /** Get available transitions for an issue. */
  async getTransitions(issueKeyOrId: string): Promise<JiraTransitionsResponse> {
    return this.request<JiraTransitionsResponse>(
      'GET',
      `/issue/${issueKeyOrId}/transitions`,
    );
  }

  /** Execute a transition on an issue. */
  async transitionIssue(
    issueKeyOrId: string,
    transitionId: string,
  ): Promise<void> {
    await this.request<void>('POST', `/issue/${issueKeyOrId}/transitions`, {
      transition: { id: transitionId },
    });
  }

  /** Search for issues using JQL. */
  async searchJql(
    jql: string,
    options?: { startAt?: number; maxResults?: number; fields?: string[] },
  ): Promise<JiraSearchResponse> {
    return this.request<JiraSearchResponse>('POST', '/search', {
      jql,
      startAt: options?.startAt ?? 0,
      maxResults: options?.maxResults ?? 50,
      fields: options?.fields ?? ['summary', 'status', 'assignee', 'priority', 'updated'],
    });
  }
}
