import { z } from "zod";

// Simple unionOneOf test
const unionSchema = z.union([z.string(), z.number()]).meta({
  override: ({ jsonSchema: jsonSchema }) => {
    jsonSchema.oneOf = jsonSchema.anyOf;
    delete jsonSchema.anyOf;
  },
  description: "A simple union",
});

export { unionSchema };
