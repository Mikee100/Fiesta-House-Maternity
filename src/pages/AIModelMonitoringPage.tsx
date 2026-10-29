import React, { useEffect, useState } from 'react';
import {
  fetchModelUsage,
  fetchCustomerDailyTokenUsage,
  type ModelUsage,
  type CustomerDailyTokenUsageResponse,
} from '@/api/analytics';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ProviderKey = 'groq' | 'groq2' | 'gemini' | 'gemini2';

type GroqQuotaWindow = {
  limit: number | null;
  remaining: number | null;
  reset: string | null;
};

type GroqRateLimitSnapshot = {
  provider: 'groq' | 'groq2';
  model: string;
  observedAt: string;
  requestsPerDay: GroqQuotaWindow;
  tokensPerMinute: GroqQuotaWindow;
};

type ModelUsageWithQuota = ModelUsage & {
  groqRateLimits?: GroqRateLimitSnapshot[];
};

const PROVIDERS: {
  key: ProviderKey;
  label: string;
  modelRole: string;
  color: string;
}[] = [
  { key: 'groq', label: 'Groq', modelRole: 'Primary', color: '#0f766e' },
  { key: 'groq2', label: 'Groq', modelRole: 'Backup', color: '#6478b8' },
  { key: 'gemini', label: 'Gemini', modelRole: 'Backup', color: '#c47b45' },
  {
    key: 'gemini2',
    label: 'Gemini',
    modelRole: 'Final fallback',
    color: '#8b78ae',
  },
];

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-KE').format(value || 0);

const getUsageErrorMessage = (error: unknown): string => {
  const response = (
    error as {
      response?: { status?: number; data?: { error?: unknown } };
    }
  )?.response;

  if (response?.status === 401) {
    return 'Your session is missing or expired. Sign in again to view model usage.';
  }

  if (response?.status === 403) {
    return 'Administrator access is required to view model usage.';
  }

  if (response) {
    const detail =
      typeof response.data?.error === 'string'
        ? `: ${response.data.error}`
        : '';

    return `Usage request failed (HTTP ${response.status ?? 'unknown'})${detail}`;
  }

  return 'Could not reach the backend. Check that it is running and reachable.';
};

