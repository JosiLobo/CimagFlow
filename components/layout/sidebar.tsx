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
  Briefcase,
  ScrollText,
  UserCog,
  BarChart3,
  History,
  ClipboardList,
  BookOpenCheck,
  BadgeCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/documentos", icon: FileText, label: "Documentos" },
  { href: "/demandas", icon: ClipboardList, label: "Demandas" },
  { href: "/credenciamentos", icon: BadgeCheck, label: "Credenciamentos" },
  { href: "/pastas", icon: FolderOpen, label: "Pastas" },
  { href: "/para-assinar", icon: PenLine, label: "Para Assinar" },
  { href: "/modelos", icon: FileCode2, label: "Modelos" },
  { href: "/assinantes", icon: Users, label: "Assinantes" },
  { href: "/prefeituras", icon: Building2, label: "Prefeituras" },
  { href: "/empresas", icon: Briefcase, label: "Empresas" },
  { href: "/editais", icon: ScrollText, label: "Editais" },
  { href: "/atas", icon: BookOpenCheck, label: "Atas" },
];

const adminNavItems = [
  { href: "/colaboradores", icon: UserCog, label: "Colaboradores" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/audit-logs", icon: History, label: "Logs de Auditoria" },
];

interface SidebarProps {
  userName?: string;
  userRole?: string;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function Sidebar({ userName, userRole, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const safePathname = pathname ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession() ?? {};

  const userPermissions: string[] = (session?.user as any)?.permissions ?? [];
  const isAdmin = userRole === "ADMIN";
  const isGestor = userRole === "GESTOR";

  const visibleNavItems = (isAdmin || isGestor)
    ? navItems
    : navItems.filter((item) => {
        const moduleKey = item.href.replace("/", "");
        return userPermissions.includes(moduleKey);
      });

  const visibleAdminItems = isAdmin
    ? adminNavItems
    : isGestor
    ? adminNavItems.filter((item) => item.href !== "/colaboradores" && item.href !== "/audit-logs")
    : [];

  useEffect(() => {
    onCollapseChange?.(collapsed);
  }, [collapsed, onCollapseChange]);

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
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto sidebar-scroll">
        {visibleNavItems.map((item) => {
          const active = safePathname === item.href || safePathname.startsWith(item.href + "/");
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
        
        {/* Admin / Gestor Items */}
        {(isAdmin || isGestor) && visibleAdminItems.length > 0 && (
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
            {visibleAdminItems.map((item) => {
              const active = safePathname === item.href || safePathname.startsWith(item.href + "/");
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
                <p className="text-xs text-blue-300">{userRole === "ADMIN" ? "Administrador" : userRole === "GESTOR" ? "Gestor" : "Colaborador"}</p>
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