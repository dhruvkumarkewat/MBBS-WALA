import { useState } from 'react';
import {
  Bell,
  GraduationCap,
  Layers,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Avatar,
  Badge,
  BarChart,
  Button,
  Card,
  ChatWindow,
  Checkbox,
  CollegeCard,
  Divider,
  DonutChart,
  Dropdown,
  FilterBar,
  HeroCard,
  Input,
  LineChart,
  Modal,
  NotificationList,
  Pagination,
  PredictionCard,
  ProfileCard,
  Progress,
  SearchInput,
  Select,
  Sparkline,
  StatsCard,
  Switch,
  Table,
  Tabs,
  ThemeToggle,
  Timeline,
  Tooltip,
  type ChatMessage,
  type NotificationItemData,
} from '../components/ui';

export default function ComponentLibrary() {
  const [tab, setTab] = useState('cards');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [dropVal, setDropVal] = useState('mp');
  const [searchQ, setSearchQ] = useState('');
  const [chips, setChips] = useState([
    { id: 'gov', label: 'Government' },
    { id: 'mp', label: 'Madhya Pradesh' },
  ]);
  const [sw, setSw] = useState(true);
  const [ck, setCk] = useState(true);
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I can help with NEET ranks, MP cutoffs, and college shortlists.',
      createdAt: 'Just now',
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [notes, setNotes] = useState<NotificationItemData[]>([
    {
      id: 'n1',
      title: 'Round 1 choice filling opens',
      body: 'MP NEET UG counselling window starts Monday.',
      time: '2h ago',
      tone: 'info',
    },
    {
      id: 'n2',
      title: 'Document verified',
      body: 'Your NEET scorecard was approved.',
      time: 'Yesterday',
      read: true,
      tone: 'success',
    },
    {
      id: 'n3',
      title: 'Seat matrix updated',
      body: 'GMC Bhopal open seats revised.',
      time: '3d ago',
      tone: 'brand',
    },
  ]);

  return (
    <div className="ds-mesh min-h-screen pb-24">
      <header className="border-b border-[var(--ds-border)]">
        <div className="ds-container py-12 md:py-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="ds-eyebrow mb-3">
                <Layers className="w-3.5 h-3.5" /> Component library
              </p>
              <h1 className="ds-display text-4xl md:text-6xl mb-3">
                Reusable UI for <span className="zn-highlight">MBBSWala</span>
              </h1>
              <p className="ds-body text-lg">
                React 19 · TypeScript · Tailwind · Framer Motion · Lucide. Import everything from{' '}
                <code className="ds-mono text-xs px-1.5 py-0.5 rounded bg-[var(--ds-bg-muted)]">
                  src/components/ui
                </code>
              </p>
            </div>
            <div className="ds-glass rounded-2xl p-4 flex items-center gap-4">
              <ThemeToggle />
              <div className="text-sm">
                <p className="font-bold">Folder</p>
                <p className="ds-muted ds-mono text-xs">components/ui/*</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="ds-container pt-10 space-y-8">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'cards', label: 'Cards' },
            { id: 'data', label: 'Tables & charts' },
            { id: 'forms', label: 'Forms & filters' },
            { id: 'overlay', label: 'Dialogs' },
            { id: 'ai', label: 'AI · Notify · Timeline' },
          ]}
        />

        {tab === 'cards' && (
          <div className="space-y-6">
            <div className="ds-grid-4">
              <StatsCard
                label="Active students"
                value="2,481"
                delta="+12%"
                icon={<Users className="w-4 h-4" />}
                sparkData={[40, 55, 35, 70, 50, 85, 60, 90]}
              />
              <StatsCard
                label="Seat matches"
                value="18.2k"
                delta="+4.1%"
                deltaTone="info"
                icon={<GraduationCap className="w-4 h-4" />}
                sparkData={[20, 30, 45, 40, 60, 55, 70]}
              />
              <StatsCard
                label="Avg. response"
                value="6m"
                delta="-18%"
                icon={<Bell className="w-4 h-4" />}
              />
              <StatsCard
                label="Conversion"
                value="34.8%"
                delta="+2.2%"
                icon={<TrendingUp className="w-4 h-4" />}
                sparkData={[50, 48, 52, 60, 58, 65, 70]}
              />
            </div>

            <HeroCard
              eyebrow="Hero card"
              title={
                <>
                  Find your best <span className="zn-highlight">MBBS seat</span>
                </>
              }
              description="Reusable hero block with actions and optional media."
              primaryAction={{ label: 'Explore colleges' }}
              secondaryAction={{ label: 'Talk to expert' }}
              media={
                <img
                  src="/images/mbbswala/dashboard-mock.png"
                  alt=""
                  className="rounded-2xl border border-[var(--ds-border)] shadow-[var(--ds-shadow-lg)]"
                />
              }
            />

            <div className="grid md:grid-cols-3 gap-4">
              <ProfileCard
                name="Aarav Sharma"
                role="NEET UG · AIR 12,400"
                badges={['MP domicile', 'General']}
                bio="Shortlisting government colleges in MP and Rajasthan."
                stats={[
                  { label: 'Saved', value: '12' },
                  { label: 'Apps', value: '3' },
                  { label: 'Calls', value: '8' },
                ]}
              />
              <CollegeCard
                college={{
                  id: 1,
                  name: 'Gandhi Medical College, Bhopal',
                  city: 'Bhopal',
                  state: 'MADHYA PRADESH',
                  collegeType: 'Government',
                  course: 'MBBS',
                  seats: 250,
                  imageUrl: '/images/mbbswala/feature-college.jpg',
                }}
              />
              <PredictionCard
                exam="NEET UG 2025"
                score={612}
                rankMin={18000}
                rankMax={24000}
                confidence={78}
                note="Based on previous-year trends. Official ranks may vary."
                onRecalculate={() => undefined}
              />
            </div>
          </div>
        )}

        {tab === 'data' && (
          <div className="space-y-6">
            <Table
              columns={[
                {
                  id: 'name',
                  header: 'College',
                  cell: (r) => <span className="font-bold">{r.name}</span>,
                },
                {
                  id: 'type',
                  header: 'Type',
                  cell: (r) => (
                    <Badge tone={r.type === 'Govt' ? 'success' : 'warning'}>{r.type}</Badge>
                  ),
                },
                {
                  id: 'rank',
                  header: 'AIQ Rank',
                  align: 'right',
                  cell: (r) => <span className="ds-mono">{r.rank}</span>,
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (r) => (
                    <Badge tone="info" dot>
                      {r.status}
                    </Badge>
                  ),
                },
              ]}
              data={[
                { id: 1, name: 'GMC Bhopal', type: 'Govt', rank: '7,070', status: 'Open' },
                { id: 2, name: 'MGM Indore', type: 'Govt', rank: '5,147', status: 'Competitive' },
                { id: 3, name: 'Chirayu Medical', type: 'Private', rank: '42,100', status: 'Open' },
              ]}
            />
            <div className="flex justify-center">
              <Pagination page={page} pageCount={12} onChange={setPage} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <Card staticHover className="p-5">
                <p className="ds-label mb-3">Bar chart</p>
                <BarChart data={[42, 68, 55, 88, 72, 96, 64]} labels={['M', 'T', 'W', 'T', 'F', 'S', 'S']} />
              </Card>
              <Card staticHover className="p-5">
                <p className="ds-label mb-3">Line + sparkline</p>
                <LineChart data={[20, 35, 28, 45, 40, 60, 55, 70]} />
                <Sparkline data={[20, 35, 28, 45, 40, 60, 55, 70]} className="mt-3" />
              </Card>
              <Card staticHover className="p-5 flex flex-col items-center">
                <p className="ds-label mb-3 self-start">Donut</p>
                <DonutChart
                  centerLabel="68%"
                  segments={[
                    { value: 40 },
                    { value: 28 },
                    { value: 18 },
                    { value: 14 },
                  ]}
                />
              </Card>
            </div>
          </div>
        )}

        {tab === 'forms' && (
          <div className="space-y-6">
            <FilterBar
              query={searchQ}
              onQueryChange={setSearchQ}
              chips={chips}
              onRemoveChip={(id) => setChips((c) => c.filter((x) => x.id !== id))}
              onClearAll={() => setChips([])}
            >
              <Dropdown
                value={dropVal}
                onChange={setDropVal}
                items={[
                  { id: 'mp', label: 'Madhya Pradesh' },
                  { id: 'mh', label: 'Maharashtra' },
                  { id: 'ka', label: 'Karnataka' },
                ]}
              />
            </FilterBar>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-5 space-y-4">
                <Input label="Email" placeholder="you@example.com" />
                <Select
                  label="Exam"
                  options={[
                    { value: 'ug', label: 'NEET UG' },
                    { value: 'pg', label: 'NEET PG' },
                  ]}
                />
                <SearchInput value={searchQ} onChange={setSearchQ} />
              </Card>
              <Card className="p-5 space-y-4">
                <Switch checked={sw} onChange={setSw} label="Email alerts" />
                <Checkbox
                  checked={ck}
                  onChange={(e) => setCk(e.target.checked)}
                  label="Include deemed universities"
                />
                <Progress value={64} showLabel tone="brand" />
                <div className="flex items-center gap-3">
                  <Avatar name="Aarav Sharma" />
                  <Avatar name="Priya Mehta" />
                  <Avatar name="Rohan" size="lg" />
                </div>
                <Divider label="or continue with" />
                <Button variant="outline" className="w-full">
                  Google
                </Button>
              </Card>
            </div>
          </div>
        )}

        {tab === 'overlay' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="brand" onClick={() => setModalOpen(true)}>
                Open modal
              </Button>
              <Tooltip content="Keyboard shortcut ⌘K">
                <Button variant="outline">Hover tooltip</Button>
              </Tooltip>
              <Dropdown
                label="Actions"
                value={dropVal}
                onChange={setDropVal}
                items={[
                  { id: 'mp', label: 'Madhya Pradesh', icon: <GraduationCap className="w-4 h-4" /> },
                  { id: 'mh', label: 'Maharashtra' },
                  { id: 'del', label: 'Remove', danger: true },
                ]}
              />
            </div>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Book counselling slot"
              description="Shared Modal component (also exported as Dialog)."
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="brand" onClick={() => setModalOpen(false)}>
                    Confirm
                  </Button>
                </>
              }
            >
              <Input label="Full name" placeholder="Your name" />
              <div className="h-3" />
              <Select
                label="Preferred time"
                options={[
                  { value: 'am', label: 'Morning' },
                  { value: 'pm', label: 'Evening' },
                ]}
              />
            </Modal>
            <Card className="p-6">
              <p className="ds-body text-sm">
                <strong>Modal / Dialog</strong> — portal, Escape to close, body scroll lock, Framer Motion enter/exit.
                <br />
                <strong>Dropdown</strong> — click outside to dismiss, keyboard-friendly listbox roles.
              </p>
            </Card>
          </div>
        )}

        {tab === 'ai' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-[480px]">
              <ChatWindow
                messages={msgs}
                loading={chatLoading}
                onSend={(text) => {
                  setMsgs((m) => [
                    ...m,
                    { id: String(Date.now()), role: 'user', content: text, createdAt: 'Now' },
                  ]);
                  setChatLoading(true);
                  setTimeout(() => {
                    setMsgs((m) => [
                      ...m,
                      {
                        id: String(Date.now() + 1),
                        role: 'assistant',
                        content:
                          'Thanks! Share category and domicile for a tighter MP college list.',
                        createdAt: 'Now',
                      },
                    ]);
                    setChatLoading(false);
                  }, 900);
                }}
              />
            </div>
            <div className="space-y-6">
              <NotificationList
                items={notes}
                onRead={(id) =>
                  setNotes((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)))
                }
                onDismiss={(id) => setNotes((n) => n.filter((x) => x.id !== id))}
                onMarkAll={() => setNotes((n) => n.map((x) => ({ ...x, read: true })))}
              />
              <Card className="p-5">
                <p className="ds-label mb-4">Timeline</p>
                <Timeline
                  items={[
                    {
                      id: 't1',
                      title: 'NEET result',
                      description: 'Scorecard downloaded',
                      time: 'Done',
                      tone: 'success',
                    },
                    {
                      id: 't2',
                      title: 'Registration',
                      description: 'AIQ + MP state forms',
                      time: 'This week',
                      tone: 'brand',
                    },
                    {
                      id: 't3',
                      title: 'Choice filling',
                      description: 'Lock preference list',
                      time: 'Upcoming',
                      tone: 'info',
                    },
                    {
                      id: 't4',
                      title: 'Seat allotment',
                      description: 'Round 1 results',
                      time: 'TBA',
                      tone: 'neutral',
                    },
                  ]}
                />
              </Card>
            </div>
          </div>
        )}

        <Card staticHover className="p-6">
          <h2 className="ds-title text-xl mb-3">Folder structure</h2>
          <pre className="ds-mono text-xs leading-relaxed overflow-x-auto text-[var(--ds-text-secondary)]">{`src/
  lib/
    cn.ts                 # className helper + Tone type
  components/
    ui/
      index.ts            # barrel exports
      Button.tsx Card.tsx Input.tsx Badge.tsx Alert.tsx
      Avatar.tsx Checkbox.tsx Switch.tsx Progress.tsx Spinner.tsx
      Tabs.tsx Tooltip.tsx Divider.tsx SelectField.tsx
      Modal.tsx Dropdown.tsx          # dialogs / menus
      Table.tsx Pagination.tsx
      SearchInput.tsx FilterBar.tsx
      Charts.tsx                      # Sparkline Bar Line Donut
      StatsCard.tsx HeroCard.tsx
      ProfileCard.tsx CollegeCard.tsx PredictionCard.tsx
      Chat.tsx                        # AI chat window
      Notification.tsx
      Timeline.tsx
      Skeleton.tsx EmptyState.tsx ThemeToggle.tsx
  styles/
    design-system.css     # tokens, .ds-* primitives`}</pre>
        </Card>
      </div>
    </div>
  );
}
