// Authentication configuration for external deployment
export const authConfig = {
  // Set to "standard" for external deployment, "replit" for Replit environment
  authProvider: process.env.AUTH_PROVIDER || "standard",
  
  // JWT secret for standard authentication
  jwtSecret: process.env.JWT_SECRET || process.env.SESSION_SECRET || "change-this-in-production",
  
  // Session secret for Replit authentication (backward compatibility)
  sessionSecret: process.env.SESSION_SECRET,
  
  // Database configuration
  databaseUrl: process.env.DATABASE_URL,
  
  // External deployment configuration
  allowRegistration: process.env.ALLOW_REGISTRATION !== "false", // Allow user registration
  requireApproval: process.env.REQUIRE_APPROVAL !== "false", // Require admin approval for new users
  
  // CORS configuration for external deployment
  corsOrigin: process.env.CORS_ORIGIN || "*",
  
  // Security headers
  enableSecurityHeaders: process.env.NODE_ENV === "production",
  
  // Object storage (for external deployment, use environment variables)
  objectStorage: {
    provider: process.env.OBJECT_STORAGE_PROVIDER || "local", // "local", "s3", "gcs"
    bucket: process.env.OBJECT_STORAGE_BUCKET,
    region: process.env.OBJECT_STORAGE_REGION,
    accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY,
    secretKey: process.env.OBJECT_STORAGE_SECRET_KEY,
  }
};

export function isReplitEnvironment(): boolean {
  return !!process.env.REPL_ID || !!process.env.REPLIT_DOMAINS;
}

export function getAuthProvider(): "replit" | "standard" {
  // Auto-detect Replit environment
  if (isReplitEnvironment() && authConfig.authProvider !== "standard") {
    return "replit";
  }
  return "standard";
}