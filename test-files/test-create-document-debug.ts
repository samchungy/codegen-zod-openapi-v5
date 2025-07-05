import { createDocument } from "zod-openapi";

const doc = createDocument(
  {
    openapi: "3.0.0",
    info: { title: "Test", version: "1.0.0" },
    paths: {},
  },
  {
    override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date";
        return;
      }
    },
  }
);
