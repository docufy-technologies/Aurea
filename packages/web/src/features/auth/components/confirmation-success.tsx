import { Sparkles, CheckCircle2, ShoppingBag } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';

export function ConfirmationSuccess() {
  return (
    <Card className="glass-gold border-amber-500/20 max-w-md w-full mx-auto shadow-2xl relative overflow-hidden animate-fade-in py-4">
      {/* Decorative top-right particles/glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <CardContent className="text-center flex flex-col items-center gap-6 pt-6">
        {/* Animated Gold Ring Success Icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-400/30 flex items-center justify-center text-amber-400 relative">
          <CheckCircle2 className="w-9 h-9 animate-pulse-subtle" />
          <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-bounce" />
        </div>

        <div className="flex flex-col gap-2">
          <CardTitle className="font-display font-extrabold text-2xl bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
            Account Verified!
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm max-w-xs mx-auto">
            Your Aurea customer account has been successfully verified and activated.
          </CardDescription>
        </div>

        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent my-1" />

        <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
          You are now ready to check out faster, save secure addresses, track your luxury deliveries, and access exclusive signature fragrance restocks.
        </p>

        {/* Action Button */}
        <div className="flex flex-col gap-3 w-full mt-2">
          <a href="/#" className="w-full">
            <Button className="w-full h-11 flex items-center justify-center gap-2 font-display text-sm tracking-wide font-bold">
              <ShoppingBag className="w-4 h-4 text-zinc-950" />
              <span>START SHOPPING</span>
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
