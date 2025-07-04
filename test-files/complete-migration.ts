import { z } from "zod";
import {
  extendZodWithOpenApi,
  createDocument,
  ZodOpenApiResponseObject,
} from "zod-openapi";

extendZodWithOpenApi(z);

// Test all migration features together
const userSchema = z
  .object({
    id: z.string().openapi({ description: "User ID" }),
    name: z.string().openapi({
      description: "User name",
      param: { ref: "userNameParam" },
      header: { ref: "userNameHeader" },
    }),
  })
  .openapi({ ref: "User" });

const response: ZodOpenApiResponseObject = {
  description: "User response",
  ref: "UserResponse",
  content: {
    "application/json": {
      schema: userSchema,
    },
  },
};

const apiDocument = createDocument({
  info: {
    title: "Complete API",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  paths: {
    "/users/{id}": {
      ref: "userPath",
      get: {
        parameters: [
          {
            ref: "userIdParam",
            name: "id",
            in: "path",
            required: true,
            schema: z.string().openapi({ description: "User ID parameter" }),
          },
        ],
        responses: {
          "200": {
            ref: "getUserResponse",
            description: "User found",
            content: {
              "application/json": {
                schema: z
                  .object({
                    user: userSchema,
                    metadata: z.object({
                      ref: "should-not-change", // This should stay as 'ref' (property name)
                      timestamp: z.string().openapi({ ref: "TimestampSchema" }),
                    }),
                  })
                  .openapi({ ref: "GetUserResponseSchema" }),
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        ref: "UserComponentSchema",
      },
    },
  },
});

export { userSchema, response, apiDocument };
