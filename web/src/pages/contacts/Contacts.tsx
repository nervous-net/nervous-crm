// ABOUTME: Contacts list page with search functionality
// ABOUTME: Displays all contacts with company associations

import { useState, useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getContacts } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Mail, Phone } from 'lucide-react';

export default function Contacts() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', deferredSearch],
    queryFn: () => getContacts({ search: deferredSearch || undefined }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            {contacts?.length || 0} contacts
          </p>
        </div>
        <Button asChild>
          <Link to="/contacts/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Link>
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !contacts?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              {search ? 'No contacts found' : 'No contacts yet. Add your first contact!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <Link key={contact.id} to={`/contacts/${contact.id}`}>
              <Card className="hover:border-primary transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{contact.name}</CardTitle>
                  {contact.title && (
                    <p className="text-sm text-muted-foreground">{contact.title}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {contact.company && (
                    <Badge variant="secondary">{contact.company.name}</Badge>
                  )}
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    Added {formatDate(contact.created_at)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
