// ABOUTME: Deals pipeline page with kanban board layout
// ABOUTME: Displays deals organized by stage with total values

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDealsPipeline } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Plus, DollarSign } from 'lucide-react';

const stageLabels: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const stageColors: Record<string, string> = {
  lead: 'bg-slate-100',
  qualified: 'bg-blue-100',
  proposal: 'bg-purple-100',
  negotiation: 'bg-orange-100',
  won: 'bg-green-100',
  lost: 'bg-red-100',
};

export default function Deals() {
  const { data: pipeline, isLoading } = useQuery({
    queryKey: ['deals-pipeline'],
    queryFn: getDealsPipeline,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Deals Pipeline</h1>
        </div>
        <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-4 overflow-x-auto pb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[85vw] sm:w-72">
              <div className="h-96 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stages = pipeline || [];
  const activeStages = stages.filter(s => !['won', 'lost'].includes(s.stage));
  const closedStages = stages.filter(s => ['won', 'lost'].includes(s.stage));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Deals Pipeline</h1>
          <p className="text-muted-foreground">
            {formatCurrency(activeStages.reduce((sum, s) => sum + s.totalValue, 0))} in pipeline
          </p>
        </div>
        <Button asChild>
          <Link to="/deals/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Link>
        </Button>
      </div>

      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-4 overflow-x-auto pb-4">
        {[...activeStages, ...closedStages].map((stage) => (
          <div key={stage.stage} className="flex-shrink-0 w-[85vw] sm:w-72">
            <Card className={stageColors[stage.stage]}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {stageLabels[stage.stage]}
                  </CardTitle>
                  <Badge variant="secondary">{stage.count}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stage.totalValue)}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                {stage.deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No deals
                  </p>
                ) : (
                  stage.deals.map((deal) => (
                    <Link key={deal.id} to={`/deals/${deal.id}`}>
                      <Card className="bg-background hover:border-primary transition-colors cursor-pointer">
                        <CardContent className="p-3">
                          <p className="font-medium text-sm truncate">{deal.name}</p>
                          {deal.value && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(Number(deal.value))}
                            </div>
                          )}
                          {deal.company && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {deal.company.name}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
