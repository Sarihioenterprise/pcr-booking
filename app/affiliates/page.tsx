import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Car, DollarSign, Users, TrendingUp, ArrowRight } from "lucide-react";

export default function AffiliatesPage() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">PCR Booking</span>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm">Start Free Trial</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Earn <span className="text-success">30%</span> Recurring for 12
            Months
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Refer private rental operators to PCR Booking and earn 30% of their
            subscription fee every month for a full year.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
          {[
            {
              icon: Users,
              title: "Share Your Code",
              desc: "Every operator gets a unique referral code upon signup.",
            },
            {
              icon: DollarSign,
              title: "Earn Commission",
              desc: "Get 30% of the referred operator's monthly subscription.",
            },
            {
              icon: TrendingUp,
              title: "12 Months",
              desc: "Earn recurring commission for a full 12 months per referral.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="p-6 text-center">
                <item.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold mb-4">Earnings Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { refs: 5, plan: "Growth ($79)", monthly: "$118.50", yearly: "$1,422" },
              { refs: 10, plan: "Pro ($149)", monthly: "$447", yearly: "$5,364" },
              { refs: 20, plan: "Scale ($249)", monthly: "$1,494", yearly: "$17,928" },
            ].map((item) => (
              <Card key={item.plan}>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    {item.refs} referrals on {item.plan}
                  </p>
                  <p className="text-2xl font-bold text-success">
                    {item.monthly}/mo
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.yearly}/year
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href="/auth/signup">
            <Button size="lg" className="text-lg px-8">
              Sign Up & Get Your Referral Code
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
