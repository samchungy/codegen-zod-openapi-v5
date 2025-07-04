import { z } from "zod";

// Simple schema with openapi calls
const UserSchema = z
  .object({
    name: z.string().meta({ description: "User name" }),
    age: z.number().meta({ description: "User age" }),
    email: z.string().email().meta({ description: "User email address" }),
  })
  .meta({ id: "User" });

// Array schema
const UserListSchema = z.array(UserSchema).meta({
  description: "List of users",
  id: "UserList",
});

// Nested schema
const CompanySchema = z
  .object({
    name: z.string().meta({ description: "Company name" }),
    employees: UserListSchema,
    founded: z.date().meta({ description: "Company founded date" }),
  })
  .meta({ id: "Company" });

// Union schema
const StatusSchema = z
  .union([z.literal("active"), z.literal("inactive"), z.literal("pending")])
  .meta({ id: "Status" });

// Optional schema
const OptionalUserSchema = z
  .object({
    name: z.string().meta({ description: "User name" }),
    nickname: z.string().optional().meta({ description: "User nickname" }),
  })
  .meta({ id: "OptionalUser" });

export {
  UserSchema,
  UserListSchema,
  CompanySchema,
  StatusSchema,
  OptionalUserSchema,
};
