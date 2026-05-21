import { useState } from 'react';
import { useRegisterMutation } from '../hooks/use-register';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Check, X, Loader2, Lock, Mail, User, Phone, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function RegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('+8801');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const registerMutation = useRegisterMutation();

  // Password criteria states
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  // Track mobile input, enforce standard prefix
  const handleMobileChange = (val: string) => {
    if (!val.startsWith('+8801')) {
      // Force preserve country code prefix
      setMobile('+8801');
      return;
    }
    // Limit to 14 characters total (+8801312345678)
    if (val.length <= 14) {
      setMobile(val);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    const bdMobileRegex = /^\+8801[3-9]\d{8}$/;
    if (!bdMobileRegex.test(mobile)) {
      errors.mobile = 'Mobile number must match Bangladesh format (+8801XXXXXXXXX).';
    }

    if (!isPasswordValid) {
      errors.password = 'Password does not meet all criteria.';
    }

    if (!termsAccepted) {
      errors.terms = 'You must accept the terms & conditions.';
    }

    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    registerMutation.mutate({
      fullName,
      email,
      mobile,
      password
    });
  };

  // Extract API validation errors mapping
  const apiErrors = registerMutation.error;
  const displayErrors = {
    ...localErrors,
    ...(apiErrors?.code === 'VALIDATION_ERROR' && Array.isArray(apiErrors.details)
      ? (apiErrors.details as any[]).reduce((acc, curr) => {
          acc[curr.field] = curr.message;
          return acc;
        }, {} as Record<string, string>)
      : {})
  };

  if (registerMutation.isSuccess) {
    return (
      <Card className="glass-gold border-amber-500/20 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden animate-fade-in">
        {/* Glow */}
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
        <CardContent className="pt-8 text-center flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <CheckCircle2 className="w-10 h-10 animate-pulse-subtle" />
          </div>
          <div className="flex flex-col gap-2">
            <CardTitle className="font-display font-bold text-2xl text-white">
              Verify Your Account
            </CardTitle>
            <CardDescription className="text-zinc-400 text-sm max-w-sm">
              We've created your unverified account. A confirmation link has been sent to:
            </CardDescription>
            <span className="text-amber-400 font-semibold text-base select-all bg-zinc-900/50 border border-zinc-800/80 px-3 py-1.5 rounded-lg w-fit mx-auto mt-2">
              {email}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/50 text-xs text-zinc-400 text-left leading-relaxed w-full">
            <span className="font-bold text-amber-500/80 block mb-1">Local Testing Note:</span>
            As email sending is simulated in local development, please inspect your **Server Terminal Logs** or the local log file **`scratch/verification-emails.log`** to copy the verification link.
          </div>

          <Button 
            className="w-full mt-2" 
            variant="outline"
            onClick={() => registerMutation.reset()}
          >
            Back to Register
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-zinc-900 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden animate-fade-in">
      {/* Subtle top amber highlight glow */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
      
      <CardHeader className="space-y-1 pb-6 text-center">
        <CardTitle className="font-display font-extrabold text-3xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
          Create Account
        </CardTitle>
        <CardDescription className="text-zinc-400 text-xs">
          Sign up to unlock the full luxury shopping experience
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* General API error alerts */}
          {apiErrors && apiErrors.code !== 'VALIDATION_ERROR' && (
            <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-900/40 text-xs text-red-400 font-medium animate-shake">
              {apiErrors.message}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 block tracking-wide">FULL NAME</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="E.g., Ishraq Kabir"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={cn(
                  "pl-10 pr-4 h-11 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-700 focus:border-amber-500 focus:ring-amber-500/10",
                  displayErrors.fullName && "border-red-950 focus:border-red-900 focus:ring-red-950/20"
                )}
                disabled={registerMutation.isPending}
              />
            </div>
            {displayErrors.fullName && (
              <span className="text-[10px] text-red-400 font-medium block mt-0.5 pl-1">
                {displayErrors.fullName}
              </span>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 block tracking-wide">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "pl-10 pr-4 h-11 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-700 focus:border-amber-500 focus:ring-amber-500/10",
                  displayErrors.email && "border-red-950 focus:border-red-900 focus:ring-red-950/20"
                )}
                disabled={registerMutation.isPending}
              />
            </div>
            {displayErrors.email && (
              <span className="text-[10px] text-red-400 font-medium block mt-0.5 pl-1">
                {displayErrors.email}
              </span>
            )}
          </div>

          {/* Mobile Number */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-400 block tracking-wide">BANGLADESH MOBILE</label>
              <span className="text-[9px] text-zinc-500 tracking-wider">FORMAT: +8801XXXXXXXXX</span>
            </div>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="tel"
                placeholder="+8801712345678"
                value={mobile}
                onChange={(e) => handleMobileChange(e.target.value)}
                className={cn(
                  "pl-10 pr-4 h-11 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-700 focus:border-amber-500 focus:ring-amber-500/10 font-mono tracking-wider",
                  displayErrors.mobile && "border-red-950 focus:border-red-900 focus:ring-red-950/20"
                )}
                disabled={registerMutation.isPending}
              />
            </div>
            {displayErrors.mobile && (
              <span className="text-[10px] text-red-400 font-medium block mt-0.5 pl-1">
                {displayErrors.mobile}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 block tracking-wide">PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "pl-10 pr-4 h-11 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-700 focus:border-amber-500 focus:ring-amber-500/10",
                  displayErrors.password && "border-red-950 focus:border-red-900 focus:ring-red-950/20"
                )}
                disabled={registerMutation.isPending}
              />
            </div>
            {displayErrors.password && (
              <span className="text-[10px] text-red-400 font-medium block mt-0.5 pl-1">
                {displayErrors.password}
              </span>
            )}

            {/* Interactive Password Criteria Tracker */}
            <div className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-900/60 mt-2 space-y-1.5">
              <span className="text-[9px] font-bold text-zinc-500 block uppercase tracking-wider">
                PASSWORD REQUIREMENTS
              </span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-medium">
                {/* 8+ chars */}
                <div className="flex items-center gap-1.5">
                  {hasMinLength ? (
                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <X className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                  )}
                  <span className={hasMinLength ? "text-emerald-400/80" : "text-zinc-500"}>
                    8+ characters
                  </span>
                </div>

                {/* Uppercase */}
                <div className="flex items-center gap-1.5">
                  {hasUppercase ? (
                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <X className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                  )}
                  <span className={hasUppercase ? "text-emerald-400/80" : "text-zinc-500"}>
                    1+ Uppercase (A-Z)
                  </span>
                </div>

                {/* Lowercase */}
                <div className="flex items-center gap-1.5">
                  {hasLowercase ? (
                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <X className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                  )}
                  <span className={hasLowercase ? "text-emerald-400/80" : "text-zinc-500"}>
                    1+ Lowercase (a-z)
                  </span>
                </div>

                {/* Number */}
                <div className="flex items-center gap-1.5">
                  {hasNumber ? (
                    <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <X className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                  )}
                  <span className={hasNumber ? "text-emerald-400/80" : "text-zinc-500"}>
                    1+ Number (0-9)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms & Conditions Acceptance */}
          <div className="space-y-1 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 rounded bg-zinc-900 border-zinc-800 text-amber-500 focus:ring-amber-500/10 focus:ring-offset-zinc-950 w-3.5 h-3.5 flex-shrink-0 accent-amber-500"
                disabled={registerMutation.isPending}
              />
              <span className="text-xs text-zinc-400 leading-normal hover:text-zinc-300">
                I accept the Aurea <a href="#" className="text-amber-500 hover:underline">Terms & Conditions</a> and <a href="#" className="text-amber-500 hover:underline">Privacy Policy</a>
              </span>
            </label>
            {displayErrors.terms && (
              <span className="text-[10px] text-red-400 font-medium block mt-0.5 pl-6">
                {displayErrors.terms}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-11 mt-4 shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 font-display text-sm tracking-wide font-bold"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                <span>Registering Account...</span>
              </>
            ) : (
              <span>REGISTER ACCOUNT</span>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
