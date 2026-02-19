import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CommentPanel } from '@/components/board/CommentPanel';
import type { IComment } from '@/types';
import { Timestamp } from 'firebase/firestore';

const makeComment = (overrides: Partial<IComment> = {}): IComment => ({
  id: 'c-1',
  objectId: 'obj-1',
  authorId: 'user-1',
  authorDisplayName: 'Alice',
  text: 'A comment',
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ...overrides,
});

describe('CommentPanel', () => {
  const defaultProps = {
    comments: [] as IComment[],
    selectedObjectId: 'obj-1',
    currentUserId: 'user-1',
    currentUserDisplayName: 'Alice',
    loading: false,
    onCreateComment: vi.fn().mockResolvedValue(null),
    onDeleteComment: vi.fn().mockResolvedValue(undefined),
  };

  it('shows empty state when no object is selected', () => {
    render(<CommentPanel {...defaultProps} selectedObjectId={null} />);
    expect(screen.getByText(/select an object/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<CommentPanel {...defaultProps} loading={true} />);
    expect(screen.getByText(/loading comments/i)).toBeInTheDocument();
  });

  it('shows "no comments" message when empty', () => {
    render(<CommentPanel {...defaultProps} />);
    expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
  });

  it('renders comments', () => {
    const comments = [
      makeComment({ id: 'c-1', text: 'First comment', authorDisplayName: 'Alice' }),
      makeComment({ id: 'c-2', text: 'Second comment', authorId: 'user-2', authorDisplayName: 'Bob' }),
    ];

    render(<CommentPanel {...defaultProps} comments={comments} />);
    expect(screen.getByText('First comment')).toBeInTheDocument();
    expect(screen.getByText('Second comment')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('shows delete button only for own comments', () => {
    const comments = [
      makeComment({ id: 'c-1', authorId: 'user-1' }),
      makeComment({ id: 'c-2', authorId: 'user-2' }),
    ];

    render(<CommentPanel {...defaultProps} comments={comments} />);
    expect(screen.getByTestId('delete-btn-c-1')).toBeInTheDocument();
    expect(screen.queryByTestId('delete-btn-c-2')).not.toBeInTheDocument();
  });

  it('submits a new comment', async () => {
    const onCreateComment = vi.fn().mockResolvedValue(null);
    render(<CommentPanel {...defaultProps} onCreateComment={onCreateComment} />);

    const input = screen.getByTestId('comment-input');
    fireEvent.change(input, { target: { value: 'New comment text' } });

    const submit = screen.getByTestId('comment-submit');
    fireEvent.click(submit);

    await waitFor(() => {
      expect(onCreateComment).toHaveBeenCalledWith({
        objectId: 'obj-1',
        authorId: 'user-1',
        authorDisplayName: 'Alice',
        text: 'New comment text',
        parentId: undefined,
      });
    });
  });

  it('renders reply threads under parent comments', () => {
    const comments = [
      makeComment({ id: 'c-parent', text: 'Parent comment' }),
      makeComment({ id: 'c-reply', text: 'Reply comment', parentId: 'c-parent' }),
    ];

    render(<CommentPanel {...defaultProps} comments={comments} />);
    expect(screen.getByText('Parent comment')).toBeInTheDocument();
    expect(screen.getByText('Reply comment')).toBeInTheDocument();
    // Reply should be inside parent container
    expect(screen.getByTestId('comment-c-reply')).toBeInTheDocument();
  });

  it('calls onDeleteComment when delete button clicked', () => {
    const onDeleteComment = vi.fn().mockResolvedValue(undefined);
    const comments = [makeComment({ id: 'c-1', authorId: 'user-1' })];

    render(<CommentPanel {...defaultProps} comments={comments} onDeleteComment={onDeleteComment} />);

    fireEvent.click(screen.getByTestId('delete-btn-c-1'));
    expect(onDeleteComment).toHaveBeenCalledWith('c-1');
  });
});
