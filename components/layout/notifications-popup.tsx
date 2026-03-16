"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  Check,
  Eye,
  AlertCircle,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  MessageSquare,
  ClipboardList,
  ShieldAlert,
  Megaphone,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  relatedId?: string;
  relatedType?: string;
}

interface NotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onUpdate: () => void;
  collapsed?: boolean;
  position?: "sidebar" | "header";
}

const NOTIFICATION_ICONS: Record<string, any> = {
  DOCUMENT_SIGNED: CheckCircle2,
  DOCUMENT_PENDING: Clock,
  DOCUMENT_CANCELLED: AlertCircle,
  DEMAND_NEW: ClipboardList,
  DEMAND_UPDATE: ClipboardList,
  DEMAND_RESPONSE: MessageSquare,
  MENTION: Users,
  SYSTEM: ShieldAlert,
  ANNOUNCEMENT: Megaphone,
  DEFAULT: Bell,
};

const NOTIFICATION_STYLES: Record<string, { bg: string; icon: string; accent: string }> = {
  DOCUMENT_SIGNED: { bg: "bg-emerald-50", icon: "text-emerald-600", accent: "border-l-emerald-500" },
  DOCUMENT_PENDING: { bg: "bg-amber-50", icon: "text-amber-600", accent: "border-l-amber-500" },
  DOCUMENT_CANCELLED: { bg: "bg-red-50", icon: "text-red-600", accent: "border-l-red-500" },
  DEMAND_NEW: { bg: "bg-blue-50", icon: "text-blue-600", accent: "border-l-blue-500" },
  DEMAND_UPDATE: { bg: "bg-indigo-50", icon: "text-indigo-600", accent: "border-l-indigo-500" },
  DEMAND_RESPONSE: { bg: "bg-purple-50", icon: "text-purple-600", accent: "border-l-purple-500" },
  MENTION: { bg: "bg-cyan-50", icon: "text-cyan-600", accent: "border-l-cyan-500" },
  SYSTEM: { bg: "bg-slate-50", icon: "text-slate-600", accent: "border-l-slate-500" },
  ANNOUNCEMENT: { bg: "bg-orange-50", icon: "text-orange-600", accent: "border-l-orange-500" },
  DEFAULT: { bg: "bg-gray-50", icon: "text-gray-500", accent: "border-l-gray-400" },
};

export default function NotificationsPopup({ isOpen, onClose, unreadCount, onUpdate, collapsed = false, position = "sidebar" }: NotificationsPopupProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        onUpdate();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        onUpdate();
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  function getStyle(type: string) {
    return NOTIFICATION_STYLES[type] || NOTIFICATION_STYLES.DEFAULT;
  }

  function getIcon(type: string) {
    return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.DEFAULT;
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read) markAsRead(notification.id);
    const target = notification.link || getDefaultLink(notification.type);
    if (target) {
      onClose();
      router.push(target);
    }
  }

  function getDefaultLink(type: string): string | null {
    switch (type) {
      case "DOCUMENT_SIGNED":
      case "DOCUMENT_PENDING":
      case "DOCUMENT_CANCELLED":
        return "/documentos";
      case "DEMAND_NEW":
      case "DEMAND_UPDATE":
      case "DEMAND_RESPONSE":
      case "DEMANDA_ATRIBUIDA":
        return "/demandas";
      default:
        return "/notificacoes";
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Popup Panel */}
      <AnimatePresence>
        <motion.div
          initial={position === "header" 
            ? { opacity: 0, y: -8, scale: 0.97 }
            : { opacity: 0, x: -24, scale: 0.96 }
          }
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={position === "header"
            ? { opacity: 0, y: -8, scale: 0.97 }
            : { opacity: 0, x: -24, scale: 0.96 }
          }
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={
            position === "header"
              ? "absolute left-0 top-full mt-2 z-50 w-[420px] max-w-[calc(100vw-32px)]"
              : `fixed ${collapsed ? 'left-[72px]' : 'left-[248px]'} top-16 z-50 w-[400px] max-w-[calc(100vw-100px)]`
          }
        >
          <div className="bg-white rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] border border-gray-200/80 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-[#1E3A5F] to-[#2a5a8a]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Notificações</h3>
                  <p className="text-blue-200 text-xs">
                    {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-200 hover:text-white transition-colors font-medium bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5"
                  >
                    Ler todas
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
              {loading ? (
                <div className="p-10 text-center">
                  <div className="w-10 h-10 border-[3px] border-[#1E3A5F]/20 border-t-[#10B981] rounded-full animate-spin mx-auto" />
                  <p className="text-gray-400 text-sm mt-4 font-medium">Carregando notificações...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-semibold">Sem notificações</p>
                  <p className="text-gray-400 text-sm mt-1">Você está em dia!</p>
                </div>
              ) : (
                <div>
                  {notifications.map((notification, index) => {
                    const Icon = getIcon(notification.type);
                    const style = getStyle(notification.type);

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`px-4 py-3.5 border-l-[3px] ${style.accent} hover:bg-gray-50/80 transition-all cursor-pointer group ${
                          !notification.read ? "bg-blue-50/40" : "border-l-transparent"
                        } ${index < notifications.length - 1 ? "border-b border-gray-100" : ""}`}
                      >
                        <div className="flex gap-3 items-start">
                          {/* Icon */}
                          <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon className={`w-[18px] h-[18px] ${style.icon}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm text-gray-900 leading-snug ${!notification.read ? "font-semibold" : "font-medium"}`}>
                                {notification.title}
                              </p>
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="text-[#1E3A5F] hover:text-[#10B981] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-emerald-50 p-0.5"
                                  title="Marcar como lida"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-[13px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                              {formatDistanceToNow(new Date(notification.createdAt), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>

                          {/* Unread dot */}
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-[#10B981] flex-shrink-0 mt-2 shadow-sm shadow-emerald-200" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <Link
                  href="/notificacoes"
                  onClick={onClose}
                  className="text-sm text-[#1E3A5F] hover:text-[#10B981] font-semibold flex items-center justify-center gap-2 py-1 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Ver todas as notificações
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
