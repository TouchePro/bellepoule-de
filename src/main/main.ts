/**
 * BellePoule Modern - Electron Main Process
 * Licensed under GPL-3.0
 */

import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import JSZip from 'jszip';
import { DatabaseManager } from '../database';
import { RemoteScoreServer } from './remoteScoreServer';
import { AutoUpdater } from './autoUpdater';
import { Competition, Fencer, FencerStatus, Match, MatchStatus, Pool } from '../shared/types';

// Database instance
const db = new DatabaseManager();

// Remote score server
let remoteScoreServer: any = null;
let remoteScoreServerPort: number = 8066;

// Auto updater
let autoUpdater: AutoUpdater | null = null;

// Main window reference
let mainWindow: BrowserWindow | null = null;

// Current UI language (kept in sync via IPC)
let currentMenuLanguage = 'fr';

// ============================================================================
// Menu Translations
// ============================================================================

type MenuLang = 'fr' | 'en' | 'de' | 'zh-HK';

const MENU_LABELS: Record<MenuLang, Record<string, string>> = {
  fr: {
    file: 'Fichier',
    newCompetition: 'Nouvelle compétition',
    open: 'Ouvrir...',
    save: 'Enregistrer',
    saveAs: 'Enregistrer sous...',
    export: 'Exporter',
    exportXml: 'Exporter en XML (BellePoule)',
    exportCsv: 'Exporter en CSV',
    exportPdf: 'Exporter en PDF',
    exportFencersTxt: 'Exporter tireurs (.txt)',
    exportFencersFff: 'Exporter tireurs (.fff)',
    exportFencersBpf: 'Exporter tireurs + photos (.bpf)',
    exportPhotos: 'Exporter photos (.zip)',
    import: 'Importer',
    importXml: 'Importer XML (BellePoule)',
    importFff: 'Importer liste FFE (.fff)',
    importRanking: 'Importer classement FFE',
    importFencersBpf: 'Importer tireurs + photos (.bpf)',
    quit: 'Quitter',
    edit: 'Édition',
    undo: 'Annuler',
    redo: 'Rétablir',
    cut: 'Couper',
    copy: 'Copier',
    paste: 'Coller',
    selectAll: 'Tout sélectionner',
    competition: 'Compétition',
    properties: 'Propriétés',
    addFencer: 'Ajouter un tireur',
    addReferee: 'Ajouter un arbitre',
    startRemote: '⚡ Démarrer saisie distante',
    stopRemote: '🛑 Arrêter saisie distante',
    nextPhase: 'Tour suivant',
    view: 'Affichage',
    reload: 'Recharger',
    forceReload: 'Forcer le rechargement',
    devTools: 'Outils de développement',
    resetZoom: 'Réinitialiser le zoom',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    fullscreen: 'Plein écran',
    help: 'Aide',
    about: 'À propos de BellePoule Modern',
    updates: '🔄 Vérifier les mises à jour...',
    updatesUnavailable: "Le système de mise à jour n'est pas disponible",
    updatesTitle: 'Mises à jour',
    docs: 'Documentation',
    reportBug: '📝 Signaler un bug / Suggestion',
    remoteTitle: 'Saisie distante',
    remoteAlreadyStarted: 'Le serveur de saisie distante est déjà démarré',
    remoteStartedTitle: 'Saisie distante démarrée',
    remoteStartedMsg: 'Les arbitres peuvent maintenant se connecter',
    remoteDetailTemplate: 'Arène 1: {url}/arene1/arbitre\nArène 2: {url}/arene2/arbitre\nArène 3: {url}/arene3/arbitre\nArène 4: {url}/arene4/arbitre\n\nAffichage kiosk (grand écran public): {url}/kiosk\nClassement en direct: {url}/\n\nPartagez ces URLs avec les arbitres munis de tablettes.\nAssurez-vous que le pare-feu Windows autorise les connexions sur le port {port}.',
    remoteNotStarted: "Le serveur de saisie distante n'est pas démarré",
    remoteStoppedTitle: 'Saisie distante arrêtée',
    remoteStoppedMsg: 'Le serveur de saisie distante a été arrêté',
    errTitle: 'Erreur',
    remoteErrStart: 'Impossible de démarrer le serveur distant:',
    remoteErrStop: "Impossible d'arrêter le serveur distant:",
    openTitle: 'Ouvrir une compétition',
    filterBpm: 'BellePoule Modern',
    filterClassic: 'BellePoule Classic',
    filterAll: 'Tous les fichiers',
    openErr: "Impossible d'ouvrir le fichier:",
    saveTitle: 'Enregistrer la compétition',
    saveErr: "Impossible d'enregistrer:",
    importTitle: 'Importer',
    importXmlTitle: 'Importer un fichier XML BellePoule',
    importFffTitle: 'Importer une liste FFE',
    importRankingTitle: 'Importer un classement FFE',
    importBpfTitle: 'Importer tireurs + photos (.bpf)',
    filterXmlBP: 'XML BellePoule',
    filterFfe: 'Fichier FFE',
    filterRanking: 'Fichier classement',
    importReadErr: 'Impossible de lire le fichier:',
    importErrTitle: "Erreur d'import",
    aboutTitle: 'À propos de BellePoule Modern',
    aboutSoftware: "Logiciel de gestion de compétitions d'escrime.",
    aboutRewrite: 'Réécriture moderne du logiciel BellePoule original créé par Yann Deboeuf.',
    aboutBugHint: 'Pour signaler un bug, mentionnez:',
  },
  en: {
    file: 'File',
    newCompetition: 'New Competition',
    open: 'Open...',
    save: 'Save',
    saveAs: 'Save As...',
    export: 'Export',
    exportXml: 'Export XML (BellePoule)',
    exportCsv: 'Export CSV',
    exportPdf: 'Export PDF',
    exportFencersTxt: 'Export fencers (.txt)',
    exportFencersFff: 'Export fencers (.fff)',
    exportFencersBpf: 'Export fencers + photos (.bpf)',
    exportPhotos: 'Export photos (.zip)',
    import: 'Import',
    importXml: 'Import XML (BellePoule)',
    importFff: 'Import FFE list (.fff)',
    importRanking: 'Import FFE ranking',
    importFencersBpf: 'Import fencers + photos (.bpf)',
    quit: 'Quit',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    competition: 'Competition',
    properties: 'Properties',
    addFencer: 'Add Fencer',
    addReferee: 'Add Referee',
    startRemote: '⚡ Start Remote Scoring',
    stopRemote: '🛑 Stop Remote Scoring',
    nextPhase: 'Next Round',
    view: 'View',
    reload: 'Reload',
    forceReload: 'Force Reload',
    devTools: 'Developer Tools',
    resetZoom: 'Reset Zoom',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fullscreen: 'Toggle Fullscreen',
    help: 'Help',
    about: 'About BellePoule Modern',
    updates: '🔄 Check for Updates...',
    updatesUnavailable: 'Update system is not available',
    updatesTitle: 'Updates',
    docs: 'Documentation',
    reportBug: '📝 Report a Bug / Suggestion',
    remoteTitle: 'Remote Scoring',
    remoteAlreadyStarted: 'The remote scoring server is already started',
    remoteStartedTitle: 'Remote scoring started',
    remoteStartedMsg: 'Referees can now connect',
    remoteDetailTemplate: 'Arena 1: {url}/arene1/arbitre\nArena 2: {url}/arene2/arbitre\nArena 3: {url}/arene3/arbitre\nArena 4: {url}/arene4/arbitre\n\nKiosk display (public screen): {url}/kiosk\nLive ranking: {url}/\n\nShare these URLs with referees using tablets.\nMake sure Windows firewall allows connections on port {port}.',
    remoteNotStarted: 'The remote scoring server is not started',
    remoteStoppedTitle: 'Remote scoring stopped',
    remoteStoppedMsg: 'The remote scoring server has been stopped',
    errTitle: 'Error',
    remoteErrStart: 'Unable to start the remote server:',
    remoteErrStop: 'Unable to stop the remote server:',
    openTitle: 'Open Competition',
    filterBpm: 'BellePoule Modern',
    filterClassic: 'BellePoule Classic',
    filterAll: 'All Files',
    openErr: 'Unable to open file:',
    saveTitle: 'Save Competition',
    saveErr: 'Unable to save:',
    importTitle: 'Import',
    importXmlTitle: 'Import BellePoule XML file',
    importFffTitle: 'Import FFE list',
    importRankingTitle: 'Import FFE ranking',
    importBpfTitle: 'Import fencers + photos (.bpf)',
    filterXmlBP: 'XML BellePoule',
    filterFfe: 'FFE File',
    filterRanking: 'Ranking file',
    importReadErr: 'Unable to read file:',
    importErrTitle: 'Import Error',
    aboutTitle: 'About BellePoule Modern',
    aboutSoftware: 'Fencing competition management software.',
    aboutRewrite: 'Modern rewrite of the original BellePoule software created by Yann Deboeuf.',
    aboutBugHint: 'To report a bug, mention:',
  },
  de: {
    file: 'Datei',
    newCompetition: 'Neuer Wettkampf',
    open: 'Öffnen...',
    save: 'Speichern',
    saveAs: 'Speichern unter...',
    export: 'Exportieren',
    exportXml: 'XML exportieren (BellePoule)',
    exportCsv: 'CSV exportieren',
    exportPdf: 'PDF exportieren',
    exportFencersTxt: 'Fechter exportieren (.txt)',
    exportFencersFff: 'Fechter exportieren (.fff)',
    exportFencersBpf: 'Fechter + Fotos exportieren (.bpf)',
    exportPhotos: 'Fotos exportieren (.zip)',
    import: 'Importieren',
    importXml: 'XML importieren (BellePoule)',
    importFff: 'FFE-Liste importieren (.fff)',
    importRanking: 'FFE-Rangliste importieren',
    importFencersBpf: 'Fechter + Fotos importieren (.bpf)',
    quit: 'Beenden',
    edit: 'Bearbeiten',
    undo: 'Rückgängig',
    redo: 'Wiederholen',
    cut: 'Ausschneiden',
    copy: 'Kopieren',
    paste: 'Einfügen',
    selectAll: 'Alles auswählen',
    competition: 'Wettkampf',
    properties: 'Eigenschaften',
    addFencer: 'Fechter hinzufügen',
    addReferee: 'Schiedsrichter hinzufügen',
    startRemote: '⚡ Fernpunkteingabe starten',
    stopRemote: '🛑 Fernpunkteingabe stoppen',
    nextPhase: 'Nächste Phase',
    view: 'Ansicht',
    reload: 'Neu laden',
    forceReload: 'Vollständig neu laden',
    devTools: 'Entwicklertools',
    resetZoom: 'Zoom zurücksetzen',
    zoomIn: 'Vergrößern',
    zoomOut: 'Verkleinern',
    fullscreen: 'Vollbild',
    help: 'Hilfe',
    about: 'Über BellePoule Modern',
    updates: '🔄 Updates prüfen...',
    updatesUnavailable: 'Das Update-System ist nicht verfügbar',
    updatesTitle: 'Updates',
    docs: 'Dokumentation',
    reportBug: '📝 Bug melden / Vorschlag',
    remoteTitle: 'Fernpunkteingabe',
    remoteAlreadyStarted: 'Der Fernpunkteingabe-Server ist bereits gestartet',
    remoteStartedTitle: 'Fernpunkteingabe gestartet',
    remoteStartedMsg: 'Schiedsrichter können sich jetzt verbinden',
    remoteDetailTemplate: 'Arena 1: {url}/arene1/arbitre\nArena 2: {url}/arene2/arbitre\nArena 3: {url}/arene3/arbitre\nArena 4: {url}/arene4/arbitre\n\nKiosk-Anzeige (öffentlicher Bildschirm): {url}/kiosk\nLive-Rangliste: {url}/\n\nTeilen Sie diese URLs mit Schiedsrichtern mit Tablets.\nStellen Sie sicher, dass die Windows-Firewall Verbindungen auf Port {port} zulässt.',
    remoteNotStarted: 'Der Fernpunkteingabe-Server ist nicht gestartet',
    remoteStoppedTitle: 'Fernpunkteingabe gestoppt',
    remoteStoppedMsg: 'Der Fernpunkteingabe-Server wurde gestoppt',
    errTitle: 'Fehler',
    remoteErrStart: 'Fernserver konnte nicht gestartet werden:',
    remoteErrStop: 'Fernserver konnte nicht gestoppt werden:',
    openTitle: 'Wettkampf öffnen',
    filterBpm: 'BellePoule Modern',
    filterClassic: 'BellePoule Classic',
    filterAll: 'Alle Dateien',
    openErr: 'Datei konnte nicht geöffnet werden:',
    saveTitle: 'Wettkampf speichern',
    saveErr: 'Speichern nicht möglich:',
    importTitle: 'Importieren',
    importXmlTitle: 'BellePoule XML-Datei importieren',
    importFffTitle: 'FFE-Liste importieren',
    importRankingTitle: 'FFE-Rangliste importieren',
    importBpfTitle: 'Fechter + Fotos importieren (.bpf)',
    filterXmlBP: 'XML BellePoule',
    filterFfe: 'FFE-Datei',
    filterRanking: 'Ranglistendatei',
    importReadErr: 'Datei konnte nicht gelesen werden:',
    importErrTitle: 'Importfehler',
    aboutTitle: 'Über BellePoule Modern',
    aboutSoftware: 'Fechtwettkampf-Verwaltungssoftware.',
    aboutRewrite: 'Moderne Neuentwicklung der originalen BellePoule-Software erstellt von Yann Deboeuf.',
    aboutBugHint: 'Zum Melden eines Fehlers bitte angeben:',
  },
  'zh-HK': {
    file: '檔案',
    newCompetition: '新建比賽',
    open: '開啟...',
    save: '儲存',
    saveAs: '另存為...',
    export: '匯出',
    exportXml: '匯出 XML (BellePoule)',
    exportCsv: '匯出 CSV',
    exportPdf: '匯出 PDF',
    exportFencersTxt: '匯出劍手 (.txt)',
    exportFencersFff: '匯出劍手 (.fff)',
    exportFencersBpf: '匯出劍手 + 照片 (.bpf)',
    exportPhotos: '匯出照片 (.zip)',
    import: '匯入',
    importXml: '匯入 XML (BellePoule)',
    importFff: '匯入 FFE 名單 (.fff)',
    importRanking: '匯入 FFE 排名',
    importFencersBpf: '匯入劍手 + 照片 (.bpf)',
    quit: '退出',
    edit: '編輯',
    undo: '復原',
    redo: '重做',
    cut: '剪切',
    copy: '複製',
    paste: '貼上',
    selectAll: '全選',
    competition: '比賽',
    properties: '屬性',
    addFencer: '新增劍手',
    addReferee: '新增裁判',
    startRemote: '⚡ 啟動遠程計分',
    stopRemote: '🛑 停止遠程計分',
    nextPhase: '下一輪',
    view: '顯示',
    reload: '重新載入',
    forceReload: '強制重新載入',
    devTools: '開發者工具',
    resetZoom: '重置縮放',
    zoomIn: '放大',
    zoomOut: '縮小',
    fullscreen: '切換全螢幕',
    help: '說明',
    about: '關於 BellePoule Modern',
    updates: '🔄 檢查更新...',
    updatesUnavailable: '更新系統不可用',
    updatesTitle: '更新',
    docs: '文件',
    reportBug: '📝 回報錯誤 / 建議',
    remoteTitle: '遠程計分',
    remoteAlreadyStarted: '遠程計分伺服器已啟動',
    remoteStartedTitle: '遠程計分已啟動',
    remoteStartedMsg: '裁判現在可以連線',
    remoteDetailTemplate: '賽場 1: {url}/arene1/arbitre\n賽場 2: {url}/arene2/arbitre\n賽場 3: {url}/arene3/arbitre\n賽場 4: {url}/arene4/arbitre\n\nKiosk 顯示（公開大螢幕）: {url}/kiosk\n即時排名: {url}/\n\n請將這些網址分享給使用平板電腦的裁判。\n請確保 Windows 防火牆允許連接埠 {port} 上的連線。',
    remoteNotStarted: '遠程計分伺服器尚未啟動',
    remoteStoppedTitle: '遠程計分已停止',
    remoteStoppedMsg: '遠程計分伺服器已停止',
    errTitle: '錯誤',
    remoteErrStart: '無法啟動遠程伺服器:',
    remoteErrStop: '無法停止遠程伺服器:',
    openTitle: '開啟比賽',
    filterBpm: 'BellePoule Modern',
    filterClassic: 'BellePoule Classic',
    filterAll: '所有檔案',
    openErr: '無法開啟檔案:',
    saveTitle: '儲存比賽',
    saveErr: '無法儲存:',
    importTitle: '匯入',
    importXmlTitle: '匯入 BellePoule XML 檔案',
    importFffTitle: '匯入 FFE 名單',
    importRankingTitle: '匯入 FFE 排名',
    importBpfTitle: '匯入劍手 + 照片 (.bpf)',
    filterXmlBP: 'XML BellePoule',
    filterFfe: 'FFE 檔案',
    filterRanking: '排名檔案',
    importReadErr: '無法讀取檔案:',
    importErrTitle: '匯入錯誤',
    aboutTitle: '關於 BellePoule Modern',
    aboutSoftware: '劍擊比賽管理軟件。',
    aboutRewrite: '由 Yann Deboeuf 創建的 BellePoule 原版軟件的現代重寫版本。',
    aboutBugHint: '回報錯誤時請提及:',
  },
};

