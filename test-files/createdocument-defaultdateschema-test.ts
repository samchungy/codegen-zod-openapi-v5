import { z } from "zod";
import { createDocument } from "zod-openapi";

// Test createDocument with defaultDateSchema - should be converted to override
const document1 = createDocument(
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
      if (def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
      }
    },
  }
);

// Test createDocument with both unionOneOf and defaultDateSchema - should merge
const document2 = createDocument(
  {
    openapi: "3.1.0",
    info: {
      title: "Test API 2",
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
      if (def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
      }
    },
  }
);

export { document1, document2 };
