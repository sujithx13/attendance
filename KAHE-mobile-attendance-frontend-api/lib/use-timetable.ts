import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getMyTimetable, type MobileTimetableSlot } from './api';
import { getErrorMessage } from '../theme';

export function useTimetable(token: string) {
  const [slots, setSlots] = useState<MobileTimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true, busy = false;
    const refresh = async () => {
      if (busy) return;
      busy = true;
      try { const result = await getMyTimetable(token); if (active) { setSlots(result.slots); setError(''); } }
      catch (err) { if (active) setError(getErrorMessage(err)); }
      finally { busy = false; if (active) setLoading(false); }
    };
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 10000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [token]);
  return { slots, loading, error };
}
