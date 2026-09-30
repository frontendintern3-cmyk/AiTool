"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Workflow as WorkflowIcon,
  Video as VideoIcon,
  Mail as MailIcon,
  Pin as PinIcon,
  ChevronsLeft,
  ChevronsRight,
  Sparkles as SparklesIcon,
  Diamond as DiamondIcon,
  Bot as BotIcon,
  Target as TargetIcon,
} from "lucide-react";
import {
  HomeIcon,
  UsersIcon,
  UserIcon,
  UserGroupIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  CalendarIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ArrowLeftOnRectangleIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UserPlusIcon,
  ClockIcon,
  ShieldCheckIcon,
  CloudArrowUpIcon,
  InboxStackIcon,
  CheckBadgeIcon,
  TruckIcon,
  ChartBarSquareIcon,
  FunnelIcon,
  ArchiveBoxIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  ArrowUpTrayIcon,
  WrenchScrewdriverIcon,
  TicketIcon,
  BellIcon,
  PresentationChartLineIcon,
  GlobeAltIcon,
  PaperAirplaneIcon,
  Square3Stack3DIcon,
  MegaphoneIcon,
  BanknotesIcon,
  ComputerDesktopIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  DocumentPlusIcon,
  FolderIcon,
  TableCellsIcon,
  DocumentMagnifyingGlassIcon,
  MagnifyingGlassIcon,
  KeyIcon,
  ListBulletIcon,
  DocumentChartBarIcon,
  BoltIcon,
  ArrowsRightLeftIcon,
  LightBulbIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import { HRMS_PERMISSIONS } from "@/utils/hrmsRbacPermissions";
import { PERMISSIONS } from "@/utils/rbacPermissions";
import { useHrmsPermissions } from "@/contexts/HrmsPermissionContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { getCurrentUser } from "@/utils/permissions";
import { getAllNotifications } from "@/axiosApis/notificaiton/getAllNotificaton";

const HrmsSidebarIcon = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M 12.5 2 C 7.253 2 3 6.253 3 11.5 C 3 13.684 3.738 15.696 4.98 17.302 L 2.5 21.5 L 7.378 19.86 C 8.904 20.584 10.655 21 12.5 21 C 17.747 21 22 16.747 22 11.5 C 22 6.253 17.747 2 12.5 2 Z M 5 11.5 C 5 7.358 8.358 4 12.5 4 C 16.642 4 20 7.358 20 11.5 C 20 15.642 16.642 19 12.5 19 C 10.96 19 9.524 18.536 8.324 17.737 L 7.892 17.449 L 5.312 18.315 L 6.258 16.685 L 5.922 16.208 C 5.333 14.831 5 13.204 5 11.5 Z"
    />
    <g opacity="0.65">
      <circle cx="8.5" cy="9.5" r="2.2" />
      <path d="M 5 16 C 5 13.2 12 13.2 12 16 Z" />
    </g>
    <g opacity="0.65">
      <circle cx="16.5" cy="9.5" r="2.2" />
      <path d="M 13 16 C 13 13.2 20 13.2 20 16 Z" />
    </g>
    <g>
      <circle cx="12.5" cy="8" r="2.6" />
      <path d="M 8.2 16.5 C 8.2 13.1 16.8 13.1 16.8 16.5 Z" />
    </g>
  </svg>
);

const LmsSidebarIcon = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <g opacity="0.75">
      <circle cx="6.5" cy="4.5" r="2.1" />
      <path d="M 2.5 11.5 C 2.5 7.8 10.5 7.8 10.5 11.5 Z" />
    </g>
    <g opacity="0.75">
      <circle cx="17.5" cy="4.5" r="2.1" />
      <path d="M 13.5 11.5 C 13.5 7.8 21.5 7.8 21.5 11.5 Z" />
    </g>
    <g>
      <circle cx="12" cy="3" r="2.6" />
      <path d="M 7.5 11.5 C 7.5 7 16.5 7 16.5 11.5 Z" />
    </g>
    <path d="M 2 12.5 L 22 12.5 L 13.8 18.5 L 13.8 23.5 L 10.2 23.5 L 10.2 18.5 Z" />
  </svg>
);

const CmsSidebarIcon = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3 4C3 2.89543 3.89543 2 5 2H19C20.1046 2 21 2.89543 21 4V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V4ZM5 4H19V7H5V4ZM5 9V20H10V9H5ZM12 9V20H19V9H12Z"
    />
    <circle cx="6" cy="5.5" r="0.8" fill="white" />
    <circle cx="8.5" cy="5.5" r="0.8" fill="white" />
  </svg>
);

const MailerSidebarIcon = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Envelope */}
    <rect x="2.5" y="5" width="15" height="12" rx="2" opacity="0.75" />

    {/* Envelope flap */}
    <path
      d="M3.5 7L10 12L16.5 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Outgoing mail / send indicator */}
    <path d="M14.5 15.5L21.5 12L14.5 8.5V11L18 12L14.5 13V15.5Z" />
  </svg>
);

