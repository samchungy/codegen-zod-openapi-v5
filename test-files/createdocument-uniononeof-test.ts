import { z } from "zod";
import { createDocument } from "zod-openapi";

const UserSchema = z
  .object({
    name: z.string(),
    age: z.number(),
  })
  .meta({ id: "User" });

// Test createDocument with unionOneOf option
const document1 = createDocument(
  {
    openapi: "3.1.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
    paths: {
      "/users": {
        get: {
          responses: {
            "200": {
              description: "Success",
              content: {
                "application/json": {
                  schema: UserSchema,
                },
              },
            },
          },
        },
      },
    },
  },
  {
    override: ({ jsonSchema: jsonSchema }) => {
      jsonSchema.oneOf = jsonSchema.anyOf;
      delete jsonSchema.anyOf;
    },
  }
);

// Test createDocument with unionOneOf and other options
const document2 = createDocument(
  {
    openapi: "3.1.0",
    info: {
      title: "Another API",
      version: "2.0.0",
    },
    paths: {
      "/items": {
        id: "ItemPath",
        post: {
          requestBody: {
            id: "ItemRequestBody",
            content: {
              "application/json": {
                schema: z.union([z.string(), z.number()]),
              },
            },
          },
        },
      },
    },
  },
  {
    override: ({ jsonSchema: jsonSchema }) => {
      jsonSchema.oneOf = jsonSchema.anyOf;
      delete jsonSchema.anyOf;
    },
    otherOption: "value",
  }
);

// Test createDocument without unionOneOf (should not be transformed)
const document3 = createDocument(
  {
    openapi: "3.1.0",
    info: {
      title: "Third API",
      version: "3.0.0",
    },
  },
  {
    someOtherOption: true,
  }
);

export { document1, document2, document3 };
