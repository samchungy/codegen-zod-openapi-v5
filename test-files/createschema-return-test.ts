import { z } from "zod";
import { createSchema } from "zod-openapi";

// Test createSchema with unionOneOf - should include return statement
const schema1 = createSchema(z.union([z.string(), z.number()]), {
  io: "input",

  description: "A union schema with return",
  opts: {
    override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "union") {
        jsonSchema.oneOf = jsonSchema.anyOf;
        delete jsonSchema.anyOf;
        return;
      }
    },
  },
});

export { schema1 };
