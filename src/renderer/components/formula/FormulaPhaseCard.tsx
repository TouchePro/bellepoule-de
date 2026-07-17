/**
 * BellePoule Modern - Carte d'une phase dans le pipeline de formule
 */

import React, { useState , memo} from 'react';
import {
  CustomDEConfig,
  CustomPoolRoundConfig,
  FormulaPhaseNode,
  FormulaPhaseNodeType,
} from '../../../shared/types';
import { AdvancementRuleEditor } from './AdvancementRuleEditor';
import { RankingCriteriaEditor } from './RankingCriteriaEditor';
import { ScoringZoneEditor } from './ScoringZoneEditor';
import { useTranslation } from '../../hooks/useTranslation';

interface Props {
  node: FormulaPhaseNode;
  index: number;
  inputFencers: number;
  onUpdate: (node: FormulaPhaseNode) => void;
  onRemove: () => void;
  readOnly?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const getNodeTypeLabels = (
  t: (key: string, params?: { [key: string]: string | number }) => string
): Record<FormulaPhaseNodeType, string> => ({
  pool_round: t('formula.pool_round_label'),
  direct_elimination: t('formula.de_phase_label'),
  classification: t('formula.classification_phase_label'),
});

const NODE_TYPE_COLORS: Record<FormulaPhaseNodeType, string> = {
  pool_round: '#3B82F6',
  direct_elimination: '#EF4444',
  classification: '#10B981',
};

const FormulaPhaseCard_: React.FC<Props> = ({
  node,
  index,
  inputFencers,
  onUpdate,
  onRemove,
  readOnly,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(index === 0);
  const NODE_TYPE_LABELS = getNodeTypeLabels(t);

  const updatePoolConfig = (partial: Partial<CustomPoolRoundConfig>) => {
    onUpdate({ ...node, config: { ...node.config, ...partial } });
  };

  const updateDEConfig = (partial: Partial<CustomDEConfig>) => {
    onUpdate({ ...node, config: { ...node.config, ...partial } });
  };

  const isPool = node.type === 'pool_round';
  const isDE = node.type === 'direct_elimination';
  const poolCfg = node.config as CustomPoolRoundConfig;
  const deCfg = node.config as CustomDEConfig;

  return (
    <div
      className="formula-phase-card"
      style={{ borderLeftColor: NODE_TYPE_COLORS[node.type] }}
    >
      {/* En-tête */}
      <div className="phase-card-header">
        <div className="phase-card-title-row">
          <span
            className="phase-type-badge"
            style={{ background: NODE_TYPE_COLORS[node.type] }}
          >
            {NODE_TYPE_LABELS[node.type]}
          </span>
          <input
            type="text"
            className="phase-label-input"
            value={node.label ?? NODE_TYPE_LABELS[node.type]}
            onChange={e => onUpdate({ ...node, label: e.target.value })}
            disabled={readOnly}
            placeholder={t('formulaPhaseCard.phase_name')}
          />
        </div>
        <div className="phase-card-actions">
          {!readOnly && (
            <>
              <button
                type="button"
                className="btn btn-icon btn-secondary"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                title={t('formulaPhaseCard.move_up')}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-icon btn-secondary"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                title={t('formulaPhaseCard.move_down')}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-icon btn-danger"
                onClick={onRemove}
                title={t('formulaPhaseCard.delete_phase')}
              >
                ✕
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-icon btn-secondary"
            onClick={() => setExpanded(e => !e)}
            title={expanded ? t('formulaPhaseCard.collapse') : t('formulaPhaseCard.expand')}
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Corps */}
      {expanded && (
        <div className="phase-card-body">
          {/* Tour de poules */}
          {isPool && (
            <>
              <div className="phase-config-grid">
                <div className="form-group">
                  <label className="form-label">{t('formulaPhaseCard.pool_size')}</label>
                  <div className="input-row">
                    <input
                      type="number"
                      className="form-input"
                      min={3}
                      max={poolCfg.maxPoolSize}
                      value={poolCfg.minPoolSize}
                      onChange={e =>
                        updatePoolConfig({ minPoolSize: Number(e.target.value) })
                      }
                      disabled={readOnly}
                    />
                    <span>{t('formulaPhaseCard.range_to')}</span>
                    <input
                      type="number"
                      className="form-input"
                      min={poolCfg.minPoolSize}
                      max={20}
                      value={poolCfg.maxPoolSize}
                      onChange={e =>
                        updatePoolConfig({ maxPoolSize: Number(e.target.value) })
                      }
                      disabled={readOnly}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('formulaPhaseCard.max_score')}</label>
                  <select
                    className="form-input"
                    value={poolCfg.maxScore}
                    onChange={e => updatePoolConfig({ maxScore: Number(e.target.value) })}
                    disabled={readOnly}
                  >
                    {[3, 5, 8, 10, 15, 20].map(v => (
                      <option key={v} value={v}>
                        {t('formulaPhaseCard.touches_count', { count: v })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('formulaPhaseCard.timer')}</label>
                  <input
                    type="number"
                    className="form-input"
                    min={60}
                    max={900}
                    step={30}
                    value={poolCfg.timerSeconds}
                    onChange={e => updatePoolConfig({ timerSeconds: Number(e.target.value) })}
                    disabled={readOnly}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('formulaPhaseCard.repartition')}</label>
                  <select
                    className="form-input"
                    value={poolCfg.seeding}
                    onChange={e =>
                      updatePoolConfig({ seeding: e.target.value as 'serpentine' | 'sequential' | 'random' })
                    }
                    disabled={readOnly}
                  >
                    <option value="serpentine">{t('formulaPhaseCard.serpentine')}</option>
                    <option value="sequential">{t('formulaPhaseCard.sequential')}</option>
                    <option value="random">{t('formulaPhaseCard.random')}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('ui.separation')}</label>
                <div className="checkbox-row">
                  {(['byClub', 'byRegion', 'byNation'] as const).map(key => (
                    <label key={key} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={poolCfg.separation[key]}
                        onChange={e =>
                          updatePoolConfig({
                            separation: { ...poolCfg.separation, [key]: e.target.checked },
                          })
                        }
                        disabled={readOnly}
                      />
                      {key === 'byClub'
                        ? t('columns.club')
                        : key === 'byRegion'
                          ? t('columns.region')
                          : t('columns.nation')}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('formulaPhaseCard.scoring_system')}</label>
                <ScoringZoneEditor
                  scoring={poolCfg.scoring}
                  onChange={s => updatePoolConfig({ scoring: s })}
                  readOnly={readOnly}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('formulaPhaseCard.ranking_criteria')}</label>
                <RankingCriteriaEditor
                  criteria={poolCfg.rankingCriteria}
                  onChange={criteria => updatePoolConfig({ rankingCriteria: criteria })}
                  readOnly={readOnly}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('formulaPhaseCard.advancement')}</label>
                <AdvancementRuleEditor
                  rule={poolCfg.advancementRule}
                  onChange={r => updatePoolConfig({ advancementRule: r })}
                  inputFencers={inputFencers}
                  readOnly={readOnly}
                />
              </div>
            </>
          )}

          {/* Élimination directe */}
          {isDE && (
            <>
              <div className="phase-config-grid">
                <div className="form-group">
                  <label className="form-label">{t('formulaPhaseCard.max_score')}</label>
                  <select
                    className="form-input"
                    value={deCfg.maxScore}
                    onChange={e => updateDEConfig({ maxScore: Number(e.target.value) })}
                    disabled={readOnly}
                  >
                    {[5, 10, 15, 20, 25].map(v => (
                      <option key={v} value={v}>
                        {t('formulaPhaseCard.touches_count', { count: v })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('formulaPhaseCard.timer')}</label>
                  <input
                    type="number"
                    className="form-input"
                    min={60}
                    max={900}
                    step={30}
                    value={deCfg.timerSeconds}
                    onChange={e => updateDEConfig({ timerSeconds: Number(e.target.value) })}
                    disabled={readOnly}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('formulaPhaseCard.tableau_size')}</label>
                  <select
                    className="form-input"
                    value={deCfg.bracketSizeOverride ?? 0}
                    onChange={e => {
                      const v = Number(e.target.value);
                      updateDEConfig({ bracketSizeOverride: v === 0 ? undefined : v });
                    }}
                    disabled={readOnly}
                  >
                    <option value={0}>{t('formulaPhaseCard.auto_size')}</option>
                    {[4, 8, 16, 32, 64, 128].map(v => (
                      <option key={v} value={v}>
                        {t('formulaPhaseCard.tableau_of', { count: v })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <div className="checkbox-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={deCfg.thirdPlaceMatch}
                      onChange={e => updateDEConfig({ thirdPlaceMatch: e.target.checked })}
                      disabled={readOnly}
                    />
                    {t('competition.third_place_match_label')}
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={deCfg.fifthPlaceMatch ?? false}
                      onChange={e => updateDEConfig({ fifthPlaceMatch: e.target.checked })}
                      disabled={readOnly}
                    />
                    {t('formulaPhaseCard.fifth_place')}
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('formulaPhaseCard.scoring_system')}</label>
                <ScoringZoneEditor
                  scoring={deCfg.scoring}
                  onChange={s => updateDEConfig({ scoring: s })}
                  readOnly={readOnly}
                />
              </div>
            </>
          )}

          {/* Classement final — pas de config particulière */}
          {node.type === 'classification' && (
            <p className="classification-hint">
              {t('formulaPhaseCard.final_classification')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const FormulaPhaseCard = memo(FormulaPhaseCard_);
