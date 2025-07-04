import { z } from "zod";

// Test nested ref in header object
const headerSchema = z.string().meta({
  header: { id: "registeredHeader" },
  description: "Header with registered ref",
});

// Test nested ref in param object
const paramSchema = z.string().meta({
  param: { id: "registeredParam" },
  description: "Param with registered ref",
});

// Test multiple nested refs
const complexSchema = z
  .object({
    id: z.string().meta({
      description: "ID field",
      header: { id: "complexHeader" },
    }),
    name: z.string().meta({
      description: "Name field",
      param: { id: "complexParam" },
    }),
  })
  .meta({
    id: "ComplexSchema",
    description: "Schema with multiple nested refs",
  });

// Test deeply nested refs
const deepSchema = z.string().meta({
  description: "Deep nesting test",
  metadata: {
    header: { id: "deepHeader" },
    param: { id: "deepParam" },
    nested: {
      innerRef: { id: "innerRef" },
    },
  },
  id: "DeepSchema",
});

export { headerSchema, paramSchema, complexSchema, deepSchema };
