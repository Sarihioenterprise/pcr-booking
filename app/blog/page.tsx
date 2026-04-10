import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllBlogPosts } from "@/lib/blog-posts";

export const metadata = {
  title: "Blog | PCR Booking - Private Rental Car Software",
  description:
    "Learn how to start and scale your private car rental business. Insights for independent operators running their own booking systems.",
  openGraph: {
    title: "Blog | PCR Booking",
    description:
      "Learn how to start and scale your private car rental business.",
    url: "https://pcrbooking.com/blog",
  },
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

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
              href="/"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Home
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

      {/* Header */}
      <section className="border-b border-white/10 bg-[#0c0c1c] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            PCR Booking Blog
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Insights, guides, and best practices for running a successful
            private car rental business.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {posts.length === 0 ? (
            <div className="text-center text-gray-400">
              <p>No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`}>
                  <Card className="border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className="border-[#2EBD6B] text-[#2EBD6B]"
                            >
                              {post.category}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {post.readTime}
                            </span>
                          </div>
                          <h2 className="text-2xl font-bold leading-tight">
                            {post.title}
                          </h2>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-400">{post.excerpt}</p>
                      <div className="flex items-center gap-2 text-[#2EBD6B]">
                        <span className="text-sm font-semibold">Read more</span>
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-gray-600">
                        {new Date(post.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
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
