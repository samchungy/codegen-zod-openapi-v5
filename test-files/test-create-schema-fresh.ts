import { createSchema } from "zod-openapi";
import * as z from "zod/v4";

const schema = createSchema(z.string(), {
  io: "input",
});
