// ABOUTME: Supabase Edge Function that sends team invite emails via Resend API
// ABOUTME: Called from the frontend after an invite record is created; email is best-effort

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

    // Parse request body
    const { email, teamName, role, inviteToken } = await req.json()
    if (!email || !teamName || !role || !inviteToken) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, teamName, role, inviteToken' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
    const inviteLink = `${siteUrl}/invite/${inviteToken}`

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build branded HTML email matching Dossier templates
    const html = buildInviteEmailHtml({ teamName, role, inviteLink })

    // Send via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Dossier <onboarding@resend.dev>',
        to: [email],
        subject: `${teamName} invited you to Dossier`,
        html,
      }),
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
    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('send-invite-email error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildInviteEmailHtml({ teamName, role, inviteLink }: { teamName: string; role: string; inviteLink: string }) {
  // Escape HTML entities to prevent XSS in email
  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const safeTeamName = escapeHtml(teamName)
  const safeRole = escapeHtml(role)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>You're invited to Dossier</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FAF7F2;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Inner card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(26, 35, 50, 0.08);">

          <!-- Yellow tab bar -->
          <tr>
            <td style="background-color: #FFD600; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 32px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 28px; height: 24px; background-color: #FFD600; border: 2px solid #1976D2; border-radius: 2px 6px 4px 4px; margin-right: 8px;" width="28" height="24">&nbsp;</td>
                  <td style="padding-left: 10px; font-family: 'Archivo', Arial, sans-serif; font-weight: 800; font-size: 22px; color: #1A2332; letter-spacing: -0.5px;">dossier</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td align="center" style="padding: 28px 40px 0;">
              <h1 style="margin: 0; font-family: 'Archivo', Arial, sans-serif; font-weight: 800; font-size: 24px; color: #1A2332; line-height: 1.2;">You're invited!</h1>
            </td>
          </tr>

          <!-- Body text -->
          <tr>
            <td align="center" style="padding: 12px 40px 0;">
              <p style="margin: 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; color: #3D4F63; line-height: 1.6;">
                <strong>${safeTeamName}</strong> invited you to join their team as <strong>${safeRole}</strong> on Dossier &mdash; the CRM that keeps your relationships organized.
              </p>
            </td>
          </tr>

          <!-- CTA button -->
          <tr>
            <td align="center" style="padding: 28px 40px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color: #1976D2; border-radius: 50px; padding: 14px 32px;">
                    <a href="${inviteLink}" target="_blank" style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; display: inline-block;">Accept Invite &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td align="center" style="padding: 16px 40px 0;">
              <p style="margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; color: #7A8A9E; line-height: 1.5;">
                This invite expires in 7 days.
              </p>
            </td>
          </tr>

          <!-- Safety note -->
          <tr>
            <td align="center" style="padding: 24px 40px 32px;">
              <p style="margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; color: #7A8A9E; line-height: 1.5;">
                Didn't expect this? Just ignore this email.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Inner card -->

        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px;">
          <tr>
            <td align="center" style="padding: 24px 40px;">
              <p style="margin: 0; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #7A8A9E; line-height: 1.5;">
                Powered by <a href="https://nervous.net" target="_blank" style="color: #1976D2; text-decoration: none; font-weight: 600;">nervous</a> energy
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
