export type DashboardErrorKind =
  | "validation"
  | "auth"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "network"
  | "server";

export type DashboardError = {
  kind: DashboardErrorKind;
  message: string;
  showInline: boolean;
};

const UNSAFE_MESSAGE_RE =
  /select |insert |update |delete |password|econnrefused|stack|at object\.|sqlstate|postgres:\/\/|relation |syntax error|duplicate key|constraint /i;

export function isSafeUserMessage(message: string): boolean {
  if (!message || message.length > 180) return false;
  return !UNSAFE_MESSAGE_RE.test(message);
}

export function userFacingError(
  status: number,
  serverMessage: string | undefined,
  fallback: string,
): DashboardError {
  if (status === 0) {
    return {
      kind: "network",
      message: "Unable to connect. Please try again.",
      showInline: false,
    };
  }

  if (status === 400) {
    const message =
      serverMessage && isSafeUserMessage(serverMessage)
        ? serverMessage
        : "Please check the form and try again.";
    return { kind: "validation", message, showInline: true };
  }

  if (status === 401 || status === 403) {
    return {
      kind: "auth",
      message: "You do not have permission to do that.",
      showInline: false,
    };
  }

  if (status === 404) {
    return {
      kind: "not_found",
      message: "The requested item could not be found.",
      showInline: false,
    };
  }

  if (status === 409) {
    const message =
      serverMessage && isSafeUserMessage(serverMessage)
        ? serverMessage
        : "This action conflicts with existing data.";
    return { kind: "conflict", message, showInline: false };
  }

  if (status === 429) {
    return {
      kind: "rate_limit",
      message: "Too many requests. Please wait and try again.",
      showInline: false,
    };
  }

  return {
    kind: "server",
    message: fallback,
    showInline: false,
  };
}

export async function readApiError(
  response: Response,
  fallback: string,
): Promise<DashboardError> {
  let serverMessage: string | undefined;
  try {
    const data = (await response.json()) as { message?: unknown };
    if (typeof data.message === "string") serverMessage = data.message;
  } catch {
    /* ignore invalid JSON */
  }
  return userFacingError(response.status, serverMessage, fallback);
}

export async function readNetworkOrApiError(
  error: unknown,
  response: Response | null,
  fallback: string,
): Promise<DashboardError> {
  if (!response) {
    return userFacingError(0, undefined, fallback);
  }
  return readApiError(response, fallback);
}
