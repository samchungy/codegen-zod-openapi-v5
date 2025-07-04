import { z } from "zod";
import {
  createDocument,
  createSchema,
  extendZodWithOpenApi,
} from "zod-openapi";

extendZodWithOpenApi(z);

// Test createDocument with defaultDateSchema
const doc = createDocument(
  {
    openapi: "3.0.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
    paths: {},
  },
  {
    defaultDateSchema: {
      type: "string",
      format: "date-time",
    },
  }
);

// Test createSchema with defaultDateSchema
const schema = createSchema(z.date(), {
  schemaType: "input",
  defaultDateSchema: {
    type: "string",
    format: "date-time",
    example: "2023-01-01T00:00:00Z",
  },
});

export { doc, schema };
