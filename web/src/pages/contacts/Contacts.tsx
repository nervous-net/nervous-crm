// ABOUTME: Contacts list page with search functionality
// ABOUTME: Displays all contacts in a row-based list with initials avatars

import { useState, useDeferredValue } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getContacts } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { Plus, Search } from 'lucide-react';

const avatarColors = [
  'bg-primary/10 text-primary',
  'bg-accent/20 text-accent-foreground',
  'bg-orange-100 text-orange-800',
  'bg-purple-100 text-purple-800',
  'bg-green-100 text-green-800',
];

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

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
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {contacts?.length || 0} contacts
          </p>
        </div>
        <Button asChild className="rounded-full">
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
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-3 rounded-xl bg-card/60 border border-border/40">
              <div className="h-12 bg-muted animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      ) : !contacts?.length ? (
        <div className="p-12 rounded-xl bg-card/60 border border-border/40 text-center">
          <p className="text-muted-foreground">
            {search ? 'No contacts found' : 'No contacts yet. Add your first contact!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Link
              key={contact.id}
              to={`/contacts/${contact.id}`}
              className="flex items-center gap-4 p-3 rounded-xl bg-card/60 border border-border/40 hover:border-primary/40 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${getAvatarColor(contact.name)}`}>
                {getInitials(contact.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{contact.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[contact.title, contact.company?.name].filter(Boolean).join(' · ') || 'No title'}
                </p>
              </div>
              {contact.company && (
                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0">
                  {contact.company.name}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                Added {formatDate(contact.created_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