// ============================================================================
// Localized Label Helper
// ============================================================================

function getL(): Record<string, string> {
  const lang = (MENU_LABELS[currentMenuLanguage as MenuLang] ? currentMenuLanguage : 'fr') as MenuLang;
  return MENU_LABELS[lang];
}

// ============================================================================
// Version Information
// ============================================================================

function getVersionInfo(): { version: string; build: number; date: string } {
  try {
    const versionPaths = [
      path.join(app.getAppPath(), 'version.json'),
      path.join(app.getAppPath(), '..', 'version.json'),
      path.join(__dirname, '..', '..', 'version.json'),
      path.join(process.cwd(), 'version.json'),
    ];

    for (const versionPath of versionPaths) {
      if (fs.existsSync(versionPath)) {
        const content = fs.readFileSync(versionPath, 'utf-8');
        return JSON.parse(content);
      }
    }
  } catch (e) {
    console.error('Failed to read version.json:', e);
  }

  // Fallback: lire depuis package.json
  try {
    const pkgPath = path.join(app.getAppPath(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const match = pkg.version.match(/(\d+\.\d+\.\d+)(?:-build\.(\d+))?/);
      if (match) {
        return {
          version: match[1],
          build: parseInt(match[2]) || 0,
          date: new Date().toISOString(),
        };
      }
    }
  } catch (e) {
    console.error('Failed to read package.json:', e);
  }

  return { version: '1.0.0', build: 0, date: 'Unknown' };
}

// ============================================================================
// Window Creation
// ============================================================================

function createWindow(): void {
  const versionInfo = getVersionInfo();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: `BellePoule Modern v${versionInfo.version} (Build #${versionInfo.build})`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../../resources/icons/icon.png'),
  });

  // Allow camera access for webcam photo capture
  const cameraPermissions = new Set(['media', 'camera', 'microphone']);
  mainWindow.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(cameraPermissions.has(permission));
  });

  mainWindow.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    return cameraPermissions.has(permission);
  });

  // Security: Set CSP headers for all requests
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
            "script-src 'self' https://cdn.socket.io; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data: blob:; " +
            "media-src 'self' blob:; " +
            "connect-src 'self' http://localhost:* https://api.github.com; " +
            "frame-ancestors 'none';",
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'X-XSS-Protection': ['1; mode=block'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
      },
    });
  });

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8066');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu using saved language preference
  mainWindow.webContents.once('did-finish-load', async () => {
    try {
      const savedLang = await mainWindow!.webContents.executeJavaScript(
        'localStorage.getItem("bellepoule-language")'
      );
      if (savedLang && typeof savedLang === 'string') {
        currentMenuLanguage = savedLang;
      }
    } catch {
      // Fallback to default language
    }
    createMenu(currentMenuLanguage);

    // Restore persisted logo and sync to renderer localStorage if not already set
    try {
      const logoPath = path.join(app.getPath('userData'), 'logo.dat');
      if (fs.existsSync(logoPath)) {
        const logo = fs.readFileSync(logoPath, 'utf-8');
        if (logo) mainWindow!.webContents.send('app:logoLoaded', logo);
      }
    } catch { /* logo optionnel */ }
  });
}

