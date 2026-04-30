import React, { useState, useRef } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import type { PdfTemplate, PdfElementConfig } from '../../shared/types/pdfTemplate.types';

const LOGO_KEY = 'bellepoule-logo';

interface Props {
  template: PdfTemplate;
  onChange: (t: PdfTemplate) => void;
  onReset: () => void;
}

const PdfTemplateEditor: React.FC<Props> = ({ template, onChange, onReset }) => {
  const { t } = useTranslation();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(() => localStorage.getItem(LOGO_KEY));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      localStorage.setItem(LOGO_KEY, dataUrl);
      setLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    localStorage.removeItem(LOGO_KEY);
    setLogo(null);
  };

  const sorted = [...template.elements].sort((a, b) => a.order - b.order);

  const handleDragStart = (id: string) => setDraggedId(id);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDraggedId(null); return; }
    const fromEl = sorted.find(el => el.id === draggedId);
    const toEl = sorted.find(el => el.id === targetId);
    if (!fromEl || !toEl) { setDraggedId(null); return; }
    onChange({
      ...template,
      elements: template.elements.map(el => {
        if (el.id === draggedId) return { ...el, order: toEl.order };
        if (el.id === targetId)  return { ...el, order: fromEl.order };
        return el;
      }),
      updatedAt: new Date().toISOString(),
    });
    setDraggedId(null);
  };

  const toggleVisible = (id: string) => {
    onChange({
      ...template,
      elements: template.elements.map((el: PdfElementConfig) =>
        el.id === id ? { ...el, visible: !el.visible } : el
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleColorChange = (key: keyof typeof template.colors, value: string) => {
    onChange({ ...template, colors: { ...template.colors, [key]: value }, updatedAt: new Date().toISOString() });
  };

  const handleTitleChange = (value: string) => {
    onChange({ ...template, customTitle: value, updatedAt: new Date().toISOString() });
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf-template-${template.docType}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as PdfTemplate;
      if (!parsed.docType || !Array.isArray(parsed.elements)) throw new Error('invalid');
      onChange(parsed);
    } catch {
      setImportError(t('pdfTemplate.importError'));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Titre personnalisé */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t('pdfTemplate.customTitle')}</label>
        <input
          className="form-input"
          type="text"
          value={template.customTitle}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder={t('pdfTemplate.customTitlePlaceholder')}
          style={{ marginTop: '0.35rem' }}
        />
      </div>

      {/* Logo */}
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Logo</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {logo ? (
            <img
              src={logo}
              alt="Logo"
              style={{ height: '48px', maxWidth: '120px', objectFit: 'contain', border: '1px solid var(--color-border, #d1d5db)', borderRadius: '4px', padding: '2px', background: '#fff' }}
            />
          ) : (
            <div style={{ height: '48px', width: '80px', border: '1px dashed var(--color-border, #d1d5db)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--color-muted, #9ca3af)' }}>
              Aucun logo
            </div>
          )}
          <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => logoInputRef.current?.click()}>
            {logo ? 'Changer' : 'Importer'}
          </button>
          {logo && (
            <button className="btn btn-secondary" style={{ fontSize: '0.8rem', color: 'var(--danger, #ef4444)' }} onClick={handleLogoRemove}>
              Supprimer
            </button>
          )}
          <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
        </div>
      </div>

      {/* Couleurs */}
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Couleurs
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          {(['navy', 'gold', 'green'] as const).map(key => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input
                type="color"
                value={template.colors[key]}
                onChange={e => handleColorChange(key, e.target.value)}
                style={{ width: '32px', height: '32px', padding: '2px', border: '1px solid var(--color-border, #d1d5db)', borderRadius: '4px', cursor: 'pointer' }}
              />
              {t(`pdfTemplate.colors.${key}`)}
            </label>
          ))}
        </div>
      </div>

      {/* Ordre et visibilité des sections */}
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Sections
        </div>
        <div style={{ border: '1px solid var(--color-border, #d1d5db)', borderRadius: '6px', overflow: 'hidden' }}>
          {sorted.map((el, idx) => (
            <div
              key={el.id}
              draggable
              onDragStart={() => handleDragStart(el.id)}
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, el.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.6rem 0.75rem',
                background: draggedId === el.id
                  ? 'var(--color-primary-light, #eff6ff)'
                  : idx % 2 === 0 ? 'var(--color-surface, #fff)' : 'var(--color-bg, #f9fafb)',
                borderBottom: idx < sorted.length - 1 ? '1px solid var(--color-border, #e5e7eb)' : 'none',
                opacity: draggedId === el.id ? 0.5 : 1,
                cursor: 'grab',
                transition: 'background 0.1s',
              }}
            >
              <span style={{ color: 'var(--color-muted, #9ca3af)', fontSize: '1rem', userSelect: 'none' }}>⠿</span>
              <input
                type="checkbox"
                checked={el.visible}
                onChange={() => toggleVisible(el.id)}
                style={{ cursor: 'pointer', width: '15px', height: '15px', flexShrink: 0 }}
              />
              <span style={{
                fontSize: '0.85rem',
                color: el.visible ? 'var(--color-text, #1e293b)' : 'var(--color-muted, #9ca3af)',
                textDecoration: el.visible ? 'none' : 'line-through',
                flex: 1,
              }}>
                {t(`pdfTemplate.elements.${el.id}`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={onReset}>
          {t('pdfTemplate.reset')}
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={handleExport}>
          {t('pdfTemplate.exportJson')}
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '0.8rem' }} onClick={handleImportClick}>
          {t('pdfTemplate.importJson')}
        </button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {importError && (
        <p style={{ fontSize: '0.8rem', color: 'var(--danger, #ef4444)', marginTop: '-0.5rem' }}>{importError}</p>
      )}
    </div>
  );
};

export default PdfTemplateEditor;
