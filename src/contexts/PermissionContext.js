"use client";

// Stub: no LMS backend here. roleName "admin" makes the pasted Sidebar's
// isAdmin check pass, so adminOnly items (CMS, AI Visibility, etc.) show.
export function usePermissions() {
  return {
    hasAnyPermission: () => true,
    loading: false,
    initialized: true,
    roleName: "admin",
    role: "admin",
  };
}