const providerLabel = (provider: string) => {
  const match = PROVIDERS.find((item) => item.key === provider);
  return match ? `${match.label} · ${match.modelRole}` : provider;
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const quotaPercentage = (
  limit: number | null | undefined,
  remaining: number | null | undefined,
): number | null => {
  if (
    limit == null ||
    remaining == null ||
    limit <= 0
  ) {
    return null;
  }

  return Math.min(
    100,
    Math.max(0, ((limit - remaining) / limit) * 100),
  );
};

const AIModelMonitoringPage = () => {
  // Overall provider monitoring
  const [usageDays, setUsageDays] = useState<7 | 30>(7);
  const [modelUsage, setModelUsage] = useState<ModelUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  // Daily customer usage
  const [selectedUsageDate, setSelectedUsageDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [dailyCustomerData, setDailyCustomerData] =
    useState<CustomerDailyTokenUsageResponse | null>(null);
  const [dailyCustomerLoading, setDailyCustomerLoading] = useState(true);
  const [dailyCustomerError, setDailyCustomerError] =
    useState<string | null>(null);

  // Safely normalize arrays from API responses.
  const dailyCustomers = Array.isArray(dailyCustomerData?.customers)
    ? dailyCustomerData.customers
    : [];

  const dailyRows = Array.isArray(modelUsage?.daily)
    ? modelUsage.daily
    : [];

  const recentRows = Array.isArray(modelUsage?.recent)
    ? modelUsage.recent
    : [];

  const customerRows = Array.isArray(modelUsage?.customerUsage)
    ? modelUsage.customerUsage
    : [];

  // Load overall provider usage.
  useEffect(() => {
    let active = true;

    const loadUsage = async (showLoading: boolean) => {
      if (showLoading) {
        setUsageLoading(true);
      }

      try {
        const data = await fetchModelUsage(usageDays);

        if (active) {
          setModelUsage(data);
          setUsageError(null);
          setLastUpdated(new Date());
        }
      } catch (error) {
        if (active) {
          setUsageError(getUsageErrorMessage(error));
        }
      } finally {
        if (active) {
          setUsageLoading(false);
        }
      }
    };

    void loadUsage(true);

    const interval = window.setInterval(() => {
      void loadUsage(false);
    }, 60_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [usageDays, refreshVersion]);

  // Load customer usage for the selected date.
  useEffect(() => {
    let active = true;

    const loadDailyCustomerUsage = async () => {
      setDailyCustomerLoading(true);
      setDailyCustomerError(null);
      setDailyCustomerData(null);

      if (!selectedUsageDate) {
        setDailyCustomerError('Please select a valid date.');
        setDailyCustomerLoading(false);
        return;
      }

      try {
        const data = await fetchCustomerDailyTokenUsage(
          selectedUsageDate,
        );

        if (!active) return;

        // Validate the response before the component tries to render it.
        if (
          !data ||
          !Array.isArray(data.customers) ||
          typeof data.totalTokens !== 'number' ||
          typeof data.customerCount !== 'number'
        ) {
          setDailyCustomerError(
            'The daily usage API returned an unexpected response. Check the backend endpoint.',
          );
          return;
        }

        setDailyCustomerData(data);
      } catch (error) {
        if (active) {
          const status = (
            error as {
              response?: { status?: number };
            }
          )?.response?.status;

          if (status === 404) {
            setDailyCustomerError(
              'The daily customer usage endpoint was not found. Check the backend route.',
            );
          } else {
            setDailyCustomerError(
              getUsageErrorMessage(error),
            );
          }
        }
      } finally {
        if (active) {
          setDailyCustomerLoading(false);
        }
      }
    };

    void loadDailyCustomerUsage();

    return () => {
      active = false;
    };
  }, [selectedUsageDate]);

  // Derived overall metrics.
  const summary = modelUsage?.summary;

  const groqRateLimitsRaw = (
    modelUsage as ModelUsageWithQuota | null
  )?.groqRateLimits;

  const groqRateLimits = Array.isArray(groqRateLimitsRaw)
    ? groqRateLimitsRaw
    : [];

  const totalTokens = summary
    ? PROVIDERS.reduce(
        (sum, provider) =>
          sum + (summary[provider.key]?.totalTokens || 0),
        0,
      )
    : 0;

  const totalCalls = summary
    ? PROVIDERS.reduce(
        (sum, provider) =>
          sum + (summary[provider.key]?.calls || 0),
        0,
      )
    : 0;

  const totalFailures = summary
    ? PROVIDERS.reduce(
        (sum, provider) =>
          sum + (summary[provider.key]?.failures || 0),
        0,
      )
    : 0;

  const failureRate =
    totalCalls > 0 ? (totalFailures / totalCalls) * 100 : 0;

  const todayUtc = new Date().toISOString().slice(0, 10);

  const today = dailyRows.find(
    (day) => day.date === todayUtc,
  );

  const todayTokens = today
    ? PROVIDERS.reduce(
        (sum, provider) =>
          sum + (today[provider.key] || 0),
        0,
      )
    : 0;

  const groqCooldownActive = Boolean(
    modelUsage?.groqCooldownUntil &&
      new Date(modelUsage.groqCooldownUntil).getTime() > Date.now(),
  );

  const latestGroqCall = recentRows.find(
    (row) => row.provider === 'groq',
  );

  const stats = [
    {
      label: `Tokens · ${usageDays} days`,
      value: formatNumber(totalTokens),
      detail: 'Recorded provider tokens',
    },
    {
      label: 'Model calls',
      value: formatNumber(totalCalls),
      detail: `${formatNumber(totalCalls - totalFailures)} non-failed calls`,
    },
    {
      label: 'Recorded failures',
      value: formatNumber(totalFailures),
      detail: `${failureRate.toFixed(1)}% of recorded calls`,
    },
    {
      label: 'Tokens today',
      value: formatNumber(todayTokens),
      detail: 'Current day · UTC',
    },
  ];

  if (usageLoading && !modelUsage) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading model usage…
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-7 text-foreground">
      {/* Page header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            AI model monitoring
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Usage, reliability and provider activity
          </p>

          <p className="mt-1.5 text-xs text-muted-foreground">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}`
              : 'Waiting for usage data'}
            {' · Refreshes every minute'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center rounded-md border border-border p-0.5">
            {([7, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                aria-pressed={usageDays === days}
                onClick={() => setUsageDays(days)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  usageDays === days
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setRefreshVersion((version) => version + 1)
            }
            disabled={usageLoading}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                usageLoading ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </button>
        </div>
      </header>

      {/* Overall usage error */}
      {usageError && (
        <div
          role="alert"
          className="flex items-start gap-2 border-l-2 border-destructive py-2 pl-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />

          <div>
            <p className="text-sm font-medium">
              Could not refresh model usage
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {usageError}
            </p>
          </div>
        </div>
      )}

      {/* Summary metrics */}
      <section aria-label="Usage summary">
        <div className="grid grid-cols-2 divide-x divide-y divide-border border-y border-border sm:grid-cols-4 sm:divide-y-0">
          {stats.map(({ label, value, detail }) => (
            <div
              key={label}
              className="min-w-0 px-3 py-3 sm:px-4 sm:py-4"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>

              <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">
                {value}
              </p>

              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                {detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Provider performance */}
      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold">
              Provider performance
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Usage and failures by configured provider and fallback role.
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground">
            {usageDays}-day reporting period
          </p>
        </div>

        <div className="overflow-x-auto border-y border-border">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground">
                <th className="px-3 py-2.5 text-left font-medium">
                  Provider
                </th>
                <th className="px-3 py-2.5 text-left font-medium">
                  Role
                </th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Calls
                </th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Total tokens
                </th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Input / output
                </th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Failures
                </th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Failure rate
                </th>
                <th className="px-3 py-2.5 text-left font-medium">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {PROVIDERS.map((provider) => {
                const row = summary?.[provider.key];
                const calls = row?.calls || 0;
                const failures = row?.failures || 0;

                const providerFailureRate =
                  calls > 0 ? (failures / calls) * 100 : 0;

                const isGroqPrimary = provider.key === 'groq';

                return (
                  <tr
                    key={provider.key}
                    className="border-b border-border/70 last:border-0 transition-colors hover:bg-muted/20"
                  >
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: provider.color,
                          }}
                        />
                        <span className="font-medium">
                          {provider.label}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {provider.modelRole}
                    </td>

                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatNumber(calls)}
                    </td>

                    <td className="px-3 py-3 text-right font-medium tabular-nums">
                      {formatNumber(row?.totalTokens || 0)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs tabular-nums text-muted-foreground">
                      {formatNumber(row?.inputTokens || 0)}
                      <span className="px-1.5 text-border">/</span>
                      {formatNumber(row?.outputTokens || 0)}
                    </td>

                    <td
                      className={`px-3 py-3 text-right tabular-nums ${
                        failures > 0
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatNumber(failures)}
                    </td>

                    <td className="px-3 py-3 text-right tabular-nums">
                      {providerFailureRate.toFixed(1)}%
                    </td>

                    <td className="whitespace-nowrap px-3 py-3">
                      {isGroqPrimary ? (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs ${
                            groqCooldownActive
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {groqCooldownActive
                            ? 'Cooldown'
                            : 'No cooldown'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Availability status is only shown where the backend exposes it.
          A dash does not indicate that a provider is offline.
        </p>
      </section>

      {/* Today's model usage and live provider limits */}
      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold">
              Today's model usage
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Today's recorded tokens and latest available provider limits · UTC
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            {formatNumber(todayTokens)} tokens recorded today
          </p>
        </div>

        <div className="overflow-x-auto border-y border-border">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground">
                <th className="px-3 py-2.5 text-left font-medium">
                  Model route
                </th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Tokens today
                </th>
                <th className="px-3 py-2.5 text-left font-medium">
                  Requests / day
                </th>
                <th className="px-3 py-2.5 text-left font-medium">
                  Tokens / minute
                </th>
                <th className="px-3 py-2.5 text-left font-medium">
                  Last observed
                </th>
              </tr>
            </thead>

            <tbody>
              {PROVIDERS.map((provider) => {
                const snapshot = groqRateLimits.find(
                  (item) => item.provider === provider.key,
                );

                const usedToday = today?.[provider.key] || 0;
                const requests = snapshot?.requestsPerDay;
                const tokens = snapshot?.tokensPerMinute;

                const requestPct = quotaPercentage(
                  requests?.limit,
                  requests?.remaining,
                );

                const tokenPct = quotaPercentage(
                  tokens?.limit,
                  tokens?.remaining,
                );

                const renderQuota = (
                  quota: GroqQuotaWindow | undefined,
                  percentage: number | null,
                ) => {
                  if (
                    !quota ||
                    quota.limit == null ||
                    quota.remaining == null ||
                    quota.limit <= 0
                  ) {
                    return (
                      <span className="text-xs text-muted-foreground">
                        {provider.key === 'gemini' ||
                        provider.key === 'gemini2'
                          ? 'Not connected'
                          : 'Awaiting quota data'}
                      </span>
                    );
                  }

                  const color =
                    percentage !== null && percentage >= 90
                      ? 'bg-destructive'
                      : percentage !== null && percentage >= 75
                        ? 'bg-amber-500'
                        : 'bg-emerald-600';

                  return (
                    <div className="min-w-[190px] space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
                        <span className="font-medium">
                          {formatNumber(quota.remaining)} remaining
                        </span>

                        <span className="text-muted-foreground">
                          {percentage === null
                            ? '—'
                            : `${percentage.toFixed(1)}% used`}
                        </span>
                      </div>

                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-muted"
                        aria-label={
                          percentage === null
                            ? 'Quota usage unavailable'
                            : `${percentage.toFixed(1)}% of quota used`
                        }
                      >
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{
                            width: `${percentage ?? 0}%`,
                          }}
                        />
                      </div>

                      <p className="text-[10px] text-muted-foreground">
                        Limit: {formatNumber(quota.limit)}
                      </p>
                    </div>
                  );
                };

                return (
                  <tr
                    key={provider.key}
                    className="border-b border-border/70 last:border-0 transition-colors hover:bg-muted/20"
                  >
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: provider.color,
                          }}
                        />

                        <span className="font-medium">
                          {provider.label}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {provider.modelRole}
                        </span>
                      </div>

                      {snapshot && (
                        <p className="mt-1 pl-4 text-[10px] text-muted-foreground">
                          {snapshot.model}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-3 text-right font-medium tabular-nums">
                      {formatNumber(usedToday)}
                    </td>

                    <td className="px-3 py-3">
                      {renderQuota(requests, requestPct)}
                    </td>

                    <td className="px-3 py-3">
                      {renderQuota(tokens, tokenPct)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                      {snapshot
                        ? new Date(snapshot.observedAt).toLocaleTimeString(
                            [],
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            },
                          )
                        : 'No snapshot'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] leading-5 text-muted-foreground">
          Today's tokens are backend-recorded consumption. Requests/day and
          tokens/minute show the latest quota headers received from Groq;
          they are separate limits, not a daily token allowance. Quota data
          is unavailable until the provider returns the relevant headers.
        </p>
      </section>

      {/* Provider health */}
      <section className="border-y border-border py-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              GROQ PRIMARY · COOLDOWN
            </p>

            <p className="mt-1 text-sm">
              {groqCooldownActive
                ? `Cooldown ends at ${new Date(
                    modelUsage!.groqCooldownUntil!,
                  ).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}.`
                : latestGroqCall?.errorCode
                  ? `No active cooldown recorded. Latest error: ${latestGroqCall.errorCode}`
                  : 'No active cooldown recorded by the backend.'}
            </p>
          </div>

          <span
            className={`inline-flex w-fit items-center gap-2 text-xs font-medium ${
              groqCooldownActive
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {groqCooldownActive
              ? 'Cooldown active'
              : 'No active cooldown'}
          </span>
        </div>
      </section>

      {/* Daily token consumption chart */}
      <section className="space-y-3 border-b border-border pb-6">
        <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold">
              Daily token consumption
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Tokens recorded per provider · UTC
            </p>
          </div>

          <p className="text-sm font-medium tabular-nums">
            {formatNumber(totalTokens)}{' '}
            <span className="text-xs font-normal text-muted-foreground">
              total tokens
            </span>
          </p>
        </div>

        {dailyRows.length === 0 ? (
          <div className="flex h-40 items-center justify-center border-y border-border text-sm text-muted-foreground">
            No daily usage data recorded for this period.
          </div>
        ) : (
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dailyRows}
                margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-border"
                />

                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => value.slice(5)}
                  tick={{
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={usageDays === 30 ? 4 : 0}
                />

                <YAxis
                  tickFormatter={(value: number) =>
                    value >= 1000
                      ? `${(value / 1000).toFixed(1)}k`
                      : String(value)
                  }
                  tick={{
                    fontSize: 10,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={42}
                />

                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatNumber(value),
                    providerLabel(name),
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 4,
                    boxShadow: 'none',
                    fontSize: 12,
                  }}
                />

                {PROVIDERS.map((provider) => (
                  <Bar
                    key={provider.key}
                    dataKey={provider.key}
                    stackId="tokens"
                    fill={provider.color}
                    name={provider.key}
                    maxBarSize={28}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
          {PROVIDERS.map((provider) => (
            <span
              key={provider.key}
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span
                className="h-2 w-2 rounded-sm"
                style={{
                  backgroundColor: provider.color,
                }}
              />
              {provider.label} · {provider.modelRole}
            </span>
          ))}
        </div>
      </section>

      {/* Recent model activity */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">
            Recent model activity
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Latest calls recorded by the backend.
          </p>
        </div>

        {recentRows.length === 0 ? (
          <p className="border-y border-border py-8 text-center text-sm text-muted-foreground">
            No recent calls recorded.
          </p>
        ) : (
          <div className="overflow-x-auto border-y border-border">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground">
                  <th className="px-3 py-2.5 text-left font-medium">
                    Provider
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">
                    Result
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Tokens
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">
                    Recorded at
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentRows.slice(0, 10).map((row, index) => {
                  const success = row.status === 'success';

                  const provider = PROVIDERS.find(
                    (item) => item.key === row.provider,
                  );

                  return (
                    <tr
                      key={`${row.createdAt}-${index}`}
                      className="border-b border-border/70 last:border-0 transition-colors hover:bg-muted/20"
                    >
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: provider?.color || '#64748b',
                            }}
                          />

                          <span className="font-medium">
                            {providerLabel(row.provider)}
                          </span>

                          {row.failover && (
                            <span className="text-[10px] text-muted-foreground">
                              Failover
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`text-xs ${
                            success
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-destructive'
                          }`}
                        >
                          {success
                            ? 'Success'
                            : `Error${row.errorCode ? ` · ${row.errorCode}` : ''}`}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatNumber(row.totalTokens)}
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                        {formatTimestamp(row.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Lifetime customer token usage */}
      <section className="space-y-3 border-t border-border pt-5">
        <div>
          <h2 className="text-base font-semibold">
            Customer token usage
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Top customers by lifetime counters. Customer totals are not directly
            comparable with provider totals for the selected period.
          </p>
        </div>

        {customerRows.length === 0 ? (
          <p className="border-y border-border py-6 text-center text-sm text-muted-foreground">
            No customer token usage recorded.
          </p>
        ) : (
          <div className="max-h-[340px] overflow-auto border-y border-border">
            <table className="w-full min-w-[500px] text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border text-[11px] text-muted-foreground">
                  <th className="px-3 py-2.5 text-left font-medium">
                    Customer
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Today
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    All time
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Share
                  </th>
                </tr>
              </thead>

              <tbody>
                {customerRows.map((customer) => {
                  const share =
                    modelUsage && modelUsage.allTimeTokens > 0
                      ? (customer.totalTokens /
                          modelUsage.allTimeTokens) *
                        100
                      : 0;

                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-border/70 last:border-0 transition-colors hover:bg-muted/20"
                    >
                      <td className="max-w-[280px] truncate px-3 py-3 font-medium">
                        {customer.name || 'Unnamed customer'}
                      </td>

                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {formatNumber(customer.todayTokens)}
                      </td>

                      <td className="px-3 py-3 text-right tabular-nums">
                        {formatNumber(customer.totalTokens)}
                      </td>

                      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                        {share.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Daily customer token usage */}
      <section className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold">
              Daily customer token usage
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Individual customer usage for the selected date · UTC
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="customer-usage-date"
              className="text-xs text-muted-foreground"
            >
              Select date
            </label>

            <input
              id="customer-usage-date"
              type="date"
              value={selectedUsageDate}
              max={todayUtc}
              onChange={(event) =>
                setSelectedUsageDate(event.target.value)
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />

            <button
              type="button"
              onClick={() => setSelectedUsageDate(todayUtc)}
              disabled={selectedUsageDate === todayUtc}
              className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Today
            </button>
          </div>
        </div>

        {/* Selected-date summary */}
        <div className="grid grid-cols-2 divide-x divide-border border-y border-border sm:max-w-md">
          <div className="px-3 py-3">
            <p className="text-xs text-muted-foreground">
              Total tokens
            </p>

            <p className="mt-1.5 text-xl font-semibold tabular-nums">
              {dailyCustomerData
                ? formatNumber(dailyCustomerData.totalTokens)
                : '—'}
            </p>
          </div>

          <div className="px-3 py-3">
            <p className="text-xs text-muted-foreground">
              Customers with usage
            </p>

            <p className="mt-1.5 text-xl font-semibold tabular-nums">
              {dailyCustomerData
                ? formatNumber(dailyCustomerData.customerCount)
                : '—'}
            </p>
          </div>
        </div>

        {/* Daily usage loading, error and empty states */}
        {dailyCustomerLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading usage for {selectedUsageDate}…
          </div>
        ) : dailyCustomerError ? (
          <div
            role="alert"
            className="border-l-2 border-destructive py-2 pl-3"
          >
            <p className="text-sm font-medium">
              Unable to load daily usage
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {dailyCustomerError}
            </p>
          </div>
        ) : dailyCustomers.length === 0 ? (
          <p className="border-y border-border py-8 text-center text-sm text-muted-foreground">
            No recorded customer token usage for {selectedUsageDate}.
          </p>
        ) : (
          <div className="overflow-x-auto border-y border-border">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] text-muted-foreground">
                  <th className="px-3 py-2.5 text-left font-medium">
                    Customer
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Tokens used
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Daily share
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">
                    Distribution
                  </th>
                </tr>
              </thead>

              <tbody>
                {dailyCustomers.map((customer) => {
                  const share =
                    dailyCustomerData &&
                    dailyCustomerData.totalTokens > 0
                      ? (customer.totalTokens /
                          dailyCustomerData.totalTokens) *
                        100
                      : 0;

                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-border/70 last:border-0 transition-colors hover:bg-muted/20"
                    >
                      <td className="max-w-[260px] truncate px-3 py-3 font-medium">
                        {customer.name || 'Unnamed customer'}
                      </td>

                      <td className="px-3 py-3 text-right font-medium tabular-nums">
                        {formatNumber(customer.totalTokens)}
                      </td>

                      <td className="px-3 py-3 text-right tabular-nums">
                        {share.toFixed(1)}%
                      </td>

                      <td className="px-3 py-3">
                        <div
                          className="h-1.5 min-w-[100px] overflow-hidden rounded-full bg-muted"
                          aria-label={`${share.toFixed(1)}% of daily token usage`}
                        >
                          <div
                            className="h-full rounded-full bg-teal-700 transition-all"
                            style={{
                              width: `${Math.min(100, share)}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] leading-5 text-muted-foreground">
          Figures represent recorded customer daily totals. Dates before
          daily tracking was introduced may not have historical records.
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-3 text-[11px] leading-5 text-muted-foreground">
        Usage is based on records stored by the Fiesta backend. Provider
        dashboards remain the source of truth for actual billing, account
        balances and remaining provider quota.
      </footer>
    </div>
  );
};

export default AIModelMonitoringPage;