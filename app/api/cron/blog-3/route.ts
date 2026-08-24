/**
 * /api/cron/blog-3 — Third daily blog generation run (6pm ET).
 * Delegates entirely to the shared blog cron logic in /api/cron/blog.
 */
export { GET } from "@/app/api/cron/blog/route";
