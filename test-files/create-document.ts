import { z } from "zod";
import { createDocument } from "zod-openapi";

const document = createDocument({
  info: {
    title: "My API",
    version: "1.0.0",
  },
  openapi: "3.1.0",
  paths: {
    "/users/{id}": {
      id: "registeredPath",
      get: {
        requestBody: {
          id: "registeredRequestBody",
          content: {
            "application/json": {
              schema: z
                .object({
                  name: z.string(),
                })
                .meta({ id: "registeredRequestBodySchema" }),
            },
          },
        },
        requestParams: {
          cookie: z.object({
            sessionref: z.string().meta({ param: { id: "registeredCookie" } }),
          }),
          header: z.object({
            Authorization: z.string(),
          }),
          path: z.object({
            ref: z.string(),
          }),
          query: z.object({
            search: z.string().optional(),
          }),
        },
        callbacks: {
          onData: {
            id: "registeredCallback",
            "{$request.query.callbackUrl}/data": {
              post: {
                requestBody: {
                  content: {
                    "application/json": {
                      schema: z
                        .object({
                          data: z.string(),
                        })
                        .meta({
                          id: "registeredCallbackRequestBodySchema",
                        }),
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Callback received",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            id: "registeredResponse",
            description: "User found",
            headers: z.object({
              "X-RateLimit-Limit": z
                .string()
                .optional()
                .meta({
                  header: { id: "registeredHeader" },
                }),
            }),
            content: {
              "application/json": {
                schema: z
                  .object({
                    ref: z.string(),
                    name: z.string(),
                  })
                  .meta({
                    id: "registeredResponseSchema",
                  }),
              },
            },
          },
        },
      },
    },
  },
});

export { document };
