CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  meta_description text,
  published_at timestamptz DEFAULT now(),
  status text DEFAULT 'published',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_published_at_idx ON blog_posts (status, published_at DESC);
