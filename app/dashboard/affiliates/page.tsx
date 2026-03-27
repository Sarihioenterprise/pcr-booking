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
import { DollarSign, Users, MousePointerClick, UserCheck } from "lucide-react";
import { CopyButton } from "./copy-button";

const referralCode = "ATLANTA30";
const shareLink = `https://pcrbooking.com/ref/${referralCode}`;

const stats = [
  { label: "Total Clicks", value: "342", icon: MousePointerClick },
  { label: "Signups", value: "18", icon: Users },
  { label: "Active Referrals", value: "12", icon: UserCheck },
  { label: "Total Earned", value: "$2,844", icon: DollarSign },
];

const referrals = [
  {
    id: "1",
    business: "Miami Luxury Wheels",
    signupDate: "2026-02-15",
    status: "active" as const,
    commission: "30%",
    earned: "$284.40",
  },
  {
    id: "2",
    business: "Houston Fleet Co",
    signupDate: "2026-01-20",
    status: "active" as const,
    commission: "30%",
    earned: "$521.10",
  },
  {
    id: "3",
    business: "Dallas Auto Rentals",
    signupDate: "2025-12-05",
    status: "active" as const,
    commission: "30%",
    earned: "$710.40",
  },
  {
    id: "4",
    business: "Charlotte Rides",
    signupDate: "2026-03-01",
    status: "pending" as const,
    commission: "30%",
    earned: "$0.00",
  },
  {
    id: "5",
    business: "Tampa Bay Motors",
    signupDate: "2025-11-10",
    status: "churned" as const,
    commission: "30%",
    earned: "$1,328.10",
  },
];

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  churned: "bg-red-100 text-red-700 border-red-200",
};

export default function AffiliatesPage() {
  return (
    <div className="space-y-6" style={{ background: "#F8F9FC", minHeight: "100%" }}>
      <div>
        <h1 className="text-2xl font-bold">Affiliate Dashboard</h1>
        <p className="text-muted-foreground">
          Earn 30% recurring commission for 12 months on every operator you refer.
        </p>
      </div>

      {/* Referral Code */}
      <Card className="bg-white">
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Commission Info Banner */}
      <Card className="bg-white border-[#2EBD6B]/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div
              className="rounded-full p-2"
              style={{ backgroundColor: "rgba(46,189,107,0.1)" }}
            >
              <DollarSign className="h-5 w-5" style={{ color: "#2EBD6B" }} />
            </div>
            <div>
              <p className="font-semibold">30% Recurring Commission</p>
              <p className="text-sm text-muted-foreground">
                Earn 30% of each referred operator&apos;s monthly subscription for 12 months.
                No cap on the number of referrals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Referrals</CardTitle>
          <CardDescription>
            Track the businesses you have referred and your earnings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referred Business</TableHead>
                <TableHead>Signup Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead className="text-right">Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((ref) => (
                <TableRow key={ref.id}>
                  <TableCell className="font-medium">{ref.business}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(ref.signupDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[ref.status]}>
                      {ref.status.charAt(0).toUpperCase() + ref.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{ref.commission}</TableCell>
                  <TableCell className="text-right font-medium">
                    {ref.earned}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
