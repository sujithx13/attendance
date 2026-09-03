import { describe, expect, it, vi } from 'vitest';
import { enableScreenProtection, protectionKey } from '../lib/screen-protection';

describe('native screen protection initialization', () => {
  const capture = () => ({ isAvailableAsync: vi.fn().mockResolvedValue(true), preventScreenCaptureAsync: vi.fn().mockResolvedValue(undefined), enableAppSwitcherProtectionAsync: vi.fn().mockResolvedValue(undefined) });

  it('enables Android capture protection before initialization completes', async () => {
    const api = capture();
    await enableScreenProtection(api, 'android');
    expect(api.preventScreenCaptureAsync).toHaveBeenCalledWith(protectionKey);
    expect(api.enableAppSwitcherProtectionAsync).not.toHaveBeenCalled();
  });

  it('fails closed when the native capability is unavailable', async () => {
    const api = capture();
    api.isAvailableAsync.mockResolvedValue(false);
    await expect(enableScreenProtection(api, 'android')).rejects.toThrow('unavailable');
    expect(api.preventScreenCaptureAsync).not.toHaveBeenCalled();
  });

  it('propagates platform failures so protected content stays hidden', async () => {
    const api = capture();
    api.preventScreenCaptureAsync.mockRejectedValue(new Error('Native failure'));
    await expect(enableScreenProtection(api, 'android')).rejects.toThrow('Native failure');
  });
});
