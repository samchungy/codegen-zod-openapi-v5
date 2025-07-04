import { z } from "zod";
import { createDocument } from "zod-openapi";

// Test createDocument with unionOneOf - should include return statement
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
      if (def.type === "union") {
        jsonSchema.oneOf = jsonSchema.anyOf;
        delete jsonSchema.anyOf;
        return;
      }
    },
  }
);

// Test createDocument with defaultDateSchema - should include return statement
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
      if (def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
        return;
      }
    },
  }
);

// Test createDocument with both - should include return statements in both conditions
const document3 = createDocument(
  {
    openapi: "3.1.0",
    info: {
      title: "Test API 3",
      version: "1.0.0",
    },
  },
  {
    override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "union") {
        jsonSchema.oneOf = jsonSchema.anyOf;
        delete jsonSchema.anyOf;
        return;
      }
      if (def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
        return;
      }
    },
  }
);

export { document1, document2, document3 };
