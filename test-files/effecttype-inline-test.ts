import { z } from "zod";

// Test effectType inline commenting
const transformSchema1 = z
  .string()
  .transform((val) => val.toUpperCase())
  .meta({
    // effectType: 'input',
    // TODO: effectType was removed
    // Transforms are not introspectable. effectType was introduced to attempt to address this and to try and keep the transform locked to the same type as the input schema.
    // For transform operations, use Zod's native .overwrite() method, wrap your schema in a .pipe(), or declare a manual type.
    // See: https://zod.dev/v4?id=overwrite,
    description: "A string transform",
  });

const transformSchema2 = z
  .number()
  .transform((val) => val * 2)
  .meta({
    // effectType: 'output',
    // TODO: effectType was removed
    // Transforms are not introspectable. effectType was introduced to attempt to address this and to try and keep the transform locked to the same type as the input schema.
    // For transform operations, use Zod's native .overwrite() method, wrap your schema in a .pipe(), or declare a manual type.
    // See: https://zod.dev/v4?id=overwrite,
    id: "NumberTransform",
    description: "A number transform",
  });

const transformSchema3 = z
  .object({
    name: z.string(),
  })
  .transform((obj) => ({ ...obj, processed: true }))
  .meta({
    // effectType: 'same',
    // TODO: effectType was removed
    // Transforms are not introspectable. effectType was introduced to attempt to address this and to try and keep the transform locked to the same type as the input schema.
    // For transform operations, use Zod's native .overwrite() method, wrap your schema in a .pipe(), or declare a manual type.
    // See: https://zod.dev/v4?id=overwrite,
    id: "ObjectTransform",
    unusedIO: "input",
  });

export { transformSchema1, transformSchema2, transformSchema3 };
