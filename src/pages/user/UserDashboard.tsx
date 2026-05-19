import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../context/useAuth';
import { Scale, Plus, MessageSquare, X, LogOut, Send, Paperclip, Menu, Square, RefreshCw, Pencil, Check, FileText, Loader2, Copy } from 'lucide-react';
import {
  apiListConversations,
  apiCreateConversation,
  apiUploadChatAttachment,
  apiDeleteConversation,
  apiRenameConversation,
  apiGetConversationMessages,
  WS_BASE_URL,
} from '../../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  streaming?: boolean;
  attachment?: { filename: string };
}

type AttachStatus = 'idle' | 'pending' | 'uploading' | 'ready' | 'error';

interface AttachmentState {
  status: AttachStatus;
  file: File | null;
  result: { filename: string; text: string } | null;
  error?: string;
}

const ATTACH_IDLE: AttachmentState = { status: 'idle', file: null, result: null };

interface Session {
  id: number;
  case_id: string | null;
  title: string;
  messages: Message[];
  loaded: boolean;
}

function uid() { return `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function parseFileFromContent(content: string): { text: string; fileName: string | null } {
  const match = content.match(/^([\s\S]*?)\s*\[([^\]]+)\]$/);
  if (match) return { text: match[1], fileName: match[2] };
  return { text: content, fileName: null };
}

const SUGGESTIONS = [
  'What Malaysian laws apply to money laundering?',
  'Explain AMLA 2001 and its key provisions',
  'What are common red flags for financial crime?',
];

const UserDashboard: React.FC = () => {
  const { user, logout, getValidAccessToken } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attachment, setAttachment] = useState<AttachmentState>(ATTACH_IDLE);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsConvIdRef = useRef<number | null>(null);
  const currentAiMsgIdRef = useRef<string | null>(null);
  const sessionIdForWsRef = useRef<number | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const uploadReqIdRef = useRef(0);
  // Typewriter streaming: backend tokens land in this buffer, a timer flushes
  // 1 char per tick (adaptive catch-up if backend gets ahead).
  const streamBufferRef = useRef<string>('');
  const streamFinalRef = useRef<{ sources?: string[] } | null>(null);
  const flushTimerRef = useRef<number | null>(null);

  const activeSession = sessions.find(s => s.id === activeId) ?? null;

  useEffect(() => {
    if (!user) return;
    apiListConversations(user.accessToken)
      .then(convs => {
        setSessions(convs.map(c => ({
          id: c.id,
          case_id: c.case_id,
          title: c.title,
          messages: [],
          loaded: false,
        })));
      })
      .catch(() => { /* ignore — user sees empty sidebar */ });
  }, [user]);

  useEffect(() => {
    if (!userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSession?.messages]);

  const handleChatScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledRef.current = !atBottom;
  };

  // Auto-resize textarea
  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // Focus rename input when editing
  useEffect(() => {
    if (renamingId !== null) renameInputRef.current?.focus();
  }, [renamingId]);

  // ── Typewriter flusher ──────────────────────────────────────────
  const stopFlusher = useCallback(() => {
    if (flushTimerRef.current != null) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const finalizeStream = useCallback((overrideContent?: string) => {
    const aiMsgId = currentAiMsgIdRef.current;
    const convId = sessionIdForWsRef.current;
    const final = streamFinalRef.current;
    stopFlusher();
    streamBufferRef.current = '';
    streamFinalRef.current = null;
    if (aiMsgId && convId) {
      setSessions(prev => prev.map(s => s.id !== convId ? s : {
        ...s,
        messages: s.messages.map(m =>
          m.id !== aiMsgId ? m : {
            ...m,
            ...(overrideContent != null ? { content: overrideContent } : {}),
            sources: final?.sources ?? m.sources,
            streaming: false,
          }
        ),
      }));
    }
    currentAiMsgIdRef.current = null;
    setBusy(false);
  }, [stopFlusher]);

  const startFlusher = useCallback(() => {
    if (flushTimerRef.current != null) return;
    flushTimerRef.current = window.setInterval(() => {
      const aiMsgId = currentAiMsgIdRef.current;
      const convId = sessionIdForWsRef.current;
      const buf = streamBufferRef.current;
      if (!aiMsgId || !convId) {
        streamBufferRef.current = '';
        stopFlusher();
        return;
      }
      if (buf.length === 0) {
        if (streamFinalRef.current) finalizeStream();
        return;
      }
      // Adaptive: if buffer is large, take more chars per tick so we catch up.
      const take = buf.length > 240 ? 8 : buf.length > 80 ? 3 : 1;
      const slice = buf.slice(0, take);
      streamBufferRef.current = buf.slice(take);
      setSessions(prev => prev.map(s => s.id !== convId ? s : {
        ...s,
        messages: s.messages.map(m =>
          m.id !== aiMsgId ? m : { ...m, content: m.content + slice }
        ),
      }));
    }, 18);
  }, [stopFlusher, finalizeStream]);

  const closeWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    wsConvIdRef.current = null;
    stopFlusher();
    streamBufferRef.current = '';
    streamFinalRef.current = null;
  }, [stopFlusher]);

  const connectWs = useCallback(async (conversationId: number): Promise<WebSocket> => {
    if (wsRef.current && wsConvIdRef.current === conversationId && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    closeWs();

    let wsToken: string;
    try {
      wsToken = await getValidAccessToken();
    } catch {
      window.dispatchEvent(new CustomEvent('finguard:unauthorized'));
      throw new Error('Authentication failed');
    }

    const ws = new WebSocket(`${WS_BASE_URL}/chat/ws/${conversationId}`);

    await new Promise<void>((resolve, reject) => {
      ws.onerror = () => reject(new Error('WebSocket connection failed'));
      ws.onopen = () => {
        ws.send(JSON.stringify({ token: wsToken }));
        resolve();
      };
    });

    ws.onmessage = (event: MessageEvent) => {
      let data: { type: string; content?: string; sources?: string[]; detail?: string };
      try { data = JSON.parse(event.data as string); } catch { return; }

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      const aiMsgId = currentAiMsgIdRef.current;
      const convId = sessionIdForWsRef.current;
      if (!aiMsgId || !convId) return;

      if (data.type === 'token') {
        streamBufferRef.current += data.content ?? '';
        startFlusher();
      } else if (data.type === 'done' || data.type === 'stopped') {
        // Mark for finalize; flusher will drain the buffer first.
        streamFinalRef.current = { sources: data.sources };
        startFlusher();
      } else if (data.type === 'error') {
        // Errors replace content immediately — skip the typewriter.
        finalizeStream(data.detail ?? 'An error occurred.');
      }
    };

    ws.onclose = (event: CloseEvent) => {
      const aiMsgId = currentAiMsgIdRef.current;
      const convId = sessionIdForWsRef.current;
      if (aiMsgId && convId && event.code !== 1000 && event.code !== 1005) {
        // Drain anything still in the typewriter buffer, then mark error.
        const pending = streamBufferRef.current;
        streamBufferRef.current = '';
        streamFinalRef.current = null;
        stopFlusher();
        setSessions(prev => prev.map(s => s.id !== convId ? s : {
          ...s,
          messages: s.messages.map(m =>
            m.id !== aiMsgId ? m : {
              ...m,
              content: (m.content + pending) || 'Connection lost. Please try again.',
              streaming: false,
            }
          ),
        }));
        currentAiMsgIdRef.current = null;
        setBusy(false);
      }
      wsRef.current = null;
      wsConvIdRef.current = null;
    };

    wsRef.current = ws;
    wsConvIdRef.current = conversationId;
    return ws;
  }, [closeWs, getValidAccessToken, startFlusher, finalizeStream, stopFlusher]);

  useEffect(() => {
    return () => { closeWs(); };
  }, [closeWs]);

  const selectConversation = useCallback(async (id: number) => {
    if (wsConvIdRef.current && wsConvIdRef.current !== id) closeWs();
    userScrolledRef.current = false;
    setActiveId(id);
    setSessions(prev => {
      const s = prev.find(x => x.id === id);
      if (!s || s.loaded) return prev;
      return prev.map(x => x.id === id ? { ...x, loaded: true } : x);
    });

    const session = sessions.find(s => s.id === id);
    if (!session?.loaded) {
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
            attachment: m.attachment_filename ? { filename: m.attachment_filename } : undefined,
          })),
        }));
      } catch { /* leave messages empty */ }
    }

    connectWs(id).catch(() => { /* will retry on send */ });
  }, [sessions, user, closeWs, connectWs]);

  const startNewChat = () => {
    closeWs();
    setActiveId(null);
    setInput('');
    setSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const deleteSession = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (wsConvIdRef.current === id) closeWs();
    try {
      await apiDeleteConversation(user!.accessToken, id);
    } catch { /* ignore */ }
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  // ── Rename conversation ──
  const startRename = (e: React.MouseEvent, id: number, currentTitle: string) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const submitRename = async (id: number) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingId(null); return; }
    try {
      await apiRenameConversation(user!.accessToken, id, trimmed);
      setSessions(prev => prev.map(s => s.id !== id ? s : { ...s, title: trimmed }));
    } catch { /* ignore */ }
    setRenamingId(null);
  };

  const copyMessage = (id: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  };

  const handleLogout = () => {
    closeWs();
    logout();
    navigate('/', { replace: true });
  };

  const clearAttachment = useCallback(() => {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    uploadReqIdRef.current += 1;
    setAttachment(ATTACH_IDLE);
  }, []);

  const uploadAttachment = useCallback(async (file: File, conversationId: number) => {
    if (!user) return;
    uploadAbortRef.current?.abort();
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    const reqId = ++uploadReqIdRef.current;

    setAttachment({ status: 'uploading', file, result: null });

    try {
      const result = await apiUploadChatAttachment(user.accessToken, conversationId, file, controller.signal);
      if (reqId !== uploadReqIdRef.current) return;
      setAttachment({
        status: 'ready', file,
        result: { filename: result.filename, text: result.text },
      });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      if (reqId !== uploadReqIdRef.current) return;
      setAttachment({
        status: 'error', file, result: null,
        error: err instanceof Error ? err.message : 'Failed to process attachment. Please try again.',
      });
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
    const allowed = ['.pdf', '.txt', '.csv', '.md'];
    if (!allowed.includes(ext)) {
      setAttachment({
        status: 'error', file, result: null,
        error: `Unsupported file type. Allowed: ${allowed.join(', ')}`,
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAttachment({
        status: 'error', file, result: null,
        error: 'File exceeds 10 MB limit.',
      });
      return;
    }

    // If we have a conversation, upload immediately. Otherwise defer to send.
    if (activeId != null) {
      uploadAttachment(file, activeId);
    } else {
      setAttachment({ status: 'pending', file, result: null });
    }
  };

  // ── Stop generating ──
  const stopGenerating = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
  };

  // ── Regenerate last response ──
  const regenerate = async () => {
    if (busy || !activeId || !activeSession) return;
    userScrolledRef.current = false;
    const msgs = activeSession.messages;
    if (msgs.length < 2) return;

    // Remove the last assistant message from UI
    const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant) return;

    const aiMsgId = uid();

    setSessions(prev => prev.map(s => s.id !== activeId ? s : {
      ...s,
      messages: [
        ...s.messages.filter(m => m.id !== lastAssistant.id),
        { id: aiMsgId, role: 'assistant' as const, content: '', streaming: true },
      ],
    }));

    setBusy(true);
    currentAiMsgIdRef.current = aiMsgId;
    sessionIdForWsRef.current = activeId;

    try {
      const ws = await connectWs(activeId);
      ws.send(JSON.stringify({ type: 'regenerate' }));
    } catch (err) {
      const isAuthError = err instanceof Error && err.message === 'Authentication failed';
      setSessions(prev => prev.map(s => s.id !== activeId ? s : {
        ...s,
        messages: isAuthError
          ? s.messages.filter(m => m.id !== aiMsgId)
          : s.messages.map(m =>
              m.id !== aiMsgId ? m : { ...m, content: err instanceof Error ? err.message : 'An error occurred. Please try again.', streaming: false }
            ),
      }));
      currentAiMsgIdRef.current = null;
      setBusy(false);
    }
  };

  const send = async (question: string) => {
    if (!question.trim() || busy || attachment.status === 'uploading') return;
    const currentAttachment = attachment;
    const currentFile = currentAttachment.file;
    userScrolledRef.current = false;
    setBusy(true);
    setInput('');
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }, 0);

    let sessionId = activeId;
    if (!sessionId) {
      const title = question.slice(0, 50) + (question.length > 50 ? '...' : '');
      try {
        const conv = await apiCreateConversation(user!.accessToken, title);
        setSessions(prev => [{
          id: conv.id, case_id: null, title: conv.title, messages: [], loaded: true,
        }, ...prev]);
        setActiveId(conv.id);
        sessionId = conv.id;
      } catch (err) {
        setBusy(false);
        setAttachment({
          status: 'error', file: currentFile, result: null,
          error: err instanceof Error ? err.message : 'Failed to create conversation. Please try again.',
        });
        return;
      }
    }

    // Resolve file_context: use cached result if ready; upload now if pending.
    let fileContext: { filename: string; text: string } | null = null;
    if (currentAttachment.status === 'ready' && currentAttachment.result) {
      fileContext = currentAttachment.result;
    } else if (currentAttachment.status === 'pending' && currentFile && sessionId) {
      setAttachment(a => ({ ...a, status: 'uploading' }));
      try {
        const result = await apiUploadChatAttachment(user!.accessToken, sessionId, currentFile);
        fileContext = { filename: result.filename, text: result.text };
      } catch (err) {
        setAttachment({
          status: 'error', file: currentFile, result: null,
          error: err instanceof Error ? err.message : 'Failed to process attachment. Please try again.',
        });
        setBusy(false);
        return;
      }
    }

    // Attachment consumed — clear local state so next message starts fresh.
    clearAttachment();

    const userMsgId = uid();
    const aiMsgId = uid();

    setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
      ...s,
      messages: [
        ...s.messages,
        {
          id: userMsgId,
          role: 'user' as const,
          content: question,
          attachment: currentFile ? { filename: currentFile.name } : undefined,
        },
        { id: aiMsgId, role: 'assistant' as const, content: '', streaming: true },
      ],
    }));

    currentAiMsgIdRef.current = aiMsgId;
    sessionIdForWsRef.current = sessionId;

    try {
      const ws = await connectWs(sessionId!);
      const payload: Record<string, unknown> = { question };
      if (fileContext) payload.file_context = fileContext;
      ws.send(JSON.stringify(payload));
    } catch (err) {
      const isAuthError = err instanceof Error && err.message === 'Authentication failed';
      setSessions(prev => prev.map(s => s.id !== sessionId ? s : {
        ...s,
        messages: isAuthError
          ? s.messages.filter(m => m.id !== aiMsgId)
          : s.messages.map(m =>
              m.id !== aiMsgId ? m : { ...m, content: err instanceof Error ? err.message : 'An error occurred. Please try again.', streaming: false }
            ),
      }));
      currentAiMsgIdRef.current = null;
      setBusy(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  // Check if last message is from assistant and not streaming (for regenerate button)
  const canRegenerate = activeSession
    && activeSession.messages.length >= 2
    && !busy
    && activeSession.messages[activeSession.messages.length - 1]?.role === 'assistant'
    && !activeSession.messages[activeSession.messages.length - 1]?.streaming;

  return (
    <div className="ch-root">

      {/* ── Mobile sidebar overlay ── */}
      <div
        className={`ch-sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ── */}
      <aside className={`ch-sidebar${sidebarOpen ? ' ch-sidebar--open' : ''}`} aria-label="Chat navigation">
        <div className="ch-sidebar-head">
          <div className="ch-brand">
            <div className="ch-brand-mark" aria-hidden="true">F</div>
            <div>
              <div className="ch-brand-name">FinGuardMY</div>
              <div className="ch-brand-sub">Financial Crime AI</div>
            </div>
          </div>
        </div>

        <div className="ch-sidebar-body">
          <button className="ch-new-btn" onClick={startNewChat}>
            <Plus size={13} strokeWidth={2.5} aria-hidden="true" />
            New Chat
          </button>

          {sessions.length > 0 && (
            <nav className="ch-history" aria-label="Chat history">
              <div className="ch-history-label">Recent</div>
              {sessions.map(s => (
                <button
                  key={s.id}
                  className={`ch-session-item${s.id === activeId ? ' active' : ''}`}
                  onClick={() => { selectConversation(s.id); setSidebarOpen(false); }}
                  aria-current={s.id === activeId ? 'page' : undefined}
                >
                  <MessageSquare size={12} aria-hidden="true" />
                  {renamingId === s.id ? (
                    <input
                      ref={renameInputRef}
                      className="ch-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename(s.id);
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={() => submitRename(s.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="ch-session-title">{s.title}</span>
                  )}
                  <span className="ch-session-actions">
                    {renamingId === s.id ? (
                      <span
                        className="ch-session-action"
                        role="button"
                        aria-label="Confirm rename"
                        onClick={(e) => { e.stopPropagation(); submitRename(s.id); }}
                      >
                        <Check size={11} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    ) : (
                      <span
                        className="ch-session-action"
                        role="button"
                        aria-label={`Rename ${s.title}`}
                        onClick={(e) => startRename(e, s.id, s.title)}
                      >
                        <Pencil size={10} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                    <span
                      className="ch-session-action"
                      role="button"
                      aria-label={`Delete ${s.title}`}
                      onClick={(e) => deleteSession(e, s.id)}
                    >
                      <X size={11} strokeWidth={2.5} aria-hidden="true" />
                    </span>
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
          <button className="ch-logout-btn" onClick={() => setShowLogoutConfirm(true)} aria-label="Log out">
            <LogOut size={15} aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ch-main">

        {/* Mobile header */}
        <div className="ch-mobile-header">
          <button
            className="ch-mobile-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="ch-mobile-header-brand">
            <div className="ch-brand-mark" aria-hidden="true">F</div>
            <span className="ch-mobile-brand-name">FinGuardMY</span>
          </div>
        </div>

        {/* Empty state */}
        {(!activeSession || activeSession.messages.length === 0) && (
          <div className="ch-empty">
            <div className="ch-empty-icon" aria-hidden="true">
              <Scale size={34} strokeWidth={1.5} />
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
          <div ref={scrollContainerRef} className="ch-messages" role="log" aria-label="Conversation" aria-live="polite" onScroll={handleChatScroll}>
            {activeSession.messages.map(msg => (
              <div key={msg.id} className={`ch-msg-row ch-msg-${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="ch-ai-avatar" aria-hidden="true">F</div>
                )}
                {msg.role === 'assistant' ? (
                  <div className="ch-msg-col">
                    <div className="ch-bubble ch-bubble-assistant">
                      <div className="ch-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.streaming && !msg.content && (
                        <span className="ch-typing-dots" aria-label="Generating response">
                          <span /><span /><span />
                        </span>
                      )}
                      {msg.streaming && msg.content && (
                        <span className="ch-cursor" aria-hidden="true" />
                      )}
                    </div>
                    {!msg.streaming && msg.content && (
                      <div className="ch-msg-actions">
                        <button
                          className="ch-copy-btn"
                          onClick={() => copyMessage(msg.id, msg.content)}
                          aria-label="Copy message"
                        >
                          {copiedId === msg.id
                            ? <><Check size={12} strokeWidth={2.5} />Copied</>
                            : <><Copy size={12} strokeWidth={2} />Copy</>
                          }
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                <div className={`ch-bubble ch-bubble-${msg.role}`}>
                  {(() => {
                    // Prefer structured attachment field; fall back to legacy [filename] suffix in stored content.
                    const parsed = msg.attachment ? null : parseFileFromContent(msg.content);
                    const fileName = msg.attachment?.filename ?? parsed?.fileName ?? null;
                    const text     = msg.attachment ? msg.content : (parsed?.text ?? msg.content);
                    return (
                      <>
                        {fileName && (
                          <div className="ch-msg-file-chip">
                            <div className="ch-msg-file-chip-icon">
                              <FileText size={15} />
                            </div>
                            <div className="ch-msg-file-chip-info">
                              <span className="ch-msg-file-chip-name">{fileName}</span>
                              <span className="ch-msg-file-chip-type">
                                {fileName.split('.').pop()?.toUpperCase() ?? 'FILE'}
                              </span>
                            </div>
                          </div>
                        )}
                        {text && <span>{text}</span>}
                      </>
                    );
                  })()}
                  {msg.streaming && !msg.content && (
                    <span className="ch-typing-dots" aria-label="Generating response">
                      <span /><span /><span />
                    </span>
                  )}
                  {msg.streaming && msg.content && (
                    <span className="ch-cursor" aria-hidden="true" />
                  )}
                </div>
                )}
              </div>
            ))}
            {/* Regenerate button after last assistant message */}
            {canRegenerate && (
              <div className="ch-regenerate-row">
                <button className="ch-regenerate-btn" onClick={regenerate} aria-label="Regenerate response">
                  <RefreshCw size={13} strokeWidth={2.2} />
                  Regenerate
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <div className="ch-input-area">
          {attachment.status === 'error' && attachment.error && (
            <div className="ch-file-chip" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }}>
              <span className="ch-file-chip-name">{attachment.error}</span>
              <button
                className="ch-file-chip-remove"
                onClick={clearAttachment}
                aria-label="Dismiss error"
                style={{ color: '#dc2626' }}
              >
                <X size={11} />
              </button>
            </div>
          )}
          {attachment.file && attachment.status !== 'error' && (
            <div className={`ch-file-card${attachment.status === 'uploading' ? ' ch-file-card--uploading' : ''}${attachment.status === 'ready' ? ' ch-file-card--ready' : ''}`}>
              <div className="ch-file-card-icon">
                {attachment.status === 'ready' ? <Check size={18} /> : <FileText size={18} />}
              </div>
              <div className="ch-file-card-info">
                <span className="ch-file-card-name">{attachment.file.name}</span>
                <span className="ch-file-card-meta">
                  {attachment.status === 'uploading' && 'Processing…'}
                  {attachment.status === 'pending'   && 'Will upload on send'}
                  {attachment.status === 'ready'     && 'Ready'}
                </span>
              </div>
              {attachment.status === 'uploading' ? (
                <Loader2 size={14} className="ch-file-card-spinner" />
              ) : (
                <button
                  className="ch-file-card-remove"
                  onClick={clearAttachment}
                  aria-label="Remove attachment"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
          <div className="ch-input-box">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.csv,.md"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <button
              className="ch-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy || attachment.status === 'uploading'}
              aria-label="Attach file"
              title="Attach a case PDF to analyse"
            >
              <Paperclip size={15} />
            </button>
            <textarea
              ref={textareaRef}
              className="ch-textarea"
              rows={1}
              value={input}
              onChange={e => { setInput(e.target.value); resizeTextarea(); }}
              onKeyDown={onKeyDown}
              placeholder="Ask about financial crime laws, regulations, or case analysis..."
              disabled={busy}
              aria-label="Message input"
              aria-multiline="true"
            />
            {busy ? (
              <button
                className="ch-stop-btn"
                onClick={stopGenerating}
                aria-label="Stop generating"
              >
                <Square size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
              </button>
            ) : (
              <button
                className="ch-send-btn"
                onClick={() => send(input)}
                disabled={!input.trim() || attachment.status === 'uploading'}
                title={attachment.status === 'uploading' ? 'Waiting for attachment to process…' : undefined}
                aria-label="Send message"
              >
                <Send size={15} strokeWidth={2.5} aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="ch-input-note">
            FinGuardMY may make mistakes. Verify important findings with official sources.
          </p>
        </div>

      </main>

      {showLogoutConfirm && (
        <div className="ch-logout-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="ch-logout-modal" onClick={e => e.stopPropagation()}>
            <div className="ch-logout-modal-title">Sign Out</div>
            <div className="ch-logout-modal-body">Are you sure you want to sign out?</div>
            <div className="ch-logout-modal-footer">
              <button className="ch-logout-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="ch-logout-confirm" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
