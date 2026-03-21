/**
 * BellePoule Modern - Notification Service
 * Browser notifications, mobile push, and webhook alerts
 * Licensed under GPL-3.0
 */

import { Competition, Match, Fencer } from '../types';

export interface NotificationConfig {
  browser: boolean;
  webhook?: {
    url: string;
    headers?: Record<string, string>;
  };
  email?: {
    enabled: boolean;
    recipients: string[];
  };
  events: {
    matchStarting: boolean;
    matchCompleted: boolean;
    competitionStarted: boolean;
    competitionEnded: boolean;
    fencerLate: boolean;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

export class NotificationService {
  private config: NotificationConfig;
  private swRegistration?: ServiceWorkerRegistration;

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = {
      browser: true,
      events: {
        matchStarting: true,
        matchCompleted: true,
        competitionStarted: true,
        competitionEnded: true,
        fencerLate: true,
      },
      ...config,
    };
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (this.config.browser) {
      const permission = await this.requestPermission();
      if (permission === 'granted') {
        await this.registerServiceWorker();
        return true;
      }
    }

    return false;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * Register service worker for background notifications
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/notification-sw.js');
        console.log('Notification service worker registered');
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  /**
   * Send a notification
   */
  async notify(payload: NotificationPayload): Promise<void> {
    // Browser notification
    if (this.config.browser && Notification.permission === 'granted') {
      await this.showBrowserNotification(payload);
    }

    // Webhook notification
    if (this.config.webhook) {
      await this.sendWebhook(payload);
    }

    // Email notification
    if (this.config.email?.enabled) {
      await this.sendEmail(payload);
    }
  }

  /**
   * Show browser notification
   */
  private async showBrowserNotification(payload: NotificationPayload): Promise<void> {
    if (this.swRegistration) {
      const options: NotificationOptions = {
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: '/icon-72x72.png',
        data: payload.data,
        requireInteraction: false,
        silent: false,
      };
      await this.swRegistration.showNotification(payload.title, options);
    } else {
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon,
      });
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhook(payload: NotificationPayload): Promise<void> {
    if (!this.config.webhook) return;

    try {
      await fetch(this.config.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.webhook.headers,
        },
        body: JSON.stringify({
          text: `${payload.title}: ${payload.body}`,
          ...payload.data,
        }),
      });
    } catch (error) {
      console.error('Webhook notification failed:', error);
    }
  }

  /**
   * Send email notification (via server)
   */
  private async sendEmail(payload: NotificationPayload): Promise<void> {
    // This would require a server endpoint
    console.log('Email notification would be sent:', payload);
  }

  /**
   * Notify when a match is starting
   */
  notifyMatchStarting(match: Match, strip: number): void {
    if (!this.config.events.matchStarting) return;

    this.notify({
      title: '🔔 Match Commence',
      body: `${match.fencerA?.firstName} ${match.fencerA?.lastName} vs ${match.fencerB?.firstName} ${match.fencerB?.lastName} sur la piste ${strip}`,
      data: {
        matchId: match.id,
        type: 'match-starting',
      },
      actions: [
        { action: 'view', title: 'Voir' },
        { action: 'dismiss', title: 'Ignorer' },
      ],
    });
  }

  /**
   * Notify when a match is completed
   */
  notifyMatchCompleted(match: Match): void {
    if (!this.config.events.matchCompleted) return;

    const scoreA = match.scoreA?.value ?? 0;
    const scoreB = match.scoreB?.value ?? 0;
    const winner = scoreA > scoreB ? match.fencerA : match.fencerB;

    this.notify({
      title: '✅ Match Terminé',
      body: `${match.fencerA?.firstName} ${match.fencerA?.lastName} ${scoreA} - ${scoreB} ${match.fencerB?.firstName} ${match.fencerB?.lastName} - Vainqueur: ${winner?.firstName} ${winner?.lastName}`,
      data: {
        matchId: match.id,
        type: 'match-completed',
      },
    });
  }

  /**
   * Notify when competition starts
   */
  notifyCompetitionStarted(competition: Competition): void {
    if (!this.config.events.competitionStarted) return;

    this.notify({
      title: '🏆 Compétition Commencée',
      body: `${competition.title} a commencé!`,
      data: {
        competitionId: competition.id,
        type: 'competition-started',
      },
    });
  }

  /**
   * Notify when competition ends
   */
  notifyCompetitionEnded(competition: Competition): void {
    if (!this.config.events.competitionEnded) return;

    this.notify({
      title: '🏆 Compétition Terminée',
      body: `${competition.title} est terminée! Consultez les résultats.`,
      data: {
        competitionId: competition.id,
        type: 'competition-ended',
      },
    });
  }

  /**
   * Notify when a fencer is late
   */
  notifyFencerLate(fencer: Fencer, delayMinutes: number): void {
    if (!this.config.events.fencerLate) return;

    this.notify({
      title: '⏰ Tireur en Retard',
      body: `${fencer.firstName} ${fencer.lastName} est en retard de ${delayMinutes} minutes`,
      data: {
        fencerId: fencer.id,
        type: 'fencer-late',
      },
    });
  }

  /**
   * Schedule a notification for future time
   */
  scheduleNotification(payload: NotificationPayload, delayMs: number): void {
    setTimeout(() => {
      this.notify(payload);
    }, delayMs);
  }
}

// Hook for using notifications in React
import { useState, useEffect, useCallback } from 'react';

export function useNotifications(config?: Partial<NotificationConfig>) {
  const [service] = useState(() => new NotificationService(config));
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    service.requestPermission().then(setPermission);
  }, [service]);

  const initialize = useCallback(async () => {
    const success = await service.initialize();
    setIsInitialized(success);
    return success;
  }, [service]);

  const notify = useCallback(
    (payload: NotificationPayload) => {
      service.notify(payload);
    },
    [service]
  );

  const requestPermission = useCallback(async () => {
    const newPermission = await service.requestPermission();
    setPermission(newPermission);
    return newPermission;
  }, [service]);

  return {
    permission,
    isInitialized,
    initialize,
    notify,
    requestPermission,
    service,
  };
}

export default NotificationService;
