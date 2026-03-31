import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Users, UserCheck } from "lucide-react";
import { CopyButton } from "./copy-button";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  churned: "bg-red-100 text-red-700 border-red-200",
};

export default async function AffiliatesPage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const referralCode = operator.referral_code || "—";
  const shareLink = `https://pcrbooking.com/ref/${referralCode}`;

  const { data: referrals } = await supabase
    .from("referrals")
    .select("*, referred_operator:referred_operator_id(business_name)")
    .eq("referrer_operator_id", operator.id)
    .order("created_at", { ascending: false });

  const activeCount = referrals?.filter((r) => r.is_active).length || 0;
  const totalEarned = referrals?.reduce((sum, r) => sum + Number(r.total_earned || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
        <p className="text-muted-foreground">
          Earn 30% recurring commission for 12 months on every operator you refer.
        </p>
      </div>

      {/* Referral Code */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>
            Share this code or link with other private car rental operators.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg border bg-slate-50 px-4 py-3 font-mono text-lg font-bold tracking-wider">
              {referralCode}
            </div>
            <CopyButton text={referralCode} label="Code" />
          </div>
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2">Share Link</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border bg-slate-50 px-4 py-2 font-mono text-sm text-muted-foreground truncate">
                {shareLink}
              </div>
              <CopyButton text={shareLink} label="Link" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{referrals?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Active Referrals</p>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-1">${totalEarned.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Info */}
      <Card className="border-0 bg-white shadow-sm ring-0 border-[#2EBD6B]/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-2 bg-[#2EBD6B]/10">
              <DollarSign className="h-5 w-5 text-[#2EBD6B]" />
            </div>
            <div>
              <p className="font-semibold">30% Recurring Commission</p>
              <p className="text-sm text-muted-foreground">
                Earn 30% of each referred operator&apos;s monthly subscription for 12 months.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!referrals || referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No referrals yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share your referral code to start earning commissions.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referred Business</TableHead>
                  <TableHead>Signup Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Months Left</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-medium">
                      {ref.referred_operator?.business_name || "Pending signup"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(ref.signup_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[ref.is_active ? "active" : "churned"]}
                      >
                        {ref.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{ref.commission_pct}%</TableCell>
                    <TableCell>{ref.months_remaining}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(ref.total_earned).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
