/**
 * /api/cron/blog-2 — Second daily blog generation run (1pm ET).
 * Delegates entirely to the shared blog cron logic in /api/cron/blog.
 */
export { GET } from "@/app/api/cron/blog/route";
