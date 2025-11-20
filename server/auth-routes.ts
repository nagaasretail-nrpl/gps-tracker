import { Router } from "express";
import passport from "passport";
import { storage } from "./storage";
import { hashPassword } from "./auth";
import { signupSchema, loginSchema, type User } from "@shared/schema";
import { z } from "zod";

export const authRoutes = Router();

authRoutes.post("/signup", async (req, res, next) => {
  try {
    const validatedData = signupSchema.parse(req.body);

    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await hashPassword(validatedData.password);

    const newUser = await storage.createUser({
      name: validatedData.name,
      email: validatedData.email,
      password: hashedPassword,
      role: validatedData.role || "user",
      avatar: validatedData.avatar,
      preferences: validatedData.preferences,
    });

    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }
      
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json({ user: userWithoutPassword });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
});

authRoutes.post("/login", (req, res, next) => {
  try {
    loginSchema.parse(req.body);

    passport.authenticate("local", (err: Error | null, user: User | false, info: { message: string }) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ error: info.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }

        const { password, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
});

authRoutes.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.json({ message: "Logged out successfully" });
  });
});

authRoutes.get("/me", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = req.user as User;
  const { password, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});
