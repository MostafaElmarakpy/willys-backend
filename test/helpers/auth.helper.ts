import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as request from "supertest";
import { UserRole } from "../../src/common/enums/UserRole";
import { User } from "../../src/database/entities/user.entity";

export interface RegisterUserData {
  fullName: string;
  email?: string;
  phoneNumber?: string;
  phoneNumberCountryCode?: string;
  password: string;
  userLocale?: string;
  role?: string;
}

export interface LoginCredentials {
  identifier: string; // email or phone
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  access_token_expire: string;
  refresh_token_expire: string;
  type: string;
}

export interface AuthResponse {
  user: User;
  token: AuthTokens;
}

/**
 * Register a new user via API
 */
export async function registerUser(
  app: INestApplication,
  userData: RegisterUserData,
): Promise<{ user: User; tokens: AuthTokens }> {
  // Determine registration method based on provided data
  const registerMethod = userData.email ? "email" : "phone";

  const payload: any = {
    fullName: userData.fullName,
    password: userData.password,
    userLocale: userData.userLocale || "en",
    registerMethod,
    callbackUrl: "http://localhost:3000/verify-email",
  };

  if (registerMethod === "email") {
    payload.email = userData.email;
  } else {
    payload.phoneNumber = userData.phoneNumber;
    payload.phoneNumberCountryCode = userData.phoneNumberCountryCode || "+20";
  }

  const response = await request(app.getHttpServer())
    .post("/auth/register")
    .set("api-version", "1")
    .send(payload);

  if (response.status !== 200 && response.status !== 201) {
    console.error("Registration failed with payload:", JSON.stringify(payload));
    console.error(
      "Response:",
      response.status,
      JSON.stringify(response.body, null, 2),
    );
    throw new Error(
      `Registration failed: ${response.status} - ${JSON.stringify(response.body)}`,
    );
  }

  const user = response.body.data;

  // Registration doesn't return tokens, so login the user to get tokens
  const identifier = userData.email || userData.phoneNumber!;
  const loginResult = await loginUser(app, {
    identifier,
    password: userData.password,
  });

  return {
    user,
    tokens: loginResult.tokens,
  };
}

/**
 * Login a user via API
 */
export async function loginUser(
  app: INestApplication,
  credentials: LoginCredentials,
): Promise<{ user: User; tokens: AuthTokens }> {
  // Determine login method based on identifier format (simple check)
  const loginMethod = credentials.identifier.includes("@") ? "email" : "phone";

  const payload: any = {
    loginMethod,
    identifier: credentials.identifier,
    password: credentials.password,
  };

  // Add phoneNumberCountryCode if it's a phone login
  if (loginMethod === "phone") {
    payload.phoneNumberCountryCode = "EG"; // default country code (Egypt)
  }

  const response = await request(app.getHttpServer())
    .post("/auth/login")
    .set("api-version", "1")
    .send(payload);

  if (response.status !== 200 && response.status !== 201) {
    console.error("Login failed with payload:", JSON.stringify(payload));
    console.error(
      "Response:",
      response.status,
      JSON.stringify(response.body, null, 2),
    );
    throw new Error(
      `Login failed: ${response.status} - ${JSON.stringify(response.body)}`,
    );
  }

  return {
    user: response.body.data.user,
    tokens: response.body.data.token,
  };
}

/**
 * Generate JWT token for a user (bypassing API)
 */
export function getAuthToken(user: Partial<User>, jwtSecret?: string): string {
  const jwtService = new JwtService({
    secret: jwtSecret || "test_secret_key_for_e2e_tests",
  });

  const payload = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    phoneNumberCountryCode: user.phoneNumberCountryCode,
    role: user.role,
    expirationDate: new Date(Date.now() + 3600000), // 1 hour
    refreshExpirationDate: new Date(Date.now() + 604800000), // 7 days
  };

  return jwtService.sign(payload);
}

/**
 * Generate admin token with specific role
 */
export function getAdminToken(
  adminUser: Partial<User>,
  jwtSecret?: string,
): string {
  return getAuthToken(
    {
      ...adminUser,
      role: adminUser.role || UserRole.admin,
    },
    jwtSecret,
  );
}

/**
 * Refresh access token via API
 */
export async function refreshToken(
  app: INestApplication,
  refreshToken: string,
): Promise<AuthTokens> {
  const response = await request(app.getHttpServer())
    .post("/auth/refresh")
    .set("api-version", "1")
    .send({ refresh_token: refreshToken })
    .expect(201);

  return response.body.data.token;
}

/**
 * Logout user via API
 */
export async function logoutUser(
  app: INestApplication,
  accessToken: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post("/auth/logout")
    .set("api-version", "1")
    .set("Authorization", `Bearer ${accessToken}`)
    .expect(201);
}

/**
 * Hash a password (useful for creating users directly in DB)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Request password reset via API
 */
export async function requestPasswordReset(
  app: INestApplication,
  email: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post("/auth/forgot-password")
    .send({ email })
    .expect(200);
}

/**
 * Reset password with token via API
 */
export async function resetPassword(
  app: INestApplication,
  token: string,
  newPassword: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post("/auth/reset-password")
    .send({
      token,
      password: newPassword,
    })
    .expect(200);
}

/**
 * Verify email with token via API
 */
export async function verifyEmail(
  app: INestApplication,
  token: string,
): Promise<void> {
  await request(app.getHttpServer())
    .post("/auth/verify-email")
    .send({ token })
    .expect(200);
}
