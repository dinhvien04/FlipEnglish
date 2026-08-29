import React, { useState, useEffect, useRef } from 'react';
import { ConversationScenario, ConversationTurn } from '../../types/conversation';
import { CEFRLevel } from '../../types';
import { getScenarioOpeningMessage } from '../../data/conversations/scenarios';
import { speakWord } from '../../utils/speech';
import { classifyApiError } from '../../utils/apiError';
import { useI18n } from '../i18n';

interface ConversationSessionProps {
  scenario: ConversationScenario;
  level: CEFRLevel;
  onFinishConversation: (turns: ConversationTurn[], interactionId?: string) => void;
  onExitSession: () => void;
}

export const ConversationSession: React.FC<ConversationSessionProps> = ({
  scenario,
  level,
  onFinishConversation,
  onExitSession,
}) => {
  const { t } = useI18n();
  const [turns, setTurns] = useState<ConversationTurn[]>(() => [
    {
      id: 'turn-opening',
      role: 'assistant',
      text: getScenarioOpeningMessage(scenario.id, level),
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interactionId, setInteractionId] = useState<string | undefined>(undefined);
  const [showHint, setShowHint] = useState(false);
  const [currentTurnNumber, setCurrentTurnNumber] = useState(1);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isLoading]);

  const learnerTurnsCount = turns.filter((t) => t.role === 'user').length;

  const handleSendMessage = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    if (trimmed.length > 500) {
      setErrorMessage('Your message must be 500 characters or fewer.');
      return;
    }

    setErrorMessage(null);
    setShowHint(false);

    const userTurn: ConversationTurn = {
      id: `turn-user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    const newTurns = [...turns, userTurn];
    setTurns(newTurns);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/conversation/turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenarioId: scenario.id,
          level,
          turnNumber: currentTurnNumber,
          message: trimmed,
          previousInteractionId: interactionId || null,
        }),
      });

      if (!response.ok) {
        let errDesc = 'AI conversation is temporarily unavailable.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errDesc = errData.error;
          }
        } catch {
          // ignore
        }
        throw new Error(errDesc);
      }

      const data = await response.json();

      if (data.interactionId) {
        setInteractionId(data.interactionId);
      }

      const assistantTurn: ConversationTurn = {
        id: `turn-ai-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'Thank you for your response.',
        timestamp: Date.now(),
        feedback: data.feedback?.hasCorrection ? data.feedback : undefined,
        usefulExpressions: data.usefulExpressions,
      };

      const updatedTurns = [...newTurns, assistantTurn];
      setTurns(updatedTurns);
      setCurrentTurnNumber((prev) => prev + 1);

      // Check if conversation reached max turns or complete status
      if (currentTurnNumber >= scenario.maxTurns || data.conversationStatus === 'complete') {
        onFinishConversation(updatedTurns, data.interactionId || interactionId);
      }
    } catch (err: any) {
      const classified = classifyApiError(err);
      setErrorMessage(t(classified.userMessageKey));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEndConversationManually = () => {
    if (learnerTurnsCount < 2) {
      onExitSession();
    } else {
      onFinishConversation(turns, interactionId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 animate-fade-in flex flex-col h-[calc(100dvh-72px)] sm:h-[calc(100dvh-80px)]">
      {/* Session Top Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 mb-3 sm:mb-4 shadow-2xs flex items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">
              {scenario.title}
            </h2>
            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
              {level}
            </span>
          </div>
          <p className="text-2xs sm:text-xs text-slate-500 mt-0.5">
            Turn {Math.min(currentTurnNumber, scenario.maxTurns)} of {scenario.maxTurns} • {scenario.aiRole}
          </p>
        </div>

        <button
          type="button"
          onClick={handleEndConversationManually}
          className="min-h-10 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
        >
          {learnerTurnsCount >= 2 ? 'Finish & Evaluate' : 'Exit Conversation'}
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 sm:p-6 space-y-3.5 sm:space-y-4 mb-3 sm:mb-4">
        {turns.map((turn) => {
          const isUser = turn.role === 'user';
          return (
            <div key={turn.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                {isUser ? 'You' : scenario.aiRole}
              </div>

              {/* Message Box */}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                    : 'bg-white border border-slate-200/80 text-slate-900 rounded-bl-xs shadow-2xs'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{turn.text}</p>

                {!isUser && (
                  <button
                    type="button"
                    onClick={() => speakWord(turn.text)}
                    className="mt-2 min-h-11 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-xs font-bold text-indigo-700 transition-colors cursor-pointer inline-flex items-center justify-center"
                  >
                    Play response
                  </button>
                )}
              </div>

              {/* Language Correction / Feedback note */}
              {turn.feedback?.hasCorrection && (
                <div className="mt-2 max-w-[90%] sm:max-w-[85%] bg-amber-50 border border-amber-200/80 rounded-xl p-3 sm:p-3.5 text-xs text-amber-900 shadow-2xs">
                  <div className="font-bold text-amber-800 mb-1">
                    Language Note
                  </div>
                  {turn.feedback.suggestion && (
                    <div className="font-semibold mb-1 break-words">
                      A more natural expression: "{turn.feedback.suggestion}"
                    </div>
                  )}
                  {turn.feedback.explanation && (
                    <p className="text-amber-700 leading-normal break-words">
                      {turn.feedback.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
              {scenario.aiRole}
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-xs px-4 sm:px-5 py-2.5 sm:py-3 text-xs text-slate-500 italic shadow-2xs">
              Preparing a response...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Static Hint Drawer */}
      {showHint && (
        <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 sm:p-3.5 mb-3 text-xs text-indigo-900 animate-fade-in shrink-0">
          <div className="font-bold text-indigo-800 mb-1">
            Suggested expressions you could say:
          </div>
          <div className="space-y-1.5">
            {scenario.usefulExpressions.slice(0, 3).map((exp, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2">
                <span className="font-semibold">"{exp.expression}"</span>
                <span className="text-indigo-600 text-2xs">{exp.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl p-3 mb-3 flex items-center justify-between shrink-0">
          <span className="break-words">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-bold ml-2 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 shadow-xs shrink-0">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value.slice(0, 500))}
          onKeyDown={handleKeyDown}
          placeholder="Type your response in English... (Press Enter to send, Shift+Enter for new line)"
          disabled={isLoading}
          rows={2}
          className="w-full resize-none border-0 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden disabled:opacity-50"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer min-h-11 px-2.5 rounded-lg hover:bg-indigo-50 inline-flex items-center"
            >
              {showHint ? 'Hide hint' : 'Get a hint'}
            </button>
            <span className="text-2xs text-slate-400">
              {inputText.length}/500
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
              className="min-h-11 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center shadow-2xs"
            >
              {isLoading ? 'Sending...' : 'Send response'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
