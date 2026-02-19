import { useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Reply, MessageSquare } from 'lucide-react';
import type { IComment, ICreateCommentParams } from '@/types';

interface CommentPanelProps {
  /** Comments for the currently selected object. */
  comments: IComment[];
  /** The ID of the currently selected object, or null if none. */
  selectedObjectId: string | null;
  /** Current user ID. */
  currentUserId: string;
  /** Current user display name. */
  currentUserDisplayName?: string;
  /** Whether the initial load is in progress. */
  loading: boolean;
  /** Callback to create a new comment. */
  onCreateComment: (params: ICreateCommentParams) => Promise<IComment | null>;
  /** Callback to delete a comment. */
  onDeleteComment: (commentId: string) => Promise<void>;
}

/**
 * Panel that displays a comment thread for the selected object.
 * Shown in the right sidebar under the Comments tab.
 */
export const CommentPanel = ({
  comments,
  selectedObjectId,
  currentUserId,
  currentUserDisplayName,
  loading,
  onCreateComment,
  onDeleteComment,
}: CommentPanelProps): ReactElement => {
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!selectedObjectId) {
    return (
      <div className='flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center gap-2'>
        <MessageSquare className='h-8 w-8 opacity-50' />
        <p className='text-sm'>Select an object to view and add comments.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-muted-foreground'>
        <p className='text-sm'>Loading comments...</p>
      </div>
    );
  }

  // Separate root comments and replies
  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByParentId = new Map<string, IComment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const arr = repliesByParentId.get(c.parentId);
      if (arr) {
        arr.push(c);
      } else {
        repliesByParentId.set(c.parentId, [c]);
      }
    }
  }

  const handleSubmit = async () => {
    const text = newCommentText.trim();
    if (!text || !selectedObjectId) return;

    setSubmitting(true);
    try {
      await onCreateComment({
        objectId: selectedObjectId,
        authorId: currentUserId,
        authorDisplayName: currentUserDisplayName,
        text,
        parentId: replyingTo ?? undefined,
      });
      setNewCommentText('');
      setReplyingTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (timestamp: { toDate?: () => Date }): string => {
    if (!timestamp?.toDate) return '';

    const date = timestamp.toDate();
    return (
      date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' +
      date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    );
  };

  const renderComment = (comment: IComment, isReply = false) => {
    const replies = repliesByParentId.get(comment.id) ?? [];
    const isAuthor = comment.authorId === currentUserId;

    return (
      <div
        key={comment.id}
        className={`${isReply ? 'ml-4 border-l-2 border-border pl-3' : ''}`}
        data-testid={`comment-${comment.id}`}
      >
        <div className='py-2'>
          <div className='flex items-center justify-between gap-2'>
            <span className='text-xs font-medium text-foreground'>
              {comment.authorDisplayName || 'Anonymous'}
            </span>
            <span className='text-xs text-muted-foreground'>{formatTime(comment.createdAt)}</span>
          </div>
          <p className='text-sm text-foreground mt-1 break-words'>{comment.text}</p>
          <div className='flex items-center gap-1 mt-1'>
            {!isReply && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground'
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                data-testid={`reply-btn-${comment.id}`}
              >
                <Reply className='h-3 w-3 mr-1' />
                Reply
              </Button>
            )}
            {isAuthor && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-6 px-1.5 text-xs text-destructive hover:text-destructive'
                onClick={() => onDeleteComment(comment.id)}
                data-testid={`delete-btn-${comment.id}`}
              >
                <Trash2 className='h-3 w-3 mr-1' />
                Delete
              </Button>
            )}
          </div>
        </div>
        {replies.map((reply) => renderComment(reply, true))}
      </div>
    );
  };

  return (
    <div className='flex flex-col h-full' data-testid='comment-panel'>
      {/* Comment list */}
      <div className='flex-1 overflow-auto px-2 py-1'>
        {rootComments.length === 0 ? (
          <p className='text-sm text-muted-foreground text-center py-4'>
            No comments yet. Add one below.
          </p>
        ) : (
          <div className='divide-y divide-border'>{rootComments.map((c) => renderComment(c))}</div>
        )}
      </div>

      {/* Input area */}
      <div className='shrink-0 border-t border-border p-2'>
        {replyingTo && (
          <div className='flex items-center justify-between mb-1 text-xs text-muted-foreground'>
            <span>Replying to comment...</span>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-5 px-1 text-xs'
              onClick={() => setReplyingTo(null)}
            >
              Cancel
            </Button>
          </div>
        )}
        <Textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder='Add a comment...'
          className='min-h-[60px] resize-none text-sm bg-muted border-border'
          data-testid='comment-input'
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
        <div className='flex justify-end mt-1'>
          <Button
            type='button'
            size='sm'
            disabled={!newCommentText.trim() || submitting}
            onClick={() => void handleSubmit()}
            data-testid='comment-submit'
          >
            {submitting ? 'Sending...' : replyingTo ? 'Reply' : 'Comment'}
          </Button>
        </div>
      </div>
    </div>
  );
};
