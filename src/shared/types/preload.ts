/**
 * BellePoule Modern - Preload API Types
 * Type-safe API interfaces for IPC communication
 * Licensed under GPL-3.0
 */

import {
  Competition,
  Fencer,
  Match,
  Pool,
  Referee,
  CompetitionSettings,
  ImportResult,
  ExportFormat,
  Phase,
  DirectEliminationTable,
} from '../types';

// Re-export Pool for preload
export type { Pool } from '../types';

// ============================================================================
// Database API Types
// ============================================================================

export interface CompetitionCreateData {
  title: string;
  date: Date;
  weapon: string;
  gender: string;
  category: string;
  settings?: Partial<CompetitionSettings>;
}

export interface CompetitionUpdateData {
  title?: string;
  date?: Date;
  location?: string;
  organizer?: string;
  settings?: Partial<CompetitionSettings>;
}

export interface FencerCreateData {
  ref?: number;
  lastName: string;
  firstName: string;
  birthDate?: Date;
  gender: string;
  nationality: string;
  region?: string;
  club?: string;
  license?: string;
  ranking?: number;
  status?: string;
  photo?: string;
}

export interface FencerUpdateData {
  lastName?: string;
  firstName?: string;
  birthDate?: Date;
  gender?: string;
  nationality?: string;
  region?: string;
  club?: string;
  license?: string;
  ranking?: number;
  status?: string;
  photo?: string;
}

export interface MatchCreateData {
  number: number;
  fencerAId?: string;
  fencerBId?: string;
  maxScore: number;
  poolId?: string;
  tableId?: string;
  round?: number;
  position?: number;
}

