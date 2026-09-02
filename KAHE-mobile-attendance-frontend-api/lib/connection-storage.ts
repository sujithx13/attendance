const key = 'kahe_attendance_server';

export async function readServerAddress(): Promise<string | null> {
  try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; }
  catch { return null; }
}

export async function saveServerAddress(address: string): Promise<void> {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, address); }
  catch { /* Connection still works when browser storage is disabled. */ }
}
