import { LocalStorageDriver } from './local';
import { SupabaseStorageDriver } from './supabase';
import type { StorageDriver } from './types';

export * from './local';
export * from './supabase';
export * from './types';

let cachedDriver: StorageDriver | null = null;

export function getStorageDriver(): StorageDriver {
  if (cachedDriver) {
    return cachedDriver;
  }

  const driverType = process.env.STORAGE_DRIVER;
  const isLocalMode = process.env.LOCAL_MODE === 'true';

  if (driverType === 'supabase' && !isLocalMode) {
    cachedDriver = new SupabaseStorageDriver();
  } else {
    cachedDriver = new LocalStorageDriver();
  }

  return cachedDriver;
}

export function resetStorageDriver(): void {
  cachedDriver = null;
}