// Structured 3-Tier Module Definitions
const HRMS_DASHBOARD_PERMS = [
  HRMS_PERMISSIONS.DASHBOARD.VIEW_HR,
  HRMS_PERMISSIONS.DASHBOARD.MANAGER_VIEW,
];
const HRMS_LIFECYCLE_PERMS = [
  HRMS_PERMISSIONS.LIFECYCLE.VIEW,
  HRMS_PERMISSIONS.LIFECYCLE.MANAGE,
];
const HRMS_TEAMS_PERMS = [
  HRMS_PERMISSIONS.TEAMS.VIEW,
  HRMS_PERMISSIONS.TEAMS.VIEW_HIERARCHY,
];
const HRMS_POLICIES_PERMS = [
  HRMS_PERMISSIONS.POLICIES.VIEW,
  HRMS_PERMISSIONS.POLICIES.VIEW_ALL,
];
const HRMS_ROLES_PERMS = [
  HRMS_PERMISSIONS.RBAC.ROLES_VIEW,
  HRMS_PERMISSIONS.RBAC.ROLES_VIEW_ALT,
];
const LMS_ROLES_PERMS = [
  PERMISSIONS.ROLES_MGMT.VIEW,
  PERMISSIONS.ROLES_MGMT.UPDATE,
];
const HRMS_APPROVAL_PERMS = [
  HRMS_PERMISSIONS.REQUESTS.APPROVAL_MANAGER,
  HRMS_PERMISSIONS.REQUESTS.REVIEW,
];
const LMS_APPROVAL_PERMS = [
  PERMISSIONS.CLIENTS.VIEW_ALL,
  PERMISSIONS.CLIENTS.VIEW_BASIC,
];
const LMS_DASHBOARD_PERMS = [PERMISSIONS.DASHBOARD.VIEW];
const LMS_LEADS_PERMS = [
  PERMISSIONS.LEADS.VIEW_UNMASKED,
  PERMISSIONS.LEADS.VIEW_MASKED,
];
const LMS_UPLOAD_PERMS = [
  PERMISSIONS.LEADS.UPLOAD,
  PERMISSIONS.LEADS.TEST_CREATE,
];
const MAILER_SIDEBAR_PERMS = [
  PERMISSIONS.MAILERSIDEBAR.VIEW_DOMAIN,
  PERMISSIONS.MAILERSIDEBAR.VIEW_SENDER,
];
const LMS_VENDOR_PANEL_PERMS = [PERMISSIONS.VENDOR.PANEL_VIEW];
const LMS_CLIENTS_VIEW_PERMS = [
  PERMISSIONS.CLIENTS.VIEW_ALL,
  PERMISSIONS.CLIENTS.VIEW_BASIC,
];
const LMS_CLIENTS_CREATE_PERMS = [
  PERMISSIONS.CLIENTS.CREATE_ALL,
  PERMISSIONS.CLIENTS.CREATE_LIMITED,
  PERMISSIONS.CLIENTS.CREATE_TEST,
];
const LMS_CLIENTS_PENDING_PERMS = [PERMISSIONS.CLIENTS.VIEW_PENDING];
const LMS_DELIVERY_PERMS = [PERMISSIONS.LEADS.DELIVERY];
const LMS_FILE_TEMPLATE_PERMS = [
  PERMISSIONS.TEMPLATES_FILE.VIEW,
  PERMISSIONS.TEMPLATES_FILE.VIEW_TEST,
];
const LMS_DELIVERY_TEMPLATE_PERMS = [
  PERMISSIONS.TEMPLATES_DELIVERY.VIEW,
  PERMISSIONS.TEMPLATES_DELIVERY.VIEW_TEST,
];
const LMS_BUCKETS_PERMS = [PERMISSIONS.LEAD_BUCKETS.VIEW];
const LMS_ACTIVITY_PERMS = [
  PERMISSIONS.USERS.VIEW_ALL,
  PERMISSIONS.USERS.ACTIVITY_VIEW_ALL,
  PERMISSIONS.USERS.ACTIVITY_VIEW_OPS,
  PERMISSIONS.USERS.ACTIVITY_VIEW_SELF,
  PERMISSIONS.ACTIVITY.VIEW_ALL,
  PERMISSIONS.ACTIVITY.VIEW_OPS,
  PERMISSIONS.ACTIVITY.VIEW_SELF,
];

const SEO_TOOL_CHILDREN = [
  // Overview
  {
    id: "seo-dashboard",
    label: "Dashboard",
    href: "https://brief-muse-07.lovable.app/dashboard",
    icon: Squares2X2Icon,
    adminOnly: true,
  },
  // Content Briefs
  {
    id: "seo-create-brief",
    label: "Create Brief",
    href: "https://brief-muse-07.lovable.app/",
    icon: DocumentPlusIcon,
    group: "Content Briefs",
    adminOnly: true,
  },
  {
    id: "seo-brief-history",
    label: "Brief History",
    href: "https://brief-muse-07.lovable.app/history",
    icon: ClockIcon,
    group: "Content Briefs",
    adminOnly: true,
  },
  // Website Audit
  {
    id: "seo-projects",
    label: "Projects",
    href: "https://brief-muse-07.lovable.app/projects",
    icon: FolderIcon,
    group: "Website Audit",
    adminOnly: true,
  },
  {
    id: "seo-site-audit",
    label: "Site Audit",
    href: "https://brief-muse-07.lovable.app/site-audit",
    icon: TargetIcon,
    group: "Website Audit",
    adminOnly: true,
  },
  {
    id: "seo-crawl-explorer",
    label: "Crawl Explorer",
    href: "https://brief-muse-07.lovable.app/projects",
    icon: TableCellsIcon,
    group: "Website Audit",
    adminOnly: true,
  },
  {
    id: "seo-page-audit",
    label: "Page Audit & Optimization",
    href: "https://brief-muse-07.lovable.app/page-audit?url=&keyword=",
    icon: DocumentMagnifyingGlassIcon,
    group: "Website Audit",
    adminOnly: true,
  },
  // Page Optimization
  {
    id: "seo-content-effort",
    label: "Content Effort",
    href: "https://brief-muse-07.lovable.app/quality",
    icon: DiamondIcon,
    group: "Page Optimization",
    adminOnly: true,
  },
  {
    id: "seo-optimization-history",
    label: "Optimization History",
    href: "https://brief-muse-07.lovable.app/optimization-history",
    icon: ClockIcon,
    group: "Page Optimization",
    adminOnly: true,
  },
  // Search Intent
  {
    id: "seo-explore-keyword",
    label: "Explore Keyword",
    href: "https://brief-muse-07.lovable.app/intent",
    icon: MagnifyingGlassIcon,
    group: "Search Intent",
    adminOnly: true,
  },
  {
    id: "seo-saved-research",
    label: "Saved Research",
    href: "https://brief-muse-07.lovable.app/intent-history",
    icon: ClockIcon,
    group: "Search Intent",
    adminOnly: true,
  },
  {
    id: "seo-keyword-explorer",
    label: "Keyword Explorer",
    href: "https://brief-muse-07.lovable.app/keywords",
    icon: KeyIcon,
    group: "Search Intent",
    adminOnly: true,
  },
  {
    id: "seo-serp-intelligence",
    label: "SERP Intelligence",
    href: "https://brief-muse-07.lovable.app/serp",
    icon: ListBulletIcon,
    group: "Search Intent",
    adminOnly: true,
  },

  {
    id: "seo-keyword-ranking-check",
    label: "Keyword Ranking Check",
    href: "https://brief-muse-07.lovable.app/rank-tracking",
    icon: ChartBarSquareIcon,
    group: "Performance",
    adminOnly: true,
  },
  {
    id: "seo-competitors",
    label: "Competitors",
    href: "https://brief-muse-07.lovable.app/competitors",
    icon: UsersIcon,
    group: "Performance",
    adminOnly: true,
  },
  {
    id: "seo-reports",
    label: "Reports",
    href: "https://brief-muse-07.lovable.app/reports",
    icon: DocumentChartBarIcon,
    group: "Performance",
    adminOnly: true,
  },
  // Workspace
  {
    id: "seo-integrations",
    label: "Integrations",
    href: "https://brief-muse-07.lovable.app/integrations",
    icon: BoltIcon,
    group: "Workspace",
    adminOnly: true,
  },
  {
    id: "seo-guides",
    label: "Guides",
    href: "https://brief-muse-07.lovable.app/guides",
    icon: BookOpenIcon,
    group: "Workspace",
    adminOnly: true,
  },
  {
    id: "seo-settings",
    label: "Settings",
    href: "https://brief-muse-07.lovable.app/settings",
    icon: Cog6ToothIcon,
    group: "Workspace",
    adminOnly: true,
  },
];