// ============================================================================
// Application Menu
// ============================================================================

function createMenu(language?: string): void {
  const lang = (MENU_LABELS[language as MenuLang] ? language : 'fr') as MenuLang;
  const L = MENU_LABELS[lang];

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: L.file,
      submenu: [
        {
          label: L.newCompetition,
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-competition'),
        },
        {
          label: L.open,
          accelerator: 'CmdOrCtrl+O',
          click: handleOpenFile,
        },
        { type: 'separator' },
        {
          label: L.save,
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            try {
              db.forceSave();
              console.log('Sauvegarde manuelle effectuée');
              mainWindow?.webContents.send('menu:save');
            } catch (error) {
              console.error('Échec sauvegarde manuelle:', error);
              mainWindow?.webContents.send('autosave:failed');
            }
          },
        },
        {
          label: L.saveAs,
          accelerator: 'CmdOrCtrl+Shift+S',
          click: handleSaveAs,
        },
        { type: 'separator' },
        {
          label: L.export,
          submenu: [
            { label: L.exportXml, click: () => handleExport('xml') },
            { label: L.exportCsv, click: () => handleExport('csv') },
            { label: L.exportPdf, click: () => handleExport('pdf') },
            { type: 'separator' },
            { label: L.exportFencersTxt, click: () => handleExport('fencers-txt') },
            { label: L.exportFencersFff, click: () => handleExport('fencers-fff') },
            { label: L.exportFencersBpf, click: () => handleExport('fencers-bpf') },
            { label: L.exportPhotos, click: () => handleExport('photos') },
          ],
        },
        {
          label: L.import,
          submenu: [
            { label: L.importXml, click: () => handleImport('xml') },
            { label: L.importFff, click: () => handleImport('fff') },
            { label: L.importRanking, click: () => handleImport('ranking') },
            { label: L.importFencersBpf, click: () => handleImport('fencers-bpf') },
          ],
        },
        { type: 'separator' },
        {
          label: L.quit,
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: L.edit,
      submenu: [
        { role: 'undo', label: L.undo },
        { role: 'redo', label: L.redo },
        { type: 'separator' },
        { role: 'cut', label: L.cut },
        { role: 'copy', label: L.copy },
        { role: 'paste', label: L.paste },
        { role: 'selectAll', label: L.selectAll },
      ],
    },
    {
      label: L.competition,
      submenu: [
        {
          label: L.properties,
          click: () => mainWindow?.webContents.send('menu:competition-properties'),
        },
        { type: 'separator' },
        {
          label: L.addFencer,
          accelerator: 'CmdOrCtrl+T',
          click: () => mainWindow?.webContents.send('menu:add-fencer'),
        },
        {
          label: L.addReferee,
          click: () => mainWindow?.webContents.send('menu:add-referee'),
        },
        { type: 'separator' },
        {
          label: L.startRemote,
          click: () => startRemoteScoreServer(),
        },
        {
          label: L.stopRemote,
          click: () => stopRemoteScoreServer(),
        },
        { type: 'separator' },
        {
          label: L.nextPhase,
          accelerator: 'CmdOrCtrl+Right',
          click: () => mainWindow?.webContents.send('menu:next-phase'),
        },
      ],
    },
    {
      label: L.view,
      submenu: [
        { role: 'reload', label: L.reload },
        { role: 'forceReload', label: L.forceReload },
        { role: 'toggleDevTools', label: L.devTools },
        { type: 'separator' },
        { role: 'resetZoom', label: L.resetZoom },
        { role: 'zoomIn', label: L.zoomIn },
        { role: 'zoomOut', label: L.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: L.fullscreen },
      ],
    },
    {
      label: L.help,
      submenu: [
        {
          label: L.about,
          accelerator: 'F1',
          click: showAbout,
        },
        {
          label: L.updates,
          click: async () => {
            if (autoUpdater) {
              await autoUpdater.showUpdateDialog();
            } else {
              dialog.showMessageBox(mainWindow!, {
                type: 'warning',
                title: L.updatesTitle,
                message: L.updatesUnavailable,
                buttons: ['OK'],
              });
            }
          },
        },
        { type: 'separator' },
        {
          label: L.docs,
          click: () => {
            shell.openExternal('https://github.com/klinnex/bellepoule-modern/wiki');
          },
        },
        {
          label: L.reportBug,
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow?.webContents.send('menu:report-issue');
          },
        },
        { type: 'separator' },
        {
          label: 'GitHub',
          click: () => {
            shell.openExternal('https://github.com/klinnex/bellepoule-modern');
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================================================
// Remote Score Server
// ============================================================================

function startRemoteScoreServer(port: number = 8066): void {
  const L = getL();
  if (remoteScoreServer) {
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: L.remoteTitle,
      message: L.remoteAlreadyStarted,
      buttons: ['OK'],
    });
    return;
  }

  try {
    remoteScoreServer = new RemoteScoreServer(db, port);
    remoteScoreServerPort = port;
    remoteScoreServer.start();

    const serverUrl = remoteScoreServer.getServerUrl();
    const detail = L.remoteDetailTemplate
      .replace(/{url}/g, serverUrl)
      .replace('{port}', String(port));
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: L.remoteStartedTitle,
      message: L.remoteStartedMsg,
      detail,
      buttons: ['OK'],
    });

    // Stocker la référence globale pour le serveur distant
    (global as any).mainWindow = mainWindow;
  } catch (error) {
    dialog.showErrorBox(L.errTitle, `${L.remoteErrStart} ${error}`);
  }
}

