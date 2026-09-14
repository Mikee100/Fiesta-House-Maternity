import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  PauseCircle,
  RefreshCw,
  Plus,
  FileText,
  Loader2,
  Wifi,
  WifiOff,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  getWhatsAppAccountInfo,
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  WhatsAppAccountInfo,
  WhatsAppTemplate,
  TemplateStatus,
  CreateTemplatePayload,
} from '@/api/whatsapp';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TemplateStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType; className: string }
> = {
  APPROVED: {
    label: 'Approved',
    variant: 'default',
    icon: CheckCircle2,
    className: 'bg-emerald-500/15 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400',
  },
  PENDING: {
    label: 'Pending',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-amber-500/15 text-amber-600 border-amber-200 dark:border-amber-800 dark:text-amber-400',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
    className: 'bg-red-500/15 text-red-600 border-red-200 dark:border-red-800 dark:text-red-400',
  },
  DISABLED: {
    label: 'Disabled',
    variant: 'outline',
    icon: PauseCircle,
    className: 'bg-gray-500/15 text-gray-500 border-gray-200 dark:border-gray-700',
  },
  PAUSED: {
    label: 'Paused',
    variant: 'outline',
    icon: PauseCircle,
    className: 'bg-gray-500/15 text-gray-500 border-gray-200 dark:border-gray-700',
  },
  IN_APPEAL: {
    label: 'In Appeal',
    variant: 'secondary',
    icon: AlertTriangle,
    className: 'bg-blue-500/15 text-blue-600 border-blue-200 dark:border-blue-800 dark:text-blue-400',
  },
};

