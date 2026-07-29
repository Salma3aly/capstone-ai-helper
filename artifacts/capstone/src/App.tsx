import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { lazy, Suspense } from 'react';

const queryClient = new QueryClient();

// Lazy-loaded pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const AuthPage = lazy(() => import('@/pages/AuthPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const DashboardLayout = lazy(() => import('@/pages/DashboardLayout'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SandboxPage = lazy(() => import('@/pages/SandboxPage'));
const SandboxBuilderPage = lazy(() => import('@/pages/SandboxBuilderPage'));
const CitationPage = lazy(() => import('@/pages/CitationPage'));
const ResearchPage = lazy(() => import('@/pages/ResearchPage'));
const ResearchDetailPage = lazy(() => import('@/pages/ResearchDetailPage'));
const HubPage = lazy(() => import('@/pages/HubPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ExamplesPage = lazy(() => import('@/pages/ExamplesPage'));
const ExampleDetailPage = lazy(() => import('@/pages/ExampleDetailPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFound = lazy(() => import('@/pages/not-found'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="w-8 h-8 rounded-full border-2 border-[#fbcfe8] border-t-[#ec4899] animate-spin" />
    </div>
  );
}

function DashboardRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DashboardLayout>
        <Switch>
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/sandbox/:id" component={SandboxBuilderPage} />
          <Route path="/sandbox" component={SandboxPage} />
          <Route path="/citation" component={CitationPage} />
          <Route path="/research/:id" component={ResearchDetailPage} />
          <Route path="/research" component={ResearchPage} />
          <Route path="/hub" component={HubPage} />
          <Route path="/projects" component={ProjectsPage} />
          <Route path="/examples/:id" component={ExampleDetailPage} />
          <Route path="/examples" component={ExamplesPage} />
          <Route path="/settings" component={SettingsPage} />
        </Switch>
      </DashboardLayout>
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
      <Route path="/auth" component={() => <Suspense fallback={<PageLoader />}><AuthPage /></Suspense>} />
      <Route path="/chat" component={() => <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>} />
      <Route path="/dashboard" component={DashboardRoutes} />
      <Route path="/sandbox/:id" component={DashboardRoutes} />
      <Route path="/sandbox" component={DashboardRoutes} />
      <Route path="/citation" component={DashboardRoutes} />
      <Route path="/research/:id" component={DashboardRoutes} />
      <Route path="/research" component={DashboardRoutes} />
      <Route path="/hub" component={DashboardRoutes} />
      <Route path="/projects" component={DashboardRoutes} />
      <Route path="/examples/:id" component={DashboardRoutes} />
      <Route path="/examples" component={DashboardRoutes} />
      <Route path="/settings" component={DashboardRoutes} />
      <Route component={() => <Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
