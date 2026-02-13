import { lazy, Suspense, Component } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/ui/PageTransition';
import { ShimmerLoader } from './components/ui/ShimmerLoader';

const Landing = lazy(() => import('./pages/Landing'));
const ChatSession = lazy(() => import('./pages/ChatSession'));
const VoiceSession = lazy(() => import('./pages/VoiceSession'));
const CameraSession = lazy(() => import('./pages/CameraSession'));
const FeedbackView = lazy(() => import('./pages/FeedbackView'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

const pageLoaderStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: 16,
    padding: 40,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    animation: 'pulse-glow 2s ease-in-out infinite',
  },
};

function PageLoader() {
  return (
    <div style={pageLoaderStyles.container}>
      <div style={pageLoaderStyles.spinner} />
      <ShimmerLoader width={200} height={16} borderRadius={8} />
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: 20,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ color: '#dc2626', marginBottom: 16 }}>Something went wrong</h1>
          <p style={{ color: '#6b7280' }}>An error occurred while loading this page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: 72, marginBottom: 16, color: '#1f2937' }}>404</h1>
      <p style={{ fontSize: 18, color: '#6b7280' }}>Page not found</p>
    </div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageTransition>
                  <Landing />
                </PageTransition>
              }
            />
            <Route
              path="/chat"
              element={
                <PageTransition>
                  <ChatSession />
                </PageTransition>
              }
            />
            <Route
              path="/voice"
              element={
                <PageTransition>
                  <VoiceSession />
                </PageTransition>
              }
            />
            <Route
              path="/camera"
              element={
                <PageTransition>
                  <CameraSession />
                </PageTransition>
              }
            />
            <Route
              path="/feedback/:sessionId"
              element={
                <PageTransition>
                  <FeedbackView />
                </PageTransition>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PageTransition>
                  <Dashboard />
                </PageTransition>
              }
            />
            <Route
              path="*"
              element={
                <PageTransition>
                  <NotFound />
                </PageTransition>
              }
            />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </ErrorBoundary>
  );
}
