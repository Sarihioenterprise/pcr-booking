import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBlogPostBySlug, getAllBlogPosts } from "@/lib/blog-posts";

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: `${post.title} | PCR Booking Blog`,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://pcrbooking.com/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const allPosts = getAllBlogPosts();
  const postIndex = allPosts.findIndex((p) => p.slug === slug);
  const nextPost = postIndex > 0 ? allPosts[postIndex - 1] : null;

  return (
    <div className="min-h-screen bg-[#080812] text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#080812]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icon.png" alt="PCR Logo" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">
              PCR Booking
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/blog"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Blog
            </Link>
            <Link href="/auth/login">
              <Button
                variant="outline"
                className="border-gray-600 text-gray-400 hover:text-white"
              >
                Login
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="h-9 bg-[#2EBD6B] px-4 text-sm font-semibold text-white hover:bg-[#1a9952]">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Article Header */}
      <section className="border-b border-white/10 bg-[#0c0c1c] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link href="/blog">
            <Button
              variant="ghost"
              className="mb-6 gap-2 text-gray-400 hover:text-white p-0 h-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Button>
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <Badge
              variant="outline"
              className="border-[#2EBD6B] text-[#2EBD6B]"
            >
              {post.category}
            </Badge>
            <span className="text-sm text-gray-500">{post.readTime}</span>
            <span className="text-sm text-gray-500">
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 text-xl text-gray-400">{post.excerpt}</p>
        </div>
      </section>

      {/* Article Content */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <article
            className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-[#2EBD6B] prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* CTA Section */}
          <div className="mt-16 border-t border-white/10 pt-12 text-center">
            <h2 className="text-2xl font-bold">Ready to Start Your Business?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-400">
              Join independent rental operators keeping 100% of their revenue.
              Start your free trial today — no credit card required.
            </p>
            <Link href="/auth/signup">
              <Button className="mt-6 h-12 px-8 text-base font-semibold bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Next Article */}
          {nextPost && (
            <div className="mt-16 border-t border-white/10 pt-12">
              <h3 className="mb-4 text-sm font-semibold uppercase text-gray-500">
                Next Article
              </h3>
              <Link href={`/blog/${nextPost.slug}`}>
                <div className="group cursor-pointer">
                  <h4 className="text-2xl font-bold text-white group-hover:text-[#2EBD6B] transition-colors">
                    {nextPost.title}
                  </h4>
                  <p className="mt-2 text-gray-400">{nextPost.excerpt}</p>
                  <div className="mt-4 flex items-center gap-2 text-[#2EBD6B]">
                    <span className="font-semibold">Read article</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#080812] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <img src="/icon.png" alt="PCR Logo" className="h-7 w-7" />
                <span className="font-bold">PCR Booking</span>
              </Link>
              <p className="mt-3 text-sm text-gray-500">
                The booking platform built for private rental car operators.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300">Product</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link
                    href="/"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300">Company</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signup"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-300">Legal</h4>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-gray-500 hover:text-white"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-gray-600">
            &copy; {new Date().getFullYear()} PCR Booking. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
