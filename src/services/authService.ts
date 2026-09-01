/**
 * Authentication service placeholders.
 * Customer authentication and staff authorization are intentionally separate.
 * A normal authenticated customer must never gain staff access by navigating to /staff.
 */

import type { User, UserRole } from '../types';

const STORAGE_KEY = 'titlebridge_auth';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Mock user store – replace with real API calls */
const MOCK_USERS: Record<string, User & { password: string }> = {
  'customer@example.com': {
    id: 'usr_cust_001',
    email: 'customer@example.com',
    firstName: 'Alex',
    lastName: 'Customer',
    role: 'customer',
    isAuthenticated: true,
    password: 'password',
  },
  'staff@example.com': {
    id: 'usr_staff_001',
    email: 'staff@example.com',
    firstName: 'Sam',
    lastName: 'Staff',
    role: 'staff',
    isAuthenticated: true,
    password: 'password',
  },
  'admin@example.com': {
    id: 'usr_admin_001',
    email: 'admin@example.com',
    firstName: 'Ada',
    lastName: 'Admin',
    role: 'admin',
    isAuthenticated: true,
    password: 'password',
  },
};

function persist(user: User | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Customer / general login. Does not grant staff privileges.
 */
export async function login(credentials: LoginCredentials): Promise<User> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 400));

  const record = MOCK_USERS[credentials.email.toLowerCase()];
  if (!record || record.password !== credentials.password) {
    throw new Error('Invalid email or password');
  }

  const { password: _, ...user } = record;
  persist(user);
  return user;
}

/**
 * Staff-only login path. Requires staff or admin role.
 * Separate from customer authentication.
 */
export async function staffLogin(credentials: LoginCredentials): Promise<User> {
  await new Promise((r) => setTimeout(r, 400));

  const record = MOCK_USERS[credentials.email.toLowerCase()];
  if (!record || record.password !== credentials.password) {
    throw new Error('Invalid email or password');
  }
  if (record.role !== 'staff' && record.role !== 'admin') {
    throw new Error('Staff access required. Customer accounts cannot access staff areas.');
  }

  const { password: _, ...user } = record;
  persist(user);
  return user;
}

export async function register(data: RegisterData): Promise<User> {
  await new Promise((r) => setTimeout(r, 500));

  if (MOCK_USERS[data.email.toLowerCase()]) {
    throw new Error('An account with this email already exists');
  }

  const user: User = {
    id: `usr_${Date.now()}`,
    email: data.email.toLowerCase(),
    firstName: data.firstName,
    lastName: data.lastName,
    role: 'customer',
    isAuthenticated: true,
  };

  // In production this would call the API; here we only persist for the session
  persist(user);
  return user;
}

export function logout(): void {
  persist(null);
}

export function isStaffRole(role: UserRole | undefined): boolean {
  return role === 'staff' || role === 'admin';
}

export function hasStaffAccess(user: User | null): boolean {
  return !!user && isStaffRole(user.role);
}
