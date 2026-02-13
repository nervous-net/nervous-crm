// ABOUTME: Database operations using the Nervous System gateway API.
// ABOUTME: Provides typed CRUD functions for all CRM entities via REST calls.

import { api, getStoredUser } from './supabase';
import type { Tables, Json } from './database.types';

// ============================================
// Gateway response types (internal, not exported)
// ============================================

interface GatewayCompany {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  notes: string | null;
  contact_count: number;
  deal_count: number;
  created_at: string;
  updated_at: string;
}

interface GatewayCompanyDetail extends GatewayCompany {
  contacts: GatewayContact[];
  deals: GatewayDeal[];
}

interface GatewayContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  company_id: string | null;
  company_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface GatewayDeal {
  id: string;
  name: string;
  value: number | null;
  stage: string;
  expected_close: string | null;
  company_id: string | null;
  company_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface GatewayPipelineResponse {
  stages: Record<string, {
    count: number;
    total_value: number;
    deals: GatewayDeal[];
  }>;
}

interface GatewayActivity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  contact_id: string | null;
  deal_id: string | null;
  assigned_to: string | null;
  created_at: string;
}

interface GatewayDealNote {
  id: string;
  deal_id: string;
  author_id: string | null;
  author_name: string | null;
  content: string;
  created_at: string;
}

interface GatewayDealMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
}

interface GatewayDealEmail {
  id: string;
  deal_id: string;
  sender_id: string | null;
  from_address: string;
  from_name: string | null;
  to_addresses: Json;
  cc_addresses: Json;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  direction: string;
  resend_email_id: string | null;
  message_id: string | null;
  in_reply_to: string | null;
  sent_at: string;
  created_at: string;
}

interface GatewayTeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface GatewayInvite {
  id: string;
  email: string;
  role: string;
  token?: string;
  status: string;
  expires_at: string;
  created_at: string;
}

// ============================================
// Response mappers (gateway shape -> standalone shape)
// ============================================

function mapCompanyFromGateway(gw: GatewayCompany): Tables<'companies'> {
  return {
    id: gw.id,
    team_id: '',
    name: gw.name,
    website: gw.domain,
    industry: gw.industry,
    notes: gw.notes,
    created_at: gw.created_at,
    updated_at: gw.updated_at,
    deleted_at: null,
  };
}

function mapContactFromGateway(gw: GatewayContact): ContactWithCompany {
  return {
    id: gw.id,
    team_id: '',
    company_id: gw.company_id,
    name: gw.name,
    email: gw.email,
    phone: gw.phone,
    title: gw.title,
    notes: gw.notes,
    created_at: gw.created_at,
    updated_at: gw.updated_at,
    deleted_at: null,
    company: gw.company_id
      ? { id: gw.company_id, team_id: '', name: gw.company_name || '', website: null, industry: null, notes: null, created_at: '', updated_at: '', deleted_at: null }
      : null,
  };
}

function mapDealFromGateway(gw: GatewayDeal): DealWithRelations {
  return {
    id: gw.id,
    team_id: '',
    company_id: gw.company_id,
    contact_id: gw.contact_id,
    name: gw.name,
    value: gw.value,
    stage: gw.stage as Tables<'deals'>['stage'],
    expected_close: gw.expected_close,
    notes: gw.notes,
    created_at: gw.created_at,
    updated_at: gw.updated_at,
    deleted_at: null,
    company: gw.company_id
      ? { id: gw.company_id, team_id: '', name: gw.company_name || '', website: null, industry: null, notes: null, created_at: '', updated_at: '', deleted_at: null }
      : null,
    contact: gw.contact_id
      ? { id: gw.contact_id, team_id: '', company_id: null, name: gw.contact_name || '', email: null, phone: null, title: null, notes: null, created_at: '', updated_at: '', deleted_at: null }
      : null,
  };
}

