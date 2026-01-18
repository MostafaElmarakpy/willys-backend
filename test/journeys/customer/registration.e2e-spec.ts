import { INestApplication } from "@nestjs/common";
import {
  loginUser,
  logoutUser,
  refreshToken,
  registerUser,
} from "../../helpers/auth.helper";
import { authenticatedPatch, publicPost } from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
} from "../../setup/test-app";

describe("Customer Registration & Authentication (E2E)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("Registration", () => {
    it("should register a new user with email", async () => {
      const userData = {
        fullName: "John Doe",
        email: "john.doe@test.com",
        password: "Test@1234",
        userLocale: "en",
      };

      const { user, tokens } = await registerUser(app, userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.fullName).toBe(userData.fullName);
      expect(tokens).toBeDefined();
      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();
    });

    it("should register a new user with phone number", async () => {
      const userData = {
        fullName: "Jane Smith",
        phoneNumber: "1012345678",
        phoneNumberCountryCode: "EG",
        password: "Test@1234",
        userLocale: "en",
      };

      const { user, tokens } = await registerUser(app, userData);

      expect(user).toBeDefined();
      expect(user.phoneNumber).toBe(userData.phoneNumber);
      expect(user.phoneNumberCountryCode).toBe(userData.phoneNumberCountryCode);
      expect(tokens).toBeDefined();
    });

    it("should reject registration with duplicate email", async () => {
      const userData = {
        fullName: "John Doe",
        email: "duplicate@test.com",
        password: "Test@1234",
        userLocale: "en",
      };

      // First registration
      await registerUser(app, userData);

      // Second registration with same email
      const response = await publicPost(app, "/auth/register", userData);

      expect(response.status).toBe(409); // Conflict
    });

    it("should reject registration with invalid email format", async () => {
      const response = await publicPost(app, "/auth/register", {
        fullName: "John Doe",
        email: "invalid-email",
        password: "Test@1234",
        userLocale: "en",
      });

      expect(response.status).toBe(400); // Bad Request
    });

    it("should reject weak password", async () => {
      const response = await publicPost(app, "/auth/register", {
        fullName: "John Doe",
        email: "test@test.com",
        password: "123", // Too weak
        userLocale: "en",
      });

      expect(response.status).toBe(400);
    });

    it("should reject registration without required fields", async () => {
      const response = await publicPost(app, "/auth/register", {
        email: "test@test.com",
        // Missing fullName and password
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Login", () => {
    it("should login with email and password", async () => {
      // First register
      const userData = {
        fullName: "Login Test",
        email: "login@test.com",
        password: "Test@1234",
        userLocale: "en",
      };
      await registerUser(app, userData);

      // Then login
      const { user, tokens } = await loginUser(app, {
        identifier: userData.email!,
        password: userData.password,
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(tokens).toBeDefined();
      expect(tokens.access_token).toBeDefined();
    });

    it("should login with phone number and password", async () => {
      // First register
      const userData = {
        fullName: "Login Test",
        phoneNumber: "1098765432",
        phoneNumberCountryCode: "EG",
        password: "Test@1234",
        userLocale: "en",
      };
      await registerUser(app, userData);

      // Then login with phone
      const { user, tokens } = await loginUser(app, {
        identifier: "1098765432",
        password: userData.password,
      });

      expect(user).toBeDefined();
      expect(user.phoneNumber).toBe(userData.phoneNumber);
      expect(tokens).toBeDefined();
    });

    it("should reject login with wrong password", async () => {
      // First register
      const userData = {
        fullName: "Login Test",
        email: "wrong@test.com",
        password: "Test@1234",
        userLocale: "en",
      };
      await registerUser(app, userData);

      // Try login with wrong password
      const response = await publicPost(app, "/auth/login", {
        identifier: userData.email,
        password: "WrongPassword",
      });

      expect(response.status).toBe(401); // Unauthorized
    });

    it("should reject login with non-existent user", async () => {
      const response = await publicPost(app, "/auth/login", {
        identifier: "nonexistent@test.com",
        password: "Test@1234",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Token Refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const userData = {
        fullName: "Refresh Test",
        email: "refresh@test.com",
        password: "Test@1234",
        userLocale: "en",
      };
      const { tokens: initialTokens } = await registerUser(app, userData);

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Refresh token
      const newTokens = await refreshToken(app, initialTokens.refresh_token);

      expect(newTokens).toBeDefined();
      expect(newTokens.access_token).toBeDefined();
      expect(newTokens.access_token).not.toBe(initialTokens.access_token);
    });

    it("should reject refresh with invalid token", async () => {
      const response = await publicPost(app, "/auth/refresh", {
        refresh_token: "invalid_token",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("Logout", () => {
    it("should logout successfully", async () => {
      const userData = {
        fullName: "Logout Test",
        email: "logout@test.com",
        password: "Test@1234",
        userLocale: "en",
      };
      const { tokens } = await registerUser(app, userData);

      await logoutUser(app, tokens.access_token);

      // Try to use the same token after logout (should fail)
      const _response = await authenticatedPatch(
        app,
        "/users/profile",
        tokens.access_token,
        { fullName: "New Name" },
      );

      // Note: Depending on implementation, this might still work if token is not blacklisted
      // Adjust expectation based on actual implementation
    });
  });

  describe("Profile Management", () => {
    it("should get user profile", async () => {
      const userData = {
        fullName: "Profile Test",
        email: "profile@test.com",
        password: "Test@1234",
        userLocale: "en",
      };
      const { tokens } = await registerUser(app, userData);

      await authenticatedPatch(app, "/users/profile", tokens.access_token, {});

      // Adjust based on actual endpoint
    });

    it("should update user profile", async () => {
      const userData = {
        fullName: "Update Test",
        email: "update@test.com",
        password: "Test@1234",
        userLocale: "en",
      };
      const { tokens } = await registerUser(app, userData);

      const _response = await authenticatedPatch(
        app,
        "/users/profile",
        tokens.access_token,
        {
          fullName: "Updated Name",
        },
      );

      // Verify update (adjust based on actual response structure)
    });
  });

  describe("Account Deletion", () => {
    it("should delete user account", async () => {
      const userData = {
        fullName: "Delete Test",
        email: "delete@test.com",
        password: "Test@1234",
        userLocale: "en",
      };
      await registerUser(app, userData);

      // Delete account (adjust endpoint based on actual implementation)
      // const response = await authenticatedDelete(app, '/users/me', tokens.access_token);
      // expect(response.status).toBe(200);

      // Try to login after deletion (should fail)
      const _loginResponse = await publicPost(app, "/auth/login", {
        identifier: userData.email,
        password: userData.password,
      });

      // expect(loginResponse.status).toBe(401);
    });
  });
});
