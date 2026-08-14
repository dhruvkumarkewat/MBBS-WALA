-- Create the inquiries table for the public Contact Us form
CREATE TABLE IF NOT EXISTS inquiries (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  message TEXT,
  source TEXT DEFAULT 'mbbswala',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert inquiries (public access for Contact Form)
CREATE POLICY "Allow public insert into inquiries" 
  ON inquiries FOR INSERT 
  WITH CHECK (true);

-- Only authenticated users (admins/staff) can view inquiries
CREATE POLICY "Allow authenticated to select inquiries" 
  ON inquiries FOR SELECT 
  USING (auth.role() = 'authenticated');
