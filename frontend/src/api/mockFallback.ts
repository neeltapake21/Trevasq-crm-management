// Standalone Cloud Demo Fallback Data
// Used automatically when the frontend is hosted without a connected backend (e.g. static Vercel preview)

export const handleMockFallback = (url: string, method: string, data?: any) => {
  const cleanUrl = url.replace(/^\/api/, '');

  // 1. Auth Login
  if (cleanUrl.startsWith('/auth/login')) {
    const email = data?.email || 'admin@trevasq.com';
    let role = 'admin';
    let name = 'System Administrator';
    if (email.includes('marketing')) {
      role = 'marketing_manager';
      name = 'Marketing Manager';
    } else if (email.includes('analyst')) {
      role = 'analyst';
      name = 'Data Analyst';
    }
    return {
      status: 200,
      data: {
        access_token: 'trevasq_live_token_' + Date.now(),
        token_type: 'bearer',
        user: {
          id: 1,
          name,
          email,
          role,
          is_active: true,
          created_at: new Date().toISOString()
        }
      }
    };
  }

  // 2. Auth Me
  if (cleanUrl.startsWith('/auth/me')) {
    const savedUser = localStorage.getItem('trevasq_user');
    return {
      status: 200,
      data: savedUser ? JSON.parse(savedUser) : {
        id: 1,
        name: 'System Administrator',
        email: 'admin@trevasq.com',
        role: 'admin',
        is_active: true
      }
    };
  }

  // 3. Analytics Overview
  if (cleanUrl.startsWith('/analytics/overview')) {
    return {
      status: 200,
      data: {
        kpis: {
          total_contacts: 142,
          new_leads_this_month: 38,
          active_subscribers: 118,
          opt_out_rate: '2.4%',
          total_emails_sent: 894,
          delivery_rate: '98.7%',
          open_rate: '42.1%',
          click_rate: '18.3%'
        },
        lead_source_breakdown: [
          { source: 'Website Form', count: 68 },
          { source: 'Product Inquiry', count: 42 },
          { source: 'CSV Import', count: 22 },
          { source: 'Manual', count: 10 }
        ],
        subscription_status_breakdown: [
          { status: 'Subscribed', count: 118 },
          { status: 'Unsubscribed', count: 14 },
          { status: 'Pending', count: 7 },
          { status: 'Suppressed', count: 3 }
        ],
        monthly_trends: [
          { month: 'Jun', leads: 18, deliveries: 120 },
          { month: 'Jul', leads: 24, deliveries: 180 },
          { month: 'Aug', leads: 31, deliveries: 240 },
          { month: 'Sep', leads: 28, deliveries: 210 },
          { month: 'Oct', leads: 35, deliveries: 290 },
          { month: 'Nov', leads: 38, deliveries: 350 }
        ]
      }
    };
  }

  // 4. Activity Logs
  if (cleanUrl.startsWith('/activity-logs')) {
    return {
      status: 200,
      data: [
        { id: 1, action: 'campaign_dispatched', entity_type: 'campaign', entity_id: '1', actor_email: 'admin@trevasq.com', details: 'Campaign "QGuard Enterprise Launch" sent to 45 recipients', created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
        { id: 2, action: 'contact_created', entity_type: 'contact', entity_id: '102', actor_email: 'website_form', details: 'New lead captured: Rajesh Sharma (rajesh@techcorp.in)', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 3, action: 'consent_granted', entity_type: 'consent', entity_id: '54', actor_email: 'rajesh@techcorp.in', details: 'Marketing consent verified for Quantum Cybersecurity', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 4, action: 'settings_updated', entity_type: 'system_settings', entity_id: 'global', actor_email: 'admin@trevasq.com', details: 'SMTP adapter verified for smtp.gmail.com', created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
        { id: 5, action: 'campaign_scheduled', entity_type: 'campaign', entity_id: '2', actor_email: 'marketing@trevasq.com', details: 'Scheduled Q-Readiness webinar outreach', created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() }
      ]
    };
  }

  // 5. Products
  if (cleanUrl.startsWith('/products')) {
    return {
      status: 200,
      data: [
        { id: 1, name: 'QGuard', slug: 'qguard', description: 'Quantum-resistant endpoint and perimeter security defense platform.', status: 'active', contacts_count: 58, campaigns_count: 4 },
        { id: 2, name: 'Quantum Cybersecurity', slug: 'quantum-cybersecurity', description: 'Next-generation cryptographic security architecture for enterprise infrastructures.', status: 'active', contacts_count: 42, campaigns_count: 3 },
        { id: 3, name: 'Quantum Readiness Assessment', slug: 'quantum-readiness-assessment', description: 'Comprehensive algorithmic audit and vulnerability scan for post-quantum transition.', status: 'active', contacts_count: 35, campaigns_count: 2 },
        { id: 4, name: 'Quantum Digital Signature', slug: 'quantum-digital-signature', description: 'NIST-aligned lattice-based digital signatures guaranteeing long-term document authenticity.', status: 'active', contacts_count: 29, campaigns_count: 1 },
        { id: 5, name: 'Quantum Encryption', slug: 'quantum-encryption', description: 'Symmetric and asymmetric post-quantum end-to-end data transmission encryption.', status: 'active', contacts_count: 31, campaigns_count: 2 },
        { id: 6, name: 'Quantum Hash', slug: 'quantum-hash', description: 'Collision-resistant quantum-secure cryptographic hashing protocols.', status: 'active', contacts_count: 22, campaigns_count: 1 }
      ]
    };
  }

  // 6. Contacts
  if (cleanUrl.startsWith('/contacts')) {
    return {
      status: 200,
      data: {
        total: 5,
        items: [
          { id: 1, full_name: 'Dr. Aris Thorne', email: 'aris.thorne@novasec.io', company: 'NovaSec Systems', designation: 'Chief Security Architect', country: 'United States', lead_source: 'Website Form', subscription_status: 'Subscribed', created_at: '2026-11-15T10:00:00Z', products: ['QGuard', 'Quantum Cybersecurity'] },
          { id: 2, full_name: 'Elena Rostova', email: 'elena.rostova@cipherpoint.eu', company: 'CipherPoint Global', designation: 'VP Information Security', country: 'Germany', lead_source: 'Product Inquiry', subscription_status: 'Subscribed', created_at: '2026-11-16T11:30:00Z', products: ['Quantum Readiness Assessment'] },
          { id: 3, full_name: 'Kenji Takahashi', email: 'k.takahashi@tokyofinance.jp', company: 'Tokyo Financial Dynamics', designation: 'Head of Infrastructure', country: 'Japan', lead_source: 'CSV Import', subscription_status: 'Subscribed', created_at: '2026-11-17T09:15:00Z', products: ['Quantum Digital Signature', 'Quantum Encryption'] },
          { id: 4, full_name: 'Rajesh Sharma', email: 'rajesh@techcorp.in', company: 'TechCorp India', designation: 'CTO', country: 'India', lead_source: 'Website Form', subscription_status: 'Subscribed', created_at: '2026-11-18T14:20:00Z', products: ['QGuard'] },
          { id: 5, full_name: 'Marcus Vance', email: 'marcus.v@apexlogistics.com', company: 'Apex Global Logistics', designation: 'Director of IT', country: 'United Kingdom', lead_source: 'Manual Entry', subscription_status: 'Unsubscribed', created_at: '2026-11-19T16:45:00Z', products: ['Quantum Hash'] }
        ]
      }
    };
  }

  // 7. Campaigns
  if (cleanUrl.startsWith('/campaigns')) {
    return {
      status: 200,
      data: [
        { id: 1, name: 'QGuard Q4 Security Briefing', product_name: 'QGuard', status: 'sent', total_recipients: 48, sent_count: 48, open_count: 26, click_count: 14, scheduled_at: null, created_at: '2026-11-18T12:00:00Z' },
        { id: 2, name: 'Quantum Readiness Enterprise Scan', product_name: 'Quantum Readiness Assessment', status: 'scheduled', total_recipients: 32, sent_count: 0, open_count: 0, click_count: 0, scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), created_at: '2026-11-19T14:30:00Z' }
      ]
    };
  }

  // 8. Templates
  if (cleanUrl.startsWith('/templates')) {
    return {
      status: 200,
      data: [
        { id: 1, name: 'QGuard Product Introduction', product_id: 1, subject: 'Strengthen {{company}}\'s defenses with QGuard Post-Quantum Security', html_content: '<p>Hello {{first_name}}, safeguard {{company}} with QGuard.</p>', text_content: 'Hello {{first_name}}, safeguard {{company}} with QGuard.' },
        { id: 2, name: 'Quantum Readiness Assessment Invite', product_id: 3, subject: 'Is {{company}} prepared for the post-quantum mandate?', html_content: '<p>Hello {{first_name}}, schedule your readiness audit.</p>', text_content: 'Hello {{first_name}}, schedule your readiness audit.' }
      ]
    };
  }

  // 9. Inquiries
  if (cleanUrl.startsWith('/inquiries')) {
    return {
      status: 200,
      data: [
        { id: 1, contact_name: 'Rajesh Sharma', email: 'rajesh@techcorp.in', company: 'TechCorp India', product_name: 'QGuard', message: 'Interested in evaluating post-quantum encryption for banking APIs.', marketing_consent: true, created_at: '2026-11-20T10:15:00Z' }
      ]
    };
  }

  // 10. Settings & Mailbox
  if (cleanUrl.startsWith('/settings/sent-mailbox')) {
    return { status: 200, data: { count: 1, emails: [{ id: '1', to: 'neeltapake21@gmail.com', subject: 'TrevasQ Live Delivery Verified', sent_at: new Date().toISOString() }] } };
  }

  if (cleanUrl.startsWith('/settings/test-email')) {
    return { status: 200, data: { success: true, status: 'sent', provider: 'smtp', message: 'Test email successfully simulated!' } };
  }

  if (cleanUrl.startsWith('/settings')) {
    return {
      status: 200,
      data: {
        email_provider: 'smtp',
        email_test_mode: false,
        email_from_address: 'neeltapake21@gmail.com',
        email_from_name: 'TrevasQ Marketing',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        smtp_username: 'neeltapake21@gmail.com',
        smtp_use_tls: true
      }
    };
  }

  // Default Fallback
  return { status: 200, data: { success: true, message: 'Operation completed' } };
};
