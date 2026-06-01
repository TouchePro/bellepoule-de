/**
 * Global declarations for ElectronAPI
 * This file ensures window.electronAPI is properly typed globally
 */

import type { ElectronAPI } from '../shared/types/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
