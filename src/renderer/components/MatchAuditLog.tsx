/**
 * BellePoule Modern - Journal de match (audit log)
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import type { MatchEventEntry, MatchEventType } from '../../shared/types';
import { useMatchAuditStore } from '../../features/matchAuditLog/hooks/useMatchAuditStore';
import { useToast } from './Toast';
import { describeMatchEvent, exportMatchTimelineJSON } from '../../shared/utils/multiFormatExport';

interface MatchAuditLogProps {
  matchId?: string;
  competitionId?: string;
  matchTitle?: string;
  competitionName?: string;
  onClose?: () => void;
}

const EVENT_TYPE_LABELS: Record<MatchEventType, string> = {
  score_change: 'Score',
  touch: 'Touche',
  card: 'Carton',
  arena_exit: 'Sortie',
};

const EVENT_TYPE_COLORS: Record<MatchEventType, string> = {
  score_change: '#8b5cf6',
  touch: '#3b82f6',
  card: '#ef4444',
  arena_exit: '#f59e0b',
};

const ALL_TYPES: MatchEventType[] = ['touch', 'card', 'arena_exit', 'score_change'];

function formatTimestamp(ts: string, baseTs: string | null): string {
  const d = new Date(ts);
  const abs = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (!baseTs) return abs;
  const diffMs = d.getTime() - new Date(baseTs).getTime();
  if (diffMs < 0) return abs;
  const s = Math.floor(diffMs / 1000) % 60;
  const m = Math.floor(diffMs / 60000);
  const rel = m > 0 ? `+${m}m${s.toString().padStart(2, '0')}s` : `+${s}s`;
  return `${abs} (${rel})`;
}

function fencerLabel(entry: MatchEventEntry): { label: string; color: string } {
  if (!entry.fencerSide) return { label: 'Match', color: '#6b7280' };
  const name = entry.fencerLastName ?? entry.fencerSide;
  return {
    label: `${entry.fencerSide} — ${name}`,
    color: entry.fencerSide === 'A' ? '#3b82f6' : '#ef4444',
  };
}

function buildRefereeLastActions(entries: MatchEventEntry[]): { key: string; label: string; entry: MatchEventEntry }[] {
  const map = new Map<string, { label: string; entry: MatchEventEntry }>();
  for (const e of entries) {
    if (e.eventType !== 'score_change') continue;
    const key = e.refereeName ?? e.changedBy ?? e.ipAddress ?? 'inconnu';
    map.set(key, { label: key, entry: e });
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
}

const MatchAuditLogComponent: React.FC<MatchAuditLogProps> = ({
  matchId,
  competitionId,
  matchTitle,
  competitionName,
  onClose,
}) => {
  const { showToast } = useToast();
  const [refereeView, setRefereeView] = useState(false);
  const { entries, isLoading, error, filterTypes, loadMatchTimeline, loadCompetitionTimeline, setFilterTypes, reset } =
    useMatchAuditStore();

  useEffect(() => {
    if (matchId) {
      loadMatchTimeline(matchId);
    } else if (competitionId) {
      loadCompetitionTimeline(competitionId);
    }
    return () => { reset(); };
  }, [matchId, competitionId]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error]);

  const baseTs = entries.length > 0 ? entries[0].timestamp : null;
  const refereeLastActions = buildRefereeLastActions(entries);

  const filtered =
    filterTypes.length === 0 ? entries : entries.filter(e => filterTypes.includes(e.eventType));

  const toggleType = useCallback(
    (t: MatchEventType) => {
      if (filterTypes.includes(t)) {
        setFilterTypes(filterTypes.filter(x => x !== t));
      } else {
        setFilterTypes([...filterTypes, t]);
      }
    },
    [filterTypes, setFilterTypes]
  );

  const handleExportJSON = useCallback(async () => {
    try {
      const title = matchTitle ?? (matchId ? `match_${matchId}` : `competition_${competitionId}`);
      const json = exportMatchTimelineJSON(entries, title, competitionName);
      const filename = `journal_${title.replace(/\s+/g, '_')}_${Date.now()}.json`;
      const result = await window.electronAPI.dialog.saveFile({
        defaultPath: filename,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      if (result?.filePath) {
        await window.electronAPI.file.writeContent(result.filePath, json);
        showToast('Export JSON réussi', 'success');
      }
    } catch {
      showToast("Erreur lors de l'export", 'error');
    }
  }, [entries, matchTitle, matchId, competitionId, competitionName]);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#6b7280', marginRight: '0.25rem' }}>Filtrer :</span>
        {ALL_TYPES.map(t => {
          const active = filterTypes.length === 0 || filterTypes.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              style={{
                padding: '0.2rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                borderRadius: '999px',
                border: `1px solid ${EVENT_TYPE_COLORS[t]}`,
                background: active ? EVENT_TYPE_COLORS[t] : 'transparent',
                color: active ? 'white' : EVENT_TYPE_COLORS[t],
                cursor: 'pointer',
              }}
            >
              {EVENT_TYPE_LABELS[t]}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#9ca3af' }}>
          {filtered.length} événement{filtered.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setRefereeView(v => !v)}
          style={{
            padding: '0.3rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            borderRadius: '6px',
            border: '1px solid #8b5cf6',
            background: refereeView ? '#8b5cf6' : 'transparent',
            color: refereeView ? 'white' : '#8b5cf6',
            cursor: 'pointer',
          }}
        >
          Par arbitre
        </button>
        <button
          onClick={handleExportJSON}
          disabled={entries.length === 0}
          style={{
            padding: '0.3rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: '600',
            borderRadius: '6px',
            border: '1px solid #374151',
            background: entries.length === 0 ? '#f3f4f6' : '#1f2937',
            color: entries.length === 0 ? '#9ca3af' : 'white',
            cursor: entries.length === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Export JSON
        </button>
      </div>

      {/* Tableau */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Chargement…</div>
        ) : refereeView ? (
          refereeLastActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: '0.875rem' }}>
              Aucune saisie de score enregistrée.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Arbitre</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>IP</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Dernière saisie</th>
                  <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {refereeLastActions.map(({ key, label, entry }, i) => (
                  <tr key={key} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#1f2937' }}>{label}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{entry.ipAddress ?? '—'}</td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(entry.timestamp, baseTs)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>{describeMatchEvent(entry)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af', fontSize: '0.875rem' }}>
            Aucun événement enregistré pour ce match.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  Heure
                </th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                  Type
                </th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                  Tireur
                </th>
                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: '600', color: '#6b7280' }}>
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const { label, color } = fencerLabel(entry);
                return (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background: i % 2 === 0 ? 'white' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '0.5rem 0.75rem', color: '#6b7280', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {formatTimestamp(entry.timestamp, baseTs)}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem' }}>
                      <span
                        style={{
                          padding: '0.1rem 0.45rem',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          background: `${EVENT_TYPE_COLORS[entry.eventType]}20`,
                          color: EVENT_TYPE_COLORS[entry.eventType],
                          border: `1px solid ${EVENT_TYPE_COLORS[entry.eventType]}40`,
                        }}
                      >
                        {EVENT_TYPE_LABELS[entry.eventType]}
                      </span>
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color }}>
                      {label}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', color: '#374151' }}>
                      {describeMatchEvent(entry)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // Rendu inline (sans onClose = panel dans une page)
  if (!onClose) {
    return (
      <div style={{ padding: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
          Journal du match
        </h3>
        {content}
      </div>
    );
  }

  // Rendu modal
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1000 }}
    >
      <div
        className="modal modal--xl"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>
            Journal du match{matchTitle ? ` — ${matchTitle}` : ''}
          </h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        {content}
      </div>
    </div>
  );
};

export const MatchAuditLog = memo(MatchAuditLogComponent);
export default MatchAuditLog;
