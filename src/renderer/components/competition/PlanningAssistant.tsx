/**
 * BellePoule Modern - Assistant de planning
 * Expose le moteur d'optimisation TournamentFlowManager (jusque-là inutilisé côté UI)
 * pour aider l'organisateur à répartir les matchs restants sur les pistes disponibles.
 * Licensed under GPL-3.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Competition, MatchStatus, Pool } from '../../../shared/types';
import {
  TournamentFlowManager,
  DEFAULT_TOURNAMENT_CONFIG,
  Arena as FlowArena,
  FlowOptimizationResult,
} from '../../../shared/services/tournamentFlow';
import { useTranslation } from '../../hooks/useTranslation';

interface PlanningAssistantProps {
  competition: Competition;
  pools: Pool[];
  suggestedArenaCount: number;
  onClose: () => void;
}

const PlanningAssistant: React.FC<PlanningAssistantProps> = ({
  competition,
  pools,
  suggestedArenaCount,
  onClose,
}) => {
  const { t } = useTranslation();
  const [arenaCount, setArenaCount] = useState(Math.max(1, suggestedArenaCount));
  const [result, setResult] = useState<FlowOptimizationResult | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [insights, setInsights] = useState<{
    estimatedFinishTime: Date;
    bottlenecks: string[];
    recommendations: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const manager = useMemo(() => new TournamentFlowManager(DEFAULT_TOURNAMENT_CONFIG), []);

  const arenas: FlowArena[] = useMemo(
    () =>
      Array.from({ length: arenaCount }, (_, i) => ({
        id: `piste-${i + 1}`,
        name: `Piste ${i + 1}`,
        available: true,
      })),
    [arenaCount]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    manager.optimizeTournamentFlow(competition, pools, arenas).then(res => {
      if (cancelled) return;
      setResult(res);
      setRecommendations(manager.getFlowRecommendations(res.schedule, arenas));
      setInsights(manager.generatePredictiveInsights(competition, pools, res.schedule));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [manager, competition, pools, arenas]);

  const remainingMatches = pools.reduce(
    (sum, p) => sum + p.matches.filter(m => m.status !== MatchStatus.FINISHED).length,
    0
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '560px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="planning-assistant-title"
      >
        <div className="modal-header">
          <h2 className="modal-title" id="planning-assistant-title">{t('planningAssistant.title')}</h2>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label htmlFor="planning-arena-count" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {t('planningAssistant.available_strips')}
            </label>
            <input
              id="planning-arena-count"
              type="number"
              min={1}
              max={20}
              value={arenaCount}
              onChange={e => setArenaCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              style={{ width: '4rem' }}
            />
          </div>

          {loading && <p style={{ color: 'var(--color-text-light)' }}>{t('planningAssistant.calculating')}</p>}

          {!loading && insights && (
            <>
              <div
                style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--color-surface-alt, #f8fafc)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              >
                <strong>{t('planningAssistant.estimated_end')}</strong>{' '}
                {insights.estimatedFinishTime.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                <br />
                <strong>{t('planningAssistant.remaining_matches')}</strong> {remainingMatches}
              </div>

              {recommendations.length === 0 && insights.bottlenecks.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>
                  {t('planningAssistant.no_warning')}
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {recommendations.map((r, i) => (
                    <li key={`rec-${i}`}>{r}</li>
                  ))}
                  {insights.bottlenecks.map((b, i) => (
                    <li key={`bn-${i}`}>⚠️ {b}</li>
                  ))}
                </ul>
              )}

              {result && result.metrics.arenaUtilization && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)' }}>
                  {t('planningAssistant.average_wait_time', {
                    minutes: Math.max(0, Math.round(result.metrics.averageWaitTime)),
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t('actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PlanningAssistant);
