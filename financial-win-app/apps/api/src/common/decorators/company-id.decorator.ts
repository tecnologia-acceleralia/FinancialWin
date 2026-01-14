import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

const logger = new Logger('CompanyIdDecorator');

/**
 * Decorator to extract company_id from authenticated user in request
 *
 * Usage:
 * @Get()
 * async findAll(@CompanyId() companyId: string) {
 *   return this.service.findAll(companyId);
 * }
 */
export const CompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.user) {
      logger.error('❌ [CompanyId] request.user is missing');
      throw new UnauthorizedException(
        'Company ID not found in request. User must be authenticated.'
      );
    }

    const companyId = request.user?.company_id;

    if (!companyId) {
      const userKeys =
        request.user &&
        typeof request.user === 'object' &&
        request.user !== null
          ? Object.keys(request.user as Record<string, unknown>).join(', ')
          : 'unknown';
      logger.error(
        `❌ [CompanyId] request.user.company_id is missing. User object keys: ${userKeys}`
      );
      throw new UnauthorizedException(
        'Company ID not found in request. User must be authenticated.'
      );
    }

    // Ensure companyId is a string
    if (typeof companyId !== 'string') {
      logger.error(
        `❌ [CompanyId] Invalid company_id type: ${typeof companyId}`
      );
      throw new UnauthorizedException('Invalid company ID type');
    }

    // CRITICAL: Validate UUID format to prevent injection or invalid values
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      logger.error(`❌ [CompanyId] Invalid company_id format: ${companyId}`);
      throw new UnauthorizedException('Invalid company ID format');
    }

    // CRITICAL: Log company_id extraction for security debugging
    // This helps track data leaks and multi-tenancy issues
    logger.log(
      `✅ [CompanyId] Extracted company_id: ${companyId} for request to ${request.url}`
    );
    logger.debug(
      `🔍 [CompanyId] Request user object: ${JSON.stringify({ sub: request.user.sub, email: request.user.email, name: request.user.name, company_id: request.user.company_id })}`
    );

    return companyId;
  }
);
