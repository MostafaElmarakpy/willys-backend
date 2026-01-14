import { JwtService } from "@nestjs/jwt";
import * as jwt from "jsonwebtoken";

export interface JwtPayload {
  id: string;
  email?: string;
  fullName?: string;
  phoneNumber?: string;
  phoneNumberCountryCode?: string;
  role: string;
  expirationDate?: Date;
  refreshExpirationDate?: Date;
}

/**
 * Generate a custom JWT token with specific payload
 */
export function generateJWT(
  payload: Partial<JwtPayload>,
  secret: string = "test_secret_key_for_e2e_tests",
  expiresIn: string = "1h",
): string {
  const jwtService = new JwtService({ secret });

  return jwtService.sign(
    {
      ...payload,
      expirationDate: new Date(Date.now() + 3600000),
      refreshExpirationDate: new Date(Date.now() + 604800000),
    },
    { expiresIn },
  );
}

/**
 * Decode a JWT token without verification
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch (_error) {
    return null;
  }
}

/**
 * Verify a JWT token
 */
export function verifyToken(
  token: string,
  secret: string = "test_secret_key_for_e2e_tests",
): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (_error) {
    return null;
  }
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredToken(
  payload: Partial<JwtPayload>,
  secret: string = "test_secret_key_for_e2e_tests",
): string {
  return jwt.sign(
    {
      ...payload,
      expirationDate: new Date(Date.now() - 3600000), // 1 hour ago
    },
    secret,
    { expiresIn: "-1h" }, // Already expired
  );
}

/**
 * Generate a token that expires soon (useful for testing refresh)
 */
export function generateSoonToExpireToken(
  payload: Partial<JwtPayload>,
  secret: string = "test_secret_key_for_e2e_tests",
  expiresInSeconds: number = 5,
): string {
  return jwt.sign(
    {
      ...payload,
      expirationDate: new Date(Date.now() + expiresInSeconds * 1000),
    },
    secret,
    { expiresIn: `${expiresInSeconds}s` },
  );
}

/**
 * Generate a malformed token (invalid signature)
 */
export function generateInvalidToken(payload: Partial<JwtPayload>): string {
  return jwt.sign(payload, "wrong_secret", { expiresIn: "1h" });
}

/**
 * Extract token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.expirationDate) {
    return null;
  }
  return new Date(decoded.expirationDate);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) {
    return true;
  }
  return expiration < new Date();
}

/**
 * Generate admin token with custom permissions
 */
export function generateAdminToken(
  userId: string,
  role: string = "admin",
  secret: string = "test_secret_key_for_e2e_tests",
): string {
  return generateJWT(
    {
      id: userId,
      email: `admin-${userId}@test.com`,
      fullName: "Test Admin",
      role: role,
    },
    secret,
  );
}

/**
 * Generate customer token
 */
export function generateCustomerToken(
  userId: string,
  email?: string,
  secret: string = "test_secret_key_for_e2e_tests",
): string {
  return generateJWT(
    {
      id: userId,
      email: email || `customer-${userId}@test.com`,
      fullName: "Test Customer",
      role: "user",
    },
    secret,
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(
  payload: Partial<JwtPayload>,
  secret: string = "test_secret_key_for_e2e_tests",
): string {
  return jwt.sign(
    {
      ...payload,
      refreshExpirationDate: new Date(Date.now() + 604800000), // 7 days
    },
    secret,
    { expiresIn: "7d" },
  );
}
