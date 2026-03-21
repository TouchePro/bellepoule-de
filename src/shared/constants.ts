/**
 * BellePoule Modern - Application Constants
 * Centralized configuration values
 * Licensed under GPL-3.0
 */

// ============================================================================
// Network & Server
// ============================================================================

export const SERVER = {
  REMOTE_SCORE_PORT: 8066,
  DEFAULT_IP: 'localhost',
  SOCKET_TIMEOUT: 10000,
  API_RETRY_ATTEMPTS: 3,
  API_RETRY_DELAY: 1000,
} as const;

// ============================================================================
// Match Configuration
// ============================================================================

export const MATCH = {
  DURATION_SECONDS: 180, // 3 minutes
  DURATION_MILLISECONDS: 180000,
  WARNING_TIME_SECONDS: 60,
  DANGER_TIME_SECONDS: 30,
  BREAK_DURATION_SECONDS: 30,
  DEFAULT_MAX_SCORE_POOL: 5,
  DEFAULT_MAX_SCORE_TABLE: 15,
  MAX_SCORE_LASER_SABRE: 21,
} as const;

// ============================================================================
// Pool Configuration
// ============================================================================

export const POOL = {
  MIN_SIZE: 3,
  MAX_SIZE: 8,
  DEFAULT_SIZE: 5,
  OPTIMAL_SIZE: 6,
} as const;

// ============================================================================
// Auto Save & Intervals
// ============================================================================

export const INTERVALS = {
  AUTO_SAVE_MS: 120000, // 2 minutes
  HEARTBEAT_MS: 30000, // 30 seconds
  UPDATE_CHECK_HOURS: 12,
  REFRESH_UI_MS: 5000,
  DEBOUNCE_INPUT_MS: 300,
  NOTIFICATION_DURATION_MS: 3000,
} as const;

// ============================================================================
// UI Limits
// ============================================================================

export const LIMITS = {
  MAX_COMPETITIONS_DISPLAY: 100,
  MAX_FENCERS_PER_COMPETITION: 500,
  MAX_POOLS: 50,
  MAX_HISTORY_ACTIONS: 50,
  MAX_PHOTO_SIZE_KB: 500,
  MAX_PHOTO_DIMENSION: 300,
  VIRTUAL_LIST_THRESHOLD: 50,
} as const;

// ============================================================================
// File Upload
// ============================================================================

export const UPLOAD = {
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_PHOTO_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_IMPORT_TYPES: ['.csv', '.xlsx', '.xml', '.json'],
  MAX_FILES_BATCH: 50,
} as const;

// ============================================================================
// Cache Configuration
// ============================================================================

export const CACHE = {
  DEFAULT_TTL_MS: 300000, // 5 minutes
  MAX_ENTRIES: 1000,
  PREFIX: 'bp_cache_',
} as const;

// ============================================================================
// Late Fencer Thresholds
// ============================================================================

export const LATE_FENCER = {
  WARNING_MINUTES: 5,
  CRITICAL_MINUTES: 10,
  FORFEIT_MINUTES: 15,
} as const;

// ============================================================================
// Tournament Phases
// ============================================================================

export const PHASE = {
  CHECKIN: 'checkin',
  POOL: 'pool',
  DIRECT_ELIMINATION: 'direct_elimination',
  CLASSIFICATION: 'classification',
} as const;

// ============================================================================
// Export Formats
// ============================================================================

export const EXPORT = {
  FORMATS: ['pdf', 'csv', 'xlsx', 'xml', 'html', 'json'] as const,
  DEFAULT_PAPER_SIZE: 'A4',
  DEFAULT_ORIENTATION: 'landscape',
} as const;

// ============================================================================
// Error Messages (French)
// ============================================================================

export const ERRORS = {
  DB_CONNECTION: 'Erreur de connexion à la base de données',
  DB_SAVE: 'Erreur lors de la sauvegarde des données',
  DB_LOAD: 'Erreur lors du chargement des données',
  INVALID_DATA: 'Données invalides',
  NETWORK_ERROR: 'Erreur réseau',
  SERVER_OFFLINE: 'Le serveur distant est hors ligne',
  FILE_TOO_LARGE: 'Fichier trop volumineux',
  INVALID_FILE_TYPE: 'Type de fichier non supporté',
  PERMISSION_DENIED: 'Permission refusée',
  UNKNOWN_ERROR: 'Une erreur inattendue est survenue',
} as const;

// ============================================================================
// Success Messages (French)
// ============================================================================

export const SUCCESS = {
  SAVED: 'Sauvegarde réussie',
  EXPORTED: 'Export réussi',
  IMPORTED: 'Import réussi',
  DELETED: 'Suppression réussie',
  UPDATED: 'Mise à jour réussie',
  POOL_GENERATED: 'Poules générées avec succès',
  MATCH_COMPLETED: 'Match enregistré',
} as const;

// ============================================================================
// Validation Rules
// ============================================================================

export const VALIDATION = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_CLUB_LENGTH: 100,
  MAX_LICENSE_LENGTH: 50,
  MIN_RANKING: 1,
  MAX_RANKING: 999999,
} as const;
