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

    const existingUser = await storage.getUserByPhone(validatedData.phone!);
    if (existingUser) {
      return res.status(400).json({ error: "Mobile number already registered" });
    }

    const hashedPassword = await hashPassword(validatedData.password);

    const newUser = await storage.createUser({
      name: validatedData.name,
      phone: validatedData.phone,
      email: validatedData.email ?? null,
      password: hashedPassword,
      role: "user", // Always create as regular user - admins must be promoted by existing admin
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

authRoutes.get("/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const sessionUser = req.user as User;

  // Fetch fresh user from DB so status/expiry changes are immediately reflected
  const freshUser = await storage.getUserById(sessionUser.id);
  if (!freshUser) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Auto-mark expired non-admin users as inactive
  if (freshUser.role !== "admin" && freshUser.subscriptionExpiry) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(freshUser.subscriptionExpiry);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < today && freshUser.status !== "inactive") {
      await storage.updateUser(freshUser.id, { status: "inactive" });
      freshUser.status = "inactive";
    }
  }

  const { password, ...userWithoutPassword } = freshUser;
  res.json({ user: userWithoutPassword });
});
