// Standalone Cloud Demo Fallback Data
// Used automatically when the frontend is hosted without a connected backend (e.g. static Vercel preview)

export const handleMockFallback = (url: string, method: string, data?: any) => {
  let path = url;
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      path = new URL(url).pathname;
    }
  } catch (e) {}

  // Remove query parameters for matching
  const [cleanPath] = path.split('?');
  const cleanUrl = cleanPath.replace(/^\/?api\/?/, '/');
  const normalized = cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl;

  // 1. Auth Login
  if (normalized.startsWith('/auth/login')) {
    const email = data?.email || 'admin@trevasq.com';
    let role: 'admin' | 'marketing_manager' | 'analyst' = 'admin';
    let name = 'System Administrator';
    if (email.includes('marketing')) {
      role = 'marketing_manager';
      name = 'Marketing Manager';
    } else if (email.includes('analyst')) {
      role = 'analyst';
      name = 'Data Analyst';
    }
    const token = 'trevasq_live_token_' + Date.now();
    const user = {
      id: 1,
      name,
      email,
      role,
      is_active: true,
      created_at: new Date().toISOString()
    };
    return {
      status: 200,
      data: {
        access_token: token,
        token_type: 'bearer',
        user
      }
    };
  }

  // 2. Auth Me
  if (normalized.startsWith('/auth/me')) {
    const savedUser = localStorage.getItem('trevasq_user');
    let user = {
      id: 1,
      name: 'System Administrator',
      email: 'admin@trevasq.com',
      role: 'admin',
      is_active: true
    };
    if (savedUser) {
      try { user = JSON.parse(savedUser); } catch (e) {}
    }
    return {
      status: 200,
      data: user
    };
  }

  // 3. Analytics Overview (matching AnalyticsOverview interface)
  if (normalized.startsWith('/analytics/overview')) {
    return {
      status: 200,
      data: {
        kpis: {
          total_contacts: 142,
          new_leads_this_month: 38,
          active_subscribers: 118,
          unsubscribed_contacts: 14,
          globally_suppressed_contacts: 3,
          total_campaigns: 8,
          emails_sent: 894,
          delivered_count: 882,
          delivery_rate: 98.7
        },
        leads_over_time: [
          { month: 'Jun 2026', leads: 18 },
          { month: 'Jul 2026', leads: 24 },
          { month: 'Aug 2026', leads: 31 },
          { month: 'Sep 2026', leads: 28 },
          { month: 'Oct 2026', leads: 35 },
          { month: 'Nov 2026', leads: 38 }
        ],
        leads_by_source: [
          { source: 'Website Form', count: 68 },
          { source: 'Product Inquiry', count: 42 },
          { source: 'CSV Import', count: 22 },
          { source: 'Manual Entry', count: 10 }
        ],
        subscribers_by_product: [
          { product_name: 'QGuard', product_slug: 'qguard', subscribers: 58, unsubscribed: 4 },
          { product_name: 'Quantum Cybersecurity', product_slug: 'quantum-cybersecurity', subscribers: 42, unsubscribed: 3 },
          { product_name: 'Quantum Readiness Assessment', product_slug: 'quantum-readiness-assessment', subscribers: 35, unsubscribed: 2 },
          { product_name: 'Quantum Digital Signature', product_slug: 'quantum-digital-signature', subscribers: 29, unsubscribed: 1 },
          { product_name: 'Quantum Encryption', product_slug: 'quantum-encryption', subscribers: 31, unsubscribed: 2 },
          { product_name: 'Quantum Hash', product_slug: 'quantum-hash', subscribers: 22, unsubscribed: 2 }
        ],
        campaign_performance: [
          {
            id: 1,
            name: 'QGuard Enterprise Launch',
            product: 'QGuard',
            product_name: 'QGuard',
            status: 'sent',
            sent: 48,
            sent_count: 48,
            opens: 26,
            open_count: 26,
            open_rate: 54.2,
            delivery_rate: 98.7,
            click_rate: 29.2,
            unsubscribed_count: 1,
            created_at: 'Nov 18'
          },
          {
            id: 2,
            name: 'Quantum Readiness Audit Invite',
            product: 'Quantum Readiness Assessment',
            product_name: 'Quantum Readiness Assessment',
            status: 'sent',
            sent: 35,
            sent_count: 35,
            opens: 19,
            open_count: 19,
            open_rate: 54.3,
            delivery_rate: 100.0,
            click_rate: 31.4,
            unsubscribed_count: 0,
            created_at: 'Nov 20'
          },
          {
            id: 3,
            name: 'NIST Standards Post-Quantum Webinar',
            product: 'Quantum Digital Signature',
            product_name: 'Quantum Digital Signature',
            status: 'scheduled',
            sent: 0,
            sent_count: 0,
            opens: 0,
            open_count: 0,
            open_rate: 0,
            delivery_rate: 100.0,
            click_rate: 0,
            unsubscribed_count: 0,
            created_at: 'Nov 22'
          }
        ],
        email_delivery_trends: [
          { day: 'Mon', sent: 120, delivered: 118 },
          { day: 'Tue', sent: 145, delivered: 142 },
          { day: 'Wed', sent: 160, delivered: 158 },
          { day: 'Thu', sent: 130, delivered: 129 },
          { day: 'Fri', sent: 175, delivered: 172 }
        ],
        unsubscribe_trends: [
          { period: 'Week 1', unsubscribes: 2 },
          { period: 'Week 2', unsubscribes: 4 },
          { period: 'Week 3', unsubscribes: 3 },
          { period: 'Week 4', unsubscribes: 5 }
        ]
      }
    };
  }

  // 4. Activity Logs
  if (normalized.startsWith('/activity-logs')) {
    return {
      status: 200,
      data: [
        { id: 1, action: 'campaign_dispatched', entity_type: 'campaign', entity_id: '1', actor_email: 'admin@trevasq.com', metadata: { recipients: 48, product: 'QGuard' }, created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
        { id: 2, action: 'contact_created', entity_type: 'contact', entity_id: '102', actor_email: 'website_form', metadata: { email: 'rajesh@techcorp.in' }, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 3, action: 'consent_granted', entity_type: 'consent', entity_id: '54', actor_email: 'rajesh@techcorp.in', metadata: { product: 'Quantum Cybersecurity' }, created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
        { id: 4, action: 'settings_updated', entity_type: 'system_settings', entity_id: 'global', actor_email: 'admin@trevasq.com', metadata: { provider: 'smtp' }, created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
        { id: 5, action: 'campaign_scheduled', entity_type: 'campaign', entity_id: '3', actor_email: 'marketing@trevasq.com', metadata: { product: 'Quantum Digital Signature' }, created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
        { id: 6, action: 'import_completed', entity_type: 'import_job', entity_id: '1', actor_email: 'admin@trevasq.com', metadata: { imported: 48, suppressed: 1 }, created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString() }
      ]
    };
  }

  // 5. Products: Single product or Subscribers
  if (normalized.match(/^\/products\/\d+\/subscribers/)) {
    return {
      status: 200,
      data: {
        product_id: 1,
        product_name: 'QGuard',
        count: 5,
        subscribers: [
          { subscription_id: 1, contact_id: 1, full_name: 'Dr. Aris Thorne', email: 'aris.thorne@novasec.io', company: 'NovaSec Systems', status: 'subscribed', consent_date: '2026-11-15T10:00:00Z', consent_source: 'Website Form', is_globally_suppressed: false },
          { subscription_id: 2, contact_id: 4, full_name: 'Rajesh Sharma', email: 'rajesh@techcorp.in', company: 'TechCorp India', status: 'subscribed', consent_date: '2026-11-18T14:20:00Z', consent_source: 'Website Form', is_globally_suppressed: false },
          { subscription_id: 3, contact_id: 2, full_name: 'Elena Rostova', email: 'elena.rostova@cipherpoint.eu', company: 'CipherPoint Global', status: 'subscribed', consent_date: '2026-11-16T11:30:00Z', consent_source: 'Product Inquiry', is_globally_suppressed: false },
          { subscription_id: 4, contact_id: 3, full_name: 'Kenji Takahashi', email: 'k.takahashi@tokyofinance.jp', company: 'Tokyo Financial Dynamics', status: 'subscribed', consent_date: '2026-11-17T09:15:00Z', consent_source: 'CSV Import', is_globally_suppressed: false },
          { subscription_id: 5, contact_id: 5, full_name: 'Marcus Vance', email: 'marcus.v@apexlogistics.com', company: 'Apex Global Logistics', status: 'unsubscribed', consent_date: '2026-11-19T16:45:00Z', consent_source: 'Manual Entry', is_globally_suppressed: true }
        ]
      }
    };
  }

  if (normalized.match(/^\/products\/\d+$/)) {
    return {
      status: 200,
      data: {
        id: 1,
        name: 'QGuard',
        slug: 'qguard',
        description: 'Quantum-resistant endpoint and perimeter security defense platform.',
        status: 'active',
        created_at: '2026-11-01T00:00:00Z',
        updated_at: '2026-11-01T00:00:00Z',
        total_contacts: 58,
        active_subscribers: 54,
        unsubscribed_count: 4
      }
    };
  }

  if (normalized.startsWith('/products')) {
    return {
      status: 200,
      data: [
        { id: 1, name: 'QGuard', slug: 'qguard', description: 'Quantum-resistant endpoint and perimeter security defense platform.', status: 'active', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', total_contacts: 58, active_subscribers: 54, unsubscribed_count: 4 },
        { id: 2, name: 'Quantum Cybersecurity', slug: 'quantum-cybersecurity', description: 'Next-generation cryptographic security architecture for enterprise infrastructures.', status: 'active', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', total_contacts: 42, active_subscribers: 39, unsubscribed_count: 3 },
        { id: 3, name: 'Quantum Readiness Assessment', slug: 'quantum-readiness-assessment', description: 'Comprehensive algorithmic audit and vulnerability scan for post-quantum transition.', status: 'active', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', total_contacts: 35, active_subscribers: 33, unsubscribed_count: 2 },
        { id: 4, name: 'Quantum Digital Signature', slug: 'quantum-digital-signature', description: 'NIST-aligned lattice-based digital signatures guaranteeing long-term document authenticity.', status: 'active', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', total_contacts: 29, active_subscribers: 28, unsubscribed_count: 1 },
        { id: 5, name: 'Quantum Encryption', slug: 'quantum-encryption', description: 'Symmetric and asymmetric post-quantum end-to-end data transmission encryption.', status: 'active', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', total_contacts: 31, active_subscribers: 29, unsubscribed_count: 2 },
        { id: 6, name: 'Quantum Hash', slug: 'quantum-hash', description: 'Collision-resistant quantum-secure cryptographic hashing protocols.', status: 'active', created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z', total_contacts: 22, active_subscribers: 20, unsubscribed_count: 2 }
      ]
    };
  }

  // 6. Contacts
  const mockContactsList = [
    {
      id: 1,
      full_name: 'Dr. Aris Thorne',
      normalized_email: 'aris.thorne@novasec.io',
      company: 'NovaSec Systems',
      designation: 'Chief Security Architect',
      country: 'United States',
      lead_source: 'Website Form',
      is_globally_suppressed: false,
      created_at: '2026-11-15T10:00:00Z',
      updated_at: '2026-11-15T10:00:00Z',
      subscriptions: [
        { id: 1, product_id: 1, product_name: 'QGuard', product_slug: 'qguard', status: 'subscribed', consent_date: '2026-11-15T10:00:00Z', consent_source: 'Website Form' },
        { id: 2, product_id: 2, product_name: 'Quantum Cybersecurity', product_slug: 'quantum-cybersecurity', status: 'subscribed', consent_date: '2026-11-15T10:00:00Z', consent_source: 'Website Form' }
      ],
      inquiries: [
        { id: 1, product_name: 'QGuard', source: 'Website Form', message: 'Inquiry regarding quantum-secure boundary firewalls.', consent_given: true, created_at: '2026-11-15T10:00:00Z' }
      ],
      consent_events: [
        { id: 1, product_id: 1, event_type: 'opt_in', consent_source: 'Website Form', event_timestamp: '2026-11-15T10:00:00Z' }
      ],
      campaign_history: []
    },
    {
      id: 2,
      full_name: 'Elena Rostova',
      normalized_email: 'elena.rostova@cipherpoint.eu',
      company: 'CipherPoint Global',
      designation: 'VP Information Security',
      country: 'Germany',
      lead_source: 'Product Inquiry',
      is_globally_suppressed: false,
      created_at: '2026-11-16T11:30:00Z',
      updated_at: '2026-11-16T11:30:00Z',
      subscriptions: [
        { id: 3, product_id: 3, product_name: 'Quantum Readiness Assessment', product_slug: 'quantum-readiness-assessment', status: 'subscribed', consent_date: '2026-11-16T11:30:00Z', consent_source: 'Product Inquiry' }
      ],
      inquiries: [],
      consent_events: [],
      campaign_history: []
    },
    {
      id: 3,
      full_name: 'Kenji Takahashi',
      normalized_email: 'k.takahashi@tokyofinance.jp',
      company: 'Tokyo Financial Dynamics',
      designation: 'Head of Infrastructure',
      country: 'Japan',
      lead_source: 'CSV Import',
      is_globally_suppressed: false,
      created_at: '2026-11-17T09:15:00Z',
      updated_at: '2026-11-17T09:15:00Z',
      subscriptions: [
        { id: 4, product_id: 4, product_name: 'Quantum Digital Signature', product_slug: 'quantum-digital-signature', status: 'subscribed', consent_date: '2026-11-17T09:15:00Z', consent_source: 'CSV Import' },
        { id: 5, product_id: 5, product_name: 'Quantum Encryption', product_slug: 'quantum-encryption', status: 'subscribed', consent_date: '2026-11-17T09:15:00Z', consent_source: 'CSV Import' }
      ],
      inquiries: [],
      consent_events: [],
      campaign_history: []
    },
    {
      id: 4,
      full_name: 'Rajesh Sharma',
      normalized_email: 'rajesh@techcorp.in',
      company: 'TechCorp India',
      designation: 'CTO',
      country: 'India',
      lead_source: 'Website Form',
      is_globally_suppressed: false,
      created_at: '2026-11-18T14:20:00Z',
      updated_at: '2026-11-18T14:20:00Z',
      subscriptions: [
        { id: 6, product_id: 1, product_name: 'QGuard', product_slug: 'qguard', status: 'subscribed', consent_date: '2026-11-18T14:20:00Z', consent_source: 'Website Form' }
      ],
      inquiries: [],
      consent_events: [],
      campaign_history: []
    },
    {
      id: 5,
      full_name: 'Marcus Vance',
      normalized_email: 'marcus.v@apexlogistics.com',
      company: 'Apex Global Logistics',
      designation: 'Director of IT',
      country: 'United Kingdom',
      lead_source: 'Manual Entry',
      is_globally_suppressed: true,
      created_at: '2026-11-19T16:45:00Z',
      updated_at: '2026-11-19T16:45:00Z',
      subscriptions: [
        { id: 7, product_id: 6, product_name: 'Quantum Hash', product_slug: 'quantum-hash', status: 'unsubscribed', unsubscribed_at: '2026-11-20T10:00:00Z' }
      ],
      inquiries: [],
      consent_events: [],
      campaign_history: []
    }
  ];

  if (normalized.match(/^\/contacts\/\d+$/)) {
    const id = parseInt(normalized.split('/').pop() || '1');
    const c = mockContactsList.find(item => item.id === id) || mockContactsList[0];
    return { status: 200, data: c };
  }

  if (normalized.startsWith('/contacts')) {
    return {
      status: 200,
      data: mockContactsList
    };
  }

  // 7. Campaigns: Detail, Audience Check, Recipients, List
  if (normalized.match(/^\/campaigns\/\d+\/recipients/)) {
    return {
      status: 200,
      data: [
        { id: 1, contact_id: 1, contact_name: 'Dr. Aris Thorne', contact_email: 'aris.thorne@novasec.io', company: 'NovaSec Systems', status: 'delivered', provider_message_id: '<5c1fd0cf-182c@smtp.gmail.com>', sent_at: '2026-11-18T12:01:00Z', events_count: 2 },
        { id: 2, contact_id: 4, contact_name: 'Rajesh Sharma', contact_email: 'rajesh@techcorp.in', company: 'TechCorp India', status: 'delivered', provider_message_id: '<9a2eb1d4-345f@smtp.gmail.com>', sent_at: '2026-11-18T12:01:05Z', events_count: 1 }
      ]
    };
  }

  if (normalized.match(/^\/campaigns\/\d+\/audience-check/)) {
    return {
      status: 200,
      data: {
        product_id: 1,
        product_name: 'QGuard',
        total_contacts: 48,
        eligible_count: 45,
        excluded_count: 3,
        exclusion_reasons: {
          unsubscribed: 2,
          globally_suppressed: 1,
          no_consent: 0,
          already_sent: 0
        },
        sample_recipients: [
          { contact_id: 1, full_name: 'Dr. Aris Thorne', email: 'aris.thorne@novasec.io', company: 'NovaSec Systems' },
          { contact_id: 4, full_name: 'Rajesh Sharma', email: 'rajesh@techcorp.in', company: 'TechCorp India' }
        ]
      }
    };
  }

  const mockCampaignsList = [
    {
      id: 1,
      name: 'QGuard Q4 Security Briefing',
      product_id: 1,
      product_name: 'QGuard',
      subject: 'Strengthen {{company}}\'s defenses with QGuard Post-Quantum Security',
      html_content: '<p>Hello {{first_name}}, safeguard {{company}} with QGuard.</p>',
      text_content: 'Hello {{first_name}}, safeguard {{company}} with QGuard.',
      status: 'sent' as const,
      eligible_count: 48,
      recipients_count: 48,
      sent_count: 48,
      delivered_count: 48,
      opened_count: 26,
      clicked_count: 14,
      bounced_count: 0,
      unsubscribed_count: 1,
      scheduled_at: undefined,
      sent_at: '2026-11-18T12:00:00Z',
      created_at: '2026-11-18T12:00:00Z',
      updated_at: '2026-11-18T12:05:00Z'
    },
    {
      id: 2,
      name: 'Quantum Readiness Enterprise Scan',
      product_id: 3,
      product_name: 'Quantum Readiness Assessment',
      subject: 'Is {{company}} prepared for the post-quantum mandate?',
      html_content: '<p>Hello {{first_name}}, schedule your readiness audit.</p>',
      text_content: 'Hello {{first_name}}, schedule your readiness audit.',
      status: 'scheduled' as const,
      eligible_count: 32,
      recipients_count: 32,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      unsubscribed_count: 0,
      scheduled_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      sent_at: undefined,
      created_at: '2026-11-19T14:30:00Z',
      updated_at: '2026-11-19T14:30:00Z'
    }
  ];

  if (normalized.match(/^\/campaigns\/\d+$/)) {
    const id = parseInt(normalized.split('/').pop() || '1');
    const c = mockCampaignsList.find(item => item.id === id) || mockCampaignsList[0];
    return { status: 200, data: c };
  }

  if (normalized.startsWith('/campaigns')) {
    return {
      status: 200,
      data: mockCampaignsList
    };
  }

  // 8. Templates
  if (normalized.startsWith('/templates')) {
    return {
      status: 200,
      data: [
        {
          id: 1,
          name: 'QGuard Product Introduction',
          product_id: 1,
          product_name: 'QGuard',
          subject: 'Strengthen {{company}}\'s defenses with QGuard Post-Quantum Security',
          html_content: '<p>Hello {{first_name}}, safeguard {{company}} with QGuard.</p>',
          text_content: 'Hello {{first_name}}, safeguard {{company}} with QGuard.',
          created_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z'
        },
        {
          id: 2,
          name: 'Quantum Readiness Assessment Invite',
          product_id: 3,
          product_name: 'Quantum Readiness Assessment',
          subject: 'Is {{company}} prepared for the post-quantum mandate?',
          html_content: '<p>Hello {{first_name}}, schedule your readiness audit.</p>',
          text_content: 'Hello {{first_name}}, schedule your readiness audit.',
          created_at: '2026-11-01T00:00:00Z',
          updated_at: '2026-11-01T00:00:00Z'
        }
      ]
    };
  }

  // 9. Inquiries
  if (normalized.startsWith('/inquiries')) {
    if (method.toLowerCase() === 'post') {
      const prodSlug = data?.product_slug || '';
      let prodName = 'General Quantum Solutions Inquiry';
      if (prodSlug.includes('qguard')) prodName = 'QGuard';
      else if (prodSlug.includes('cybersecurity')) prodName = 'Quantum Cybersecurity';
      else if (prodSlug.includes('readiness')) prodName = 'Quantum Readiness Assessment';
      else if (prodSlug.includes('signature')) prodName = 'Quantum Digital Signature';
      else if (prodSlug.includes('encryption')) prodName = 'Quantum Encryption';
      else if (prodSlug.includes('hash')) prodName = 'Quantum Hash';

      return {
        status: 201,
        data: {
          id: Date.now(),
          contact_id: 101,
          contact_name: data?.full_name || 'Prospect Lead',
          contact_email: data?.email || 'lead@enterprise.com',
          product_id: 1,
          product_name: prodName,
          source: 'website_inquiry',
          message: data?.message || 'Inquiry received',
          consent_given: Boolean(data?.marketing_consent),
          created_at: new Date().toISOString()
        }
      };
    }

    return {
      status: 200,
      data: [
        {
          id: 1,
          contact_id: 4,
          contact_name: 'Rajesh Sharma',
          contact_email: 'rajesh@techcorp.in',
          company: 'TechCorp India',
          product_id: 1,
          product_name: 'QGuard',
          source: 'Website Form',
          message: 'Interested in evaluating post-quantum encryption for banking APIs.',
          consent_given: true,
          created_at: '2026-11-20T10:15:00Z'
        }
      ]
    };
  }

  // 9.5. Unsubscribe
  if (normalized.startsWith('/unsubscribe')) {
    if (method.toLowerCase() === 'post') {
      return {
        status: 200,
        data: {
          success: true,
          scope: data?.scope || 'product',
          contact_email: 'recipient@enterprise.com',
          message: data?.scope === 'global'
            ? 'You have been successfully added to our Global Suppression list. You will receive no further emails from TrevasQ.'
            : 'You have been unsubscribed from this product mailing list.'
        }
      };
    }
    return {
      status: 200,
      data: {
        valid: true,
        contact_name: 'Dr. Aris Thorne',
        contact_email: 'aris.thorne@novasec.io',
        product_id: 1,
        product_name: 'QGuard',
        is_globally_suppressed: false,
        is_product_unsubscribed: false
      }
    };
  }

  // 10. Imports
  if (normalized.startsWith('/imports')) {
    return {
      status: 200,
      data: [
        {
          id: 1,
          file_name: 'enterprise_security_leads_q4.csv',
          status: 'completed',
          total_rows: 50,
          successful_rows: 48,
          updated_rows: 0,
          skipped_rows: 2,
          suppressed_rows: 1,
          failed_rows: 0,
          created_at: '2026-11-17T14:00:00Z',
          completed_at: '2026-11-17T14:00:05Z'
        },
        {
          id: 2,
          file_name: 'apac_quantum_banking_prospects.csv',
          status: 'completed',
          total_rows: 35,
          successful_rows: 34,
          updated_rows: 1,
          skipped_rows: 0,
          suppressed_rows: 0,
          failed_rows: 0,
          created_at: '2026-11-19T09:30:00Z',
          completed_at: '2026-11-19T09:30:04Z'
        }
      ]
    };
  }

  // 11. Users
  if (normalized.startsWith('/users')) {
    return {
      status: 200,
      data: [
        { id: 1, name: 'System Administrator', email: 'admin@trevasq.com', role: 'admin', is_active: true, created_at: '2026-11-01T00:00:00Z' },
        { id: 2, name: 'Marketing Manager', email: 'marketing@trevasq.com', role: 'marketing_manager', is_active: true, created_at: '2026-11-01T00:00:00Z' },
        { id: 3, name: 'Data Analyst', email: 'analyst@trevasq.com', role: 'analyst', is_active: true, created_at: '2026-11-01T00:00:00Z' }
      ]
    };
  }

  // 12. Settings & Mailbox
  if (normalized.startsWith('/settings/sent-mailbox')) {
    return {
      status: 200,
      data: {
        count: 1,
        emails: [
          {
            id: '1',
            to: 'neeltapake21@gmail.com',
            subject: 'TrevasQ Live Delivery Verified',
            status: 'delivered',
            sent_at: new Date().toISOString()
          }
        ]
      }
    };
  }

  if (normalized.startsWith('/settings/test-email')) {
    return {
      status: 200,
      data: {
        success: true,
        status: 'sent',
        provider: 'smtp',
        message: 'Test email successfully simulated for cloud demo!'
      }
    };
  }

  if (normalized.startsWith('/settings')) {
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
