// ABOUTME: Companies list page with search functionality
// ABOUTME: Displays all companies in a row-based list with avatars and stats

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCompanies } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Users } from 'lucide-react';

const avatarColors = [
  'bg-primary/10 text-primary',
  'bg-accent/20 text-accent-foreground',
  'bg-orange-100 text-orange-800',
  'bg-purple-100 text-purple-800',
  'bg-green-100 text-green-800',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export default function Companies() {
  const [search, setSearch] = useState('');

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies', search],
    queryFn: () => getCompanies(search || undefined),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Companies</h1>
          <p className="text-sm text-muted-foreground">
            {companies?.length || 0} companies
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link to="/companies/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-card/60 border border-border/40">
              <div className="h-12 bg-muted animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      ) : !companies?.length ? (
        <div className="p-12 rounded-xl bg-card/60 border border-border/40 text-center">
          <p className="text-muted-foreground">
            {search ? 'No companies found' : 'No companies yet. Add your first company!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((company) => (
            <Link
              key={company.id}
              to={`/companies/${company.id}`}
              className="flex items-center gap-4 p-3 rounded-xl bg-card/60 border border-border/40 hover:border-primary/40 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${getAvatarColor(company.name)}`}>
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{company.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[company.industry, `${company.contacts_count} contacts`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {company.deals_count > 0 && (
                  <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium">
                    {company.deals_count} {company.deals_count === 1 ? 'deal' : 'deals'}
                  </span>
                )}
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {company.contacts_count}
                </div>
                <span className="text-xs text-muted-foreground hidden md:block">
                  Added {formatDate(company.created_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
