/**
 * BellePoule Modern - Éditeur de règle d'avancement inter-phases
 */

import React, { memo } from 'react';
import { AdvancementMode, AdvancementRule } from '../../../shared/types';
import { useTranslation } from '../../contexts/TranslationContext';

interface Props {
  rule: AdvancementRule;
  onChange: (rule: AdvancementRule) => void;
  inputFencers?: number; // pour afficher l'aperçu "→ X tireurs"
  readOnly?: boolean;
}

function computeAdvancing(fencers: number, rule: AdvancementRule): number {
  switch (rule.mode) {
    case 'all':
      return fencers;
    case 'percentage':
      return Math.round(fencers * ((rule.percentage ?? 80) / 100));
    case 'fixed_count':
      return Math.min(rule.count ?? fencers, fencers);
    case 'fixed_bracket': {
      const sizes = [2, 4, 8, 16, 32, 64, 128, 256];
      const target = rule.count ?? fencers;
      return sizes.filter(s => s <= target).pop() ?? 2;
    }
    case 'pool_winner':
      return 1;
  }
}

function getModeLabels(
  t: (key: string, params?: { [key: string]: string | number }) => string
): Record<AdvancementMode, string> {
  return {
    all: t('formula.advancement_all'),
    percentage: t('formula.advancement_percent'),
    fixed_count: t('formula.advancement_fixed'),
    fixed_bracket: t('formula.advancement_bracket'),
    pool_winner: t('formula.advancement_pool_winner'),
  };
}

const AdvancementRuleEditor_: React.FC<Props> = ({
  rule,
  onChange,
  inputFencers,
  readOnly,
}) => {
  const { t } = useTranslation();
  const advancing = inputFencers ? computeAdvancing(inputFencers, rule) : null;
  const modeLabels = getModeLabels(t);

  const setMode = (mode: AdvancementMode) => {
    const defaults: Record<AdvancementMode, Partial<AdvancementRule>> = {
      all: {},
      percentage: { percentage: 80 },
      fixed_count: { count: 16 },
      fixed_bracket: { count: 16 },
      pool_winner: {},
    };
    onChange({ mode, ...defaults[mode] });
  };

  return (
    <div className="advancement-rule-editor">
      <div className="advancement-mode-row">
        <select
          className="form-input advancement-mode-select"
          value={rule.mode}
          onChange={e => setMode(e.target.value as AdvancementMode)}
          disabled={readOnly}
        >
          {(Object.entries(modeLabels) as [AdvancementMode, string][]).map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </select>

        {rule.mode === 'percentage' && (
          <div className="advancement-value-group">
            <input
              type="number"
              className="form-input advancement-value-input"
              min={10}
              max={100}
              value={rule.percentage ?? 80}
              onChange={e => onChange({ ...rule, percentage: Number(e.target.value) })}
              disabled={readOnly}
            />
            <span className="advancement-unit">%</span>
          </div>
        )}

        {(rule.mode === 'fixed_count' || rule.mode === 'fixed_bracket') && (
          <div className="advancement-value-group">
            <input
              type="number"
              className="form-input advancement-value-input"
              min={2}
              max={256}
              value={rule.count ?? 16}
              onChange={e => onChange({ ...rule, count: Number(e.target.value) })}
              disabled={readOnly}
            />
            <span className="advancement-unit">{t('fencer.label')}</span>
          </div>
        )}

        {advancing !== null && (
          <span className="advancement-preview">
            → <strong>{advancing}</strong> {t('formula.advancing_suffix')}
          </span>
        )}
      </div>
    </div>
  );
};

export const AdvancementRuleEditor = memo(AdvancementRuleEditor_);
