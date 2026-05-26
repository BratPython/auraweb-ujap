CREATE TABLE IF NOT EXISTS landing_video_settings (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url            text,
  audio_track_1_url    text,
  audio_track_2_url    text,
  subtitles_track_1_url text,
  subtitles_track_2_url text,
  subtitles_track_1_name text DEFAULT 'Subtítulos 1',
  subtitles_track_2_name text DEFAULT 'Subtítulos 2',
  is_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE landing_video_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON landing_video_settings
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM perfiles
    WHERE perfiles.user_id = auth.uid()
      AND perfiles.rol = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM perfiles
    WHERE perfiles.user_id = auth.uid()
      AND perfiles.rol = 'admin'
  ));

CREATE POLICY "Public read enabled" ON landing_video_settings
  FOR SELECT
  USING (is_enabled = true);

INSERT INTO landing_video_settings (is_enabled) VALUES (false)
ON CONFLICT DO NOTHING;
