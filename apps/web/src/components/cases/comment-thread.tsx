'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommentUser {
  id: string;
  name: string;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  mentions: string[];
  createdAt: string;
  user: CommentUser;
}

interface CommentThreadProps {
  caseId: string;
  currentUserId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Render comment content with @mentions highlighted */
function renderContent(content: string): React.ReactNode[] {
  // Split on @mention patterns
  const parts = content.split(/(@[\w.+-]+@[\w\-.]+\.\w+|@[\w\s]+?)(?=\s|$|@)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span
          key={i}
          className="rounded bg-blue-100 px-1 py-0.5 text-sm font-medium text-blue-700"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
];

function avatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommentThread({ caseId, currentUserId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<'oldest' | 'newest'>('oldest');

  // @mention autocomplete state
  const [orgUsers, setOrgUsers] = useState<CommentUser[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/comments?order=${order}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      console.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [caseId, order]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Fetch org users for @mention autocomplete
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setOrgUsers(Array.isArray(data) ? data : data.users || []);
        }
      } catch {
        // Non-critical -- autocomplete just won't work
      }
    }
    loadUsers();
  }, []);

  // Handle textarea input to detect @ mentions
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);

    const cursorPos = e.target.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setShowMentions(true);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const filteredUsers = orgUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(mentionQuery) ||
      u.email.toLowerCase().includes(mentionQuery),
  );

  const insertMention = (user: CommentUser) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const textBefore = newComment.slice(0, cursorPos);
    const textAfter = newComment.slice(cursorPos);

    // Replace the partial @query with the full mention
    const atIndex = textBefore.lastIndexOf('@');
    const before = textBefore.slice(0, atIndex);
    const mention = `@${user.email} `;

    setNewComment(before + mention + textAfter);
    setShowMentions(false);

    // Restore focus
    setTimeout(() => {
      textarea.focus();
      const pos = before.length + mention.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredUsers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredUsers[mentionIndex]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  // Submit comment
  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim(), userId: currentUserId }),
      });

      if (res.ok) {
        setNewComment('');
        setShowMentions(false);
        await fetchComments();
      }
    } catch {
      console.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with sort toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Comments ({comments.length})
        </h3>
        <button
          type="button"
          onClick={() => setOrder(order === 'oldest' ? 'newest' : 'oldest')}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {order === 'oldest' ? 'Oldest first' : 'Newest first'}
        </button>
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${avatarColor(comment.user.id)}`}
              >
                {getInitials(comment.user.name)}
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {comment.user.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {timeAgo(comment.createdAt)}
                  </span>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {renderContent(comment.content)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New comment form */}
      <div className="relative border-t border-gray-200 pt-4">
        <label htmlFor="new-comment" className="sr-only">
          Add a comment
        </label>
        <textarea
          ref={textareaRef}
          id="new-comment"
          value={newComment}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment... Use @ to mention someone"
          rows={3}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* @mention autocomplete dropdown */}
        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-0 z-10 mb-1 max-h-48 w-64 overflow-auto rounded-md border border-gray-200 bg-white dark:bg-gray-900 shadow-lg">
            {filteredUsers.slice(0, 8).map((user, idx) => (
              <button
                key={user.id}
                type="button"
                onClick={() => insertMention(user)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  idx === mentionIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${avatarColor(user.id)}`}
                >
                  {getInitials(user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{user.name}</p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
