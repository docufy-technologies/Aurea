import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ApiResponse } from "@aurea/shared";
import {
  ShieldCheck,
  Flame,
  Sparkles,
  Watch,
  Eye,
  ShoppingCart,
  KeyRound,
  CheckCircle2,
  Server,
  HelpCircle,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/ui/card";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Register from "./pages/register";
import ConfirmEmail from "./pages/confirm-email";
import Login from "./pages/login";
import { LogoutButton } from "./features/auth/components/logout-button";
import { useAuthStore } from "./stores/auth-store";
import { useRefreshMutation } from "./features/auth/hooks/use-login";

interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
}

function Home() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    fetch("/api/v1/health")
      .then((res) => {
        if (!res.ok) throw new Error("API server returned error status");
        return res.json() as Promise<ApiResponse<HealthData>>;
      })
      .then((resJson) => {
        if (resJson.success) {
          setHealth(resJson.data);
        } else {
          throw new Error("API response wrapper success is false");
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative selection:bg-amber-500/30">
      {/* Decorative gradient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-zinc-900 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse-subtle" />
            <span className="font-display font-bold text-2xl tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              AUREA
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a
              href="#catalog"
              className="hover:text-amber-400 transition-colors"
            >
              FRAGRANCES
            </a>
            <a
              href="#catalog"
              className="hover:text-amber-400 transition-colors"
            >
              COSMETICS
            </a>
            <a
              href="#catalog"
              className="hover:text-amber-400 transition-colors"
            >
              WATCHES
            </a>
            <a
              href="#features"
              className="hover:text-amber-400 transition-colors"
            >
              RELIABILITY
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <span className="text-xs text-amber-400 font-semibold bg-zinc-900/50 border border-zinc-800/80 px-3 py-1.5 rounded-lg select-none uppercase tracking-wider font-mono">
                  {user.fullName}
                </span>
                <LogoutButton
                  variant="ghost"
                  className="h-9 px-3 text-xs text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 border-transparent hover:border-transparent"
                />
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="h-9 px-4 text-xs text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant="outline"
                    className="h-9 px-4 text-xs border-amber-500/25 text-amber-400 hover:bg-amber-500/10"
                  >
                    Register
                  </Button>
                </Link>
              </>
            )}
            <Button className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span>Cart</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col max-w-6xl mx-auto px-6 py-16 w-full gap-20">
        <section className="text-center flex flex-col items-center gap-6 max-w-3xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400 tracking-wider uppercase animate-pulse-subtle">
            <Flame className="w-3.5 h-3.5" />
            <span>Bangladeshi Premium Storefront</span>
          </div>

          <h1 className="font-display font-extrabold text-5xl md:text-6xl tracking-tight text-white leading-tight">
            Elevating Luxury in{" "}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              Bangladesh
            </span>
          </h1>

          <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
            Discover a curated collection of ultra-premium fragrances, couture
            cosmetics, and luxury timepieces. Engineered for local payments,
            guaranteed authentic stock, and fast express deliveries.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <a href="#catalog">
              <Button size="lg" className="shadow-lg shadow-amber-500/25">
                Explore Collection
              </Button>
            </a>
            <a href="#features">
              <Button variant="outline" size="lg">
                System Overview
              </Button>
            </a>
          </div>
        </section>

        {/* Integration Status / Health Monitor */}
        <section className="glass-gold rounded-2xl p-8 max-w-4xl mx-auto w-full animate-fade-in">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Server className="w-6 h-6 animate-pulse-subtle" />
              </div>
              <div>
                <h3 className="font-display font-bold text-xl text-zinc-100">
                  Express API Integration Status
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Monitoring connectivity with the `@aurea/server` package.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {loading ? (
                <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
                  <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
                  <span>Connecting backend...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-rose-400 text-sm font-medium bg-rose-950/20 px-4 py-2 rounded-xl border border-rose-950/50">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Offline (Check dev stack status)</span>
                </div>
              ) : health ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold bg-emerald-950/20 px-4 py-2 rounded-xl border border-emerald-950/50">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Backend Server Live ({health.status})</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    Uptime: {Math.floor(health.uptime)}s | API Port: 5000
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Categories Catalog */}
        <section id="catalog" className="flex flex-col gap-8">
          <div className="text-center flex flex-col gap-2">
            <h2 className="font-display font-bold text-3xl text-white">
              Our Signature Niches
            </h2>
            <p className="text-zinc-500 text-sm">
              Experience hand-selected sensory elegance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Fragrances */}
            <Card className="group hover:border-amber-500/30 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-colors">
                  <Flame className="w-6 h-6" />
                </div>
                <CardTitle className="mt-4">Luxury Fragrances</CardTitle>
                <CardDescription>
                  Imported Extrait de Parfum, refined Ouds, and boutique
                  colognes suited for Dhaka's rich seasons.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 flex items-center gap-1.5 text-xs text-amber-500 font-semibold group-hover:translate-x-1 transition-transform">
                <span>Browse Scents</span>
                <Eye className="w-3.5 h-3.5" />
              </CardContent>
            </Card>

            {/* Cosmetics */}
            <Card className="group hover:border-amber-500/30 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-colors">
                  <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle className="mt-4">High-Fashion Cosmetics</CardTitle>
                <CardDescription>
                  Elite makeup, dermatologist-tested skin elixirs, and luxury
                  cosmetics matching the tropical climate.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 flex items-center gap-1.5 text-xs text-amber-500 font-semibold group-hover:translate-x-1 transition-transform">
                <span>Browse Makeup</span>
                <Eye className="w-3.5 h-3.5" />
              </CardContent>
            </Card>

            {/* Watches */}
            <Card className="group hover:border-amber-500/30 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-colors">
                  <Watch className="w-6 h-6" />
                </div>
                <CardTitle className="mt-4">Elite Timepieces</CardTitle>
                <CardDescription>
                  Swiss movements, luxury chronographs, and legacy timepieces
                  backed by certificates of authenticity.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-4 flex items-center gap-1.5 text-xs text-amber-500 font-semibold group-hover:translate-x-1 transition-transform">
                <span>Browse Horology</span>
                <Eye className="w-3.5 h-3.5" />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Feature list: local edge case highlights */}
        <section id="features" className="flex flex-col gap-10">
          <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
            <h2 className="font-display font-bold text-3xl text-white">
              Engineered local resilience
            </h2>
            <p className="text-zinc-500 text-sm">
              Addressing Bangladesh's primary ecommerce points with high
              technological resilience
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-zinc-100">
                  Anti-Phantom Stock Verification
                </h4>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  Real-time stock locks secure rare fragrance units while buyers
                  navigate checkout, resolving race conditions.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-zinc-100">
                  SSLCOMMERZ Idempotency Protection
                </h4>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  Multi-click protection, progressive status updates, and
                  automatic transaction resolution avoid double charges.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                <Watch className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-zinc-100">
                  Flexible Delivery Schedulers
                </h4>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  Supports instant Dhaka express delivery matching active local
                  slot availability, with automatic window-breach resolution.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-zinc-100">
                  Fail-Safe Payment Cascading
                </h4>
                <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                  If card verification or bank gateways timeout, Aurea
                  transparently offers seamless retries via bKash/Nagad or COD.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg tracking-widest text-zinc-400">
              AUREA
            </span>
            <span className="text-[10px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              © 2026 Docufy Tech
            </span>
          </div>

          <span className="text-xs text-zinc-500">
            Proprietary platform. No external redistributions allowed.
          </span>
        </div>
      </footer>
    </div>
  );
}

/**
 * High-fidelity auth status synchronizer managing silent token refreshes and background timers.
 */
function AuthLoader({ children }: { children: React.ReactNode }) {
  const refreshMutation = useRefreshMutation();

  useEffect(() => {
    // 1. Silent token refresh on initial launch
    refreshMutation.mutate();

    // 2. Set background verification timer (refreshes every 15 minutes)
    const interval = setInterval(
      () => {
        const isCurrentlyAuthed = useAuthStore.getState().isAuthenticated;
        if (isCurrentlyAuthed) {
          refreshMutation.mutate();
        }
      },
      15 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthLoader>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </BrowserRouter>
      </AuthLoader>
    </QueryClientProvider>
  );
}
