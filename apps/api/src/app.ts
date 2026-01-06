import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { AppError } from '@repo/packages-utils/errors';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { loadEnv } from '@/config/env';
import type { RateLimitRole } from '@/config/rate-limit';
import { RATE_LIMIT_CONFIG } from '@/config/rate-limit';
// @feature admin
import { metricsService } from '@/services/metrics.service';
// @endfeature

const env = loadEnv();

export const app = Fastify({
  logger: {
    level: 'trace',
    formatters: {
      level: (label) => ({ level: label }),
    },
    transport:
      env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname',
              singleLine: false,
              translateTime: 'HH:MM:ss',
            },
          }
        : undefined,
  },
  disableRequestLogging: true,
  requestIdHeader: 'x-request-id',
  genReqId: () => `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  bodyLimit: 1048576,
  routerOptions: {
    ignoreTrailingSlash: true,
  },
  onProtoPoisoning: 'error',
  onConstructorPoisoning: 'error',
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
});

await app.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
});

// @ts-expect-error - Known issue with @fastify/rate-limit type definitions
await app.register(rateLimit, {
  global: true,
  max: async (request: FastifyRequest) => {
    const session = await request.server.auth.api
      .getSession({
        headers: request.headers as unknown as Headers,
      })
      .catch(() => null);

    if (!session?.user) {
      return RATE_LIMIT_CONFIG.anonymous.max;
    }

    const userWithRole = session.user as typeof session.user & {
      role?: string;
    };
    const role = (userWithRole.role || 'user') as RateLimitRole;

    return RATE_LIMIT_CONFIG[role]?.max || RATE_LIMIT_CONFIG.user.max;
  },
  timeWindow: 60 * 1000,
  keyGenerator: async (request: FastifyRequest) => {
    const session = await request.server.auth.api
      .getSession({
        headers: request.headers as unknown as Headers,
      })
      .catch(() => null);

    if (session?.user?.id) {
      return `user:${session.user.id}`;
    }

    return `ip:${request.ip}`;
  },
  addHeadersOnExceeding: {
    'X-RateLimit-Limit': true,
    'X-RateLimit-Remaining': true,
    'X-RateLimit-Reset': true,
  },
  addHeaders: {
    'X-RateLimit-Limit': true,
    'X-RateLimit-Remaining': true,
    'X-RateLimit-Reset': true,
  },
  errorResponseBuilder: (request: FastifyRequest) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
  }),
});

await app.register(cookie, {
  secret: env.COOKIE_SECRET,
  parseOptions: {},
});

await app.register(formbody);

const { default: multipartPlugin } = await import('@/plugins/multipart.js');
await app.register(multipartPlugin);

const { default: loggerPlugin } = await import('@/plugins/logger.js');
await app.register(loggerPlugin);

const { default: databasePlugin } = await import('@/plugins/database.js');
await app.register(databasePlugin);

const { default: servicesPlugin } = await import('@/plugins/services.js');
await app.register(servicesPlugin);

const { default: authPlugin } = await import('@/plugins/auth.js');
await app.register(authPlugin);

const { default: swaggerPlugin } = await import('@/plugins/swagger.js');
await app.register(swaggerPlugin);

const { default: scalarPlugin } = await import('@/plugins/scalar.js');
await app.register(scalarPlugin);

const { default: schedulePlugin } = await import('@/plugins/schedule.js');
await app.register(schedulePlugin);

const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void => {
  request.log.error(
    {
      err: error,
      reqId: request.id,
      url: request.url,
      method: request.method,
    },
    'Request error'
  );

  if (error instanceof AppError) {
    void reply.status(error.statusCode).send({
      error: {
        message: error.message,
        code: error.code,
        ...(error.details && { details: error.details }),
      },
    });
    return;
  }

  if (error.validation) {
    void reply.status(400).send({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.validation,
      },
    });
    return;
  }

  const isProduction = env.NODE_ENV === 'production';
  const statusCode = error.statusCode || 500;

  void reply.status(statusCode).send({
    error: {
      message:
        isProduction && statusCode === 500
          ? 'Internal server error'
          : error.message || 'An error occurred',
      code: 'INTERNAL_ERROR',
    },
  });
};

app.setErrorHandler(errorHandler);

app.addHook('onRequest', async (request) => {
  if (env.LOG_LEVEL === 'detailed' || env.LOG_LEVEL === 'verbose') {
    request.log = request.log.child({ reqId: request.id });
  }
});

app.addHook('onResponse', async (request, reply) => {
  try {
    const responseTime = reply.elapsedTime;
    // @feature admin
    metricsService.recordRequest(responseTime, reply.statusCode);
    // @endfeature

    const statusCode = reply.statusCode;
    const isError = statusCode >= 400;
    const logMessage = `${request.method} ${request.url} → ${statusCode} (${responseTime.toFixed(2)}ms)`;

    switch (env.LOG_LEVEL) {
      case 'minimal':
        if (isError) {
          request.log.error(
            {
              method: request.method,
              url: request.url,
              statusCode,
              responseTime: `${responseTime.toFixed(2)}ms`,
            },
            logMessage
          );
        }
        break;

      case 'normal':
        if (isError) {
          request.log.error(logMessage);
        } else {
          request.log.info(logMessage);
        }
        break;

      case 'detailed':
        if (isError) {
          request.log.error(
            {
              method: request.method,
              url: request.url,
              statusCode,
              responseTime: `${responseTime.toFixed(2)}ms`,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
            },
            logMessage
          );
        } else {
          request.log.info(
            {
              method: request.method,
              url: request.url,
              statusCode,
              responseTime: `${responseTime.toFixed(2)}ms`,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
            },
            logMessage
          );
        }
        break;

      case 'verbose':
        if (isError) {
          request.log.error(
            {
              method: request.method,
              url: request.url,
              statusCode,
              responseTime: `${responseTime.toFixed(2)}ms`,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
              req: {
                params: request.params,
                query: request.query,
                headers: request.headers,
              },
              res: {
                headers: reply.getHeaders(),
              },
            },
            logMessage
          );
        } else {
          request.log.info(
            {
              method: request.method,
              url: request.url,
              statusCode,
              responseTime: `${responseTime.toFixed(2)}ms`,
              ip: request.ip,
              userAgent: request.headers['user-agent'],
              req: {
                params: request.params,
                query: request.query,
                headers: request.headers,
              },
              res: {
                headers: reply.getHeaders(),
              },
            },
            logMessage
          );
        }
        break;
    }
  } catch (error) {
    console.error('[onResponse hook error]:', error);
  }
});

app.get('/health', async (request, reply) => {
  try {
    await app.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };
  } catch (error) {
    request.log.error(error, 'Database health check failed');
    return reply.status(503).send({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
});

const { default: usersRoutes } = await import('@/routes/users.js');
const { default: sessionsRoutes } = await import('@/routes/sessions.js');
const { default: passwordRoutes } = await import('@/routes/password.js');
const { default: verificationRoutes } =
  await import('@/routes/verification.js');
// @feature uploads
const { default: uploadsRoutes } = await import('@/routes/uploads.js');
const { default: uploadsServeRoutes } =
  await import('@/routes/uploads-serve.js');
// @endfeature
const { default: accountsRoutes } = await import('@/routes/accounts.js');
// @feature admin
const { default: statsRoutes } = await import('@/routes/stats.js');
const { default: metricsRoutes } = await import('@/routes/metrics.js');
const { default: adminSessionsRoutes } =
  await import('@/routes/admin-sessions.js');

metricsService.start();
// @endfeature

// @feature uploads
await app.register(uploadsServeRoutes);
// @endfeature

await app.register(
  async (app) => {
    await app.register(usersRoutes);
    await app.register(sessionsRoutes);
    await app.register(passwordRoutes);
    await app.register(verificationRoutes);
    // @feature uploads
    await app.register(uploadsRoutes);
    // @endfeature
    await app.register(accountsRoutes);
    // @feature admin
    await app.register(statsRoutes);
    await app.register(metricsRoutes);
    await app.register(adminSessionsRoutes);
    // @endfeature
  },
  { prefix: '/api' }
);
