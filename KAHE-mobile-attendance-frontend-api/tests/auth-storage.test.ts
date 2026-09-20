import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readAuth,saveAuth } from '../lib/auth-storage';
import { setCustomApiBaseUrl } from '../lib/api';
describe('persisted sign-in',()=>{
 beforeEach(()=>{const data=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)});setCustomApiBaseUrl('https://campus.example/api/v1');});
 it('restores a saved sign-in and removes it for testing logout',async()=>{const auth={token:'session-token',user:{id:'student',fullName:'Student',role:'STUDENT'}};await saveAuth(auth);expect(await readAuth()).toEqual(auth);await saveAuth(null);expect(await readAuth()).toBeNull();});
 it('never restores credentials for a different attendance server',async()=>{await saveAuth({token:'session-token',user:{id:'student',fullName:'Student',role:'STUDENT'}});setCustomApiBaseUrl('https://different.example');expect(await readAuth()).toBeNull();});
});
