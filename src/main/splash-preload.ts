import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('splashAPI', {
  confirm: (lang: string) => ipcRenderer.send('splash:confirm', lang),
  close: () => ipcRenderer.send('splash:close'),
  onInit: (cb: (savedLang: string) => void) =>
    ipcRenderer.once('splash:init', (_event, lang: string) => cb(lang)),
});
