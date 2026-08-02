import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Copy,
  GraduationCap,
  Layers,
  Mail,
  Palette,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
  SkeletonCard,
  Textarea,
  ThemeToggle,
} from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';

const tokens = [
  { name: 'Brand', varName: '--ds-brand', sample: 'var(--ds-brand)' },
  { name: 'Background', varName: '--ds-bg', sample: 'var(--ds-bg)' },
  { name: 'Elevated', varName: '--ds-bg-elevated', sample: 'var(--ds-bg-elevated)' },
  { name: 'Muted surface', varName: '--ds-bg-muted', sample: 'var(--ds-bg-muted)' },
  { name: 'Text', varName: '--ds-text', sample: 'var(--ds-text)' },
  { name: 'Text muted', varName: '--ds-text-muted', sample: 'var(--ds-text-muted)' },
  { name: 'Success', varName: '--ds-success', sample: 'var(--ds-success)' },
  { name: 'Warning', varName: '--ds-warning', sample: 'var(--ds-warning)' },
  { name: 'Danger', varName: '--ds-danger', sample: 'var(--ds-danger)' },
  { name: 'Info', varName: '--ds-info', sample: 'var(--ds-info)' },
];

const nav = [
  'Overview',
  'Colors',
  'Typography',
  'Buttons',
  'Forms',
  'Cards',
  'Badges',
  'Alerts',
  'Tables',
  'Charts',
  'States',
  'Motion',
];

