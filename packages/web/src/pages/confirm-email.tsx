import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useConfirmEmailMutation } from '../features/auth/hooks/use-register';
import { ConfirmationSuccess } from '../features/auth/components/confirmation-success';
import { Card, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, ShieldX, Sparkles, ArrowLeft, MailWarning } from 'lucide-react';

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const confirmMutation = useConfirmEmailMutation();
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [showResendInput, setShowResendInput] = useState(false);

  useEffect(() => {
    if (token) {
      confirmMutation.mutate(token);
    }
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResendStatus('loading');
    try {
      const response = await fetch('/api/v1/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: resendEmail })
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error?.message || 'Failed to resend confirmation email.');
      }

      setResendStatus('success');
      setResendMessage(resJson.data?.message || 'Verification link resent successfully!');
    } catch (err: any) {
      setResendStatus('error');
      setResendMessage(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative selection:bg-amber-500/30 overflow-x-hidden">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[300px] bg-gradient-to-b from-amber-500/5 via-amber-500/0 to-transparent rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="px-6 py-6 border-b border-zinc-900/60 bg-zinc-950/20 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="font-display font-bold text-xl tracking-widest bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              AUREA
            </span>
          </Link>
          
          <Link to="/" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-medium transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO LANDING</span>
          </Link>
        </div>
      </header>

      {/* Content Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-16">
        <div className="max-w-md w-full">
          {!token ? (
            /* Missing Token Error */
            <Card className="glass border-zinc-900 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden animate-fade-in py-4 text-center">
              <CardContent className="flex flex-col items-center gap-6 pt-6">
                <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-900/40 flex items-center justify-center text-red-400">
                  <ShieldX className="w-9 h-9" />
                </div>
                <div className="flex flex-col gap-2">
                  <CardTitle className="font-display font-bold text-xl text-red-400">
                    Missing Security Token
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-sm max-w-xs mx-auto">
                    No account verification token was found in your request URL.
                  </CardDescription>
                </div>
                <Link to="/register" className="w-full">
                  <Button variant="outline" className="w-full">
                    Return to Register
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : confirmMutation.isPending ? (
            /* Verification Loading State */
            <Card className="glass border-zinc-900 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden animate-fade-in py-4 text-center">
              <CardContent className="flex flex-col items-center gap-6 pt-8">
                <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
                <div className="flex flex-col gap-2">
                  <CardTitle className="font-display font-bold text-xl text-white">
                    Verifying Credentials
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-sm">
                    Connecting to security nodes to confirm verification signatures...
                  </CardDescription>
                </div>
              </CardContent>
            </Card>
          ) : confirmMutation.isSuccess ? (
            /* Verification Success */
            <ConfirmationSuccess />
          ) : (
            /* Verification Fail / Token Expired */
            <Card className="glass border-zinc-900 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden animate-fade-in py-4">
              <CardContent className="flex flex-col items-center gap-6 pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-900/40 flex items-center justify-center text-red-400">
                  <ShieldX className="w-9 h-9" />
                </div>
                
                <div className="flex flex-col gap-2">
                  <CardTitle className="font-display font-bold text-xl text-red-400">
                    Verification Failed
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-sm max-w-xs mx-auto">
                    {confirmMutation.error?.message || 'Verification token is invalid or has expired.'}
                  </CardDescription>
                </div>

                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-1" />

                {/* Conditional Resend Form */}
                {!showResendInput ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => setShowResendInput(true)}
                  >
                    Resend Verification Email
                  </Button>
                ) : (
                  <form onSubmit={handleResend} className="w-full space-y-3 pt-2">
                    <div className="text-left space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider pl-1">
                        EMAIL FOR RESEND
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="name@example.com"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="w-full h-10 px-4 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/10 focus:outline-none text-sm"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-10 flex items-center justify-center gap-2"
                      disabled={resendStatus === 'loading'}
                    >
                      {resendStatus === 'loading' ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                          <span>Requesting Resend...</span>
                        </>
                      ) : (
                        <span>REQUEST NEW LINK</span>
                      )}
                    </Button>

                    {/* Resend success/error feedback alerts */}
                    {resendStatus === 'success' && (
                      <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-400 font-semibold flex items-center gap-2">
                        <MailWarning className="w-4 h-4 flex-shrink-0" />
                        <span>{resendMessage}</span>
                      </div>
                    )}
                    {resendStatus === 'error' && (
                      <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/40 text-[11px] text-red-400 font-semibold text-left">
                        {resendMessage}
                      </div>
                    )}
                  </form>
                )}

                <Link to="/register" className="text-xs text-amber-500 font-semibold hover:underline">
                  Back to Registration
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-905 bg-zinc-950/40 text-center">
        <span className="text-[10px] text-zinc-600 tracking-wider">
          © 2026 DOCUFY TECH. ALL RIGHTS RESERVED.
        </span>
      </footer>
    </div>
  );
}
