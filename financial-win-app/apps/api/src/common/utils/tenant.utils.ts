import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Interface for resources that belong to a tenant (company)
 */
export interface TenantResource {
  company_id: string;
}

/**
 * Extracts company_id from authenticated user in request
 *
 * @param request Express request object
 * @returns company_id string
 * @throws UnauthorizedException if company_id is not found
 */
export function getCompanyIdFromRequest(request: Request): string {
  const companyId = request.user?.company_id;

  if (!companyId) {
    throw new UnauthorizedException(
      'Company ID not found in request. User must be authenticated.'
    );
  }

  return companyId;
}

/**
 * Validates that a resource belongs to the user's company
 *
 * @param resource Resource with company_id property
 * @param userCompanyId Company ID from authenticated user
 * @throws ForbiddenException if resource does not belong to user's company
 */
export function validateTenantOwnership(
  resource: TenantResource | null | undefined,
  userCompanyId: string
): void {
  if (!resource) {
    throw new ForbiddenException('Resource not found');
  }

  if (resource.company_id !== userCompanyId) {
    throw new ForbiddenException('Resource does not belong to your company');
  }
}

/**
 * Validates that multiple resources belong to the user's company
 *
 * @param resources Array of resources with company_id property
 * @param userCompanyId Company ID from authenticated user
 * @throws ForbiddenException if any resource does not belong to user's company
 */
export function validateTenantOwnershipMultiple(
  resources: (TenantResource | null | undefined)[],
  userCompanyId: string
): void {
  resources.forEach(resource => {
    validateTenantOwnership(resource, userCompanyId);
  });
}
