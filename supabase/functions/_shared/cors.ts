// ABOUTME: Reusable CORS headers for Supabase Edge Functions
// ABOUTME: Handles preflight OPTIONS requests and standard response headers

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
