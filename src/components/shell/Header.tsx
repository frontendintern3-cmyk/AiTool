"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Bars3Icon,
  BellIcon,
  ChatBubbleLeftEllipsisIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  UserIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  getAllNotifications,
  markAllNotificationAsRead,
  markNotificationAsRead,
} from "@/axiosApis/notificaiton/getAllNotificaton";
import { getglobaldashboardstats } from "@/axiosApis/header/headerApi";

interface NotificationRow {
  id: string;
  title?: string;
  message?: string;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
}

const STATUS_OPTIONS = ["Active", "Away", "Do not disturb"] as const;

export default function Header({
  isSidebarOpen,
  onToggleSidebar,
}: {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const { user } = useAuthContext();

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("Active");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [userCount, setUserCount] = useState(0);
  const [accountCount, setAccountCount] = useState(0);
  const [clientCounts, setClientCounts] = useState({ active: 0, pending: 0 });

  const statusRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getglobaldashboardstats().then((result) => {
      if (!result?.success || !result?.data) return;
      const { users, accounts, clients } = result.data;
      setUserCount(users?.active ?? 0);
      setAccountCount(accounts?.count ?? 0);
      setClientCounts({
        active: clients?.active ?? 0,
        pending: clients?.pending ?? 0,
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const resp = await getAllNotifications();
      if (cancelled || !resp?.success) return;
      const rows: NotificationRow[] = resp.data || [];
      const unreadFromRows = rows.filter(
        (n) => n.isRead === false || n.is_read === false,
      ).length;
      setNotifications(rows);
      setUnreadCount(resp.unreadCount || unreadFromRows || 0);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (statusRef.current && !statusRef.current.contains(target)) {
        setShowStatusMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    const resp = await markNotificationAsRead();
    if (resp?.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const resp = await markAllNotificationAsRead();
    if (resp?.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, is_read: true })));
      setUnreadCount(0);
    }
  };

  const roleLabel = (user?.role as string) || "Admin";
  const displayName = `${roleLabel.charAt(0).toUpperCase()}${roleLabel.slice(1)} User`;
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-[1000] bg-white border-b border-gray-200 shadow-2xs">
      <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
          {/* Left: hamburger + logo + search + stat pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-700 transition cursor-pointer md:hidden shrink-0"
              title={isSidebarOpen ? "Collapse Menu" : "Open Menu"}
              aria-label="Toggle Sidebar Navigation"
            >
              <Bars3Icon className="w-5 h-5 text-slate-700" />
            </button>

            <a
              href="https://lms.collegewollege.com/home"
              className="flex items-center gap-2 cursor-pointer select-none shrink-0 group"
              title="Go to LMS Home"
            >
              <Image
                src="/Walruslogo.png"
                alt="Walrus Logo"
                width={36}
                height={36}
                className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col items-end justify-center leading-[0.88]">
                <span className="text-[17px] sm:text-[19px] font-[900] tracking-[-0.03em] text-[#165bf6] font-sans">
                  WALRUS
                </span>
                <span className="text-[13px] sm:text-[15px] font-[900] tracking-[-0.01em] text-[#165bf6] font-sans mt-[1px]">
                  Now!
                </span>
              </div>
            </a>

            <div className="relative hidden lg:flex items-center shrink-0">
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1 w-36 lg:w-44 xl:w-52 shadow-2xs opacity-70">
                <MagnifyingGlassIcon className="w-3.5 h-3.5 text-indigo-600 mr-1.5 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-400 truncate flex-1 select-none">
                  Ask WALRUS AI...
                </span>
                <kbd className="hidden xl:inline-flex items-center px-1 py-0.2 text-[8px] font-bold text-indigo-900 bg-slate-200/70 rounded border border-slate-200 shrink-0 ml-1">
                  ⌘ K
                </kbd>
              </div>
            </div>

            <div className="h-[32px] hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs shrink-0">
              <div className="w-5 h-5 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <UserIcon className="w-3 h-3 text-white stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h3 className="text-[10px] font-black text-slate-900 leading-none">Users</h3>
                <p className="text-[9px] text-slate-500 font-bold leading-none mt-0.5">
                  {userCount} active
                </p>
              </div>
            </div>

            <div className="h-[32px] hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs shrink-0">
              <div className="w-5 h-5 rounded-lg bg-indigo-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <BuildingOfficeIcon className="w-3 h-3 text-white stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h3 className="text-[10px] font-black text-slate-900 leading-none">Accounts</h3>
                <p className="text-[9px] text-slate-500 font-bold leading-none mt-0.5">
                  {accountCount} accounts
                </p>
              </div>
            </div>

            <div className="h-[32px] hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs shrink-0">
              <div className="w-5 h-5 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-2xs shrink-0">
                <UserGroupIcon className="w-3 h-3 text-white stroke-[2.5]" />
              </div>
              <div className="text-left">
                <h3 className="text-[10px] font-black text-slate-900 leading-none">Clients</h3>
                <p className="text-[9px] font-bold leading-none text-emerald-600 mt-0.5">
                  {clientCounts.active} Act • {clientCounts.pending} Pnd
                </p>
              </div>
            </div>
          </div>

          {/* Right: status + message + approvals + notifications + user menu */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="relative hidden md:block" ref={statusRef}>
              <button
                type="button"
                onClick={() => setShowStatusMenu((prev) => !prev)}
                className="h-9 flex items-center gap-1.5 px-2.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 text-slate-800 transition cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-bold">{status}</span>
                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {showStatusMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setStatus(option);
                        setShowStatusMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 ${
                        status === option ? "text-blue-600" : "text-slate-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-700 transition cursor-pointer hidden md:flex items-center justify-center"
              title="Messages"
            >
              <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-slate-700 stroke-[1.8]" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "https://lms.collegewollege.com/HrmsApprovalMangement";
                }
              }}
              className="h-9 hidden md:flex items-center gap-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 text-slate-800 transition cursor-pointer shrink-0"
              title="Approvals"
            >
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-slate-700 stroke-[1.8]" />
              <span className="text-xs font-black text-slate-900 tracking-tight hidden sm:inline-block">
                Approvals
              </span>
            </button>

            <div className="relative shrink-0" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifications((prev) => !prev)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-700 transition cursor-pointer relative flex items-center justify-center"
                title="Notifications"
              >
                <BellIcon className="w-5 h-5 text-slate-700 stroke-[1.8]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-2xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto mt-0 sm:mt-3 w-[calc(100vw-1rem)] sm:w-[380px] mx-auto sm:mx-0 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-[70vh] sm:max-h-[480px] overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BellIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {notifications.length === 0 ? (
                      <div className="p-6">
                        <p className="text-gray-500 text-sm text-center">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {notifications.map((notification) => {
                          const unread = notification.isRead === false || notification.is_read === false;
                          return (
                            <div
                              key={notification.id}
                              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${unread ? "bg-blue-50/60" : "bg-white"}`}
                              onClick={() => {
                                if (unread) markAsRead(notification.id);
                                setShowNotifications(false);
                              }}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="text-sm font-semibold text-gray-900">
                                  {notification.title}
                                </h4>
                                {unread && <span className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1" />}
                              </div>
                              <p className="text-sm text-gray-600">{notification.message}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="h-9 flex items-center gap-1.5 pl-1 pr-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                  {avatarInitial}
                </span>
                <span className="text-xs font-bold text-slate-800 hidden sm:inline-block">
                  {displayName}
                </span>
                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
