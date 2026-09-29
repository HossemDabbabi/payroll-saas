import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Minimize2,
  Maximize2,
  RefreshCw,
  HelpCircle,
  Calculator,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { copilotAPI } from '../../services/api';

/**
 * Renders custom Markdown content (headers, bolding, lists, tables, code).
 */
const SimpleMarkdownFormatter = ({ content }) => {
  if (!content) return null;

  // Split lines
  const lines = content.split('\n');
  const elements = [];
  let tableRows = [];
  let inTable = false;

  const renderTable = (rows, keyPrefix) => {
    if (rows.length === 0) return null;
    const headerRow = rows[0];
    const bodyRows = rows.slice(1).filter((r) => !r.every((cell) => cell.includes('---') || cell.includes(':---')));

    return (
      <div key={keyPrefix} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-700">
              {headerRow.map((cell, idx) => (
                <th key={idx} className="px-3 py-2">
                  {formatInlineText(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 font-mono text-[11px]">
                    {formatInlineText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const formatInlineText = (text) => {
    if (!text) return '';
    // Format bold **text** and code `code`
    const parts = [];
    let regex = /(\*\*[^*]+\*\*|`[^`]+`|\$[^\$]+\$)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const val = match[0];
      if (val.startsWith('**') && val.endsWith('**')) {
        parts.push(
          <strong key={match.index} className="font-semibold text-slate-900 dark:text-slate-100">
            {val.substring(2, val.length - 2)}
          </strong>
        );
      } else if (val.startsWith('`') && val.endsWith('`')) {
        parts.push(
          <code key={match.index} className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded font-mono text-[11px]">
            {val.substring(1, val.length - 1)}
          </code>
        );
      } else if (val.startsWith('$') && val.endsWith('$')) {
        parts.push(
          <span key={match.index} className="font-mono text-emerald-600 dark:text-emerald-400 italic">
            {val.substring(1, val.length - 1)}
          </span>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Check table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      tableRows.push(cells);
      inTable = true;
      return;
    } else if (inTable) {
      elements.push(renderTable(tableRows, `table-${idx}`));
      tableRows = [];
      inTable = false;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={idx} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1 flex items-center gap-1.5">
          {formatInlineText(trimmed.replace('### ', ''))}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-3 mb-1">
          {formatInlineText(trimmed.replace('## ', ''))}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-xs text-slate-700 dark:text-slate-300 my-0.5">
          {formatInlineText(trimmed.substring(2))}
        </li>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={idx} className="border-l-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-r-lg text-xs text-amber-800 dark:text-amber-200 my-2">
          {formatInlineText(trimmed.substring(2))}
        </div>
      );
    } else if (trimmed !== '') {
      elements.push(
        <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 my-1 leading-relaxed">
          {formatInlineText(trimmed)}
        </p>
      );
    }
  });

  if (inTable && tableRows.length > 0) {
    elements.push(renderTable(tableRows, `table-end`));
  }

  return <div className="space-y-1">{elements}</div>;
};

const QUICK_SUGGESTIONS = [
  { icon: Calculator, label: 'How is IRPP calculated in Tunisia?', category: 'tax' },
  { icon: User, label: 'Give me all information for Imene Zouaghi', category: 'employee' },
  { icon: HelpCircle, label: 'What is the employee CNSS rate?', category: 'cnss' },
  { icon: Upload, label: 'How do I upload my first payroll file?', category: 'faq' },
];

export default function PayrollCopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Hello! I am **Payroll Copilot AI**, your intelligent assistant for employee lookups, Tunisian statutory tax rules, and platform onboarding.\n\nHow can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('open-copilot', handleOpen);
    return () => window.removeEventListener('open-copilot', handleOpen);
  }, []);

  const handleSend = async (queryText) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await copilotAPI.chat(q);
      const aiAnswer = res.data?.answer || 'Sorry, I could not process your request at this time.';

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiAnswer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `⚠️ **Error:** ${err.response?.data?.message || 'Failed to connect to Payroll Copilot AI.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Floating Launcher Button when widget closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center space-x-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-3 rounded-2xl shadow-xl shadow-blue-500/25 transition-all duration-300 hover:scale-105"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide">Payroll Copilot AI</span>
        </button>
      )}

      {/* Main Copilot Chat Drawer / Window */}
      {isOpen && (
        <div
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
            isMinimized ? 'w-80 h-14' : 'w-96 sm:w-[420px] h-[580px]'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-amber-300">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  Payroll Copilot AI
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                    Live Context
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">RAG Engine • Tunisian Labor Law</p>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area (only when not minimized) */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${
                      msg.sender === 'user' ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-indigo-600 text-amber-300 shadow-sm'
                      }`}
                    >
                      {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`max-w-[82%] p-3 rounded-2xl shadow-sm ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {msg.sender === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <SimpleMarkdownFormatter content={msg.text} />
                      )}
                      <span
                        className={`text-[9px] block mt-1 ${
                          msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-amber-300 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 animate-bounce" />
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl rounded-tl-none flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping delay-100"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping delay-200"></span>
                      <span className="text-[11px] text-slate-500 font-medium">Copilot is analyzing context...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Suggestion Chips */}
              <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex items-center space-x-1.5 shrink-0 scrollbar-none">
                {QUICK_SUGGESTIONS.map((sug, i) => {
                  const Icon = sug.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(sug.label)}
                      disabled={isLoading}
                      className="whitespace-nowrap shrink-0 flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-[11px] font-medium transition"
                    >
                      <Icon className="w-3 h-3 text-blue-500" />
                      <span>{sug.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Input Area */}
              <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2 shrink-0">
                <input
                  type="text"
                  placeholder="Ask Copilot about employees, tax rules, or platform..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputQuery.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-xl transition flex items-center justify-center shrink-0"
                  title="Send query"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
