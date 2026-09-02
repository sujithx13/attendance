export const protectionKey = 'kahe-attendance-app';

type CaptureApi = {
  isAvailableAsync(): Promise<boolean>;
  preventScreenCaptureAsync(key: string): Promise<void>;
  enableAppSwitcherProtectionAsync(blur: number): Promise<void>;
};

export async function enableScreenProtection(api: CaptureApi, platform: string): Promise<void> {
  if (!await api.isAvailableAsync()) throw new Error('Capture protection is unavailable.');
  await api.preventScreenCaptureAsync(protectionKey);
  if (platform === 'ios') await api.enableAppSwitcherProtectionAsync(1);
}
