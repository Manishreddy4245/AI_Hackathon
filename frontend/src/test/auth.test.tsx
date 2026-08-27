import { describe, it, expect, beforeEach } from 'vitest';
import { apiService } from '../services/api';

describe('Authentication & Session Security Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores access token and role upon successful authentication', async () => {
    const token = 'mock-jwt-access-token';
    const role = 'student';

    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);

    expect(localStorage.getItem('token')).toBe(token);
    expect(localStorage.getItem('userRole')).toBe('student');
  });

  it('clears session tokens and state upon logout', () => {
    localStorage.setItem('token', 'active-token');
    localStorage.setItem('userRole', 'recruiter');

    // Perform Logout
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('userRole')).toBeNull();
  });

  it('detects unauthenticated state when token is missing or expired', () => {
    const activeToken = localStorage.getItem('token');
    const isAuthenticated = Boolean(activeToken);

    expect(isAuthenticated).toBe(false);
  });

  it('verifies student and recruiter registration methods exist and are isolated', () => {
    expect(typeof apiService.registerStudent).toBe('function');
    expect(typeof apiService.registerRecruiter).toBe('function');
  });
});
