-- 006_law_firms_and_gemini.sql: Seed Gemini integration and create law_firms directory table

INSERT INTO integrations (slug, name, base_url, api_key_enc, health_path, enabled, config)
VALUES
  ('gemini', 'Google Gemini', 'https://generativelanguage.googleapis.com/v1beta', NULL, '/models', TRUE, '{"models":["gemini-2.5-flash","gemini-2.5-pro"]}'::JSONB)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS law_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lead_counsel TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('BD', 'US', 'EU')),
  city TEXT NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  experience_years INT NOT NULL DEFAULT 10,
  notable_cases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  recent_news TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO law_firms (name, lead_counsel, region, city, specialties, experience_years, notable_cases, recent_news, phone, email, address)
SELECT * FROM (VALUES
  (
    'Kamal Hossain & Associates',
    'Dr. Kamal Hossain & Barrister Sara Hossain',
    'BD',
    'Motijheel, Dhaka',
    ARRAY['Commercial Contracts', 'Arbitration', 'Constitutional Law'],
    35,
    ARRAY['Represented major power & energy consortiums in Dhaka international arbitration.', 'Landmark constitutional & commercial enforcement rulings in the Supreme Court of Bangladesh.'],
    'Ranked Tier 1 in Commercial Dispute Resolution & Cross-Border Arbitration (2026).',
    '+880 2-223384945',
    'chambers@khossain.bd',
    'Chamber Building, 122-124 Motijheel C/A, Dhaka-1000'
  ),
  (
    'Syed Ishtiaq Ahmed & Associates',
    'Barrister Syed Afzal Hasan Uddin',
    'BD',
    'Gulshan, Dhaka',
    ARRAY['Corporate M&A', 'Competition Law', 'Banking & Supply'],
    28,
    ARRAY['Advised multinational pharmaceutical distributors on exclusive supply compliance.', 'Successfully defended corporate clients against punitive liquidated damages claims.'],
    'Expanded Dhaka Cyber & Commercial Litigation Desk for 2026.',
    '+880 2-9884512',
    'counsel@siaa-law.com.bd',
    'Concord Ovilash, Road 62, Gulshan-2, Dhaka-1212'
  ),
  (
    'Huq & Company',
    'Barrister Rafique-ul Huq Chambers',
    'BD',
    'Purana Paltan, Dhaka',
    ARRAY['Penal Code Defense', 'Commercial Litigation', 'Labour Act'],
    32,
    ARRAY['Secured quashing of coercive criminal complaints arising from civil supply defaults.', 'High Court appellate counsel for industrial supply & labour disputes.'],
    'Published 2026 practitioner commentary on Commercial Remedies & Criminal Liability.',
    '+880 2-9551029',
    'office@huqandcompany.bd',
    '47/1 Purana Paltan, Dhaka-1000'
  ),
  (
    'Cravath, Swaine & Moore LLP',
    'Commercial Litigation & Antitrust Group',
    'US',
    'New York, NY',
    ARRAY['Sherman Act Antitrust', 'Federal Arbitration', 'Commercial Contracts'],
    45,
    ARRAY['Lead defense counsel in multi-district commercial distribution & price-fixing litigation.', 'Precedent-setting Second Circuit appeals on unconscionability and limitation clauses.'],
    'Named National Commercial Litigation Firm of the Year (2026).',
    '+1 (212) 474-1000',
    'inquiries@cravath-counsel.us',
    'Two Manhattan West, 375 Ninth Avenue, New York, NY 10001'
  ),
  (
    'Latham & Watkins LLP',
    'Technology & Cross-Border Disputes Practice',
    'US',
    'Washington, D.C.',
    ARRAY['CFAA & Cyber Compliance', 'International Trade', 'Corporate Defense'],
    30,
    ARRAY['Defended enterprise SaaS providers in federal data-access and trade secret suits.'],
    'Launched Cross-Border Statutory Risk & AI Governance Desk.',
    '+1 (202) 637-2200',
    'dc.chambers@lw-counsel.us',
    '555 Eleventh Street, NW, Washington, D.C. 20004'
  ),
  (
    'Freshfields Bruckhaus Deringer',
    'EU Competition & Data Privacy Practice',
    'EU',
    'Brussels, Belgium',
    ARRAY['GDPR Art. 82/83', 'TFEU Art. 101', 'Cross-Border Civil Law'],
    38,
    ARRAY['Represented global logistics platforms before the Court of Justice of the European Union (CJEU).', 'Successfully reduced administrative fine exposure under GDPR Article 83.'],
    'Recognized as Top European Regulatory & Competition Practice in 2026.',
    '+32 2 504 7000',
    'brussels@freshfields-eu.org',
    'Bastion Tower, Place du Champ de Mars 5, 1050 Brussels'
  ),
  (
    'Linklaters LLP',
    'European Commercial & Arbitration Chambers',
    'EU',
    'Frankfurt / Paris',
    ARRAY['Rome I Regulation', 'Distribution Law', 'Tech Regulation'],
    34,
    ARRAY['Advised industrial manufacturers on pan-European exclusive agency termination rights.'],
    'Released 2026 EU Digital & Supply Chain Enforcement Report.',
    '+49 69 71003 0',
    'eu.counsel@linklaters-eu.org',
    'Taunusanlage 8, 60329 Frankfurt am Main'
  )
) AS v(name, lead_counsel, region, city, specialties, experience_years, notable_cases, recent_news, phone, email, address)
WHERE NOT EXISTS (SELECT 1 FROM law_firms LIMIT 1);
