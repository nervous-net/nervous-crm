-- ABOUTME: Migration to add deal_emails table for sending/receiving emails on deals
-- ABOUTME: Stores outbound (sent via Resend) and inbound (received via webhook) emails

-- ============================================
-- TABLE: deal_emails
-- ============================================

CREATE TABLE deal_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses JSONB NOT NULL DEFAULT '[]',
  cc_addresses JSONB NOT NULL DEFAULT '[]',
  subject TEXT NOT NULL,
  body_html TEXT,
  body_text TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  resend_email_id TEXT,
  message_id TEXT,
  in_reply_to TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_deal_emails_team_id ON deal_emails(team_id);
CREATE INDEX idx_deal_emails_deal_id ON deal_emails(deal_id);
CREATE INDEX idx_deal_emails_direction ON deal_emails(direction);
CREATE INDEX idx_deal_emails_from_address ON deal_emails(from_address);
CREATE INDEX idx_deal_emails_sent_at ON deal_emails(sent_at);
CREATE INDEX idx_deal_emails_message_id ON deal_emails(message_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE deal_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read deal emails"
  ON deal_emails FOR SELECT
  USING (team_id = get_team_id());

CREATE POLICY "Team members can insert deal emails"
  ON deal_emails FOR INSERT
  WITH CHECK (team_id = get_team_id());

CREATE POLICY "Team members can update deal emails"
  ON deal_emails FOR UPDATE
  USING (team_id = get_team_id());

CREATE POLICY "Team members can delete deal emails"
  ON deal_emails FOR DELETE
  USING (team_id = get_team_id());

-- Service role bypasses RLS, so the receive-email webhook can write directly
