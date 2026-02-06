// ABOUTME: Main dashboard page showing CRM overview
// ABOUTME: Displays deal stats, upcoming activities, and recent contacts

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboardData } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Handshake, Trophy, AlertCircle, Clock, Users } from 'lucide-react';

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-destructive">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Deals</CardTitle>
            <Handshake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.deals.open}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.deals.totalValue)} pipeline value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.deals.wonThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.deals.wonValue)} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {data.activities.overdue.length}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activities.upcoming.length}</div>
            <p className="text-xs text-muted-foreground">Activities scheduled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Upcoming Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.activities.upcoming.length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming activities</p>
            ) : (
              <div className="space-y-3">
                {data.activities.upcoming.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{activity.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.contact?.name || activity.deal?.name || 'No associated record'}
                      </p>
                    </div>
                    {activity.due_date && (
                      <Badge variant="secondary">{formatDate(activity.due_date)}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link
              to="/activities"
              className="text-sm text-primary hover:underline mt-4 block"
            >
              View all activities
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentContacts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No contacts yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentContacts.map((contact) => (
                  <Link
                    key={contact.id}
                    to={`/contacts/${contact.id}`}
                    className="flex items-center justify-between hover:bg-muted -mx-2 px-2 py-1 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.company?.name || contact.email}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(contact.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <Link
              to="/contacts"
              className="text-sm text-primary hover:underline mt-4 block"
            >
              View all contacts
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
