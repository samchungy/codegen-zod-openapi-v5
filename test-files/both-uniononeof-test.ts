import { z } from "zod";
import { createDocument } from "zod-openapi";

// Test .meta() unionOneOf (should get simple override)
const unionSchema = z.union([z.string(), z.number()]).meta({
  override: ({ jsonSchema: jsonSchema }) => {
    jsonSchema.oneOf = jsonSchema.anyOf;
    delete jsonSchema.anyOf;
  },
  description: "A union schema",
});

// Test createDocument unionOneOf (should get sophisticated override)
const document = createDocument(
  {
    openapi: "3.1.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
  },
  {
    override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "union") {
        jsonSchema.oneOf = jsonSchema.anyOf;
        delete jsonSchema.anyOf;
      }
    },
  }
);

export { unionSchema, document };
