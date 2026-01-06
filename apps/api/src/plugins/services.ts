import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

import type { Env } from '@/config/env';
import { loadEnv } from '@/config/env';
import { AccountsService } from '@/services/accounts.service';
import { AuthorizationService } from '@/services/authorization.service';
import { EmailService } from '@/services/email.service';
// @feature uploads
import { FileStorageService } from '@/services/file-storage.service';
// @endfeature
import { PasswordService } from '@/services/password.service';
import { SessionsService } from '@/services/sessions.service';
// @feature admin
import { StatsService } from '@/services/stats.service';
// @endfeature
// @feature uploads
import { UploadsService } from '@/services/uploads.service';
// @endfeature
import { UsersService } from '@/services/users.service';

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
    authorizationService: AuthorizationService;
    usersService: UsersService;
    sessionsService: SessionsService;
    passwordService: PasswordService;
    emailService: EmailService;
    // @feature uploads
    fileStorageService: FileStorageService;
    uploadsService: UploadsService;
    // @endfeature
    accountsService: AccountsService;
    // @feature admin
    statsService: StatsService;
    // @endfeature
  }
}

const servicesPlugin: FastifyPluginAsync = async (app) => {
  const env = loadEnv();

  const authorizationService = new AuthorizationService(app.logger);
  const emailService = new EmailService(env, app.logger, app.prisma);
  // @feature uploads
  const fileStorageService = new FileStorageService(env, app.logger);
  // @endfeature
  const usersService = new UsersService(
    app.prisma,
    app.logger,
    authorizationService
  );
  const sessionsService = new SessionsService(app.prisma, authorizationService);
  const passwordService = new PasswordService(app.prisma, sessionsService);
  // @feature uploads
  const uploadsService = new UploadsService(
    app.prisma,
    fileStorageService,
    app.logger
  );
  // @endfeature
  const accountsService = new AccountsService(app.prisma, app.logger);
  // @feature admin
  const statsService = new StatsService(app.prisma, app.logger);
  // @endfeature

  app.decorate('env', env);
  app.decorate('authorizationService', authorizationService);
  app.decorate('emailService', emailService);
  // @feature uploads
  app.decorate('fileStorageService', fileStorageService);
  // @endfeature
  app.decorate('usersService', usersService);
  app.decorate('sessionsService', sessionsService);
  app.decorate('passwordService', passwordService);
  // @feature uploads
  app.decorate('uploadsService', uploadsService);
  // @endfeature
  app.decorate('accountsService', accountsService);
  // @feature admin
  app.decorate('statsService', statsService);
  // @endfeature

  app.log.info('[+] Services configured');
};

export default fp(servicesPlugin);
