/**
 * BellePoule Modern - Remote Score Entry Server
 * Web server for referees to enter scores remotely
 * Licensed under GPL-3.0
 */

import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import os from 'os';
import { randomBytes, timingSafeEqual } from 'crypto';
import {
  RemoteSession,
  RemoteScoreUpdate,
  WebSocketMessage,
  Arena,
  ArenaMatch,
  ArenaSettings,
  ArenaUpdate,
  OrgNote,
  DisplayTheme,
  CustomTheme,
} from '../shared/types/remote';
import { Competition, Match, Fencer, MatchStatus, Score } from '../shared/types';
import { DatabaseManager } from '../database';

export class RemoteScoreServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;
  private db: DatabaseManager;
  private session: RemoteSession | null = null;
  private arenas: Map<string, Arena> = new Map();
  private arenaCount: number = 4; // Nombre d'arènes par défaut
  private sessionWeapon: string | null = null; // Type d'arme de la compétition (L = Laser)
  private sessionMatches: any[] = []; // Matches passés depuis le renderer
  private arenaNextMatchIndex: Map<string, number> = new Map(); // Index du prochain match par arène
  private arenaMatchQueue: Map<string, ArenaMatch[]> = new Map(); // File d'attente DE par arène
  private poolFencersCache: Map<string, any[]> = new Map(); // Tireurs par poolId (depuis le renderer)
  private sessionMatchScores: Map<string, { scoreA: any; scoreB: any; status: string }> = new Map(); // Scores en mémoire
  private sessionShowPhotos: boolean = false; // Afficher les photos des combattants avant le combat
  private sessionTheme: DisplayTheme = 'dark'; // Thème visuel de l'affichage distant (global)
  private arenaThemeOverrides: Map<string, { theme: DisplayTheme; customTheme?: CustomTheme }> = new Map();
  private orgNote: OrgNote | null = null; // Note d'organisation affichée sur le kiosk
  private sessionLogo: string | null = null; // Logo organisateur (base64) pour kiosk et affichages publics
  private currentLang: string = 'fr'; // Langue courante de l'interface (fr, en, zh-HK, ...)
  private sessionKioskViews: { poules: boolean; classement: boolean; direct: boolean; suivants: boolean } = {
    poules: true,
    classement: true,
    direct: true,
    suivants: true,
  };

  // Stocker le contenu des fichiers HTML en mémoire pour éviter les problèmes de chemin
  private htmlFiles: Map<string, string> = new Map();

  // Tokens d'authentification par arène (password protection)
  private arenaTokens: Map<string, Set<string>> = new Map();

  // Rate limiting pour le login : { ip → { count, resetAt } }
  private loginAttempts: Map<string, { count: number; resetAt: number }> = new Map();
  // Rate limiting pour les soumissions de score : { ip → { count, resetAt } }
  private scoreRateLimiter: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly SCORE_RATE_LIMIT = 30; // soumissions par minute par IP
  // Buffer d'événements par arène pour la reconnexion WebSocket (replay)
  private arenaEventBuffer: Map<string, Array<{ event: ArenaUpdate; timestamp: number }>> = new Map();
  private readonly EVENT_BUFFER_MAX = 50;
  private readonly EVENT_BUFFER_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(db: DatabaseManager, port: number = 8066) {
    console.log('[RemoteScoreServer] Initialisation du serveur de saisie distante...');
    this.db = db;
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    // Limiter CORS au réseau local (localhost + LAN) pour la sécurité
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: (origin, callback) => {
          // Autoriser les requêtes sans origin (ex. Electron, curl) et le réseau local
          if (!origin) return callback(null, true);
          try {
            const url = new URL(origin);
            const hostname = url.hostname;
            const isLocal =
              hostname === 'localhost' ||
              hostname === '127.0.0.1' ||
              hostname === '::1' ||
              /^10\./.test(hostname) ||
              /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
              /^192\.168\./.test(hostname);
            callback(null, isLocal);
          } catch {
            callback(null, false);
          }
        },
        methods: ['GET', 'POST'],
      },
    });

    // Charger les fichiers HTML en mémoire au démarrage
    this.loadHtmlFiles();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.initializeArenas();
    console.log(`[RemoteScoreServer] Serveur initialisé avec ${this.arenaCount} arènes`);
  }

  // Charger les fichiers HTML en mémoire pour éviter les problèmes de chemin
  private loadHtmlFiles(): void {
    const fs = require('fs');
    const isDev = process.env.NODE_ENV === 'development';

    // Liste des fichiers à charger
    const filesToLoad = [
      'referee.html',
      'arena.html',
      'dashboard.html',
      'index.html',
      'pool.html',
      'kiosk.html',
      'login.html',
      'public.html',
    ];

    // Essayer plusieurs chemins pour trouver les fichiers
    const possiblePaths = isDev
      ? [
          path.join(__dirname, '../remote'), // dist/remote/ (après webpack)
          path.join(__dirname, '../../src/remote'), // src/remote/ (sans webpack)
        ]
      : [
          path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'remote'),
          path.join(__dirname, '..', 'remote').replace('app.asar', 'app.asar.unpacked'),
          path.join(__dirname, '..', 'remote'),
          path.join(__dirname, '../../src/remote'), // fallback source sans webpack
        ];

    console.log('[RemoteScoreServer] Chargement des fichiers HTML...');

    for (const basePath of possiblePaths) {
      console.log(`[RemoteScoreServer] Essai chemin: ${basePath}`);

      try {
        if (fs.existsSync(basePath)) {
          console.log(`[RemoteScoreServer] Chemin trouvé: ${basePath}`);

          for (const file of filesToLoad) {
            const filePath = path.join(basePath, file);
            if (fs.existsSync(filePath)) {
              this.htmlFiles.set(file, fs.readFileSync(filePath, 'utf-8'));
              console.log(`[RemoteScoreServer] Chargé: ${file}`);
            } else {
              console.log(`[RemoteScoreServer] Fichier non trouvé: ${filePath}`);
            }
          }

          // Si on a chargé au moins un fichier, on utilise ce chemin
          if (this.htmlFiles.size > 0) {
            console.log(
              `[RemoteScoreServer] ${this.htmlFiles.size} fichiers chargés depuis: ${basePath}`
            );
            break;
          }
        }
      } catch (err) {
        console.error(`[RemoteScoreServer] Erreur avec chemin ${basePath}:`, err);
      }
    }

    if (this.htmlFiles.size === 0) {
      console.error('[RemoteScoreServer] ERREUR: Aucun fichier HTML chargé!');
    } else {
      console.log(
        `[RemoteScoreServer] Chargement terminé: ${Array.from(this.htmlFiles.keys()).join(', ')}`
      );
    }
  }

  // Servir un fichier HTML depuis la mémoire
  private sendHtmlFromMemory(filename: string, res: express.Response): void {
    const html = this.htmlFiles.get(filename);
    if (html) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } else {
      console.error(`[RemoteScoreServer] ERREUR: Fichier ${filename} non trouvé en mémoire`);
      res.status(500).send(`Erreur: fichier ${filename} non trouvé`);
    }
  }

  private parseCookies(header: string | undefined): Record<string, string> {
    if (!header) return {};
    const result: Record<string, string> = {};
    for (const part of header.split(';')) {
      const idx = part.indexOf('=');
      if (idx < 0) continue;
      const key = decodeURIComponent(part.slice(0, idx).trim());
      const val = decodeURIComponent(part.slice(idx + 1).trim());
      if (key) result[key] = val;
    }
    return result;
  }

  private checkArenaAuth(arenaId: string, cookieHeader: string | undefined): boolean {
    const fullId = arenaId.startsWith('arena') ? arenaId : `arena${arenaId}`;
    const arena = this.arenas.get(fullId);
    if (!arena?.password) return true;
    const token = this.parseCookies(cookieHeader)[`bp_token_${fullId}`];
    return !!token && (this.arenaTokens.get(fullId)?.has(token) ?? false);
  }

  /** Vérifie qu'au moins un token d'arène valide est présent dans le cookie.
   *  Si aucune arène n'a de mot de passe, accès libre (comportement par défaut). */
  private hasAnyValidToken(cookieHeader: string | undefined): boolean {
    const hasPasswordProtection = Array.from(this.arenas.values()).some(a => !!a.password);
    if (!hasPasswordProtection) return true;
    if (!cookieHeader) return false;
    const cookies = this.parseCookies(cookieHeader);
    for (const [arenaId, tokens] of this.arenaTokens) {
      const token = cookies[`bp_token_${arenaId}`];
      if (token && tokens.has(token)) return true;
    }
    return false;
  }

  private setupMiddleware(): void {
    console.log('[RemoteScoreServer] Configuration du middleware...');
    this.app.use(express.json());

    // Déterminer le chemin des fichiers remote
    let remotePath: string;
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // En développement
      remotePath = path.join(__dirname, '../remote'); // dist/remote/ (après webpack)
      if (!require('fs').existsSync(remotePath)) {
        remotePath = path.join(__dirname, '../../src/remote'); // src/remote/ (sans webpack)
      }
    } else {
      // En production - utiliser process.resourcesPath qui est plus fiable
      // Les fichiers unpacked sont dans resourcesPath/app.asar.unpacked/dist/remote
      // __dirname est dans resourcesPath/app.asar/dist/main/

      // Essayer plusieurs chemins possibles
      const possiblePaths = [
        // Chemin standard avec asarUnpack
        path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'remote'),
        // Chemin relatif depuis __dirname
        path.join(__dirname, '..', 'remote').replace('app.asar', 'app.asar.unpacked'),
        // Dernier recours: chemin relatif standard
        path.join(__dirname, '..', 'remote'),
        // Fallback source sans webpack
        path.join(__dirname, '../../src/remote'),
      ];

      remotePath = '';
      const fs = require('fs');
      for (const p of possiblePaths) {
        console.log(`[RemoteScoreServer] Vérification chemin: ${p}`);
        if (fs.existsSync(p)) {
          remotePath = p;
          console.log(`[RemoteScoreServer] Chemin valide trouvé: ${p}`);
          break;
        }
      }

      if (!remotePath) {
        console.error('[RemoteScoreServer] ERREUR: Aucun chemin valide trouvé!');
        console.error('[RemoteScoreServer] Chemins testés:', possiblePaths);
        // Utiliser le dernier chemin comme fallback
        remotePath = possiblePaths[possiblePaths.length - 1];
      }
    }

    console.log('[RemoteScoreServer] Chemin des fichiers distants:', remotePath);
    console.log('[RemoteScoreServer] NODE_ENV:', process.env.NODE_ENV || 'production');
    console.log('[RemoteScoreServer] __dirname:', __dirname);
    console.log('[RemoteScoreServer] process.resourcesPath:', process.resourcesPath);

    // Vérifier que le dossier existe
    try {
      const fs = require('fs');
      if (fs.existsSync(remotePath)) {
        console.log('[RemoteScoreServer] Dossier distant trouvé ✓');
        const files = fs.readdirSync(remotePath);
        console.log('[RemoteScoreServer] Fichiers disponibles:', files);
      } else {
        console.error('[RemoteScoreServer] ERREUR: Dossier distant non trouvé!', remotePath);
      }
    } catch (err) {
      console.error('[RemoteScoreServer] ERREUR lors de la vérification du dossier:', err);
    }

    this.app.use(express.static(remotePath));

    this.app.use((req, res, next) => {
      console.log(`[RemoteScoreServer] ${req.method} ${req.url} - ${new Date().toISOString()}`);
      // Restreindre CORS au réseau local uniquement (même logique que Socket.IO)
      const origin = req.headers.origin;
      if (origin) {
        try {
          const url = new URL(origin);
          const h = url.hostname;
          const isLocal =
            h === 'localhost' ||
            h === '127.0.0.1' ||
            h === '::1' ||
            /^10\./.test(h) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
            /^192\.168\./.test(h);
          if (isLocal) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', 'true');
          }
        } catch {
          // Origine invalide : ne pas définir le header CORS
        }
      }
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
      }
      next();
    });
    console.log('[RemoteScoreServer] Middleware configuré ✓');
  }

  private setupRoutes(): void {
    console.log('[RemoteScoreServer] Configuration des routes...');

    // Route principale pour les arbitres
    this.app.get('/', (req, res) => {
      console.log('[RemoteScoreServer] Accès à la route principale /');
      const isDev = process.env.NODE_ENV === 'development';

      let remotePath = '';
      if (isDev) {
        remotePath = path.join(__dirname, '../../remote/index.html');
      } else {
        // Essayer plusieurs chemins possibles
        const possiblePaths = [
          path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'remote', 'index.html'),
          path
            .join(__dirname, '..', 'remote', 'index.html')
            .replace('app.asar', 'app.asar.unpacked'),
          path.join(__dirname, '..', 'remote', 'index.html'),
        ];

        const fs = require('fs');
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            remotePath = p;
            break;
          }
        }
        if (!remotePath) remotePath = possiblePaths[possiblePaths.length - 1];
      }

      console.log('[RemoteScoreServer] Envoi du fichier:', remotePath);
      this.sendHtmlFromMemory('index.html', res);
    });

    // API endpoints
    this.app.get('/api/config', (req, res) => {
      res.json({ lang: this.currentLang });
    });

    this.app.get('/api/server-info', (req, res) => {
      res.json({
        url: this.getServerUrl(),
        ip: this.getLocalIPAddress(),
        port: this.port,
      });
    });

    // Get pending matches for a competition
    this.app.get('/api/competitions/:competitionId/pending-matches', (req, res) => {
      try {
        const { competitionId } = req.params;

        const pendingMatches = this.db.getPendingMatches(competitionId);
        res.json(pendingMatches);
      } catch (error) {
        console.error('Error getting pending matches:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des matchs' });
      }
    });

    this.app.get('/api/debug', (req, res) => {
      res.json({
        status: 'ok',
        session: this.session ? 'active' : 'inactive',
        serverTime: new Date().toISOString(),
        refereesCount: this.session?.referees.length || 0,
      });
    });

    this.app.get('/api/session', (req, res) => {
      console.log(
        '[RemoteScoreServer] GET /api/session - Session:',
        this.session ? 'active' : 'inactive'
      );
      if (!this.session) {
        return res.status(404).json({ error: 'Aucune session active' });
      }
      res.json({ ...this.session, weapon: this.sessionWeapon, kioskViews: this.sessionKioskViews, orgNote: this.orgNote });
    });

    this.app.post('/api/session/start', async (req, res) => {
      try {
        const { competitionId, strips } = req.body;
        const competition = this.db.getCompetition(competitionId);

        if (!competition) {
          return res.status(404).json({ error: 'Compétition non trouvée' });
        }

        this.session = await this.createSession(competitionId, strips);
        res.json(this.session);
      } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Erreur lors du démarrage de la session' });
      }
    });

    this.app.post('/api/session/stop', (req, res) => {
      this.session = null;
      res.json({ success: true });
    });

    // Logo organisateur
    this.app.get('/api/logo', (req, res) => {
      res.json({ logo: this.sessionLogo });
    });

    // Arena routes
    this.app.get('/api/arenas', (req, res) => {
      res.json(this.getAllArenas());
    });

    this.app.get('/api/arenas/:arenaId', (req, res) => {
      const arena = this.getArena(req.params.arenaId);
      if (!arena) {
        return res.status(404).json({ error: 'Arène non trouvée' });
      }
      res.json(arena);
    });

    this.app.post('/api/arenas/:arenaId/assign', (req, res) => {
      const { match } = req.body;
      try {
        this.assignMatchToArena(req.params.arenaId, match);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur inconnue' });
      }
    });

    this.app.post('/api/arenas/:arenaId/start', (req, res) => {
      this.startArenaMatch(req.params.arenaId);
      res.json({ success: true });
    });

    this.app.post('/api/arenas/:arenaId/pause', (req, res) => {
      this.pauseArenaMatch(req.params.arenaId);
      res.json({ success: true });
    });

    this.app.post('/api/arenas/:arenaId/score', (req, res) => {
      const { scoreA, scoreB } = req.body;
      this.updateArenaScore(req.params.arenaId, scoreA, scoreB);
      res.json({ success: true });
    });

    this.app.post('/api/arenas/:arenaId/finish', (req, res) => {
      this.finishArenaMatch(req.params.arenaId);
      res.json({ success: true });
    });

    // Get all pools for current competition
    this.app.get('/api/pools', (req, res) => {
      if (!this.session) {
        return res.status(404).json({ error: 'Aucune session active' });
      }
      try {
        const pools = this.db.getCompetitionPools(this.session.competitionId);
        res.json(pools);
      } catch (error) {
        console.error('Error getting pools:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des poules' });
      }
    });

    // Get matches for a specific pool
    this.app.get('/api/pools/:poolId/matches', (req, res) => {
      const { poolId } = req.params;
      try {
        const matches = this.db.getMatchesByPool(poolId);
        res.json(matches);
      } catch (error) {
        console.error('Error getting pool matches:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des matchs' });
      }
    });

    // Get pending matches for a specific pool
    this.app.get('/api/pools/:poolId/pending-matches', (req, res) => {
      const { poolId } = req.params;
      try {
        const matches = this.db.getMatchesByPool(poolId);
        const pending = matches.filter(
          m => m.status === 'not_started' || m.status === 'in_progress'
        );
        res.json(pending);
      } catch (error) {
        console.error('Error getting pending matches:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des matchs' });
      }
    });

    // Pages d'arène - Dynamiques
    const getRemotePath = (filename: string) => {
      const isDev = process.env.NODE_ENV === 'development';
      const fs = require('fs');

      const possiblePaths = isDev
        ? [
            path.join(__dirname, '../remote', filename),
            path.join(__dirname, '../../src/remote', filename),
          ]
        : [
            path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'remote', filename),
            path.join(__dirname, '..', 'remote', filename).replace('app.asar', 'app.asar.unpacked'),
            path.join(__dirname, '..', 'remote', filename),
            path.join(__dirname, '../../src/remote', filename),
          ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
      }
      return possiblePaths[possiblePaths.length - 1];
    };

    // Support both /arena1 and /arene1 formats
    this.app.get('/arena:arenaId', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(`[RemoteScoreServer] Accès à l'arène ${arenaId}`);

      this.sendHtmlFromMemory('arena.html', res);
    });

    // Alias /arene pour compatibilité française
    this.app.get('/arene:arenaId', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(`[RemoteScoreServer] Accès à l'arène (arene) ${arenaId}`);

      this.sendHtmlFromMemory('arena.html', res);
    });

    // Interface d'arbitrage - Dynamique (sans vérification d'existence)
    this.app.get('/arena:arenaId/referee', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(`[RemoteScoreServer] Accès à l'interface arbitre pour l'arène ${arenaId}`);
      if (!this.checkArenaAuth(arenaId, req.headers.cookie)) {
        return res.redirect(
          302,
          `/login?arena=arena${arenaId}&return=${encodeURIComponent(req.path)}`
        );
      }
      this.sendHtmlFromMemory('referee.html', res);
    });

    // Alias /arene pour l'interface d'arbitrage (français)
    this.app.get('/arene:arenaId/referee', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(
        `[RemoteScoreServer] Accès à l'interface arbitre pour l'arène ${arenaId} (arene)`
      );
      if (!this.checkArenaAuth(arenaId, req.headers.cookie)) {
        return res.redirect(
          302,
          `/login?arena=arena${arenaId}&return=${encodeURIComponent(req.path)}`
        );
      }
      this.sendHtmlFromMemory('referee.html', res);
    });

    // Alias /arbitre pour l'interface d'arbitrage
    this.app.get('/arbitre/:arenaId', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(
        `[RemoteScoreServer] Accès à l'interface arbitre (alias /arbitre) pour l'arène ${arenaId}`
      );
      if (!this.checkArenaAuth(arenaId, req.headers.cookie)) {
        return res.redirect(
          302,
          `/login?arena=arena${arenaId}&return=${encodeURIComponent(req.path)}`
        );
      }
      this.sendHtmlFromMemory('referee.html', res);
    });

    // Nouveau: Route /arbitre/areneX (format demandé par l'utilisateur)
    this.app.get('/arbitre/arene:arenaId', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(`[RemoteScoreServer] Accès à l'interface arbitre /arbitre/arene${arenaId}`);
      if (!this.checkArenaAuth(arenaId, req.headers.cookie)) {
        return res.redirect(
          302,
          `/login?arena=arena${arenaId}&return=${encodeURIComponent(req.path)}`
        );
      }
      this.sendHtmlFromMemory('referee.html', res);
    });

    // Route /areneX/arbitre (format français demandé)
    this.app.get('/arene:arenaId/arbitre', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(`[RemoteScoreServer] Accès à l'interface arbitre /arene${arenaId}/arbitre`);
      if (!this.checkArenaAuth(arenaId, req.headers.cookie)) {
        return res.redirect(
          302,
          `/login?arena=arena${arenaId}&return=${encodeURIComponent(req.path)}`
        );
      }
      this.sendHtmlFromMemory('referee.html', res);
    });

    // Vue publique par arène (lecture seule, pas d'authentification requise)
    this.app.get('/arene:arenaId/public', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(`[RemoteScoreServer] Accès vue publique /arene${arenaId}/public`);
      this.sendHtmlFromMemory('public.html', res);
    });

    this.app.get('/arena:arenaId/public', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(`[RemoteScoreServer] Accès vue publique /arena${arenaId}/public`);
      this.sendHtmlFromMemory('public.html', res);
    });

    // Vue de saisie de poule par arène
    this.app.get('/arene:arenaId/poule', (req, res) => {
      const arenaId = req.params.arenaId;
      console.log(`[RemoteScoreServer] Accès à la vue poule /arene${arenaId}/poule`);
      if (!this.checkArenaAuth(arenaId, req.headers.cookie)) {
        return res.redirect(
          302,
          `/login?arena=arena${arenaId}&return=${encodeURIComponent(req.path)}`
        );
      }
      this.sendHtmlFromMemory('pool.html', res);
    });

    // Affichage kiosk grand écran public
    this.app.get('/kiosk', (req, res) => {
      console.log('[RemoteScoreServer] Accès au mode kiosk');
      this.sendHtmlFromMemory('kiosk.html', res);
    });

    // Page de connexion pour les pages protégées par mot de passe
    this.app.get('/login', (_req, res) => {
      this.sendHtmlFromMemory('login.html', res);
    });

    // API: authentification par mot de passe pour une arène
    this.app.post('/api/auth/login/:arenaId', (req, res) => {
      // Rate limiting : 5 tentatives par IP par minute
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
      const now = Date.now();
      const attempt = this.loginAttempts.get(ip);
      if (attempt) {
        if (now < attempt.resetAt) {
          if (attempt.count >= 5) {
            return res.status(429).json({ success: false, error: 'Trop de tentatives. Réessayez dans 1 minute.' });
          }
          attempt.count++;
        } else {
          this.loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
        }
      } else {
        this.loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
      }

      const rawId = req.params.arenaId;
      const fullId = rawId.startsWith('arena') ? rawId : `arena${rawId}`;
      const arena = this.arenas.get(fullId);
      if (!arena?.password) {
        return res.json({ success: true });
      }
      const { password } = req.body as { password: string };
      // Comparaison résistante aux timing attacks
      let passwordOk = false;
      try {
        passwordOk =
          !!password &&
          password.length === arena.password.length &&
          timingSafeEqual(Buffer.from(password), Buffer.from(arena.password));
      } catch {
        passwordOk = false;
      }
      if (!passwordOk) {
        return res.status(401).json({ success: false, error: 'Mot de passe incorrect' });
      }
      // Login réussi : réinitialiser le compteur d'échecs
      this.loginAttempts.delete(ip);
      const token = randomBytes(32).toString('hex');
      if (!this.arenaTokens.has(fullId)) this.arenaTokens.set(fullId, new Set());
      this.arenaTokens.get(fullId)!.add(token);
      res.setHeader(
        'Set-Cookie',
        `bp_token_${fullId}=${token}; HttpOnly; SameSite=Strict; Max-Age=${8 * 3600}; Path=/`
      );
      res.json({ success: true });
    });

    // API: données complètes de la poule pour une arène
    this.app.get('/api/arenas/:arenaId/pool-data', (req, res) => {
      const rawId = req.params.arenaId;
      // Accepte "1" ou "arena1" comme arenaId
      const arenaId = rawId.startsWith('arena') ? rawId : `arena${rawId}`;
      try {
        const arena = this.arenas.get(arenaId);
        const poolId = arena?.currentMatch?.poolId;
        if (!poolId) {
          return res.status(404).json({ error: 'Aucune poule assignée à cette arène' });
        }

        // Priorité : cache en mémoire (matchs du renderer), fallback DB
        const fencers = this.poolFencersCache.get(poolId) ?? this.db.getPoolFencers(poolId);
        const matches = (() => {
          const inMemory = this.sessionMatches
            .filter(m => (m.poolId || m.pool?.id || `pool-${m.poolNumber || m.number}`) === poolId)
            .sort((a: any, b: any) => (a.number || 0) - (b.number || 0));
          if (inMemory.length > 0) {
            return inMemory.map(m => {
              const update = this.sessionMatchScores.get(m.id);
              return update ? { ...m, ...update } : m;
            });
          }
          return this.db.getMatchesByPool(poolId);
        })();
        const isComplete =
          matches.length > 0 && matches.every((m: any) => m.status === MatchStatus.FINISHED);

        const poolName = (() => {
          if (!this.session) return 'Poule';
          const allPools = this.db.getCompetitionPools(this.session.competitionId);
          return allPools.find(p => p.id === poolId)?.name ?? 'Poule';
        })();

        res.json({ poolId, poolName, arenaId, fencers, matches, isComplete });
      } catch (err) {
        console.error('[RemoteScoreServer] Erreur pool-data:', err);
        res.status(500).json({ error: 'Erreur interne' });
      }
    });

    // API: saisir le score d'un match de poule
    this.app.post('/api/pools/:poolId/matches/:matchId/score', (req, res) => {
      if (!this.hasAnyValidToken(req.headers.cookie)) {
        return res.status(401).json({ error: 'Non authentifié' });
      }
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.socket.remoteAddress ?? 'unknown';
      if (!this.checkScoreRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Trop de soumissions, réessayez dans une minute' });
      }
      const { poolId, matchId } = req.params;
      if (!/^[0-9a-f-]{36}$/i.test(matchId) && !/^[0-9a-f-]{36}$/i.test(poolId)) {
        // Accepter aussi des IDs non-UUID (matchs en mémoire) - on valide le format souple
      }
      const { scoreA, scoreB, specialStatus } = req.body as {
        scoreA: number;
        scoreB: number;
        specialStatus?: string;
      };
      // Validation des scores
      const sA = Number(scoreA);
      const sB = Number(scoreB);
      if (!Number.isInteger(sA) || !Number.isInteger(sB) || sA < 0 || sB < 0 || sA > 50 || sB > 50) {
        return res.status(400).json({ error: 'Scores invalides (entiers entre 0 et 50)' });
      }
      try {
        const winner = sA > sB ? 'A' : sB > sA ? 'B' : null;
        const scoreAObj: Score = {
          value: sA,
          isVictory: winner === 'A',
          isAbstention: specialStatus === 'abandon_A',
          isExclusion: specialStatus === 'exclusion_A',
          isForfait: specialStatus === 'forfait_A',
        };
        const scoreBObj: Score = {
          value: sB,
          isVictory: winner === 'B',
          isAbstention: specialStatus === 'abandon_B',
          isExclusion: specialStatus === 'exclusion_B',
          isForfait: specialStatus === 'forfait_B',
        };
        const previousMatch = this.db.getMatch(matchId);
        this.db.updateMatch(matchId, {
          scoreA: scoreAObj,
          scoreB: scoreBObj,
          status: MatchStatus.FINISHED,
        });

        try {
          this.db.logScoreChange({
            matchId,
            previousScoreA: previousMatch?.scoreA ?? null,
            previousScoreB: previousMatch?.scoreB ?? null,
            newScoreA: scoreAObj,
            newScoreB: scoreBObj,
            changedBy: 'referee',
            reason: 'pool_remote_entry',
          });
        } catch { /* non bloquant */ }

        // Mettre à jour le score en mémoire (pour les matchs du renderer non persistés en DB)
        this.sessionMatchScores.set(matchId, {
          scoreA: scoreAObj,
          scoreB: scoreBObj,
          status: MatchStatus.FINISHED,
        });

        // Broadcaster la mise à jour vers toutes les vues /poule connectées
        const fencers = this.poolFencersCache.get(poolId) ?? this.db.getPoolFencers(poolId);
        const matches = (() => {
          const inMemory = this.sessionMatches
            .filter(m => (m.poolId || m.pool?.id || `pool-${m.poolNumber || m.number}`) === poolId)
            .sort((a: any, b: any) => (a.number || 0) - (b.number || 0));
          if (inMemory.length > 0) {
            return inMemory.map(m => {
              const update = this.sessionMatchScores.get(m.id);
              return update ? { ...m, ...update } : m;
            });
          }
          return this.db.getMatchesByPool(poolId);
        })();
        const isComplete = matches.every((m: any) => m.status === MatchStatus.FINISHED);
        for (const [aId, arena] of this.arenas) {
          if (arena.currentMatch?.poolId === poolId) {
            this.io
              .to(`pool:${aId}`)
              .emit(`pool:${aId}:update`, { poolId, fencers, matches, isComplete });
            break;
          }
        }

        // Notifier le renderer de la mise à jour du score (pour affichage dans le tableau poule)
        const mainWindow = (global as any).mainWindow;
        if (mainWindow) {
          mainWindow.webContents.send('match:finished', {
            matchId,
            scoreA: scoreAObj.value,
            scoreB: scoreBObj.value,
            poolId,
            isTableau: false,
          });
        }

        this.broadcastDashboardUpdate();
        res.json({ success: true, isComplete });
      } catch (err) {
        console.error('[RemoteScoreServer] Erreur score poule:', err);
        res.status(500).json({ error: 'Erreur enregistrement score' });
      }
    });

    // API pour récupérer les matchs d'une arène/poule
    this.app.get('/api/arenas/:arenaId/matches', (req, res) => {
      try {
        const { arenaId } = req.params;
        console.log(`[RemoteScoreServer] GET /api/arenas/${arenaId}/matches`);

        if (!this.session) {
          console.log('[RemoteScoreServer] Pas de session active');
          return res.status(404).json({ error: 'Aucune session active' });
        }

        const competitionId = this.session.competitionId;
        console.log(`[RemoteScoreServer] CompetitionId: ${competitionId}`);

        const arena = this.arenas.get(arenaId);

        // Si l'arène a un pool associé, retourner TOUS les matchs en attente du pool
        // (pas seulement le match courant) pour que l'arbitre voie les prochains matchs.
        const currentPoolId = arena?.currentMatch?.poolId;
        if (currentPoolId && this.sessionMatches.length > 0) {
          const rawPoolMatches = this.sessionMatches
            .filter((m: any) => {
              const matchPoolId = m.poolId || m.pool?.id || `pool-${m.poolNumber || m.number}`;
              return matchPoolId === currentPoolId;
            })
            .map((m: any) => {
              const scoreUpdate = this.sessionMatchScores.get(m.id);
              return scoreUpdate ? { ...m, ...scoreUpdate } : m;
            });
          const poolMatches = this.applySmartMatchOrder(rawPoolMatches as Match[]);
          console.log(
            `[RemoteScoreServer] ${poolMatches.length} matchs de pool pour arène ${arenaId} (pool ${currentPoolId})`
          );
          if (poolMatches.length > 0) {
            return res.json({ matches: poolMatches, poolId: currentPoolId, poolName: null });
          }
        }

        // Fallback: match courant seul
        if (arena?.currentMatch) {
          console.log(
            `[RemoteScoreServer] Fallback match courant pour arène ${arenaId}: ${arena.currentMatch.id}`
          );
          return res.json({
            matches: [
              {
                id: arena.currentMatch.id,
                poolId: arena.currentMatch.poolId,
                fencerA: arena.currentMatch.fencerA,
                fencerB: arena.currentMatch.fencerB,
                scoreA: arena.currentMatch.scoreA,
                scoreB: arena.currentMatch.scoreB,
                status: arena.currentMatch.status,
              },
            ],
            poolId: null,
            poolName: null,
          });
        }

        // File d'attente DE
        const arenaQueue = this.arenaMatchQueue.get(arenaId) || [];
        if (arenaQueue.length > 0) {
          console.log(
            `[RemoteScoreServer] ${arenaQueue.length} matchs en file DE pour arène ${arenaId}`
          );
          const queueMatches = arenaQueue.map(m => ({
            id: m.id,
            poolId: m.poolId,
            fencerA: m.fencerA,
            fencerB: m.fencerB,
            scoreA: m.scoreA ?? 0,
            scoreB: m.scoreB ?? 0,
            status: m.status,
          }));
          return res.json({ matches: queueMatches, poolId: null, poolName: null });
        }

        console.log(`[RemoteScoreServer] Aucun match disponible pour arène ${arenaId}`);
        res.json({ matches: [], poolId: null, poolName: null });
      } catch (error) {
        console.error('[RemoteScoreServer] Erreur récupération matchs:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des matchs' });
      }
    });

    // API pour terminer un match avec enregistrement final
    this.app.post('/api/matches/:matchId/finish', async (req, res) => {
      if (!this.hasAnyValidToken(req.headers.cookie)) {
        return res.status(401).json({ error: 'Non authentifié' });
      }
      try {
        const { matchId } = req.params;
        const { scoreA: rawA, scoreB: rawB, cardsA, cardsB } = req.body;

        const scoreA = Number(rawA);
        const scoreB = Number(rawB);
        if (
          !Number.isInteger(scoreA) ||
          !Number.isInteger(scoreB) ||
          scoreA < 0 ||
          scoreB < 0 ||
          scoreA > 50 ||
          scoreB > 50
        ) {
          return res.status(400).json({ error: 'Scores invalides (entiers entre 0 et 50)' });
        }

        console.log(`[RemoteScoreServer] POST /api/matches/${matchId}/finish`);
        console.log(`[RemoteScoreServer] Score final: ${scoreA}-${scoreB}`);

        // Vérifier que le match existe (en DB ou en mémoire)
        const dbMatch = this.db.getMatch(matchId);
        const inMemoryMatch = !dbMatch && this.sessionMatches.find((m: any) => m.id === matchId);
        if (!dbMatch && !inMemoryMatch) {
          return res.status(404).json({ error: 'Match non trouvé' });
        }

        // Déterminer le vainqueur
        const winner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : null;

        // Créer les objets Score
        const scoreAObj = {
          value: scoreA,
          isVictory: winner === 'A',
          isAbstention: false,
          isExclusion: false,
          isForfait: false,
        };

        const scoreBObj = {
          value: scoreB,
          isVictory: winner === 'B',
          isAbstention: false,
          isExclusion: false,
          isForfait: false,
        };

        if (dbMatch) {
          // Match persisté en DB : mise à jour directe
          this.db.updateMatch(matchId, {
            scoreA: scoreAObj,
            scoreB: scoreBObj,
            status: MatchStatus.FINISHED,
          });
          // Synchroniser sessionMatchScores pour que peekNextMatch/loadNextMatch
          // puisse filtrer ce match comme terminé (sinon il réapparaît comme "prochain")
          this.sessionMatchScores.set(matchId, {
            scoreA: scoreAObj,
            scoreB: scoreBObj,
            status: MatchStatus.FINISHED,
          });
          // Mettre à jour le score en mémoire de l'arène pour que le broadcast
          // finishArenaMatch envoie le vrai score (pas 0-0) à l'affichage
          for (const [, arena] of this.arenas) {
            if (arena.currentMatch && arena.currentMatch.id === matchId) {
              arena.currentMatch.scoreA = scoreA;
              arena.currentMatch.scoreB = scoreB;
              break;
            }
          }
        } else {
          // Match en mémoire uniquement (poule non persistée)
          // Synchroniser les scores dans l'arène et déclencher l'IPC vers le renderer
          this.sessionMatchScores.set(matchId, {
            scoreA: scoreAObj,
            scoreB: scoreBObj,
            status: MatchStatus.FINISHED,
          });
          // Mettre à jour les scores de l'arène puis terminer le match via l'IPC
          for (const [arenaId, arena] of this.arenas) {
            if (arena.currentMatch && arena.currentMatch.id === matchId) {
              arena.currentMatch.scoreA = scoreA;
              arena.currentMatch.scoreB = scoreB;
              this.finishArenaMatch(arenaId);
              break;
            }
          }
        }

        // Notifier tous les clients
        this.broadcastMessage({
          type: 'match_finished',
          data: {
            matchId,
            scoreA,
            scoreB,
            winner,
            cardsA: cardsA || [],
            cardsB: cardsB || [],
          },
          timestamp: new Date(),
          sender: 'server',
        });

        console.log(`[RemoteScoreServer] Match ${matchId} terminé et enregistré`);
        res.json({ success: true, winner });
      } catch (error) {
        console.error('[RemoteScoreServer] Erreur fin de match:', error);
        res.status(500).json({ error: 'Erreur lors de la fin du match' });
      }
    });

    this.app.get('/api/strips', (req, res) => {
      if (!this.session) {
        return res.status(404).json({ error: 'Aucune session active' });
      }
      res.json(this.session.strips);
    });

    this.app.post('/api/matches/:matchId/score', async (req, res) => {
      if (!this.hasAnyValidToken(req.headers.cookie)) {
        return res.status(401).json({ error: 'Non authentifié' });
      }
      try {
        const { matchId } = req.params;
        const scoreUpdate: RemoteScoreUpdate = req.body;
        // Validation des scores si présents dans le body
        if (scoreUpdate.scoreA !== undefined && scoreUpdate.scoreB !== undefined) {
          const sA = Number(scoreUpdate.scoreA);
          const sB = Number(scoreUpdate.scoreB);
          if (!Number.isInteger(sA) || !Number.isInteger(sB) || sA < 0 || sB < 0 || sA > 50 || sB > 50) {
            return res.status(400).json({ error: 'Scores invalides (entiers entre 0 et 50)' });
          }
        }

        // Mettre à jour le match dans la base de données
        await this.updateMatchScore(matchId, scoreUpdate);

        // Diffuser la mise à jour à tous les clients connectés
        this.broadcastMessage({
          type: 'score_update',
          data: { matchId, scoreUpdate },
          timestamp: new Date(),
          sender: 'server',
        });

        res.json({ success: true });
      } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du score' });
      }
    });

    // API : synchronisation des actions hors-ligne (tablettes arbitres)
    this.app.post('/api/sync', async (req, res) => {
      const actions: Array<{ id: string; type: string; payload: unknown }> =
        req.body?.actions || [];
      const results: Array<{ id: string; success: boolean }> = [];
      for (const action of actions) {
        try {
          if (action.type === 'score_save') {
            const p = action.payload as {
              matchId: string;
              scoreA: number;
              scoreB: number;
              status: string;
            };
            if (p?.matchId) {
              await this.updateMatchScore(p.matchId, {
                matchId: p.matchId,
                scoreA: p.scoreA,
                scoreB: p.scoreB,
                status: p.status as RemoteScoreUpdate['status'],
                timestamp: new Date(),
                refereeId: 'offline-sync',
              });
            }
          }
          // Les autres types d'actions (score_update, card, arena_exit) sont déjà broadcast
          // via Socket.IO en temps réel ; on les accepte sans traitement supplémentaire.
          results.push({ id: action.id, success: true });
        } catch (err) {
          console.error('[RemoteScoreServer] Erreur sync action', action.id, err);
          results.push({ id: action.id, success: false });
        }
      }
      res.json({ results });
    });

    // API : données de résultats d'une compétition (classements de poules)
    this.app.get('/api/competitions/:competitionId/results-data', (req, res) => {
      try {
        const { competitionId } = req.params;
        const competition = this.db.getCompetition(competitionId);
        if (!competition) {
          return res.status(404).json({ error: 'Compétition introuvable' });
        }

        // Priorité : lire les poules depuis le session_state (elles ne sont pas dans les tables SQL)
        const sessionState = this.db.getSessionState(competitionId);
        const sessionPools: any[] = sessionState?.pools || [];
        if (sessionPools.length > 0) {
          const poolResults = sessionPools.map((pool: any) => {
            const rankings = (pool.ranking || []).map((r: any) => ({
              id: r.fencer?.id ?? '',
              lastName: r.fencer?.lastName ?? '',
              firstName: r.fencer?.firstName ?? '',
              club: r.fencer?.club ?? '',
              matchesPlayed: r.matchesPlayed ?? 0,
              victories: r.victories ?? 0,
              touchesFor: r.touchesScored ?? 0,
              touchesAgainst: r.touchesReceived ?? 0,
              index: r.index ?? 0,
            }));
            return {
              id: pool.id,
              number: pool.number,
              name: 'Poule ' + pool.number,
              rankings,
            };
          });
          return res.json({
            competition: {
              id: competition.id,
              title: competition.title,
              date: competition.date,
              weapon: competition.weapon,
            },
            pools: poolResults,
          });
        }

        // Fallback : tables SQL (cas import/legacy)
        const pools = this.db.getCompetitionPools(competitionId);
        const poolResults = pools.map(pool => {
          const fencers = this.db.getPoolFencers(pool.id);
          const matches = this.db.getMatchesByPool(pool.id);

          // Calcul des statistiques par tireur
          const stats: Record<
            string,
            { matchesPlayed: number; victories: number; touchesFor: number; touchesAgainst: number }
          > = {};
          for (const f of fencers) {
            stats[f.id] = { matchesPlayed: 0, victories: 0, touchesFor: 0, touchesAgainst: 0 };
          }

          for (const match of matches) {
            if (match.status !== MatchStatus.FINISHED) continue;
            const sA = match.scoreA;
            const sB = match.scoreB;
            if (!sA || !sB || !match.fencerA || !match.fencerB) continue;
            const idA = match.fencerA.id;
            const idB = match.fencerB.id;
            if (stats[idA]) {
              stats[idA].matchesPlayed += 1;
              stats[idA].touchesFor += sA.value ?? 0;
              stats[idA].touchesAgainst += sB.value ?? 0;
              if (sA.isVictory) stats[idA].victories += 1;
            }
            if (stats[idB]) {
              stats[idB].matchesPlayed += 1;
              stats[idB].touchesFor += sB.value ?? 0;
              stats[idB].touchesAgainst += sA.value ?? 0;
              if (sB.isVictory) stats[idB].victories += 1;
            }
          }

          const rankings = fencers
            .map(f => ({
              id: f.id,
              lastName: f.lastName,
              firstName: f.firstName,
              club: f.club ?? '',
              matchesPlayed: stats[f.id]?.matchesPlayed ?? 0,
              victories: stats[f.id]?.victories ?? 0,
              touchesFor: stats[f.id]?.touchesFor ?? 0,
              touchesAgainst: stats[f.id]?.touchesAgainst ?? 0,
              index: (stats[f.id]?.touchesFor ?? 0) - (stats[f.id]?.touchesAgainst ?? 0),
            }))
            .sort(
              (a, b) =>
                b.victories - a.victories || b.index - a.index || b.touchesFor - a.touchesFor
            );

          return { id: pool.id, name: pool.name, rankings };
        });

        res.json({
          competition: {
            id: competition.id,
            title: competition.title,
            date: competition.date,
            weapon: competition.weapon,
          },
          pools: poolResults,
        });
      } catch (error) {
        console.error('[RemoteScoreServer] Erreur résultats:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des résultats' });
      }
    });

    // API : matchs à venir dans l'ordre de passage (kiosk vue suivants)
    this.app.get('/api/session/upcoming-matches', (req, res) => {
      if (!this.session) {
        return res.status(404).json({ error: 'Aucune session active' });
      }
      try {
        // Construire un index des matchs actuellement sur une piste
        const arenaByMatchId = new Map<string, string>();
        for (const [, arena] of this.arenas) {
          if (arena.currentMatch?.id) {
            arenaByMatchId.set(arena.currentMatch.id, arena.name);
          }
        }

        const upcoming: any[] = [];

        // Priorité : session_state (pools du renderer avec leurs matchs)
        const sessionState = this.db.getSessionState(this.session.competitionId);
        const sessionPools: any[] = sessionState?.pools || [];

        if (sessionPools.length > 0) {
          for (const pool of sessionPools) {
            const poolName = 'Poule ' + pool.number;
            const matches: any[] = (pool.matches || [])
              .filter((m: any) => m.status !== MatchStatus.FINISHED && m.status !== 'finished')
              .sort((a: any, b: any) => (a.number || 0) - (b.number || 0));
            for (const m of matches) {
              upcoming.push({
                id: m.id,
                number: m.number,
                poolName,
                poolNumber: pool.number,
                fencerA: m.fencerA
                  ? { lastName: m.fencerA.lastName, firstName: m.fencerA.firstName, club: m.fencerA.club ?? '' }
                  : null,
                fencerB: m.fencerB
                  ? { lastName: m.fencerB.lastName, firstName: m.fencerB.firstName, club: m.fencerB.club ?? '' }
                  : null,
                status: m.status,
                arenaName: arenaByMatchId.get(m.id) ?? null,
              });
            }
          }
        } else if (this.sessionMatches.length > 0) {
          // Fallback : matchs en mémoire passés depuis le renderer
          const pending = (this.sessionMatches as any[])
            .filter((m: any) => m.status !== MatchStatus.FINISHED && m.status !== 'finished')
            .sort((a: any, b: any) => {
              const pA = a.poolNumber ?? parseInt(String(a.poolId || '').replace(/\D/g, '') || '0', 10);
              const pB = b.poolNumber ?? parseInt(String(b.poolId || '').replace(/\D/g, '') || '0', 10);
              return pA !== pB ? pA - pB : (a.number || 0) - (b.number || 0);
            });
          for (const m of pending) {
            const poolNum = m.poolNumber ?? parseInt(String(m.poolId || '').replace(/\D/g, '') || '0', 10);
            upcoming.push({
              id: m.id,
              number: m.number,
              poolName: 'Poule ' + (poolNum || '?'),
              poolNumber: poolNum,
              fencerA: m.fencerA
                ? { lastName: m.fencerA.lastName, firstName: m.fencerA.firstName, club: m.fencerA.club ?? '' }
                : null,
              fencerB: m.fencerB
                ? { lastName: m.fencerB.lastName, firstName: m.fencerB.firstName, club: m.fencerB.club ?? '' }
                : null,
              status: m.status,
              arenaName: arenaByMatchId.get(m.id) ?? null,
            });
          }
        }

        res.json({ upcoming });
      } catch (error) {
        console.error('[RemoteScoreServer] Erreur upcoming-matches:', error);
        res.status(500).json({ error: 'Erreur interne' });
      }
    });

    // Page HTML : résultats d'une compétition (pour les spectateurs)
    this.app.get('/competition/:competitionId/results', (req, res) => {
      const { competitionId } = req.params;
      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Résultats – BellePoule</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; padding: 1rem; }
    header { text-align: center; padding: 1.5rem 0 1rem; }
    header h1 { font-size: 1.5rem; color: #f8fafc; }
    header p { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
    .pool { background: #1e293b; border-radius: 10px; margin: 1rem 0; overflow: hidden; }
    .pool-title { background: #3b82f6; color: white; padding: 0.6rem 1rem; font-weight: 600; font-size: 0.95rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #0f172a; color: #94a3b8; padding: 0.5rem 0.75rem; text-align: left; font-weight: 500; }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #334155; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
    .rank { color: #94a3b8; width: 2rem; }
    .name { font-weight: 600; }
    .club { color: #94a3b8; font-size: 0.8rem; }
    .num { text-align: center; }
    .pos { color: #4ade80; }
    .neg { color: #f87171; }
    .loading { text-align: center; padding: 3rem; color: #94a3b8; }
    .error { background: #450a0a; color: #fca5a5; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
    .refresh { position: fixed; bottom: 1rem; right: 1rem; background: #3b82f6; color: white;
      border: none; border-radius: 50%; width: 3rem; height: 3rem; font-size: 1.2rem;
      cursor: pointer; box-shadow: 0 4px 12px rgba(59,130,246,0.4); }
  </style>
</head>
<body>
  <div id="app"><div class="loading">Chargement des résultats…</div></div>
  <button class="refresh" onclick="load()" title="Actualiser">↻</button>
  <script>
    const competitionId = ${JSON.stringify(competitionId)};
    async function load() {
      try {
        const r = await fetch('/api/competitions/' + competitionId + '/results-data');
        if (!r.ok) throw new Error('Compétition introuvable');
        const data = await r.json();
        render(data);
      } catch(e) {
        document.getElementById('app').innerHTML = '<div class="error">Erreur : ' + e.message + '</div>';
      }
    }
    function render(data) {
      const dateStr = data.competition.date
        ? new Date(data.competition.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';
      let html = '<header><h1>' + escHtml(data.competition.title) + '</h1>' +
        (dateStr ? '<p>' + dateStr + '</p>' : '') + '</header>';
      if (!data.pools || data.pools.length === 0) {
        html += '<p style="text-align:center;color:#94a3b8;padding:2rem">Aucune poule disponible</p>';
      } else {
        for (const pool of data.pools) {
          html += '<div class="pool"><div class="pool-title">' + escHtml(pool.name) + '</div><table>' +
            '<thead><tr><th class="rank">#</th><th>Tireur</th>' +
            '<th class="num">V</th><th class="num">TD</th><th class="num">TR</th><th class="num">Ind.</th></tr></thead><tbody>';
          pool.rankings.forEach((f, i) => {
            const ind = f.index >= 0 ? '+' + f.index : '' + f.index;
            const cls = f.index > 0 ? 'pos' : f.index < 0 ? 'neg' : '';
            html += '<tr><td class="rank">' + (i+1) + '</td>' +
              '<td><span class="name">' + escHtml(f.lastName.toUpperCase()) + ' ' + escHtml(f.firstName) + '</span>' +
              (f.club ? ' <span class="club">(' + escHtml(f.club) + ')</span>' : '') + '</td>' +
              '<td class="num">' + f.victories + '</td>' +
              '<td class="num">' + f.touchesFor + '</td>' +
              '<td class="num">' + f.touchesAgainst + '</td>' +
              '<td class="num ' + cls + '">' + ind + '</td></tr>';
          });
          html += '</tbody></table></div>';
        }
      }
      document.getElementById('app').innerHTML = html;
    }
    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    load();
    setInterval(load, 30000);
  </script>
</body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: any) => {
      console.log('Client connected:', socket.id);

      // Gestion des arènes
      socket.on('join_arena', (data: { arenaId: string; role?: string; lastSeen?: number }) => {
        console.log(
          `Client ${socket.id} joining arena ${data.arenaId} as ${data.role || 'spectator'}`
        );
        if (data.role === 'referee') {
          if (!this.checkArenaAuth(data.arenaId, socket.handshake.headers.cookie as string)) {
            socket.emit('auth_error', { message: 'Authentification requise' });
            socket.disconnect(true);
            return;
          }
        }
        socket.join(`arena:${data.arenaId}`);

        const arena = this.getArena(data.arenaId);
        if (arena) {
          const override = this.arenaThemeOverrides.get(data.arenaId);

          // Replay des événements manqués si lastSeen fourni
          if (data.lastSeen && data.lastSeen > 0) {
            const buf = this.arenaEventBuffer.get(data.arenaId) ?? [];
            const missed = buf.filter(e => e.timestamp > data.lastSeen!);
            if (missed.length > 0) {
              socket.emit(`arena:${data.arenaId}:replay`, {
                events: missed.map(e => e.event),
              });
              return; // pas besoin d'envoyer l'état courant séparément
            }
          }

          // Sinon : état courant complet
          socket.emit(`arena:${data.arenaId}:update`, {
            arenaId: data.arenaId,
            match: arena.currentMatch,
            scoreA: arena.currentMatch?.scoreA,
            scoreB: arena.currentMatch?.scoreB,
            status: arena.status,
            showPhotos: this.sessionShowPhotos,
            theme: override?.theme ?? this.sessionTheme,
            customTheme: override?.customTheme,
            fencerA: arena.currentMatch?.fencerA,
            fencerB: arena.currentMatch?.fencerB,
            ...(arena.status === 'finished' && {
              nextMatch: this.peekNextMatch(data.arenaId),
            }),
          });
        }
      });

      socket.on('join_pool', (data: { arenaId: string }) => {
        socket.join(`pool:${data.arenaId}`);
      });

      socket.on('dashboard:subscribe', () => {
        socket.join('dashboard');
        // Envoyer l'état courant immédiatement
        const snapshot = this.buildDashboardSnapshot();
        if (snapshot) {
          socket.emit('rankings:update', { rankings: snapshot.rankings });
          socket.emit('pools:update', { pools: snapshot.pools });
          socket.emit('matches:update', { matches: snapshot.liveMatches });
        }
      });

      socket.on(
        'arena_control',
        (data: { arenaId: string; action: string; scoreA?: number; scoreB?: number }) => {
          this.handleArenaControl(socket, data);
        }
      );

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.handleDisconnect(socket);
      });
    });
  }

  private handleDisconnect(socket: any): void {
    console.log(`Client ${socket.id} disconnected`);
  }

  // Stockage des cartons par arène
  private arenaCards: Map<string, { cardsA: string[]; cardsB: string[] }> = new Map();
  private arenaSuddenDeath: Map<string, boolean> = new Map();
  // Debounce par socket pour update_score : clé = socketId:arenaId, valeur = timestamp dernier envoi
  private scoreUpdateDebounce: Map<string, number> = new Map();
  private readonly SCORE_UPDATE_DEBOUNCE_MS = 200;

  private handleArenaControl(
    socket: any,
    data: {
      arenaId: string;
      action: string;
      match?: ArenaMatch;
      scoreA?: number;
      scoreB?: number;
      time?: number;
      timerStatus?: 'running' | 'paused' | 'reset';
      fencer?: 'A' | 'B';
      cardType?: 'white' | 'yellow' | 'red';
      cardsA?: string[];
      cardsB?: string[];
      suddenDeath?: boolean;
    }
  ): void {
    const arena = this.getArena(data.arenaId);
    if (!arena) {
      socket.emit('error', { message: 'Arène non trouvée' });
      return;
    }

    switch (data.action) {
      case 'select_match':
        // Sélection d'un match par l'arbitre
        if (data.match) {
          const m = data.match;
          this.assignMatchToArena(data.arenaId, {
            ...m,
            scoreA:
              typeof (m.scoreA as unknown) === 'object'
                ? ((m.scoreA as unknown as { value?: number })?.value ?? 0)
                : (m.scoreA ?? 0),
            scoreB:
              typeof (m.scoreB as unknown) === 'object'
                ? ((m.scoreB as unknown as { value?: number })?.value ?? 0)
                : (m.scoreB ?? 0),
          });
          // Réinitialiser les cartons
          this.arenaCards.set(data.arenaId, { cardsA: [], cardsB: [] });
        }
        break;
      case 'start':
        this.startArenaMatch(data.arenaId);
        break;
      case 'pause':
        this.pauseArenaMatch(data.arenaId);
        break;
      case 'finish':
        this.finishArenaMatch(data.arenaId);
        // Réinitialiser les cartons
        this.arenaCards.set(data.arenaId, { cardsA: [], cardsB: [] });
        break;
      case 'next':
        this.loadNextMatch(data.arenaId);
        // Réinitialiser les cartons
        this.arenaCards.set(data.arenaId, { cardsA: [], cardsB: [] });
        break;
      case 'update_score': {
        const debounceKey = `${socket.id}:${data.arenaId}`;
        const lastUpdate = this.scoreUpdateDebounce.get(debounceKey) ?? 0;
        if (Date.now() - lastUpdate < this.SCORE_UPDATE_DEBOUNCE_MS) break;
        this.scoreUpdateDebounce.set(debounceKey, Date.now());
        if (data.scoreA !== undefined && data.scoreB !== undefined) {
          if (data.suddenDeath !== undefined) {
            this.arenaSuddenDeath.set(data.arenaId, data.suddenDeath);
          }
          this.updateArenaScore(data.arenaId, data.scoreA, data.scoreB);
        }
        // Mettre à jour aussi les cartons si fournis
        if (data.cardsA !== undefined || data.cardsB !== undefined) {
          const currentCards = this.arenaCards.get(data.arenaId) || { cardsA: [], cardsB: [] };
          if (data.cardsA !== undefined) currentCards.cardsA = data.cardsA;
          if (data.cardsB !== undefined) currentCards.cardsB = data.cardsB;
          this.arenaCards.set(data.arenaId, currentCards);
          this.broadcastArenaUpdate(data.arenaId, {
            arenaId: data.arenaId,
            match: arena.currentMatch,
            scoreA: data.scoreA ?? arena.currentMatch?.scoreA,
            scoreB: data.scoreB ?? arena.currentMatch?.scoreB,
            cardsA: currentCards.cardsA,
            cardsB: currentCards.cardsB,
            suddenDeath: this.arenaSuddenDeath.get(data.arenaId) ?? false,
            status: arena.status,
          });
        }
        break;
      }
      case 'add_card':
        // Gestion des cartons
        if (data.fencer && data.cardType) {
          const currentCards = this.arenaCards.get(data.arenaId) || { cardsA: [], cardsB: [] };
          const targetCards = data.fencer === 'A' ? currentCards.cardsA : currentCards.cardsB;
          targetCards.push(data.cardType);
          this.arenaCards.set(data.arenaId, currentCards);
          this.broadcastArenaUpdate(data.arenaId, {
            arenaId: data.arenaId,
            match: arena.currentMatch,
            scoreA: arena.currentMatch?.scoreA,
            scoreB: arena.currentMatch?.scoreB,
            cardsA: currentCards.cardsA,
            cardsB: currentCards.cardsB,
            status: arena.status,
          });
        }
        break;
      case 'reset_scores':
        if (arena.currentMatch) {
          this.arenaSuddenDeath.set(data.arenaId, false);
          this.updateArenaScore(data.arenaId, 0, 0);
          // Réinitialiser les cartons
          this.arenaCards.set(data.arenaId, { cardsA: [], cardsB: [] });
          this.broadcastArenaUpdate(data.arenaId, {
            arenaId: data.arenaId,
            match: arena.currentMatch,
            scoreA: 0,
            scoreB: 0,
            cardsA: [],
            cardsB: [],
            suddenDeath: false,
            status: arena.status,
          });
        }
        break;
      case 'update_timer':
      case 'pause_timer':
      case 'reset_timer':
        // Relay timer updates to arena display
        this.broadcastArenaUpdate(data.arenaId, {
          arenaId: data.arenaId,
          match: arena.currentMatch,
          time: data.time,
          timerStatus: data.timerStatus,
          suddenDeath: data.suddenDeath ?? false,
          status: arena.status,
        });
        break;
      default:
        socket.emit('error', { message: 'Action non reconnue' });
    }
  }

  private async createSession(competitionId: string, strips: number): Promise<RemoteSession> {
    console.log(
      `[RemoteScoreServer] Création d'une session pour la compétition ${competitionId} avec ${strips} pistes...`
    );

    const competition = this.db.getCompetition(competitionId);
    if (!competition) {
      console.error(`[RemoteScoreServer] ERREUR: Compétition ${competitionId} non trouvée`);
      throw new Error('Compétition non trouvée');
    }
    console.log(`[RemoteScoreServer] Compétition trouvée: ${competition.title}`);

    // Le nombre de pistes est déjà défini côté client en fonction du nombre de poules
    // On l'utilise directement pour configurer les arènes
    console.log(`[RemoteScoreServer] Configuration du nombre d'arènes: ${strips}`);
    this.setArenaCount(strips);

    // Récupérer les matchs en attente et les assigner aux arènes
    const pendingMatches = this.db.getPendingMatches(competitionId);
    console.log(`[RemoteScoreServer] ${pendingMatches.length} matchs en attente trouvés`);

    // Assigner les matchs en attente aux arènes
    pendingMatches.slice(0, strips).forEach((match, index) => {
      const arenaId = `arena${index + 1}`;
      const arenaMatch: ArenaMatch = {
        id: match.id,
        poolId: match.poolId || '',
        fencerA: match.fencerA!,
        fencerB: match.fencerB!,
        scoreA: match.scoreA?.value ?? 0,
        scoreB: match.scoreB?.value ?? 0,
        status: match.status === 'in_progress' ? 'in_progress' : 'pending',
        startTime: match.status === 'in_progress' ? new Date() : null,
        endTime: null,
      };
      this.assignMatchToArena(arenaId, arenaMatch);
      console.log(`[RemoteScoreServer] Match ${match.id} assigné à l'arène ${arenaId}`);
    });

    const session: RemoteSession = {
      competitionId,
      strips: Array.from({ length: strips }, (_, i) => ({
        number: i + 1,
        status: pendingMatches[i] ? 'occupied' : 'available',
      })),
      referees: [],
      activeMatches: [],
      isRunning: true,
      startTime: new Date(),
    };

    console.log(`[RemoteScoreServer] Session créée avec succès ✓`);
    console.log(
      `[RemoteScoreServer] Détails: ${strips} pistes, ${session.referees.length} arbitres`
    );
    return session;
  }

  private applySmartMatchOrder(matches: Match[]): Match[] {
    const pending = matches.filter(m => m.status !== MatchStatus.FINISHED);
    const finished = matches.filter(m => m.status === MatchStatus.FINISHED);

    if (pending.length === 0) return matches;

    const ordered: Match[] = [];
    const remaining = [...pending];
    let lastFencerIds: Set<string> = new Set();

    if (finished.length > 0) {
      const lastMatch = finished[finished.length - 1];
      if (lastMatch.fencerA) lastFencerIds.add(lastMatch.fencerA.id);
      if (lastMatch.fencerB) lastFencerIds.add(lastMatch.fencerB.id);
    }

    while (remaining.length > 0) {
      let bestIdx = -1;
      let bestScore = -1;

      for (let i = 0; i < remaining.length; i++) {
        const match = remaining[i];
        let score = 0;
        if (!lastFencerIds.has(match.fencerA?.id || '')) score++;
        if (!lastFencerIds.has(match.fencerB?.id || '')) score++;

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
        if (score === 2) break;
      }

      const chosen = remaining.splice(bestIdx >= 0 ? bestIdx : 0, 1)[0];
      ordered.push(chosen);

      lastFencerIds = new Set();
      if (chosen.fencerA) lastFencerIds.add(chosen.fencerA.id);
      if (chosen.fencerB) lastFencerIds.add(chosen.fencerB.id);
    }

    return [...finished, ...ordered];
  }

  private async updateMatchScore(matchId: string, update: RemoteScoreUpdate): Promise<void> {
    const scoreA: Score = {
      value: update.scoreA,
      isVictory: update.winner === 'A',
      isAbstention: update.specialStatus === 'abandon' && update.winner !== 'A',
      isExclusion: update.specialStatus === 'exclusion' && update.winner !== 'A',
      isForfait: update.specialStatus === 'forfait' && update.winner !== 'A',
    };

    const scoreB: Score = {
      value: update.scoreB,
      isVictory: update.winner === 'B',
      isAbstention: update.specialStatus === 'abandon' && update.winner !== 'B',
      isExclusion: update.specialStatus === 'exclusion' && update.winner !== 'B',
      isForfait: update.specialStatus === 'forfait' && update.winner !== 'B',
    };

    const dbMatch = this.db.getMatch(matchId);
    if (dbMatch) {
      // Match en base de données : mise à jour directe
      this.db.updateMatch(matchId, {
        scoreA,
        scoreB,
        status: update.status === 'finished' ? MatchStatus.FINISHED : MatchStatus.IN_PROGRESS,
      });
    } else {
      // Match en mémoire uniquement (poule non persistée) : mettre à jour via Socket.IO
      const inMemory = this.sessionMatches.find((m: any) => m.id === matchId);
      if (!inMemory) {
        throw new Error('Match non trouvé');
      }
      // Synchroniser les scores dans l'arène en mémoire
      for (const [arenaId, arena] of this.arenas) {
        if (arena.currentMatch?.id === matchId) {
          this.updateArenaScore(arenaId, update.scoreA, update.scoreB);
          break;
        }
      }
      // Stocker dans sessionMatchScores pour cohérence
      this.sessionMatchScores.set(matchId, {
        scoreA,
        scoreB,
        status: update.status === 'finished' ? MatchStatus.FINISHED : MatchStatus.IN_PROGRESS,
      });
    }
  }

  private broadcastMessage(message: WebSocketMessage): void {
    // Envoyer à la fenêtre principale
    if ((global as any).mainWindow) {
      (global as any).mainWindow.webContents.send('remote:websocket_message', message);
    }
  }

  private initializeArenas(arenaCount: number = 4): void {
    this.arenaCount = arenaCount;
    console.log(`[RemoteScoreServer] Initialisation de ${arenaCount} arènes...`);
    // Sauvegarder les mots de passe avant de vider la map
    const savedPasswords = new Map<string, string>();
    this.arenas.forEach((arena, id) => {
      if (arena.password) savedPasswords.set(id, arena.password);
    });
    this.arenas.clear();

    for (let i = 1; i <= arenaCount; i++) {
      const arena: Arena = {
        id: `arena${i}`,
        name: `Arène ${i}`,
        number: i,
        currentMatch: null,
        status: 'idle',
        startTime: null,
        settings: {
          matchDuration: 180, // 3 minutes par défaut
          breakDuration: 30, // 30 secondes entre les matchs
          autoAdvance: false,
        },
      };
      this.arenas.set(arena.id, arena);
      this.arenaMatchQueue.set(arena.id, []);
      console.log(`[RemoteScoreServer] Arène ${i} créée ✓`);
    }
    // Restaurer les mots de passe sauvegardés
    savedPasswords.forEach((pwd, id) => {
      const arena = this.arenas.get(id);
      if (arena) arena.password = pwd;
    });
    console.log(`[RemoteScoreServer] ${arenaCount} arènes initialisées avec succès ✓`);
  }

  // Méthode publique pour mettre à jour le nombre d'arènes
  public setLanguage(lang: string): void {
    this.currentLang = lang;
  }

  public setArenaCount(count: number): void {
    console.log(`[RemoteScoreServer] Mise à jour du nombre d'arènes: ${count}`);
    this.initializeArenas(count);
  }

  public getArenaCount(): number {
    return this.arenaCount;
  }

  // Méthodes publiques pour les arènes
  public getArena(arenaId: string): Arena | null {
    return this.arenas.get(arenaId) || null;
  }

  public getAllArenas(): Arena[] {
    return Array.from(this.arenas.values());
  }

  public updateArena(arenaId: string, update: Partial<Arena>): void {
    const arena = this.arenas.get(arenaId);
    if (!arena) return;

    Object.assign(arena, update);

    // Diffuser la mise à jour via WebSocket
    this.broadcastArenaUpdate(arenaId, {
      arenaId,
      match: arena.currentMatch,
      scoreA: arena.currentMatch?.scoreA,
      scoreB: arena.currentMatch?.scoreB,
      status: arena.status,
      fencerA: arena.currentMatch?.fencerA,
      fencerB: arena.currentMatch?.fencerB,
    });
  }

  public assignMatchToArena(arenaId: string, match: ArenaMatch): void {
    console.log(
      `[RemoteScoreServer] assignMatchToArena called: arenaId=${arenaId}, matchId=${match.id}`
    );
    const arena = this.arenas.get(arenaId);
    if (!arena) {
      console.error(`[RemoteScoreServer] ERREUR: Arène ${arenaId} n'existe pas!`);
      return;
    }

    arena.currentMatch = match;
    arena.status = 'ready';

    this.updateArena(arenaId, {
      status: 'ready',
      currentMatch: match,
    });

    this.persistArenaState(arenaId);
    console.log(`[RemoteScoreServer] Match assigné avec succès à l'arène ${arenaId}`);
  }

  public updateMatchArena(
    matchId: string,
    fromArena: number | null,
    toArena: number | null,
    fencerA?: any,
    fencerB?: any
  ): void {
    let matchToMove: ArenaMatch | undefined;

    // 1. Retirer le match de TOUTES les arènes (files et currentMatch non démarré).
    //    startSession distribue les matchs DE en round-robin, donc le match peut se
    //    trouver dans n'importe quelle arène même si fromArena est null.
    for (const [arenaId, arena] of this.arenas) {
      // Chercher et supprimer tous les doublons dans les files d'attente
      const queue = this.arenaMatchQueue.get(arenaId) || [];
      const filtered = queue.filter(m => m.id !== matchId);
      if (filtered.length < queue.length) {
        // Au moins une occurrence trouvée dans cette file
        if (!matchToMove) matchToMove = queue.find(m => m.id === matchId);
        this.arenaMatchQueue.set(arenaId, filtered);
      }

      // Chercher dans le currentMatch (seulement si non démarré, on ne peut pas
      // retirer un match en cours)
      if (arena.currentMatch?.id === matchId && arena.currentMatch.status !== 'in_progress') {
        if (!matchToMove) matchToMove = arena.currentMatch;
        // Promouvoir le premier match en file comme nouveau currentMatch
        const nextInQueue = this.arenaMatchQueue.get(arenaId) || [];
        if (nextInQueue.length > 0) {
          arena.currentMatch = nextInQueue[0];
          arena.status = 'ready';
          this.arenaMatchQueue.set(arenaId, nextInQueue.slice(1));
          this.updateArena(arenaId, { status: 'ready', currentMatch: arena.currentMatch });
        } else {
          arena.currentMatch = null;
          arena.status = 'idle';
          this.updateArena(arenaId, { status: 'idle', currentMatch: null });
        }
      }
    }

    // Si le match n'est dans aucune arène, le construire depuis sessionMatches ou les données passées
    if (!matchToMove) {
      const sm = this.sessionMatches.find((m: any) => m.id === matchId);
      if (sm) {
        matchToMove = {
          id: sm.id,
          fencerA: sm.fencerA,
          fencerB: sm.fencerB,
          scoreA: 0,
          scoreB: 0,
          status: 'not_started',
          startTime: null,
          endTime: null,
          isTableau: true,
        };
      } else if (fencerA && fencerB) {
        // Match DE non encore en session (ex: session de poule toujours active) → créer depuis les données passées
        matchToMove = {
          id: matchId,
          fencerA,
          fencerB,
          scoreA: 0,
          scoreB: 0,
          status: 'not_started',
          startTime: null,
          endTime: null,
          isTableau: true,
        };
        this.sessionMatches.push({
          id: matchId,
          fencerA,
          fencerB,
          isTableau: true,
          status: 'not_started',
        } as any);
        console.log(
          `[RemoteScoreServer] Match DE ${matchId} ajouté à sessionMatches depuis updateMatchArena`
        );
      }
    }

    if (!matchToMove || !toArena) return;

    // 2. Ajouter à la nouvelle arène
    const toArenaId = `arena${toArena}`;
    const toArenaObj = this.arenas.get(toArenaId);
    if (!toArenaObj) return;

    if (!toArenaObj.currentMatch) {
      // Arène libre → le match devient le currentMatch visible immédiatement
      this.assignMatchToArena(toArenaId, matchToMove);
    } else if (toArenaObj.currentMatch.status !== 'in_progress') {
      // currentMatch non démarré → le déplacer en tête de file, afficher le nouveau
      const displaced = toArenaObj.currentMatch;
      const toQueue = this.arenaMatchQueue.get(toArenaId) || [];
      this.arenaMatchQueue.set(toArenaId, [displaced, ...toQueue]);
      this.assignMatchToArena(toArenaId, matchToMove);
    } else {
      // Match en cours → ajouter en fin de file
      const toQueue = this.arenaMatchQueue.get(toArenaId) || [];
      this.arenaMatchQueue.set(toArenaId, [...toQueue, matchToMove]);
      this.updateArena(toArenaId, { status: toArenaObj.status });
    }

    console.log(`[RemoteScoreServer] Match ${matchId} assigné à arena${toArena}`);
  }

  public startArenaMatch(arenaId: string): void {
    const arena = this.arenas.get(arenaId);
    if (!arena || !arena.currentMatch) return;

    arena.status = 'in_progress';
    arena.startTime = new Date();
    arena.currentMatch.status = 'in_progress';
    arena.currentMatch.startTime = new Date();

    this.updateArena(arenaId, {
      status: 'in_progress',
      startTime: arena.startTime,
      currentMatch: arena.currentMatch,
    });
    this.persistArenaState(arenaId);
  }

  public pauseArenaMatch(arenaId: string): void {
    const arena = this.arenas.get(arenaId);
    if (!arena) return;

    arena.status = 'ready';

    this.updateArena(arenaId, { status: 'ready' });
  }

  public updateArenaScore(arenaId: string, scoreA: number, scoreB: number): void {
    const arena = this.arenas.get(arenaId);
    if (!arena || !arena.currentMatch) return;

    // Ignorer si le match est terminé
    if (arena.status === 'finished' || arena.currentMatch.status === 'finished') {
      console.log(
        `[RemoteScoreServer] Match terminé, mise à jour du score ignorée pour arène ${arenaId}`
      );
      return;
    }

    const previousScoreA = arena.currentMatch.scoreA;
    const previousScoreB = arena.currentMatch.scoreB;

    arena.currentMatch.scoreA = scoreA;
    arena.currentMatch.scoreB = scoreB;

    // Audit trail si le match est en DB
    try {
      const matchId = arena.currentMatch.id;
      if (this.db.getMatch(matchId)) {
        this.db.logScoreChange({
          matchId,
          arenaId,
          previousScoreA: { value: previousScoreA },
          previousScoreB: { value: previousScoreB },
          newScoreA: { value: scoreA },
          newScoreB: { value: scoreB },
          changedBy: 'referee',
          reason: 'remote_entry',
        });
      }
    } catch { /* non bloquant */ }

    // Envoyer la mise à jour via WebSocket
    this.broadcastArenaUpdate(arenaId, {
      arenaId,
      match: arena.currentMatch,
      scoreA,
      scoreB,
      suddenDeath: this.arenaSuddenDeath.get(arenaId) ?? false,
      status: arena.status,
    });

    // Vérifier si le match doit s'arrêter automatiquement en Laser Sabre
    this.checkAndAutoFinishMatch(arenaId, scoreA, scoreB, previousScoreA, previousScoreB);
  }

  private checkAndAutoFinishMatch(
    arenaId: string,
    scoreA: number,
    scoreB: number,
    previousScoreA: number,
    previousScoreB: number
  ): void {
    const arena = this.arenas.get(arenaId);
    if (!arena || arena.status === 'finished' || !arena.currentMatch) return;

    // Notifier la tablette arbitre uniquement quand un tireur franchit le seuil de 15 points
    const SCORE_LIMIT = 15;
    const justCrossed =
      (scoreA >= SCORE_LIMIT && previousScoreA < SCORE_LIMIT) ||
      (scoreB >= SCORE_LIMIT && previousScoreB < SCORE_LIMIT);
    if (justCrossed) {
      console.log(
        `[RemoteScoreServer] Score limite (${SCORE_LIMIT}) atteint - notification arbitre pour l'arène ${arenaId}`
      );
      this.io.to(`arena:${arenaId}`).emit(`arena:${arenaId}:score_limit_reached`);
    }
  }

  public finishArenaMatch(arenaId: string): void {
    const arena = this.arenas.get(arenaId);
    if (!arena || !arena.currentMatch) return;
    // Éviter le double-déclenchement (REST + Socket.IO)
    if (arena.status === 'finished') return;

    const finishedMatch = { ...arena.currentMatch };

    arena.status = 'finished';
    arena.currentMatch.status = 'finished';
    arena.currentMatch.endTime = new Date();

    if (arena.startTime) {
      arena.currentMatch.duration = Math.floor(
        (new Date().getTime() - arena.startTime.getTime()) / 1000
      );
    }

    const nextMatch = this.peekNextMatch(arenaId);

    // Mettre à jour l'état en mémoire sans broadcaster (on fait le broadcast manuellement
    // pour pouvoir inclure nextMatch, absent de Arena)
    const arenaRef = this.arenas.get(arenaId)!;
    Object.assign(arenaRef, { status: 'finished', currentMatch: arena.currentMatch });

    this.broadcastArenaUpdate(arenaId, {
      arenaId,
      match: arena.currentMatch,
      scoreA: arena.currentMatch?.scoreA,
      scoreB: arena.currentMatch?.scoreB,
      status: 'finished',
      fencerA: arena.currentMatch?.fencerA,
      fencerB: arena.currentMatch?.fencerB,
      nextMatch,
    });

    // Émettre l'event pour le renderer (pour sauvegarder le score dans les pools)
    const mainWindow = (global as any).mainWindow;
    if (mainWindow) {
      mainWindow.webContents.send('match:finished', {
        matchId: finishedMatch.id,
        scoreA: finishedMatch.scoreA,
        scoreB: finishedMatch.scoreB,
        poolId: finishedMatch.poolId,
        isTableau: finishedMatch.isTableau ?? false,
      });
      console.log(
        `[RemoteScoreServer] Émission match:finished pour ${finishedMatch.id}: ${finishedMatch.scoreA}-${finishedMatch.scoreB}`
      );
    }

    this.persistArenaState(arenaId);
    this.broadcastDashboardUpdate();

    // Charger automatiquement le prochain match après un délai
    // (loadNextMatch gère aussi le cas "plus de matchs" → arène idle)
    setTimeout(() => {
      const a = this.arenas.get(arenaId);
      if (a && a.status === 'finished') {
        this.loadNextMatch(arenaId);
      }
    }, 3000);
  }

  private peekNextMatch(arenaId: string): ArenaMatch | null {
    const arena = this.arenas.get(arenaId);
    if (!arena || !this.session) return null;

    const currentMatchId = arena.currentMatch?.id;
    const currentPoolId = arena.currentMatch?.poolId;

    if (currentPoolId && this.sessionMatches.length > 0) {
      const rawPoolMatches = this.sessionMatches
        .filter((m: any) => {
          const matchPoolId = m.poolId || m.pool?.id || `pool-${m.poolNumber || m.number}`;
          return matchPoolId === currentPoolId;
        })
        .map((m: any) => {
          const scoreUpdate = this.sessionMatchScores.get(m.id);
          return scoreUpdate ? { ...m, ...scoreUpdate } : m;
        });
      const poolMatches = this.applySmartMatchOrder(rawPoolMatches as Match[]).filter(
        m => m.status !== MatchStatus.FINISHED
      );
      const nextMatch = poolMatches.find(m => m.id !== currentMatchId);
      if (nextMatch) {
        return {
          id: nextMatch.id,
          poolId: currentPoolId,
          fencerA: nextMatch.fencerA!,
          fencerB: nextMatch.fencerB!,
          scoreA: 0,
          scoreB: 0,
          status: 'not_started',
          startTime: null,
          endTime: null,
        };
      }
    }

    const deQueue = this.arenaMatchQueue.get(arenaId) || [];
    if (deQueue.length > 0) return deQueue[0];

    return null;
  }

  private loadNextMatch(arenaId: string): void {
    const arena = this.arenas.get(arenaId);
    if (!arena || !this.session) {
      console.log(
        `[RemoteScoreServer] Impossible de charger le match suivant: arène ou session invalide`
      );
      return;
    }

    const currentMatchId = arena.currentMatch?.id;
    const currentPoolId = arena.currentMatch?.poolId;

    console.log(
      `[RemoteScoreServer] loadNextMatch: arena=${arenaId}, pool=${currentPoolId}, total=${this.sessionMatches.length}`
    );

    // Si pas de matches en mémoire, essayer la DB
    if (this.sessionMatches.length === 0) {
      console.log('[RemoteScoreServer] Pas de matches en mémoire, recherche dans la DB...');
      const pendingMatches = this.db.getPendingMatches(this.session.competitionId);
      if (pendingMatches.length === 0) {
        console.log('[RemoteScoreServer] Pas de matches non plus en DB');
        arena.currentMatch = null;
        arena.status = 'idle';
        this.updateArena(arenaId, { currentMatch: null, status: 'idle' });
        return;
      }
      // Ajouter les matches de la DB à sessionMatches
      this.sessionMatches = pendingMatches;
    }

    // Chercher le prochain match dans le même pool (ordre smart = même ordre que l'affichage)
    if (currentPoolId) {
      const rawPoolMatches = this.sessionMatches
        .filter(m => {
          const matchPoolId = m.poolId || m.pool?.id || `pool-${m.poolNumber || m.number}`;
          return matchPoolId === currentPoolId;
        })
        .map((m: any) => {
          const scoreUpdate = this.sessionMatchScores.get(m.id);
          return scoreUpdate ? { ...m, ...scoreUpdate } : m;
        });
      const poolMatches = this.applySmartMatchOrder(rawPoolMatches as Match[]).filter(
        m => m.status !== MatchStatus.FINISHED
      );

      console.log(
        `[RemoteScoreServer] ${poolMatches.length} matches en attente dans le pool ${currentPoolId} (ordre smart)`
      );

      const nextMatch = poolMatches.find(m => m.id !== currentMatchId);
      if (nextMatch) {
        console.log(
          `[RemoteScoreServer] Chargement du match ${nextMatch.id} (pool ${currentPoolId}) sur arène ${arenaId}`
        );

        const arenaMatch: ArenaMatch = {
          id: nextMatch.id,
          poolId: currentPoolId,
          fencerA: nextMatch.fencerA!,
          fencerB: nextMatch.fencerB!,
          scoreA: 0,
          scoreB: 0,
          status: 'not_started',
          startTime: null,
          endTime: null,
        };

        this.assignMatchToArena(arenaId, arenaMatch);
        return;
      }

      console.log(
        `[RemoteScoreServer] Plus de matches dans le pool ${currentPoolId} pour l'arène ${arenaId}`
      );
    }

    // Vérifier la file d'attente DE avant de marquer l'arène comme vide
    const deQueue = this.arenaMatchQueue.get(arenaId) || [];
    if (deQueue.length > 0) {
      const nextDeMatch = deQueue[0];
      this.arenaMatchQueue.set(arenaId, deQueue.slice(1));
      console.log(
        `[RemoteScoreServer] Match DE suivant ${nextDeMatch.id} chargé depuis la file sur arène ${arenaId}`
      );
      this.assignMatchToArena(arenaId, nextDeMatch);
      return;
    }

    // Plus aucun match - marquer l'arène comme vide
    arena.currentMatch = null;
    arena.status = 'idle';
    arena.startTime = null;

    this.updateArena(arenaId, {
      currentMatch: null,
      status: 'idle',
      startTime: null,
    });
    this.persistArenaState(arenaId);
    console.log(`[RemoteScoreServer] Arène ${arenaId} marquée comme vide`);
  }

  private buildDashboardSnapshot(): { rankings: any[]; pools: any[]; liveMatches: any[] } | null {
    if (!this.session) return null;
    const { competitionId } = this.session;

    // Classement global (depuis les poules terminées)
    let rankings: any[] = [];
    try {
      const fencers = this.db.getFencersByCompetition(competitionId);
      rankings = fencers
        .filter((f: any) => f.poolStats)
        .map((f: any) => {
          const stats = typeof f.poolStats === 'string' ? JSON.parse(f.poolStats) : f.poolStats;
          return {
            lastName: f.lastName,
            firstName: f.firstName,
            club: f.club || '',
            victories: stats?.victories ?? 0,
            quest: stats?.questPoints ?? stats?.touchesScored ?? 0,
          };
        })
        .sort((a: any, b: any) => b.victories - a.victories || b.quest - a.quest);
    } catch { /* */ }

    // État des poules
    const pools: any[] = [];
    try {
      const matchesByPool = new Map<string, any[]>();
      for (const m of this.sessionMatches) {
        const pid = m.poolId || m.pool?.id;
        if (!pid) continue;
        if (!matchesByPool.has(pid)) matchesByPool.set(pid, []);
        matchesByPool.get(pid)!.push(m);
      }
      let poolNum = 1;
      for (const [pid, pMatches] of matchesByPool) {
        const isComplete = pMatches.every((m: any) => {
          const u = this.sessionMatchScores.get(m.id);
          return u ? u.status === 'finished' : m.status === 'finished';
        });
        pools.push({ id: pid, number: poolNum++, isComplete, ranking: [] });
      }
    } catch { /* */ }

    // Matchs en direct (arènes actives)
    const liveMatches: any[] = [];
    for (const arena of this.arenas.values()) {
      if (arena.currentMatch && arena.status === 'in_progress') {
        const m = arena.currentMatch;
        liveMatches.push({
          number: arena.number,
          poolNumber: m.poolId || null,
          fencerA: `${m.fencerA?.lastName ?? ''} ${m.fencerA?.firstName ?? ''}`.trim(),
          fencerB: `${m.fencerB?.lastName ?? ''} ${m.fencerB?.firstName ?? ''}`.trim(),
          clubA: m.fencerA?.club || '',
          clubB: m.fencerB?.club || '',
          scoreA: m.scoreA,
          scoreB: m.scoreB,
          winner: m.status === 'finished' ? (m.scoreA > m.scoreB ? 'A' : 'B') : null,
        });
      }
    }

    return { rankings, pools, liveMatches };
  }

  public broadcastDashboardUpdate(): void {
    const snapshot = this.buildDashboardSnapshot();
    if (!snapshot) return;
    this.io.to('dashboard').emit('rankings:update', { rankings: snapshot.rankings });
    this.io.to('dashboard').emit('pools:update', { pools: snapshot.pools });
    this.io.to('dashboard').emit('matches:update', { matches: snapshot.liveMatches });
  }

  private broadcastArenaUpdate(arenaId: string, update: ArenaUpdate): void {
    const override = this.arenaThemeOverrides.get(arenaId);
    const updateWithPhotos: ArenaUpdate = {
      ...update,
      showPhotos: this.sessionShowPhotos,
      theme: override?.theme ?? this.sessionTheme,
      customTheme: override?.customTheme,
    };

    // Stocker dans le buffer de replay (TTL + max size)
    const now = Date.now();
    let buf = this.arenaEventBuffer.get(arenaId) ?? [];
    buf = buf.filter(e => now - e.timestamp < this.EVENT_BUFFER_TTL_MS);
    buf.push({ event: updateWithPhotos, timestamp: now });
    if (buf.length > this.EVENT_BUFFER_MAX) buf = buf.slice(-this.EVENT_BUFFER_MAX);
    this.arenaEventBuffer.set(arenaId, buf);

    this.io.emit(`arena:${arenaId}:update`, updateWithPhotos);

    if ((global as any).mainWindow) {
      (global as any).mainWindow.webContents.send('arena:update', {
        arenaId,
        update: updateWithPhotos,
      });
    }
  }

  private persistArenaState(arenaId: string): void {
    if (!this.session) return;
    try {
      const arena = this.arenas.get(arenaId);
      if (!arena) return;
      this.db.saveArenaState(arenaId, {
        competitionId: this.session.competitionId,
        currentMatch: arena.currentMatch,
        matchQueue: this.arenaMatchQueue.get(arenaId) ?? [],
        settings: arena.settings,
        status: arena.status,
      });
    } catch (err) {
      console.error(`[RemoteScoreServer] Erreur persistance arène ${arenaId}:`, err);
    }
  }

  private checkScoreRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = this.scoreRateLimiter.get(ip);
    if (!entry || now > entry.resetAt) {
      this.scoreRateLimiter.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (entry.count >= this.SCORE_RATE_LIMIT) return false;
    entry.count++;
    return true;
  }

  public getLocalIPAddress(): string {
    const interfaces = os.networkInterfaces();
    // Adaptateurs virtuels courants sur Windows (Hyper-V, WSL, VirtualBox, VMware…)
    const VIRTUAL_KEYWORDS = [
      'virtual',
      'hyper-v',
      'vmware',
      'virtualbox',
      'vethernet',
      'loopback adapter',
      'pseudo',
      'teredo',
      'isatap',
    ];
    const candidates: string[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      const nameLower = name.toLowerCase();
      if (VIRTUAL_KEYWORDS.some(kw => nameLower.includes(kw))) continue;
      for (const iface of addrs || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          candidates.push(iface.address);
        }
      }
    }

    // Préférer une adresse LAN classique (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const preferred = candidates.find(
      ip =>
        ip.startsWith('192.168.') ||
        ip.startsWith('10.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
    );
    return preferred ?? candidates[0] ?? 'localhost';
  }

  public getServerUrl(): string {
    const ip = this.getLocalIPAddress();
    return `http://${ip}:${this.port}`;
  }

  public start(): void {
    console.log('[RemoteScoreServer] Démarrage du serveur...');
    console.log(`[RemoteScoreServer] Port: ${this.port}`);
    console.log(`[RemoteScoreServer] Interface: 0.0.0.0 (toutes les interfaces)`);
    console.log(`[RemoteScoreServer] URL locale: http://localhost:${this.port}`);
    console.log(`[RemoteScoreServer] URL réseau: http://${this.getLocalIPAddress()}:${this.port}`);

    this.server.listen(this.port, '0.0.0.0', () => {
      const url = this.getServerUrl();
      console.log(`[RemoteScoreServer] ============================================`);
      console.log(`[RemoteScoreServer] SERVEUR DÉMARRÉ AVEC SUCCÈS ✓`);
      console.log(`[RemoteScoreServer] Port: ${this.port}`);
      console.log(`[RemoteScoreServer] URL: ${url}`);
      console.log(`[RemoteScoreServer] Arènes disponibles: ${this.arenaCount}`);
      console.log(`[RemoteScoreServer] ============================================`);
      console.log(`[RemoteScoreServer] Les arbitres peuvent se connecter sur: ${url}`);
    });

    // Gestion des erreurs du serveur
    this.server.on('error', (err: any) => {
      console.error('[RemoteScoreServer] ERREUR DU SERVEUR:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`[RemoteScoreServer] Le port ${this.port} est déjà utilisé!`);
        console.error("[RemoteScoreServer] Arrêtez l'autre instance ou utilisez un autre port.");
      }
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
      console.log('Remote score server stopped');
    }
  }

  public async startSession(
    competitionId: string,
    strips: number,
    matchesFromRenderer?: any[],
    showPhotos?: boolean,
    kioskViews?: { poules: boolean; classement: boolean; direct: boolean; suivants: boolean }
  ): Promise<RemoteSession> {
    if (this.session) {
      throw new Error('Session déjà active');
    }

    const competition = this.db.getCompetition(competitionId);
    if (!competition) {
      throw new Error('Compétition non trouvée');
    }

    // Stocker le réglage d'affichage des photos
    this.sessionShowPhotos = showPhotos ?? false;

    // Stocker les vues kiosk activées
    this.sessionKioskViews = kioskViews ?? { poules: true, classement: true, direct: true, suivants: true };

    // Stocker le type d'arme pour l'arrêt automatique à 15 points en Laser Sabre
    this.sessionWeapon = competition.weapon || null;
    console.log(`[RemoteScoreServer] Type d'arme de la compétition: ${this.sessionWeapon}`);

    // Auto-detect number of strips from pool count if not specified or too small.
    // Ne pas ajuster pour une session DE pure (uniquement des matchs tableau) car le nombre de
    // poules de la phase précédente ne doit pas gonfler le nombre d'arènes d'élimination.
    const poolCount = this.db.getPoolCount(competitionId);
    const isDeOnlySession =
      matchesFromRenderer &&
      matchesFromRenderer.length > 0 &&
      matchesFromRenderer.every((m: any) => m.isTableau || m.__poolFencers);
    if (!isDeOnlySession && (strips <= 0 || strips < poolCount)) {
      const actualStrips = poolCount > 0 ? poolCount : 1;
      console.log(
        `[RemoteScoreServer] Nombre de pistes ajusté: ${strips} -> ${actualStrips} (basé sur ${poolCount} poules)`
      );
      strips = actualStrips;
    }

    // Configurer le nombre d'arènes
    this.setArenaCount(strips);

    // Réinitialiser le cache tireurs pour éviter toute pollution d'une session précédente
    this.poolFencersCache.clear();

    // Utiliser les matches passés depuis le renderer si disponibles, sinon chercher dans la DB
    let allMatches: any[] = [];
    if (matchesFromRenderer && matchesFromRenderer.length > 0) {
      console.log(`[RemoteScoreServer] ${matchesFromRenderer.length} matchs reçus du renderer`);

      // Extraire les marqueurs d'ordre des tireurs injectés par le renderer (__poolFencers)
      // Nécessaire car l'ordre FIE (ex: 4 tireurs: [1,4],[2,3],...) ne permet pas de reconstruire
      // l'ordre correct par simple extraction des paires de matchs.
      const fencerOrderMap = new Map<string, any[]>();
      const realMatches: any[] = [];
      for (const m of matchesFromRenderer) {
        if ((m as any).__poolFencers) {
          fencerOrderMap.set(m.poolId, m.fencers);
        } else {
          realMatches.push(m);
        }
      }
      // Pré-remplir le cache uniquement si la liste de tireurs est non vide
      for (const [poolId, fencers] of fencerOrderMap) {
        if (fencers && fencers.length > 0) {
          this.poolFencersCache.set(poolId, fencers);
          console.log(
            `[RemoteScoreServer] Cache tireurs pre-rempli pour pool ${poolId}: ${fencers.length} tireurs`
          );
        } else {
          console.warn(
            `[RemoteScoreServer] Marqueur __poolFencers vide pour pool ${poolId}, fallback DB`
          );
        }
      }

      allMatches = realMatches.filter(
        m => m.isTableau || m.status === 'not_started' || m.status === 'in_progress'
      );
      console.log(`[RemoteScoreServer] ${allMatches.length} matchs en attente après filtrage`);
    } else {
      // Récupérer les matchs en attente depuis la DB
      console.log('[RemoteScoreServer] Pas de matches reçus, recherche dans la DB...');
      const pendingMatches = this.db.getPendingMatches(competitionId);
      console.log(
        `[RemoteScoreServer] ${pendingMatches.length} matchs en attente trouvés pour la compétition ${competitionId}`
      );

      // Si pas de matchs trouvés via getPendingMatches (phases), essayer de récupérer via pool_fencers
      allMatches = pendingMatches;
      if (pendingMatches.length === 0) {
        console.log('[RemoteScoreServer] Tentative de récupération des matchs via pool_fencers...');
        allMatches = this.db.getAllPendingMatchesFromPools(competitionId);
        console.log(`[RemoteScoreServer] ${allMatches.length} matchs trouvés via fallback`);
      }
    }

    // Stocker les matches pour pouvoir les utiliser pour charger le match suivant
    this.sessionMatches = allMatches;
    console.log(`[RemoteScoreServer] ${this.sessionMatches.length} matches stockés en mémoire`);

    // Grouper les matches par pool
    const matchesByPool = new Map<string, any[]>();
    for (const match of allMatches) {
      if (match.isTableau) continue; // Les matchs DE sont traités séparément plus bas
      const poolId = match.poolId || match.pool?.id || `pool-${match.poolNumber || match.number}`;
      if (!matchesByPool.has(poolId)) {
        matchesByPool.set(poolId, []);
      }
      matchesByPool.get(poolId)!.push(match);
    }
    console.log(
      `[RemoteScoreServer] ${matchesByPool.size} pools trouvées:`,
      Array.from(matchesByPool.keys())
    );

    // Construire le cache des tireurs par pool depuis la DB (ordre par position)
    // Note: les pools déjà remplis via les marqueurs __poolFencers du renderer sont conservés.
    this.sessionMatchScores.clear();
    for (const [poolId, poolMatches] of matchesByPool) {
      // Déjà rempli par les marqueurs du renderer → ordre correct garanti
      if (this.poolFencersCache.has(poolId)) continue;
      const dbFencers = this.db.getPoolFencers(poolId);
      if (dbFencers.length > 0) {
        this.poolFencersCache.set(poolId, dbFencers);
      } else {
        // Fallback si poolId synthétique (pool-N) sans correspondance DB.
        // Trier par number avant d'extraire pour reconstruire l'ordre naturel du pool :
        // la première apparition de chaque tireur dans l'ordre des matchs FIE correspond
        // à sa position dans la poule (match 1 : pos1 vs pos4, match 2 : pos2 vs pos3…).
        const sortedMatches = [...poolMatches].sort(
          (a: any, b: any) => (a.number || 0) - (b.number || 0)
        );
        const fencerMap = new Map<string, any>();
        for (const match of sortedMatches) {
          if (match.fencerA?.id) fencerMap.set(match.fencerA.id, match.fencerA);
          if (match.fencerB?.id) fencerMap.set(match.fencerB.id, match.fencerB);
        }
        this.poolFencersCache.set(poolId, Array.from(fencerMap.values()));
      }
    }

    // Assigner les matchs aux arènes par pool (Pool 1 -> Arena 1, Pool 2 -> Arena 2, etc.)
    console.log(`[RemoteScoreServer] Assignation des matches par pool aux ${strips} arènes`);

    let poolIndex = 0;
    for (const [poolId, poolMatches] of matchesByPool) {
      if (poolIndex >= strips) break;

      const arenaId = `arena${poolIndex + 1}`;
      const firstMatch = poolMatches[0];

      if (!firstMatch) continue;

      console.log(
        `[RemoteScoreServer] Pool ${poolId} -> Arène ${arenaId}, ${poolMatches.length} matches`
      );

      const arenaMatch: ArenaMatch = {
        id: firstMatch.id,
        poolId: poolId,
        fencerA: firstMatch.fencerA!,
        fencerB: firstMatch.fencerB!,
        scoreA: firstMatch.scoreA?.value ?? 0,
        scoreB: firstMatch.scoreB?.value ?? 0,
        status: firstMatch.status === 'in_progress' ? 'in_progress' : 'not_started',
        startTime: firstMatch.status === 'in_progress' ? new Date() : null,
        endTime: null,
      };

      this.assignMatchToArena(arenaId, arenaMatch);

      // Stocker l'index du prochain match pour cette arène (commence à 1 car le 0 est déjà assigné)
      this.arenaNextMatchIndex.set(arenaId, 1);

      console.log(
        `[RemoteScoreServer] Match ${firstMatch.id} (Pool ${poolId}) assigné à l'arène ${arenaId}`
      );

      poolIndex++;
    }

    // Distribuer les matchs d'élimination directe (sans poolId) dans les files par arène
    const deMatches = allMatches
      .filter(m => !m.poolId && (m.round !== undefined || m.isTableau))
      .sort((a: any, b: any) => (a.round || 0) - (b.round || 0));

    if (deMatches.length > 0) {
      console.log(
        `[RemoteScoreServer] ${deMatches.length} matchs DE à distribuer sur ${strips} arènes`
      );
      let rrIndex = 0;
      const queuesByArena = new Map<string, ArenaMatch[]>();
      for (let i = 1; i <= strips; i++) queuesByArena.set(`arena${i}`, []);

      for (const match of deMatches) {
        const targetArenaId = match.arena
          ? `arena${match.arena}`
          : `arena${(rrIndex % strips) + 1}`;
        if (!queuesByArena.has(targetArenaId)) {
          // arène hors plage → round-robin sur arènes disponibles
          const fallbackId = `arena${(rrIndex % strips) + 1}`;
          queuesByArena.get(fallbackId)!.push({
            id: match.id,
            fencerA: match.fencerA,
            fencerB: match.fencerB,
            scoreA: 0,
            scoreB: 0,
            status: 'not_started',
            startTime: null,
            endTime: null,
            isTableau: true,
          });
        } else {
          queuesByArena.get(targetArenaId)!.push({
            id: match.id,
            fencerA: match.fencerA,
            fencerB: match.fencerB,
            scoreA: 0,
            scoreB: 0,
            status: 'not_started',
            startTime: null,
            endTime: null,
            isTableau: true,
          });
        }
        rrIndex++;
      }

      for (const [arenaId, queue] of queuesByArena) {
        const arena = this.arenas.get(arenaId);
        if (!arena) continue;
        if (!arena.currentMatch && queue.length > 0) {
          // Arène libre → charger le premier match directement
          this.assignMatchToArena(arenaId, queue[0]);
          this.arenaMatchQueue.set(arenaId, queue.slice(1));
          console.log(
            `[RemoteScoreServer] Match DE ${queue[0].id} chargé sur arène ${arenaId}, ${queue.length - 1} en file`
          );
        } else {
          // Arène occupée (match de poule en cours) → tout en file
          const existing = this.arenaMatchQueue.get(arenaId) || [];
          this.arenaMatchQueue.set(arenaId, [...existing, ...queue]);
          console.log(
            `[RemoteScoreServer] ${queue.length} matchs DE mis en file sur arène ${arenaId}`
          );
        }
      }
    }

    // Créer la session - utiliser allMatches au lieu de pendingMatches
    const assignedMatchCount = Math.min(allMatches.length, strips);
    this.session = {
      competitionId,
      strips: Array.from({ length: strips }, (_, i) => ({
        number: i + 1,
        status: i < assignedMatchCount ? 'occupied' : 'available',
      })),
      referees: [],
      activeMatches: [],
      isRunning: true,
      startTime: new Date(),
    };

    console.log(`[RemoteScoreServer] Session créée avec ${assignedMatchCount} matchs assignés`);

    return this.session;
  }

  public stopSession(): void {
    this.session = null;
    this.sessionMatches = [];
    this.arenaMatchQueue.clear();
    this.arenaNextMatchIndex.clear();
    this.poolFencersCache.clear();
    this.sessionMatchScores.clear();
    this.arenaTokens.clear();
  }

  public updateStripCount(newCount: number): RemoteSession | null {
    if (!this.session) {
      throw new Error('Aucune session active');
    }

    const currentCount = this.session.strips.length;

    if (newCount > currentCount) {
      // Add new strips
      for (let i = currentCount; i < newCount; i++) {
        this.session.strips.push({
          number: i + 1,
          status: 'available',
        });
      }
    } else if (newCount < currentCount) {
      // Remove strips (only available ones)
      const availableStrips = this.session.strips.filter(s => s.status === 'available');
      const toRemove = currentCount - newCount;

      if (availableStrips.length < toRemove) {
        throw new Error(
          `Impossible de réduire à ${newCount} pistes: ${toRemove - availableStrips.length} pistes occupées`
        );
      }

      // Remove from the end (available ones)
      let removed = 0;
      for (let i = this.session.strips.length - 1; i >= 0 && removed < toRemove; i--) {
        if (this.session.strips[i].status === 'available') {
          this.session.strips.splice(i, 1);
          removed++;
        }
      }

      // Renumber strips
      this.session.strips.forEach((strip, idx) => {
        strip.number = idx + 1;
      });
    }

    return this.session;
  }

  public updateShowPhotos(value: boolean): void {
    if (!this.session) throw new Error('Aucune session active');
    this.sessionShowPhotos = value;
    // Re-broadcast à toutes les pistes pour propager le nouveau réglage
    for (const [arenaId, arena] of this.arenas.entries()) {
      this.broadcastArenaUpdate(arenaId, {
        arenaId,
        match: arena.currentMatch,
        scoreA: arena.currentMatch?.scoreA,
        scoreB: arena.currentMatch?.scoreB,
        status: arena.status,
        fencerA: arena.currentMatch?.fencerA,
        fencerB: arena.currentMatch?.fencerB,
      });
    }
  }

  public updateTheme(theme: DisplayTheme): void {
    if (!this.session) throw new Error('Aucune session active');
    this.sessionTheme = theme;
    for (const [arenaId, arena] of this.arenas.entries()) {
      this.broadcastArenaUpdate(arenaId, {
        arenaId,
        match: arena.currentMatch,
        scoreA: arena.currentMatch?.scoreA,
        scoreB: arena.currentMatch?.scoreB,
        status: arena.status,
        fencerA: arena.currentMatch?.fencerA,
        fencerB: arena.currentMatch?.fencerB,
      });
    }
  }

  public updateArenaTheme(arenaId: string, theme: DisplayTheme, customTheme?: CustomTheme): void {
    if (!this.session) throw new Error('Aucune session active');
    const fullId = arenaId.startsWith('arena') ? arenaId : `arena${arenaId}`;
    this.arenaThemeOverrides.set(fullId, { theme, customTheme });
    const arena = this.arenas.get(fullId);
    if (arena) {
      this.broadcastArenaUpdate(fullId, {
        arenaId: fullId,
        match: arena.currentMatch,
        scoreA: arena.currentMatch?.scoreA,
        scoreB: arena.currentMatch?.scoreB,
        status: arena.status,
        fencerA: arena.currentMatch?.fencerA,
        fencerB: arena.currentMatch?.fencerB,
      });
    }
  }

  public updateKioskViews(views: { poules: boolean; classement: boolean; direct: boolean; suivants: boolean }): void {
    if (!this.session) throw new Error('Aucune session active');
    this.sessionKioskViews = views;
  }

  public updatePoolFencers(updates: Array<{ poolId: string; fencers: any[] }>): void {
    for (const { poolId, fencers } of updates) {
      if (fencers && fencers.length > 0) {
        this.poolFencersCache.set(poolId, fencers);
      }
    }
    // Notifier les tablettes connectées sur une arène affichant une poule modifiée
    for (const { poolId } of updates) {
      for (const [aId, arena] of this.arenas) {
        if (arena.currentMatch?.poolId !== poolId) continue;
        const updatedFencers = this.poolFencersCache.get(poolId) ?? [];
        const inMemory = this.sessionMatches
          .filter(m => (m.poolId || m.pool?.id || `pool-${m.poolNumber || m.number}`) === poolId)
          .sort((a: any, b: any) => (a.number || 0) - (b.number || 0));
        const matches =
          inMemory.length > 0
            ? inMemory.map(m => {
                const u = this.sessionMatchScores.get(m.id);
                return u ? { ...m, ...u } : m;
              })
            : this.db.getMatchesByPool(poolId);
        const isComplete = matches.every((m: any) => m.status === MatchStatus.FINISHED);
        this.io
          .to(`pool:${aId}`)
          .emit(`pool:${aId}:update`, { poolId, fencers: updatedFencers, matches, isComplete });
        break;
      }
    }
  }

  public refreshDeMatches(matchesFromRenderer: any[]): void {
    if (!this.session) throw new Error('Aucune session active');

    const strips = this.session.strips.length;

    // Collect IDs of matches currently assigned to an arena (must not be disturbed)
    const activeMatchIds = new Set<string>();
    for (const arena of this.arenas.values()) {
      if (arena.currentMatch) activeMatchIds.add(arena.currentMatch.id);
    }

    // Build the new DE match list, excluding already-active matches
    const deMatches = matchesFromRenderer
      .filter(m => !m.__poolFencers && m.isTableau && m.fencerA && m.fencerB)
      .sort((a: any, b: any) => (a.round || 0) - (b.round || 0));

    // Replace DE entries in sessionMatches (keep pool matches intact)
    this.sessionMatches = this.sessionMatches.filter((m: any) => !m.isTableau);
    for (const m of deMatches) this.sessionMatches.push(m);

    // Rebuild DE queues (preserve any non-DE entries already queued)
    for (const [arenaId, queue] of this.arenaMatchQueue.entries()) {
      this.arenaMatchQueue.set(arenaId, queue.filter((m: ArenaMatch) => !m.isTableau));
    }

    const pending = deMatches.filter(m => !activeMatchIds.has(m.id));
    let rrIndex = 0;
    const queuesByArena = new Map<string, ArenaMatch[]>();
    for (let i = 1; i <= strips; i++) queuesByArena.set(`arena${i}`, []);

    for (const match of pending) {
      const preferred = match.arena ? `arena${match.arena}` : `arena${(rrIndex % strips) + 1}`;
      const targetId = this.arenas.has(preferred) ? preferred : `arena${(rrIndex % strips) + 1}`;
      queuesByArena.get(targetId)!.push({
        id: match.id,
        fencerA: match.fencerA,
        fencerB: match.fencerB,
        scoreA: 0,
        scoreB: 0,
        status: 'not_started',
        startTime: null,
        endTime: null,
        isTableau: true,
      });
      rrIndex++;
    }

    for (const [arenaId, queue] of queuesByArena) {
      const arena = this.arenas.get(arenaId);
      if (!arena) continue;
      const existing = this.arenaMatchQueue.get(arenaId) || [];
      if (!arena.currentMatch && queue.length > 0) {
        this.assignMatchToArena(arenaId, queue[0]);
        this.arenaMatchQueue.set(arenaId, [...existing, ...queue.slice(1)]);
      } else {
        this.arenaMatchQueue.set(arenaId, [...existing, ...queue]);
      }
    }

    console.log(
      `[RemoteScoreServer] refreshDeMatches: ${deMatches.length} matchs DE, ${pending.length} distribués`
    );
  }

  public getSession(): RemoteSession | null {
    return this.session;
  }

  public setOrgNote(note: OrgNote): void {
    this.orgNote = note;
    this.io.emit('kiosk:note', note);
  }

  public clearOrgNote(): void {
    this.orgNote = null;
    this.io.emit('kiosk:note', null);
  }

  public setLogo(logo: string | null): void {
    this.sessionLogo = logo;
    this.io.emit('logo:update', { logo });
  }

  public setArenaPassword(arenaId: string, password: string): void {
    const fullId = arenaId.startsWith('arena') ? arenaId : `arena${arenaId}`;
    const arena = this.arenas.get(fullId);
    if (!arena) throw new Error(`Arène ${arenaId} introuvable`);
    arena.password = password || undefined;
    // Invalider tous les tokens existants pour cette arène
    this.arenaTokens.delete(fullId);
    console.log(
      `[RemoteScoreServer] Mot de passe ${password ? 'défini' : 'supprimé'} pour ${fullId}`
    );
  }
}
