import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
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

const MainContent: React.FC = () => {
  const { isAuthenticated, activeTab } = useApp();

  if (!isAuthenticated) {
    return <AuthView />;
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
        return <AdminView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white selection:bg-emerald-500 selection:text-white font-sans antialiased">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
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
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
