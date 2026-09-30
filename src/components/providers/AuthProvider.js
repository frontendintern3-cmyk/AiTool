"use client";

// Stub: this tool has no login system yet. See PermissionContext.js — the
// admin role is what actually gates adminOnly sidebar items; this just
// satisfies the pasted Sidebar's `useAuthContext().user` access.
export function useAuthContext() {
  return { user: { role: "admin" } };
}