function TemplateBadge({ status }: { status: TemplateStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['PENDING'];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-0.5', cfg.className)}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: WhatsAppTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const bodyComponent = template.components.find((c) => c.type === 'BODY');
  const headerComponent = template.components.find((c) => c.type === 'HEADER');

  const formattedDate = template.created_time
    ? new Date(template.created_time).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <Card className="border border-border/60 hover:border-border transition-colors bg-card shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-sm text-foreground truncate">
                {template.name}
              </span>
              <TemplateBadge status={template.status} />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {template.category}
              </span>
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {template.language.toUpperCase()}
              </span>
              {formattedDate && (
                <span className="text-xs text-muted-foreground">{formattedDate}</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-3">
          {headerComponent?.text && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Header</p>
              <p className="text-sm text-foreground bg-muted/40 rounded-lg p-2">{headerComponent.text}</p>
            </div>
          )}
          {bodyComponent?.text && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Body</p>
              <p className="text-sm text-foreground bg-muted/40 rounded-lg p-2 whitespace-pre-wrap">
                {bodyComponent.text}
              </p>
            </div>
          )}
          {template.rejected_reason && (
            <Alert variant="destructive" className="py-2">
              <AlertTitle className="text-xs font-semibold">Rejection Reason</AlertTitle>
              <AlertDescription className="text-xs">{template.rejected_reason}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}

      {/* Always-visible body preview when not expanded */}
      {!expanded && bodyComponent?.text && (
        <CardContent className="pt-0 pb-3 px-4">
          <p className="text-xs text-muted-foreground line-clamp-2">{bodyComponent.text}</p>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Account Info Card ────────────────────────────────────────────────────────

function AccountInfoCard({
  info,
  loading,
  onRefresh,
}: {
  info: WhatsAppAccountInfo | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Card className="border-2 border-[#25d366]/30 bg-gradient-to-br from-[#25d366]/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#25d366] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-base">WhatsApp Business Account</CardTitle>
              <CardDescription className="text-xs">Connected via Meta Graph API</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Verify
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        ) : info ? (
          <div className="space-y-2">
            {info.connected ? (
              <>
                <div className="flex items-center gap-2">
                  <Wifi className="h-3.5 w-3.5 text-[#25d366]" />
                  <span className="text-sm font-medium text-[#25d366]">Connected</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                  {info.name && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Account Name</p>
                      <p className="text-sm font-medium text-foreground">{info.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">WABA ID</p>
                    <p className="text-sm font-mono text-foreground">{info.wabaId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Phone Number ID</p>
                    <p className="text-sm font-mono text-foreground">{info.phoneNumberId}</p>
                  </div>
                  {info.currency && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Currency</p>
                      <p className="text-sm text-foreground">{info.currency}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <WifiOff className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Not Connected</p>
                  {info.error && (
                    <p className="text-xs text-muted-foreground mt-0.5">{info.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Create Template Form ─────────────────────────────────────────────────────

const TEMPLATE_NAME_REGEX = /^[a-z0-9_]+$/;
const LANGUAGES = [
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt_BR', label: 'Portuguese (Brazil)' },
  { value: 'ar', label: 'Arabic' },
  { value: 'sw', label: 'Swahili' },
];

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

function CreateTemplateDialog({ open, onOpenChange, onCreated }: CreateTemplateDialogProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateTemplatePayload>({
    name: '',
    category: 'UTILITY',
    language: 'en_US',
    body: '',
    examples: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateTemplatePayload, string>>>({});

  const reset = () => {
    setForm({ name: '', category: 'UTILITY', language: 'en_US', body: '', examples: [] });
    setErrors({});
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.name) {
      errs.name = 'Template name is required.';
    } else if (!TEMPLATE_NAME_REGEX.test(form.name)) {
      errs.name = 'Only lowercase letters, numbers, and underscores allowed (e.g. order_confirmation).';
    }
    if (!form.body.trim()) {
      errs.body = 'Message body is required.';
    }
    const variableNumbers = [...form.body.matchAll(/{{(\d+)}}/g)].map((match) => Number(match[1]));
    const variableCount = variableNumbers.length ? Math.max(...variableNumbers) : 0;
    if (variableCount > 0 && form.examples.length !== variableCount) {
      errs.examples = `Add one example value for each variable ({{1}} through {{${variableCount}}}).`;
    }
    if (form.examples.some((example) => !example.trim())) {
      errs.examples = 'Every variable must have an example value.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const variableCount = form.body.match(/{{(\d+)}}/g)?.reduce((max, match) => Math.max(max, Number(match.slice(2, -2))), 0) || 0;

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await createWhatsAppTemplate(form);
      toast({
        title: '✅ Template submitted to Meta',
        description: `"${form.name}" has been submitted. Status: ${res.data.template?.status ?? 'PENDING'}. It may take a few minutes for Meta to review it.`,
      });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        'Failed to create template. Please try again.';
      toast({
        title: 'Template creation failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#25d366]" />
            Create Message Template
          </DialogTitle>
          <DialogDescription>
            Templates are pre-approved message formats used to initiate conversations with customers.
            They must be reviewed and approved by Meta before use.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 py-1 pr-1">
          {/* Template Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-name" className="text-sm font-medium">
              Template Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="tpl-name"
              placeholder="e.g. order_confirmation"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toLowerCase() }))}
              className={cn(errors.name && 'border-destructive')}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Lowercase letters, numbers, and underscores only. Cannot be changed after creation.
              </p>
            )}
          </div>

          {variableCount > 0 && (
            <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
              <div>
                <Label className="text-sm font-medium">Variable Examples</Label>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Meta requires an example value for every variable so it can review the template.
                </p>
              </div>
              {Array.from({ length: variableCount }, (_, index) => (
                <div key={index} className="space-y-1">
                  <Label htmlFor={`tpl-example-${index + 1}`} className="text-xs text-muted-foreground">
                    {'{{'}{index + 1}{'}}'} example
                  </Label>
                  <Input
                    id={`tpl-example-${index + 1}`}
                    placeholder={index === 0 ? 'Michael' : 'FH-10001'}
                    value={form.examples[index] || ''}
                    onChange={(event) => setForm((current) => {
                      const examples = [...current.examples];
                      examples[index] = event.target.value;
                      return { ...current, examples };
                    })}
                    className={cn(errors.examples && 'border-destructive')}
                  />
                </div>
              ))}
              {errors.examples && <p className="text-xs text-destructive">{errors.examples}</p>}
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-category" className="text-sm font-medium">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v as CreateTemplatePayload['category'] }))}
            >
              <SelectTrigger id="tpl-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTILITY">
                  <div>
                    <span className="font-medium">UTILITY</span>
                    <span className="ml-2 text-xs text-muted-foreground">— Order updates, alerts, account info</span>
                  </div>
                </SelectItem>
                <SelectItem value="MARKETING">
                  <div>
                    <span className="font-medium">MARKETING</span>
                    <span className="ml-2 text-xs text-muted-foreground">— Promotions, offers, newsletters</span>
                  </div>
                </SelectItem>
                <SelectItem value="AUTHENTICATION">
                  <div>
                    <span className="font-medium">AUTHENTICATION</span>
                    <span className="ml-2 text-xs text-muted-foreground">— OTP codes, verification</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-language" className="text-sm font-medium">
              Language <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.language}
              onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
            >
              <SelectTrigger id="tpl-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label htmlFor="tpl-body" className="text-sm font-medium">
              Message Body <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="tpl-body"
              placeholder="Hi {{1}}, your order {{2}} has been confirmed."
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              className={cn('resize-none', errors.body && 'border-destructive')}
            />
            {errors.body ? (
              <p className="text-xs text-destructive">{errors.body}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Use <code className="bg-muted px-1 rounded text-[10px]">{'{{1}}'}</code>,{' '}
                <code className="bg-muted px-1 rounded text-[10px]">{'{{2}}'}</code>, etc. for dynamic variables.
              </p>
            )}
          </div>

          {/* Info */}
          <Alert className="py-2.5 bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
              After submission, Meta will review the template. This usually takes a few minutes to 24 hours.
              The template will appear here with a <strong>PENDING</strong> status until approved.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t pt-4 sm:space-x-2">
          <Button className="flex-1 sm:flex-none" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            id="submit-template-btn"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#25d366] hover:bg-[#1ebc59] text-white gap-2 sm:flex-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting to Meta…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsAppTemplates() {
  const { toast } = useToast();
  const [accountInfo, setAccountInfo] = useState<WhatsAppAccountInfo | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  // ── Fetch account info ──────────────────────────────────────────────────────
  const fetchAccountInfo = useCallback(async () => {
    setAccountLoading(true);
    try {
      const res = await getWhatsAppAccountInfo();
      setAccountInfo(res.data);
    } catch (error: any) {
      setAccountInfo({
        connected: false,
        wabaId: '',
        phoneNumberId: '',
        error: error.response?.data?.error || 'Could not reach backend.',
      });
    } finally {
      setAccountLoading(false);
    }
  }, []);

  // ── Fetch templates ─────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await getWhatsAppTemplates();
      setTemplates(res.data.templates ?? []);
    } catch (error: any) {
      const msg =
        error.response?.data?.error ||
        'Failed to load templates. Make sure your WhatsApp Business Account is connected.';
      setTemplatesError(msg);
      toast({ title: 'Could not load templates', description: msg, variant: 'destructive' });
    } finally {
      setTemplatesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAccountInfo();
    fetchTemplates();
  }, [fetchAccountInfo, fetchTemplates]);

  // ── Group templates by status for summary ───────────────────────────────────
  const approved = templates.filter((t) => t.status === 'APPROVED').length;
  const pending = templates.filter((t) => t.status === 'PENDING').length;
  const rejected = templates.filter((t) => t.status === 'REJECTED').length;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#25d366]" />
            Message Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Create and manage WhatsApp message templates connected to your WhatsApp Business Account.
            Templates must be approved by Meta before they can be used to send messages.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchAccountInfo(); fetchTemplates(); }}
            disabled={accountLoading || templatesLoading}
            className="gap-1.5"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', (accountLoading || templatesLoading) && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            id="create-template-btn"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-[#25d366] hover:bg-[#1ebc59] text-white gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* ── Account Status ───────────────────────────────────────────────── */}
      <AccountInfoCard
        info={accountInfo}
        loading={accountLoading}
        onRefresh={fetchAccountInfo}
      />

      {/* ── Summary Stats ────────────────────────────────────────────────── */}
      {!templatesLoading && templates.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Approved', count: approved, className: 'text-emerald-600' },
            { label: 'Pending', count: pending, className: 'text-amber-600' },
            { label: 'Rejected', count: rejected, className: 'text-red-500' },
          ].map(({ label, count, className }) => (
            <Card key={label} className="border border-border/60 bg-card shadow-sm text-center py-3">
              <p className={cn('text-2xl font-bold', className)}>{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* ── Templates Section ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Your Templates
            {!templatesLoading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({templates.length})
              </span>
            )}
          </h2>
        </div>

        {/* Loading */}
        {templatesLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-border/60 p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-56" />
                  <Skeleton className="h-3 w-72" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error */}
        {!templatesLoading && templatesError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to load templates</AlertTitle>
            <AlertDescription className="mt-1">
              {templatesError}
              <Button
                variant="link"
                size="sm"
                onClick={fetchTemplates}
                className="p-0 ml-2 h-auto text-destructive underline"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Empty state */}
        {!templatesLoading && !templatesError && templates.length === 0 && (
          <Card className="border-dashed border-2 border-border/60 bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No templates yet</h3>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                You don't have any WhatsApp message templates. Create your first template to start sending
                proactive messages to customers.
              </p>
              <Button
                size="sm"
                onClick={() => setCreateOpen(true)}
                className="bg-[#25d366] hover:bg-[#1ebc59] text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Create your first template
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Template list */}
        {!templatesLoading && !templatesError && templates.length > 0 && (
          <div className="space-y-2.5">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>

      {/* ── Create Template Dialog ────────────────────────────────────────── */}
      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={fetchTemplates}
      />
    </div>
  );
}
