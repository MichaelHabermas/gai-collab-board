import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresenceAvatars } from '@/components/presence/PresenceAvatars';
import type { IPresenceData } from '@/modules/sync/realtimeService';

describe('PresenceAvatars', () => {
  const now = Date.now();
  const mockUsers: IPresenceData[] = [
    {
      uid: 'user1',
      displayName: 'Alice Smith',
      photoURL: null,
      color: '#ef4444',
      online: true,
      lastSeen: now,
    },
    {
      uid: 'user2',
      displayName: 'Bob Jones',
      photoURL: null,
      color: '#f97316',
      online: false,
      lastSeen: now,
    },
    {
      uid: 'user3',
      displayName: 'Charlie Brown',
      photoURL: 'https://example.com/avatar.jpg',
      color: '#eab308',
      online: true,
      lastSeen: now,
    },
    {
      uid: 'user4',
      displayName: 'David',
      photoURL: null,
      color: '#22c55e',
      online: true,
      lastSeen: now,
    },
    {
      uid: 'user5',
      displayName: 'Eve',
      photoURL: null,
      color: '#invalid-color',
      online: true,
      lastSeen: now,
    },
    {
      uid: 'user6',
      displayName: 'Frank',
      photoURL: null,
      color: '#3b82f6',
      online: true,
      lastSeen: now,
    },
  ];

  it('renders correctly with no users', () => {
    render(<PresenceAvatars users={[]} currentUid='user1' />);
    const container = screen.getByTestId('presence-avatars');
    expect(container).toBeInTheDocument();
  });

  it('renders current user first', () => {
    render(<PresenceAvatars users={[mockUsers[1]!, mockUsers[0]!]} currentUid='user1' />);
    
    // The first avatar should have the title with "(you)"
    const avatars = screen.getAllByTitle(/you\)$/);
    expect(avatars.length).toBe(1);
    expect(avatars[0]).toHaveAttribute('title', 'Alice Smith (you)');
  });

  it('renders initials correctly', () => {
    const { container } = render(<PresenceAvatars users={[mockUsers[0]!, mockUsers[3]!]} currentUid='user1' />);
    
    // Alice Smith -> AS
    expect(container).toHaveTextContent('AS');
    // David -> DA (since it takes first 2 chars if no spaces)
    expect(container).toHaveTextContent('DA');
  });

  it('renders photoURL if provided', () => {
    const { container } = render(<PresenceAvatars users={[mockUsers[2]!]} currentUid='user1' />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows overflow indicator when maxVisible is exceeded', () => {
    render(<PresenceAvatars users={mockUsers} currentUid='user1' maxVisible={3} />);
    
    const overflow = screen.getByText('+3');
    expect(overflow).toBeInTheDocument();
    expect(overflow).toHaveAttribute('title', '3 more users');
  });

  it('handles custom roles correctly', () => {
    render(
      <PresenceAvatars 
        users={[mockUsers[0]!, mockUsers[1]!, mockUsers[2]!]} 
        currentUid='user1' 
        roles={{
          user1: 'owner',
          user2: 'editor',
          user3: 'viewer',
        }} 
      />
    );
    
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('editor')).toBeInTheDocument();
    expect(screen.getByText('viewer')).toBeInTheDocument();
  });

  it('handles missing roles correctly', () => {
    render(
      <PresenceAvatars 
        users={[mockUsers[0]!]} 
        currentUid='user1' 
        roles={{}} 
      />
    );
    
    // Shouldn't crash and shouldn't show any role badges
    expect(screen.queryByText('owner')).not.toBeInTheDocument();
  });

  it('falls back to default role badge variant for unknown roles', () => {
    render(
      <PresenceAvatars 
        users={[mockUsers[0]!]} 
        currentUid='user1' 
        roles={{ user1: 'unknown' as any }} 
      />
    );
    
    const badge = screen.getByText('unknown');
    expect(badge).toBeInTheDocument();
  });

  it('falls back to default color class for unknown color', () => {
    const { container } = render(<PresenceAvatars users={[mockUsers[4]!]} currentUid='user1' />);
    
    // Eve has '#invalid-color', should fall back to 'bg-slate-500'
    const avatar = container.querySelector('.bg-slate-500');
    expect(avatar).toBeInTheDocument();
  });
});