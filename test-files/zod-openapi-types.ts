import { z } from "zod";
import {
  ZodOpenApiResponseObject,
  ZodOpenApiCallbackObject,
  ZodOpenApiParameterObject,
} from "zod-openapi";

// Test ZodOpenApiResponseObject
const response: ZodOpenApiResponseObject = {
  description: "200 OK",
  content: {
    "application/json": {
      schema: z.object({ a: z.string() }),
    },
  },
  id: "some-response",
};

// Test ZodOpenApiCallbackObject
const callback: ZodOpenApiCallbackObject = {
  id: "some-callback",
  post: {
    responses: {
      200: {
        description: "200 OK",
        content: {
          "application/json": {
            schema: z.object({ a: z.string() }),
          },
        },
      },
    },
  },
};

// Test ZodOpenApiParameterObject
const parameter: ZodOpenApiParameterObject = {
  id: "some-parameter",
  name: "userId",
  in: "path",
  required: true,
  schema: z.string(),
};

// Test nested object with ref
const complexResponse: ZodOpenApiResponseObject = {
  description: "Complex response",
  content: {
    "application/json": {
      schema: z.object({
        data: z.array(z.object({ id: z.string() })),
        meta: z.object({
          count: z.number(),
          nested: z.object({
            ref: "nested-ref", // This should NOT be changed as it's not a top-level ref
          }),
        }),
      }),
    },
  },
  id: "complex-response", // This should be changed to id
};

export { response, callback, parameter, complexResponse };
