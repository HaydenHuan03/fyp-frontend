import type { UserRole } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export interface LoginResponseData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponseData> {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Login failed');
  }

  return res.json() as Promise<LoginResponseData>;
}

export async function apiRefreshToken(refreshToken: string): Promise<LoginResponseData> {
  const res = await fetch(`${BASE_URL}/users/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    throw new Error('Token refresh failed');
  }

  return res.json() as Promise<LoginResponseData>;
}


/** Decode JWT payload without verifying signature (verification is done server-side). */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) throw new Error('Invalid token');
  const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json) as Record<string, unknown>;
}

/** Extract the user role from a Keycloak-issued JWT. */
export function roleFromToken(token: string): UserRole {
  const payload = decodeJwtPayload(token);
  const roles = (payload.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
  return roles.includes('admin') ? 'admin' : 'user';
}

export type UserRoleType = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRoleType;
  is_active: boolean;
  created_at: string;   // ISO string
  keycloak_id?: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRoleType;
}

export interface UpdateUserPayload {
  first_name?: string;
  last_name?: string;
  role?: UserRoleType;
  is_active?: boolean;
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

// ── Auth bridge + fetch interceptor ─────────────────────────────────────────
// AuthContext registers a refresh callback with this bridge at mount. When any
// authenticated request hits 401, `authFetch` asks the bridge for a refreshed
// access token and retries the request once. Concurrent 401s share a single
// in-flight refresh promise.

interface AuthBridge {
  /** Refresh the access token and return the new one. */
  refresh: () => Promise<string>;
  /** Called when refresh fails — caller should prompt the user to log in. */
  onUnauthorized: () => void;
}

let authBridge: AuthBridge | null = null;
let refreshInFlight: Promise<string> | null = null;

export function registerAuthBridge(bridge: AuthBridge): () => void {
  authBridge = bridge;
  return () => {
    if (authBridge === bridge) authBridge = null;
  };
}

function refreshAccessTokenDeduped(): Promise<string> {
  if (!authBridge) return Promise.reject(new Error('No auth bridge registered'));
  if (!refreshInFlight) {
    refreshInFlight = authBridge.refresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function authFetch(
  url: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = (accessToken: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers });
  };

  const first = await send(token);
  if (first.status !== 401) return first;

  try {
    const fresh = await refreshAccessTokenDeduped();
    const retry = await send(fresh);
    if (retry.status === 401) authBridge?.onUnauthorized();
    return retry;
  } catch {
    authBridge?.onUnauthorized();
    return first;
  }
}

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (res.status === 401) {
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? fallbackMessage);
  }
  return res.json() as Promise<T>;
}

export async function apiGetUsers(token: string): Promise<User[]> {
  const res = await authFetch(`${BASE_URL}/users/`, token, {
    headers: authHeaders(token),
  });
  return handleResponse<User[]>(res, 'Failed to fetch users');
}

export async function apiCreateUser(
  token: string,
  data: CreateUserPayload,
): Promise<User> {
  const res = await authFetch(`${BASE_URL}/users/`, token, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<User>(res, 'Failed to create user');
}

export async function apiUpdateUser(
  token: string,
  id: string,
  data: UpdateUserPayload,
): Promise<User> {
  const res = await authFetch(`${BASE_URL}/users/${id}`, token, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<User>(res, 'Failed to update user');
}

export async function apiDeleteUser(token: string, id: string): Promise<void> {
  const res = await authFetch(`${BASE_URL}/users/${id}`, token, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 401) {
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to delete user');
  }
}

// ── Chat ────────────────────────────────────────────────────────────────────

export interface Conversation {
  id: number;
  case_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: string[] | null;
  created_at: string;
}

export async function apiListConversations(token: string): Promise<Conversation[]> {
  const res = await authFetch(`${BASE_URL}/chat/conversations`, token, {
    headers: authHeaders(token),
  });
  return handleResponse<Conversation[]>(res, 'Failed to fetch conversations');
}

export async function apiCreateConversation(token: string, title: string): Promise<Conversation> {
  const res = await authFetch(`${BASE_URL}/chat/conversations`, token, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  return handleResponse<Conversation>(res, 'Failed to create conversation');
}

export async function apiRenameConversation(token: string, id: number, title: string): Promise<Conversation> {
  const res = await authFetch(`${BASE_URL}/chat/conversations/${id}`, token, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  return handleResponse<Conversation>(res, 'Failed to rename conversation');
}

export async function apiDeleteConversation(token: string, id: number): Promise<void> {
  const res = await authFetch(`${BASE_URL}/chat/conversations/${id}`, token, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 401) {
    throw new Error('Session expired. Please log in again.');
  }
  if (res.status === 204) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to delete conversation');
  }
}

export async function apiGetConversationMessages(token: string, id: number): Promise<ChatMessage[]> {
  const res = await authFetch(`${BASE_URL}/chat/conversations/${id}/messages`, token, {
    headers: authHeaders(token),
  });
  return handleResponse<ChatMessage[]>(res, 'Failed to fetch messages');
}

/** WebSocket base URL derived from the REST base URL. */
export const WS_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000')
  .replace(/^https/, 'wss')
  .replace(/^http/, 'ws');

// ── Knowledge Base (RAG Documents) ──────────────────────────────────────────

export type IngestStatus = 'pending' | 'ingesting' | 'ingested' | 'failed';

export interface DocumentListItem {
  id: number;
  filename: string;
  uploaded_by: string;
  uploaded_at: string;   // ISO string
  ingest_status: IngestStatus;
  chunk_count: number;
}

export interface DocumentUploadResult {
  filename: string;
  success: boolean;
  id?: number;
  ingest_status?: IngestStatus;
  error?: string;
}

export interface IngestResult {
  id: number;
  filename: string;
  ingest_status?: IngestStatus;
  chunk_count?: number;
  error?: string;
}

export interface ChunkPreviewItem {
  id: string;
  text: string;
  metadata: Record<string, unknown>;
}

export async function apiListDocuments(token: string): Promise<DocumentListItem[]> {
  const res = await authFetch(`${BASE_URL}/rag/documents`, token, {
    headers: authHeaders(token),
  });
  return handleResponse<DocumentListItem[]>(res, 'Failed to fetch documents');
}

export async function apiUploadDocuments(
  token: string,
  files: File[],
): Promise<DocumentUploadResult[]> {
  const form = new FormData();
  for (const file of files) form.append('files', file);
  const res = await authFetch(`${BASE_URL}/rag/documents`, token, {
    method: 'POST',
    body: form,
  });
  return handleResponse<DocumentUploadResult[]>(res, 'Failed to upload documents');
}

export async function apiIngestDocuments(token: string, ids: number[]): Promise<IngestResult[]> {
  const res = await authFetch(`${BASE_URL}/rag/documents/ingest`, token, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ document_ids: ids }),
  });
  return handleResponse<IngestResult[]>(res, 'Failed to ingest documents');
}

export async function apiListDocumentChunks(
  token: string,
  documentId: number,
  limit = 50,
  offset = 0,
): Promise<ChunkPreviewItem[]> {
  const res = await authFetch(
    `${BASE_URL}/rag/documents/${documentId}/chunks?limit=${limit}&offset=${offset}`,
    token,
    { headers: authHeaders(token) },
  );
  return handleResponse<ChunkPreviewItem[]>(res, 'Failed to fetch chunks');
}

export async function apiDeleteDocument(token: string, id: number): Promise<void> {
  const res = await authFetch(`${BASE_URL}/rag/documents/${id}`, token, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 401) {
    throw new Error('Session expired. Please log in again.');
  }
  if (res.status === 204) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to delete document');
  }
}

// ── Agent / Case Analysis ────────────────────────────────────────────────────

export type ReportStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AnalyseStarted {
  report_id: string;
  status: ReportStatus;
}

export interface ReportStatusResponse {
  report_id: string;
  case_id: string;
  status: ReportStatus;
  generated_at: string;
  completed_at: string | null;
}

export interface DetectedPattern {
  pattern: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ApplicableLaw {
  law: string;
  section: string;
  text: string;
  relevance: string;
}

export interface PrecedentCase {
  case: string;
  court: string;
  excerpt: string;
  outcome: string;
}

export interface ReportContent {
  case_summary: string;
  detected_patterns: DetectedPattern[];
  applicable_laws: ApplicableLaw[];
  precedent_cases: PrecedentCase[];
  recommended_actions: string[];
}

export interface ReportResponse {
  report_id: string;
  case_id: string;
  status: ReportStatus;
  content: ReportContent | null;
  laws_cited: string[] | null;
  precedents: string[] | null;
  generated_at: string;
}

export interface UploadResponse {
  case_id: string;
  filename: string;
  chunks_ingested: number;
}

/** Upload a case PDF without triggering analysis. */
export async function apiUploadCaseDocument(
  token: string,
  caseId: string,
  file: File,
): Promise<UploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch(`${BASE_URL}/agent/cases/${caseId}/upload`, token, {
    method: 'POST',
    body: form,
  });
  return handleResponse<UploadResponse>(res, 'Failed to upload case document');
}

/** Upload a case PDF and trigger agentic analysis. */
export async function apiAnalyseCase(
  token: string,
  caseId: string,
  file: File,
): Promise<AnalyseStarted> {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch(`${BASE_URL}/agent/cases/${caseId}/analyse`, token, {
    method: 'POST',
    body: form,
  });
  return handleResponse<AnalyseStarted>(res, 'Failed to start analysis');
}

/** Poll the status of the latest analysis for a case. */
export async function apiGetCaseStatus(
  token: string,
  caseId: string,
): Promise<ReportStatusResponse> {
  const res = await authFetch(`${BASE_URL}/agent/cases/${caseId}/status`, token, {
    headers: authHeaders(token),
  });
  return handleResponse<ReportStatusResponse>(res, 'Failed to fetch case status');
}

/** Fetch the completed analysis report for a case. */
export async function apiGetCaseReport(
  token: string,
  caseId: string,
): Promise<ReportResponse> {
  const res = await authFetch(`${BASE_URL}/agent/cases/${caseId}/report`, token, {
    headers: authHeaders(token),
  });
  return handleResponse<ReportResponse>(res, 'Failed to fetch case report');
}

/** Create a chat conversation linked to a specific case. */
export async function apiCreateCaseConversation(
  token: string,
  caseId: string,
  title: string,
): Promise<Conversation> {
  const res = await authFetch(`${BASE_URL}/agent/cases/${caseId}/conversations`, token, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  return handleResponse<Conversation>(res, 'Failed to create case conversation');
}

export interface FileUploadResult {
  id: string;
  filename: string;
  text: string;
  preview: string;
  truncated: boolean;
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export interface AlertItem {
  id: number;
  user_id: string;
  conversation_id: number | null;
  chat_message_id: number | null;
  query: string;
  created_at: string;
}

export async function apiListAlerts(token: string): Promise<AlertItem[]> {
  const res = await authFetch(`${BASE_URL}/alerts/`, token, {
    headers: authHeaders(token),
  });
  return handleResponse<AlertItem[]>(res, 'Failed to fetch alerts');
}

export async function apiDeleteAlert(token: string, id: number): Promise<void> {
  const res = await authFetch(`${BASE_URL}/alerts/${id}`, token, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 401) throw new Error('Session expired. Please log in again.');
  if (res.status === 204) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to delete alert');
  }
}

/** Upload a file to a chat conversation and extract its text for prompt injection. */
export async function apiUploadChatAttachment(
  token: string,
  conversationId: number,
  file: File,
): Promise<FileUploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch(`${BASE_URL}/chat/conversations/${conversationId}/upload`, token, {
    method: 'POST',
    body: form,
  });
  return handleResponse<FileUploadResult>(res, 'Failed to process attachment');
}
