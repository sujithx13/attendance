import type { AuthSession } from './api';
import { getApiBaseUrl } from './api';
export async function saveAuth(auth: AuthSession | null) { if (auth) localStorage.setItem('kahe_session', JSON.stringify({server:getApiBaseUrl(),auth})); else localStorage.removeItem('kahe_session'); }
export async function readAuth(): Promise<AuthSession | null> { try { const value=JSON.parse(localStorage.getItem('kahe_session') || 'null'); return value?.server===getApiBaseUrl() && value?.auth?.token ? value.auth : null; } catch { return null; } }
