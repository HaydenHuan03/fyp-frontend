import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  apiListConversations,
  apiCreateConversation,
  apiDeleteConversation,
  apiGetConversationMessages,
  WS_BASE_URL,
} from '../../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  streaming?: boolean;
}

interface Session {
  id: number;
  title: string;
  messages: Message[];
  loaded: boolean;
}

let _msgId = 0;
function uid() { return `${++_msgId}`; }

function shortSource(s: string) {
  return s.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
}

const SUGGESTIONS = [
  'What Malaysian laws apply to money laundering?',
  'Explain AMLA 2001 and its key provisions',
  'What are common red flags for financial crime?',
];

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeSession = sessions.find(s => s.id === activeId) ?? null;

  // Load conversations on mount
  useEffect(() => {
    if (!user) return;
    apiListConversations(user.accessToken)
      .then(convs => {
        setSessions(convs.map(c => ({
          id: c.id,
          title: c.title,
          messages: [],
          loaded: false,
        })));
      })
      .catch(() => { /* ignore — user sees empty sidebar */ });
  }, [user]);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages]);

  // Auto-resize textarea
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const selectConversation = useCallback(async (id: number) => {
    setActiveId(id);
    setSessions(prev => {
      const s = prev.find(x => x.id === id);
      if (!s || s.loaded) return prev;
      // Mark as loading so we don't double-fetch
      return prev.map(x => x.id === id ? { ...x, loaded: true } : x);
    });

    // Need to check loaded state before fetch — use local ref to avoid stale closure
    const session = sessions.find(s => s.id === id);
    if (session?.loaded) return;

    try {
      const msgs = await apiGetConversationMessages(user!.accessToken, id);
      setSessions(prev => prev.map(s => s.id !== id ? s : {
        ...s,
        loaded: true,
        messages: msgs.map(m => ({
          id: String(m.id),
          role: m.role as 'user' | 'assistant',
          content: m.content,
          sources: m.sources ?? undefined,
        })),
      }));
    } catch { /* leave messages empty */ }
  }, [sessions, user]);

  const startNewChat = () => {
    setActiveId(null);
    setInput('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const deleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await apiDeleteConversation(user!.accessToken, id);
    } catch { /* ignore */ }
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const send = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setInput('');
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }, 0);

    // Create conversation on first message if none active
    let sessionId = activeId;
    if (!sessionId) {
      let conv;
      try {
        conv = await apiCreateConversation(
          user!.accessToken,
          question.slice(0, 50) + (question.length > 50 ? '…' : ''),
        );
      } catch {
        setBusy(false);
        return;
      }
      setSessions(prev => [{
        id: conv.id, title: conv.title, messages: [], loaded: true,
      }, ...prev]);
      setActiveId(conv.id);
      sessionId = conv.id;
    }

    const userMsgId = uid();
    const aiMsgId = uid();

    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      messages: [
        ...s.messages,
        { id: userMsgId, role: 'user' as const, content: question },
        { id: aiMsgId, role: 'assistant' as const, content: '', streaming: true },
      ],
    }));

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/chat/ws/${sessionId}`);

      await new Promise<void>((resolve, reject) => {
        ws.onerror = () => reject(new Error('WebSocket connection failed'));

        ws.onopen = () => {
          // Step 1: authenticate
          ws.send(JSON.stringify({ token: user!.accessToken }));
          // Step 2: send question
          ws.send(JSON.stringify({ question }));

          ws.onmessage = (event: MessageEvent) => {
            let data: { type: string; content?: string; sources?: string[]; detail?: string };
            try { data = JSON.parse(event.data as string); } catch { return; }

            if (data.type === 'token') {
              setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
                ...s,
                messages: s.messages.map(m =>
                  m.id !== aiMsgId ? m : { ...m, content: m.content + (data.content ?? '') }
                ),
              }));
            } else if (data.type === 'done') {
              setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
                ...s,
                messages: s.messages.map(m =>
                  m.id !== aiMsgId ? m : { ...m, sources: data.sources, streaming: false }
                ),
              }));
              ws.close();
              resolve();
            } else if (data.type === 'error') {
              reject(new Error(data.detail ?? 'Unknown error'));
            }
          };

          ws.onclose = (event: CloseEvent) => {
            if (event.code !== 1000 && event.code !== 1005) {
              reject(new Error(`Connection closed: ${event.reason || event.code}`));
            }
          };
        };
      });
    } catch {
      setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
        ...s,
        messages: s.messages.map(m =>
          m.id !== aiMsgId ? m : {
            ...m,
            content: 'An error occurred. Please try again.',
            streaming: false,
          }
        ),
      }));
    } finally {
      setBusy(false);
      setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
        ...s,
        messages: s.messages.map(m =>
          m.id !== aiMsgId ? m : { ...m, streaming: false }
        ),
      }));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="ch-root">

      {/* ── Sidebar ── */}
      <aside className="ch-sidebar" aria-label="Chat navigation">
        <div className="ch-sidebar-head">
          <div className="ch-brand">
            <div className="ch-brand-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 6l9-3 9 3M3 6v6c0 4.97 4.03 9 9 9s9-4.03 9-9V6" />
              </svg>
            </div>
            <div>
              <div className="ch-brand-name">FinGuardMY</div>
              <div className="ch-brand-sub">Financial Crime AI</div>
            </div>
          </div>
        </div>

        <div className="ch-sidebar-body">
          <button className="ch-new-btn" onClick={startNewChat}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </button>

          {sessions.length > 0 && (
            <nav className="ch-history" aria-label="Chat history">
              <div className="ch-history-label">Recent</div>
              {sessions.map(s => (
                <button
                  key={s.id}
                  className={`ch-session-item${s.id === activeId ? ' active' : ''}`}
                  onClick={() => selectConversation(s.id)}
                  aria-current={s.id === activeId ? 'page' : undefined}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <span className="ch-session-title">{s.title}</span>
                  <span
                    className="ch-session-delete"
                    role="button"
                    aria-label={`Delete ${s.title}`}
                    onClick={(e) => deleteSession(e, s.id)}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </span>
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="ch-sidebar-foot">
          <div className="ch-user-row">
            <div className="ch-user-avatar" aria-hidden="true">
              {user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="ch-user-info">
              <div className="ch-user-email">{user?.email}</div>
              <div className="ch-user-role">{user?.role}</div>
            </div>
          </div>
          <button className="ch-logout-btn" onClick={handleLogout} aria-label="Log out">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ch-main">

        {/* Empty state */}
        {(!activeSession || activeSession.messages.length === 0) && (
          <div className="ch-empty">
            <div className="ch-empty-icon" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 6l9-3 9 3M3 6v6c0 4.97 4.03 9 9 9s9-4.03 9-9V6" />
              </svg>
            </div>
            <h1 className="ch-empty-title">How can I assist your investigation?</h1>
            <p className="ch-empty-sub">
              Ask about financial crime laws, regulations, or case analysis
            </p>
            <div className="ch-suggestions" role="list">
              {SUGGESTIONS.map(s => (
                <button key={s} className="ch-suggestion" role="listitem" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {activeSession && activeSession.messages.length > 0 && (
          <div className="ch-messages" role="log" aria-label="Conversation" aria-live="polite">
            {activeSession.messages.map(msg => (
              <div key={msg.id} className={`ch-msg-row ch-msg-${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ch-ai-avatar" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v18M3 6l9-3 9 3M3 6v6c0 4.97 4.03 9 9 9s9-4.03 9-9V6" />
                    </svg>
                  </div>
                )}
                <div className={`ch-bubble ch-bubble-${msg.role}`}>
                  <span>{msg.content}</span>
                  {msg.streaming && !msg.content && (
                    <span className="ch-typing-dots" aria-label="Generating response">
                      <span /><span /><span />
                    </span>
                  )}
                  {msg.streaming && msg.content && (
                    <span className="ch-cursor" aria-hidden="true" />
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="ch-sources">
                      <span className="ch-sources-label">Sources</span>
                      {msg.sources.map((src, i) => (
                        <span key={i} className="ch-source-chip" title={src}>
                          {shortSource(src)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div className="ch-input-area">
          <div className="ch-input-box">
            <textarea
              ref={textareaRef}
              className="ch-textarea"
              rows={1}
              value={input}
              onChange={e => { setInput(e.target.value); resizeTextarea(); }}
              onKeyDown={onKeyDown}
              placeholder="Ask about financial crime laws, regulations, or case analysis…"
              disabled={busy}
              aria-label="Message input"
              aria-multiline="true"
            />
            <button
              className="ch-send-btn"
              onClick={() => send(input)}
              disabled={!input.trim() || busy}
              aria-label="Send message"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="ch-input-note">
            FinGuardMY may make mistakes. Verify important findings with official sources.
          </p>
        </div>

      </main>
    </div>
  );
};

export default UserDashboard;
