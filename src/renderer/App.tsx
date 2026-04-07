/**
 * BellePoule Modern - Main App Component
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Competition, Fencer, FencerStatus, Pool, Match, PhaseType } from '../shared/types';
import CompetitionList from './components/CompetitionList';
import CompetitionView from './components/CompetitionView';
import NewCompetitionModal from './components/NewCompetitionModal';
import ReportIssueModal from './components/ReportIssueModal';
import UpdateNotification from './components/UpdateNotification';
import SettingsModal from './components/SettingsModal';
import { ToastProvider, useToast } from './components/Toast';
import { ConfirmProvider, useConfirm } from './components/ConfirmDialog';
import { TranslationProvider, useTranslation } from './contexts/TranslationContext';
import { ErrorBoundary, CompetitionErrorBoundary } from './components/ErrorBoundary';

type View = 'home' | 'competition';

interface OpenCompetition {
  competition: Competition;
  isDirty: boolean;
}

const AppContent: React.FC = () => {
  const { t, isLoading: translationLoading } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [view, setView] = useState<View>('home');
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [currentCompetition, setCurrentCompetition] = useState<Competition | null>(null);
  const [openCompetitions, setOpenCompetitions] = useState<OpenCompetition[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [showNewCompetitionModal, setShowNewCompetitionModal] = useState(false);
  const [showReportIssueModal, setShowReportIssueModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load competitions on mount
  useEffect(() => {
    loadCompetitions();

    // Listen for menu events
    if (window.electronAPI) {
      window.electronAPI.onMenuNewCompetition(() => setShowNewCompetitionModal(true));
      window.electronAPI.onMenuReportIssue(() => setShowReportIssueModal(true));

      // Listen for file operations
      window.electronAPI.onFileOpened(async (filepath: string) => {
        console.log('Fichier .BPM ouvert:', filepath);
        await loadCompetitions();
      });

      window.electronAPI.onFileSaved(async (filepath: string) => {
        console.log('Fichier sauvegardé:', filepath);
      });

      // Listen for save events
      window.electronAPI.onMenuSave(() => {
        showToast(t('app.autosave_success'), 'success');
      });

      window.electronAPI.onAutosaveCompleted(() => {
        console.log('Autosave OK');
      });

      window.electronAPI.onAutosaveFailed(() => {
        showToast(t('app.autosave_failed'), 'error');
      });
    }

    return () => {
      if (window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners('menu:new-competition');
        window.electronAPI.removeAllListeners('menu:report-issue');
        window.electronAPI.removeAllListeners('file:opened');
        window.electronAPI.removeAllListeners('file:saved');
        window.electronAPI.removeAllListeners('menu:save');
        window.electronAPI.removeAllListeners('autosave:completed');
        window.electronAPI.removeAllListeners('autosave:failed');
      }
    };
  }, []);

  const loadCompetitions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const comps = await window.electronAPI.db.getAllCompetitions();
        setCompetitions(comps);
      }
    } catch (error) {
      console.error('Failed to load competitions:', error);
    }
    setIsLoading(false);
  }, []);

  const handleCreateCompetition = useCallback(async (data: Partial<Competition>) => {
    try {
      if (window.electronAPI) {
        // Assurer que le titre est défini
        const competitionData = {
          title: data.title || 'Nouvelle compétition',
          date: data.date || new Date(),
          weapon: data.weapon || 'FOIL',
          gender: data.gender || 'M',
          category: data.category || 'SENIOR',
          ...data,
        };
        const newComp = await window.electronAPI.db.createCompetition(competitionData as any);
        setCompetitions(prev => [newComp, ...prev]);

        // Ouvrir la compétition dans un nouvel onglet
        const fencers = await window.electronAPI.db.getFencersByCompetition(newComp.id);
        newComp.fencers = fencers;

        setOpenCompetitions(prev => [...prev, { competition: newComp, isDirty: false }]);
        setActiveTabId(newComp.id);
        setCurrentCompetition(newComp);
        setView('competition');
      }
    } catch (error) {
      console.error('Failed to create competition:', error);
    }
    setShowNewCompetitionModal(false);
  }, []);

  const handleSelectCompetition = async (competition: Competition) => {
    console.log('=== handleSelectCompetition ===');
    console.log('Competition ID:', competition.id);
    console.log('Competition title:', competition.title);

    try {
      if (window.electronAPI) {
        // Vérifier si la compétition est déjà ouverte
        const existingOpenComp = openCompetitions.find(
          open => open.competition.id === competition.id
        );

        if (existingOpenComp) {
          console.log("Competition déjà ouverte, activation de l'onglet");
          // Activer l'onglet existant
          setActiveTabId(competition.id);
          setCurrentCompetition(existingOpenComp.competition);
          setView('competition');
        } else {
          console.log('Chargement de la compétition depuis la DB...');
          // Ouvrir dans un nouvel onglet
          const comp = await window.electronAPI.db.getCompetition(competition.id);
          console.log('Compétition chargée:', comp ? 'OK' : 'NULL');

          if (comp) {
            console.log('Chargement des tireurs...');
            const fencers = await window.electronAPI.db.getFencersByCompetition(competition.id);
            console.log('Nombre de tireurs:', fencers.length);
            comp.fencers = fencers;

            console.log('Vérification des données:');
            console.log('- date:', comp.date);
            console.log('- weapon:', comp.weapon);
            console.log('- fencers:', comp.fencers.length);

            setOpenCompetitions(prev => [...prev, { competition: comp, isDirty: false }]);
            setActiveTabId(comp.id);
            setCurrentCompetition(comp);
            setView('competition');
            console.log('Compétition ouverte avec succès');
          } else {
            console.error('Compétition non trouvée dans la DB');
            showToast(t('app.competition_not_found'), 'error');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load competition:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
      showToast(t('app.competition_load_error'), 'error');
    }
  };

  const handleTabSwitch = (competitionId: string) => {
    const openComp = openCompetitions.find(open => open.competition.id === competitionId);
    if (openComp) {
      setActiveTabId(competitionId);
      setCurrentCompetition(openComp.competition);
      setView('competition');
    }
  };

  const handleTabClose = async (competitionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const openComp = openCompetitions.find(open => open.competition.id === competitionId);
    if (openComp && openComp.isDirty) {
      const ok = await confirm(
        t('app.unsaved_changes_dialog')
      );
      if (!ok) {
        return;
      }
    }

    const newOpenCompetitions = openCompetitions.filter(
      open => open.competition.id !== competitionId
    );
    setOpenCompetitions(newOpenCompetitions);

    if (activeTabId === competitionId) {
      if (newOpenCompetitions.length > 0) {
        const nextComp = newOpenCompetitions[newOpenCompetitions.length - 1];
        setActiveTabId(nextComp.competition.id);
        setCurrentCompetition(nextComp.competition);
      } else {
        setActiveTabId(null);
        setCurrentCompetition(null);
        setView('home');
      }
    }
  };

  const handleDeleteCompetition = async (id: string) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.db.deleteCompetition(id);
        setCompetitions(prev => prev.filter(c => c.id !== id));

        // Supprimer l'onglet ouvert pour cette compétition (évite le tab fantôme)
        setOpenCompetitions(prev => {
          const next = prev.filter(open => open.competition.id !== id);
          if (activeTabId === id) {
            if (next.length > 0) {
              const lastComp = next[next.length - 1].competition;
              setActiveTabId(lastComp.id);
              setCurrentCompetition(lastComp);
              setView('competition');
            } else {
              setActiveTabId(null);
              setCurrentCompetition(null);
              setView('home');
            }
          } else if (currentCompetition?.id === id) {
            setCurrentCompetition(null);
            setView('home');
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to delete competition:', error);
    }
  };

  const handleBack = () => {
    setView('home');
  };

  const handleSettingsSave = (settings: any) => {
    // Currently settings handling would go here
    // For now, the language change is handled in the SettingsModal component
    console.log('Settings saved:', settings);
  };

  const handleUpdateCompetition = (updated: Competition) => {
    setCurrentCompetition(updated);
    setCompetitions(competitions.map(c => (c.id === updated.id ? updated : c)));

    // Marquer l'onglet comme modifié
    setOpenCompetitions(prev =>
      prev.map(open =>
        open.competition.id === updated.id ? { ...open, competition: updated, isDirty: true } : open
      )
    );
  };

  return (
    <>
        <UpdateNotification />
        <div className="app">
          <header className="header">
            <div className="header-title">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                <path d="M13 19l6-6" />
                <path d="M16 16l4 4" />
                <path d="M19 21a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              {t('app.title')}
            </div>
            <div className="header-nav">
              {openCompetitions.length > 0 && view === 'competition' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setView('home');
                    setActiveTabId(null);
                  }}
                  title={t('app.back_to_home_title')}
                >
                  🏠 {t('app.home_label')}
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setShowNewCompetitionModal(true)}>
                + {t('menu.new_competition')}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowSettingsModal(true)}
                title={t('settings.title')}
              >
                ⚙️ {t('settings.title')}
              </button>
            </div>
          </header>

          {/* Onglets des compétitions ouvertes */}
          {openCompetitions.length > 0 && (
            <div
              className="tabs-container"
              style={{
                background: '#f8fafc',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1rem',
                gap: '0.25rem',
                overflowX: 'auto',
              }}
            >
              {/* Onglet Général/Accueil */}
              <div
                className={`tab ${view === 'home' ? 'tab-active' : ''}`}
                onClick={() => {
                  setView('home');
                  setActiveTabId(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  background: view === 'home' ? 'white' : 'transparent',
                  border: view === 'home' ? '1px solid #e5e7eb' : '1px solid transparent',
                  borderBottom: view === 'home' ? '1px solid white' : 'none',
                  marginBottom: view === 'home' ? '-1px' : '0',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  minWidth: '120px',
                }}
                onMouseEnter={e => {
                  if (view !== 'home') {
                    e.currentTarget.style.background = '#f1f5f9';
                  }
                }}
                onMouseLeave={e => {
                  if (view !== 'home') {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span
                  style={{
                    fontWeight: view === 'home' ? '600' : '400',
                    color: view === 'home' ? '#1f2937' : '#6b7280',
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  🏠 {t('app.home_label')}
                </span>
              </div>

              {openCompetitions.map(openComp => (
                <div
                  key={openComp.competition.id}
                  className={`tab ${activeTabId === openComp.competition.id ? 'tab-active' : ''}`}
                  onClick={() => handleTabSwitch(openComp.competition.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px 8px 0 0',
                    cursor: 'pointer',
                    background: activeTabId === openComp.competition.id ? 'white' : 'transparent',
                    border:
                      activeTabId === openComp.competition.id
                        ? '1px solid #e5e7eb'
                        : '1px solid transparent',
                    borderBottom:
                      activeTabId === openComp.competition.id ? '1px solid white' : 'none',
                    marginBottom: activeTabId === openComp.competition.id ? '-1px' : '0',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    minWidth: '150px',
                  }}
                  onMouseEnter={e => {
                    if (activeTabId !== openComp.competition.id) {
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeTabId !== openComp.competition.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span
                    style={{
                      fontWeight: activeTabId === openComp.competition.id ? '600' : '400',
                      color: activeTabId === openComp.competition.id ? '#1f2937' : '#6b7280',
                      fontSize: '0.875rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                    }}
                  >
                    {openComp.competition.title}
                    {openComp.isDirty && (
                      <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>●</span>
                    )}
                  </span>
                  <button
                    onClick={e => handleTabClose(openComp.competition.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '0.125rem',
                      borderRadius: '3px',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#e5e7eb';
                      e.currentTarget.style.color = '#374151';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                    title={t('app.close_tab_title')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <main className="main">
            {view === 'home' && (
              <ErrorBoundary
                fallback={
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <h3>🏠 {t('app.error_loading_title')}</h3>
                    <p>{t('app.error_loading_message')}</p>
                    <button onClick={() => window.location.reload()}>
                      {t('app.reload_button')}
                    </button>
                  </div>
                }
              >
                <CompetitionList
                  competitions={competitions}
                  isLoading={isLoading}
                  onSelect={handleSelectCompetition}
                  onDelete={handleDeleteCompetition}
                  onNewCompetition={() => setShowNewCompetitionModal(true)}
                />
              </ErrorBoundary>
            )}

            {view === 'competition' && currentCompetition && activeTabId && (
              <CompetitionErrorBoundary key={currentCompetition.id}>
                <CompetitionView
                  competition={currentCompetition}
                  onUpdate={handleUpdateCompetition}
                />
              </CompetitionErrorBoundary>
            )}
          </main>

          {showNewCompetitionModal && (
            <NewCompetitionModal
              onClose={() => setShowNewCompetitionModal(false)}
              onCreate={handleCreateCompetition}
            />
          )}

          {showReportIssueModal && (
            <ReportIssueModal onClose={() => setShowReportIssueModal(false)} />
          )}

          {showSettingsModal && (
            <SettingsModal
              onClose={() => setShowSettingsModal(false)}
              onSave={handleSettingsSave}
            />
          )}
        </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <TranslationProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppContent />
        </ConfirmProvider>
      </ToastProvider>
    </TranslationProvider>
  );
};

export default App;
