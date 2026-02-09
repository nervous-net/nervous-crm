// ABOUTME: TypeScript types for Supabase database schema
// ABOUTME: These match the tables created in supabase-schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: 'owner' | 'admin' | 'member' | 'viewer'
          team_id: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          team_id: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'owner' | 'admin' | 'member' | 'viewer'
          team_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      companies: {
        Row: {
          id: string
          team_id: string
          name: string
          website: string | null
          industry: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          website?: string | null
          industry?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          website?: string | null
          industry?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'companies_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      contacts: {
        Row: {
          id: string
          team_id: string
          company_id: string | null
          name: string
          email: string | null
          phone: string | null
          title: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          company_id?: string | null
          name: string
          email?: string | null
          phone?: string | null
          title?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          company_id?: string | null
          name?: string
          email?: string | null
          phone?: string | null
          title?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'contacts_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contacts_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          }
        ]
      }
      deals: {
        Row: {
          id: string
          team_id: string
          company_id: string | null
          contact_id: string | null
          name: string
          value: number | null
          stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
          expected_close: string | null
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          company_id?: string | null
          contact_id?: string | null
          name: string
          value?: number | null
          stage?: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
          expected_close?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          company_id?: string | null
          contact_id?: string | null
          name?: string
          value?: number | null
          stage?: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
          expected_close?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'deals_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_company_id_fkey'
            columns: ['company_id']
            isOneToOne: false
            referencedRelation: 'companies'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deals_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          }
        ]
      }
      activities: {
        Row: {
          id: string
          team_id: string
          deal_id: string | null
          contact_id: string | null
          assigned_to: string | null
          type: 'task' | 'call' | 'email' | 'meeting'
          subject: string
          description: string | null
          due_date: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          deal_id?: string | null
          contact_id?: string | null
          assigned_to?: string | null
          type: 'task' | 'call' | 'email' | 'meeting'
          subject: string
          description?: string | null
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          deal_id?: string | null
          contact_id?: string | null
          assigned_to?: string | null
          type?: 'task' | 'call' | 'email' | 'meeting'
          subject?: string
          description?: string | null
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activities_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: false
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_assigned_to_fkey'
            columns: ['assigned_to']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      deal_notes: {
        Row: {
          id: string
          team_id: string
          deal_id: string
          author_id: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          deal_id: string
          author_id?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          deal_id?: string
          author_id?: string | null
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deal_notes_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deal_notes_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: false
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deal_notes_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      deal_members: {
        Row: {
          id: string
          team_id: string
          deal_id: string
          profile_id: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          deal_id: string
          profile_id: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          deal_id?: string
          profile_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deal_members_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deal_members_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: false
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deal_members_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      deal_emails: {
        Row: {
          id: string
          team_id: string
          deal_id: string
          sender_id: string | null
          from_address: string
          from_name: string | null
          to_addresses: Json
          cc_addresses: Json
          subject: string
          body_html: string | null
          body_text: string | null
          direction: 'inbound' | 'outbound'
          resend_email_id: string | null
          message_id: string | null
          in_reply_to: string | null
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          deal_id: string
          sender_id?: string | null
          from_address: string
          from_name?: string | null
          to_addresses?: Json
          cc_addresses?: Json
          subject: string
          body_html?: string | null
          body_text?: string | null
          direction: 'inbound' | 'outbound'
          resend_email_id?: string | null
          message_id?: string | null
          in_reply_to?: string | null
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          deal_id?: string
          sender_id?: string | null
          from_address?: string
          from_name?: string | null
          to_addresses?: Json
          cc_addresses?: Json
          subject?: string
          body_html?: string | null
          body_text?: string | null
          direction?: 'inbound' | 'outbound'
          resend_email_id?: string | null
          message_id?: string | null
          in_reply_to?: string | null
          sent_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deal_emails_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deal_emails_deal_id_fkey'
            columns: ['deal_id']
            isOneToOne: false
            referencedRelation: 'deals'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deal_emails_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      invites: {
        Row: {
          id: string
          team_id: string
          email: string
          role: 'admin' | 'member' | 'viewer'
          token: string
          status: 'pending' | 'accepted' | 'expired'
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          role?: 'admin' | 'member' | 'viewer'
          token: string
          status?: 'pending' | 'accepted' | 'expired'
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          email?: string
          role?: 'admin' | 'member' | 'viewer'
          token?: string
          status?: 'pending' | 'accepted' | 'expired'
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'invites_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          team_id: string
          user_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: {
        Args: Record<string, never>
        Returns: undefined
      }
      get_my_team_id: {
        Args: Record<string, never>
        Returns: string
      }
      transfer_ownership: {
        Args: { new_owner_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