const DATA_TOOL_CHILDREN = [
  // AI Decision Tools
  {
    id: "dt-ai-counsellor",
    label: "AI Counsellor",
    href: "https://lms.collegewollege.com/home",
    icon: BotIcon,
    adminOnly: true,
  },
  {
    id: "dt-college-predictor",
    label: "College Predictor",
    href: "https://lms.collegewollege.com/home",
    icon: AcademicCapIcon,
    adminOnly: true,
  },
  {
    id: "dt-ai-compare",
    label: "AI Compare",
    href: "https://lms.collegewollege.com/home",
    icon: ArrowsRightLeftIcon,
    adminOnly: true,
  },
  // CW Team Control Room
  {
    id: "dt-lead-intelligence",
    label: "Lead Intelligence",
    href: "https://lms.collegewollege.com/home",
    icon: LightBulbIcon,
    group: "CW Team Control Room",
    adminOnly: true,
  },
  {
    id: "dt-content-engine",
    label: "Content Engine",
    href: "https://lms.collegewollege.com/home",
    icon: CpuChipIcon,
    group: "CW Team Control Room",
    adminOnly: true,
  },
  {
    id: "dt-reviews-reports",
    label: "Reviews & Reports",
    href: "https://lms.collegewollege.com/home",
    icon: DocumentChartBarIcon,
    group: "CW Team Control Room",
    adminOnly: true,
  },
  // Content Operations
  {
    id: "dt-content-operations",
    label: "Content Engine",
    href: "https://lms.collegewollege.com/home",
    icon: DocumentTextIcon,
    group: "Content Operations",
    adminOnly: true,
  },
];

const SIDEBAR_MODULES = [
  {
    id: "CRM",
    title: "CRM",
    subtitle: "CRM",
    headerIcon: BuildingOffice2Icon,
    headerBg: "bg-indigo-100 text-indigo-600",
    options: [
      {
        id: "crm",
        label: "CRM",
        href: "https://lms.collegewollege.com/home",
        icon: BuildingOffice2Icon,
      },
    ],
  },
  {
    id: "LMS",
    title: "LMS",
    subtitle: "LMS",
    headerIcon: LmsSidebarIcon,
    headerBg: "bg-blue-100 text-[#1d61ff]",
    options: [
      {
        id: "lms",
        label: "LMS",
        href: "https://lms.collegewollege.com/home",
        icon: LmsSidebarIcon,
      },
    ],
  },
  {
    id: "CMS",
    title: "CMS",
    subtitle: "Content & SEO Tools",
    headerIcon: CmsSidebarIcon,
    headerBg: "bg-teal-100 text-teal-700",
    adminOnly: true,
    options: [
      {
        id: "cms-content-management",
        label: "CMS (content management tool)",
        href: "https://brief-muse-07.lovable.app/",
        section: "cms-content-management",
        icon: DocumentTextIcon,
        adminOnly: true,
      },
      {
        id: "cms-seo-tool",
        label: "SEO Tool",
        href: "https://brief-muse-07.lovable.app/dashboard",
        section: "cms-seo-tool",
        icon: GlobeAltIcon,
        hasChildren: true,
        adminOnly: true,
        children: SEO_TOOL_CHILDREN,
      },
      {
        id: "cms-data-tool",
        label: "DATA tool",
        href: "https://lms.collegewollege.com/home",
        section: "cms-data-tool",
        icon: Square3Stack3DIcon,
        hasChildren: true,
        adminOnly: true,
        children: DATA_TOOL_CHILDREN,
      },
      {
        id: "cms-ai-visibility-report",
        label: "AI Visibility report",
        // This is our audit tool — it lives in this same app, so it's an
        // internal link (handleNavClick routes it) rather than the external
        // Lovable placeholder URL every other CMS item still points at.
        href: "/",
        section: "cms-ai-visibility-report",
        icon: SparklesIcon,
        adminOnly: true,
      },

    ],
  },
  {
    id: "AM",
    title: "Approval",
    subtitle: "Approval Management",
    headerIcon: CheckBadgeIcon,
    headerBg: "bg-emerald-100 text-emerald-600",
    permissions: HRMS_APPROVAL_PERMS,
    lmsPermissions: LMS_APPROVAL_PERMS,
    options: [
      {
        id: "Approval Management",
        label: "Approval Management",
        href: "https://lms.collegewollege.com/HrmsApprovalMangement",
        section: "hrms-approval-management",
        icon: CheckBadgeIcon,
        permissions: HRMS_APPROVAL_PERMS,
        lmsPermissions: LMS_APPROVAL_PERMS,
      },
    ],
  },
  {
    id: "HRMS",
    title: "HRMS",
    subtitle: "HRMS",
    headerIcon: HrmsSidebarIcon,
    headerBg: "bg-indigo-100 text-indigo-600",
    options: [
      {
        id: "hrms",
        label: "HRMS",
        href: "https://lms.collegewollege.com/home",
        icon: HrmsSidebarIcon,
      },
    ],
  },
  {
    id: "TK",
    title: "Tickets",
    subtitle: "Ticket & Task",
    headerIcon: TicketIcon,
    headerBg: "bg-rose-100 text-rose-600",
    options: [
      {
        id: "Ticket",
        label: "Ticket & Task",
        href: "https://lms.collegewollege.com/Ticket&Task",
        icon: TicketIcon,
      },
    ],
  },
  {
    id: "WF",
    title: "Workflow",
    subtitle: "Workflow",
    headerIcon: WorkflowIcon,
    headerBg: "bg-amber-100 text-amber-600",
    adminOnly: true,
    options: [
      { id: "workflow", label: "Workflow", href: "/Workflow", section: "workflow", icon: WorkflowIcon, adminOnly: true }
    ]
  },
  {
    id: "ML",
    title: "Mailer",
    subtitle: "Mailer",
    headerIcon: MailIcon,
    headerBg: "bg-blue-100 text-blue-600",
    options: [
      {
        id: "mailer",
        label: "Mailer",
        href: "https://lms.collegewollege.com",
        icon: MailIcon,
      },
    ],
  },
  {
    id: "RM",
    title: "Roles",
    subtitle: "Role & Permissions",
    headerIcon: ShieldCheckIcon,
    headerBg: "bg-purple-100 text-purple-600",
    permissions: HRMS_ROLES_PERMS,
    lmsPermissions: LMS_ROLES_PERMS,
    options: [
      {
        id: "role-management",
        label: "Role & Permissions",
        href: "https://lms.collegewollege.com/roles-hrmanagement",
        section: "roles-hrmanagement",
        icon: ShieldCheckIcon,
        permissions: HRMS_ROLES_PERMS,
        lmsPermissions: LMS_ROLES_PERMS,
      },
    ],
  },
];

