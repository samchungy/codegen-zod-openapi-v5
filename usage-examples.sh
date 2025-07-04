#!/usr/bin/env bash

# Example usage script for the zod-openapi migration tool

echo "🔄 zod-openapi v5 Migration Tool - Usage Examples"
echo "================================================"

# Build the project first
echo "Building the project..."
pnpm build

echo ""
echo "1. Basic migration (dry run first to preview changes):"
echo "   npx tsx src/index.ts \"src/**/*.ts\" --dry-run"
echo ""

echo "2. Apply migration to all TypeScript files:"
echo "   npx tsx src/index.ts \"src/**/*.ts\""
echo ""

echo "3. Apply migration with verbose output:"
echo "   npx tsx src/index.ts \"src/**/*.ts\" --verbose"
echo ""

echo "4. Apply migration while ignoring specific directories:"
echo "   npx tsx src/index.ts \"src/**/*.ts\" --ignore \"src/test/**,src/generated/**\""
echo ""

echo "5. Apply migration to JavaScript files:"
echo "   npx tsx src/index.ts \"src/**/*.js\""
echo ""

echo "6. Apply migration to both TypeScript and JavaScript:"
echo "   npx tsx src/index.ts \"src/**/*.{ts,js}\""
echo ""

echo "7. After building, you can use the built version:"
echo "   node dist/index.js \"src/**/*.ts\""
echo ""

echo "8. Install globally (after publishing to npm):"
echo "   npm install -g zod-openapi-v5-migration"
echo "   zod-openapi-migrate \"src/**/*.ts\""
echo ""

echo "Example with a sample project:"
echo "=============================="

# Create a sample project structure
mkdir -p example-project/src
cat > example-project/src/schemas.ts << 'EOF'
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

export const UserSchema = z.object({
  id: z.string().openapi({ description: 'User ID' }),
  name: z.string().openapi({ description: 'User name' }),
  email: z.string().email().openapi({ description: 'User email' }),
  age: z.number().optional().openapi({ description: 'User age' }),
}).openapi({ ref: 'User' });

export const CreateUserSchema = UserSchema.omit({ id: true }).openapi({ 
  ref: 'CreateUser' 
});

export const UserListSchema = z.array(UserSchema).openapi({
  description: 'List of users',
  ref: 'UserList'
});
EOF

echo "Created example project with zod-openapi v4 code."
echo "Original file content:"
echo "----------------------"
cat example-project/src/schemas.ts

echo ""
echo "Running migration..."
npx tsx src/index.ts "example-project/src/**/*.ts" --verbose

echo ""
echo "Migrated file content:"
echo "---------------------"
cat example-project/src/schemas.ts

echo ""
echo "✅ Migration complete! The file has been updated from v4 to v5 syntax."

# Clean up
rm -rf example-project
