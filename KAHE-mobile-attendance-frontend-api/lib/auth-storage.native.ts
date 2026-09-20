import * as FileSystem from 'expo-file-system/legacy';
import type { AuthSession } from './api';
import { getApiBaseUrl } from './api';
const file = () => { if(!FileSystem.documentDirectory) throw new Error('Device storage unavailable.'); return FileSystem.documentDirectory+'attendance-session.json'; };
export async function saveAuth(auth: AuthSession | null) { if(auth) await FileSystem.writeAsStringAsync(file(),JSON.stringify({server:getApiBaseUrl(),auth})); else await FileSystem.deleteAsync(file(),{idempotent:true}); }
export async function readAuth(): Promise<AuthSession | null> { try { const value=JSON.parse(await FileSystem.readAsStringAsync(file())); return value?.server===getApiBaseUrl() && value?.auth?.token ? value.auth : null; } catch { return null; } }
