import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CreditCard, RefreshCw, Phone, AlertCircle } from "lucide-react";
import type { User } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

interface RenewProps {
  user: UserWithoutPassword;
  onRenewed: () => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open(): void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Renew({ user, onRenewed }: RenewProps) {
  const { toast } = useToast();
  const [isPaying, setIsPaying] = useState(false);
  const [noCredentials, setNoCredentials] = useState(false);

  const expiryDate = user.subscriptionExpiry
    ? new Date(user.subscriptionExpiry).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const handlePayNow = async () => {
    setIsPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast({ variant: "destructive", description: "Failed to load payment gateway. Please check your internet connection." });
        setIsPaying(false);
        return;
      }

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (orderRes.status === 503) {
        setNoCredentials(true);
        setIsPaying(false);
        return;
      }

      if (!orderRes.ok) {
        const err = await orderRes.json();
        toast({ variant: "destructive", description: err.error || "Failed to create payment order" });
        setIsPaying(false);
        return;
      }

      const { orderId, amount, currency, keyId } = await orderRes.json();

      const options: RazorpayOptions = {
        key: keyId,
        amount,
        currency,
        name: "GPS Fleet Tracker",
        description: "Annual Subscription Renewal",
        order_id: orderId,
        prefill: {
          name: user.name,
          contact: user.phone || undefined,
        },
        theme: { color: "#f97316" },
        handler: async (response: RazorpayResponse) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const err = await verifyRes.json();
              toast({ variant: "destructive", description: err.error || "Payment verification failed" });
              return;
            }

            toast({ description: "Payment successful! Your subscription has been renewed." });
            await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            onRenewed();
          } catch {
            toast({ variant: "destructive", description: "Payment verification failed. Please contact support." });
          }
        },
        modal: {
          ondismiss: () => {
            setIsPaying(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      toast({ variant: "destructive", description: "Something went wrong. Please try again." });
      setIsPaying(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-white dark:from-slate-950 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">Subscription Expired</CardTitle>
          <CardDescription>
            Hello, <span className="font-medium text-foreground">{user.name}</span>. Your subscription
            {expiryDate ? (
              <> expired on <span className="font-medium text-foreground">{expiryDate}</span></>
            ) : (
              <> has expired</>
            )}
            . Please renew to continue using the GPS Fleet Tracker.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {noCredentials ? (
            <div className="rounded-md bg-muted p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span>Online payment not yet configured</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Please contact your administrator to renew your subscription.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>Contact admin for assistance</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <p className="font-medium">What you get with renewal:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  <li>Full access to all GPS tracking features</li>
                  <li>Real-time vehicle location monitoring</li>
                  <li>Subscription extended for 1 year</li>
                </ul>
              </div>

              <Button
                className="w-full"
                size="default"
                onClick={handlePayNow}
                disabled={isPaying}
                data-testid="button-pay-now"
              >
                {isPaying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Opening payment...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Payments are securely processed by Razorpay
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
