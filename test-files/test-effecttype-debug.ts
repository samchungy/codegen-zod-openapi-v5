import * as z from "zod/v4";

const schema = z.string().meta({
  // effectType: 'input'
  // TODO: effectType was removed
  // Transforms are not introspectable. effectType was introduced to attempt to address this and to try and keep the transform locked to the same type as the input schema.
  // For transform operations, use Zod's native .overwrite() method, wrap your schema in a .pipe(), or declare a manual type.
  // See: https://zod.dev/v4?id=overwrite
});
