// Stub: this tool has no notifications backend. Returns an empty, "success"
// result so the pasted Sidebar's polling effect no-ops quietly instead of
// logging a fetch error every 30s.
export async function getAllNotifications() {
  return { success: true, unreadCount: 0, data: [] };
}

export async function markNotificationAsRead() {
  return { success: true };
}

export async function markAllNotificationAsRead() {
  return { success: true };
}
