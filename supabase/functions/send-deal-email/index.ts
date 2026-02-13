// ABOUTME: Supabase Edge Function that sends emails from a deal via Resend API
// ABOUTME: Authenticated via JWT; stores sent email in deal_emails and creates activity breadcrumb

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate caller's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get profile with team_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, team_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse request body
    const { deal_id, to, cc, subject, body_html, body_text, in_reply_to } = await req.json()
    if (!deal_id || !to || !subject) {
      return new Response(JSON.stringify({ error: 'Missing required fields: deal_id, to, subject' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify deal belongs to user's team
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, name, team_id')
      .eq('id', deal_id)
      .single()

    if (dealError || !deal) {
      return new Response(JSON.stringify({ error: 'Deal not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (deal.team_id !== profile.team_id) {
      return new Response(JSON.stringify({ error: 'Deal does not belong to your team' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build the email payload for Resend
    const toAddresses: Array<{ email: string; name?: string }> = Array.isArray(to) ? to : [to]
    const ccAddresses: Array<{ email: string; name?: string }> = cc ? (Array.isArray(cc) ? cc : [cc]) : []

    const fromAddress = 'Dossier <dossier@mail.nervous.net>'
    const replyTo = 'dossier@mail.nervous.net'

    const emailPayload: Record<string, unknown> = {
      from: fromAddress,
      to: toAddresses.map(a => typeof a === 'string' ? a : a.email),
      subject,
      reply_to: replyTo,
    }

    if (ccAddresses.length > 0) {
      emailPayload.cc = ccAddresses.map(a => typeof a === 'string' ? a : a.email)
    }

    // Wrap body in branded HTML template
    if (body_html) {
      emailPayload.html = buildEmailHtml(body_html)
    }
    if (body_text) {
      emailPayload.text = body_text
    }

    // Set threading headers when replying
    if (in_reply_to) {
      emailPayload.headers = {
        'In-Reply-To': in_reply_to,
        'References': in_reply_to,
      }
    }

    // Send via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    if (!resendRes.ok) {
      const resendError = await resendRes.text()
      console.error('Resend API error:', resendError)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendData = await resendRes.json()

    // Store email in deal_emails
    const { data: emailRecord, error: insertError } = await supabase
      .from('deal_emails')
      .insert({
        team_id: profile.team_id,
        deal_id,
        sender_id: profile.id,
        from_address: 'dossier@mail.nervous.net',
        from_name: profile.name || 'Dossier',
        to_addresses: toAddresses,
        cc_addresses: ccAddresses,
        subject,
        body_html: body_html || null,
        body_text: body_text || null,
        direction: 'outbound',
        resend_email_id: resendData.id || null,
        message_id: resendData.id ? `<${resendData.id}@resend.dev>` : null,
        in_reply_to: in_reply_to || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store email record:', insertError)
      // Email was sent successfully, so we still return success
    }

    // Create activity breadcrumb
    const toLabel = toAddresses.map(a => typeof a === 'string' ? a : (a.name || a.email)).join(', ')
    await supabase.from('activities').insert({
      team_id: profile.team_id,
      deal_id,
      assigned_to: profile.id,
      type: 'email',
      subject: `Sent: ${subject}`,
      description: `Email sent to ${toLabel}`,
      completed_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ success: true, id: emailRecord?.id || resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('send-deal-email error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildEmailHtml(bodyContent: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF7F2;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="background-color: #FFD600; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 24px 32px;">
              <div style="font-size: 15px; line-height: 1.6; color: #1A2332;">
                ${bodyContent}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; border-top: 1px solid #E8E4DD;">
              <p style="margin: 0; font-size: 12px; color: #7A8A9E;">
                Sent via <span style="color: #1976D2; font-weight: 600;">Dossier</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
