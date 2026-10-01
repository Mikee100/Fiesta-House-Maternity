import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, LockKeyhole, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        setTransitioning(true);
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
        await new Promise((resolve) => setTimeout(resolve, 700));
        navigate('/');
      } else {
        toast({
          title: 'Login failed',
          description: result.error || 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error?.message || 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setTransitioning(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4f7f5] p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,hsl(174_55%_72%_/_0.42),transparent_32%),radial-gradient(circle_at_92%_88%,hsl(29_90%_78%_/_0.46),transparent_30%),linear-gradient(135deg,#f8fbf8_0%,#edf5f2_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(174_24%_40%_/_0.07)_1px,transparent_1px),linear-gradient(90deg,hsl(174_24%_40%_/_0.07)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-64 w-64 rounded-full border-[24px] border-white/60" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-56 w-56 rounded-full border-[18px] border-orange-200/40" />

      <Card className="relative z-10 w-full max-w-md overflow-hidden border-white/80 bg-white/90 text-slate-900 shadow-2xl shadow-slate-400/25 backdrop-blur-xl animate-slideUp">
        <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-orange-300" />
        <CardHeader className="space-y-4 px-7 pb-5 pt-8 sm:px-9">
          <div className="flex items-center gap-3 text-teal-700">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 ring-1 ring-teal-200">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700/80">Fiesta House</p>
              <p className="text-sm text-slate-500">Admin workspace</p>
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">Sign in to manage bookings, conversations, and studio operations.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-7 pb-8 sm:px-9">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || transitioning}
                className="h-12 border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || transitioning}
                className="h-12 border-slate-200 bg-slate-50/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-teal-500/40"
              />
            </div>
            <Button
              type="submit"
              className="group h-12 w-full bg-teal-700 text-white shadow-lg shadow-teal-900/20 transition-all hover:bg-teal-800 hover:shadow-teal-700/20 active:scale-[0.99]"
              disabled={loading || transitioning}
            >
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Checking credentials</span>
              ) : (
                <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              )}
            </Button>
          </form>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> Secure administrator access
          </div>
        </CardContent>
      </Card>

      {transitioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 px-6 backdrop-blur-md" role="status" aria-live="polite">
          <div className="w-full max-w-xs space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-300/30">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-white">Opening your workspace</p>
              <p className="text-sm text-slate-400">Preparing your dashboard...</p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-cyan-300">
              <Check className="h-3.5 w-3.5" /> Identity verified
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
