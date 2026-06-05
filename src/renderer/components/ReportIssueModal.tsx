/**
 * BellePoule Modern - Report Issue Modal
 * Creates a GitHub issue with pre-filled information
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { useTranslation } from '../hooks/useTranslation';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ReportIssueModalProps {
  onClose: () => void;
}

interface VersionInfo {
  version: string;
  build: number;
  date: string;
}

const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ onClose }) => {
  const modalRef = useFocusTrap<HTMLDivElement>(true, onClose);
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [issueType, setIssueType] = useState<'bug' | 'feature'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [systemInfo, setSystemInfo] = useState<string>('');

  useEffect(() => {
    // Récupérer les infos de version
    if (window.electronAPI?.getVersionInfo) {
      window.electronAPI
        .getVersionInfo()
        .then((info: VersionInfo) => {
          setVersionInfo(info);
        })
        .catch(() => {
          setVersionInfo({ version: '1.0.0', build: 0, date: 'Unknown' });
        });
    }

    // Récupérer les infos système
    const userAgent = navigator.userAgent || '';
    let os = 'Unknown';

    if (userAgent.includes('Windows')) {
      os = 'Windows';
      if (userAgent.includes('Windows NT 10')) os = 'Windows 10/11';
    } else if (userAgent.includes('Mac')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    }

    setSystemInfo(os);
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) {
      showToast(t('report_issue.title_required'), 'warning');
      return;
    }

    const timestamp = new Date().toISOString();
    const versionString = versionInfo
      ? `${versionInfo.version}-build.${versionInfo.build}`
      : 'Unknown';

    // Construire le corps de l'issue
    const issueBody = `## Description\n\n${description || '_No description provided_'}\n\n## System Information\n\n| Info | Value |\n|------|-------|\n| **Version** | \`${versionString}\` |\n| **Build Date** | ${versionInfo?.date || 'Unknown'} |\n| **OS** | ${systemInfo} |\n| **Timestamp** | ${timestamp} |\n\n## ${issueType === 'bug' ? 'Steps to Reproduce' : 'Additional Details'}\n\n${issueType === 'bug' ? '_Describe the steps to reproduce the bug..._' : '_Add additional details if needed..._'}\n\n---\n_Issue created automatically from BellePoule Modern_`;

    // Construire l'URL GitHub
    const labels = issueType === 'bug' ? 'bug' : 'enhancement';
    const issueTitle = issueType === 'bug' ? `🐛 ${title}` : `✨ ${title}`;

    const params = new URLSearchParams({
      title: issueTitle,
      body: issueBody,
      labels: labels,
    });

    const githubUrl = `https://github.com/skycreations/klinge/issues/new?${params.toString()}`;

    // Ouvrir dans le navigateur
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(githubUrl);
    } else {
      window.open(githubUrl, '_blank');
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div ref={modalRef} className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>📝 {t('report_issue.title')}</h2>
          <button className="btn-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Type selector */}
          <div className="form-group">
            <label>{t('report_issue.type')}</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIssueType('bug')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: `2px solid ${issueType === 'bug' ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  background: issueType === 'bug' ? '#fef2f2' : 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: issueType === 'bug' ? '600' : '400',
                  color: issueType === 'bug' ? '#dc2626' : '#374151',
                }}
              >
                🐛 {t('report_issue.bug')}
              </button>
              <button
                type="button"
                onClick={() => setIssueType('feature')}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: `2px solid ${issueType === 'feature' ? '#22c55e' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  background: issueType === 'feature' ? '#f0fdf4' : 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: issueType === 'feature' ? '600' : '400',
                  color: issueType === 'feature' ? '#16a34a' : '#374151',
                }}
              >
                ✨ {t('report_issue.feature')}
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="form-group">
            <label htmlFor="issue-title">
              {issueType === 'bug' ? t('report_issue.bug_summary') : t('report_issue.feature_title')}
            </label>
            <input
              type="text"
              id="issue-title"
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                issueType === 'bug'
                  ? t('report_issue.bug_summary_placeholder')
                  : t('report_issue.feature_title_placeholder')
              }
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="issue-description">
              {issueType === 'bug'
                ? t('report_issue.what_happened')
                : t('report_issue.describe_idea')}
            </label>
            <textarea
              id="issue-description"
              className="form-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={
                issueType === 'bug'
                  ? t('report_issue.what_happened_placeholder')
                  : t('report_issue.describe_idea_placeholder')
              }
              rows={4}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* System info */}
          <div
            style={{
              padding: '0.75rem',
              background: '#f3f4f6',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
              ℹ️ {t('report_issue.included_info')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
              <span>• {t('report_issue.version')}:</span>
              <span style={{ fontFamily: 'monospace' }}>
                {versionInfo
                  ? `${versionInfo.version}-build.${versionInfo.build}`
                  : t('messages.loading')}
              </span>
              <span>• {t('report_issue.system')}:</span>
              <span>{systemInfo || t('messages.loading')}</span>
              <span>• {t('report_issue.date')}:</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>

          <p
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginTop: '0.75rem',
              textAlign: 'center',
            }}
          >
            {t('report_issue.click_github')}
            <br />
            {t('report_issue.github_login')}
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            style={{
              background: issueType === 'bug' ? '#dc2626' : '#16a34a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {t('report_issue.create_github')} 🔗
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ReportIssueModal);
