import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export interface DbBlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string | null;
  published_at: string;
  status: string;
  created_at: string;
}

export async function getDbBlogPosts(): Promise<DbBlogPost[]> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("supabase-blog: fetch error", error.message);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("supabase-blog: unexpected error", err);
    return [];
  }
}

export async function getDbBlogPostBySlug(slug: string): Promise<DbBlogPost | null> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveDbBlogPost(post: {
  title: string;
  slug: string;
  content: string;
  meta_description: string;
  status?: string;
}): Promise<DbBlogPost> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: post.title,
      slug: post.slug,
      content: post.content,
      meta_description: post.meta_description,
      status: post.status ?? "published",
      published_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save blog post: ${error.message}`);
  return data;
}
