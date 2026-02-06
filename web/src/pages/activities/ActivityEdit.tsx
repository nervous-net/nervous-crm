// ABOUTME: Edit activity form page
// ABOUTME: Loads existing activity data into form for editing, with delete option

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getActivity, getContacts, getDeals, updateActivity, deleteActivity } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';

const activitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'task']),
  subject: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  due_date: z.string().optional().or(z.literal('')),
  contact_id: z.string().optional().or(z.literal('')),
  deal_id: z.string().optional().or(z.literal('')),
});

type ActivityForm = z.infer<typeof activitySchema>;

function toDatetimeLocal(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ActivityEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => getActivity(id!),
    enabled: !!id,
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: () => getContacts(),
  });

  const { data: deals } = useQuery({
    queryKey: ['deals-list'],
    queryFn: () => getDeals(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ActivityForm>({
    resolver: zodResolver(activitySchema),
    values: activity ? {
      type: activity.type as ActivityForm['type'],
      subject: activity.subject,
      description: activity.description || '',
      due_date: toDatetimeLocal(activity.due_date),
      contact_id: activity.contact_id || '',
      deal_id: activity.deal_id || '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: ActivityForm) => {
      return updateActivity(id!, {
        type: data.type,
        subject: data.subject,
        description: data.description || undefined,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
        contact_id: data.contact_id || undefined,
        deal_id: data.deal_id || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['activity', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Activity updated' });
      navigate('/activities');
    },
    onError: (error) => {
      toast({
        title: 'Failed to update activity',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteActivity(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Activity deleted' });
      navigate('/activities');
    },
    onError: () => {
      toast({ title: 'Failed to delete activity', variant: 'destructive' });
    },
  });

  const onSubmit = async (data: ActivityForm) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleDelete() {
    if (!window.confirm('Delete this activity?')) return;
    deleteMutation.mutate();
  }

  if (activityLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/activities">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Activities
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Activity not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/activities">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Activity</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <select
                id="type"
                {...register('type')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="task">Task</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Title *</Label>
              <Input
                id="subject"
                placeholder="Follow up on proposal"
                {...register('subject')}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Add any notes or details..."
                {...register('description')}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="datetime-local"
                {...register('due_date')}
              />
              {errors.due_date && (
                <p className="text-sm text-destructive">{errors.due_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_id">Related Contact</Label>
              <select
                id="contact_id"
                {...register('contact_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No contact</option>
                {contacts?.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deal_id">Related Deal</Label>
              <select
                id="deal_id"
                {...register('deal_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No deal</option>
                {deals?.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/activities">Cancel</Link>
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="ml-auto"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
