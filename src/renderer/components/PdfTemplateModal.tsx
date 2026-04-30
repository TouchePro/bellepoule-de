import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { usePdfTemplateStore } from '../../features/pdfTemplates/hooks/usePdfTemplateStore';
import PdfTemplateEditor from './PdfTemplateEditor';
import type { PdfDocType, PdfTemplate } from '../../shared/types/pdfTemplate.types';

interface Props {
  onClose: () => void;
}

const DOC_TYPES: PdfDocType[] = ['pool', 'tableau', 'ranking'];

const PdfTemplateModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState<PdfDocType>('pool');
  const { templates, setTemplate, resetTemplate } = usePdfTemplateStore();

  const current = templates[activeType];

  const handleChange = (updated: PdfTemplate) => {
    setTemplate(activeType, updated);
  };

  const handleReset = () => {
    resetTemplate(activeType);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '95%', maxHeight: '90vh', overflow: 'auto' }}
      >
        <div className="modal-header">
          <h2 className="modal-title">{t('pdfTemplate.modalTitle')}</h2>
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Sélecteur de type */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {DOC_TYPES.map(type => (
              <button
                key={type}
                className={`btn ${activeType === type ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.85rem' }}
                onClick={() => setActiveType(type)}
              >
                {t(`pdfTemplate.docType.${type}`)}
              </button>
            ))}
          </div>

          <PdfTemplateEditor
            template={current}
            onChange={handleChange}
            onReset={handleReset}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>
            {t('actions.close') || 'Fermer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfTemplateModal;
