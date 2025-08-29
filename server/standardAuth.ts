import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { z } from "zod";

// Auth schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

// JWT secret - should be set in environment variables
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "fallback-secret-change-in-production";

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } {
  return jwt.verify(token, JWT_SECRET) as { userId: string };
}

// Middleware for authentication
export const requireAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    const user = await storage.getUser(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    req.user = {
      claims: {
        sub: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl,
      }
    };

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Check if user needs approval
export const requireApproval: RequestHandler = async (req: any, res, next) => {
  try {
    const user = await storage.getUser(req.user.claims.sub);
    
    if (!user?.isApproved) {
      return res.status(403).json({ 
        message: "Account pending approval", 
        needsApproval: true 
      });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export function setupStandardAuth(app: Express) {
  // Register endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const userId = generateUserId();
      
      await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        passwordHash,
        authProvider: "standard",
        isApproved: false, // Requires admin approval
      });

      res.json({ 
        message: "Registration successful. Please wait for admin approval.",
        needsApproval: true
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      // Generate token
      const token = generateToken(user.id);
      
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isApproved: user.isApproved,
        },
        needsApproval: !user.isApproved
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user endpoint
  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user exists but is not approved, return 403 with special flag
      if (!user.isApproved) {
        return res.status(403).json({ 
          message: "Account pending approval", 
          needsApproval: true,
          user: user // Still return user data for display purposes
        });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint (for token-based auth, this is mainly client-side)
  app.post('/api/auth/logout', (req, res) => {
    // With JWT tokens, logout is typically handled client-side by removing the token
    // But we can blacklist tokens here if needed
    res.json({ message: "Logged out successfully" });
  });
}