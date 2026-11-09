// The one native auth app instance, created on first use. Only this module
// imports the SDK; the flows receive the instance as a parameter.
import { CustomAuthPublicClientApplication } from "@azure/msal-browser/custom-auth";
import { customAuthConfig } from "../config.js";

let appPromise = null;

export function getApp() {
  appPromise ??= CustomAuthPublicClientApplication.create(customAuthConfig);
  return appPromise;
}
