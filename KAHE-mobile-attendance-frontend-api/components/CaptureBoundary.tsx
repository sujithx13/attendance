import type { ReactNode } from 'react';

// Browsers do not provide a reliable screenshot prevention API.
export function CaptureBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
