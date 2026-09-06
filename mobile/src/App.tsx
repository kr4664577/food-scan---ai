import React from 'react';
import { useAppStore } from './store/useAppStore';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';

import { SplashScreen } from './screens/1_SplashScreen';
import { OnboardingScreen } from './screens/2_OnboardingScreen';
import { AuthScreen } from './screens/3_AuthScreen';
import { DashboardScreen } from './screens/4_DashboardScreen';
import { ScanSelectionScreen } from './screens/5_ScanSelectionScreen';
import { CameraScreen } from './screens/6_CameraScreen';
import { ImagePreviewScreen } from './screens/7_ImagePreviewScreen';
import { AIProcessingScreen } from './screens/8_AIProcessingScreen';
import { PackagedReportScreen } from './screens/9_PackagedReportScreen';
import { MealReportScreen } from './screens/10_MealReportScreen';
import { QualityReportScreen } from './screens/11_QualityReportScreen';
import { HistoryScreen } from './screens/12_HistoryScreen';
import { FavoritesScreen } from './screens/13_FavoritesScreen';
import { ProfileScreen } from './screens/14_ProfileScreen';
import { SettingsScreen } from './screens/15_SettingsScreen';
import { PrivacyDisclaimerScreen } from './screens/16_PrivacyDisclaimerScreen';

export const App: React.FC = () => {
  const { currentScreen } = useAppStore();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'SPLASH': return <SplashScreen />;
      case 'ONBOARDING': return <OnboardingScreen />;
      case 'AUTH': return <AuthScreen />;
      case 'DASHBOARD': return <DashboardScreen />;
      case 'SCAN_SELECTION': return <ScanSelectionScreen />;
      case 'CAMERA': return <CameraScreen />;
      case 'IMAGE_PREVIEW': return <ImagePreviewScreen />;
      case 'AI_PROCESSING': return <AIProcessingScreen />;
      case 'PACKAGED_REPORT': return <PackagedReportScreen />;
      case 'MEAL_REPORT': return <MealReportScreen />;
      case 'QUALITY_REPORT': return <QualityReportScreen />;
      case 'HISTORY': return <HistoryScreen />;
      case 'FAVORITES': return <FavoritesScreen />;
      case 'PROFILE': return <ProfileScreen />;
      case 'SETTINGS': return <SettingsScreen />;
      case 'PRIVACY': return <PrivacyDisclaimerScreen />;
      default: return <DashboardScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Mobile Shell Wrapper Frame - Clean White Container */}
      <div className="w-full max-w-md mx-auto min-h-screen relative flex flex-col bg-white border-x border-slate-200 shadow-xl">
        <Header />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {renderScreen()}
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
};

export default App;
