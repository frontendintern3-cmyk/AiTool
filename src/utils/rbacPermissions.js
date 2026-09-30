// Stub: this tool has no LMS backend/permission system. See permissionProxy.js
// for why this is a Proxy rather than a hand-enumerated object.
import { makePermissionProxy } from "./permissionProxy";

export const PERMISSIONS = makePermissionProxy("PERMISSIONS");
