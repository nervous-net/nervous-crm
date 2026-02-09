// ABOUTME: Deal detail page showing deal info, activities, team members, and notes
// ABOUTME: Serves as the working hub for a deal with full activity management

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeal,
  getDealActivities,
  getDealNotes,
  getDealMembers,
  getTeamMembers,
  completeActivity,
  createDealNote,
  deleteDealNote,
  addDealMember,
  removeDealMember,
} from '@/lib/db';
import type { ActivityWithRelations } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  DollarSign,
  Building2,
  User,
  Calendar,
  Check,
  Plus,
  Phone,
  Mail,
  FileText,
  X,
  Trash2,
  UserPlus,
} from 'lucide-react';
import DealInbox from './DealInbox';

const stageLabels: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const stageBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  lead: 'secondary',
  qualified: 'secondary',
  proposal: 'default',
  negotiation: 'default',
  won: 'default',
  lost: 'destructive',
};

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: FileText,
};

const activityIconColors: Record<string, string> = {
  call: 'bg-blue-100 text-blue-700',
  email: 'bg-green-100 text-green-700',
  meeting: 'bg-purple-100 text-purple-700',
  task: 'bg-orange-100 text-orange-700',
};

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');
  const [addMemberId, setAddMemberId] = useState('');

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDeal(id!),
    enabled: !!id,
  });

  const { data: activities } = useQuery({
    queryKey: ['deal-activities', id],
    queryFn: () => getDealActivities(id!),
    enabled: !!id,
  });

  const { data: notes } = useQuery({
    queryKey: ['deal-notes', id],
    queryFn: () => getDealNotes(id!),
    enabled: !!id,
  });

  const { data: members } = useQuery({
    queryKey: ['deal-members', id],
    queryFn: () => getDealMembers(id!),
    enabled: !!id,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => getTeamMembers(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const toggleActivityMutation = useMutation({
    mutationFn: (activityId: string) => completeActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-activities', id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: (content: string) => createDealNote(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', id] });
      setNoteContent('');
      toast({ title: 'Note added' });
    },
    onError: () => {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteDealNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', id] });
      toast({ title: 'Note deleted' });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (profileId: string) => addDealMember(id!, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-members', id] });
      setAddMemberId('');
      toast({ title: 'Member added' });
    },
    onError: () => {
      toast({ title: 'Failed to add member', variant: 'destructive' });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (profileId: string) => removeDealMember(id!, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-members', id] });
      toast({ title: 'Member removed' });
    },
  });

  // Filter team members not already on the deal
  const memberIds = new Set(members?.map(m => m.profile_id) || []);
  const availableMembers = teamMembers?.filter(m => !memberIds.has(m.id)) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/deals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deals
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Deal not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/deals">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold">{deal.name}</h1>
              <Badge variant={stageBadgeVariant[deal.stage]}>
                {stageLabels[deal.stage]}
              </Badge>
            </div>
            {deal.value && (
              <p className="text-xl text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {formatCurrency(Number(deal.value))}
              </p>
            )}
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to={`/deals/${deal.id}/edit`}>Edit Deal</Link>
        </Button>
      </div>

      {/* Deal Info + Timeline */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deal.company && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <Link to={`/companies/${deal.company.id}`} className="text-primary hover:underline">
                  {deal.company.name}
                </Link>
              </div>
            )}
            {deal.contact && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <Link to={`/contacts/${deal.contact.id}`} className="text-primary hover:underline">
                  {deal.contact.name}
                </Link>
              </div>
            )}
            {deal.expected_close && (
              <div>
                <p className="text-sm text-muted-foreground">Expected Close</p>
                <p>{formatDate(deal.expected_close)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{formatDate(deal.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p>{formatDate(deal.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Activities</CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/activities/new?deal_id=${deal.id}`}>
              <Plus className="h-4 w-4 mr-1" />
              Add Activity
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!activities?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activities for this deal
            </p>
          ) : (
            <div className="space-y-2">
              {activities.map((activity: ActivityWithRelations) => {
                const Icon = activityIcons[activity.type] || FileText;
                const isOverdue = activity.due_date && !activity.completed_at && new Date(activity.due_date) < new Date();

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      isOverdue
                        ? 'bg-red-50 border-red-200/40'
                        : 'bg-card/60 border-border/40',
                      activity.completed_at && 'opacity-60'
                    )}
                  >
                    <button
                      onClick={() => toggleActivityMutation.mutate(activity.id)}
                      disabled={!!activity.completed_at}
                      className={cn(
                        'flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
                        activity.completed_at
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground hover:border-primary'
                      )}
                    >
                      {activity.completed_at && <Check className="h-3 w-3" />}
                    </button>

                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activityIconColors[activity.type] || 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    <Link to={`/activities/${activity.id}`} className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate',
                        activity.completed_at && 'line-through'
                      )}>
                        {activity.subject}
                      </p>
                    </Link>

                    {activity.assignee && (
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {activity.assignee.name}
                      </Badge>
                    )}

                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium flex-shrink-0">
                        Overdue
                      </span>
                    )}

                    {activity.due_date && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                        {formatDate(activity.due_date)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inbox */}
      <DealInbox dealId={deal.id} contactEmail={deal.contact?.email} />

      {/* Team Members + Notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableMembers.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={addMemberId}
                  onChange={(e) => setAddMemberId(e.target.value)}
                  className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Add a team member...</option>
                  {availableMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!addMemberId || addMemberMutation.isPending}
                  onClick={() => addMemberId && addMemberMutation.mutate(addMemberId)}
                >
                  Add
                </Button>
              </div>
            )}

            {!members?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members assigned
              </p>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-lg border border-border/40">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{member.profile?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {member.profile?.role && (
                        <Badge variant="secondary" className="text-xs">
                          {member.profile.role}
                        </Badge>
                      )}
                      <button
                        onClick={() => removeMemberMutation.mutate(member.profile_id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button
                size="sm"
                disabled={!noteContent.trim() || addNoteMutation.isPending}
                onClick={() => noteContent.trim() && addNoteMutation.mutate(noteContent.trim())}
              >
                {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>

            {!notes?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notes yet
              </p>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg border border-border/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{note.author?.name || 'Unknown'}</span>
                        <span>{formatRelativeTime(note.created_at)}</span>
                      </div>
                      {currentUser && note.author_id === currentUser.id && (
                        <button
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