export interface MatchUpdateData {
  scoreA?: {
    value: number | null;
    isVictory: boolean;
    isAbstention?: boolean;
    isExclusion?: boolean;
    isForfait?: boolean;
  };
  scoreB?: {
    value: number | null;
    isVictory: boolean;
    isAbstention?: boolean;
    isExclusion?: boolean;
    isForfait?: boolean;
  };
  status?: string;
  strip?: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

// ============================================================================
// Fighter Statistics Types
// ============================================================================

export interface MatchTouchData {
  id: string;
  matchId: string;
  fencerId: string;
  zone: string; // TargetZone: A | B | C
  points: number;
  timestamp: string; // ISO 8601
  isValidInSuddenDeath?: boolean;
  isReversed?: boolean;
}

export interface MatchCardData {
  id: string;
  matchId: string;
  fencerId: string;
  cardType: string; // 'yellow' | 'red' | 'black'
  reason: string; // CardReason
  cardGroup: number; // 1–4
  timestamp: string; // ISO 8601
  pointsAwarded: number;
  resultingExclusion?: boolean;
}

export interface MatchTimingData {
  matchId: string;
  startTime: string | null; // ISO 8601
  endTime: string | null; // ISO 8601
  duration: number | null; // secondes
}

export interface FencerMatchRecord {
  matchId: string;
  number: number;
  opponentId: string | null;
  opponentLastName: string | null;
  opponentFirstName: string | null;
  scoreA: string | null; // JSON Score
  scoreB: string | null; // JSON Score
  side: 'A' | 'B';
  status: string;
  startTime: string | null;
  endTime: string | null;
  duration: number | null;
  poolId: string | null;
  tableId: string | null;
  round: number | null;
  touches: Array<{
    id: string;
    zone: string;
    points: number;
    timestamp: string;
    isValidInSuddenDeath: boolean;
    isReversed: boolean;
  }>;
  cards: Array<{
    id: string;
    cardType: string;
    reason: string;
    cardGroup: number;
    timestamp: string;
    pointsAwarded: number;
    resultingExclusion: boolean;
  }>;
}

export interface FencerHistory {
  matches: FencerMatchRecord[];
}

export interface MatchSnapshot {
  matchId: string;
  status: string;
  scoreA: {
    value: number | null;
    isVictory: boolean;
    isAbstention: boolean;
    isExclusion: boolean;
    isForfait: boolean;
  } | null;
  scoreB: {
    value: number | null;
    isVictory: boolean;
    isAbstention: boolean;
    isExclusion: boolean;
    isForfait: boolean;
  } | null;
}

export interface AbandonSnapshot {
  id: string;
  fencerId: string;
  competitionId: string;
  previousStatus: string;
  abandonType: 'abandon' | 'forfait' | 'exclusion';
  matchSnapshots: MatchSnapshot[];
  createdAt: string;
}

export interface SessionState {
  currentPhase?: number;
  selectedPool?: string;
  selectedTable?: string;
  uiState?: Record<string, any>;
  lastSaveTime?: Date;
}

// ============================================================================
// File API Types
// ============================================================================

export interface FileOpenOptions {
  title: string;
  filters: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface FileSaveOptions {
  title: string;
  filters: Array<{
    name: string;
    extensions: string[];
  }>;
  defaultPath?: string;
}

export interface FileOpenResult {
  filePath: string;
  content?: string;
}

export interface FileSaveResult {
  filePath: string;
  success: boolean;
  canceled?: boolean;
}

// ============================================================================
// Dialog API Types
// ============================================================================

export interface DialogOpenOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface DialogSaveOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

// ============================================================================
// Menu Event Types
// ============================================================================

export interface MenuEventData {
  format?: string;
  filepath?: string;
  content?: string;
}

// ============================================================================
// Version Info Types
// ============================================================================

export interface VersionInfo {
  version: string;
  build: number;
  date: string;
}

// ============================================================================
// Updater API Types
// ============================================================================

export interface UpdateInfo {
  hasUpdate: boolean;
  currentBuild: number;
  latestBuild: number;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes: string;
}

export interface UpdaterAPI {
  check: () => Promise<UpdateInfo | null>;
  setSilentMode: (enabled: boolean) => Promise<{ success: boolean; silent: boolean }>;
  getSilentMode: () => Promise<{ silent: boolean }>;
  hasPendingUpdate: () => Promise<{ hasPending: boolean }>;
  getPendingUpdateInfo: () => Promise<{ version: string; path: string } | null>;
  installPendingUpdate: () => Promise<{ success: boolean; error?: string }>;
}

// ============================================================================
// Remote Score Server API Types
// ============================================================================

export interface RemoteServerInfo {
  url: string;
  ip: string;
  port: number;
}

export interface RemoteServerAPI {
  startServer: (port?: number) => Promise<{ success: boolean; serverInfo?: RemoteServerInfo; error?: string }>;
  stopServer: () => Promise<{ success: boolean; error?: string }>;
  getServerInfo: () => Promise<{ success: boolean; serverInfo?: RemoteServerInfo; error?: string }>;
  startSession: (
    competitionId: string,
    strips: number,
    matches?: any[],
    showPhotos?: boolean,
    kioskViews?: Record<string, boolean>
  ) => Promise<{ success: boolean; session?: any; error?: string }>;
  stopSession: () => Promise<{ success: boolean; error?: string }>;
  getSession: () => Promise<{ success: boolean; session?: any; error?: string }>;
  getArenas: () => Promise<{ success: boolean; arenas?: any[]; error?: string }>;
  updateStripCount: (count: number) => Promise<{ success: boolean; session?: any; error?: string }>;
  updateShowPhotos: (value: boolean) => Promise<{ success: boolean; error?: string }>;
  updateMatchArena: (
    matchId: string,
    fromArena: number | null,
    toArena: number | null,
    fencerA?: Fencer | null,
    fencerB?: Fencer | null
  ) => Promise<{ success: boolean; error?: string }>;
  updatePoolFencers: (
    updates: Array<{ poolId: string; fencers: any[] }>
  ) => Promise<{ success: boolean; error?: string }>;
  setArenaPassword: (
    arenaId: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateKioskViews: (
    views: Record<string, boolean>
  ) => Promise<{ success: boolean; error?: string }>;
  setOrgNote: (note: import('../types/remote').OrgNote) => Promise<{ success: boolean; error?: string }>;
  clearOrgNote: () => Promise<{ success: boolean; error?: string }>;
}

// ============================================================================
// Complete API Interface Types
// ============================================================================

export interface DatabaseAPI {
  // Competitions
  createCompetition: (data: CompetitionCreateData) => Promise<Competition>;
  getCompetition: (id: string) => Promise<Competition | null>;
  getAllCompetitions: () => Promise<Competition[]>;
  updateCompetition: (id: string, updates: CompetitionUpdateData) => Promise<void>;
  deleteCompetition: (id: string) => Promise<void>;

