import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  shipped: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

export default async function FeatureRequestsPage() {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    redirect("/dashboard");
  }

  const supabase = createAdminClient();
  const { data: requests, error } = await supabase
    .from("feature_requests")
    .select("id, summary, request_count, status, created_at")
    .order("request_count", { ascending: false });

  if (error) {
    return <div className="p-8 text-red-600">Failed to load feature requests: {error.message}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Feature Requests</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"># Requests</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(requests ?? []).map((fr) => (
              <tr key={fr.id}>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{fr.summary}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{fr.request_count}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[fr.status] ?? STATUS_BADGE.pending}`}>
                    {fr.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(fr.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  {fr.status !== "shipped" && fr.status !== "declined" && (
                    <form action={`/api/admin/feature-requests/${fr.id}/ship`} method="POST">
                      <button
                        type="submit"
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                      >
                        Mark Shipped
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {(requests ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-400">
                  No feature requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
