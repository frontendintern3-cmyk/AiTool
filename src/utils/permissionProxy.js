// The pasted Sidebar component references dozens of specific permission
// constants (HRMS_PERMISSIONS.DASHBOARD.VIEW_HR, PERMISSIONS.LEADS.DELIVERY,
// etc.) from a separate platform's RBAC system that doesn't exist here. This
// tool has no real backend permission system, so rather than hand-enumerate
// every key the component might touch, this Proxy returns a stable string
// for any property path accessed — every "permission constant" just becomes
// its own dotted path as a string, and the actual gating logic in
// hrmsRbacPermissions/rbacPermissions stubs always allows access anyway.
function makePermissionProxy(prefix = "") {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;
        const path = prefix ? `${prefix}.${prop}` : prop;
        return makePermissionProxy(path);
      },
    }
  );
}

export { makePermissionProxy };
