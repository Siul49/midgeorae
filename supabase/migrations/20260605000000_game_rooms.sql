-- Create game_rooms table for storing Next.js board game rooms
CREATE TABLE IF NOT EXISTS game_rooms (
  code text PRIMARY KEY,
  room_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Allow public read, insert, and update access for all users to facilitate gameplay
CREATE POLICY "Allow public read access on game_rooms" ON game_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on game_rooms" ON game_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on game_rooms" ON game_rooms FOR UPDATE USING (true);
