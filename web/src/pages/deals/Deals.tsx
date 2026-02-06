// ABOUTME: Deals pipeline page with kanban board layout
// ABOUTME: Displays deals organized by stage with hero-style card aesthetics

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDealsPipeline } from '@/lib/db';
import { Button } from '@/components/ui/button';
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
  lead: 'bg-muted/60',
  qualified: 'bg-primary/5',
  proposal: 'bg-purple-50',
  negotiation: 'bg-orange-50',
  won: 'bg-green-50',
  lost: 'bg-red-50',
};

const dealIconColors: Record<string, string> = {
  lead: 'bg-muted text-muted-foreground',
  qualified: 'bg-primary/10 text-primary',
  proposal: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
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
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Deals Pipeline</h1>
        </div>
        <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-4 overflow-x-auto pb-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[85vw] sm:w-72">
              <div className="h-96 bg-muted animate-pulse rounded-xl" />
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
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Deals Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(activeStages.reduce((sum, s) => sum + s.totalValue, 0))} in pipeline
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/deals/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Link>
        </Button>
      </div>

      <div className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-4 overflow-x-auto pb-4">
        {[...activeStages, ...closedStages].map((stage) => (
          <div key={stage.stage} className="flex-shrink-0 w-[85vw] sm:w-72">
            <div className={`rounded-xl border border-border/40 ${stageColors[stage.stage]} p-4`}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-display font-bold text-sm">
                  {stageLabels[stage.stage]}
                </h3>
                <Badge variant="secondary" className="rounded-full text-xs">
                  {stage.count}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {formatCurrency(stage.totalValue)}
              </p>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {stage.deals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No deals
                  </p>
                ) : (
                  stage.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/deals/${deal.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40 hover:border-primary/40 transition-colors cursor-pointer"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${dealIconColors[stage.stage]}`}>
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{deal.name}</p>
                        {deal.company && (
                          <p className="text-xs text-muted-foreground truncate">
                            {deal.company.name}
                          </p>
                        )}
                      </div>
                      {deal.value && (
                        <span className="text-xs font-semibold text-foreground flex-shrink-0">
                          {formatCurrency(Number(deal.value))}
                        </span>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
