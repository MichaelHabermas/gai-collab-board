import { memo, type ReactElement } from "react";
import type { IPresenceData } from "@/modules/sync/realtimeService";
import type { UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";

interface IPresenceAvatarsProps {
  users: IPresenceData[];
  currentUid: string;
  roles?: Record<string, UserRole>;
  maxVisible?: number;
}

interface IAvatarProps {
  user: IPresenceData;
  role?: UserRole;
  isCurrentUser: boolean;
}

/**
 * Gets initials from a display name (max 2 characters).
 */
const getInitials = (displayName: string): string => {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return displayName.slice(0, 2).toUpperCase();
  }
  return (
    (parts[0]?.charAt(0) || "") + (parts[1]?.charAt(0) || "")
  ).toUpperCase();
};

/**
 * Gets the role badge variant based on the user role.
 */
const getRoleBadgeVariant = (
  role: UserRole
): "default" | "secondary" | "outline" => {
  switch (role) {
    case "owner":
      return "default";
    case "editor":
      return "secondary";
    case "viewer":
      return "outline";
    default:
      return "outline";
  }
};

const Avatar = memo(
  ({ user, role, isCurrentUser }: IAvatarProps): ReactElement => {
    const initials = getInitials(user.displayName);

    return (
      <div className="relative group">
        {/* Avatar circle */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white border-2 border-white shadow-sm transition-transform hover:scale-110"
          style={{ backgroundColor: user.color }}
          title={`${user.displayName}${isCurrentUser ? " (you)" : ""}`}
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Online indicator */}
        {user.online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}

        {/* Tooltip on hover */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          <div className="font-medium">
            {user.displayName}
            {isCurrentUser && " (you)"}
          </div>
          {role && (
            <Badge
              variant={getRoleBadgeVariant(role)}
              className="mt-1 text-[10px] px-1.5 py-0"
            >
              {role}
            </Badge>
          )}
        </div>
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

/**
 * PresenceAvatars displays a row of user avatars showing who is online.
 * Shows role badges on hover and handles overflow with a "+N" indicator.
 */
export const PresenceAvatars = memo(
  ({
    users,
    currentUid,
    roles,
    maxVisible = 5,
  }: IPresenceAvatarsProps): ReactElement => {
    const visibleUsers = users.slice(0, maxVisible);
    const overflowCount = Math.max(0, users.length - maxVisible);

    // Sort to show current user first
    const sortedUsers = [...visibleUsers].sort((a, b) => {
      if (a.uid === currentUid) return -1;
      if (b.uid === currentUid) return 1;
      return 0;
    });

    return (
      <div className="flex items-center -space-x-2">
        {sortedUsers.map((user) => (
          <Avatar
            key={user.uid}
            user={user}
            role={roles?.[user.uid]}
            isCurrentUser={user.uid === currentUid}
          />
        ))}

        {/* Overflow indicator */}
        {overflowCount > 0 && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium bg-slate-600 text-white border-2 border-white shadow-sm"
            title={`${overflowCount} more user${overflowCount > 1 ? "s" : ""}`}
          >
            +{overflowCount}
          </div>
        )}
      </div>
    );
  }
);

PresenceAvatars.displayName = "PresenceAvatars";
