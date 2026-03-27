// -----------------------------------------------------------------------------
// Jira REST API v3 TypeScript interfaces
// -----------------------------------------------------------------------------

export interface JiraUser {
  accountId: string;
  emailAddress?: string;
  displayName: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
}

export interface JiraStatusCategory {
  id: number;
  key: string;
  name: string;
  colorName: string;
}

export interface JiraStatus {
  id: string;
  name: string;
  description?: string;
  statusCategory: JiraStatusCategory;
}

export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  subtask: boolean;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface JiraIssueFields {
  summary: string;
  description?: JiraDocContent | string | null;
  issuetype?: JiraIssueType;
  project?: JiraProject;
  status?: JiraStatus;
  priority?: JiraPriority;
  assignee?: JiraUser | null;
  reporter?: JiraUser | null;
  labels?: string[];
  created?: string;
  updated?: string;
  duedate?: string | null;
  [key: string]: unknown;
}

/** Atlassian Document Format (ADF) top-level node */
export interface JiraDocContent {
  type: 'doc';
  version: 1;
  content: JiraDocNode[];
}

export interface JiraDocNode {
  type: string;
  content?: JiraDocNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: JiraIssueFields;
}

export interface JiraTransition {
  id: string;
  name: string;
  to: JiraStatus;
  hasScreen: boolean;
  isGlobal: boolean;
  isInitial: boolean;
  isConditional: boolean;
}

export interface JiraTransitionsResponse {
  transitions: JiraTransition[];
}

export interface JiraSearchResponse {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraCreateIssueRequest {
  fields: {
    project: { key: string };
    summary: string;
    description?: JiraDocContent;
    issuetype: { name: string };
    priority?: { name: string };
    labels?: string[];
    [key: string]: unknown;
  };
}

export interface JiraCreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface JiraError {
  errorMessages: string[];
  errors: Record<string, string>;
}

export interface JiraClientConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraOrgConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  issueType?: string;
  statusMapping?: Record<string, string>;
}
