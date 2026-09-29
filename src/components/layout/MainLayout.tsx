import React, { Suspense, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ImpersonationBanner from '../common/ImpersonationBanner';
import ErrorBoundary from '../ux/ErrorBoundary';
import SessionTimeout from '../ux/SessionTimeout';
import PageLoader from '../ux/PageLoader';

export default function MainLayout() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Standalone website mode (no sidebar, no clinical app header, full-width viewport):
  // Strictly for the 'Equipment Marketplace' user role.
  // Super Admin ALWAYS retains the management sidebar and app header on every page!
  const isMarketplaceWebsiteMode = currentUser?.role === 'Equipment Marketplace';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-100 relative">
      <ImpersonationBanner />
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Mobile sidebar overlay */}
      {!isMarketplaceWebsiteMode && sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-60 h-full">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMarketplaceWebsiteMode && sidebarOpen && (
        <div className="hidden lg:block shrink-0 h-full transition-all duration-200">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* App header for administrative & clinical users */}
        {!isMarketplaceWebsiteMode && (
          <Header sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        )}

        <main className={`flex-1 overflow-y-auto ${isMarketplaceWebsiteMode ? 'p-0' : 'p-4 md:p-6'}`}>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      </div>

      <SessionTimeout />
    </div>
  );
}
