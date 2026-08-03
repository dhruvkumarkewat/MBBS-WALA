import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import ProtectedRoute from './components/ProtectedRoute';

function PageFallback() {
  return (
    <div
      className="min-h-[50vh] grid place-items-center px-6 page-route-fallback"
      role="status"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center gap-4 w-full max-w-[200px]">
        <div className="route-spinner" aria-hidden />
        <p className="text-[12px] font-semibold tracking-wide text-[var(--ds-text-muted,#6b7280)]">
          Loading…
        </p>
      </div>
    </div>
  );
}

function L({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

/* Marketing — code-split */
const Packages = lazy(() => import('./pages/Packages'));
const ExamPage = lazy(() => import('./pages/ExamPage'));
const RankCalculator = lazy(() => import('./pages/RankCalculator'));
const TestimonialsPage = lazy(() => import('./pages/TestimonialsPage'));
const Blogs = lazy(() => import('./pages/Blogs'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const About = lazy(() => import('./pages/About'));
const Careers = lazy(() => import('./pages/Careers'));
const Login = lazy(() => import('./pages/Login'));
const Policy = lazy(() => import('./pages/Policy'));
const Colleges = lazy(() => import('./pages/Colleges'));
const Cutoffs = lazy(() => import('./pages/Cutoffs'));
const SeatMatrix = lazy(() => import('./pages/SeatMatrix'));
const Contact = lazy(() => import('./pages/Contact'));
const Compare = lazy(() => import('./pages/Compare'));
const DesignSystem = lazy(() => import('./pages/DesignSystem'));
const ComponentLibrary = lazy(() => import('./pages/ComponentLibrary'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

/* Dashboard shell + pages — only when /dashboard is hit */
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'));
const CompetitionMapPage = lazy(() => import('./pages/dashboard/CompetitionMapPage'));

function lazyNamed<T extends Record<string, ComponentType>>(
  loader: () => Promise<T>,
  name: keyof T & string
) {
  return lazy(async () => {
    const mod = await loader();
    return { default: mod[name] as ComponentType };
  });
}

const dash = () => import('./pages/dashboard/DashboardPages');
const rewards = () => import('./pages/dashboard/RewardsPages');

const AiAssistantPage = lazyNamed(dash, 'AiAssistantPage');
const PredictorPage = lazyNamed(dash, 'PredictorPage');
const FinderPage = lazyNamed(dash, 'FinderPage');
const ComparePage = lazyNamed(dash, 'ComparePage');
const SavedPage = lazyNamed(dash, 'SavedPage');
const CounsellingPage = lazyNamed(dash, 'CounsellingPage');
const DashSeatMatrixPage = lazyNamed(dash, 'DashSeatMatrixPage');
const DocumentsPage = lazyNamed(dash, 'DocumentsPage');
const DownloadsPage = lazyNamed(dash, 'DownloadsPage');
const ApplicationsPage = lazyNamed(dash, 'ApplicationsPage');
const NotificationsPage = lazyNamed(dash, 'NotificationsPage');
const SubscriptionPage = lazyNamed(dash, 'SubscriptionPage');
const ProfilePage = lazyNamed(dash, 'ProfilePage');
const SettingsPage = lazyNamed(dash, 'SettingsPage');
const SupportPage = lazyNamed(dash, 'SupportPage');

const ReferEarnPage = lazyNamed(rewards, 'ReferEarnPage');
const WalletPage = lazyNamed(rewards, 'WalletPage');
const LeaderboardPage = lazyNamed(rewards, 'LeaderboardPage');
const BadgesPage = lazyNamed(rewards, 'BadgesPage');
const ChallengesPage = lazyNamed(rewards, 'ChallengesPage');
const CouponsPage = lazyNamed(rewards, 'CouponsPage');
const EarningsAnalyticsPage = lazyNamed(rewards, 'EarningsAnalyticsPage');
const WithdrawalsPage = lazyNamed(rewards, 'WithdrawalsPage');

/* Admin CRM */
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const adminPages = () => import('./pages/admin/AdminPages');
const AdminOverviewPage = lazyNamed(adminPages, 'AdminOverviewPage');
const AdminStaffPage = lazyNamed(adminPages, 'AdminStaffPage');
const AdminStudentsPage = lazyNamed(adminPages, 'AdminStudentsPage');
const AdminStudentDetailPage = lazyNamed(adminPages, 'AdminStudentDetailPage');
const AdminActivityPage = lazyNamed(adminPages, 'AdminActivityPage');
const AdminSessionsPage = lazyNamed(adminPages, 'AdminSessionsPage');
const AdminFollowupsPage = lazyNamed(adminPages, 'AdminFollowupsPage');
const AdminPurchasesPage = lazyNamed(adminPages, 'AdminPurchasesPage');
const AdminWithdrawalsPage = lazyNamed(adminPages, 'AdminWithdrawalsPage');
const AdminNotifyPage = lazyNamed(adminPages, 'AdminNotifyPage');

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="packages" element={<L><Packages /></L>} />
          <Route path="neet-ug" element={<L><ExamPage /></L>} />
          <Route path="neet-pg" element={<L><ExamPage /></L>} />
          <Route path="neet-mds" element={<L><ExamPage /></L>} />
          <Route path="neet-ss" element={<L><ExamPage /></L>} />
          <Route path="inicet" element={<L><ExamPage /></L>} />
          <Route path="dnb-pdcet" element={<L><ExamPage /></L>} />
          <Route path="bds" element={<L><ExamPage /></L>} />
          <Route path="bams" element={<L><ExamPage /></L>} />
          <Route path="bhms" element={<L><ExamPage /></L>} />
          <Route path="ayush-combo" element={<L><ExamPage /></L>} />
          <Route path="rank-calculator" element={<L><RankCalculator /></L>} />
          <Route path="testimonials" element={<L><TestimonialsPage /></L>} />
          <Route path="blogs" element={<L><Blogs /></L>} />
          <Route path="blogs/:slug" element={<L><BlogPost /></L>} />
          <Route path="about-us" element={<L><About /></L>} />
          <Route path="careers" element={<L><Careers /></L>} />
          <Route path="login" element={<L><Login /></L>} />
          <Route path="colleges" element={<L><Colleges /></L>} />
          <Route path="cutoffs" element={<L><Cutoffs /></L>} />
          <Route path="seat-matrix" element={<L><SeatMatrix /></L>} />
          <Route path="compare" element={<L><Compare /></L>} />
          <Route path="contact" element={<L><Contact /></L>} />
          <Route path="design-system" element={<L><DesignSystem /></L>} />
          <Route path="components" element={<L><ComponentLibrary /></L>} />
          <Route path="privacy-policy" element={<L><Policy /></L>} />
          <Route path="package-policy" element={<L><Policy /></L>} />
          <Route path="fair-use-policy" element={<L><Policy /></L>} />
          <Route path="terms-and-conditions" element={<L><Policy /></L>} />
          <Route path="cookie-policy" element={<L><Policy /></L>} />
          <Route path="influencer-program" element={<L><Policy /></L>} />
        </Route>

        <Route
          path="onboarding"
          element={
            <ProtectedRoute checkOnboarding={false}>
              <L>
                <OnboardingPage />
              </L>
            </ProtectedRoute>
          }
        />

        <Route
          path="admin"
          element={
            <ProtectedRoute checkOnboarding={false}>
              <L>
                <AdminLayout />
              </L>
            </ProtectedRoute>
          }
        >
          <Route index element={<L><AdminOverviewPage /></L>} />
          <Route path="staff" element={<L><AdminStaffPage /></L>} />
          <Route path="students" element={<L><AdminStudentsPage /></L>} />
          <Route path="students/:id" element={<L><AdminStudentDetailPage /></L>} />
          <Route path="activity" element={<L><AdminActivityPage /></L>} />
          <Route path="sessions" element={<L><AdminSessionsPage /></L>} />
          <Route path="followups" element={<L><AdminFollowupsPage /></L>} />
          <Route path="purchases" element={<L><AdminPurchasesPage /></L>} />
          <Route path="withdrawals" element={<L><AdminWithdrawalsPage /></L>} />
          <Route path="notifications" element={<L><AdminNotifyPage /></L>} />
        </Route>

        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <L>
                <DashboardLayout />
              </L>
            </ProtectedRoute>
          }
        >
          <Route index element={<L><DashboardHome /></L>} />
          <Route path="ai" element={<L><AiAssistantPage /></L>} />
          <Route path="predictor" element={<L><PredictorPage /></L>} />
          <Route path="competition-map" element={<L><CompetitionMapPage /></L>} />
          <Route path="finder" element={<L><FinderPage /></L>} />
          <Route path="compare" element={<L><ComparePage /></L>} />
          <Route path="saved" element={<L><SavedPage /></L>} />
          <Route path="counselling" element={<L><CounsellingPage /></L>} />
          <Route path="seat-matrix" element={<L><DashSeatMatrixPage /></L>} />
          <Route path="documents" element={<L><DocumentsPage /></L>} />
          <Route path="downloads" element={<L><DownloadsPage /></L>} />
          <Route path="applications" element={<L><ApplicationsPage /></L>} />
          <Route path="notifications" element={<L><NotificationsPage /></L>} />
          <Route path="refer" element={<L><ReferEarnPage /></L>} />
          <Route path="referrals" element={<L><ReferEarnPage /></L>} />
          <Route path="referral" element={<L><ReferEarnPage /></L>} />
          <Route path="rewards" element={<L><ReferEarnPage /></L>} />
          <Route path="wallet" element={<L><WalletPage /></L>} />
          <Route path="leaderboard" element={<L><LeaderboardPage /></L>} />
          <Route path="badges" element={<L><BadgesPage /></L>} />
          <Route path="challenges" element={<L><ChallengesPage /></L>} />
          <Route path="coupons" element={<L><CouponsPage /></L>} />
          <Route path="earnings" element={<L><EarningsAnalyticsPage /></L>} />
          <Route path="withdrawals" element={<L><WithdrawalsPage /></L>} />
          <Route path="subscription" element={<L><SubscriptionPage /></L>} />
          <Route path="plans" element={<L><SubscriptionPage /></L>} />
          <Route path="pricing" element={<L><SubscriptionPage /></L>} />
          <Route path="billing" element={<L><SubscriptionPage /></L>} />
          <Route path="membership" element={<L><SubscriptionPage /></L>} />
          <Route path="premium" element={<L><SubscriptionPage /></L>} />
          <Route path="packages" element={<L><SubscriptionPage /></L>} />
          <Route path="courses" element={<L><CounsellingPage /></L>} />
          <Route path="profile" element={<L><ProfilePage /></L>} />
          <Route path="settings" element={<L><SettingsPage /></L>} />
          <Route path="support" element={<L><SupportPage /></L>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Global 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
