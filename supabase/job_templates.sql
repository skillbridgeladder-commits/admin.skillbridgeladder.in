-- Create job_templates table
CREATE TABLE job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can do everything (we'll assume all users for now as simplified approach, but in prod would be admin restricted)
CREATE POLICY "Allow all access" ON job_templates FOR ALL USING (true);

-- Insert some predefined templates
INSERT INTO job_templates (name, description, form_schema) VALUES
('Standard Developer', 'Basic fields for development roles.', '{"fields": [{"id": "portfolio", "type": "text", "label": "Portfolio URL"}, {"id": "github", "type": "text", "label": "GitHub Profile"}, {"id": "stack", "type": "text", "label": "Tech Stack"}]}'),
('Creative Designer', 'Fields for UI/UX and Graphic Design.', '{"fields": [{"id": "behance", "type": "text", "label": "Behance/Dribbble URL"}, {"id": "tools", "type": "text", "label": "Primary Tools (Figma, Adobe, etc.)"}]}'),
('Digital Marketer', 'Fields for marketing and SEO roles.', '{"fields": [{"id": "case_study", "type": "text", "label": "Case Study URL"}, {"id": "niche", "type": "text", "label": "Marketing Niche"}]}');
