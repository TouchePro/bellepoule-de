/**
 * BellePoule Modern - Voice Control Feature
 * Hands-free score entry using voice recognition
 * Licensed under GPL-3.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../contexts/TranslationContext';

interface VoiceCommand {
  command: string;
  action: (params?: string[]) => void;
  description: string;
}

export const VoiceScoreController: React.FC<{
  onScoreA?: (score: number) => void;
  onScoreB?: (score: number) => void;
  onStart?: () => void;
  onPause?: () => void;
  onFinish?: () => void;
}> = ({ onScoreA, onScoreB, onStart, onPause, onFinish }) => {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);

  const commands: VoiceCommand[] = [
    {
      command: 'score [A|B] [number]',
      action: params => {
        if (params && params.length >= 2) {
          const player = params[0].toUpperCase();
          const score = parseInt(params[1]);
          if (!isNaN(score)) {
            if (player === 'A') {
              setScoreA(score);
              onScoreA?.(score);
            }
            if (player === 'B') {
              setScoreB(score);
              onScoreB?.(score);
            }
          }
        }
      },
      description: t('voice_score.set_score_description'),
    },
    {
      command: 'démarrer|start|commencer',
      action: () => onStart?.(),
      description: t('voice_score.start_match_description'),
    },
    {
      command: 'pause|stop',
      action: () => onPause?.(),
      description: t('voice_score.pause_match_description'),
    },
    {
      command: 'terminer|fini|fin',
      action: () => onFinish?.(),
      description: t('voice_score.finish_match_description'),
    },
    {
      command: 'plus [A|B]',
      action: params => {
        if (params && params[0]) {
          const player = params[0].toUpperCase();
          if (player === 'A') {
            const newScore = scoreA + 1;
            setScoreA(newScore);
            onScoreA?.(newScore);
          }
          if (player === 'B') {
            const newScore = scoreB + 1;
            setScoreB(newScore);
            onScoreB?.(newScore);
          }
        }
      },
      description: t('voice_score.add_point_description'),
    },
  ];

  const processCommand = useCallback(
    (text: string) => {
      const lowerText = text.toLowerCase().trim();

      // Score command
      const scoreMatch = lowerText.match(/(?:score|set)\s+([ab])\s+(\d+)/i);
      if (scoreMatch) {
        commands[0].action([scoreMatch[1], scoreMatch[2]]);
        setLastCommand(t('voice_score.score_command', { player: scoreMatch[1], score: scoreMatch[2] }));
        return;
      }

      // Increment command
      const plusMatch = lowerText.match(/(?:plus|add|increment)\s+([ab])/i);
      if (plusMatch) {
        commands[4].action([plusMatch[1]]);
        setLastCommand(t('voice_score.add_point_command', { player: plusMatch[1] }));
        return;
      }

      // Start/Pause/Finish
      if (/démarrer|start|commencer|go/.test(lowerText)) {
        commands[1].action();
        setLastCommand(t('voice_score.match_started'));
      } else if (/pause|stop|arrêter/.test(lowerText)) {
        commands[2].action();
        setLastCommand(t('voice_score.match_paused'));
      } else if (/terminer|fini|fin|end/.test(lowerText)) {
        commands[3].action();
        setLastCommand(t('voice_score.match_finished'));
      }
    },
    [commands]
  );

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError(t('voice_score.speech_recognition_unsupported'));
      return;
    }

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setTranscript(transcript);

      if (event.results[current].isFinal) {
        processCommand(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      setError(t('voice_score.error_prefix', { error: event.error }));
      setIsListening(false);
    };

    if (isListening) {
      recognition.start();
    }

    return () => {
      recognition.stop();
    };
  }, [isListening, processCommand]);

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: isListening ? '#ef4444' : '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            transition: 'all 0.3s',
            animation: isListening ? 'pulse 1.5s infinite' : 'none',
          }}
        >
          🎤
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>{t('voice_score.title')}</h3>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            {isListening ? t('voice_score.listening') : t('voice_score.press_to_activate')}
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={() => setIsListening(!isListening)}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isListening ? '#ef4444' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        {isListening ? t('voice_score.stop_listening') : t('voice_score.enable_voice')}
      </button>

      {transcript && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          <strong>{t('voice_score.last_command')}:</strong> {transcript}
        </div>
      )}

      {lastCommand && (
        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#d1fae5',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#065f46',
          }}
        >
          ✅ {lastCommand}
        </div>
      )}

      <div style={{ marginTop: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>
          {t('voice_score.available_commands')}:
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#6b7280' }}>
          {commands.map((cmd, idx) => (
            <li key={idx}>{cmd.description}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default VoiceScoreController;