export default function Sidebar({
  isOpen,
  handleClick,
  activeSection,
  onSectionChange,
  isCollapsed = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const wrapperRef = useRef(null);
  const { user } = useAuthContext();
  const { hasAnyPermission: hasAnyHrmsPermission } = useHrmsPermissions();
  const {
    hasAnyPermission: hasAnyLmsPermission,
    loading: lmsLoading,
    initialized: lmsInitialized,
    roleName,
    role,
  } = usePermissions();
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check if current user is an Administrator
  const isAdmin = useMemo(() => {
    if (!isMounted) return false;

    const checkRoleStr = (r) => {
      if (!r) return false;
      const s = String(r).toLowerCase().replace(/[\s_-]+/g, "");
      return s === "admin" || s === "superadmin";
    };

    const permUser = getCurrentUser();
    const effectiveUser = user || permUser;
    if (checkRoleStr(roleName)) return true;
    if (checkRoleStr(role?.role || role?.name || role)) return true;
    if (
      checkRoleStr(
        effectiveUser?.role?.role ||
        effectiveUser?.role?.name ||
        effectiveUser?.role ||
        effectiveUser?.userRole
      )
    ) {
      return true;
    }

    try {
      const rawLocal = localStorage.getItem("user");
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (
          checkRoleStr(
            parsed?.role?.role ||
            parsed?.role?.name ||
            parsed?.role ||
            parsed?.userRole
          )
        ) {
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }, [isMounted, roleName, role, user]);

  // Filter nav items by assigned HRMS/LMS permissions and adminOnly restriction
  const canSeeNavItem = useCallback((item) => {
    if (!item) return false;

    // Items marked adminOnly can ONLY be viewed by administrators
    if (item.adminOnly && !isAdmin) {
      return false;
    }

    const hrmsPerms = item?.permissions;
    const lmsPerms = item?.lmsPermissions;
    if (!hrmsPerms?.length && !lmsPerms?.length) return true;
    if (hrmsPerms?.length && hasAnyHrmsPermission(hrmsPerms)) return true;
    if (lmsPerms?.length) {
      if (hasAnyLmsPermission && hasAnyLmsPermission(lmsPerms)) return true;
      if (lmsLoading || !lmsInitialized) return true;
      return true; // Default fallback to ensure all LMS navigation options are displayed
    }
    return false;
  }, [isAdmin, hasAnyHrmsPermission, hasAnyLmsPermission, lmsLoading, lmsInitialized]);

  useEffect(() => {
    let cancelled = false;

    const loadUnreadCount = async () => {
      try {
        const result = await getAllNotifications();
        if (cancelled || !result?.success) return;
        const unreadFromApi = Number(result.unreadCount || 0);
        const unreadFromRows = (result.data || []).filter(
          (item) => item?.isRead === false || item?.is_read === false,
        ).length;
        setUnreadNotificationCount(unreadFromApi || unreadFromRows);
      } catch (error) {
        console.error("Failed to load sidebar notification count:", error);
      }
    };

    loadUnreadCount();
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Desktop hover and click-hold states
  const [isPrimaryHovered, setIsPrimaryHovered] = useState(false);
  const [isTertiaryHovered, setIsTertiaryHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false); // Secondary Sidebar Pin
  const [isTertiaryPinned, setIsTertiaryPinned] = useState(false); // Tertiary Sidebar Pin

  // Manual slim toggles for Tier 2 and Tier 3 sidebars
  const [isSecondarySlimManual, setIsSecondarySlimManual] = useState(false);
  const [isTertiarySlimManual, setIsTertiarySlimManual] = useState(false);

  // Active module ID for Desktop Tier 2 (e.g. 'LMS', 'HRMS', 'CMS')
  const [activeModuleId, setActiveModuleId] = useState(null);

  // Active secondary option ID for Desktop Tier 3 (e.g. 'dashboard', 'clients', 'delivery')
  const [activeSecondaryOptionId, setActiveSecondaryOptionId] = useState(null);

  // Timer refs for 1-second (1000ms) expand & close delays
  const moduleTimerRef = useRef(null);
  const secondaryTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const clearAllTimers = () => {
    if (moduleTimerRef.current) clearTimeout(moduleTimerRef.current);
    if (secondaryTimerRef.current) clearTimeout(secondaryTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  // Close timer helper: Schedules sidebar closing in 1000ms
  const scheduleClose = () => {
    if (isPinned || isTertiaryPinned) return; // Hold sidebars displayed if any is pinned by user
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsPrimaryHovered(false);
      if (!isPinned) setActiveModuleId(null);
      if (!isTertiaryPinned) {
        setActiveSecondaryOptionId(null);
        setIsTertiaryHovered(false);
      }
    }, 1000);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleModuleHover = (moduleId) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (secondaryTimerRef.current) clearTimeout(secondaryTimerRef.current);
    const mod = visibleModules.find((m) => m.id === moduleId);
    if (mod && mod.options?.length === 1 && !mod.options[0].hasChildren) {
      setActiveModuleId(null);
      setActiveSecondaryOptionId(null);
      setIsTertiaryHovered(false);
      return;
    }
    setActiveModuleId(moduleId);
    setActiveSecondaryOptionId(null);
    setIsTertiaryHovered(false);
  };

  const handleSecondaryHover = () => {
    // Tertiary sidebar opens strictly on user click, not on hover
  };

  const handleDesktopMouseLeave = () => {
    // Do not auto-close on mouse hover out; keep open until user clicks close (X) button or clicks on outer window
    return;
  };

  const handleDesktopMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
  };

  // Mobile accordion state
  const [openMobileModuleId, setOpenMobileModuleId] = useState(null);
  const [openMobileSubId, setOpenMobileSubId] = useState(null);

  const toggleMobileModule = (id) => {
    setOpenMobileModuleId((prev) => (prev === id ? null : id));
    setOpenMobileSubId(null);
  };

  const toggleMobileSub = (id) => {
    setOpenMobileSubId((prev) => (prev === id ? null : id));
  };

  // Persistent pinned state from localStorage for both Tier 2 and Tier 3
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPin = localStorage.getItem("sidebar_is_pinned") === "true";
      const savedModule = localStorage.getItem("sidebar_pinned_module");
      const savedTertPin = localStorage.getItem("sidebar_tertiary_pinned") === "true";
      const savedTertOption = localStorage.getItem("sidebar_tertiary_option");

      if (savedPin) {
        setIsPinned(true);
        if (savedModule && !["LMS", "HRMS", "CRM", "AM", "TK", "RM", "ML"].includes(savedModule)) {
          setActiveModuleId(savedModule);
        }
      }
      if (savedTertPin) {
        setIsTertiaryPinned(true);
        if (savedTertOption) {
          setActiveSecondaryOptionId(savedTertOption);
        }
      }
    }
  }, []);

  // Close desktop sidebars when clicking outside (respects individual pin states)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isPinned && isTertiaryPinned) return; // Hold all sidebars if both are pinned
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        clearAllTimers();
        setIsPrimaryHovered(false);
        if (!isPinned) {
          setActiveModuleId(null);
        }
        if (!isTertiaryPinned) {
          setActiveSecondaryOptionId(null);
          setIsTertiaryHovered(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPinned, isTertiaryPinned]);

  // Auto-detect active module based on route change ONLY
  useEffect(() => {
    const p = (pathname || "").toLowerCase();
    let detectedModule = null;
    if (p.startsWith("/roles-hrmanagement") || p === "/roles") {
      detectedModule = "RM";
    } else if (
      p.startsWith("/hrmsapprovalmangement") ||
      p.startsWith("/clients/approval")
    ) {
      detectedModule = "AM";
    } else if (
      p.startsWith("/accounts") ||
      p.startsWith("/meetings-calls") ||
      p.startsWith("/field-operation") ||
      p.startsWith("/collections")
    ) {
      detectedModule = "CRM";
    } else if (p.startsWith("/ticket") || p.startsWith("/task")) {
      detectedModule = "TK";
    } else if (p.startsWith("/workflow")) {
      detectedModule = "WF";
    } else if (
      p === "/" ||
      p.startsWith("/audit") ||
      p.startsWith("/cms") ||
      p.startsWith("/seo") ||
      p.startsWith("/data-tool") ||
      p.startsWith("/ai-visibility")
    ) {
      detectedModule = "CMS";
    } else if (
      p.startsWith("/hrms") ||
      p.startsWith("/employee-lifecycle") ||
      p.startsWith("/view-team") ||
      p.startsWith("/hr-panel") ||
      p.startsWith("/payroll") ||
      p.startsWith("/expense-management") ||
      p.startsWith("/asset-management") ||
      p.startsWith("/company-policies") ||
      p.startsWith("/company-holiday") ||
      p.startsWith("/hrmsactivitylogs")
    ) {
      detectedModule = "HRMS";
    } else if (p.startsWith("/mailer")) {
      detectedModule = "ML";
    }

    setOpenMobileModuleId(detectedModule);

    // Sync active module on route change: if pinned, track the route's module; if unpinned, close flyout
    setActiveModuleId(() => {
      const savedPin =
        typeof window !== "undefined" &&
        localStorage.getItem("sidebar_is_pinned") === "true";
      if (savedPin) {
        if (typeof window !== "undefined") {
          localStorage.setItem("sidebar_pinned_module", detectedModule);
        }
        return detectedModule;
      }
      return null;
    });
  }, [pathname]);

  const visibleModules = useMemo(() => {
    return SIDEBAR_MODULES.map((module) => {
      if (!canSeeNavItem(module)) return null;

      const options = (module.options || [])
        .map((option) => {
          if (!option.hasChildren || !option.children?.length) {
            return canSeeNavItem(option) ? option : null;
          }
          const children = option.children.filter(canSeeNavItem);
          if (!children.length) return null;
          return { ...option, children };
        })
        .filter(Boolean);

      if ((module.options || []).length > 0 && options.length === 0)
        return null;

      return { ...module, options };
    }).filter(Boolean);
  }, [canSeeNavItem]);

  // Active module object for Secondary Sidebar
  const activeModule = visibleModules.find((m) => m.id === activeModuleId);

  // Active option object for Tertiary Sidebar
  const activeSecondaryOption = activeModule?.options?.find(
    (opt) => opt.id === activeSecondaryOptionId && opt.hasChildren,
  );

  const handleNavClick = (itemId, href, sectionId) => {
    clearAllTimers();
    if (!isPinned) {
      setActiveModuleId(null);
    }
    if (!isTertiaryPinned) {
      setActiveSecondaryOptionId(null);
      setIsTertiaryHovered(false);
    }
    if (itemId === "logout") {
      onSectionChange && onSectionChange("logout");
      return;
    }
    const targetSection = sectionId || itemId;
    if (onSectionChange) {
      onSectionChange(targetSection);
    }
    if (href && href !== "#") {
      if (href.startsWith("http://") || href.startsWith("https://")) {
        window.location.href = href;
        return;
      }
      router.push(href);
    }
  };

  const handleMobileNavClick = (itemId, href, sectionId) => {
    if (handleClick) handleClick(); // Close mobile drawer overlay
    handleNavClick(itemId, href, sectionId);
  };

  const renderCountBadge = (
    count,
    { active = false, compact = false } = {},
  ) => {
    if (!count) return null;
    const label = count > 99 ? "99+" : String(count);
    if (compact) {
      return (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-4 text-center">
          {label}
        </span>
      );
    }
    return (
      <span
        className={`ml-auto min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${active ? "bg-white text-blue-600" : "bg-red-500 text-white"
          }`}
      >
        {label}
      </span>
    );
  };

  return (
    <div
      suppressHydrationWarning
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${isCollapsed ? "w-[76px] " : "w-full overflow-hidden"
        } h-full min-h-0 flex flex-col shadow-lg relative overflow-visible`}
    >
      <div
        ref={wrapperRef}
        onMouseEnter={handleDesktopMouseEnter}
        onMouseLeave={handleDesktopMouseLeave}
        className="hidden md:flex h-full w-[76px] shrink-0 overflow-visible relative"
      >
        <aside
          className={`absolute left-0 top-0 bg-white border-r border-slate-200/90 h-full flex flex-col justify-between z-30 overflow-hidden transition-all duration-300 ease-in-out w-[76px] shadow-sm`}
        >
          <div className="flex-1 overflow-y-auto py-2.5 px-1.5 space-y-1 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {visibleModules.map((module) => {
              const ModuleIcon = module.headerIcon;
              const isSingleOption =
                module.options?.length === 1 && !module.options[0].hasChildren;
              const isModuleActive =
                activeModuleId === module.id ||
                (isSingleOption && pathname === module.options[0].href);

              if (isSingleOption) {
                const singleItem = module.options[0];
                return (
                  <Link
                    key={module.id}
                    href={singleItem.href || "#"}
                    title={`${module.title} - ${module.subtitle || module.title}`}
                    onClick={(e) => {
                      clearAllTimers();
                      setActiveModuleId(null);
                      setActiveSecondaryOptionId(null);
                      setIsTertiaryHovered(false);
                      if (onSectionChange)
                        onSectionChange(singleItem.section || singleItem.id);
                      if (
                        singleItem.href &&
                        (singleItem.href.startsWith("http://") ||
                          singleItem.href.startsWith("https://"))
                      ) {
                        e.preventDefault();
                        window.location.href = singleItem.href;
                      }
                    }}
                    className={`group w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 cursor-pointer border-r-3 ${isModuleActive
                      ? "bg-blue-50 text-[#1d61ff] font-bold shadow-2xs border-[#1d61ff]"
                      : "text-slate-700 border-transparent hover:bg-slate-50 hover:text-[#1d61ff] hover:border-[#1d61ff]"
                      }`}
                  >
                    <div
                      className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${module.headerBg} shrink-0 shadow-2xs`}
                    >
                      <ModuleIcon className="w-5.5 h-5.5" />
                      {module.id === "LMS" &&
                        renderCountBadge(unreadNotificationCount, {
                          compact: true,
                        })}
                    </div>
                    <span
                      className={`text-[10px] sm:text-[10.5px] 2xl:text-[11px] font-black tracking-tight text-center mt-1 leading-tight max-w-full break-words px-0.5 ${isModuleActive ? "text-[#1d61ff]" : "text-slate-900 group-hover:text-[#1d61ff]"}`}
                    >
                      {module.title}
                    </span>
                  </Link>
                );
              }

              return (
                <button
                  key={module.id}
                  type="button"
                  title={`${module.title} - ${module.subtitle || module.title}`}
                  onClick={() => {
                    clearAllTimers();
                    if (activeModuleId === module.id) {
                      setActiveModuleId(null);
                      setActiveSecondaryOptionId(null);
                      setIsTertiaryHovered(false);
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("sidebar_pinned_module");
                      }
                    } else {
                      setActiveModuleId(module.id);
                      setActiveSecondaryOptionId(null);
                      setIsTertiaryHovered(false);
                      if (typeof window !== "undefined" && isPinned) {
                        localStorage.setItem(
                          "sidebar_pinned_module",
                          module.id,
                        );
                      }
                    }
                  }}
                  className={`group w-full flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 cursor-pointer border-r-3 ${isModuleActive
                    ? "bg-blue-50 text-[#1d61ff] font-bold shadow-2xs border-[#1d61ff]"
                    : "text-slate-700 border-transparent hover:bg-slate-50 hover:text-[#1d61ff] hover:border-[#1d61ff]"
                    }`}
                >
                  <div
                    className={`relative w-9 h-9 rounded-xl flex items-center justify-center ${module.headerBg} shrink-0 shadow-2xs`}
                  >
                    <ModuleIcon className="w-5.5 h-5.5" />
                    {module.id === "LMS" &&
                      renderCountBadge(unreadNotificationCount, {
                        compact: true,
                      })}
                  </div>
                  <span
                    className={`text-[10px] sm:text-[10.5px] 2xl:text-[11px] font-black tracking-tight text-center mt-1 leading-tight max-w-full break-words px-0.5 ${isModuleActive ? "text-[#1d61ff]" : "text-slate-900 group-hover:text-[#1d61ff]"}`}
                  >
                    {module.title}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Desktop Footer */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              title={!isPrimaryHovered ? "Sign Out / Exit" : undefined}
              onClick={() => handleNavClick("logout")}
              className={`w-full flex items-center ${isPrimaryHovered
                ? "justify-center gap-2 px-2"
                : "justify-center px-1"
                } py-2 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50/80 transition cursor-pointer font-bold text-xs`}
            >
              <ArrowLeftOnRectangleIcon className="w-4.5 h-4.5 shrink-0" />
              {isPrimaryHovered && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* TIER 2: SECONDARY SIDEBAR PANEL */}
        {(() => {
          const isSecSlim = isPinned || isSecondarySlimManual || (!!activeSecondaryOptionId && isTertiaryHovered);
          const isTertSlim = isTertiaryPinned || isTertiarySlimManual;
          const showSecondaryPanel = activeModule && !(activeModule.options?.length === 1 && !activeModule.options[0].hasChildren);
          return (
            <>
              <div
                className={`absolute top-0 left-[76px] bg-white h-full flex flex-col justify-between shadow-2xl transition-all duration-300 ease-in-out z-20 overflow-hidden border-r border-slate-200/90 ${showSecondaryPanel
                  ? `${isSecSlim ? "w-16 px-2 py-4" : "w-60 px-3.5 py-4"} opacity-100 pointer-events-auto`
                  : "w-0 p-0 opacity-0 pointer-events-none border-r-0"
                  }`}
              >
                {activeModule && (
                  <div className="flex flex-col h-full space-y-4">
                    {/* Secondary Header */}
                    {isSecSlim ? (
                      <div className="flex flex-col items-center justify-center pb-2.5 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPinned(false);
                            if (typeof window !== "undefined") {
                              localStorage.setItem(
                                "sidebar_is_pinned",
                                "false",
                              );
                              localStorage.removeItem("sidebar_pinned_module");
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 shadow-xs rotate-45 flex items-center justify-center cursor-pointer hover:bg-blue-200 transition"
                          title="Unpin Secondary Sidebar"
                        >
                          <PinIcon className="w-4 h-4 fill-blue-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-1 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg ${activeModule.headerBg} flex items-center justify-center shrink-0 shadow-xs`}
                          >
                            {activeModule.headerIcon && (
                              <activeModule.headerIcon className="w-4.5 h-4.5" />
                            )}
                          </div>
                          <span className="text-xs font-black text-slate-800 tracking-wider truncate">
                            {activeModule.title} Options
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Pin Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextPin = !isPinned;
                              setIsPinned(nextPin);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("sidebar_is_pinned", String(nextPin));
                                if (nextPin && activeModuleId) {
                                  localStorage.setItem("sidebar_pinned_module", activeModuleId);
                                } else {
                                  localStorage.removeItem("sidebar_pinned_module");
                                }
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${isPinned
                              ? "bg-blue-100 text-blue-600 rotate-45 shadow-xs"
                              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              }`}
                            title={isPinned ? "Unpin Secondary Sidebar" : "Pin Secondary Sidebar"}
                          >
                            <PinIcon className={`w-4 h-4 ${isPinned ? "fill-blue-600" : ""}`} />
                          </button>

                          {/* Close Cross Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveModuleId(null);
                              setActiveSecondaryOptionId(null);
                              setIsTertiaryHovered(false);
                              setIsPinned(false);
                              setIsTertiaryPinned(false);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("sidebar_is_pinned", "false");
                                localStorage.removeItem("sidebar_pinned_module");
                                localStorage.setItem("sidebar_tertiary_pinned", "false");
                                localStorage.removeItem("sidebar_tertiary_option");
                              }
                            }}
                            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Close Sidebar"
                          >
                            <XMarkIcon className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Module Options List */}
                    <div className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {activeModule.options?.map((item) => {
                        const ItemIcon = item.icon || DocumentTextIcon;
                        const isActive =
                          pathname === item.href &&
                          (!item.section || activeSection === item.section);
                        const isOptionSelected =
                          activeSecondaryOptionId === item.id;

                        if (item.hasChildren) {
                          return (
                            <button
                              key={item.id}
                              type="button"
                              title={isSecSlim ? item.label : undefined}
                              onClick={() => {
                                clearAllTimers();
                                const nextOptionId = isOptionSelected
                                  ? null
                                  : item.id;
                                setActiveSecondaryOptionId(nextOptionId);
                                setIsTertiaryHovered(!!nextOptionId);
                                if (!nextOptionId && isTertiaryPinned) {
                                  setIsTertiaryPinned(false);
                                  if (typeof window !== "undefined") {
                                    localStorage.setItem("sidebar_tertiary_pinned", "false");
                                    localStorage.removeItem("sidebar_tertiary_option");
                                  }
                                }
                              }}
                              className={`group w-full flex items-center ${isSecSlim ? "justify-center px-1.5 py-2.5" : "justify-between px-3 py-2.5"} rounded-lg text-xs transition-all duration-150 cursor-pointer border-r-3 ${isOptionSelected
                                ? "bg-blue-50 text-[#1d61ff] font-bold shadow-2xs border-[#1d61ff] hover:bg-blue-100/70"
                                : "text-slate-700 font-semibold border-transparent hover:bg-blue-50/70 hover:text-[#1d61ff] hover:border-[#1d61ff]"
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ItemIcon
                                  className={`w-4.5 h-4.5 shrink-0 stroke-[2] transition-colors ${isOptionSelected
                                    ? "text-[#1d61ff]"
                                    : "text-slate-500 group-hover:text-[#1d61ff]"
                                    }`}
                                />
                                {!isSecSlim && (
                                  <span className="truncate leading-snug text-[12.5px]">
                                    {item.label}
                                  </span>
                                )}
                              </div>
                              {!isSecSlim && (
                                <ChevronRightIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1d61ff] shrink-0" />
                              )}
                            </button>
                          );
                        }

                        return (
                          <Link
                            key={item.id}
                            href={item.href || "#"}
                            title={isSecSlim ? item.label : undefined}
                            onClick={() => {
                              setActiveSecondaryOptionId(null);
                              setIsTertiaryHovered(false);
                              if (isTertiaryPinned) {
                                setIsTertiaryPinned(false);
                                if (typeof window !== "undefined") {
                                  localStorage.setItem("sidebar_tertiary_pinned", "false");
                                  localStorage.removeItem("sidebar_tertiary_option");
                                }
                              }
                              handleNavClick(item.id, item.href, item.section);
                            }}
                            className={`group w-full flex items-center ${isSecSlim ? "justify-center px-1.5 py-2.5" : "gap-2.5 px-3 py-2.5"} rounded-lg text-xs transition-all duration-150 cursor-pointer border-r-3 ${isActive
                              ? "bg-blue-500 text-[#ffffff] font-bold shadow-xs border-[#1d61ff]"
                              : "text-slate-700 font-semibold border-transparent hover:bg-blue-50/70 hover:text-[#1d61ff] hover:border-[#1d61ff]"
                              }`}
                          >
                            <span
                              className={`relative ${isSecSlim ? "" : "flex items-center gap-2.5 min-w-0 flex-1"}`}
                            >
                              <ItemIcon
                                className={`w-4.5 h-4.5 shrink-0 stroke-[2] transition-colors ${isActive
                                  ? "text-[#ffffff]"
                                  : "text-slate-500 group-hover:text-[#1d61ff]"
                                  }`}
                              />
                              {isSecSlim &&
                                item.id === "notifications" &&
                                renderCountBadge(unreadNotificationCount, {
                                  compact: true,
                                })}
                              {!isSecSlim && (
                                <span className="truncate leading-snug text-[12.5px]">
                                  {item.label}
                                </span>
                              )}
                            </span>
                            {!isSecSlim &&
                              item.id === "notifications" &&
                              renderCountBadge(unreadNotificationCount, {
                                active: isActive,
                              })}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* TIER 3: TERTIARY SIDEBAR PANEL */}
              <div
                className={`absolute top-0 ${isSecSlim ? "left-[140px]" : "left-[316px]"} bg-white h-full flex flex-col justify-between shadow-2xl transition-all duration-300 ease-in-out z-10 overflow-hidden border-r border-slate-200/90 ${activeSecondaryOption
                  ? `${isTertSlim ? "w-16 px-2 py-4" : "w-64 px-3 py-4"} opacity-100 pointer-events-auto`
                  : "w-0 p-0 opacity-0 pointer-events-none border-r-0"
                  }`}
              >
                {activeSecondaryOption && (
                  <div className="flex flex-col h-full space-y-4">
                    {/* Tertiary Header */}
                    {isTertSlim ? (
                      <div className="flex flex-col items-center justify-center pb-2.5 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setIsTertiaryPinned(false);
                            if (typeof window !== "undefined") {
                              localStorage.setItem("sidebar_tertiary_pinned", "false");
                              localStorage.removeItem("sidebar_tertiary_option");
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 shadow-xs rotate-45 flex items-center justify-center cursor-pointer hover:bg-indigo-200 transition"
                          title="Unpin Tertiary Panel"
                        >
                          <PinIcon className="w-4 h-4 fill-indigo-600" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-1 pb-3 border-b border-slate-100">
                        {activeSecondaryOption.href?.startsWith("http") ? (
                          <a
                            href={activeSecondaryOption.href}
                            className="flex items-center gap-2 min-w-0 group hover:opacity-80 transition cursor-pointer"
                            title={`Open ${activeSecondaryOption.label}`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs group-hover:bg-indigo-100 transition">
                              {activeSecondaryOption.icon && (
                                <activeSecondaryOption.icon className="w-4.5 h-4.5" />
                              )}
                            </div>
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider truncate group-hover:text-indigo-600 transition-colors">
                              {activeSecondaryOption.label}
                            </span>
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                              {activeSecondaryOption.icon && (
                                <activeSecondaryOption.icon className="w-4.5 h-4.5" />
                              )}
                            </div>
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">
                              {activeSecondaryOption.label}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Tertiary Pin Toggle Button */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextPin = !isTertiaryPinned;
                              setIsTertiaryPinned(nextPin);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("sidebar_tertiary_pinned", String(nextPin));
                                if (nextPin && activeSecondaryOptionId) {
                                  localStorage.setItem("sidebar_tertiary_option", activeSecondaryOptionId);
                                } else {
                                  localStorage.removeItem("sidebar_tertiary_option");
                                }
                              }
                            }}
                            className={`p-1.5 rounded-lg transition-all cursor-pointer ${isTertiaryPinned
                              ? "bg-indigo-100 text-indigo-600 rotate-45 shadow-xs"
                              : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              }`}
                            title={isTertiaryPinned ? "Unpin Tertiary Sidebar" : "Pin Tertiary Sidebar"}
                          >
                            <PinIcon className={`w-4 h-4 ${isTertiaryPinned ? "fill-indigo-600" : ""}`} />
                          </button>

                          {/* Tertiary Close Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsTertiaryPinned(false);
                              setActiveSecondaryOptionId(null);
                              setIsTertiaryHovered(false);
                              if (typeof window !== "undefined") {
                                localStorage.setItem("sidebar_tertiary_pinned", "false");
                                localStorage.removeItem("sidebar_tertiary_option");
                              }
                            }}
                            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Close Tertiary Panel"
                          >
                            <XMarkIcon className="w-4 h-4 text-slate-500" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sub-options List */}
                    <div className="space-y-0.5 flex-1 overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {activeSecondaryOption.children?.map((child, index, arr) => {
                        const ChildIcon = child.icon || DocumentTextIcon;
                        const isChildActive =
                          pathname === child.href &&
                          (!child.section || activeSection === child.section);
                        const isExternal =
                          child.href?.startsWith("http://") ||
                          child.href?.startsWith("https://");
                        const prevGroup =
                          index > 0 ? arr[index - 1]?.group : null;
                        const showGroupHeader =
                          child.group && child.group !== prevGroup;

                        return (
                          <div key={child.id} className="space-y-0.5">
                            {showGroupHeader && !isTertSlim && (
                              <div
                                className={`px-2.5 text-[11px] font-semibold text-slate-400 tracking-wide ${index > 0 ? "pt-3 pb-1" : "pb-1"
                                  }`}
                              >
                                {child.group}
                              </div>
                            )}
                            <Link
                              href={child.href || "#"}
                              title={isTertSlim ? child.label : undefined}
                              onClick={(e) => {
                                if (isExternal) {
                                  e.preventDefault();
                                  window.location.href = child.href;
                                  return;
                                }
                                handleNavClick(
                                  child.id,
                                  child.href,
                                  child.section,
                                );
                              }}
                              className={`group w-full flex items-center ${isTertSlim
                                ? "justify-center px-1.5 py-2"
                                : "gap-2.5 px-2.5 py-1.5"
                                } rounded-lg text-xs transition-all duration-150 cursor-pointer border-r-3 ${isChildActive
                                  ? "bg-slate-100 text-slate-900 font-bold shadow-2xs border-indigo-600"
                                  : "text-slate-700 font-medium border-transparent hover:bg-slate-100 hover:text-slate-900"
                                }`}
                            >
                              <ChildIcon
                                className={`w-4 h-4 shrink-0 stroke-[2] transition-colors ${isChildActive
                                  ? "text-slate-900"
                                  : "text-slate-600 group-hover:text-slate-900"
                                  }`}
                              />
                              {!isTertSlim && (
                                <span className="truncate leading-snug text-[12.5px]">
                                  {child.label}
                                </span>
                              )}
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE VIEW SIDEBAR (Renders on mobile screens when top-left menu toggles) */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-col w-72 sm:w-80 bg-white h-full border-r border-slate-200/90 shadow-2xl overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden font-sans">
        {/* Mobile Accordions List (LMS, HRMS, CMS) */}
        <div className="flex-1 p-3 space-y-2.5">
          {visibleModules.map((module) => {
            const ModuleIcon = module.headerIcon;
            const isModuleOpen = openMobileModuleId === module.id;

            return (
              <div
                key={module.id}
                className="rounded-xl border border-slate-200/80 overflow-hidden transition-all bg-white shadow-2xs"
              >
                {/* Module Accordion Header */}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      module.options?.length === 1 &&
                      !module.options[0].hasChildren
                    ) {
                      handleMobileNavClick(
                        module.options[0].id,
                        module.options[0].href,
                        module.options[0].section,
                      );
                      return;
                    }
                    toggleMobileModule(module.id);
                  }}
                  className={`w-full flex items-center justify-between p-3.5 text-left transition cursor-pointer ${isModuleOpen ||
                    (module.options?.length === 1 &&
                      pathname === module.options[0].href)
                    ? "bg-blue-50/90 text-[#1d61ff] font-bold"
                    : "text-slate-800 hover:bg-slate-50"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${module.headerBg}`}
                    >
                      <ModuleIcon className="w-5.5 h-5.5" />
                      {module.id === "LMS" &&
                        renderCountBadge(unreadNotificationCount, {
                          compact: true,
                        })}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black tracking-wide uppercase truncate">
                        {module.subtitle}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        ({module.title})
                      </span>
                    </div>
                  </div>
                  {module.options?.length === 1 &&
                    !module.options[0].hasChildren ? (
                    <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : isModuleOpen ? (
                    <ChevronUpIcon className="w-4 h-4 text-[#1d61ff] shrink-0" />
                  ) : (
                    <ChevronDownIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {/* Module Options Body */}
                {isModuleOpen && (
                  <div className="p-2 space-y-1 bg-slate-50/60 border-t border-slate-100">
                    {module.options?.map((option) => {
                      const OptionIcon = option.icon || DocumentTextIcon;
                      const isOptionActive =
                        pathname === option.href &&
                        (!option.section || activeSection === option.section);
                      const isSubOpen = openMobileSubId === option.id;

                      if (option.hasChildren) {
                        return (
                          <div key={option.id} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleMobileSub(option.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${isSubOpen
                                ? "bg-blue-100/70 text-[#1d61ff]"
                                : "text-slate-700 hover:bg-slate-100/80"
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <OptionIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                <span className="truncate">{option.label}</span>
                              </div>
                              {isSubOpen ? (
                                <ChevronUpIcon className="w-3.5 h-3.5 text-[#1d61ff] shrink-0" />
                              ) : (
                                <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                            </button>

                            {/* Sub-children list */}
                            {isSubOpen && (
                              <div className="pl-6 space-y-1 border-l-2 border-blue-200 ml-3.5 my-1">
                                {option.children?.map((child, index, arr) => {
                                  const ChildIcon =
                                    child.icon || DocumentTextIcon;
                                  const isChildActive =
                                    pathname === child.href &&
                                    (!child.section ||
                                      activeSection === child.section);
                                  const isExternal =
                                    child.href?.startsWith("http://") ||
                                    child.href?.startsWith("https://");
                                  const prevGroup =
                                    index > 0 ? arr[index - 1]?.group : null;
                                  const showGroupHeader =
                                    child.group && child.group !== prevGroup;

                                  return (
                                    <div key={child.id} className="space-y-0.5">
                                      {showGroupHeader && (
                                        <div className="pt-2 pb-0.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                                          {child.group}
                                        </div>
                                      )}
                                      <Link
                                        href={child.href || "#"}
                                        onClick={(e) => {
                                          if (isExternal) {
                                            e.preventDefault();
                                            if (handleClick) handleClick();
                                            window.location.href = child.href;
                                            return;
                                          }
                                          handleMobileNavClick(
                                            child.id,
                                            child.href,
                                            child.section,
                                          );
                                        }}
                                        className={`flex items-center gap-2 px-2.5 py-2 rounded-md text-[11.5px] transition cursor-pointer ${isChildActive
                                          ? "bg-[#1d61ff] text-white font-bold"
                                          : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                                          }`}
                                      >
                                        <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">
                                          {child.label}
                                        </span>
                                      </Link>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={option.id}
                          href={option.href || "#"}
                          onClick={() =>
                            handleMobileNavClick(
                              option.id,
                              option.href,
                              option.section,
                            )
                          }
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition cursor-pointer ${isOptionActive
                            ? "bg-[#1d61ff] text-[#ffffff] font-bold"
                            : "text-slate-700 font-medium hover:bg-slate-100/80"
                            }`}
                        >
                          <OptionIcon
                            className={`w-4 h-4 shrink-0 ${isOptionActive ? "text-white" : "text-slate-500"
                              }`}
                          />
                          <span className="truncate flex-1">
                            {option.label}
                          </span>
                          {option.id === "notifications" &&
                            renderCountBadge(unreadNotificationCount, {
                              active: isOptionActive,
                            })}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => handleMobileNavClick("logout")}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100/80 transition cursor-pointer font-bold text-xs"
          >
            <ArrowLeftOnRectangleIcon className="w-4 h-4" />
            <span>Sign Out / Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
