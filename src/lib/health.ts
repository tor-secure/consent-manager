import "server-only";

import { logger } from "./logger";

export type HealthChecks = {
  app: "ok";
  database: "ok" | "unhealthy";
};

export type HealthBody = {
  status: "ok" | "unhealthy";
  checks: HealthChecks;
};

export type HealthResult = {
  ok: boolean;
  statusCode: 200 | 503;
  body: HealthBody;
};

export function buildHealthResponse(databaseOk: boolean): HealthResult {
  if (databaseOk) {
    return {
      ok: true,
      statusCode: 200,
      body: {
        status: "ok",
        checks: {
          app: "ok",
          database: "ok",
        },
      },
    };
  }

  return {
    ok: false,
    statusCode: 503,
    body: {
      status: "unhealthy",
      checks: {
        app: "ok",
        database: "unhealthy",
      },
    },
  };
}

export async function runHealthCheck(
  ping: () => Promise<unknown>,
): Promise<HealthResult> {
  const started = Date.now();

  try {
    await ping();
    return buildHealthResponse(true);
  } catch (error) {
    logger.error("Health check failed", {
      route: "GET /api/health",
      operation: "health.check",
      duration: Date.now() - started,
      error,
    });
    return buildHealthResponse(false);
  }
}