function stopRemoteScoreServer(): void {
  const L = getL();
  if (!remoteScoreServer) {
    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: L.remoteTitle,
      message: L.remoteNotStarted,
      buttons: ['OK'],
    });
    return;
  }

  try {
    remoteScoreServer.stop();
    remoteScoreServer = null;

    dialog.showMessageBox(mainWindow!, {
      type: 'info',
      title: L.remoteStoppedTitle,
      message: L.remoteStoppedMsg,
      buttons: ['OK'],
    });
  } catch (error) {
    dialog.showErrorBox(L.errTitle, `${L.remoteErrStop} ${error}`);
  }
}

// ============================================================================
// File Handlers
// ============================================================================

async function handleOpenFile(): Promise<void> {
  const L = getL();
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: L.openTitle,
    filters: [
      { name: L.filterBpm, extensions: ['bpm', 'db'] },
      { name: L.filterClassic, extensions: ['cotcot', 'cocot'] },
      { name: L.filterAll, extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filepath = result.filePaths[0];
    try {
      db.importFromFile(filepath);
      mainWindow?.webContents.send('file:opened', filepath);
    } catch (error) {
      dialog.showErrorBox(L.errTitle, `${L.openErr} ${error}`);
    }
  }
}

async function handleSaveAs(): Promise<void> {
  const L = getL();
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: L.saveTitle,
    defaultPath: 'competition.bpm',
    filters: [{ name: L.filterBpm, extensions: ['bpm'] }],
  });

  if (!result.canceled && result.filePath) {
    try {
      db.exportToFile(result.filePath);
      mainWindow?.webContents.send('file:saved', result.filePath);
    } catch (error) {
      dialog.showErrorBox(L.errTitle, `${L.saveErr} ${error}`);
    }
  }
}