export default function DesignSystem() {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [copied, setCopied] = useState(false);

  const chartHeights = useMemo(() => [42, 68, 55, 88, 72, 96, 64], []);

  const copyToken = async (name: string) => {
    await navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="ds-mesh min-h-screen pb-24">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-[var(--ds-border)]">
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'var(--ds-gradient-mesh)' }} />
        <div className="ds-container relative py-14 md:py-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <p className="ds-eyebrow mb-4">
                <Palette className="w-3.5 h-3.5" /> Design System
              </p>
              <h1 className="ds-display text-5xl md:text-6xl lg:text-7xl mb-4">
                Luxury UI kit for{' '}
                <span className="zn-highlight">MBBSWala</span>
              </h1>
              <p className="ds-body text-lg md:text-xl max-w-xl">
                Stripe clarity · Linear density · Apple polish · OpenAI calm · Framer motion · Vercel precision · Cursor craft.
              </p>
            </div>
            <div className="ds-glass rounded-[var(--ds-radius-xl)] p-5 min-w-[240px] space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="ds-label mb-1">Appearance</p>
                  <p className="font-bold capitalize text-[var(--ds-text)]">{theme} mode</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="ds-divider" />
              <div className="flex items-center gap-2 text-sm ds-muted">
                <Sparkles className="w-4 h-4 text-[var(--ds-brand)]" />
                Glass · Soft shadow · Gradients
              </div>
            </div>
          </div>

          <nav className="mt-10 flex gap-2 overflow-x-auto ds-scroll pb-1">
            {nav.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="ds-btn ds-btn-sm ds-btn-ghost shrink-0"
              >
                {item}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="ds-container space-y-16 md:space-y-24 pt-12">
        {/* Overview dashboard */}
        <section id="overview" className="ds-fade-up space-y-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="ds-eyebrow mb-2">Dashboard preview</p>
              <h2 className="ds-title text-3xl md:text-4xl">Command center</h2>
            </div>
            <Button variant="brand" rightIcon={<ArrowRight className="w-4 h-4" />} shine>
              New inquiry
            </Button>
          </div>

          <div className="ds-grid-4">
            {[
              { label: 'Active students', value: '2,481', delta: '+12.4%', icon: Users, tone: 'success' as const },
              { label: 'Seat matches', value: '18.2k', delta: '+4.1%', icon: GraduationCap, tone: 'info' as const },
              { label: 'Avg. response', value: '6m', delta: '-18%', icon: Bell, tone: 'brand' as const },
              { label: 'Conversion', value: '34.8%', delta: '+2.2%', icon: TrendingUp, tone: 'success' as const },
            ].map((s) => (
              <Card key={s.label} glow className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <span className="ds-state-icon !w-10 !h-10">
                    <s.icon className="w-4 h-4" />
                  </span>
                  <Badge tone={s.tone === 'brand' ? 'brand' : s.tone} dot>
                    {s.delta}
                  </Badge>
                </div>
                <p className="ds-muted text-sm mb-1">{s.label}</p>
                <p className="ds-title text-3xl">{s.value}</p>
                <div className="ds-sparkline mt-4">
                  {[40, 55, 35, 70, 50, 85, 60, 90].map((h, i) => (
                    <span key={i} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card premium className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="ds-label mb-1">Counselling volume</p>
                  <h3 className="ds-title text-xl">Weekly activity</h3>
                </div>
                <Badge tone="neutral">Last 7 days</Badge>
              </div>
              <div className="ds-chart">
                {chartHeights.map((h, i) => (
                  <div key={i} className="ds-chart-bar" style={{ height: `${h}%` }} title={`${h}%`} />
                ))}
              </div>
              <div className="flex justify-between mt-3 text-xs ds-muted font-semibold">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </Card>

            <Card className="p-6 ds-glass !bg-[var(--ds-glass)]">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-[var(--ds-brand)]" />
                <h3 className="ds-title text-lg">Glass panel</h3>
              </div>
              <p className="ds-body text-sm mb-5">
                Frosted surfaces with soft borders — ideal for floating toolbars, modals, and sticky filters.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="ds-muted">Blur</span>
                  <span className="font-bold">18px</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="ds-muted">Saturation</span>
                  <span className="font-bold">135%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="ds-muted">Inset highlight</span>
                  <span className="font-bold">On</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Colors */}
        <section id="colors" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Color palette</p>
            <h2 className="ds-title text-3xl">Tokens that adapt to theme</h2>
          </div>
          <div className="ds-grid-4">
            {tokens.map((t) => (
              <button
                key={t.varName}
                type="button"
                onClick={() => copyToken(t.varName)}
                className="ds-card ds-card-static p-4 text-left group"
              >
                <div
                  className="h-16 rounded-[var(--ds-radius-md)] mb-3 border border-[var(--ds-border)] shadow-[var(--ds-shadow-xs)]"
                  style={{ background: t.sample }}
                />
                <p className="font-bold text-sm">{t.name}</p>
                <p className="ds-mono text-xs ds-muted mt-1 flex items-center gap-1">
                  {t.varName}
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </button>
            ))}
          </div>
          {copied && (
            <Alert tone="success" title="Copied">
              Token name copied to clipboard.
            </Alert>
          )}
        </section>

        {/* Typography */}
        <section id="typography" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Typography</p>
            <h2 className="ds-title text-3xl">Display + product sans</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card staticHover className="p-6 space-y-4">
              <p className="ds-label">Display · Cormorant Garamond</p>
              <p className="ds-display text-5xl">Elegant medical admissions</p>
              <p className="ds-display text-3xl opacity-80">Aa Bb Cc 123</p>
            </Card>
            <Card staticHover className="p-6 space-y-4">
              <p className="ds-label">Sans · Manrope</p>
              <p className="ds-title text-3xl">Product UI at every density</p>
              <p className="ds-body">
                Perfect for dashboards, forms, tables, and dense counselling workflows. Tracking tight on titles, relaxed on body.
              </p>
              <p className="ds-mono text-sm">SF Mono for codes & ranks · AIR 15,420</p>
            </Card>
          </div>
        </section>

        {/* Buttons */}
        <section id="buttons" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Buttons</p>
            <h2 className="ds-title text-3xl">Hierarchy with micro-motion</h2>
          </div>
          <Card staticHover className="p-6 space-y-5">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="brand" shine rightIcon={<ArrowRight className="w-4 h-4" />}>Brand CTA</Button>
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="brand" loading={loadingDemo} onClick={() => { setLoadingDemo(true); setTimeout(() => setLoadingDemo(false), 1400); }}>
                {loadingDemo ? 'Saving' : 'Async'}
              </Button>
              <Button size="icon" variant="outline" aria-label="Search"><Search className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button size="sm" variant="brand">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg" variant="primary">Large</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>
        </section>

        {/* Forms */}
        <section id="forms" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Forms</p>
            <h2 className="ds-title text-3xl">Modern inputs</h2>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card staticHover className="p-6 space-y-4">
              <Input
                label="Email"
                placeholder="parent@email.com"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                hint="We’ll never share your email."
              />
              <Input
                label="Search colleges"
                placeholder="AIIMS, GMC, private…"
                icon={<Search className="w-4 h-4" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select
                label="Preferred state"
                options={[
                  { value: 'mp', label: 'Madhya Pradesh' },
                  { value: 'mh', label: 'Maharashtra' },
                  { value: 'ka', label: 'Karnataka' },
                ]}
              />
              <Textarea label="Message" placeholder="Rank, category, budget…" />
              <Input label="With error" error="Phone number is required" defaultValue="" />
              <Button variant="brand" className="w-full">Submit inquiry</Button>
            </Card>
            <Card premium className="p-6 space-y-4">
              <h3 className="ds-title text-xl">Form guidelines</h3>
              <ul className="space-y-3 text-sm ds-body">
                <li className="flex gap-2"><Check className="w-4 h-4 text-[var(--ds-success)] shrink-0 mt-0.5" /> Labels are uppercase micro-type for density without clutter.</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-[var(--ds-success)] shrink-0 mt-0.5" /> Focus rings use brand glow — never harsh outlines.</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-[var(--ds-success)] shrink-0 mt-0.5" /> Errors pair border + soft red field glow + helper text.</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-[var(--ds-success)] shrink-0 mt-0.5" /> Icons sit inside the field for a premium SaaS feel.</li>
              </ul>
            </Card>
          </div>
        </section>

        {/* Cards */}
        <section id="cards" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Cards</p>
            <h2 className="ds-title text-3xl">Premium surfaces</h2>
          </div>
          <div className="ds-grid-3">
            <Card className="p-6">
              <h3 className="ds-title text-lg mb-2">Interactive lift</h3>
              <p className="ds-body text-sm">Hover elevates with soft shadow — default product card.</p>
            </Card>
            <Card premium className="p-6">
              <h3 className="ds-title text-lg mb-2">Gradient border</h3>
              <p className="ds-body text-sm">Premium frame for featured packages and upsells.</p>
            </Card>
            <Card glow className="p-6">
              <h3 className="ds-title text-lg mb-2">Pointer glow</h3>
              <p className="ds-body text-sm">Cursor-reactive highlight for dashboard widgets.</p>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section id="badges" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Badges & icons</p>
            <h2 className="ds-title text-3xl">Status at a glance</h2>
          </div>
          <Card staticHover className="p-6 flex flex-wrap gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="brand" dot>Live</Badge>
            <Badge tone="success" dot>Paid</Badge>
            <Badge tone="warning">Pending</Badge>
            <Badge tone="danger">Failed</Badge>
            <Badge tone="info">AIQ</Badge>
            <span className="ds-state-icon"><BarChart3 className="w-4 h-4" /></span>
            <span className="ds-state-icon"><Bell className="w-4 h-4" /></span>
            <span className="ds-state-icon"><GraduationCap className="w-4 h-4" /></span>
          </Card>
        </section>

        {/* Alerts */}
        <section id="alerts" className="space-y-4">
          <div>
            <p className="ds-eyebrow mb-2">Alerts</p>
            <h2 className="ds-title text-3xl">Feedback patterns</h2>
          </div>
          <Alert tone="info" title="Round 1 opens Friday">Seat matrix for MP government colleges is now synced.</Alert>
          <Alert tone="success" title="Inquiry received">We’ll call you on +91 78801 19983 within the hour.</Alert>
          <Alert tone="warning" title="Documents pending">Upload domicile certificate before choice locking.</Alert>
          <Alert tone="danger" title="Payment failed">Card was declined. Try another method.</Alert>
        </section>

        {/* Tables */}
        <section id="tables" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Tables</p>
            <h2 className="ds-title text-3xl">Elegant data density</h2>
          </div>
          <div className="ds-table-wrap ds-scroll">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>College</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>AIQ Rank</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['GMC Bhopal', 'Government', 'MP', '7,070', 'Open'],
                  ['MGM Indore', 'Government', 'MP', '5,147', 'Competitive'],
                  ['AIIMS Bhopal', 'Government', 'MP', '890', 'Closed'],
                  ['Chirayu Medical', 'Private', 'MP', '42,100', 'Open'],
                  ['Index Indore', 'Private', 'MP', '48,220', 'Waitlist'],
                ].map((row) => (
                  <tr key={row[0]}>
                    <td className="!text-[var(--ds-text)] !font-bold">{row[0]}</td>
                    <td>{row[1]}</td>
                    <td>{row[2]}</td>
                    <td className="ds-mono">{row[3]}</td>
                    <td>
                      <Badge
                        tone={row[4] === 'Open' ? 'success' : row[4] === 'Closed' ? 'danger' : row[4] === 'Waitlist' ? 'warning' : 'info'}
                        dot
                      >
                        {row[4]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Charts */}
        <section id="charts" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Charts</p>
            <h2 className="ds-title text-3xl">Soft gradient bars</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card staticHover className="p-6">
              <p className="ds-label mb-4">Package mix</p>
              <div className="ds-chart h-40">
                {[70, 45, 88, 36, 60, 92].map((h, i) => (
                  <div key={i} className="ds-chart-bar" style={{ height: `${h}%` }} />
                ))}
              </div>
            </Card>
            <Card staticHover className="p-6">
              <p className="ds-label mb-4">Sparklines</p>
              <div className="space-y-4">
                {['UG inquiries', 'PG leads', 'Calls answered'].map((label, idx) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="w-28 text-sm font-semibold">{label}</span>
                    <div className="ds-sparkline flex-1">
                      {[30, 50, 40, 70, 55, 80, 60, 90, 75].map((h, i) => (
                        <span key={i} style={{ height: `${(h + idx * 5) % 100}%`, opacity: 0.5 + i * 0.05 }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* States */}
        <section id="states" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">States</p>
            <h2 className="ds-title text-3xl">Loading · Empty · Error · Success</h2>
          </div>
          <div className="ds-grid-2">
            <div className="space-y-3">
              <p className="ds-label">Skeleton loading</p>
              <SkeletonCard />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </div>
            <EmptyState
              kind="empty"
              title="No shortlisted colleges"
              description="Start from Seat Matrix or Cut-offs, then pin colleges that match your rank band."
              action={<Button variant="brand" size="sm">Browse colleges</Button>}
            />
            <EmptyState
              kind="error"
              title="Couldn’t load cutoffs"
              description="Check your connection and try again. Your filters were preserved."
              action={<Button variant="outline" size="sm">Retry</Button>}
            />
            <EmptyState
              kind="success"
              title="Profile complete"
              description="You’re ready for personalised choice-list guidance."
              action={<Button variant="primary" size="sm">Continue</Button>}
            />
          </div>
        </section>

        {/* Motion */}
        <section id="motion" className="space-y-6">
          <div>
            <p className="ds-eyebrow mb-2">Motion</p>
            <h2 className="ds-title text-3xl">Micro-interactions</h2>
          </div>
          <div className="ds-grid-3">
            <Card className="p-6 ds-lift">
              <p className="ds-title mb-2">Lift on hover</p>
              <p className="ds-body text-sm">`.ds-lift` for list rows and media cards.</p>
            </Card>
            <Button variant="brand" className="ds-shine h-auto py-8" shine>
              Shine sweep CTA
            </Button>
            <Card staticHover className="p-6 flex items-center justify-center">
              <span className="ds-pulse inline-flex items-center gap-2 font-bold">
                <span className="ds-dot text-[var(--ds-success)]" /> Live counselling desk
              </span>
            </Card>
          </div>
        </section>

        {/* Spacing / radius reference */}
        <section className="space-y-6 pb-8">
          <div>
            <p className="ds-eyebrow mb-2">Foundations</p>
            <h2 className="ds-title text-3xl">Radius · Shadow · Spacing</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card staticHover className="p-6">
              <p className="ds-label mb-4">Radius scale</p>
              <div className="flex items-end gap-3">
                {['xs', 'sm', 'md', 'lg', 'xl'].map((r) => (
                  <div
                    key={r}
                    className="bg-[var(--ds-brand-soft)] border border-[var(--ds-border)] flex items-center justify-center text-[10px] font-bold"
                    style={{ width: 40 + ['xs','sm','md','lg','xl'].indexOf(r) * 8, height: 40 + ['xs','sm','md','lg','xl'].indexOf(r) * 8, borderRadius: `var(--ds-radius-${r})` }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </Card>
            <Card staticHover className="p-6">
              <p className="ds-label mb-4">Shadows</p>
              <div className="space-y-3">
                {['sm', 'md', 'lg'].map((s) => (
                  <div key={s} className="h-12 rounded-[var(--ds-radius-md)] bg-[var(--ds-bg-elevated)] border border-[var(--ds-border)]" style={{ boxShadow: `var(--ds-shadow-${s})` }} />
                ))}
              </div>
            </Card>
            <Card staticHover className="p-6">
              <p className="ds-label mb-4">Spacing</p>
              <div className="flex items-end gap-2">
                {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                  <div key={n} className="bg-[var(--ds-brand)] rounded-sm" style={{ width: 12, height: n * 6 }} title={`space-${n}`} />
                ))}
              </div>
              <p className="ds-help mt-3">4px base unit · 1→16 scale</p>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
