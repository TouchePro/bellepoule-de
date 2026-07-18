/**
 * BellePoule Modern - Historique des scores par poules
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback , memo} from 'react';
import { ScoreAuditEntry, ScoreIpConflict } from '../../shared/types/preload';
import { useToast } from './Toast';
import { useTranslation } from '../hooks/useTranslation';

interface Props {
  competitionId: string;
}

function formatScore(score: any): string {
  if (!score) return '—';
  const v = score.value ?? '?';
  if (score.isAbstention) return `${v} (Ab.)`;
  if (score.isExclusion) return `${v} (Excl.)`;
  if (score.isForfait) return `${v} (FF)`;
  return String(v);
}

const ScoreAuditLog_: React.FC<Props> = ({ competitionId }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [entries, setEntries] = useState<ScoreAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPool, setFilterPool] = useState('');
  const [filterReferee, setFilterReferee] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.db.getScoreAuditLogByCompetition(competitionId);
      setEntries(data);
    } catch {
      showToast(t('messages.score_audit_log_load_error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [competitionId, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  // Écoute des alertes de conflit IP
  useEffect(() => {
    const unsub = window.electronAPI.onScoreIpConflict((conflict: ScoreIpConflict) => {
      const msg = t('messages.ip_conflict_alert', {
        pool: conflict.poolNumber ?? '?',
        match: conflict.matchNumber ?? '?',
        referee: conflict.attemptReferee,
        ip: conflict.attemptIp,
        originalReferee: conflict.originalReferee ?? t('messages.unknown'),
        originalIp: conflict.originalIp,
      });
      showToast(msg, 'error');
      load();
    });
    return unsub;
  }, [load, showToast]);

  const poolNumbers = Array.from(new Set(entries.map(e => e.poolNumber).filter(n => n != null))).sort((a, b) => (a as number) - (b as number));

  const filtered = entries.filter(e => {
    if (filterPool && String(e.poolNumber) !== filterPool) return false;
    if (filterReferee) {
      const ref = (e.refereeName ?? e.changedBy ?? '').toLowerCase();
      if (!ref.includes(filterReferee.toLowerCase())) return false;
    }
    return true;
  });

  const exportCsv = useCallback(async () => {
    const header = 'timestamp_iso,poule,match,score_avant_a,score_avant_b,score_apres_a,score_apres_b,arbitre,ip,source\n';
    const rows = filtered.map(e => {
      const cols = [
        new Date(e.changedAt).toISOString(),
        e.poolNumber != null ? String(e.poolNumber) : '',
        e.matchNumber != null ? String(e.matchNumber) : '',
        e.previousScoreA != null ? String(e.previousScoreA.value ?? '') : '',
        e.previousScoreB != null ? String(e.previousScoreB.value ?? '') : '',
        String(e.newScoreA?.value ?? ''),
        String(e.newScoreB?.value ?? ''),
        (e.refereeName ?? e.changedBy ?? '').replace(/,/g, ';'),
        (e.ipAddress ?? '').replace(/,/g, ';'),
        (e.changedBy ?? ''),
      ];
      return cols.join(',');
    });
    const csv = header + rows.join('\n');
    try {
      const result = await window.electronAPI.dialog.saveFile({
        title: t('dialogs.exportScoreHistory'),
        defaultPath: `historique_scores_${new Date().toISOString().slice(0,10)}.csv`,
        filters: [{ name: 'CSV / TXT', extensions: ['csv', 'txt'] }],
      });
      if (result && !result.canceled && result.filePath) {
        await window.electronAPI.file.writeContent(result.filePath, csv);
        showToast(t('messages.export_success', { format: 'CSV' }), 'success');
      }
    } catch {
      showToast(t('messages.export_failed', { format: 'CSV' }), 'error');
    }
  }, [filtered, showToast]);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{t('scoreAudit.title')}</h2>

        <select
          value={filterPool}
          onChange={e => setFilterPool(e.target.value)}
          style={{ padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid #D1D5DB' }}
        >
          <option value="">{t('scoreAudit.all_pools')}</option>
          {poolNumbers.map(n => (
            <option key={n} value={String(n)}>{t('ui.poule')} {n}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder={t('scoreAudit.filter_referee')}
          value={filterReferee}
          onChange={e => setFilterReferee(e.target.value)}
          style={{ padding: '0.3rem 0.6rem', borderRadius: 4, border: '1px solid #D1D5DB', minWidth: 140 }}
        />

        <button
          className="btn btn-secondary"
          onClick={exportCsv}
          disabled={filtered.length === 0}
        >
          {t('scoreAudit.export_csv')}
        </button>

        <button
          className="btn btn-secondary"
          onClick={load}
          disabled={loading}
          style={{ marginLeft: 'auto' }}
        >
          {loading ? '…' : t('scoreAudit.refresh')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#6B7280', padding: '3rem' }}>
          {loading ? t('scoreAudit.loading') : t('scoreAudit.no_entries')}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#F3F4F6', textAlign: 'left' }}>
              <th style={th}>{t('scoreAudit.timestamp')}</th>
              <th style={th}>{t('ui.poule')}</th>
              <th style={th}>{t('pools.match')}</th>
              <th style={th}>{t('scoreAudit.before')}</th>
              <th style={th}>{t('scoreAudit.after')}</th>
              <th style={th}>{t('referee.label')}</th>
              <th style={th}>IP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td style={td}>{new Date(e.changedAt).toLocaleString()}</td>
                <td style={td}>{e.poolNumber != null ? `${t('ui.poule')} ${e.poolNumber}` : '—'}</td>
                <td style={td}>{e.matchNumber != null ? `${t('pools.match')} ${e.matchNumber}` : '—'}</td>
                <td style={td}>
                  {e.previousScoreA != null
                    ? `${formatScore(e.previousScoreA)} / ${formatScore(e.previousScoreB)}`
                    : '—'}
                </td>
                <td style={{ ...td, fontWeight: 600 }}>
                  {formatScore(e.newScoreA)} / {formatScore(e.newScoreB)}
                </td>
                <td style={td}>{e.refereeName ?? e.changedBy ?? '—'}</td>
                <td style={{ ...td, fontFamily: 'monospace', color: '#6B7280' }}>{e.ipAddress ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '0.75rem', color: '#9CA3AF', fontSize: '0.75rem' }}>
        {t(filtered.length === 1 ? 'scoreAudit.entry_one' : 'scoreAudit.entry_other', { count: filtered.length })}
        {entries.length !== filtered.length ? ` ${t('scoreAudit.in_total', { total: entries.length })}` : ''}
      </div>
    </div>
  );
};

const th: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  whiteSpace: 'nowrap',
};

export const ScoreAuditLog = memo(ScoreAuditLog_);
