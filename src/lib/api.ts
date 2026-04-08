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

async function handleResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('finguard:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? fallbackMessage);
  }
  return res.json() as Promise<T>;
}

export async function apiGetUsers(token: string): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users/`, {
    headers: authHeaders(token),
  });
  return handleResponse<User[]>(res, 'Failed to fetch users');
}

export async function apiCreateUser(
  token: string,
  data: CreateUserPayload,
): Promise<User> {
  const res = await fetch(`${BASE_URL}/users/`, {
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
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handleResponse<User>(res, 'Failed to update user');
}

export async function apiDeleteUser(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('finguard:unauthorized'));
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
  const res = await fetch(`${BASE_URL}/chat/conversations`, {
    headers: authHeaders(token),
  });
  return handleResponse<Conversation[]>(res, 'Failed to fetch conversations');
}

export async function apiCreateConversation(token: string, title: string): Promise<Conversation> {
  const res = await fetch(`${BASE_URL}/chat/conversations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  return handleResponse<Conversation>(res, 'Failed to create conversation');
}

export async function apiDeleteConversation(token: string, id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/chat/conversations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('finguard:unauthorized'));
    throw new Error('Session expired. Please log in again.');
  }
  if (res.status === 204) return;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to delete conversation');
  }
}

export async function apiGetConversationMessages(token: string, id: number): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE_URL}/chat/conversations/${id}/messages`, {
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
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;   // ISO string
  ingest_status: IngestStatus;
  ingested_at: string | null;
}

export interface DocumentUploadResult {
  filename: string;
  success: boolean;
  id?: number;
  file_size?: number;
  ingest_status?: IngestStatus;
  uploaded_at?: string;
  error?: string;
}

export interface IngestResult {
  id: number;
  filename: string;
  success: boolean;
  ingest_status?: IngestStatus;
  error?: string;
}

export async function apiListDocuments(token: string): Promise<DocumentListItem[]> {
  const res = await fetch(`${BASE_URL}/rag/documents`, {
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
  const res = await fetch(`${BASE_URL}/rag/documents`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return handleResponse<DocumentUploadResult[]>(res, 'Failed to upload documents');
}

export async function apiIngestDocuments(token: string, ids: number[]): Promise<IngestResult[]> {
  const res = await fetch(`${BASE_URL}/rag/documents/ingest`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ document_ids: ids }),
  });
  return handleResponse<IngestResult[]>(res, 'Failed to ingest documents');
}

export async function apiDeleteDocument(token: string, id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/rag/documents/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('finguard:unauthorized'));
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
  const res = await fetch(`${BASE_URL}/agent/cases/${caseId}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
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
  const res = await fetch(`${BASE_URL}/agent/cases/${caseId}/analyse`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return handleResponse<AnalyseStarted>(res, 'Failed to start analysis');
}

/** Poll the status of the latest analysis for a case. */
export async function apiGetCaseStatus(
  token: string,
  caseId: string,
): Promise<ReportStatusResponse> {
  const res = await fetch(`${BASE_URL}/agent/cases/${caseId}/status`, {
    headers: authHeaders(token),
  });
  return handleResponse<ReportStatusResponse>(res, 'Failed to fetch case status');
}

/** Fetch the completed analysis report for a case. */
export async function apiGetCaseReport(
  token: string,
  caseId: string,
): Promise<ReportResponse> {
  const res = await fetch(`${BASE_URL}/agent/cases/${caseId}/report`, {
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
  const res = await fetch(`${BASE_URL}/agent/cases/${caseId}/conversations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  return handleResponse<Conversation>(res, 'Failed to create case conversation');
}
