export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'marketing_manager' | 'analyst';
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  total_contacts: number;
  active_subscribers: number;
  unsubscribed_count: number;
}

export interface SubscriptionBrief {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  status: 'subscribed' | 'unsubscribed' | 'pending' | 'not_subscribed' | 'suppressed';
  consent_date?: string;
  consent_source?: string;
  unsubscribed_at?: string;
}

export interface InquiryBrief {
  id: number;
  product_id?: number;
  product_name?: string;
  source: string;
  message?: string;
  consent_given: boolean;
  created_at: string;
}

export interface Inquiry {
  id: number;
  contact_id: number;
  contact_name: string;
  contact_email: string;
  product_id?: number;
  product_name?: string;
  source: string;
  message?: string;
  consent_given: boolean;
  created_at: string;
}

export interface ConsentEventBrief {
  id: number;
  product_id?: number;
  event_type: string;
  consent_source?: string;
  consent_method?: string;
  event_timestamp: string;
  evidence_reference?: string;
}

export interface Contact {
  id: number;
  full_name: string;
  normalized_email: string;
  phone?: string;
  company?: string;
  designation?: string;
  country?: string;
  lead_source: string;
  created_at: string;
  updated_at: string;
  is_globally_suppressed: boolean;
  subscriptions: SubscriptionBrief[];
  inquiries?: InquiryBrief[];
  consent_events?: ConsentEventBrief[];
  campaign_history?: any[];
}

export interface Campaign {
  id: number;
  name: string;
  product_id: number;
  product_name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  status: 'draft' | 'scheduled' | 'processing' | 'sent' | 'paused' | 'failed' | 'cancelled';
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  eligible_count: number;
  recipients_count: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
}

export interface CampaignRecipient {
  id: number;
  contact_id: number;
  contact_name: string;
  contact_email: string;
  company?: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';
  provider_message_id?: string;
  sent_at?: string;
  error_message?: string;
  events_count: number;
}

export interface EmailTemplate {
  id: number;
  name: string;
  product_id?: number;
  product_name?: string;
  subject: string;
  html_content: string;
  text_content?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: any;
  created_at: string;
}

export interface AnalyticsOverview {
  kpis: {
    total_contacts: number;
    new_leads_this_month: number;
    active_subscribers: number;
    unsubscribed_contacts: number;
    globally_suppressed_contacts: number;
    total_campaigns: number;
    emails_sent: number;
    delivered_count: number;
    delivery_rate: number;
  };
  leads_over_time: { month: string; leads: number }[];
  leads_by_source: { source: string; count: number }[];
  subscribers_by_product: { product_name: string; product_slug: string; subscribers: number; unsubscribed: number }[];
  campaign_performance: any[];
  email_delivery_trends: { day: string; sent: number; delivered: number }[];
  unsubscribe_trends: { period: string; unsubscribes: number }[];
}

export interface ImportJob {
  id: number;
  file_name: string;
  status: string;
  total_rows: number;
  successful_rows: number;
  updated_rows: number;
  skipped_rows: number;
  suppressed_rows: number;
  failed_rows: number;
  error_summary?: string;
  created_at: string;
  completed_at?: string;
}
