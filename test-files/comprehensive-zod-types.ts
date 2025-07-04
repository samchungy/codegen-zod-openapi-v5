import { z } from "zod";
import {
  ZodOpenApiResponseObject,
  ZodOpenApiCallbackObject,
  ZodOpenApiParameterObject,
  ZodOpenApiRequestBodyObject,
  ZodOpenApiHeaderObject,
  ZodOpenApiTagObject,
} from "zod-openapi";

// Test all ZodOpenApi* types that should have ref -> id transformation
const response: ZodOpenApiResponseObject = {
  description: "200 OK",
  ref: "UserResponse",
  content: {
    "application/json": {
      schema: z.object({
        user: z
          .object({
            id: z.string().openapi({ description: "User ID" }),
          })
          .openapi({ ref: "User" }),
      }),
    },
  },
};

const callback: ZodOpenApiCallbackObject = {
  ref: "UserCallback",
  "{$request.body#/webhookUrl}": {
    post: {
      requestBody: {
        content: {
          "application/json": {
            schema: z.object({ event: z.string() }),
          },
        },
      },
    },
  },
};

const parameter: ZodOpenApiParameterObject = {
  ref: "UserIdParam",
  name: "userId",
  in: "path",
  required: true,
  schema: z.string().openapi({ description: "The user ID" }),
};

const requestBody: ZodOpenApiRequestBodyObject = {
  ref: "CreateUserRequest",
  description: "User creation request",
  content: {
    "application/json": {
      schema: z
        .object({
          name: z.string().openapi({ description: "User name" }),
          email: z.string().email().openapi({ description: "User email" }),
        })
        .openapi({ ref: "CreateUserBody" }),
    },
  },
};

const header: ZodOpenApiHeaderObject = {
  ref: "AuthHeader",
  description: "Authorization header",
  schema: z.string().openapi({ description: "Bearer token" }),
};

const tag: ZodOpenApiTagObject = {
  ref: "UserTag",
  name: "Users",
  description: "User management operations",
};

// Test mixed scenarios
const complexMixed = {
  response: {
    description: "Complex response",
    ref: "ComplexResponse", // This should NOT be changed (not ZodOpenApi* type)
    content: {
      "application/json": {
        schema: z.object({
          data: z.array(z.string()).openapi({ ref: "DataArray" }),
          meta: z.object({
            ref: "metadata-ref", // This should NOT be changed (nested)
          }),
        }),
      },
    },
  },
};

export {
  response,
  callback,
  parameter,
  requestBody,
  header,
  tag,
  complexMixed,
};
