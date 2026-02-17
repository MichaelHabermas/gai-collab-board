import { useState, ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IBoard, UserRole } from "@/types";
import { addBoardMember, removeBoardMember, updateMemberRole } from "@/modules/sync";
import { Copy, Check, UserPlus, Trash2, Crown, Edit, Eye } from "lucide-react";

interface ShareDialogProps {
  board: IBoard;
  currentUserId: string;
  children: ReactElement;
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_ICONS: Record<UserRole, ReactElement> = {
  owner: <Crown className="h-3 w-3" />,
  editor: <Edit className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

const ROLE_COLORS: Record<UserRole, "default" | "secondary" | "outline"> = {
  owner: "default",
  editor: "secondary",
  viewer: "outline",
};

export const ShareDialog = ({
  board,
  currentUserId,
  children,
}: ShareDialogProps): ReactElement => {
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<UserRole>("viewer");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = board.ownerId === currentUserId;
  const shareLink = `${window.location.origin}/board/${board.id}`;

  const handleCopyLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMember = async (): Promise<void> => {
    if (!newMemberEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real app, you would look up the user by email
      // For now, we'll use a placeholder user ID
      const userId = `user_${newMemberEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      await addBoardMember(board.id, userId, newMemberRole);
      setNewMemberEmail("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await removeBoardMember(board.id, userId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (
    userId: string,
    role: UserRole
  ): Promise<void> => {
    setIsLoading(true);
    try {
      await updateMemberRole(board.id, userId, role);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const memberEntries = Object.entries(board.members);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Share Board</DialogTitle>
          <DialogDescription className="text-slate-400">
            Invite others to collaborate on &quot;{board.name}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Share Link */}
          <div className="space-y-2">
            <Label className="text-slate-300">Share Link</Label>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="bg-slate-700 border-slate-600 text-slate-200"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="border-slate-600 hover:bg-slate-700"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Add Member */}
          {isOwner && (
            <div className="space-y-2">
              <Label className="text-slate-300">Add Member</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500"
                  disabled={isLoading}
                />
                <Select
                  value={newMemberRole}
                  onValueChange={(value) => setNewMemberRole(value as UserRole)}
                >
                  <SelectTrigger className="w-28 bg-slate-700 border-slate-600 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="editor" className="text-slate-200">
                      Editor
                    </SelectItem>
                    <SelectItem value="viewer" className="text-slate-200">
                      Viewer
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddMember}
                  disabled={isLoading}
                  size="icon"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <Label className="text-slate-300">
              Members ({memberEntries.length})
            </Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {memberEntries.map(([userId, role]) => (
                <div
                  key={userId}
                  className="flex items-center justify-between p-2 rounded-md bg-slate-700/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm">
                      {userId.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-slate-200">{userId}</p>
                      <Badge
                        variant={ROLE_COLORS[role]}
                        className="text-xs gap-1"
                      >
                        {ROLE_ICONS[role]}
                        {ROLE_LABELS[role]}
                      </Badge>
                    </div>
                  </div>
                  {isOwner && userId !== board.ownerId && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={role}
                        onValueChange={(value) =>
                          handleRoleChange(userId, value as UserRole)
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-24 h-8 bg-slate-600 border-slate-500 text-slate-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600">
                          <SelectItem value="editor" className="text-slate-200">
                            Editor
                          </SelectItem>
                          <SelectItem value="viewer" className="text-slate-200">
                            Viewer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(userId)}
                        disabled={isLoading}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
