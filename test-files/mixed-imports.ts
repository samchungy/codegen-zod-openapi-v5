import { z } from "zod";
import { SomeOtherImport } from "zod-openapi";

// This file tests mixed imports - should only remove extendZodWithOpenApi
const MySchema = z
  .object({
    id: z.string().meta({ description: "ID field" }),
    data: z
      .object({
        value: z.number().meta({ description: "Nested value" }),
      })
      .meta({ id: "DataObject" }),
  })
  .meta({ id: "MySchema" });

export { MySchema };
