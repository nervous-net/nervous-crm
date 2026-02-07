// ABOUTME: Edit company form page
// ABOUTME: Loads existing company data into form for editing, with delete option

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCompany, updateCompany, deleteCompany } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  website: z.string().max(255).optional().or(z.literal('')),
  industry: z.string().max(100).optional().or(z.literal('')),
});

type CompanyForm = z.infer<typeof companySchema>;

export default function CompanyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => getCompany(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    values: company ? {
      name: company.name,
      website: company.website || '',
      industry: company.industry || '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: CompanyForm) => {
      return updateCompany(id!, {
        name: data.name,
        website: data.website || undefined,
        industry: data.industry || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', id] });
      toast({ title: 'Company updated' });
      navigate(`/companies/${id}`);
    },
    onError: (error) => {
      toast({
        title: 'Failed to update company',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCompany(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast({ title: 'Company deleted' });
      navigate('/companies');
    },
    onError: () => {
      toast({ title: 'Failed to delete company', variant: 'destructive' });
    },
  });

  const onSubmit = async (data: CompanyForm) => {
    setIsSubmitting(true);
    try {
      await updateMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  function handleDelete() {
    if (!window.confirm('Delete this company? This will not delete associated contacts or deals.')) return;
    deleteMutation.mutate();
  }

  if (companyLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" asChild>
          <Link to="/companies">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Link>
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-destructive">Company not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/companies/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Company</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                placeholder="Acme Inc."
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                placeholder="acme.com"
                {...register('website')}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="Technology, Healthcare, etc."
                {...register('industry')}
              />
              {errors.industry && (
                <p className="text-sm text-destructive">{errors.industry.message}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={`/companies/${id}`}>Cancel</Link>
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
