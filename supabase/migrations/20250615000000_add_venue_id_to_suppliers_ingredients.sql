-- Link suppliers and ingredients to venues (staff.venue_id already exists).
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS suppliers_venue_id_idx ON suppliers(venue_id);
CREATE INDEX IF NOT EXISTS ingredients_venue_id_idx ON ingredients(venue_id);
