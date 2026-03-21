import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuth(app: Express) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "phone",
        passwordField: "password",
      },
      async (phone, password, done) => {
        try {
          const user = await storage.getUserByPhone(phone);
          
          if (!user) {
            return done(null, false, { message: "Invalid mobile number or password" });
          }

          const isValid = await comparePassword(password, user.password);
          
          if (!isValid) {
            return done(null, false, { message: "Invalid mobile number or password" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const sessionUser = req.user as User;
  
  try {
    const freshUser = await storage.getUserById(sessionUser.id);
    
    if (!freshUser) {
      return res.status(401).json({ error: "Session invalid - user not found" });
    }

    if (freshUser.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: "Authorization check failed" });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  next();
}