async function handleExport(format: string): Promise<void> {
  mainWindow?.webContents.send('menu:export', format);
}

async function handleImport(format: string): Promise<void> {
  const L = getL();
  let filters: Electron.FileFilter[] = [];
  let title = L.importTitle;

  switch (format) {
    case 'xml':
      title = L.importXmlTitle;
      filters = [{ name: L.filterXmlBP, extensions: ['xml', 'cotcot'] }];
      break;
    case 'fff':
      title = L.importFffTitle;
      filters = [{ name: L.filterFfe, extensions: ['fff', 'csv', 'txt'] }];
      break;
    case 'ranking':
      title = L.importRankingTitle;
      filters = [{ name: L.filterRanking, extensions: ['fff', 'csv', 'txt', 'xlsx'] }];
      break;
    case 'fencers-bpf':
      title = L.importBpfTitle;
      filters = [{ name: 'BellePoule Fencers', extensions: ['bpf'] }];
      break;
    default:
      filters = [{ name: L.filterAll, extensions: ['*'] }];
  }

  const result = await dialog.showOpenDialog(mainWindow!, {
    title,
    filters,
    properties: ['openFile'],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filepath = result.filePaths[0];
    try {
      if (format === 'fencers-bpf') {
        // Fichier binaire : envoyer uniquement le chemin, le renderer appellera importFencersArchive
        mainWindow?.webContents.send('menu:import', format, filepath, '');
      } else {
        const content = fs.readFileSync(filepath, 'utf-8');
        mainWindow?.webContents.send('menu:import', format, filepath, content);
      }
    } catch (error) {
      dialog.showErrorBox(L.importErrTitle, `${L.importReadErr} ${error}`);
    }
  }
}

function showAbout(): void {
  const L = getL();
  const versionInfo = getVersionInfo();
  const locale = currentMenuLanguage === 'zh-HK' ? 'zh-HK' : currentMenuLanguage === 'de' ? 'de-DE' : currentMenuLanguage === 'en' ? 'en-GB' : 'fr-FR';
  const buildDate = new Date(versionInfo.date).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: L.aboutTitle,
    message: `BellePoule Modern v${versionInfo.version}`,
    detail: `Build #${versionInfo.build}
Date: ${buildDate}

${L.aboutSoftware}

${L.aboutRewrite}

Licence: GPL-3.0
© 2024-2026 BellePoule Modern Contributors

${L.aboutBugHint}
  Version: ${versionInfo.version}
  Build: #${versionInfo.build}`,
  });
}

// ============================================================================
// IPC Handlers - Database Operations
// ============================================================================

// Competition handlers
ipcMain.handle('db:createCompetition', async (_, data) => {
  return db.createCompetition(data);
});

ipcMain.handle('db:getCompetition', async (_, id) => {
  return db.getCompetition(id);
});

ipcMain.handle('db:getAllCompetitions', async () => {
  return db.getAllCompetitions();
});

ipcMain.handle('db:deleteCompetition', async (_, id) => {
  return db.deleteCompetition(id);
});

ipcMain.handle('db:updateCompetition', async (_, id, updates) => {
  return db.updateCompetition(id, updates);
});

// Fencer handlers
ipcMain.handle('db:addFencer', async (_, competitionId, fencer) => {
  return db.addFencer(competitionId, fencer);
});

ipcMain.handle('db:getFencer', async (_, id) => {
  return db.getFencer(id);
});

ipcMain.handle('db:getFencersByCompetition', async (_, competitionId) => {
  return db.getFencersByCompetition(competitionId);
});

ipcMain.handle('db:updateFencer', async (_, id, updates) => {
  return db.updateFencer(id, updates);
});

ipcMain.handle('db:deleteFencer', async (_, id) => {
  return db.deleteFencer(id);
});

ipcMain.handle('db:deleteAllFencers', async (_, competitionId) => {
  return db.deleteAllFencers(competitionId);
});

// Match handlers
ipcMain.handle('db:createMatch', async (_, match, poolId) => {
  return db.createMatch(match, poolId);
});

ipcMain.handle('db:getMatch', async (_, id) => {
  return db.getMatch(id);
});

ipcMain.handle('db:getMatchesByPool', async (_, poolId) => {
  return db.getMatchesByPool(poolId);
});

ipcMain.handle('db:updateMatch', async (_, id, updates) => {
  return db.updateMatch(id, updates);
});

ipcMain.handle('db:upsertTableauMatch', async (_, params) => {
  return db.upsertTableauMatch(params);
});

// Session State handlers
ipcMain.handle('db:saveSessionState', async (_, competitionId, state) => {
  return db.saveSessionState(competitionId, state);
});

ipcMain.handle('db:getSessionState', async (_, competitionId) => {
  return db.getSessionState(competitionId);
});

ipcMain.handle('db:clearSessionState', async (_, competitionId) => {
  return db.clearSessionState(competitionId);
});

// Pool handlers
ipcMain.handle('db:updatePool', async (_, pool) => {
  return db.updatePool(pool);
});
ipcMain.handle('db:createPool', async (_, phaseId, number) => {
  return db.createPool(phaseId, number);
});
ipcMain.handle('db:addFencerToPool', async (_, poolId, fencerId, position) => {
  return db.addFencerToPool(poolId, fencerId, position);
});
ipcMain.handle('db:getPoolFencers', async (_, poolId) => {
  return db.getPoolFencers(poolId);
});
ipcMain.handle('db:getPoolsByPhase', async (_, phaseId) => {
  return db.getPoolsByPhase(phaseId);
});

