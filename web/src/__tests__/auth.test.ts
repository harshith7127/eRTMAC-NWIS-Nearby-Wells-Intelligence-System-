import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';

describe('Secure Authentication Store & Cryptographic Clearance', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    useAuthStore.setState({
      failedAttempts: 0,
      lockoutUntil: null,
      error: null
    });
  });

  it('initializes in locked unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.sessionToken).toBeNull();
  });

  it('rejects invalid username with security error', async () => {
    const res = await useAuthStore.getState().login('unauthorized_hacker', 'password123');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid security credentials');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().failedAttempts).toBe(1);
  });

  it('rejects incorrect password for valid user', async () => {
    const res = await useAuthStore.getState().login('oil_admin', 'WrongPass#123');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid security credentials');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().failedAttempts).toBe(1);
  });

  it('authenticates valid credentials and generates secure session token', async () => {
    const res = await useAuthStore.getState().login('oil_admin', 'OilIndia#2026@DrillSec!');
    expect(res.success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.username).toBe('oil_admin');
    expect(useAuthStore.getState().user?.role).toContain('Drilling Intelligence Lead');
    expect(useAuthStore.getState().sessionToken).toBeDefined();
    expect(useAuthStore.getState().sessionToken?.length).toBe(64); // 32 bytes hex
  });

  it('authenticates valid email format alias', async () => {
    const res = await useAuthStore.getState().login('admin@oilindia.in', 'OilIndia#2026@DrillSec!');
    expect(res.success).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('triggers security lockout after 5 consecutive failed attempts', async () => {
    for (let i = 0; i < 4; i++) {
      await useAuthStore.getState().login('oil_admin', 'BadPass' + i);
    }
    expect(useAuthStore.getState().failedAttempts).toBe(4);
    expect(useAuthStore.getState().lockoutUntil).toBeNull();

    // 5th attempt triggers lockout
    const res5 = await useAuthStore.getState().login('oil_admin', 'BadPass5');
    expect(res5.success).toBe(false);
    expect(res5.error).toContain('Maximum authentication attempts exceeded');
    expect(useAuthStore.getState().lockoutUntil).toBeGreaterThan(Date.now());
  });

  it('clears session token on logout', async () => {
    await useAuthStore.getState().login('oil_admin', 'OilIndia#2026@DrillSec!');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().sessionToken).toBeNull();
  });
});
