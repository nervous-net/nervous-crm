// ABOUTME: Activities list page with filter tabs
// ABOUTME: Displays all activities in hero-style rows with complete toggle

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivities, getUpcomingActivities, getOverdueActivities, completeActivity } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Plus, Check, Clock, AlertCircle, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function Activities() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'overdue'>('all');
  const queryClient = useQueryClient();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activities', filter],
    queryFn: () => {
      if (filter === 'upcoming') {
        return getUpcomingActivities(7);
      }
      if (filter === 'overdue') {
        return getOverdueActivities();
      }
      return getActivities();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => completeActivity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Activities</h1>
          <p className="text-sm text-muted-foreground">
            Track your tasks, calls, and meetings
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/activities/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Link>
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => setFilter('all')}
        >
          All
        </Button>
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => setFilter('upcoming')}
        >
          <Clock className="h-4 w-4 mr-1" />
          Upcoming
        </Button>
        <Button
          variant={filter === 'overdue' ? 'destructive' : 'outline'}
          size="sm"
          className="rounded-full"
          onClick={() => setFilter('overdue')}
        >
          <AlertCircle className="h-4 w-4 mr-1" />
          Overdue
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-card/60 border border-border/40">
              <div className="h-14 bg-muted animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      ) : !activities?.length ? (
        <div className="p-12 rounded-xl bg-card/60 border border-border/40 text-center">
          <p className="text-muted-foreground">
            {filter === 'all' ? 'No activities yet' : `No ${filter} activities`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type] || FileText;
            const isOverdue = activity.due_date && !activity.completed_at && new Date(activity.due_date) < new Date();

            return (
              <div
                key={activity.id}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-xl border transition-colors',
                  isOverdue
                    ? 'bg-red-50 border-red-200/40'
                    : 'bg-card/60 border-border/40',
                  activity.completed_at && 'opacity-60'
                )}
              >
                <button
                  onClick={() => toggleMutation.mutate(activity.id)}
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

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activityIconColors[activity.type] || 'bg-muted text-muted-foreground'}`}>
                  <Icon className="h-4 w-4" />
                </div>

                <Link to={`/activities/${activity.id}`} className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm font-semibold truncate',
                    activity.completed_at && 'line-through'
                  )}>
                    {activity.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[activity.contact?.name, activity.deal?.name].filter(Boolean).join(' · ') || activity.description || 'No details'}
                  </p>
                </Link>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isOverdue && (
                    <span className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
                      Overdue
                    </span>
                  )}
                  <span className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium hidden sm:inline-flex',
                    activityIconColors[activity.type] || 'bg-muted text-muted-foreground'
                  )}>
                    {activity.type}
                  </span>
                  {activity.due_date && (
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {formatDate(activity.due_date)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
