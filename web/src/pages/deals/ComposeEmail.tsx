// ABOUTME: Modal dialog for composing and sending emails from a deal
// ABOUTME: Supports new emails and replies; uses react-hook-form + zod for validation

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendDealEmail } from '@/lib/db';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const emailSchema = z.object({
  to: z.string().min(1, 'At least one recipient is required'),
  cc: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Message body is required'),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface ComposeEmailProps {
  dealId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyTo?: {
    subject: string;
    from_address: string;
    from_name: string | null;
    message_id: string | null;
  };
  defaultTo?: string;
}

function parseEmailList(input: string): Array<{ email: string }> {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(email => ({ email }));
}

export default function ComposeEmail({ dealId, open, onOpenChange, replyTo, defaultTo }: ComposeEmailProps) {
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  const isReply = !!replyTo;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      to: replyTo?.from_address || defaultTo || '',
      cc: '',
      subject: isReply ? `Re: ${replyTo.subject}` : '',
      body: '',
    },
  });

  const sendMutation = useMutation({
    mutationFn: (data: EmailFormData) => {
      setSending(true);
      return sendDealEmail({
        deal_id: dealId,
        to: parseEmailList(data.to),
        cc: data.cc ? parseEmailList(data.cc) : undefined,
        subject: data.subject,
        body_html: `<p>${data.body.replace(/\n/g, '<br/>')}</p>`,
        body_text: data.body,
        in_reply_to: replyTo?.message_id || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-emails', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deal-activities', dealId] });
      toast({ title: 'Email sent' });
      reset();
      onOpenChange(false);
      setSending(false);
    },
    onError: () => {
      toast({ title: 'Failed to send email', variant: 'destructive' });
      setSending(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isReply ? 'Reply' : 'Compose Email'}</DialogTitle>
          <DialogDescription>
            {isReply
              ? `Replying to ${replyTo.from_name || replyTo.from_address}`
              : 'Send an email from this deal'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => sendMutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              placeholder="email@example.com (comma separated)"
              {...register('to')}
            />
            {errors.to && <p className="text-xs text-destructive">{errors.to.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc">CC</Label>
            <Input
              id="cc"
              placeholder="Optional CC addresses"
              {...register('cc')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Email subject"
              {...register('subject')}
            />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <textarea
              id="body"
              rows={8}
              placeholder="Write your message..."
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('body')}
            />
            {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
