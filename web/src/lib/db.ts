// ABOUTME: Database operations using Supabase
// ABOUTME: Provides typed CRUD functions for all CRM entities

import { supabase } from './supabase';
import type { Tables } from './database.types';

// Helper to get current user's team_id
async function getTeamId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');
  return profile.team_id;
}

// ============================================
// COMPANIES
// ============================================

export interface CompanyWithCounts extends Tables<'companies'> {
  contacts_count: number;
  deals_count: number;
}

export interface CompanyWithRelations extends Tables<'companies'> {
  contacts: Tables<'contacts'>[];
  deals: Tables<'deals'>[];
}

export async function getCompanies(search?: string) {
  let query = supabase
    .from('companies')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Get counts for each company
  const companiesWithCounts = await Promise.all(
    (data || []).map(async (company) => {
      const [contactsRes, dealsRes] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('company_id', company.id).is('deleted_at', null),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('company_id', company.id).is('deleted_at', null),
      ]);
      return {
        ...company,
        contacts_count: contactsRes.count || 0,
        deals_count: dealsRes.count || 0,
      };
    })
  );

  return companiesWithCounts;
}

export async function getCompany(id: string) {
  const { data: company, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) throw error;

  // Fetch related contacts and deals
  const [contactsRes, dealsRes] = await Promise.all([
    supabase.from('contacts').select('*').eq('company_id', id).is('deleted_at', null),
    supabase.from('deals').select('*').eq('company_id', id).is('deleted_at', null),
  ]);

  return {
    ...company,
    contacts: contactsRes.data || [],
    deals: dealsRes.data || [],
  } as CompanyWithRelations;
}

export async function createCompany(data: { name: string; website?: string; industry?: string; notes?: string }) {
  const teamId = await getTeamId();
  const { data: company, error } = await supabase
    .from('companies')
    .insert({ ...data, team_id: teamId })
    .select()
    .single();

  if (error) throw error;
  return company;
}