function mapActivityFromGateway(gw: GatewayActivity): ActivityWithRelations {
  return {
    id: gw.id,
    team_id: '',
    deal_id: gw.deal_id,
    contact_id: gw.contact_id,
    assigned_to: gw.assigned_to,
    type: gw.type as Tables<'activities'>['type'],
    subject: gw.subject,
    description: gw.description,
    due_date: gw.due_date,
    completed_at: gw.completed_at,
    created_at: gw.created_at,
    // Gateway returns flat IDs only, no nested objects
    contact: null,
    deal: null,
    assignee: null,
  };
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

export async function getCompanies(search?: string): Promise<CompanyWithCounts[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const query = params.toString();
  const path = `/api/crm/companies${query ? `?${query}` : ''}`;

  const data = await api.get<GatewayCompany[]>(path);
  return data.map((gw) => ({
    ...mapCompanyFromGateway(gw),
    contacts_count: gw.contact_count,
    deals_count: gw.deal_count,
  }));
}

export async function getCompany(id: string): Promise<CompanyWithRelations> {
  const gw = await api.get<GatewayCompanyDetail>(`/api/crm/companies/${id}`);
  const base = mapCompanyFromGateway(gw);
  return {
    ...base,
    contacts: (gw.contacts || []).map((c) => ({
      id: c.id,
      team_id: '',
      company_id: c.company_id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      title: c.title,
      notes: c.notes,
      created_at: c.created_at,
      updated_at: c.updated_at,
      deleted_at: null,
    })),
    deals: (gw.deals || []).map((d) => ({
      id: d.id,
      team_id: '',
      company_id: d.company_id,
      contact_id: d.contact_id,
      name: d.name,
      value: d.value,
      stage: d.stage as Tables<'deals'>['stage'],
      expected_close: d.expected_close,
      notes: d.notes,
      created_at: d.created_at,
      updated_at: d.updated_at,
      deleted_at: null,
    })),
  };
}

export async function createCompany(data: { name: string; website?: string; industry?: string; notes?: string }) {
  const body = {
    name: data.name,
    domain: data.website,
    industry: data.industry,
    notes: data.notes,
  };
  const gw = await api.post<GatewayCompany>('/api/crm/companies', body);
  return mapCompanyFromGateway(gw);
}

export async function updateCompany(id: string, data: { name?: string; website?: string; industry?: string; notes?: string }) {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.website !== undefined) body.domain = data.website;
  if (data.industry !== undefined) body.industry = data.industry;
  if (data.notes !== undefined) body.notes = data.notes;

  const gw = await api.put<GatewayCompany>(`/api/crm/companies/${id}`, body);
  return mapCompanyFromGateway(gw);
}

export async function deleteCompany(id: string) {
  await api.delete(`/api/crm/companies/${id}`);
}

// ============================================
// CONTACTS
// ============================================

export interface ContactWithCompany extends Tables<'contacts'> {
  company: Tables<'companies'> | null;
}

export async function getContacts(options?: { search?: string; companyId?: string; limit?: number }): Promise<ContactWithCompany[]> {
  const params = new URLSearchParams();
  if (options?.search) params.set('search', options.search);
  if (options?.companyId) params.set('company_id', options.companyId);
  const query = params.toString();
  const path = `/api/crm/contacts${query ? `?${query}` : ''}`;

  const data = await api.get<GatewayContact[]>(path);
  let contacts = data.map(mapContactFromGateway);

  // Gateway may not support limit param, apply client-side
  if (options?.limit) {
    contacts = contacts.slice(0, options.limit);
  }

  return contacts;
}

export async function getContact(id: string): Promise<ContactWithCompany> {
  const gw = await api.get<GatewayContact>(`/api/crm/contacts/${id}`);
  return mapContactFromGateway(gw);
}

export async function createContact(data: { name: string; email?: string; phone?: string; title?: string; company_id?: string; notes?: string }): Promise<ContactWithCompany> {
  const gw = await api.post<GatewayContact>('/api/crm/contacts', data);
  return mapContactFromGateway(gw);
}

export async function updateContact(id: string, data: { name?: string; email?: string; phone?: string; title?: string; company_id?: string; notes?: string }): Promise<ContactWithCompany> {
  const gw = await api.put<GatewayContact>(`/api/crm/contacts/${id}`, data);
  return mapContactFromGateway(gw);
}

