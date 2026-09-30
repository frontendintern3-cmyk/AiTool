"use client";

// Stub: no HRMS backend here — every permission check passes. Keeps the
// pasted Sidebar component's API contract intact without pulling in a real
// permission system this single-purpose tool doesn't have.
export function useHrmsPermissions() {
  return { hasAnyPermission: () => true };
}
