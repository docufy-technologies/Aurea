import { useState } from "react";
import { useLoginMutation } from "../hooks/use-login";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const loginMutation = useLoginMutation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!identifier.trim()) {
      setLocalError("Please enter your email or mobile number.");
      return;
    }

    if (!password) {
      setLocalError("Please enter your password.");
      return;
    }

    loginMutation.mutate(
      { identifier, password, rememberMe },
      {
        onSuccess: () => {
          navigate(redirectTo);
        },
      },
    );
  };

  const apiError = loginMutation.error;
  const displayError = localError || apiError?.message;

  return (
    <Card className="glass border-zinc-900 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden animate-fade-in">
      {/* Subtle top gold highlight glow */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

      <CardHeader className="space-y-1 pb-6 text-center">
        <CardTitle className="font-display font-extrabold text-3xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
          Sign In
        </CardTitle>
        <CardDescription className="text-zinc-400 text-xs">
          Access your personalized luxury shopping profile
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General API/Local errors */}
          {displayError && (
            <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-900/40 text-xs text-red-400 font-medium animate-shake">
              {displayError}
              {apiError?.code === "ACCOUNT_LOCKED" &&
                apiError.details?.lockedUntil && (
                  <div className="mt-1 text-[10px] text-zinc-500">
                    Locked until:{" "}
                    {new Date(
                      apiError.details.lockedUntil,
                    ).toLocaleTimeString()}
                  </div>
                )}
            </div>
          )}

          {/* Email or Mobile Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 block tracking-wide">
              EMAIL OR MOBILE
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="name@example.com or +8801XXXXXXXXX"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-10 pr-4 h-11 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-700 focus:border-amber-500 focus:ring-amber-500/10"
                disabled={loginMutation.isPending}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400 block tracking-wide">
                PASSWORD
              </label>
              <Link
                to="/forgot-password"
                className="text-[10px] text-amber-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-700 focus:border-amber-500 focus:ring-amber-500/10"
                disabled={loginMutation.isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-zinc-900 border-zinc-800 text-amber-500 focus:ring-amber-500/10 focus:ring-offset-zinc-950 w-3.5 h-3.5 accent-amber-500"
                disabled={loginMutation.isPending}
              />
              <span className="text-xs text-zinc-400 hover:text-zinc-300">
                Keep me logged in for 30 days
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 mt-4 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 font-display text-sm tracking-wide font-bold"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <span>SIGN IN</span>
            )}
          </Button>

          <div className="text-center pt-2">
            <span className="text-xs text-zinc-500">
              New to Aurea?{" "}
              <Link
                to="/register"
                className="text-amber-500 hover:underline font-semibold"
              >
                Create an Account
              </Link>
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
