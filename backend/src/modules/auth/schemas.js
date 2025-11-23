const { z } = require('zod');

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(6).max(100)
});

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(100)
});

module.exports = { RegisterSchema, LoginSchema };
