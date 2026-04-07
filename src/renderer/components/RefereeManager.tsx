/**
 * BellePoule Modern - Referee Manager Component
 * Interface for managing referee assignments
 * Licensed under GPL-3.0
 */

import React, { useState, useMemo } from 'react';
import { Referee, Match, Pool, Competition } from '../../shared/types';
import { RefereeManager, RefereeRotationConfig } from '../../shared/services/refereeManager';
import { useTranslation } from '../contexts/TranslationContext';

interface RefereeManagerProps {
  competition: Competition;
  referees: Referee[];
  pools: Pool[];
  matches: Match[];
  onRefereesChange: (referees: Referee[]) => void;
  onAssignmentsChange: (assignments: Map<string, Referee>) => void;
}

export const RefereeManagerComponent: React.FC<RefereeManagerProps> = ({
  competition,
  referees,
  pools,
  matches,
  onRefereesChange,
  onAssignmentsChange,
}) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<RefereeRotationConfig>({
    maxConsecutiveMatches: 3,
    minRestTimeMinutes: 15,
    avoidSameClub: true,
    balanceAssignment: true,
  });
  const [assignments, setAssignments] = useState<Map<string, Referee>>(new Map());
  const [showReport, setShowReport] = useState(false);

  const manager = useMemo(() => new RefereeManager(referees, config), [referees, config]);

  const handleAutoAssign = () => {
    const newAssignments = manager.assignRefereesToMatches(matches, pools);
    setAssignments(newAssignments);
    onAssignmentsChange(newAssignments);
  };

  const handleManualAssign = (matchId: string, refereeId: string) => {
    const referee = referees.find(r => r.id === refereeId);
    if (referee) {
      const newAssignments = new Map(assignments);
      newAssignments.set(matchId, referee);
      setAssignments(newAssignments);
      onAssignmentsChange(newAssignments);
    }
  };

  const getRefereeStats = (refereeId: string) => {
    return manager.getRefereeStats(refereeId);
  };

  const rotationReport = useMemo(() => {
    return manager.generateRotationReport();
  }, [manager, assignments]);

  const getConflictWarning = (match: Match, referee: Referee): string | null => {
    const fencerAClub = match.fencerA?.club;
    const fencerBClub = match.fencerB?.club;

    if (referee.club && (fencerAClub === referee.club || fencerBClub === referee.club)) {
      return `⚠️ ${t('referee_manager.conflict_warning', { club: referee.club })}`;
    }
    return null;
  };

  return (
    <div
      className="referee-manager"
      style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}
    >
      <h2
        style={{
          marginBottom: '1.5rem',
          color: '#1f2937',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '0.5rem',
        }}
      >
        👨‍⚖️ {t('referee_manager.title')}
      </h2>

      {/* Configuration */}
      <div
        style={{
          background: '#f9fafb',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#374151' }}>
          {t('referee_manager.rotation_config')}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={config.avoidSameClub}
              onChange={e => setConfig({ ...config, avoidSameClub: e.target.checked })}
            />
            {t('referee_manager.avoid_same_club')}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={config.balanceAssignment}
              onChange={e => setConfig({ ...config, balanceAssignment: e.target.checked })}
            />
            {t('referee_manager.balance_assignments')}
          </label>
          <label>
            {t('referee_manager.max_consecutive_matches')}
            <input
              type="number"
              value={config.maxConsecutiveMatches}
              onChange={e =>
                setConfig({ ...config, maxConsecutiveMatches: parseInt(e.target.value) || 3 })
              }
              style={{ width: '60px', marginLeft: '0.5rem', padding: '0.25rem' }}
              min="1"
              max="10"
            />
          </label>
          <label>
            {t('referee_manager.min_rest_time')}
            <input
              type="number"
              value={config.minRestTimeMinutes}
              onChange={e =>
                setConfig({ ...config, minRestTimeMinutes: parseInt(e.target.value) || 15 })
              }
              style={{ width: '60px', marginLeft: '0.5rem', padding: '0.25rem' }}
              min="0"
              max="60"
            />
          </label>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button
          onClick={handleAutoAssign}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
          }}
        >
          🔄 {t('referee_manager.auto_assign')}
        </button>
        <button
          onClick={() => setShowReport(!showReport)}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
          }}
        >
          📊 {showReport ? t('referee_manager.hide_report') : t('referee_manager.show_report')}
        </button>
      </div>

      {/* Rotation Report */}
      {showReport && (
        <div
          style={{
            background: '#f0fdf4',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #86efac',
          }}
        >
          <h3 style={{ marginBottom: '1rem', color: '#166534' }}>{t('referee_manager.rotation_report')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#dcfce7' }}>
                <th
                  style={{
                    padding: '0.5rem',
                    textAlign: 'left',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  {t('referee_manager.referee')}
                </th>
                <th
                  style={{
                    padding: '0.5rem',
                    textAlign: 'center',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  {t('referee_manager.matches')}
                </th>
                <th
                  style={{
                    padding: '0.5rem',
                    textAlign: 'center',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  {t('referee_manager.rest_violations')}
                </th>
                <th
                  style={{
                    padding: '0.5rem',
                    textAlign: 'center',
                    borderBottom: '2px solid #86efac',
                  }}
                >
                  {t('referee_manager.conflicts')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rotationReport.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #bbf7d0' }}>
                  <td style={{ padding: '0.5rem' }}>{row.refereeName}</td>
                  <td style={{ padding: '0.5rem', textAlign: 'center' }}>{row.matchesAssigned}</td>
                  <td
                    style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      color: row.restViolations > 0 ? '#dc2626' : '#166534',
                    }}
                  >
                    {row.restViolations}
                  </td>
                  <td
                    style={{
                      padding: '0.5rem',
                      textAlign: 'center',
                      color: row.conflicts > 0 ? '#dc2626' : '#166534',
                    }}
                  >
                    {row.conflicts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Arbitres List */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>{t('referee_manager.available_referees')}</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {referees.map(referee => {
            const stats = getRefereeStats(referee.id);
            return (
              <div
                key={referee.id}
                style={{
                  background: referee.status === 'available' ? '#f0fdf4' : '#fef2f2',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: referee.status === 'available' ? '#86efac' : '#fecaca',
                }}
              >
                <div style={{ fontWeight: 'bold', color: '#1f2937' }}>
                  {referee.firstName} {referee.lastName}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {referee.category} • {referee.club || t('referee_manager.no_club')}
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#374151' }}>{t('referee_manager.today_matches', { count: stats.todayMatches })}</span>
                  <br />
                  <span style={{ color: '#374151' }}>{t('referee_manager.total_matches', { count: stats.totalMatches })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match Assignments */}
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#374151' }}>{t('referee_manager.match_assignments')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {matches.map(match => {
            const assignedReferee = assignments.get(match.id);
            const conflictWarning = assignedReferee
              ? getConflictWarning(match, assignedReferee)
              : null;

            return (
              <div
                key={match.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: conflictWarning ? '#fef3c7' : '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: conflictWarning ? '#fbbf24' : '#e5e7eb',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500' }}>
                    {match.fencerA?.firstName} {match.fencerA?.lastName} vs{' '}
                    {match.fencerB?.firstName} {match.fencerB?.lastName}
                  </div>
                  {match.poolId && (
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {t('referee_manager.pool', { number: pools.find(p => p.id === match.poolId)?.number ?? '' })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {conflictWarning && (
                    <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                      {conflictWarning}
                    </span>
                  )}
                  <select
                    value={assignedReferee?.id || ''}
                    onChange={e => handleManualAssign(match.id, e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db',
                      background: 'white',
                    }}
                  >
                    <option value="">{t('referee_manager.select_referee')}</option>
                    {referees.map(referee => (
                      <option key={referee.id} value={referee.id}>
                        {referee.firstName} {referee.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RefereeManagerComponent;