// Phase handlers
ipcMain.handle('db:createPhase', async (_, competitionId, type, order, name) => {
  return db.createPhase(competitionId, type, order, name);
});
ipcMain.handle('db:getPhase', async (_, id) => {
  return db.getPhase(id);
});
ipcMain.handle('db:getPhasesByCompetition', async (_, competitionId) => {
  return db.getPhasesByCompetition(competitionId);
});
ipcMain.handle('db:updatePhase', async (_, id, updates) => {
  return db.updatePhase(id, updates);
});
ipcMain.handle('db:deletePhase', async (_, id) => {
  return db.deletePhase(id);
});

// Referee handlers
ipcMain.handle('db:createReferee', async (_, competitionId, data) => {
  return db.createReferee(competitionId, data);
});
ipcMain.handle('db:getReferee', async (_, id) => {
  return db.getReferee(id);
});
ipcMain.handle('db:getRefereesByCompetition', async (_, competitionId) => {
  return db.getRefereesByCompetition(competitionId);
});
ipcMain.handle('db:updateReferee', async (_, id, updates) => {
  return db.updateReferee(id, updates);
});
ipcMain.handle('db:deleteReferee', async (_, id) => {
  return db.deleteReferee(id);
});

// Touch / Card read handlers
ipcMain.handle('db:getTouches', async (_, matchId) => {
  return db.getTouches(matchId);
});
ipcMain.handle('db:getCards', async (_, matchId) => {
  return db.getCards(matchId);
});

// Statistiques combattants
ipcMain.handle('db:saveTouch', async (_, touch) => {
  return db.saveTouch(touch);
});

ipcMain.handle('db:saveCard', async (_, card) => {
  return db.saveCard(card);
});

ipcMain.handle('db:updateMatchTiming', async (_, timing) => {
  return db.updateMatchTiming(timing.matchId, timing.startTime, timing.endTime, timing.duration);
});

ipcMain.handle('db:getFencerHistory', async (_, fencerId) => {
  return db.getFencerHistory(fencerId);
});

// Abandon snapshot handlers
ipcMain.handle(
  'db:saveAbandonSnapshot',
  async (_, fencerId, competitionId, previousStatus, abandonType, snapshots) => {
    db.saveAbandonSnapshot(fencerId, competitionId, previousStatus, abandonType, snapshots);
  }
);

ipcMain.handle('db:getAbandonSnapshot', async (_, fencerId) => {
  return db.getAbandonSnapshot(fencerId);
});

ipcMain.handle('db:deleteAbandonSnapshot', async (_, fencerId) => {
  db.deleteAbandonSnapshot(fencerId);
});

// File handlers
ipcMain.handle('file:export', async (_, filepath) => {
  db.exportToFile(filepath);
});

ipcMain.handle('file:import', async (_, filepath) => {
  await db.importFromFile(filepath);
});

// File content write handler
ipcMain.handle('file:writeContent', async (_, filepath: string, content: string) => {
  fs.writeFileSync(filepath, content, 'utf-8');
});

// Photo ZIP export handler
ipcMain.handle('file:exportPhotos', async (_, competitionId: string, filepath: string) => {
  const photos = db.getFencerPhotos(competitionId);
  const zip = new JSZip();

  for (const { license, photo } of photos) {
    const base64 = photo.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    zip.file(`${license}.jpg`, buffer);
  }

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const tmpPath = filepath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, content);
    try {
      fs.renameSync(tmpPath, filepath);
    } catch {
      fs.writeFileSync(filepath, content);
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
  } catch {
    fs.writeFileSync(filepath, content);
  }

  return { count: photos.length };
});

// Photo ZIP import handler
ipcMain.handle('file:importPhotos', async (_, competitionId: string, filepath: string) => {
  const buffer = fs.readFileSync(filepath);
  const zip = await JSZip.loadAsync(buffer);

  const photos: { license: string; photo: string }[] = [];

  for (const [filename, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    const ext = path.extname(filename).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;
    const basename = path.basename(filename, ext);
    const data = await file.async('base64');
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    photos.push({ license: basename, photo: `data:${mimeType};base64,${data}` });
  }

  return db.updateFencerPhotosByLicense(competitionId, photos);
});

// Fencer archive (.bpf) export handler
ipcMain.handle('file:exportFencersArchive', async (_, competitionId: string, filepath: string) => {
  const fencers = db.getFencersByCompetition(competitionId);
  const competition = db.getCompetition(competitionId);
  const zip = new JSZip();
  zip.file(
    'meta.json',
    JSON.stringify({
      version: '1',
      competitionName: competition?.title ?? '',
      exportDate: new Date().toISOString(),
      count: fencers.length,
    })
  );
  zip.file('fencers.json', JSON.stringify(fencers));
  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const tmpPath = filepath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, content);
    try {
      fs.renameSync(tmpPath, filepath);
    } catch {
      fs.writeFileSync(filepath, content);
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
  } catch {
    fs.writeFileSync(filepath, content);
  }
  return { count: fencers.length };
});

// Fencer archive (.bpf) import handler
ipcMain.handle('file:importFencersArchive', async (_, competitionId: string, filepath: string) => {
  const buffer = fs.readFileSync(filepath);
  const zip = await JSZip.loadAsync(buffer);
  const fencersFile = zip.file('fencers.json');
  if (!fencersFile) throw new Error('Format .bpf invalide : fencers.json manquant');
  const fencers = JSON.parse(await fencersFile.async('string'));
  return db.upsertFencersByLicense(competitionId, fencers);
});

// Dialog handlers
ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, options);

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { filePath, content };
    } catch (error) {
      console.error('Error reading file:', error);
      return { filePath, content: '' };
    }
  }

  return null;
});

ipcMain.handle('dialog:saveFile', async (_, options) => {
  return dialog.showSaveDialog(mainWindow!, options);
});

// Print handler
ipcMain.handle('window:print', () => {
  return new Promise<void>((resolve) => {
    mainWindow?.webContents.print({ silent: false, printBackground: true }, () => {
      resolve();
    });
  });
});

// Print via hidden BrowserWindow — opens system print dialog on clean HTML
ipcMain.handle('file:printHtml', async (_, html: string) => {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `bp-print-${Date.now()}.html`);
    try {
      fs.writeFileSync(tmpFile, html, 'utf-8');
    } catch (e) {
      resolve({ success: false, error: `Impossible de créer le fichier temporaire: ${e}` });
      return;
    }

    const printWin = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1600,
      webPreferences: { contextIsolation: true, nodeIntegration: false, javascript: false },
    });
    printWin.setMenu(null);
    printWin.loadFile(tmpFile);

    printWin.webContents.once('did-finish-load', () => {
      printWin.webContents.print({ silent: false, printBackground: true }, (success) => {
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        printWin.destroy();
        resolve({ success });
      });
    });

    printWin.webContents.once('did-fail-load', () => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      printWin.destroy();
      resolve({ success: false, error: 'Chargement HTML échoué' });
    });
  });
});