export async function updateCompany(id: string, data: { name?: string; website?: string; industry?: string; notes?: string }) {
  const { data: company, error } = await supabase
    .from('companies')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return company;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase
    .from('companies')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// CONTACTS
// ============================================

export interface ContactWithCompany extends Tables<'contacts'> {
  company: Tables<'companies'> | null;
}

export async function getContacts(options?: { search?: string; companyId?: string; limit?: number }) {
  let query = supabase
    .from('contacts')
    .select('*, company:companies(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%`);
  }
  if (options?.companyId) {
    query = query.eq('company_id', options.companyId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ContactWithCompany[];
}

export async function getContact(id: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*, company:companies(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data as ContactWithCompany;
}

export async function createContact(data: { name: string; email?: string; phone?: string; title?: string; company_id?: string; notes?: string }) {
  const teamId = await getTeamId();
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({ ...data, team_id: teamId })
    .select('*, company:companies(*)')
    .single();

  if (error) throw error;
  return contact as ContactWithCompany;
}

export async function updateContact(id: string, data: { name?: string; email?: string; phone?: string; title?: string; company_id?: string; notes?: string }) {
  const { data: contact, error } = await supabase
    .from('contacts')
    .update(data)
    .eq('id', id)
    .select('*, company:companies(*)')
    .single();

  if (error) throw error;
  return contact as ContactWithCompany;
}

export async function deleteContact(id: string) {
  const { error } = await supabase
    .from('contacts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// DEALS
// ============================================

export interface DealWithRelations extends Tables<'deals'> {
  company: Tables<'companies'> | null;
  contact: Tables<'contacts'> | null;
}

export interface PipelineStage {
  stage: string;
  deals: DealWithRelations[];
  count: number;
  totalValue: number;
}

const STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
type DealStage = typeof STAGES[number];

export async function getDeals(options?: { stage?: DealStage; companyId?: string }) {
  let query = supabase
    .from('deals')
    .select('*, company:companies(*), contact:contacts(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (options?.stage) {
    query = query.eq('stage', options.stage);
  }
  if (options?.companyId) {
    query = query.eq('company_id', options.companyId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as DealWithRelations[];
}

export async function getDealsPipeline(): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*, company:companies(*), contact:contacts(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const deals = data as DealWithRelations[];

  // Group by stage
  const pipeline = STAGES.map(stage => {
    const stageDeals = deals.filter(d => d.stage === stage);
    return {
      stage,
      deals: stageDeals,
      count: stageDeals.length,
      totalValue: stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
    };
  });

  return pipeline;
}

export async function getDeal(id: string) {
  const { data, error } = await supabase
    .from('deals')
    .select('*, company:companies(*), contact:contacts(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) throw error;
  return data as DealWithRelations;
}

export async function createDeal(data: {
  name: string;
  value?: number;
  stage?: DealStage;
  expected_close?: string;
  company_id?: string;
  contact_id?: string;
  notes?: string;
}) {
  const teamId = await getTeamId();
  const { data: deal, error } = await supabase
    .from('deals')
    .insert({ ...data, team_id: teamId })
    .select('*, company:companies(*), contact:contacts(*)')
    .single();

  if (error) throw error;
  return deal as DealWithRelations;
}

export async function updateDeal(id: string, data: {
  name?: string;
  value?: number;
  stage?: DealStage;
  expected_close?: string;
  company_id?: string;
  contact_id?: string;
  notes?: string;
}) {
  const { data: deal, error } = await supabase
    .from('deals')
    .update(data)
    .eq('id', id)
    .select('*, company:companies(*), contact:contacts(*)')
    .single();

  if (error) throw error;
  return deal as DealWithRelations;
}

export async function deleteDeal(id: string) {
  const { error } = await supabase
    .from('deals')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// ACTIVITIES
// ============================================

export interface ActivityWithRelations extends Tables<'activities'> {
  contact: Tables<'contacts'> | null;
  deal: Tables<'deals'> | null;
}

export async function getActivities(options?: { contactId?: string; dealId?: string }) {
  let query = supabase
    .from('activities')
    .select('*, contact:contacts(*), deal:deals(*)')
    .order('due_date', { ascending: true });

  if (options?.contactId) {
    query = query.eq('contact_id', options.contactId);
  }
  if (options?.dealId) {
    query = query.eq('deal_id', options.dealId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ActivityWithRelations[];
}

export async function getUpcomingActivities(days: number = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  const { data, error } = await supabase
    .from('activities')
    .select('*, contact:contacts(*), deal:deals(*)')
    .is('completed_at', null)
    .gte('due_date', now.toISOString())
    .lte('due_date', future.toISOString())
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data as ActivityWithRelations[];
}

export async function getOverdueActivities() {
  const now = new Date();

  const { data, error } = await supabase
    .from('activities')
    .select('*, contact:contacts(*), deal:deals(*)')
    .is('completed_at', null)
    .lt('due_date', now.toISOString())
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data as ActivityWithRelations[];
}

export async function getActivity(id: string) {
  const { data, error } = await supabase
    .from('activities')
    .select('*, contact:contacts(*), deal:deals(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ActivityWithRelations;
}

export async function createActivity(data: {
  type: 'task' | 'call' | 'email' | 'meeting';
  subject: string;
  description?: string;
  due_date?: string;
  contact_id?: string;
  deal_id?: string;
}) {
  const teamId = await getTeamId();
  const { data: activity, error } = await supabase
    .from('activities')
    .insert({ ...data, team_id: teamId })
    .select('*, contact:contacts(*), deal:deals(*)')
    .single();

  if (error) throw error;
  return activity as ActivityWithRelations;
}

export async function updateActivity(id: string, data: {
  type?: 'task' | 'call' | 'email' | 'meeting';
  subject?: string;
  description?: string;
  due_date?: string;
  completed_at?: string;
  contact_id?: string;
  deal_id?: string;
}) {
  const { data: activity, error } = await supabase
    .from('activities')
    .update(data)
    .eq('id', id)
    .select('*, contact:contacts(*), deal:deals(*)')
    .single();

  if (error) throw error;
  return activity as ActivityWithRelations;
}

export async function completeActivity(id: string) {
  return updateActivity(id, { completed_at: new Date().toISOString() });
}

export async function deleteActivity(id: string) {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================
// DASHBOARD
// ============================================

export interface DashboardData {
  deals: {
    open: number;
    totalValue: number;
    wonThisMonth: number;
    wonValue: number;
  };
  activities: {
    upcoming: ActivityWithRelations[];
    overdue: ActivityWithRelations[];
  };
  recentContacts: ContactWithCompany[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const [pipeline, upcoming, overdue, contacts] = await Promise.all([
    getDealsPipeline(),
    getUpcomingActivities(7),
    getOverdueActivities(),
    getContacts({ limit: 5 }),
  ]);

  const openStages = ['lead', 'qualified', 'proposal', 'negotiation'];
  const openDeals = pipeline.filter(s => openStages.includes(s.stage));
  const wonDeals = pipeline.find(s => s.stage === 'won');

  return {
    deals: {
      open: openDeals.reduce((sum, s) => sum + s.count, 0),
      totalValue: openDeals.reduce((sum, s) => sum + s.totalValue, 0),
      wonThisMonth: wonDeals?.count || 0,
      wonValue: wonDeals?.totalValue || 0,
    },
    activities: {
      upcoming,
      overdue,
    },
    recentContacts: contacts,
  };
}

// ============================================
// USER PROFILE
// ============================================

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, teams(name)')
    .eq('id', user.id)
    .single();

  return profile;
}

// ============================================
// TEAM MANAGEMENT
// ============================================

export async function getTeamMembers() {
  const teamId = await getTeamId();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, created_at')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateMemberRole(userId: string, role: 'admin' | 'member' | 'viewer') {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeMember(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) throw error;
}

export async function getTeamInvites() {
  const teamId = await getTeamId();
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createInvite(email: string, role: 'admin' | 'member' | 'viewer') {
  const teamId = await getTeamId();
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from('invites')
    .insert({
      team_id: teamId,
      email,
      role,
      token,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function cancelInvite(id: string) {
  const { error } = await supabase
    .from('invites')
    .update({ status: 'expired' as const })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
}

export async function transferOwnership(newOwnerId: string) {
  const { error } = await supabase.rpc('transfer_ownership', { new_owner_id: newOwnerId });
  if (error) throw error;
}

export async function sendInviteEmail(params: { email: string; teamName: string; role: string; inviteToken: string }) {
  const { data, error } = await supabase.functions.invoke('send-invite-email', {
    body: params,
  });

  if (error) throw error;
  return data;
}

export async function updateProfile(data: { name?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return profile;
}
