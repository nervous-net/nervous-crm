// ABOUTME: Team member management page for admins and owners
// ABOUTME: Lists current members, manages roles, and handles invite creation/cancellation

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useProfile';
import {
  getTeamMembers,
  updateMemberRole,
  removeMember,
  getTeamInvites,
  createInvite,
  cancelInvite,
} from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';

export default function TeamMembers() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin';

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: getTeamMembers,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ['team-invites'],
    queryFn: getTeamInvites,
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' | 'viewer' }) =>
      updateMemberRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({ title: 'Role updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update role', variant: 'destructive' });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast({ title: 'Member removed' });
    },
    onError: () => {
      toast({ title: 'Failed to remove member', variant: 'destructive' });
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'admin' | 'member' | 'viewer' }) =>
      createInvite(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] });
      setInviteEmail('');
      setInviteRole('member');
      toast({ title: 'Invite created' });
    },
    onError: () => {
      toast({ title: 'Failed to create invite', variant: 'destructive' });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id: string) => cancelInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-invites'] });
      toast({ title: 'Invite cancelled' });
    },
    onError: () => {
      toast({ title: 'Failed to cancel invite', variant: 'destructive' });
    },
  });

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    createInviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  }

  function handleRemoveMember(userId: string, name: string) {
    if (!window.confirm(`Remove ${name} from the team?`)) return;
    removeMemberMutation.mutate(userId);
  }

  function copyInviteLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Invite link copied to clipboard' });
  }

  if (membersLoading || invitesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link to="/settings">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">Manage who has access to your team</p>
        </div>
      </div>

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members?.length || 0} team member{members?.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members?.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{member.name || 'Unnamed'}</p>
                <p className="text-sm text-muted-foreground truncate">{member.email}</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {member.role === 'owner' ? (
                  <Badge>owner</Badge>
                ) : isAdmin ? (
                  <>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={member.role}
                      onChange={(e) =>
                        updateRoleMutation.mutate({
                          userId: member.id,
                          role: e.target.value as 'admin' | 'member' | 'viewer',
                        })
                      }
                    >
                      <option value="admin">admin</option>
                      <option value="member">member</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline">{member.role}</Badge>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite Section — only for admins/owners */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Member</CardTitle>
            <CardDescription>Send an invite link to add someone to your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleInviteSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label htmlFor="invite-email" className="sr-only">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-role" className="sr-only">Role</Label>
                <select
                  id="invite-role"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                >
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <Button type="submit" disabled={createInviteMutation.isPending}>
                {createInviteMutation.isPending ? 'Sending...' : 'Invite'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending Invites */}
      {isAdmin && invites && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>{invites.length} pending</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{invite.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {invite.role} · invited {new Date(invite.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(invite.token)}
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => cancelInviteMutation.mutate(invite.id)}
                    disabled={cancelInviteMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
