import * as z from "zod/v4";

import { createSchema } from "zod-openapi";

const UserSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  })
  .meta({
    id: "User",
    unusedIO: "input",
    // effectType: 'input'

    // TODO: effectType was removed
    // Transforms are not introspectable. effectType was introduced to attempt to address this and to try and keep the transform locked to the same type as the input schema.
    // For transform operations, use Zod's native .overwrite() method, wrap your schema in a .pipe(), or declare a manual type.
    // See: https://zod.dev/v4?id=overwrite
  });

const schema = createSchema(UserSchema, {
  io: "input",
  schemaComponentRefPath: "#/components/schemas/{name}",
  schemaComponents: {
    User: UserSchema,
  },
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
