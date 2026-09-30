// Stub matching the pasted Sidebar's expected `getCurrentUser` shape. This
// tool has no login system yet — everyone who can reach it is treated as an
// administrator, consistent with how the rest of the app has no auth gate.
export function getCurrentUser() {
  return { role: "admin", userRole: "admin" };
}