  // Fencers
  addFencer: (competitionId: string, fencer: FencerCreateData) => Promise<Fencer>;
  getFencer: (id: string) => Promise<Fencer | null>;
  getFencersByCompetition: (competitionId: string) => Promise<Fencer[]>;
  updateFencer: (id: string, updates: FencerUpdateData) => Promise<void>;
  deleteFencer: (id: string) => Promise<void>;
  deleteAllFencers: (competitionId: string) => Promise<void>;

  // Matches
  createMatch: (match: MatchCreateData, poolId?: string) => Promise<Match>;
  getMatch: (id: string) => Promise<Match | null>;
  getMatchesByPool: (poolId: string) => Promise<Match[]>;
  updateMatch: (id: string, updates: MatchUpdateData) => Promise<void>;

  // Pools
  createPool: (phaseId: string, number: number) => Promise<Pool>;
  addFencerToPool: (poolId: string, fencerId: string, position: number) => Promise<void>;
  getPoolFencers: (poolId: string) => Promise<Fencer[]>;
  updatePool: (pool: Pool) => Promise<void>;

  // Session State
  saveSessionState: (competitionId: string, state: SessionState) => Promise<void>;
  getSessionState: (competitionId: string) => Promise<SessionState | null>;
  clearSessionState: (competitionId: string) => Promise<void>;

  // Statistiques combattants
  saveTouch: (touch: MatchTouchData) => Promise<void>;
  saveCard: (card: MatchCardData) => Promise<void>;
  updateMatchTiming: (timing: MatchTimingData) => Promise<void>;
  getFencerHistory: (fencerId: string) => Promise<FencerHistory>;
  saveAbandonSnapshot: (
    fencerId: string,
    competitionId: string,
    previousStatus: string,
    abandonType: string,
    matchSnapshots: MatchSnapshot[]
  ) => Promise<void>;
  getAbandonSnapshot: (fencerId: string) => Promise<AbandonSnapshot | null>;
  deleteAbandonSnapshot: (fencerId: string) => Promise<void>;
}

export interface FileAPI {
  export: (filepath: string) => Promise<FileSaveResult>;
  import: (filepath: string) => Promise<FileOpenResult>;
  writeContent: (filepath: string, content: string) => Promise<void>;
  printHtmlToPDF: (html: string, outputPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  exportPhotos: (competitionId: string, filepath: string) => Promise<{ count: number }>;
  importPhotos: (
    competitionId: string,
    filepath: string
  ) => Promise<{ matched: number; total: number }>;
  exportFencersArchive: (competitionId: string, filepath: string) => Promise<{ count: number }>;
  importFencersArchive: (
    competitionId: string,
    filepath: string
  ) => Promise<{ added: number; updated: number }>;
}

export interface DialogAPI {
  openFile: (options: DialogOpenOptions) => Promise<FileOpenResult | null>;
  saveFile: (options: DialogSaveOptions) => Promise<FileSaveResult | null>;
}

export interface MenuAPI {
  onMenuNewCompetition: (callback: () => void) => void;
  onMenuSave: (callback: () => void) => void;
  onMenuCompetitionProperties: (callback: () => void) => void;
  onMenuAddFencer: (callback: () => void) => void;
  onMenuAddReferee: (callback: () => void) => void;
  onMenuNextPhase: (callback: () => void) => void;
  onMenuExport: (callback: (format: string) => void) => void;
  onMenuImport: (callback: (format: string, filepath: string, content: string) => void) => void;
  onMenuReportIssue: (callback: () => void) => void;
  onFileOpened: (callback: (filepath: string) => void) => void;
  onFileSaved: (callback: (filepath: string) => void) => void;
  onAutosaveCompleted: (callback: () => void) => void;
  onAutosaveFailed: (callback: () => void) => void;
}

export interface UtilityAPI {
  print: () => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  getVersionInfo: () => Promise<VersionInfo>;
  removeAllListeners: (channel: string) => void;
}

export interface ElectronAPI extends MenuAPI, UtilityAPI {
  db: DatabaseAPI;
  file: FileAPI;
  dialog: DialogAPI;
  updater: UpdaterAPI;
  remote: RemoteServerAPI;
  onRemoteArenaUpdate: (callback: (data: any) => void) => void;
  onRemoteMatchFinished: (callback: (data: any) => void) => void;
  onKioskNoteUpdate: (callback: (note: import('../types/remote').OrgNote | null) => void) => () => void;
  notifyLanguageChanged: (lang: string) => void;
}

