// Stub: this tool has no CRM/HRMS backend, so the header's Users/Accounts/
// Clients stat pills have nothing real to report. Returning zero counts
// (rather than fake numbers) keeps them honest while matching the shape
// HeaderComponent expects.
export async function getglobaldashboardstats() {
  return {
    success: true,
    data: {
      users: { active: 0, allowed: true },
      accounts: { count: 0, allowed: true },
      clients: { active: 0, pending: 0, inactive: 0, allowed: true },
    },
  };
}
