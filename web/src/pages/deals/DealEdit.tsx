// ABOUTME: Edit deal form page
// ABOUTME: Loads existing deal data into form for editing, with delete option

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDeal, getCompanies, getContacts, updateDeal, deleteDeal } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';

const dealSchema = z.object({
  name: z.string().min(1, 'Title is required').max(200),
  value: z.string().optional().or(z.literal('')),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  company_id: z.string().optional().or(z.literal('')),
  contact_id: z.string().optional().or(z.literal('')),
});

type DealForm = z.infer<typeof dealSchema>;

export default function DealEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: deal, isLoading: dealLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDeal(id!),
    enabled: !!id,
  });

  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => getCompanies(),
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: () => getContacts(),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DealForm>({
    resolver: zodResolver(dealSchema),
    values: deal ? {
      name: deal.name,
      value: deal.value ? String(deal.value) : '',
      stage: deal.stage as DealForm['stage'],
      company_id: deal.company?.id || '',
      contact_id: deal.contact?.id || '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: DealForm) => {
      return updateDeal(id!, {
        name: data.name,
        value: data.value ? parseFloat(data.value) : undefined,
        stage: data.stage,
        company_id: data.company_id || undefined,
        contact_id: data.contact_id || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      toast({ title: 'Deal updated' });
      navigate(`/deals/${id}`);
    },
    onError: (error) => {
      toast({
        title: 'Failed to update deal',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDeal(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: 'Deal deleted' });
      navigate('/deals');
    },
    onError: () => {
      toast({ title: 'Failed to delete deal', variant: 'destructive' });
    },
  });

  const onSubmit = async (data: DealForm) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleDelete() {
    if (!window.confirm('Delete this deal?')) return;
    deleteMutation.mutate();
  }

  if (dealLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/deals/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Deal</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Deal Title *</Label>
              <Input
                id="name"
                placeholder="Enterprise Software License"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Value ($)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  placeholder="10000"
                  {...register('value')}
                />
                {errors.value && (
                  <p className="text-sm text-destructive">{errors.value.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage">Stage *</Label>
                <select
                  id="stage"
                  {...register('stage')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="lead">Lead</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_id">Company</Label>
              <select
                id="company_id"
                {...register('company_id')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">No company</option>
                {companies?.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_id">Contact</Label>
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

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={`/deals/${id}`}>Cancel</Link>
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
