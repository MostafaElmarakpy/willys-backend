import { INestApplication } from "@nestjs/common";
import * as request from "supertest";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Make an authenticated GET request
 */
export async function authenticatedGet(
  app: INestApplication,
  url: string,
  token: string,
  query?: Record<string, any>,
) {
  let req = request(app.getHttpServer())
    .get(url)
    .set("Authorization", `Bearer ${token}`);

  if (query) {
    req = req.query(query);
  }

  return req;
}

/**
 * Make an authenticated POST request
 */
export async function authenticatedPost(
  app: INestApplication,
  url: string,
  token: string,
  data?: any,
) {
  return request(app.getHttpServer())
    .post(url)
    .set("Authorization", `Bearer ${token}`)
    .send(data);
}

/**
 * Make an authenticated PATCH request
 */
export async function authenticatedPatch(
  app: INestApplication,
  url: string,
  token: string,
  data?: any,
) {
  return request(app.getHttpServer())
    .patch(url)
    .set("Authorization", `Bearer ${token}`)
    .send(data);
}

/**
 * Make an authenticated PUT request
 */
export async function authenticatedPut(
  app: INestApplication,
  url: string,
  token: string,
  data?: any,
) {
  return request(app.getHttpServer())
    .put(url)
    .set("Authorization", `Bearer ${token}`)
    .send(data);
}

/**
 * Make an authenticated DELETE request
 */
export async function authenticatedDelete(
  app: INestApplication,
  url: string,
  token: string,
) {
  return request(app.getHttpServer())
    .delete(url)
    .set("Authorization", `Bearer ${token}`);
}

/**
 * Make a public GET request (no authentication)
 */
export async function publicGet(
  app: INestApplication,
  url: string,
  query?: Record<string, any>,
) {
  let req = request(app.getHttpServer()).get(url);

  if (query) {
    req = req.query(query);
  }

  return req;
}

/**
 * Make a public POST request (no authentication)
 */
export async function publicPost(
  app: INestApplication,
  url: string,
  data?: any,
) {
  return request(app.getHttpServer()).post(url).send(data);
}

/**
 * Make a public PATCH request (no authentication)
 */
export async function publicPatch(
  app: INestApplication,
  url: string,
  data?: any,
) {
  return request(app.getHttpServer()).patch(url).send(data);
}

/**
 * Make a public DELETE request (no authentication)
 */
export async function publicDelete(app: INestApplication, url: string) {
  return request(app.getHttpServer()).delete(url);
}

/**
 * Upload a file with authentication
 */
export async function authenticatedFileUpload(
  app: INestApplication,
  url: string,
  token: string,
  fieldName: string,
  filePath: string,
  additionalFields?: Record<string, any>,
) {
  let req = request(app.getHttpServer())
    .post(url)
    .set("Authorization", `Bearer ${token}`)
    .attach(fieldName, filePath);

  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      req = req.field(key, value);
    });
  }

  return req;
}

/**
 * Generic authenticated request
 */
export async function authenticatedRequest(
  app: INestApplication,
  method: HttpMethod,
  url: string,
  token: string,
  data?: any,
  query?: Record<string, any>,
) {
  let req = request(app.getHttpServer())
    [method.toLowerCase()](url)
    .set("Authorization", `Bearer ${token}`);

  if (query) {
    req = req.query(query);
  }

  if (data && ["POST", "PATCH", "PUT"].includes(method)) {
    req = req.send(data);
  }

  return req;
}

/**
 * Extract data from response body
 */
export function extractData(response: any): any {
  return response.body.data || response.body;
}

/**
 * Extract error from response body
 */
export function extractError(response: any): any {
  return response.body.error || response.body.message;
}

/**
 * Check if response is successful (2xx status)
 */
export function isSuccessResponse(response: any): boolean {
  return response.status >= 200 && response.status < 300;
}

/**
 * Assert response structure matches expected format
 */
export function assertResponseStructure(
  response: any,
  expectedKeys: string[],
): void {
  const data = extractData(response);
  expectedKeys.forEach((key) => {
    if (!(key in data)) {
      throw new Error(
        `Expected key '${key}' not found in response. Keys: ${Object.keys(data).join(", ")}`,
      );
    }
  });
}
