import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  HelpCircle,
  Calculator,
  Upload,
  Paperclip,
  Mic,
  ArrowUp,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { copilotAPI } from '../../services/api';

/**
 * Renders custom Markdown content (headers, bolding, lists, tables, code).
 */
const SimpleMarkdownFormatter = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let tableRows = [];
  let inTable = false;

  const renderTable = (rows, keyPrefix) => {
    if (rows.length === 0) return null;
    const headerRow = rows[0];
    const bodyRows = rows.slice(1).filter((r) => !r.every((cell) => cell.includes('---') || cell.includes(':---')));

    return (
      <div key={keyPrefix} className="my-2.5 overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/80 shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800/90 text-slate-200 font-semibold border-b border-slate-700">
              {headerRow.map((cell, idx) => (
                <th key={idx} className="px-3 py-2 text-slate-100">
                  {formatInlineText(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-800/40">
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
          <strong key={match.index} className="font-semibold text-white">
            {val.substring(2, val.length - 2)}
          </strong>
        );
      } else if (val.startsWith('`') && val.endsWith('`')) {
        parts.push(
          <code key={match.index} className="bg-slate-800 text-blue-400 px-1 py-0.5 rounded font-mono text-[11px]">
            {val.substring(1, val.length - 1)}
          </code>
        );
      } else if (val.startsWith('$') && val.endsWith('$')) {
        parts.push(
          <span key={match.index} className="font-mono text-emerald-400 italic">
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
        <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1 flex items-center gap-1.5">
          {formatInlineText(trimmed.replace('### ', ''))}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={idx} className="text-sm font-bold text-white mt-3 mb-1">
          {formatInlineText(trimmed.replace('## ', ''))}
        </h2>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={idx} className="ml-4 list-disc text-xs text-slate-300 my-0.5">
          {formatInlineText(trimmed.substring(2))}
        </li>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={idx} className="border-l-2 border-amber-500 bg-amber-950/40 px-3 py-1.5 rounded-r-lg text-xs text-amber-200 my-2">
          {formatInlineText(trimmed.substring(2))}
        </div>
      );
    } else if (trimmed !== '') {
      elements.push(
        <p key={idx} className="text-xs text-slate-300 my-1 leading-relaxed">
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

export default function PayrollCopilotCard({ totalPayout = 0, recordCount = 0 }) {
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
    scrollToBottom();
  }, [messages]);

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

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: `Hello! I am **Payroll Copilot AI**, your intelligent assistant for employee lookups, Tunisian statutory tax rules, and platform onboarding.`,
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-blue-500/20 shadow-xl shadow-blue-500/5 relative overflow-hidden flex flex-col justify-between">
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold tracking-wide text-white">Payroll Copilot</h4>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded font-extrabold tracking-wider uppercase shadow-sm">
              AI
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-slate-400 hover:text-white transition p-1"
            title="Reset conversation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Glowing Animated AI Orb */}
        <div className="relative h-16 flex items-center justify-center my-1">
          <div className="absolute w-14 h-14 bg-blue-500/25 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute w-18 h-18 bg-indigo-500/15 rounded-full blur-2xl animate-ping duration-1000"></div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-400 shadow-lg shadow-blue-500/50 flex items-center justify-center border border-blue-300/40">
            <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
          </div>
        </div>

        {/* Interactive Scrollable Chat Container */}
        <div className="min-h-[140px] max-h-[260px] overflow-y-auto bg-slate-950/70 border border-blue-900/40 rounded-xl p-3 my-2 text-[11px] text-slate-200 leading-relaxed font-sans space-y-3 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-indigo-600 text-amber-300 shadow-sm'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
              </div>

              <div
                className={`max-w-[85%] p-2.5 rounded-xl shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                {msg.sender === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <SimpleMarkdownFormatter content={msg.text} />
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center space-x-2 text-blue-400 py-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing context &amp; tax laws...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="py-1 overflow-x-auto flex items-center space-x-1.5 scrollbar-none my-1">
          {QUICK_SUGGESTIONS.map((sug, i) => {
            const Icon = sug.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(sug.label)}
                disabled={isLoading}
                className="whitespace-nowrap shrink-0 flex items-center space-x-1 bg-slate-800/90 hover:bg-blue-900/50 text-slate-300 hover:text-white border border-slate-700/80 px-2 py-1 rounded-lg text-[10px] transition font-medium"
              >
                <Icon className="w-2.5 h-2.5 text-blue-400" />
                <span>{sug.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-2.5 flex items-center bg-slate-800/90 border border-slate-700/80 rounded-full px-3 py-1.5 focus-within:border-blue-500 transition"
      >
        <Paperclip className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0 cursor-pointer hover:text-slate-200" />
        <input
          className="bg-transparent border-none text-[11px] w-full focus:outline-none text-slate-100 placeholder-slate-400"
          placeholder="Ask about overtime, employee records, tax rules..."
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <Mic className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-200" />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="w-6.5 h-6.5 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white flex items-center justify-center text-xs shadow-md transition p-1"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
