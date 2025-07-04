import { z } from "zod";

import { OpenAPIRegistry } from "zod-openapi";

// This will be removed

// Basic schemas with .openapi() calls
const IdSchema = z.string().meta({
  description: "Unique identifier",
  example: "user-123",
});

const NameSchema = z.string().min(1).meta({
  description: "Full name",
  example: "John Doe",
});

// Complex object schema with nested .openapi() calls
const UserSchema = z
  .object({
    id: IdSchema,
    name: NameSchema,
    email: z.string().email().meta({
      description: "Email address",
      example: "john@example.com",
    }),
    age: z.number().min(0).max(150).optional().meta({
      description: "Age in years",
      example: 25,
    }),
    roles: z.array(z.string()).meta({
      description: "User roles",
      example: ["admin", "user"],
    }),
  })
  .meta({
    id: "User",
    description: "User object with all properties",
  });

// Array schema
const UserListSchema = z.array(UserSchema).meta({
  id: "UserList",
  description: "List of users",
});

// Union schema
const StatusSchema = z
  .union([z.literal("active"), z.literal("inactive"), z.literal("pending")])
  .meta({
    id: "UserStatus",
    description: "User status enumeration",
  });

// Nested object with multiple .openapi() calls
const CompanySchema = z
  .object({
    id: z.string().meta({ description: "Company ID" }),
    name: z.string().meta({ description: "Company name" }),
    employees: UserListSchema,
    status: StatusSchema,
    settings: z
      .object({
        theme: z.string().meta({ description: "UI theme" }),
        notifications: z
          .boolean()
          .meta({ description: "Enable notifications" }),
      })
      .meta({ id: "CompanySettings" }),
  })
  .meta({ id: "Company" });

// Discriminated union
const EventSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.literal("user_created"),
        data: UserSchema,
      })
      .meta({ id: "UserCreatedEvent" }),
    z
      .object({
        type: z.literal("user_updated"),
        data: UserSchema,
      })
      .meta({ id: "UserUpdatedEvent" }),
  ])
  .meta({ id: "Event" });

export { UserSchema, UserListSchema, StatusSchema, CompanySchema, EventSchema };