// PDF generation via hidden BrowserWindow (propre, sans menus d'application)
ipcMain.handle('file:printHtmlToPDF', async (_, html: string, outputPath: string) => {
  return new Promise<{ success: boolean; path?: string; error?: string }>((resolve) => {
    const tmpFile = path.join(os.tmpdir(), `bp-pdf-${Date.now()}.html`);
    try {
      fs.writeFileSync(tmpFile, html, 'utf-8');
    } catch (e) {
      resolve({ success: false, error: `Impossible de créer le fichier temporaire: ${e}` });
      return;
    }

    const pdfWin = new BrowserWindow({
      show: false,
      width: 1200,
      height: 1600,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        javascript: false,
      },
    });
    pdfWin.setMenu(null);

    pdfWin.loadFile(tmpFile);

    pdfWin.webContents.once('did-finish-load', () => {
      pdfWin.webContents
        .printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: 'A4',
          preferCSSPageSize: true,
          margins: { marginType: 'none' },
        })
        .then((data: Buffer) => {
          try {
            fs.writeFileSync(outputPath, data);
            resolve({ success: true, path: outputPath });
          } catch (writeErr) {
            resolve({ success: false, error: `Impossible d'écrire le PDF: ${writeErr}` });
          } finally {
            try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
            pdfWin.destroy();
          }
        })
        .catch((err: Error) => {
          try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
          pdfWin.destroy();
          resolve({ success: false, error: err.message });
        });
    });

    pdfWin.webContents.once('did-fail-load', () => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      pdfWin.destroy();
      resolve({ success: false, error: 'Chargement HTML échoué' });
    });
  });
});

// Shell handlers
ipcMain.handle('shell:openExternal', async (_, url: string) => {
  // N'autoriser que les URLs https:// pour éviter les exploits via des schémas arbitraires
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    console.warn('[shell:openExternal] URL rejetée (schéma non-https):', url);
    return;
  }
  await shell.openExternal(url);
});