export async function deleteContact(id: string) {
  await api.delete(`/api/crm/contacts/${id}`);
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

export async function getDeals(options?: { stage?: DealStage; companyId?: string }): Promise<DealWithRelations[]> {
  const params = new URLSearchParams();
  if (options?.stage) params.set('stage', options.stage);
  if (options?.companyId) params.set('company_id', options.companyId);
  const query = params.toString();
  const path = `/api/crm/deals${query ? `?${query}` : ''}`;

  const data = await api.get<GatewayDeal[]>(path);
  return data.map(mapDealFromGateway);
}

export async function getDealsPipeline(): Promise<PipelineStage[]> {
  const data = await api.get<GatewayPipelineResponse>('/api/crm/deals/pipeline');

  return STAGES.map((stage) => {
    const stageData = data.stages[stage];
    if (!stageData) {
      return { stage, deals: [], count: 0, totalValue: 0 };
    }
    return {
      stage,
      deals: (stageData.deals || []).map(mapDealFromGateway),
      count: stageData.count,
      totalValue: stageData.total_value,
    };
  });
}

export async function getDeal(id: string): Promise<DealWithRelations> {
  const gw = await api.get<GatewayDeal>(`/api/crm/deals/${id}`);
  return mapDealFromGateway(gw);
}

export async function createDeal(data: {
  name: string;
  value?: number;
  stage?: DealStage;
  expected_close?: string;
  company_id?: string;
  contact_id?: string;
  notes?: string;
}): Promise<DealWithRelations> {
  const gw = await api.post<GatewayDeal>('/api/crm/deals', data);
  return mapDealFromGateway(gw);
}

export async function updateDeal(id: string, data: {
  name?: string;
  value?: number;
  stage?: DealStage;
  expected_close?: string;
  company_id?: string;
  contact_id?: string;
  notes?: string;
}): Promise<DealWithRelations> {
  const gw = await api.put<GatewayDeal>(`/api/crm/deals/${id}`, data);
  return mapDealFromGateway(gw);
}

export async function deleteDeal(id: string) {
  await api.delete(`/api/crm/deals/${id}`);
}

// ============================================
// ACTIVITIES
// ============================================

export interface ActivityAssignee {
  id: string;
  name: string;
  email: string;
}

export interface ActivityWithRelations extends Tables<'activities'> {
  contact: Tables<'contacts'> | null;
  deal: Tables<'deals'> | null;
  assignee: ActivityAssignee | null;
}

export async function getActivities(options?: { contactId?: string; dealId?: string }): Promise<ActivityWithRelations[]> {
  const params = new URLSearchParams();
  if (options?.contactId) params.set('contact_id', options.contactId);
  if (options?.dealId) params.set('deal_id', options.dealId);
  const query = params.toString();
  const path = `/api/crm/activities${query ? `?${query}` : ''}`;

  const data = await api.get<GatewayActivity[]>(path);
  return data.map(mapActivityFromGateway);
}

export async function getUpcomingActivities(days: number = 7): Promise<ActivityWithRelations[]> {
  // Gateway does not support date filtering, fetch all incomplete and filter client-side
  const data = await api.get<GatewayActivity[]>('/api/crm/activities');
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return data
    .filter((a) => {
      if (a.completed_at) return false;
      if (!a.due_date) return false;
      const due = new Date(a.due_date);
      return due >= now && due <= future;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .map(mapActivityFromGateway);
}

export async function getOverdueActivities(): Promise<ActivityWithRelations[]> {
  // Gateway does not support date filtering, fetch all incomplete and filter client-side
  const data = await api.get<GatewayActivity[]>('/api/crm/activities');
  const now = new Date();

  return data
    .filter((a) => {
      if (a.completed_at) return false;
      if (!a.due_date) return false;
      return new Date(a.due_date) < now;
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .map(mapActivityFromGateway);
}

export async function getActivity(id: string): Promise<ActivityWithRelations> {
  const gw = await api.get<GatewayActivity>(`/api/crm/activities/${id}`);
  return mapActivityFromGateway(gw);
}

export async function createActivity(data: {
  type: 'task' | 'call' | 'email' | 'meeting';
  subject: string;
  description?: string;
  due_date?: string;
  contact_id?: string;
  deal_id?: string;
  assigned_to?: string;
}): Promise<ActivityWithRelations> {
  const gw = await api.post<GatewayActivity>('/api/crm/activities', data);
  return mapActivityFromGateway(gw);
}

export async function updateActivity(id: string, data: {
  type?: 'task' | 'call' | 'email' | 'meeting';
  subject?: string;
  description?: string;
  due_date?: string;
  completed_at?: string;
  contact_id?: string;
  deal_id?: string;
  assigned_to?: string | null;
}): Promise<ActivityWithRelations> {
  const gw = await api.put<GatewayActivity>(`/api/crm/activities/${id}`, data);
  return mapActivityFromGateway(gw);
}

export async function completeActivity(id: string): Promise<ActivityWithRelations> {
  const gw = await api.post<GatewayActivity>(`/api/crm/activities/${id}/complete`);
  return mapActivityFromGateway(gw);
}

export async function deleteActivity(id: string) {
  await api.delete(`/api/crm/activities/${id}`);
}

export async function getMyActivities(): Promise<ActivityWithRelations[]> {
  const user = getStoredUser();
  if (!user) throw new Error('Not authenticated');

  const data = await api.get<GatewayActivity[]>('/api/crm/activities');
  return data
    .filter((a) => a.assigned_to === user.id && !a.completed_at)
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .map(mapActivityFromGateway);
}

export async function getDealActivities(dealId: string): Promise<ActivityWithRelations[]> {
  const data = await api.get<GatewayActivity[]>(`/api/crm/activities?deal_id=${dealId}`);
  return data.map(mapActivityFromGateway);
}

// ============================================
// DEAL NOTES
// ============================================

export interface DealNoteWithAuthor extends Tables<'deal_notes'> {
  author: { id: string; name: string; email: string } | null;
}

export async function getDealNotes(dealId: string): Promise<DealNoteWithAuthor[]> {
  const data = await api.get<GatewayDealNote[]>(`/api/crm/deals/${dealId}/notes`);
  return data.map((gw) => ({
    id: gw.id,
    team_id: '',
    deal_id: gw.deal_id,
    author_id: gw.author_id,
    content: gw.content,
    created_at: gw.created_at,
    author: gw.author_id
      ? { id: gw.author_id, name: gw.author_name || '', email: '' }
      : null,
  }));
}

export async function createDealNote(dealId: string, content: string): Promise<DealNoteWithAuthor> {
  const gw = await api.post<GatewayDealNote>(`/api/crm/deals/${dealId}/notes`, { content });
  return {
    id: gw.id,
    team_id: '',
    deal_id: gw.deal_id,
    author_id: gw.author_id,
    content: gw.content,
    created_at: gw.created_at,
    author: gw.author_id
      ? { id: gw.author_id, name: gw.author_name || '', email: '' }
      : null,
  };
}

export async function deleteDealNote(dealId: string, noteId: string) {
  await api.delete(`/api/crm/deals/${dealId}/notes/${noteId}`);
}

// ============================================
// DEAL MEMBERS
// ============================================

export interface DealMemberWithProfile extends Tables<'deal_members'> {
  profile: { id: string; name: string; email: string; role: string } | null;
}

export async function getDealMembers(dealId: string): Promise<DealMemberWithProfile[]> {
  const data = await api.get<GatewayDealMember[]>(`/api/crm/deals/${dealId}/members`);
  return data.map((gw) => ({
    id: gw.id,
    team_id: '',
    deal_id: dealId,
    profile_id: gw.user_id,
    created_at: gw.created_at,
    profile: {
      id: gw.user_id,
      name: gw.name,
      email: gw.email,
      role: '',
    },
  }));
}

export async function addDealMember(dealId: string, profileId: string): Promise<DealMemberWithProfile> {
  const gw = await api.post<GatewayDealMember>(`/api/crm/deals/${dealId}/members`, { user_id: profileId });
  return {
    id: gw.id,
    team_id: '',
    deal_id: dealId,
    profile_id: gw.user_id,
    created_at: gw.created_at,
    profile: {
      id: gw.user_id,
      name: gw.name,
      email: gw.email,
      role: '',
    },
  };
}

export async function removeDealMember(dealId: string, memberId: string) {
  await api.delete(`/api/crm/deals/${dealId}/members/${memberId}`);
}

// ============================================
// DEAL EMAILS
// ============================================

export interface DealEmailWithSender extends Tables<'deal_emails'> {
  sender: { id: string; name: string; email: string } | null;
}

export async function getDealEmails(dealId: string): Promise<DealEmailWithSender[]> {
  const data = await api.get<GatewayDealEmail[]>(`/api/crm/deals/${dealId}/emails`);
  return data.map((gw) => ({
    id: gw.id,
    team_id: '',
    deal_id: gw.deal_id,
    sender_id: gw.sender_id,
    from_address: gw.from_address,
    from_name: gw.from_name,
    to_addresses: gw.to_addresses,
    cc_addresses: gw.cc_addresses,
    subject: gw.subject,
    body_html: gw.body_html,
    body_text: gw.body_text,
    direction: (gw.direction || 'outbound') as Tables<'deal_emails'>['direction'],
    resend_email_id: gw.resend_email_id,
    message_id: gw.message_id,
    in_reply_to: gw.in_reply_to,
    sent_at: gw.sent_at,
    created_at: gw.created_at,
    sender: gw.sender_id
      ? { id: gw.sender_id, name: gw.from_name || '', email: gw.from_address }
      : null,
  }));
}

export async function sendDealEmail(params: {
  deal_id: string;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  subject: string;
  body_html?: string;
  body_text?: string;
  in_reply_to?: string;
}) {
  const body = {
    from_address: getStoredUser()?.email || '',
    from_name: '',
    to_addresses: params.to.map((t) => t.email),
    cc_addresses: params.cc?.map((c) => c.email) || [],
    subject: params.subject,
    body_html: params.body_html,
    body_text: params.body_text,
    in_reply_to: params.in_reply_to,
  };
  return api.post(`/api/crm/deals/${params.deal_id}/emails`, body);
}

export async function reassignDealEmail(_emailId: string, _dealId: string) {
  throw new Error('Not implemented: reassignDealEmail has no NS gateway endpoint');
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
  const user = getStoredUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: '',
    role: user.role as 'owner' | 'admin' | 'member' | 'viewer',
    team_id: user.org_id,
    created_at: '',
    teams: { name: '' },
  };
}

// ============================================
// TEAM MANAGEMENT
// ============================================

export async function getTeamMembers() {
  const data = await api.get<GatewayTeamMember[]>('/api/team/members');
  return data.map((m) => ({
    id: m.id,
    email: m.email,
    name: m.name,
    role: m.role,
    created_at: m.created_at,
  }));
}

export async function updateMemberRole(userId: string, role: 'admin' | 'member' | 'viewer') {
  return api.put(`/api/team/members/${userId}/role`, { role });
}

export async function removeMember(userId: string) {
  await api.delete(`/api/team/members/${userId}`);
}

export async function getTeamInvites() {
  return api.get<GatewayInvite[]>('/api/team/invites');
}

export async function createInvite(email: string, role: 'admin' | 'member' | 'viewer') {
  return api.post<GatewayInvite>('/api/team/invites', { email, role });
}

export async function cancelInvite(id: string) {
  await api.delete(`/api/team/invites/${id}`);
}

export async function deleteAccount() {
  throw new Error('Not implemented: deleteAccount has no NS gateway endpoint');
}

export async function transferOwnership(_newOwnerId: string) {
  throw new Error('Not implemented: transferOwnership has no NS gateway endpoint');
}

export async function sendInviteEmail(_params: { email: string; teamName: string; role: string; inviteToken: string }) {
  // Invite emails are sent server-side by the NS gateway when creating an invite.
  // This function is kept for interface compatibility but is a no-op.
}

export async function updateProfile(_data: { name?: string }) {
  throw new Error('Not implemented: updateProfile has no NS gateway endpoint');
}
