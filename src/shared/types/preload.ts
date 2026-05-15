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
  FencerCompetitionStats,
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
  id?: string;
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
  refereeId?: string;
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

export interface ArenaExitData {
  id: string;
  matchId: string;
  fencerId: string;
  exitType: 'arena_exit' | 'arena_exit_voluntary';
  timestamp: string; // ISO 8601
  pointsAwarded: number;
}

export type { FencerCompetitionStats };

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
  getNetworkInterfaces: () => Promise<{
    success: boolean;
    interfaces?: { name: string; address: string }[];
  }>;
  startServer: (
    competitionId: string,
    port?: number,
    host?: string
  ) => Promise<{ success: boolean; serverInfo?: RemoteServerInfo; error?: string }>;
  stopServer: (competitionId: string) => Promise<{ success: boolean; error?: string }>;
  getServerInfo: (competitionId: string) => Promise<{ success: boolean; serverInfo?: RemoteServerInfo; error?: string }>;
  startSession: (
    competitionId: string,
    strips: number,
    matches?: any[],
    showPhotos?: boolean,
    kioskViews?: Record<string, boolean>,
    cardAnnounce?: boolean
  ) => Promise<{ success: boolean; session?: any; error?: string }>;
  stopSession: (competitionId: string) => Promise<{ success: boolean; error?: string }>;
  launchCompetition: (competitionId: string) => Promise<{ success: boolean; error?: string }>;
  getSession: (competitionId: string) => Promise<{ success: boolean; session?: any; error?: string }>;
  getArenas: (competitionId: string) => Promise<{ success: boolean; arenas?: any[]; error?: string }>;
  updateStripCount: (competitionId: string, count: number) => Promise<{ success: boolean; session?: any; error?: string }>;
  updateShowPhotos: (competitionId: string, value: boolean) => Promise<{ success: boolean; error?: string }>;
  updateCardAnnounce: (competitionId: string, value: boolean) => Promise<{ success: boolean; error?: string }>;
  updateMatchArena: (
    competitionId: string,
    matchId: string,
    fromArena: number | null,
    toArena: number | null,
    fencerA?: Fencer | null,
    fencerB?: Fencer | null
  ) => Promise<{ success: boolean; error?: string }>;
  updatePoolFencers: (
    competitionId: string,
    updates: Array<{ poolId: string; fencers: any[] }>
  ) => Promise<{ success: boolean; error?: string }>;
  syncPoolMatches: (
    competitionId: string,
    poolsData: Array<{ poolId: string; matches: any[] }>
  ) => Promise<{ success: boolean; error?: string }>;
  refreshDeMatches: (competitionId: string, matches: any[]) => Promise<{ success: boolean; error?: string }>;
  setArenaPassword: (
    competitionId: string,
    arenaId: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateKioskViews: (
    competitionId: string,
    views: Record<string, boolean>
  ) => Promise<{ success: boolean; error?: string }>;
  setOrgNote: (
    competitionId: string,
    note: import('../types/remote').OrgNote
  ) => Promise<{ success: boolean; error?: string }>;
  clearOrgNote: (competitionId: string) => Promise<{ success: boolean; error?: string }>;
  updateTheme: (
    competitionId: string,
    theme: import('../types/remote').DisplayTheme
  ) => Promise<{ success: boolean; error?: string }>;
  updateArenaTheme: (
    competitionId: string,
    arenaId: string,
    theme: import('../types/remote').DisplayTheme,
    customTheme?: import('../types/remote').CustomTheme
  ) => Promise<{ success: boolean; error?: string }>;
  updateLogo: (logo: string | null) => Promise<{ success: boolean; error?: string }>;
  changePort: (
    competitionId: string,
    newPort: number
  ) => Promise<{ success: boolean; serverInfo?: RemoteServerInfo; error?: string }>;
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
  upsertTableauMatch: (params: {
    competitionId: string;
    matchId: string;
    round: number;
    position: number;
    fencerAId?: string | null;
    fencerBId?: string | null;
    scoreA?: any | null;
    scoreB?: any | null;
    status?: string;
    maxScore?: number;
    isBye?: boolean;
  }) => Promise<void>;
  upsertMultipleTableauMatches: (
    competitionId: string,
    matches: Array<{
      matchId: string;
      round: number;
      position: number;
      fencerAId?: string | null;
      fencerBId?: string | null;
      scoreA?: any | null;
      scoreB?: any | null;
      status?: string;
      maxScore?: number;
      isBye?: boolean;
    }>
  ) => Promise<void>;

  // Pools
  createPool: (phaseId: string, number: number, poolId?: string) => Promise<Pool>;
  clearPoolsForPhase: (phaseId: string) => Promise<void>;
  addFencerToPool: (poolId: string, fencerId: string, position: number) => Promise<void>;
  getPoolFencers: (poolId: string) => Promise<Fencer[]>;
  getPoolsByPhase: (phaseId: string) => Promise<Pool[]>;
  updatePool: (pool: Pool) => Promise<void>;

  // Phases
  createPhase: (competitionId: string, type: string, order: number, name: string) => Promise<Phase>;
  getPhase: (id: string) => Promise<Phase | null>;
  getPhasesByCompetition: (competitionId: string) => Promise<Phase[]>;
  updatePhase: (id: string, updates: { name?: string; isComplete?: boolean }) => Promise<void>;
  deletePhase: (id: string) => Promise<void>;

  // Referees
  createReferee: (
    competitionId: string,
    data: {
      name: string;
      gender?: string;
      nationality?: string;
      club?: string;
      license?: string;
      category?: string;
    }
  ) => Promise<Referee>;
  getReferee: (id: string) => Promise<Referee | null>;
  getRefereesByCompetition: (competitionId: string) => Promise<Referee[]>;
  updateReferee: (id: string, updates: Record<string, string | undefined>) => Promise<void>;
  deleteReferee: (id: string) => Promise<void>;

  // Touch / Card read
  getTouches: (matchId: string) => Promise<
    Array<{
      id: string;
      fencerId: string;
      zone: string;
      points: number;
      timestamp: string;
      isValidInSuddenDeath: boolean;
      isReversed: boolean;
    }>
  >;
  getCards: (matchId: string) => Promise<
    Array<{
      id: string;
      fencerId: string;
      cardType: string;
      reason: string;
      cardGroup: number;
      timestamp: string;
      pointsAwarded: number;
      resultingExclusion: boolean;
    }>
  >;

  // Session State
  saveSessionState: (competitionId: string, state: SessionState) => Promise<void>;
  saveSessionStateSync: (competitionId: string, state: unknown) => boolean;
  getSessionState: (competitionId: string) => Promise<SessionState | null>;
  clearSessionState: (competitionId: string) => Promise<void>;

  // Statistiques combattants
  saveTouch: (touch: MatchTouchData) => Promise<void>;
  saveCard: (card: MatchCardData) => Promise<void>;
  updateMatchTiming: (timing: MatchTimingData) => Promise<void>;
  getFencerHistory: (fencerId: string) => Promise<FencerHistory>;
  saveArenaExit: (exit: ArenaExitData) => Promise<void>;
  getFencerCompetitionStats: (fencerId: string) => Promise<FencerCompetitionStats>;
  getCompetitionFencerStats: (competitionId: string) => Promise<FencerCompetitionStats[]>;
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
  printHtml: (html: string) => Promise<{ success: boolean; error?: string }>;
  printHtmlToPDF: (
    html: string,
    outputPath: string
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
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

// ============================================================================
// Bracket Node Types
// ============================================================================

export interface BracketNodeData {
  id: string;
  competitionId: string;
  round: number;
  position: number;
  fencerAId: string | null;
  fencerBId: string | null;
  winnerId: string | null;
  isBye: boolean;
  matchId: string | null;
}

// ============================================================================
// Score Audit Log Types
// ============================================================================

export interface ScoreAuditLogEntry {
  id: string;
  matchId: string;
  competitionId: string;
  changedBy: string;
  timestamp: string; // ISO 8601
  field: 'scoreA' | 'scoreB' | 'status';
  previousValue: string | null; // JSON
  newValue: string | null; // JSON
}

// ============================================================================
// Arena State Types
// ============================================================================

export interface ArenaStateData {
  arenaId: string;
  competitionId: string;
  currentMatchId: string | null;
  strip: number;
  isActive: boolean;
  lastUpdated: string; // ISO 8601
  extraData?: Record<string, unknown>;
}

export interface ElectronAPI extends MenuAPI, UtilityAPI {
  db: DatabaseAPI;
  file: FileAPI;
  dialog: DialogAPI;
  updater: UpdaterAPI;
  remote: RemoteServerAPI;
  onRemoteArenaUpdate: (callback: (data: any) => void) => void;
  onRemoteMatchFinished: (callback: (data: any) => void) => void;
  onKioskNoteUpdate: (
    callback: (note: import('../types/remote').OrgNote | null) => void
  ) => () => void;
  notifyLanguageChanged: (lang: string) => void;
  getLogo: () => Promise<string | null>;
  onLogoLoaded: (callback: (logo: string | null) => void) => () => void;
}
