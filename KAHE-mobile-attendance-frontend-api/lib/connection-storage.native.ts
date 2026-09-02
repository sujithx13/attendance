import * as FileSystem from 'expo-file-system/legacy';

function settingsFile(): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}attendance-server.txt` : null;
}

export async function readServerAddress(): Promise<string | null> {
  const file = settingsFile();
  if (!file) return null;
  try { return await FileSystem.readAsStringAsync(file); }
  catch { return null; }
}

export async function saveServerAddress(address: string): Promise<void> {
  const file = settingsFile();
  if (file) await FileSystem.writeAsStringAsync(file, address);
}
