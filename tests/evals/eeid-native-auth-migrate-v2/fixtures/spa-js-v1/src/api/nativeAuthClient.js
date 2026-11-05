import { BASE_URL, CLIENT_ID } from "../config.js";

export class NativeAuthError extends Error {
  constructor(error, suberror, errorCodes, correlationId) {
    super(error);
    this.error = error;
    this.suberror = suberror;
    this.errorCodes = errorCodes ?? [];
    this.correlationId = correlationId;
  }
}

export class RedirectRequiredError extends Error {
  constructor() {
    super("redirect");
  }
}

// Every native auth V1 call: POST, form-encoded, client_id on each request.
export async function postRequest(endpoint, params) {
  const response = await fetch(BASE_URL + endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...params }),
  });
  const body = await response.json().catch(() => ({}));

  if (body.challenge_type === "redirect") {
    throw new RedirectRequiredError();
  }
  if (!response.ok || body.error) {
    throw new NativeAuthError(body.error, body.suberror, body.error_codes, body.correlation_id);
  }
  return body;
}
