import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  AlertCircle,
  CheckCircle2,
  Instagram,
  Loader2,
  Link2Off,
  RefreshCw,
} from 'lucide-react';
import {
  disconnectInstagram,
  getInstagramConnectionStatus,
  InstagramConnectionStatus,
  startInstagramConnect,
} from '@/api/instagramIntegration';
import { useToast } from '@/hooks/use-toast';

function formatConnectedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function InstagramIntegration() {
  const [status, setStatus] = useState<InstagramConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInstagramConnectionStatus();
      setStatus(data);
    } catch {
      setStatus({
        connected: false,
        configured: false,
        error: 'Unable to reach the server. Check that the backend is running.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const result = searchParams.get('instagram');
    if (!result) return;

    const message =
      searchParams.get('message') ||
      (result === 'connected'
        ? 'Instagram professional account connected successfully.'
        : result === 'cancelled'
          ? 'Instagram authorization was cancelled.'
          : 'Instagram connection failed.');

    if (result === 'connected') {
      setBanner({ type: 'success', message });
      toast({ title: 'Instagram connected', description: message });
    } else if (result === 'cancelled') {
      setBanner({ type: 'info', message });
    } else {
      setBanner({ type: 'error', message });
    }

    const next = new URLSearchParams(searchParams);
    next.delete('instagram');
    next.delete('message');
    next.delete('username');
    setSearchParams(next, { replace: true });
    void loadStatus();
  }, [searchParams, setSearchParams, loadStatus, toast]);

  const handleConnect = async () => {
    setConnecting(true);
    setBanner(null);
    try {
      const { authorizationUrl } = await startInstagramConnect();
      if (!authorizationUrl) {
        throw new Error('No authorization URL returned');
      }
      window.location.href = authorizationUrl;
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        'Unable to start Instagram connection. Please try again.';
      setBanner({ type: 'error', message });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setBanner(null);
    try {
      await disconnectInstagram();
      setStatus({ connected: false, configured: status?.configured ?? false });
      setBanner({ type: 'info', message: 'Instagram has been disconnected.' });
      toast({ title: 'Disconnected', description: 'Instagram account disconnected.' });
    } catch (error: any) {
      const message =
        error?.response?.data?.error || 'Unable to disconnect Instagram. Please try again.';
      setBanner({ type: 'error', message });
    } finally {
      setDisconnecting(false);
    }
  };

  const connected = status?.connected === true;

  return (
    <div className="animate-fadeIn max-w-3xl">
      <PageHeader
        title="Instagram"
        description="Connect your Instagram professional account to let Fiesta AI respond to customer messages."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadStatus()}
            disabled={loading || connecting || disconnecting}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {banner && (
        <Alert
          className={
            banner.type === 'success'
              ? 'mb-4 border-success/40 bg-success/5'
              : banner.type === 'error'
                ? 'mb-4 border-destructive/40 bg-destructive/5'
                : 'mb-4'
          }
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : banner.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className="text-sm">{banner.message}</AlertDescription>
        </Alert>
      )}

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] flex items-center justify-center shadow-sm">
                <Instagram className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-base">Instagram</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {connected
                    ? 'Your Instagram professional account is linked to Fiesta AI.'
                    : 'Connect your Instagram professional account to Fiesta AI.'}
                </CardDescription>
              </div>
            </div>
            {loading ? (
              <Skeleton className="h-6 w-24 rounded-full" />
            ) : (
              <Badge variant={connected ? 'default' : 'secondary'} className="shrink-0">
                {connected ? 'Connected' : 'Not connected'}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-9 w-40" />
            </div>
          ) : connected ? (
            <>
              <div className="flex items-center gap-2 text-sm text-success font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Connected
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/30 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Instagram Professional Account
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Username
                    </p>
                    <p className="text-sm font-medium font-mono">@{status.username}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Account ID
                    </p>
                    <p className="text-sm font-mono break-all">{status.instagramAccountId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Status
                    </p>
                    <p className="text-sm font-medium text-success">Connected</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                      Connected on
                    </p>
                    <p className="text-sm">{formatConnectedAt(status.connectedAt)}</p>
                  </div>
                  {status.accountType && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
                        Account type
                      </p>
                      <p className="text-sm">{status.accountType}</p>
                    </div>
                  )}
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disconnecting}
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    {disconnecting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Link2Off className="h-3.5 w-3.5" />
                    )}
                    Disconnect Instagram
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Instagram?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Fiesta AI will stop using this Instagram professional account for customer
                      messages until you connect again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleDisconnect()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Once connected, Fiesta AI can receive and respond to customer conversations through
                Instagram.
              </p>

              {(status?.message || status?.error) && (
                <Alert className="border-warning/40 bg-warning/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {status.message || status.error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => void handleConnect()}
                disabled={connecting || status?.configured === false}
                className="gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <Instagram className="h-4 w-4" />
                    Connect Instagram
                  </>
                )}
              </Button>

              {status?.configured === false && (
                <p className="text-xs text-muted-foreground">
                  Server OAuth credentials are not configured yet. An administrator must set{' '}
                  <code className="text-[11px]">INSTAGRAM_APP_ID</code> and{' '}
                  <code className="text-[11px]">INSTAGRAM_APP_SECRET</code> before connecting.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
