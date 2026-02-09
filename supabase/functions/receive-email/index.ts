// ABOUTME: Supabase Edge Function webhook that receives inbound emails from Resend
// ABOUTME: Matches emails to deals via message threading or contact lookup, stores in deal_emails

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Svix webhook verification
import { Webhook } from 'https://esm.sh/svix@1.15.0'

Deno.serve(async (req) => {
  // Webhooks are POST only
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('RESEND_WEBHOOK_SECRET not configured')
      return new Response('Server misconfigured', { status: 500 })
    }

    // Read raw body for signature verification
    const rawBody = await req.text()

    // Verify Svix signature
    const svixId = req.headers.get('svix-id')
    const svixTimestamp = req.headers.get('svix-timestamp')
    const svixSignature = req.headers.get('svix-signature')

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response('Missing webhook signature headers', { status: 400 })
    }

    const wh = new Webhook(webhookSecret)
    let payload: Record<string, unknown>
    try {
      payload = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as Record<string, unknown>
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 401 })
    }

    // Only process email.received events
    const eventType = payload.type as string
    if (eventType !== 'email.received') {
      return new Response(JSON.stringify({ ignored: true, reason: `Event type: ${eventType}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const emailData = payload.data as Record<string, unknown>
    const resendEmailId = emailData.email_id as string
    const from = emailData.from as string
    const to = emailData.to as string[]
    const subject = (emailData.subject as string) || '(no subject)'
    const inReplyTo = emailData.headers?.['in-reply-to'] as string | undefined
      ?? (emailData as Record<string, unknown>).in_reply_to as string | undefined

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Fetch full email body from Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    let bodyHtml: string | null = null
    let bodyText: string | null = null

    if (resendApiKey && resendEmailId) {
      try {
        const emailRes = await fetch(`https://api.resend.com/emails/receiving/${resendEmailId}`, {
          headers: { 'Authorization': `Bearer ${resendApiKey}` },
        })
        if (emailRes.ok) {
          const fullEmail = await emailRes.json()
          bodyHtml = fullEmail.html || null
          bodyText = fullEmail.text || null
        }
      } catch (fetchErr) {
        console.error('Failed to fetch full email from Resend:', fetchErr)
      }
    }

    // Fallback: use body from webhook payload if available
    if (!bodyHtml && !bodyText) {
      bodyHtml = (emailData.html as string) || null
      bodyText = (emailData.text as string) || null
    }

    // Parse sender info
    const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/)
    const fromAddress = fromMatch ? fromMatch[2] : from
    const fromName = fromMatch ? fromMatch[1].trim() : null

    // Match to a deal
    let dealId: string | null = null
    let teamId: string | null = null

    // Strategy 1: Thread matching via in_reply_to → deal_emails.message_id
    if (inReplyTo) {
      const { data: threadMatch } = await supabaseAdmin
        .from('deal_emails')
        .select('deal_id, team_id')
        .eq('message_id', inReplyTo)
        .limit(1)
        .single()

      if (threadMatch) {
        dealId = threadMatch.deal_id
        teamId = threadMatch.team_id
      }
    }

    // Strategy 2: Match sender email against contacts, find deals with that contact
    if (!dealId) {
      const { data: contacts } = await supabaseAdmin
        .from('contacts')
        .select('id, team_id')
        .eq('email', fromAddress)
        .is('deleted_at', null)
        .limit(5)

      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          const { data: deals } = await supabaseAdmin
            .from('deals')
            .select('id, team_id')
            .eq('contact_id', contact.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)

          if (deals && deals.length > 0) {
            dealId = deals[0].id
            teamId = deals[0].team_id
            break
          }
        }
      }
    }

    // No match → log and discard (team_id is required)
    if (!dealId || !teamId) {
      console.log('No deal match found for inbound email', {
        from: fromAddress,
        subject,
        in_reply_to: inReplyTo,
      })
      return new Response(JSON.stringify({ stored: false, reason: 'No matching deal found' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Store email in deal_emails
    const { data: emailRecord, error: insertError } = await supabaseAdmin
      .from('deal_emails')
      .insert({
        team_id: teamId,
        deal_id: dealId,
        sender_id: null,
        from_address: fromAddress,
        from_name: fromName,
        to_addresses: (to || []).map(addr => ({ email: addr })),
        cc_addresses: [],
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        direction: 'inbound',
        resend_email_id: resendEmailId || null,
        message_id: emailData.message_id as string || null,
        in_reply_to: inReplyTo || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store inbound email:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to store email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create activity breadcrumb
    await supabaseAdmin.from('activities').insert({
      team_id: teamId,
      deal_id: dealId,
      type: 'email',
      subject: `Received: ${subject}`,
      description: `Email from ${fromName || fromAddress}`,
      completed_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ stored: true, id: emailRecord?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('receive-email error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
