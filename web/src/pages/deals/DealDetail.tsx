// ABOUTME: Deal detail page showing deal info and associations
// ABOUTME: Displays deal value, stage, company, and contact

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDeal } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, DollarSign, Building2, User, Calendar } from 'lucide-react';

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

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => getDeal(id!),
    enabled: !!id,
  });

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/deals">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{deal.name}</h1>
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
        <Button variant="outline">Edit Deal</Button>
      </div>

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
    </div>
  );
}
