import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

import nistaLogo from "@assets/image_1774170648070.png";

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { toast } = useToast();
  const { canInstall, promptInstall } = usePWAInstall();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone.trim() || !password.trim()) {
      toast({ 
        variant: "destructive",
        description: "Mobile number and password are required" 
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password: password.trim() }),
      });

      if (res.ok) {
        toast({ description: "Logged in successfully!" });
        onLoginSuccess();
      } else {
        const err = await res.json();
        toast({ 
          variant: "destructive",
          description: err.error || "Login failed"
        });
      }
    } catch (error) {
      toast({ 
        variant: "destructive",
        description: "Network error - please try again"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showBanner = canInstall && !bannerDismissed;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white dark:from-slate-950 dark:to-slate-900 p-4 gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <img
              src={nistaLogo}
              alt="NistaGPS"
              className="h-14 w-auto object-contain mix-blend-multiply dark:mix-blend-screen"
              data-testid="img-nista-logo-login"
            />
          </div>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your credentials to access real-time GPS tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Mobile Number</label>
              <Input
                type="tel"
                placeholder="Enter mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                data-testid="input-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Legal footer */}
      <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-x-3">
          <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-login-terms">Terms &amp; Conditions</Link>
          <span className="text-muted-foreground/40">·</span>
          <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-login-privacy">Privacy Policy</Link>
        </div>
        <span data-testid="text-login-copyright">© 2025 Nagaas Retail Private Limited. All Rights Reserved.</span>
      </div>

      {/* PWA Install Banner — only shows when browser is ready to prompt */}
      {showBanner && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 bg-background border-t shadow-lg"
          data-testid="banner-pwa-install"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Download className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Install NistaGPS App</p>
              <p className="text-xs text-muted-foreground truncate">Add to home screen for quick access</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              onClick={promptInstall}
              data-testid="button-pwa-install"
            >
              Install
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setBannerDismissed(true)}
              data-testid="button-pwa-dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
