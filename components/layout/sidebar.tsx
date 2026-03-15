"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  FileCode2,
  Users,
  PenLine,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  FolderOpen,
  Building2,
  Building,
  ScrollText,
  UserCog,
  Bell,
  BarChart3,
  History,
  ClipboardList,
  FileCheck,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import NotificationsPopup from "./notifications-popup";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/documentos", icon: FileText, label: "Documentos" },
  { href: "/demandas", icon: ClipboardList, label: "Demandas" },
  { href: "/pastas", icon: FolderOpen, label: "Pastas" },
  { href: "/para-assinar", icon: PenLine, label: "Para Assinar" },
  { href: "/templates", icon: FileCode2, label: "Templates" },
  { href: "/assinantes", icon: Users, label: "Assinantes" },
  { href: "/prefeituras", icon: Building2, label: "Prefeituras" },
  { href: "/empresas", icon: Building, label: "Empresas" },
  { href: "/editais", icon: ScrollText, label: "Editais" },
  { href: "/atas", icon: FileCheck, label: "Atas" },
];

const adminNavItems = [
  { href: "/colaboradores", icon: UserCog, label: "Colaboradores" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/audit-logs", icon: History, label: "Logs de Auditoria" },
];

interface SidebarProps {
  userName?: string;
  userRole?: string;
}

export default function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: session } = useSession() ?? {};

  const userPermissions: string[] = (session?.user as any)?.permissions ?? [];
  const isAdmin = userRole === "ADMIN";

  const visibleNavItems = isAdmin
    ? navItems
    : navItems.filter((item) => {
        const moduleKey = item.href.replace("/", "");
        return userPermissions.includes(moduleKey);
      });

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
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [session, fetchUnreadCount]);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      className="fixed left-0 top-0 h-screen bg-[#1E3A5F] flex flex-col z-40 shadow-xl overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 relative flex-shrink-0">
          <Image
            src="/cimag-logo.png"
            alt="CIMAG Logo"
            fill
            className="object-contain"
          />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white font-bold text-xl whitespace-nowrap"
            >
              CimagFlow
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                active
                  ? "bg-emerald-500 text-white shadow-lg"
                  : "text-blue-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
        
        {/* Notificações com Badge */}
        <button
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
            notificationsOpen
              ? "bg-emerald-500 text-white shadow-lg"
              : "text-blue-200 hover:bg-white/10 hover:text-white"
          }`}
        >
          <div className="relative flex-shrink-0">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between flex-1"
              >
                <span className="text-sm font-medium whitespace-nowrap">
                  Notificações
                </span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-2 flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        
        {/* Notifications Popup */}
        <NotificationsPopup
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          unreadCount={unreadCount}
          onUpdate={fetchUnreadCount}
          collapsed={collapsed}
        />
        
        {/* Admin Only Items */}
        {userRole === "ADMIN" && (
          <>
            <div className="my-2 border-t border-white/10" />
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs uppercase text-blue-300/60 px-3 py-1 font-semibold"
                >
                  Administração
                </motion.p>
              )}
            </AnimatePresence>
            {adminNavItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                    active
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "text-blue-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-white/10 p-2 space-y-1">
        <Link
          href="/perfil"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-200 hover:bg-white/10 hover:text-white transition-all"
        >
          <User className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-sm font-medium text-white truncate max-w-[140px]">{userName ?? "Usuário"}</p>
                <p className="text-xs text-blue-300">{userRole === "ADMIN" ? "Administrador" : "Colaborador"}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-200 hover:bg-red-500/20 hover:text-red-300 transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center px-3 py-2 rounded-xl text-blue-300 hover:bg-white/10 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </motion.aside>
  );
}
