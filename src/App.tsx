import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/common/Header';
import { MobileNav } from './components/common/MobileNav';
import { EmergencyModal } from './components/common/EmergencyModal';
import { MedicalIDModal } from './components/common/MedicalIDModal';
import { Toast } from './components/common/Toast';

// Views
import { AuthView } from './components/views/AuthView';
import { DashboardView } from './components/views/DashboardView';
import { MedicineScannerView } from './components/views/MedicineScannerView';
import { AiAssistantView } from './components/views/AiAssistantView';
import { HealthRecordsView } from './components/views/HealthRecordsView';
import { AppointmentsView } from './components/views/AppointmentsView';
import { MapsView } from './components/views/MapsView';
import { RemindersView } from './components/views/RemindersView';
import { ProfileView } from './components/views/ProfileView';
import { SettingsView } from './components/views/SettingsView';
import { AdminView } from './components/views/AdminView';
import { HeartPulse, ShieldCheck } from 'lucide-react';

const AuthLoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
    <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
    <div className="relative z-10 flex flex-col items-center space-y-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-xl shadow-emerald-500/25">
        <HeartPulse className="w-9 h-9 text-white animate-pulse" />
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-tight">
          HealthCare<span className="text-emerald-400">+</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Restoring encrypted session...
        </p>
      </div>
    </div>
  </div>
);

const MainContent: React.FC = () => {
  const { authLoading, dataLoading, isAuthenticated, isEmailVerified, isAdmin, activeTab } = useApp();

  if (authLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated || !isEmailVerified) {
    return (
      <>
        <AuthView />
        <Toast />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'scanner':
        return <MedicineScannerView />;
      case 'ai':
        return <AiAssistantView />;
      case 'records':
        return <HealthRecordsView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'maps':
        return <MapsView />;
      case 'reminders':
        return <RemindersView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      case 'admin':
        return isAdmin ? <AdminView /> : <DashboardView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-emerald-500 selection:text-white font-sans antialiased">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {dataLoading && (
          <div className="mb-4 px-4 py-2 rounded-2xl bg-[#181818] border border-emerald-500/20 text-xs text-emerald-400 font-semibold flex items-center gap-2">
            <HeartPulse className="w-4 h-4 animate-pulse" />
            <span>Syncing your HealthCare+ Cloud Firestore vault...</span>
          </div>
        )}
        {renderActiveView()}
      </main>
      <MobileNav />
      <EmergencyModal />
      <MedicalIDModal />
      <Toast />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
