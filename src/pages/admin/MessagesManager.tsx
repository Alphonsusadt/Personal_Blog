import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Mail, Inbox, Search, Clock, CheckCircle2, MessageSquare, Plus,
  Globe, Calendar, User, Send, AlertCircle, RefreshCw
} from 'lucide-react';

interface Reply {
  senderEmail: string;
  body: string;
  sentAt: string;
}

interface Message {
  _id?: string;
  id: string;
  name: string;
  email: string | null;
  subject: string;
  body: string;
  status: 'pending_reply' | 'read_only' | 'replied';
  language: 'id' | 'en';
  replies: Reply[];
  createdAt: string;
  updatedAt: string;
}

export function MessagesManager() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter and search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_reply' | 'read_only' | 'replied'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sender email states
  const [senderEmails, setSenderEmails] = useState<string[]>([]);
  const [selectedSenderEmail, setSelectedSenderEmail] = useState('');
  const [newSenderInput, setNewSenderInput] = useState('');
  const [showNewSenderForm, setShowNewSenderForm] = useState(false);

  // Composer reply state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });

  // Fetch messages and outbox settings
  const fetchData = async () => {
    try {
      setLoading(true);
      const [messagesData, settingsData] = await Promise.all([
        api.getAdminMessages(),
        api.getAdminSettings()
      ]);
      
      setMessages(messagesData || []);
      
      // Load sender emails from global settings
      const emailsList = Array.isArray(settingsData?.senderEmails) ? settingsData.senderEmails : [];
      setSenderEmails(emailsList);
      
      const activeEmail = typeof settingsData?.activeSenderEmail === 'string' ? settingsData.activeSenderEmail : '';
      setSelectedSenderEmail(activeEmail || emailsList[0] || '');
      
      // Keep previous selected message reference if exists
      if (selectedMessage) {
        const updatedSelected = messagesData.find((m: Message) => m.id === selectedMessage.id);
        if (updatedSelected) setSelectedMessage(updatedSelected);
      } else if (messagesData.length > 0) {
        setSelectedMessage(messagesData[0]);
      }
    } catch (err) {
      console.error('Failed to fetch inbox data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Quick inline add new sender email
  const handleAddSenderEmail = async () => {
    const trimmed = newSenderInput.trim();
    if (!trimmed) return;
    if (!trimmed.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    if (senderEmails.includes(trimmed)) {
      alert('This email is already in your selectable list.');
      return;
    }

    try {
      const updatedList = [...senderEmails, trimmed];
      
      // Fetch latest settings to avoid overwriting other fields
      const currentSettings = await api.getAdminSettings({ force: true });
      const nextSettings = {
        ...currentSettings,
        senderEmails: updatedList,
        activeSenderEmail: selectedSenderEmail || trimmed
      };

      await api.put('/api/settings', nextSettings);
      
      setSenderEmails(updatedList);
      setSelectedSenderEmail(trimmed);
      setNewSenderInput('');
      setShowNewSenderForm(false);
    } catch (err) {
      console.error('Failed to add sender email:', err);
      alert('Failed to save email to settings.');
    }
  };

  // Submit email reply via backend Resend
  const handleSendReply = async () => {
    if (!selectedMessage) return;
    if (!selectedSenderEmail) {
      alert('Please select or add a sender email address.');
      return;
    }
    if (!replyText.trim()) {
      alert('Please write a reply message first.');
      return;
    }

    try {
      setSendingReply(true);
      setReplyStatus({ type: '', message: '' });

      const response = await api.sendMessageReply(selectedMessage.id, {
        senderEmail: selectedSenderEmail,
        messageText: replyText
      });

      if (response.success) {
        setReplyStatus({ type: 'success', message: 'Reply email sent successfully!' });
        setReplyText('');
        
        // Refresh inbox data to show new threaded reply logs and updated status
        await fetchData();
      }
    } catch (err: any) {
      console.error(err);
      setReplyStatus({ type: 'error', message: err?.message || 'Failed to dispatch email reply via Resend.' });
    } finally {
      setSendingReply(false);
    }
  };

  // Filter logic
  const filteredMessages = messages.filter((msg) => {
    const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      msg.name.toLowerCase().includes(searchLower) ||
      (msg.email && msg.email.toLowerCase().includes(searchLower)) ||
      msg.subject.toLowerCase().includes(searchLower) ||
      msg.body.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // CSS Styles
  const badgeClasses = {
    pending_reply: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    replied: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    read_only: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
  };

  const badgeLabels = {
    pending_reply: 'Pending Reply',
    replied: 'Replied',
    read_only: 'Read-Only (No Email)',
  };

  const inputCls = "bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#60A5FA] w-full";

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#334155] flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Messages Inbox</h1>
          <p className="text-xs text-[#94A3B8] mt-1">Interact with your site visitors and reply to emails directly using Resend.com.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 self-start bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] px-4 py-2 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[#94A3B8] animate-pulse">Loading inbox and emails...</p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden min-h-0 mt-6 gap-6">
          {/* LEFT PANEL: LIST OF MESSAGES */}
          <div className="w-full md:w-80 lg:w-96 flex flex-col border border-[#334155] rounded-xl bg-[#1E293B] overflow-hidden flex-shrink-0">
            {/* Filter Tabs */}
            <div className="p-3 border-b border-[#334155] bg-[#1E293B] space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Cari pesan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-xs text-[#F8FAFC] placeholder-[#475569] focus:outline-none focus:border-[#60A5FA]"
                />
              </div>

              {/* Badges Filter */}
              <div className="flex flex-wrap gap-1">
                {(['all', 'pending_reply', 'replied', 'read_only'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                      statusFilter === tab
                        ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                        : 'bg-[#0F172A] text-[#94A3B8] border-[#334155] hover:bg-[#334155] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'pending_reply' ? 'Pending' : tab === 'replied' ? 'Replied' : 'Read-Only'}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Cards List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#334155]">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center">
                  <Inbox className="w-8 h-8 text-[#475569] mx-auto mb-2" />
                  <p className="text-xs text-[#94A3B8]">Belum ada pesan masuk.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      setReplyStatus({ type: '', message: '' });
                    }}
                    className={`p-4 cursor-pointer text-left transition-colors relative ${
                      selectedMessage?.id === msg.id
                        ? 'bg-[#334155]/40 border-l-4 border-l-[#3b82f6]'
                        : 'hover:bg-[#334155]/20'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <h4 className="font-semibold text-xs text-[#F8FAFC] truncate max-w-[160px]">{msg.name}</h4>
                      <span className="text-[10px] text-[#64748b] whitespace-nowrap">{formatDate(msg.createdAt).split(',')[0]}</span>
                    </div>
                    <p className="text-xs font-medium text-[#E2E8F0] truncate mb-2">{msg.subject}</p>
                    <p className="text-xs text-[#94A3B8] line-clamp-2 leading-relaxed mb-3">{msg.body}</p>

                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 text-[9px] font-semibold rounded-full uppercase ${badgeClasses[msg.status]}`}>
                        {badgeLabels[msg.status]}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[#64748b]">
                        <Globe className="w-3 h-3" />
                        {msg.language.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT PANEL: DETAIL VIEW & REPLY AREA */}
          <div className="flex-1 border border-[#334155] rounded-xl bg-[#1E293B] overflow-hidden flex flex-col">
            {selectedMessage ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                {/* 1. Header Information */}
                <div className="p-6 border-b border-[#334155] bg-[#1E293B] flex-shrink-0 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full uppercase self-start ${badgeClasses[selectedMessage.status]}`}>
                      {badgeLabels[selectedMessage.status]}
                    </span>
                    <div className="flex items-center gap-4 text-xs text-[#94A3B8]">
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(selectedMessage.createdAt)}</span>
                      <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Language: {selectedMessage.language.toUpperCase()}</span>
                    </div>
                  </div>
                  <h2 className="text-lg font-bold text-[#F8FAFC] mb-2">{selectedMessage.subject}</h2>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="w-9 h-9 rounded-full bg-[#0F172A] border border-[#334155] flex items-center justify-center text-[#60A5FA] font-bold text-sm">
                      {selectedMessage.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[#F8FAFC]">{selectedMessage.name}</h4>
                      <p className="text-xs text-[#94A3B8]">{selectedMessage.email || 'No email specified (Read-Only)'}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Message Body & Replies Thread */}
                <div className="flex-1 p-6 space-y-8 overflow-y-auto">
                  {/* Visitor's Inquiry Box */}
                  <div className="space-y-3 text-left">
                    <h5 className="text-xs font-semibold text-[#60A5FA] uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Visitor Inquiry
                    </h5>
                    <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-5 text-[#E2E8F0] leading-relaxed text-sm whitespace-pre-wrap font-serif">
                      {selectedMessage.body}
                    </div>
                  </div>

                  {/* Reply Thread (Timeline) */}
                  {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-[#334155] text-left">
                      <h5 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Reply Correspondence
                      </h5>
                      <div className="space-y-4">
                        {selectedMessage.replies.map((reply, i) => (
                          <div key={i} className="bg-emerald-950/20 border border-emerald-500/10 rounded-xl p-5 relative">
                            <div className="flex justify-between items-center mb-2 text-xs">
                              <span className="font-semibold text-emerald-400 text-xs">Sent From: {reply.senderEmail}</span>
                              <span className="text-[#64748b] text-[10px]">{formatDate(reply.sentAt)}</span>
                            </div>
                            <p className="text-xs text-[#E2E8F0] leading-relaxed whitespace-pre-wrap">{reply.body}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Reply Composer Section */}
                <div className="p-6 border-t border-[#334155] bg-[#0F172A] flex-shrink-0 text-left">
                  {selectedMessage.email ? (
                    <div className="space-y-4">
                      {/* Outbox (From) Email Selector & Quick Add */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1E293B] border border-[#334155] p-3 rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          <label className="text-xs font-semibold text-[#94A3B8] whitespace-nowrap">Send From:</label>
                          {senderEmails.length === 0 ? (
                            <span className="text-xs text-amber-400 italic">No outbox emails saved. Add one {"->"}</span>
                          ) : (
                            <select
                              value={selectedSenderEmail}
                              onChange={(e) => setSelectedSenderEmail(e.target.value)}
                              className="bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded px-2.5 py-1 text-xs focus:outline-none focus:border-[#60A5FA] cursor-pointer"
                            >
                              {senderEmails.map(email => (
                                <option key={email} value={email}>{email}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Inline Add Form toggle */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {showNewSenderForm ? (
                            <div className="flex gap-1.5 items-center">
                              <input
                                type="email"
                                placeholder="hello@yourdomain.com"
                                value={newSenderInput}
                                onChange={(e) => setNewSenderInput(e.target.value)}
                                className={`${inputCls} max-w-[180px]`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSenderEmail();
                                }}
                              />
                              <button
                                onClick={handleAddSenderEmail}
                                className="bg-[#1E40AF] text-white px-2.5 py-1 rounded text-xs hover:bg-[#1E3A8A] transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setShowNewSenderForm(false)}
                                className="text-xs text-[#94A3B8] hover:text-[#F8FAFC] px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowNewSenderForm(true)}
                              className="text-[11px] text-[#60A5FA] hover:text-[#93C5FD] flex items-center gap-1 font-semibold transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Email Address
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Textarea Composer */}
                      <div className="space-y-2 relative">
                        <textarea
                          placeholder={`Balas pesan ${selectedMessage.name}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={4}
                          disabled={sendingReply}
                          className="w-full bg-[#1E293B] border border-[#334155] text-[#F8FAFC] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#60A5FA] placeholder-[#475569] leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                        />
                        
                        {/* Outgoing Indicators */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px] text-[#64748b]">
                          <span>*This reply is delivered to <strong>{selectedMessage.email}</strong> with a BCC copy to <strong>{selectedSenderEmail || '(none)'}</strong>.</span>
                          
                          {/* Send Button */}
                          <button
                            onClick={handleSendReply}
                            disabled={sendingReply || !replyText.trim() || !selectedSenderEmail}
                            className="bg-[#1E40AF] text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-[#1E3A8A] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 self-end sm:self-auto cursor-pointer"
                          >
                            {sendingReply ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Sending Email...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                Send Reply
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Reply API result message */}
                      {replyStatus.type && (
                        <div className={`p-3 rounded-lg border flex items-center gap-2 text-xs mt-3 ${
                          replyStatus.type === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {replyStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                          <span>{replyStatus.message}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-500/5 border border-slate-500/10 rounded-xl text-center">
                      <p className="text-xs text-[#94A3B8] italic">
                        This message was sent as read-only feedback (no reply email was provided by the visitor).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Mail className="w-12 h-12 text-[#334155] mb-4 animate-bounce" />
                <h3 className="text-md font-semibold text-[#F8FAFC] mb-1">Pilih Pesan</h3>
                <p className="text-xs text-[#94A3B8]">Klik salah satu pesan di sidebar untuk membaca isi detail atau membalas email.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
