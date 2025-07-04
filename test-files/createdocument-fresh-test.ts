const document = createDocument(
  {
    openapi: "3.1.0",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
  },
  {
    override: ({ jsonSchema, zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
      }
    },
  }
);
