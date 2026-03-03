-- Kitty Tinder — seed data (5 fake ragdoll listings)
-- Run this in the Supabase SQL Editor after schema.sql.
-- Running it twice will fail gracefully due to the UNIQUE constraint on external_url.

INSERT INTO listings (
  source, external_url, title, price, age_months, sex, location_raw,
  description, photo_urls, listed_at,
  score_alone, score_friendly, score_vibe, score_distance, score_age,
  score_overall, score_rationale, decision, decided_at
) VALUES
(
  'pets4homes',
  'https://pets4homes.co.uk/fake/listing-001',
  'Beautiful Blue-Point Ragdoll',
  45000,
  30,
  'female',
  'Edinburgh, Midlothian',
  'Rosie is a gorgeous blue-point ragdoll who loves nothing more than curling up on the sofa. She''s been spayed and is fully vaccinated. Very calm and independent — happy to spend the day alone while you''re at work, then greet you at the door for evening cuddles. Would suit a quiet household.',
  ARRAY['https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=600'],
  '2026-02-25T10:00:00Z',
  8.5, 9.0, 8.0, 10.0, 10.0,
  9.08,
  '{"alone": "Described as calm and happy alone during the day.", "friendly": "Very affectionate — greets owner at the door.", "vibe": "Looks relaxed and well-groomed in photos.", "distance": "Edinburgh listing, no travel needed.", "age": "2.5 years — ideal age, past kitten phase."}',
  NULL, NULL
),
(
  'gumtree',
  'https://gumtree.com/fake/listing-002',
  'Ragdoll Kitten — Seal Mitted',
  65000,
  4,
  'male',
  'Glasgow, Lanarkshire',
  'Adorable seal mitted ragdoll kitten from a litter of four. He''s the last one available. Very playful and curious, loves chasing feather toys. Will come with first vaccinations and a kitten starter pack. Mum and dad can both be seen.',
  ARRAY['https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600'],
  '2026-02-27T14:30:00Z',
  4.0, 7.5, 7.0, 8.0, 4.0,
  5.83,
  '{"alone": "Very young kitten, will need company and supervision.", "friendly": "Playful and curious — good signs for sociability.", "vibe": "Cute kitten energy, but hard to judge adult temperament.", "distance": "Glasgow — short train ride from Edinburgh.", "age": "4 months — very young, demanding kitten phase."}',
  NULL, NULL
),
(
  'pets4homes',
  'https://pets4homes.co.uk/fake/listing-003',
  'Gentle Senior Ragdoll Needs Loving Home',
  15000,
  84,
  'female',
  'Newcastle upon Tyne',
  'Bella is a 7-year-old lilac ragdoll being rehomed due to her owner moving abroad. She''s incredibly gentle and loves a quiet environment. Fully litter trained, spayed, and microchipped. She''s fine being left alone and prefers calm surroundings. Would love a home where she can be the only pet.',
  ARRAY['https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600'],
  '2026-02-20T09:00:00Z',
  9.0, 8.0, 7.5, 5.0, 8.0,
  7.73,
  '{"alone": "Owner confirms she is very content alone.", "friendly": "Gentle and affectionate but not demanding.", "vibe": "Calm senior energy — very composed in photos.", "distance": "Newcastle — about 2 hours by train from Edinburgh.", "age": "7 years — settled senior, past the energetic phase."}',
  NULL, NULL
),
(
  'gumtree',
  'https://gumtree.com/fake/listing-004',
  'Ragdoll Cross — Stunning Blue Eyes',
  35000,
  18,
  'male',
  'Edinburgh, City of Edinburgh',
  'Milo is an 18-month-old ragdoll cross with the most striking blue eyes. He''s neutered, chipped, and up to date on vaccinations. Gets along well with other cats but is equally happy as a solo cat. Loves sitting by the window watching birds. Being rehomed as we''re expecting a baby and sadly can''t give him the attention he deserves.',
  ARRAY['https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600'],
  '2026-03-01T16:00:00Z',
  7.0, 8.5, 8.5, 10.0, 7.0,
  8.08,
  '{"alone": "Happy as a solo cat, enjoys independent window-watching.", "friendly": "Gets along with others, affectionate with people.", "vibe": "Stunning eyes, looks healthy and curious in photos.", "distance": "Edinburgh — no travel needed.", "age": "18 months — young adult, good balance of energy and calm."}',
  NULL, NULL
),
(
  'pets4homes',
  'https://pets4homes.co.uk/fake/listing-005',
  'TICA Registered Ragdoll — Chocolate Bicolour',
  80000,
  12,
  'female',
  'London, Greater London',
  'Luna is a TICA registered chocolate bicolour ragdoll. She''s just turned one and is looking for her forever home. Very sociable and talkative — she''ll follow you from room to room. Loves being brushed and will purr for hours. Would prefer a home where someone is around most of the day as she doesn''t like being left alone for long.',
  ARRAY['https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600'],
  '2026-02-28T11:00:00Z',
  3.0, 9.5, 9.0, 2.0, 7.0,
  5.80,
  '{"alone": "Explicitly needs company — does not like being left alone.", "friendly": "Extremely sociable, follows you everywhere.", "vibe": "Gorgeous coat, looks very well cared for.", "distance": "London — significant travel from Edinburgh.", "age": "12 months — just past kitten stage, still energetic."}',
  NULL, NULL
);
