import { z } from "zod";
import { createSchema } from "zod-openapi";

// Test createSchema with unionOneOf - should get the new override format
const schema1 = createSchema(z.union([z.string(), z.number()]), {
  io: "input",

  description: "A union schema",
  opts: {
    override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "union") {
        jsonSchema.oneOf = jsonSchema.anyOf;
        delete jsonSchema.anyOf;
      }
    },
  },
});

export { schema1 };
