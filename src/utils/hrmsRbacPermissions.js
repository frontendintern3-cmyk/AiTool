// Stub: this tool has no HRMS backend/permission system. See permissionProxy.js
// for why this is a Proxy rather than a hand-enumerated object.
import { makePermissionProxy } from "./permissionProxy";

export const HRMS_PERMISSIONS = makePermissionProxy("HRMS_PERMISSIONS");
