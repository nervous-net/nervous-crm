// ABOUTME: Inbox card showing all emails for a deal with expand/collapse, compose, and reply
// ABOUTME: Displays chronological email thread with direction indicators and inline body view

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDealEmails } from '@/lib/db';
import type { DealEmailWithSender } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { Send, Inbox, Plus, Reply } from 'lucide-react';
import ComposeEmail from './ComposeEmail';

interface DealInboxProps {
  dealId: string;
  contactEmail?: string | null;
}

export default function DealInbox({ dealId, contactEmail }: DealInboxProps) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    subject: string;
    from_address: string;
    from_name: string | null;
    message_id: string | null;
  } | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: emails, isLoading } = useQuery({
    queryKey: ['deal-emails', dealId],
    queryFn: () => getDealEmails(dealId),
  });

  function handleCompose() {
    setReplyTo(undefined);
    setComposeOpen(true);
  }

  function handleReply(email: DealEmailWithSender) {
    setReplyTo({
      subject: email.subject,
      from_address: email.from_address,
      from_name: email.from_name,
      message_id: email.message_id,
    });
    setComposeOpen(true);
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  function truncateText(text: string, maxLen: number) {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  }

  function getPreviewText(email: DealEmailWithSender): string {
    if (email.body_text) return truncateText(email.body_text, 100);
    if (email.body_html) {
      const stripped = email.body_html.replace(/<[^>]*>/g, '').trim();
      return truncateText(stripped, 100);
    }
    return '';
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Inbox
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleCompose}>
            <Plus className="h-4 w-4 mr-1" />
            Compose
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !emails?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No emails for this deal
            </p>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => {
                const isOutbound = email.direction === 'outbound';
                const isExpanded = expandedId === email.id;
                const DirectionIcon = isOutbound ? Send : Inbox;

                return (
                  <div key={email.id} className="rounded-lg border border-border/40 overflow-hidden">
                    {/* Email row */}
                    <button
                      onClick={() => toggleExpand(email.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50',
                        isOutbound ? 'bg-blue-50/50' : 'bg-card/60',
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        isOutbound
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700',
                      )}>
                        <DirectionIcon className="h-3.5 w-3.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {isOutbound
                              ? (email.sender?.name || 'You')
                              : (email.from_name || email.from_address)}
                          </span>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {isOutbound ? 'Sent' : 'Received'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{email.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {getPreviewText(email)}
                        </p>
                      </div>

                      <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                        {formatRelativeTime(email.sent_at)}
                      </span>
                    </button>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div className="border-t border-border/40">
                        <div className="p-4 space-y-3">
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p><span className="font-medium">From:</span> {email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}</p>
                            <p><span className="font-medium">To:</span> {formatAddresses(email.to_addresses)}</p>
                            {email.cc_addresses && (email.cc_addresses as Array<{ email: string }>).length > 0 && (
                              <p><span className="font-medium">CC:</span> {formatAddresses(email.cc_addresses)}</p>
                            )}
                          </div>

                          {email.body_html ? (
                            <div
                              className="prose prose-sm max-w-none text-sm"
                              dangerouslySetInnerHTML={{ __html: email.body_html }}
                            />
                          ) : email.body_text ? (
                            <p className="text-sm whitespace-pre-wrap">{email.body_text}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">No content</p>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => handleReply(email)}>
                              <Reply className="h-3.5 w-3.5 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ComposeEmail
        dealId={dealId}
        open={composeOpen}
        onOpenChange={setComposeOpen}
        replyTo={replyTo}
        defaultTo={contactEmail || undefined}
      />
    </>
  );
}

function formatAddresses(addresses: unknown): string {
  if (!Array.isArray(addresses)) return '';
  return addresses
    .map((a: { email: string; name?: string }) => a.name ? `${a.name} <${a.email}>` : a.email)
    .join(', ');
}