// Remote score server handlers
ipcMain.handle('remote:startServer', async (_event, port?: number) => {
  try {
    if (remoteScoreServer) {
      return { success: false, error: 'Le serveur est déjà démarré' };
    }

    const effectivePort = port ?? 8066;
    remoteScoreServer = new RemoteScoreServer(db, effectivePort);
    remoteScoreServerPort = effectivePort;
    remoteScoreServer.start();

    const serverUrl = remoteScoreServer.getServerUrl();
    const serverInfo = {
      url: serverUrl,
      ip: remoteScoreServer.getLocalIPAddress(),
      port: effectivePort,
    };

    // Stocker la référence globale pour le serveur distant
    (global as any).mainWindow = mainWindow;

    return { success: true, serverInfo };
  } catch (error) {
    console.error('Error starting remote server:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:stopServer', async () => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: "Le serveur n'est pas démarré" };
    }

    remoteScoreServer.stop();
    remoteScoreServer = null;

    return { success: true };
  } catch (error) {
    console.error('Error stopping remote server:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:getServerInfo', async () => {
  if (!remoteScoreServer) {
    return { success: false, error: "Le serveur n'est pas démarré" };
  }

  return {
    success: true,
    serverInfo: {
      url: remoteScoreServer.getServerUrl(),
      ip: remoteScoreServer.getLocalIPAddress(),
      port: remoteScoreServerPort,
    },
  };
});

// Remote session handlers
ipcMain.handle(
  'remote:startSession',
  async (
    _,
    competitionId: string,
    strips: number,
    matches?: any[],
    showPhotos?: boolean,
    kioskViews?: { poules: boolean; classement: boolean; direct: boolean; suivants: boolean },
    cardAnnounce?: boolean
  ) => {
    try {
      if (!remoteScoreServer) {
        return { success: false, error: 'Le serveur distant n est pas démarré' };
      }

      const session = await remoteScoreServer.startSession(
        competitionId,
        strips,
        matches,
        showPhotos,
        kioskViews,
        cardAnnounce
      );
      return { success: true, session };
    } catch (error) {
      console.error('Error starting session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
);

ipcMain.handle(
  'remote:updateMatchArena',
  async (
    _,
    matchId: string,
    fromArena: number | null,
    toArena: number | null,
    fencerA?: any,
    fencerB?: any
  ) => {
    try {
      if (!remoteScoreServer) {
        return { success: false, error: 'Serveur non démarré' };
      }
      remoteScoreServer.updateMatchArena(matchId, fromArena, toArena, fencerA, fencerB);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur' };
    }
  }
);

ipcMain.handle(
  'remote:updatePoolFencers',
  async (_, updates: Array<{ poolId: string; fencers: any[] }>) => {
    try {
      if (!remoteScoreServer) return { success: false, error: 'Serveur non démarré' };
      remoteScoreServer.updatePoolFencers(updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erreur' };
    }
  }
);

ipcMain.handle('remote:refreshDeMatches', async (_, matches: any[]) => {
  try {
    if (!remoteScoreServer) return { success: false, error: 'Serveur non démarré' };
    remoteScoreServer.refreshDeMatches(matches);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur' };
  }
});

ipcMain.handle('remote:stopSession', async () => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }

    remoteScoreServer.stopSession();
    return { success: true };
  } catch (error) {
    console.error('Error stopping session:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:getSession', async () => {
  if (!remoteScoreServer) {
    return { success: false, error: 'Le serveur distant n est pas démarré' };
  }

  return { success: true, session: remoteScoreServer.getSession() };
});

ipcMain.handle('remote:getArenas', async () => {
  if (!remoteScoreServer) {
    return { success: false, error: 'Le serveur distant n est pas démarré' };
  }

  return { success: true, arenas: remoteScoreServer.getAllArenas() };
});

ipcMain.handle('remote:updateStripCount', async (_, newCount: number) => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }

    const session = remoteScoreServer.updateStripCount(newCount);
    return { success: true, session };
  } catch (error) {
    console.error('Error updating strip count:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:updateShowPhotos', async (_, value: boolean) => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }
    remoteScoreServer.updateShowPhotos(value);
    return { success: true };
  } catch (error) {
    console.error('Error updating showPhotos:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:updateCardAnnounce', async (_, value: boolean) => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }
    remoteScoreServer.updateCardAnnounce(value);
    return { success: true };
  } catch (error) {
    console.error('Error updating cardAnnounce:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:updateTheme', async (_, theme: string) => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }
    remoteScoreServer.updateTheme(theme as any);
    return { success: true };
  } catch (error) {
    console.error('Error updating theme:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:updateArenaTheme', async (_, arenaId: string, theme: string, customTheme?: any) => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }
    remoteScoreServer.updateArenaTheme(arenaId, theme as any, customTheme);
    return { success: true };
  } catch (error) {
    console.error('Error updating arena theme:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle(
  'remote:updateKioskViews',
  async (_, views: { poules: boolean; classement: boolean; direct: boolean }) => {
    try {
      if (!remoteScoreServer) {
        return { success: false, error: 'Le serveur distant n est pas démarré' };
      }
      remoteScoreServer.updateKioskViews(views);
      return { success: true };
    } catch (error) {
      console.error('Error updating kioskViews:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
    }
  }
);

ipcMain.handle('remote:setArenaPassword', async (_, arenaId: string, password: string) => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }
    remoteScoreServer.setArenaPassword(arenaId, password);
    return { success: true };
  } catch (error) {
    console.error('Error setting arena password:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:setOrgNote', async (_, note) => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }
    remoteScoreServer.setOrgNote(note);
    mainWindow?.webContents.send('kiosk:note', note);
    return { success: true };
  } catch (error) {
    console.error('Error setting org note:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:clearOrgNote', async () => {
  try {
    if (!remoteScoreServer) {
      return { success: false, error: 'Le serveur distant n est pas démarré' };
    }
    remoteScoreServer.clearOrgNote();
    mainWindow?.webContents.send('kiosk:note', null);
    return { success: true };
  } catch (error) {
    console.error('Error clearing org note:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('remote:updateLogo', async (_, logo: string | null) => {
  try {
    const logoPath = path.join(app.getPath('userData'), 'logo.dat');
    if (logo) {
      fs.writeFileSync(logoPath, logo, 'utf-8');
    } else {
      try { fs.unlinkSync(logoPath); } catch { /* déjà absent */ }
    }
    if (remoteScoreServer) remoteScoreServer.setLogo(logo);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
});

ipcMain.handle('app:getLogo', async () => {
  const logoPath = path.join(app.getPath('userData'), 'logo.dat');
  try { return fs.readFileSync(logoPath, 'utf-8'); } catch { return null; }
});

// App info handlers
ipcMain.handle('app:getVersionInfo', async () => {
  return getVersionInfo();
});

// Language change handler — rebuild native menu in the new language
ipcMain.on('app:language-changed', (_, lang: string) => {
  currentMenuLanguage = lang;
  createMenu(lang);
  if (remoteScoreServer) remoteScoreServer.setLanguage(lang);
});

// AutoUpdater handlers
ipcMain.handle('updater:check', async () => {
  if (autoUpdater) {
    return await autoUpdater.checkForUpdates();
  }
  return null;
});

ipcMain.handle('updater:setSilentMode', async (_, enabled: boolean) => {
  if (autoUpdater) {
    autoUpdater.setSilentMode(enabled);
    return { success: true, silent: enabled };
  }
  return { success: false, error: 'AutoUpdater not initialized' };
});

ipcMain.handle('updater:getSilentMode', async () => {
  if (autoUpdater) {
    return { silent: autoUpdater.isSilentMode() };
  }
  return { silent: false };
});

ipcMain.handle('updater:hasPendingUpdate', async () => {
  if (autoUpdater) {
    return { hasPending: autoUpdater.hasPendingUpdate() };
  }
  return { hasPending: false };
});

ipcMain.handle('updater:getPendingUpdateInfo', async () => {
  if (autoUpdater) {
    return autoUpdater.getPendingUpdateInfo();
  }
  return null;
});

ipcMain.handle('updater:installPendingUpdate', async () => {
  if (autoUpdater) {
    autoUpdater.checkAndInstallPendingUpdate();
    return { success: true };
  }
  return { success: false, error: 'AutoUpdater not initialized' };
});

// ============================================================================
// App Lifecycle
// ============================================================================

app.whenReady().then(async () => {
  // Initialize database dans un répertoire inscriptible (userData)
  // Sur Windows, process.cwd() peut pointer vers C:\Windows\System32 (non inscriptible)
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'bellepoule.db');

  // Migration : si une BDD existe à l'ancien emplacement mais pas au nouveau, la copier
  const legacyDbPath = path.join(process.cwd(), 'bellepoule.db');
  if (legacyDbPath !== dbPath && fs.existsSync(legacyDbPath) && !fs.existsSync(dbPath)) {
    try {
      if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath, { recursive: true });
      fs.copyFileSync(legacyDbPath, dbPath);
      console.log(`Migration BDD: ${legacyDbPath} -> ${dbPath}`);
    } catch (e) {
      console.error('Échec migration BDD:', e);
    }
  }

  await db.open(dbPath);
  console.log('Base de données ouverte:', db.getPath());

  createWindow();

  // Initialize auto updater
  if (mainWindow) {
    autoUpdater = new AutoUpdater(mainWindow, {
      autoDownload: false, // Par défaut manuel, peut être activé via silent mode
      autoInstall: false,
      checkInterval: 12, // Vérifier toutes les 12 heures
      betaChannel: true, // Activer le canal beta pour détecter les dev builds
      silent: false,
      installOnQuit: false,
    });

    // Vérifier s'il y a une mise à jour en attente d'installation
    if (autoUpdater.hasPendingUpdate()) {
      const pendingInfo = autoUpdater.getPendingUpdateInfo();
      console.log(`[Main] Mise à jour en attente trouvée: v${pendingInfo?.version}`);
      // Demander à l'utilisateur s'il veut installer maintenant
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Mise à jour en attente',
        message: `La version ${pendingInfo?.version} est prête à être installée.`,
        detail: "Voulez-vous installer cette mise à jour maintenant ? L'application va redémarrer.",
        buttons: ['Installer maintenant', 'Plus tard'],
        defaultId: 0,
        cancelId: 1,
      });

      if (result.response === 0) {
        autoUpdater.checkAndInstallPendingUpdate();
        return; // Arrêter le démarrage normal
      }
    }
  }

  // Autosave every 2 minutes
  let autosaveInterval: NodeJS.Timeout | null = null;

  const startAutosave = () => {
    if (autosaveInterval) clearInterval(autosaveInterval);
    autosaveInterval = setInterval(
      () => {
        try {
          db.forceSave();
          console.log('Autosave completed at', new Date().toISOString());
          mainWindow?.webContents.send('autosave:completed');
        } catch (error) {
          console.error('Autosave failed:', error);
          mainWindow?.webContents.send('autosave:failed');
        }
      },
      2 * 60 * 1000
    ); // 2 minutes
  };

  startAutosave();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  db.forceSave(); // Save before closing
  db.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  db.forceSave(); // Save before quitting
  db.close();
});

// Handle uncaught exceptions - save before crash
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  try {
    db.forceSave(); // Try to save data before showing error
  } catch (e) {
    console.error('Failed to save on crash:', e);
  }
  dialog.showErrorBox('Erreur', `Une erreur inattendue s'est produite: ${error.message}`);
});
