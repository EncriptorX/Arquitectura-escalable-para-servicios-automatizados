/*
  # Create service requests table

  1. New Tables
    - `service_requests`
      - `id` (uuid, primary key) - Unique identifier for each request
      - `company_name` (text) - Name of the company requesting protection
      - `contact_name` (text) - Name of the responsible person
      - `email` (text) - Contact email address
      - `phone` (text, nullable) - Optional phone number
      - `urls` (text array) - Array of URLs to protect
      - `comments` (text, nullable) - Additional comments from the client
      - `created_at` (timestamptz) - Timestamp of request creation
      - `status` (text) - Request status (pending, in_progress, completed)
  
  2. Security
    - Enable RLS on `service_requests` table
    - Add policy for inserting new requests (public access for form submissions)
    - Add policy for authenticated admins to view all requests
*/

CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  urls text[] NOT NULL DEFAULT '{}',
  comments text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public to insert service requests"
  ON service_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view all requests"
  ON service_requests
  FOR SELECT
  TO authenticated
  USING (true);
