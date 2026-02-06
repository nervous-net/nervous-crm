// ABOUTME: Company detail page showing company info and related records
// ABOUTME: Displays contacts and deals associated with the company

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCompany } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Globe, Users, Handshake } from 'lucide-react';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', id],
    queryFn: () => getCompany(id!),
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

  if (error || !company) {
    return (
      <div className="space-y-6">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/companies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{company.name}</h1>
            {company.industry && (
              <Badge variant="secondary">{company.industry}</Badge>
            )}
          </div>
        </div>
        <Button variant="outline">Edit Company</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {company.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`https://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{formatDate(company.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p>{formatDate(company.updated_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contacts ({company.contacts?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!company.contacts?.length ? (
              <p className="text-sm text-muted-foreground">No contacts</p>
            ) : (
              <div className="space-y-2">
                {company.contacts.slice(0, 5).map((contact) => (
                  <Link
                    key={contact.id}
                    to={`/contacts/${contact.id}`}
                    className="block p-2 -mx-2 rounded hover:bg-muted"
                  >
                    <p className="text-sm font-medium">{contact.name}</p>
                    {contact.email && (
                      <p className="text-xs text-muted-foreground">{contact.email}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" />
              Deals ({company.deals?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!company.deals?.length ? (
              <p className="text-sm text-muted-foreground">No deals</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {company.deals.map((deal) => (
                  <Link
                    key={deal.id}
                    to={`/deals/${deal.id}`}
                    className="block p-3 rounded border hover:border-primary transition-colors"
                  >
                    <p className="text-sm font-medium">{deal.name}</p>
                    <Badge variant="secondary" className="mt-1">
                      {deal.stage}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
