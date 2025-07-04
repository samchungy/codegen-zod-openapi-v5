// TODO: effectType was removed
// Transforms are not introspectable. effectType was introduced to attempt to address this and to try and keep the transform locked to the same type as the input schema.
// For transform operations, use Zod's native .overwrite() method, wrap your schema in a .pipe(), or declare a manual type.
// See: https://zod.dev/v4?id=overwrite

import { z } from "zod";

// Test effectType transformation
const transformSchema1 = z
  .string()
  .transform((val) => val.toUpperCase())
  .meta({
    description: "A string transform",
  });

const transformSchema2 = z
  .number()
  .transform((val) => val * 2)
  .meta({
    id: "NumberTransform",
    description: "A number transform",
  });

const transformSchema3 = z
  .object({
    name: z.string(),
  })
  .transform((obj) => ({ ...obj, processed: true }))
  .meta({
    id: "ObjectTransform",
    unusedIO: "input",
  });

// Test mixed cases
const complexSchema = z
  .object({
    data: z
      .string()
      .transform((val) => val.trim())
      .meta({
        description: "Data transform",
        id: "DataTransform",
      }),
    count: z.number().meta({
      description: "Count field",
      id: "CountField",
    }),
  })
  .meta({
    id: "ComplexSchema",
  });

export { transformSchema1, transformSchema2, transformSchema3, complexSchema };
