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
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Login failed');
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

// ── User Management ──────────────────────────────────────────────
// Backend schema (PATCH /users, POST /users, GET /users):
//   GET/POST response: { id, email, full_name, role: 'admin'|'user', is_active, created_at, keycloak_id? }
//   POST body:         { email, password, full_name, role? }
//   PATCH body:        { full_name?, role?, is_active? }

export type UserRoleType = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRoleType;
  is_active: boolean;
  created_at: string;   // ISO string
  keycloak_id?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  role?: UserRoleType;
}

export interface UpdateUserPayload {
  full_name?: string;
  role?: UserRoleType;
  is_active?: boolean;
}

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function apiGetUsers(token: string): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users/`, {
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to fetch users');
  }
  return res.json() as Promise<User[]>;
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to create user');
  }
  return res.json() as Promise<User>;
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to update user');
  }
  return res.json() as Promise<User>;
}

export async function apiDeleteUser(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? 'Failed to delete user');
  }
}
