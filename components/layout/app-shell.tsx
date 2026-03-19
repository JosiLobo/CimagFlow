"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "./sidebar";
import NotificationsPopup from "./notifications-popup";
import { Menu, X, Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession() ?? {};
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userName = (session?.user as any)?.name ?? "";
  const userRole = (session?.user as any)?.role ?? "";

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=true");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || data.notifications?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    fetchUnreadCount();

    let interval: ReturnType<typeof setInterval>;

    const startPolling = () => {
      interval = setInterval(fetchUnreadCount, 30000);
    };
    const stopPolling = () => {
      clearInterval(interval);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [session, fetchUnreadCount]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar
          userName={mounted ? userName : ""}
          userRole={mounted ? userRole : ""}
          onCollapseChange={setSidebarCollapsed}
        />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64">
            <Sidebar userName={mounted ? userName : ""} userRole={mounted ? userRole : ""} />
          </div>
          <button
            className="absolute top-4 right-4 text-white z-10"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-[240px]'}`}>
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-2.5 flex items-center gap-4 sticky top-0 z-30">
          <button
            className="md:hidden text-gray-600 hover:text-gray-900"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Notifications - Top Left */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                notificationsOpen
                  ? "bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-md shadow-[#1E3A5F]/15"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <div className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] px-0.5 flex items-center justify-center ring-2 ring-white"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.span>
                )}
              </div>
              <span className="font-medium">Notificações</span>
              {unreadCount > 0 && (
                <span className={`text-[11px] font-semibold rounded-md px-1.5 py-0.5 ${
                  notificationsOpen
                    ? "bg-white/20 text-white"
                    : "bg-red-50 text-red-600"
                }`}>
                  {unreadCount}
                </span>
              )}
            </button>

            <NotificationsPopup
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
              unreadCount={unreadCount}
              onUpdate={fetchUnreadCount}
              position="header"
            />
          </div>

          <div className="flex-1" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
