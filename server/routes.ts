import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth as setupReplitAuth, isAuthenticated as isReplitAuthenticated, isApproved as isReplitApproved } from "./replitAuth";
import { setupStandardAuth, requireAuth as isStandardAuthenticated, requireApproval } from "./standardAuth";
import { getAuthProvider } from "./authConfig";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  objectStorageClient,
} from "./objectStorage";

// Unified authentication middleware that works with both systems
function createAuthMiddleware() {
  const authProvider = getAuthProvider();
  return {
    isAuthenticated: authProvider === "replit" ? isReplitAuthenticated : isStandardAuthenticated,
    isApproved: authProvider === "replit" ? isReplitApproved : requireApproval
  };
}

const authMiddleware = createAuthMiddleware();
const isAuthenticated = authMiddleware.isAuthenticated;
const isApproved = authMiddleware.isApproved;

// Admin middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Failed to verify admin status" });
  }
};

const requireElectricalManager = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || (user.role !== 'admin' && user.role !== 'electrical_manager')) {
      return res.status(403).json({ message: "Electrical department access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error checking electrical manager status:", error);
    res.status(500).json({ message: "Failed to verify electrical manager status" });
  }
};

const requireTransportManager = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || (user.role !== 'admin' && user.role !== 'transport_manager')) {
      return res.status(403).json({ message: "Transport department access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error checking transport manager status:", error);
    res.status(500).json({ message: "Failed to verify transport manager status" });
  }
};

const requireGeneralManager = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || (user.role !== 'admin' && user.role !== 'general_manager')) {
      return res.status(403).json({ message: "General department access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error checking general manager status:", error);
    res.status(500).json({ message: "Failed to verify general manager status" });
  }
};

const requirePublicManager = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || (user.role !== 'admin' && user.role !== 'public_manager')) {
      return res.status(403).json({ message: "Public department access required" });
    }
    
    next();
  } catch (error) {
    console.error("Error checking public manager status:", error);
    res.status(500).json({ message: "Failed to verify public manager status" });
  }
};

// API Key middleware for public endpoints
const requireApiKey = (permissions: string[] = []) => {
  return async (req: any, res: any, next: any) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
      
      if (!apiKey) {
        return res.status(401).json({ 
          error: "API key required", 
          message: "Provide API key in X-API-Key header or Authorization Bearer token" 
        });
      }

      // Find and validate API key
      const keyRecord = await db.select()
        .from(apiKeys)
        .where(eq(apiKeys.keyValue, apiKey))
        .limit(1);

      if (keyRecord.length === 0) {
        return res.status(401).json({ 
          error: "Invalid API key", 
          message: "The provided API key is not valid" 
        });
      }

      const key = keyRecord[0];
      
      if (!key.isActive) {
        return res.status(401).json({ 
          error: "API key inactive", 
          message: "The provided API key has been deactivated" 
        });
      }

      // Check permissions if specified
      if (permissions.length > 0) {
        const keyPermissions = key.permissions as string[] || [];
        const hasPermission = permissions.some(permission => 
          keyPermissions.includes(permission) || keyPermissions.includes('*')
        );
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: "Insufficient permissions", 
            message: `API key does not have required permissions: ${permissions.join(', ')}` 
          });
        }
      }

      // Update last used timestamp
      await db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id));

      req.apiKey = key;
      next();
    } catch (error) {
      console.error("Error validating API key:", error);
      res.status(500).json({ 
        error: "Authentication error", 
        message: "Failed to validate API key" 
      });
    }
  };
};
import { z } from "zod";
import {
  insertEquipmentCategorySchema,
  insertEquipmentSchema,
  insertEquipmentPricingSchema,
  insertEquipmentAdditionalSchema,
  insertEquipmentServiceCostsSchema,
  insertEquipmentServiceItemsSchema,
  insertClientSchema,
  insertQuoteSchema,
  insertQuoteItemSchema,
  insertPricingSchemaSchema,
  insertNeedsAssessmentQuestionSchema,
  insertNeedsAssessmentResponseSchema,
  insertApiKeySchema,
  insertTransportVehicleSchema,
  insertTransportQuoteSchema,
  insertElectricalEquipmentCategorySchema,
  insertElectricalEquipmentSchema,
  insertElectricalEquipmentPricingSchema,
  insertElectricalEquipmentAdditionalSchema,
  insertElectricalEquipmentServiceCostsSchema,
  insertElectricalEquipmentServiceItemsSchema,
  insertElectricalQuoteSchema,
  insertElectricalQuoteItemSchema,
  insertGeneralEquipmentCategorySchema,
  insertGeneralEquipmentSchema,
  insertGeneralEquipmentPricingSchema,
  insertGeneralEquipmentAdditionalSchema,
  publicQuoteSchema,
  publicAssessmentSchema,
  insertNotificationSchema,
  insertShopCategorySchema,
  insertShopProductSchema,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, asc, count, and, inArray, gte, lte, like } from "drizzle-orm";
import { 
  equipmentCategories, 
  equipment, 
  equipmentPricing, 
  equipmentAdditional, 
  equipmentServiceCosts, 
  equipmentServiceItems, 
  clients, 
  quotes, 
  quoteItems, 
  users, 
  pricingSchemas,
  needsAssessmentQuestions,
  needsAssessmentResponses,
  apiKeys,
  electricalEquipmentCategories,
  electricalEquipment,
  electricalEquipmentPricing,
  electricalEquipmentAdditional,
  electricalEquipmentServiceCosts,
  electricalEquipmentServiceItems,
  electricalQuotes,
  electricalQuoteItems,
  generalEquipmentCategories,
  generalEquipment,
  generalEquipmentPricing,
  generalEquipmentAdditional,
  generalQuotes,
  generalQuoteItems,
  // Public rental department tables
  publicEquipmentCategories,
  publicEquipment,
  publicEquipmentPricing,
  publicEquipmentAdditional,
  publicEquipmentServiceCosts,
  publicEquipmentServiceItems,
  publicQuotes,
  publicQuoteItems,
  notifications,
  shopCategories,
  shopProducts,
  shopSettings
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup appropriate authentication system
  const authProvider = getAuthProvider();
  
  if (authProvider === "replit") {
    await setupReplitAuth(app);
    console.log("Using Replit authentication");
  } else {
    setupStandardAuth(app);
    console.log("Using standard email/password authentication");
  }

  // Remove development mode bypass - require authentication for all protected routes

  // Notifications endpoints - now user-specific
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadNotifications = await db.select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
        .orderBy(desc(notifications.createdAt));
      
      res.json(unreadNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Only allow users to mark their own notifications as read
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.put('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only mark current user's notifications as read
      await db.update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // If user exists but is not approved, return 403 with special flag
      if (user && !user.isApproved) {
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

  // User management routes (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const { role } = req.body;
      
      if (!['admin', 'employee', 'electrical_manager', 'transport_manager', 'general_manager'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.put('/api/users/:id/toggle-active', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const updatedUser = await storage.toggleUserActive(id);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error toggling user active status:", error);
      res.status(500).json({ message: "Failed to toggle user active status" });
    }
  });

  app.get('/api/users/pending', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  app.post('/api/users/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const approvedUser = await storage.approveUser(id, currentUser.id);
      res.json(approvedUser);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

  app.delete('/api/users/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      await storage.rejectUser(id);
      res.json({ message: "User rejected and removed successfully" });
    } catch (error) {
      console.error("Error rejecting user:", error);
      res.status(500).json({ message: "Failed to reject user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      
      // Prevent admin from deleting themselves
      if (id === req.user.claims.sub) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      await storage.deleteUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Equipment Categories
  app.get('/api/equipment-categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getEquipmentCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post('/api/equipment-categories', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const categoryData = insertEquipmentCategorySchema.parse(req.body);
      const category = await storage.createEquipmentCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.delete('/api/equipment-categories/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      await storage.deleteEquipmentCategory(id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Equipment
  app.get('/api/equipment/inactive', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const equipment = await storage.getInactiveEquipment();
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching inactive equipment:", error);
      res.status(500).json({ message: "Failed to fetch inactive equipment" });
    }
  });

  app.get('/api/equipment', isAuthenticated, async (req, res) => {
    try {
      const equipment = await storage.getEquipment();
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.get('/api/equipment/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const equipment = await storage.getEquipmentById(id);
      if (!equipment) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  app.post('/api/equipment', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const equipmentData = insertEquipmentSchema.parse(req.body);
      const equipment = await storage.createEquipment(equipmentData);
      res.json({
        ...equipment,
        message: "Sprzęt został utworzony z domyślnymi cenami 100 zł/dzień (0% rabaty). Zaktualizuj ceny w sekcji 'Cenniki sprzętu'."
      });
    } catch (error) {
      console.error("Error creating equipment:", error);
      res.status(500).json({ message: "Failed to create equipment" });
    }
  });

  app.put('/api/equipment/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      console.log("Update equipment request body:", req.body);
      
      // Handle both direct body and nested equipment field
      const equipmentData = req.body.equipment || req.body;
      console.log("Equipment data for update:", equipmentData);
      
      const parsedData = insertEquipmentSchema.partial().parse(equipmentData);
      const equipment = await storage.updateEquipment(id, parsedData);
      res.json(equipment);
    } catch (error) {
      console.error("Error updating equipment:", error);
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  app.patch('/api/equipment/:id/quantity', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      const { quantity, availableQuantity } = req.body;
      
      if (typeof quantity !== 'number' || typeof availableQuantity !== 'number') {
        return res.status(400).json({ message: "Quantity and availableQuantity must be numbers" });
      }

      if (availableQuantity > quantity) {
        return res.status(400).json({ message: "Available quantity cannot exceed total quantity" });
      }

      const equipment = await storage.updateEquipment(id, { quantity, availableQuantity });
      res.json(equipment);
    } catch (error) {
      console.error("Error updating equipment quantity:", error);
      res.status(500).json({ message: "Failed to update equipment quantity" });
    }
  });

  app.delete('/api/equipment/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      await storage.deleteEquipment(id);
      res.json({ message: "Equipment deleted successfully" });
    } catch (error) {
      console.error("Error deleting equipment:", error);
      res.status(500).json({ message: "Failed to delete equipment" });
    }
  });

  app.delete('/api/equipment/:id/permanent', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      await storage.permanentlyDeleteEquipment(id);
      res.json({ message: "Equipment permanently deleted successfully" });
    } catch (error) {
      console.error("Error permanently deleting equipment:", error);
      res.status(500).json({ message: "Failed to permanently delete equipment" });
    }
  });

  // Equipment Pricing
  app.post('/api/equipment-pricing', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const pricingData = insertEquipmentPricingSchema.parse(req.body);
      const pricing = await storage.createEquipmentPricing(pricingData);
      res.json(pricing);
    } catch (error) {
      console.error("Error creating pricing:", error);
      res.status(500).json({ message: "Failed to create pricing" });
    }
  });

  app.patch('/api/equipment-pricing/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      const pricingData = insertEquipmentPricingSchema.partial().parse(req.body);
      const pricing = await storage.updateEquipmentPricing(id, pricingData);
      res.json(pricing);
    } catch (error) {
      console.error("Error updating pricing:", error);
      res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  app.delete('/api/equipment-pricing/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      await storage.deleteEquipmentPricing(id);
      res.json({ message: "Equipment pricing deleted successfully" });
    } catch (error) {
      console.error("Error deleting pricing:", error);
      res.status(500).json({ message: "Failed to delete pricing" });
    }
  });

  // Electrical Equipment Additional and Accessories  
  app.get('/api/electrical-equipment/:id/additional', async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const additional = await storage.getElectricalEquipmentAdditional(equipmentId);
      res.json(additional);
    } catch (error) {
      console.error("Error fetching electrical equipment additional:", error);
      res.status(500).json({ message: "Failed to fetch electrical equipment additional" });
    }
  });

  // General Equipment Additional and Accessories
  app.get('/api/general-equipment/:id/additional', async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const additional = await storage.getGeneralEquipmentAdditional(equipmentId);
      res.json(additional);
    } catch (error) {
      console.error("Error fetching general equipment additional:", error);
      res.status(500).json({ message: "Failed to fetch general equipment additional" });
    }
  });

  // Equipment Additional and Accessories
  app.get('/api/equipment/:id/additional', isAuthenticated, async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      let additional = await storage.getEquipmentAdditional(equipmentId);
      
      // If no additional equipment exists, create a default one
      if (additional.length === 0) {
        await storage.createEquipmentAdditional({
          equipmentId: equipmentId,
          type: "additional",
          name: "Dodatkowe wyposażenie 1",
          price: "0.00",
          position: 1
        });
        additional = await storage.getEquipmentAdditional(equipmentId);
      }
      
      res.json(additional);
    } catch (error) {
      console.error("Error fetching equipment additional:", error);
      res.status(500).json({ message: "Failed to fetch equipment additional" });
    }
  });

  app.post('/api/equipment-additional', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const additionalData = insertEquipmentAdditionalSchema.parse(req.body);
      const additional = await storage.createEquipmentAdditional(additionalData);
      res.json(additional);
    } catch (error) {
      console.error("Error creating equipment additional:", error);
      res.status(500).json({ message: "Failed to create equipment additional" });
    }
  });

  app.patch('/api/equipment-additional/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      const additionalData = insertEquipmentAdditionalSchema.partial().parse(req.body);
      const additional = await storage.updateEquipmentAdditional(id, additionalData);
      res.json(additional);
    } catch (error) {
      console.error("Error updating equipment additional:", error);
      res.status(500).json({ message: "Failed to update equipment additional" });
    }
  });

  app.delete('/api/equipment-additional/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      await storage.deleteEquipmentAdditional(id);
      res.json({ message: "Equipment additional deleted successfully" });
    } catch (error) {
      console.error("Error deleting equipment additional:", error);
      res.status(500).json({ message: "Failed to delete equipment additional" });
    }
  });

  // Clients
  app.get('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(clientData);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put('/api/clients/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.updateClient(id, clientData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Quotes - accessible to admin, general manager and employee roles
  app.get('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      // Allow access for all authenticated users (admin, employee, managers)
      if (!user) {
        return res.status(403).json({ message: "Access denied. Authentication required." });
      }

      // Get both regular and guest quotes including detailed client info
      const quotesResult = await db.select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        clientId: quotes.clientId,
        createdById: quotes.createdById,
        totalNet: quotes.totalNet,
        totalGross: quotes.totalGross,
        status: quotes.status,
        notes: quotes.notes,
        createdAt: quotes.createdAt,
        isGuestQuote: quotes.isGuestQuote,
        guestEmail: quotes.guestEmail,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactPerson: clients.contactPerson,
          email: clients.email,
          phone: clients.phone,
        }
      })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .orderBy(desc(quotes.createdAt));

      res.json(quotesResult);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && 
          user?.role !== 'employee' && 
          user?.role !== 'general_manager') {
        return res.status(403).json({ message: "Access denied. General equipment access required." });
      }

      const id = parseInt(req.params.id);
      const quote = await storage.getQuoteById(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      res.json(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.post('/api/quotes', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Received quote creation request:", JSON.stringify(req.body, null, 2));
      console.log("User info:", req.user.claims.sub);
      
      const userId = req.user.claims.sub;
      const quoteData = insertQuoteSchema.parse({
        ...req.body,
        createdById: userId,
        // Generate quote number with sequential number and date format: 01/08.2025
        quoteNumber: await (async () => {
          const today = new Date();
          const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
          
          // Find the highest sequential number for today's date pattern
          const existingQuotes = await db.select({ quoteNumber: quotes.quoteNumber })
            .from(quotes)
            .where(like(quotes.quoteNumber, `%/${dateStr}`))
            .orderBy(desc(quotes.quoteNumber));
          
          let sequentialNumber = 1;
          if (existingQuotes.length > 0) {
            // Extract the highest sequential number from existing quote numbers
            const highestNumber = Math.max(
              ...existingQuotes.map(q => {
                const match = q.quoteNumber?.match(/^(\d+)\//);
                return match ? parseInt(match[1], 10) : 0;
              })
            );
            sequentialNumber = highestNumber + 1;
          }
          
          return `${String(sequentialNumber).padStart(2, '0')}/${dateStr}`;
        })(),
        isGuestQuote: false,
      });
      
      console.log("Validated quote data:", JSON.stringify(quoteData, null, 2));
      const quote = await storage.createQuote(quoteData);
      console.log("Successfully created quote:", quote);
      res.json(quote);
    } catch (error: any) {
      console.error("Error creating quote:", error);
      console.error("Request body:", req.body);
      console.error("Validation error details:", error.message, error.stack);
      res.status(500).json({ message: "Failed to create quote", error: error.message });
    }
  });

  // Guest quote creation (no authentication required) - saves to public tables
  app.post('/api/quotes/guest', async (req: any, res) => {
    try {
      const { guestEmail, clientData, items, ...quoteBody } = req.body;
      
      // Create or find client (public quotes use same clients table)
      let clientId;
      if (clientData.id) {
        clientId = clientData.id;
      } else {
        const newClient = await db.insert(clients).values(clientData).returning({ id: clients.id });
        clientId = newClient[0].id;
      }
      
      // Generate public quote number
      const quoteNumber = `PUB/${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getFullYear()}`;
      
      // Create public quote
      const quote = await db.insert(publicQuotes).values({
        quoteNumber,
        clientId,
        totalNet: quoteBody.totalNet?.toString() || '0',
        totalGross: quoteBody.totalGross?.toString() || '0',
        vatRate: quoteBody.vatRate?.toString() || '23',
        notes: typeof quoteBody.notes === 'object' ? JSON.stringify(quoteBody.notes) : (quoteBody.notes || ''),
        guestEmail
      }).returning({ id: publicQuotes.id, quoteNumber: publicQuotes.quoteNumber });
      
      // Create public quote items
      for (const item of items) {
        try {
          // Only check public equipment table for guest quotes
          const equipmentExists = await db.select({ id: publicEquipment.id, name: publicEquipment.name })
            .from(publicEquipment)
            .where(eq(publicEquipment.id, item.equipmentId))
            .limit(1);
            
          if (equipmentExists.length === 0) {
            console.log(`Equipment with ID ${item.equipmentId} not found in public_equipment table`);
            continue;
          }
          
          // Create enhanced notes
          let notes = item.notes || '';
          
          // Add selected additional equipment to notes
          if (item.selectedAdditional && item.selectedAdditional.length > 0) {
            const additionalItems = item.selectedAdditional.map((add: any) => `${add.name} (${add.quantity || 1}x ${parseFloat(add.pricePerDay || '0').toFixed(2)}zł/dzień)`).join(', ');
            notes += ` | Dodatki: ${additionalItems}`;
          }
          
          // Add selected accessories to notes
          if (item.selectedAccessories && item.selectedAccessories.length > 0) {
            const accessories = item.selectedAccessories.map((acc: any) => `${acc.name} (${acc.quantity || 1}x ${parseFloat(acc.pricePerDay || '0').toFixed(2)}zł/dzień)`).join(', ');
            notes += ` | Akcesoria: ${accessories}`;
          }
          
          await db.insert(publicQuoteItems).values({
            quoteId: quote[0].id,
            equipmentId: item.equipmentId,
            quantity: item.quantity || 1,
            rentalPeriodDays: item.rentalPeriodDays || 1,
            pricePerDay: item.pricePerDay?.toString() || '0',
            discountPercent: item.discountPercent?.toString() || '0',
            totalPrice: item.totalPrice?.toString() || '0',
            notes: notes,
            additionalCost: item.additionalCost?.toString() || '0',
            accessoriesCost: item.accessoriesCost?.toString() || '0',
            selectedAdditional: item.selectedAdditional ? JSON.stringify(item.selectedAdditional) : null,
          });
        } catch (itemError) {
          console.error(`Error creating quote item for equipment ${item.equipmentId}:`, itemError);
        }
      }
      
      // Create notification for all employees about new guest quote
      try {
        // Get all employees to notify
        const employees = await db.select({ id: users.id }).from(users).where(
          inArray(users.role, ['admin', 'electrical_manager', 'transport_manager', 'general_manager', 'employee'])
        );
        
        // Create a notification for each employee
        const notificationPromises = employees.map(employee => 
          db.insert(notifications).values({
            userId: employee.id,
            type: 'guest_quote',
            title: '🛒 Nowa wycena od gościa',
            message: `Klient ${clientData.companyName} utworzył nową wycenę ${quote[0].quoteNumber}. ${items.length} pozycji sprzętu.`,
            relatedId: quote[0].id,
            clientName: clientData.companyName || 'Nieznany klient',
          })
        );
        
        await Promise.all(notificationPromises);
        console.log(`Notifications created for ${employees.length} employees about guest quote:`, quote[0].id);
      } catch (notificationError) {
        console.error('Error creating guest quote notification:', notificationError);
        // Don't fail the quote creation if notification fails
      }
      
      res.json({ id: quote[0].id, quoteNumber: quote[0].quoteNumber });
      
    } catch (error) {
      console.error('Error creating guest quote:', error);
      res.status(500).json({ message: 'Failed to create guest quote' });
    }
  });

  app.put('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      const id = parseInt(req.params.id);
      const quote = await storage.getQuoteById(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const quoteData = insertQuoteSchema.partial().parse(req.body);
      const updatedQuote = await storage.updateQuote(id, quoteData);
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete('/api/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      const quote = await storage.getQuoteById(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      await storage.deleteQuote(id);
      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // Copy quote
  app.post('/api/quotes/:id/copy', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      const quoteId = parseInt(req.params.id);

      // Get original quote with all items
      const originalQuote = await db.select({
        id: quotes.id,
        clientId: quotes.clientId,
        status: quotes.status,
        totalNet: quotes.totalNet,
        totalGross: quotes.totalGross,
        vatRate: quotes.vatRate,
        notes: quotes.notes,
        pricingSchemaId: quotes.pricingSchemaId,
      })
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .limit(1);

      if (originalQuote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Get original client information
      const originalClient = await db.select()
        .from(clients)
        .where(eq(clients.id, originalQuote[0].clientId))
        .limit(1);

      if (originalClient.length === 0) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Create a new client record for the copy
      const newClient = await db.insert(clients).values({
        companyName: originalClient[0].companyName,
        nip: originalClient[0].nip,
        contactPerson: originalClient[0].contactPerson,
        phone: originalClient[0].phone,
        email: originalClient[0].email,
        address: originalClient[0].address,
      }).returning({ id: clients.id });

      // Get quote items
      const originalItems = await db.select()
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, quoteId));

      // Generate new quote number
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      
      const existingQuotes = await db.select({ quoteNumber: quotes.quoteNumber })
        .from(quotes)
        .where(like(quotes.quoteNumber, `%/${dateStr}`))
        .orderBy(desc(quotes.quoteNumber));
      
      let sequentialNumber = 1;
      if (existingQuotes.length > 0) {
        const highestNumber = Math.max(
          ...existingQuotes.map(q => {
            const match = q.quoteNumber?.match(/^(\d+)\//);  
            return match ? parseInt(match[1], 10) : 0;
          })
        );
        sequentialNumber = highestNumber + 1;
      }
      
      const newQuoteNumber = `${String(sequentialNumber).padStart(2, '0')}/${dateStr}`;

      // Create new quote with the new client ID
      const newQuote = await db.insert(quotes).values({
        quoteNumber: newQuoteNumber,
        clientId: newClient[0].id, // Use the new client ID instead of original
        createdById: user?.id,
        status: 'draft',
        totalNet: originalQuote[0].totalNet,
        totalGross: originalQuote[0].totalGross,
        vatRate: originalQuote[0].vatRate,
        notes: originalQuote[0].notes,
        pricingSchemaId: originalQuote[0].pricingSchemaId,
      }).returning({ id: quotes.id });

      const newQuoteId = newQuote[0].id;

      // Copy all quote items
      if (originalItems.length > 0) {
        const itemsData = originalItems.map(item => ({
          quoteId: newQuoteId,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          rentalPeriodDays: item.rentalPeriodDays,
          pricePerDay: item.pricePerDay,
          discountPercent: item.discountPercent,
          totalPrice: item.totalPrice,
          notes: item.notes,
          fuelConsumptionLH: item.fuelConsumptionLH,
          fuelPricePerLiter: item.fuelPricePerLiter,
          hoursPerDay: item.hoursPerDay,
          totalFuelCost: item.totalFuelCost,
          includeFuelCost: item.includeFuelCost,
          fuelConsumptionPer100km: item.fuelConsumptionPer100km,
          kilometersPerDay: item.kilometersPerDay,
          includeMaintenanceCost: item.includeMaintenanceCost,
          maintenanceIntervalHours: item.maintenanceIntervalHours,
          maintenanceIntervalKm: item.maintenanceIntervalKm,
          calculationType: item.calculationType,
          totalMaintenanceCost: item.totalMaintenanceCost,
          expectedMaintenanceHours: item.expectedMaintenanceHours,
          includeInstallationCost: item.includeInstallationCost,
          installationDistanceKm: item.installationDistanceKm,
          numberOfTechnicians: item.numberOfTechnicians,
          serviceRatePerTechnician: item.serviceRatePerTechnician,
          travelRatePerKm: item.travelRatePerKm,
          totalInstallationCost: item.totalInstallationCost,
          includeDisassemblyCost: item.includeDisassemblyCost,
          disassemblyDistanceKm: item.disassemblyDistanceKm,
          disassemblyNumberOfTechnicians: item.disassemblyNumberOfTechnicians,
          disassemblyServiceRatePerTechnician: item.disassemblyServiceRatePerTechnician,
          disassemblyTravelRatePerKm: item.disassemblyTravelRatePerKm,
          totalDisassemblyCost: item.totalDisassemblyCost,
          includeTravelServiceCost: item.includeTravelServiceCost,
          travelServiceDistanceKm: item.travelServiceDistanceKm,
          travelServiceNumberOfTechnicians: item.travelServiceNumberOfTechnicians,
          travelServiceServiceRatePerTechnician: item.travelServiceServiceRatePerTechnician,
          travelServiceTravelRatePerKm: item.travelServiceTravelRatePerKm,
          travelServiceNumberOfTrips: item.travelServiceNumberOfTrips,
          totalTravelServiceCost: item.totalTravelServiceCost,
          includeServiceItems: item.includeServiceItems,
          serviceItem1Cost: item.serviceItem1Cost,
          serviceItem2Cost: item.serviceItem2Cost,
          serviceItem3Cost: item.serviceItem3Cost,
          totalServiceItemsCost: item.totalServiceItemsCost,
          additionalCost: item.additionalCost,
          accessoriesCost: item.accessoriesCost,
        }));

        await db.insert(quoteItems).values(itemsData);
      }

      res.json({ 
        message: "Quote copied successfully",
        newQuoteId: newQuoteId,
        newQuoteNumber: newQuoteNumber
      });
    } catch (error) {
      console.error("Error copying quote:", error);
      res.status(500).json({ message: "Failed to copy quote" });
    }
  });

  // Guest quote print (no authentication required)
  app.get('/api/quotes/guest/:id/print', async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get public quote first
      const quotes = await db.select().from(publicQuotes).where(eq(publicQuotes.id, id)).limit(1);
      
      if (quotes.length === 0) {
        return res.status(404).json({ message: "Guest quote not found" });
      }

      const quote = quotes[0];

      // Get client details
      const clients_data = await db.select().from(clients).where(eq(clients.id, quote.clientId)).limit(1);
      const client = clients_data[0] || {};

      // Get quote items
      const items = await db.select().from(publicQuoteItems).where(eq(publicQuoteItems.quoteId, id));
      
      // Get equipment details for each item
      const itemsWithEquipment = [];
      for (const item of items) {
        const equipment = await db.select().from(publicEquipment).where(eq(publicEquipment.id, item.equipmentId)).limit(1);
        const category = equipment[0] ? await db.select().from(publicEquipmentCategories).where(eq(publicEquipmentCategories.id, equipment[0].categoryId)).limit(1) : [];
        
        
        itemsWithEquipment.push({
          ...item,
          equipmentName: equipment[0]?.name || 'Nieznany sprzęt',
          equipmentCategory: category[0]?.name || 'Brak kategorii'
        });
      }

      // Simple HTML for print without complex processing
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Wycena ${quote.quoteNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
            .company-name { color: #1e40af; font-size: 28px; font-weight: bold; margin: 0; }
            .subtitle { color: #666; font-size: 14px; margin: 5px 0; }
            .quote-info { display: flex; justify-content: space-between; margin: 20px 0; }
            .client-info { background: #f0fdf4; padding: 15px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0; }
            .client-info h3 { color: #22c55e; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border: 1px solid #e5e7eb; }
            th { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; font-weight: 600; }
            .equipment-name { font-weight: 600; color: #1e40af; }
            .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .total-row { background: #dbeafe; font-weight: bold; }
            .print-date { text-align: center; margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="company-name">PPP :: Program</h1>
            <p class="subtitle">Grupa REKORD</p>
            <p class="subtitle">Wynajem sprzętu</p>
          </div>

          <div class="quote-info">
            <div><strong>Numer wyceny:</strong> ${quote.quoteNumber}</div>
            <div><strong>Data wyceny:</strong> ${quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('pl-PL') : new Date().toLocaleDateString('pl-PL')}</div>
          </div>

          <div class="client-info">
            <h3>📋 Dane klienta</h3>
            <p><strong>Nazwa firmy:</strong> ${client.companyName || '-'}</p>
            ${client.contactPerson ? `<p><strong>Osoba kontaktowa:</strong> ${client.contactPerson}</p>` : ''}
            ${client.email ? `<p><strong>Email:</strong> ${client.email}</p>` : ''}
            ${client.phone ? `<p><strong>Telefon:</strong> ${client.phone}</p>` : ''}
            ${client.address ? `<p><strong>Adres:</strong> ${client.address}</p>` : ''}
            ${client.nip ? `<p><strong>NIP:</strong> ${client.nip}</p>` : ''}
          </div>

          <div style="margin: 20px 0; padding: 15px; background: #fefce8; border-radius: 8px; border-left: 4px solid #eab308;">
            <p style="margin: 0; color: #92400e; font-weight: 500;">
              📞 Szczegóły wyceny dostępne są u naszych handlowców. Prosimy o kontakt.
            </p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Lp.</th>
                <th>Nazwa sprzętu</th>
                <th>Wybrane opcje</th>
                <th>Okres wynajmu</th>
              </tr>
            </thead>
            <tbody>
              ${itemsWithEquipment.map((item, index) => {
                const notes = item.notes || '';
                let optionsText = '';
                
                // Parse additional equipment from notes field
                if (notes.includes('Dodatki:')) {
                  // Extract equipment after "Dodatki: " until end of string or next section
                  const additionalMatch = notes.match(/Dodatki:\s*(.+?)(?:\s*\||$)/);
                  if (additionalMatch) {
                    // Extract just the equipment name from format "Equipment Name (1x price)"
                    const fullText = additionalMatch[1].trim();
                    const nameMatch = fullText.match(/^([^(]+)/);
                    if (nameMatch) {
                      optionsText += nameMatch[1].trim() + '; ';
                    } else {
                      optionsText += fullText + '; ';
                    }
                  } else {
                    optionsText += 'Wyposażenie dodatkowe; ';
                  }
                }
                
                if (notes.includes('Akcesoria:')) {
                  // Extract accessories after "Akcesoria: " until end of string or next section
                  const accessoriesMatch = notes.match(/Akcesoria:\s*(.+?)(?:\s*\||$)/);
                  if (accessoriesMatch) {
                    const fullText = accessoriesMatch[1].trim();
                    const nameMatch = fullText.match(/^([^(]+)/);
                    if (nameMatch) {
                      optionsText += nameMatch[1].trim() + '; ';
                    } else {
                      optionsText += fullText + '; ';
                    }
                  } else {
                    optionsText += 'Akcesoria; ';
                  }
                }
                
                if (!optionsText) {
                  optionsText = 'Podstawowa konfiguracja';
                }
                
                return `<tr>
                  <td style="vertical-align: top;">${index + 1}</td>
                  <td style="vertical-align: top;" class="equipment-name">
                    ${item.equipmentName}
                    <br/><small style="color: #666;">${item.equipmentCategory} | Ilość: ${item.quantity}</small>
                  </td>
                  <td style="vertical-align: top; max-width: 400px;">
                    <small style="color: #666;">${optionsText}</small>
                  </td>
                  <td style="vertical-align: top; text-align: center;">
                    <strong>${item.rentalPeriodDays} dni</strong>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>

          <div class="summary">
            <table style="margin: 0;">
              <tr>
                <td><strong>Wartość netto:</strong></td>
                <td style="text-align: right;"><strong>${parseFloat(quote.totalNet).toFixed(2)} zł</strong></td>
              </tr>
              <tr>
                <td><strong>VAT (${quote.vatRate}%):</strong></td>
                <td style="text-align: right;"><strong>${(parseFloat(quote.totalGross) - parseFloat(quote.totalNet)).toFixed(2)} zł</strong></td>
              </tr>
              <tr class="total-row">
                <td><strong>Wartość brutto:</strong></td>
                <td style="text-align: right;"><strong>${parseFloat(quote.totalGross).toFixed(2)} zł</strong></td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
            <h4>📝 Uwagi:</h4>
            <p>${quote.notes || "Brak uwag"}</p>
          </div>

          <div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #666;">
              <strong>Generator wycen online - PPP :: PROGRAM - Sebastian Popiel - tel. 500-600-525</strong>
            </p>
          </div>

          <div class="print-date">
            Wycena wygenerowana: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(printHTML);

    } catch (error) {
      console.error("Error generating guest quote print:", error);
      res.status(500).json({ message: "Failed to generate print view" });
    }
  });

  app.get('/api/quotes/:id/print', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getQuoteById(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      // Fetch service items and additional equipment for each equipment in the quote
      const quoteWithServiceItems = {
        ...quote,
        items: await Promise.all(quote.items.map(async (item) => {
          const serviceItems = await storage.getEquipmentServiceItems(item.equipmentId);
          
          // Parse selected additional equipment and accessories from notes
          let selectedAdditional: number[] = [];
          let selectedAccessories: number[] = [];
          let additionalEquipmentData: any[] = [];
          let accessoriesData: any[] = [];
          
          try {
            
            // Check if there are any additional costs (either accessories or additional equipment)
            const hasAdditionalCosts = parseFloat(item.additionalCost || "0") > 0;
            const hasAccessoriesCosts = parseFloat(item.accessoriesCost || "0") > 0;
            
            if (hasAdditionalCosts || hasAccessoriesCosts) {
              
              // If notes contain selection data, use it
              if (item.notes && item.notes.startsWith('{"selectedAdditional"')) {
                const notesData = JSON.parse(item.notes);
                selectedAdditional = notesData.selectedAdditional || [];
                selectedAccessories = notesData.selectedAccessories || [];
              } else if (hasAccessoriesCosts) {
                // Fallback: get all accessories for this equipment since cost > 0
                const allAccessories = await db.select().from(equipmentAdditional)
                  .where(and(
                    eq(equipmentAdditional.equipmentId, item.equipmentId),
                    eq(equipmentAdditional.type, 'accessories')
                  ));
                accessoriesData = allAccessories;
              }
              
              // Fetch additional equipment details
              if (selectedAdditional.length > 0) {
                additionalEquipmentData = await db.select().from(equipmentAdditional)
                  .where(and(
                    eq(equipmentAdditional.equipmentId, item.equipmentId),
                    eq(equipmentAdditional.type, 'additional'),
                    inArray(equipmentAdditional.id, selectedAdditional)
                  ));
              } else {
              }
              
              // Fetch specific accessories details if we have selection (only if not already fetched by fallback)
              if (selectedAccessories.length > 0 && accessoriesData.length === 0 && hasAccessoriesCosts) {
                accessoriesData = await db.select().from(equipmentAdditional)
                  .where(and(
                    eq(equipmentAdditional.equipmentId, item.equipmentId),
                    eq(equipmentAdditional.type, 'accessories'),
                    inArray(equipmentAdditional.id, selectedAccessories)
                  ));
              }
            }
          } catch (e) {
            console.error('Error parsing notes for additional equipment:', e);
          }
          
          const result = {
            ...item,
            serviceItems: serviceItems || [],
            additionalEquipmentData,
            accessoriesData
          };
          
          
          return result;
        }))
      };

      // Generate HTML content for the quote
      console.log("Quote data for print:", {
        id: quote.id,
        itemsCount: quote.items?.length || 0,
        items: quoteWithServiceItems.items.map((item: any) => ({
          notes: item.notes,
          additionalEquipmentData: item.additionalEquipmentData?.length || 0,
          accessoriesData: item.accessoriesData?.length || 0,
          hasAdditionalCosts: parseFloat(item.additionalCost || 0) > 0,
          hasAccessoriesCosts: parseFloat(item.accessoriesCost || "0") > 0
        }))
      });
      
      const htmlContent = generateQuoteHTML(quoteWithServiceItems);
      
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error("Error generating print view:", error);
      res.status(500).json({ message: "Failed to generate print view" });
    }
  });

  // Quote Items - accessible to admin and employee roles, or guest in development
  app.post('/api/quote-items', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      const itemData = insertQuoteItemSchema.parse(req.body);
      const item = await storage.createQuoteItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating quote item:", error);
      console.error("Request body:", req.body);
      console.error("Validation error details:", error);
      res.status(500).json({ message: "Failed to create quote item" });
    }
  });

  app.put('/api/quote-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      const id = parseInt(req.params.id);
      const itemData = insertQuoteItemSchema.partial().parse(req.body);
      const item = await storage.updateQuoteItem(id, itemData);
      res.json(item);
    } catch (error) {
      console.error("Error updating quote item:", error);
      res.status(500).json({ message: "Failed to update quote item" });
    }
  });

  app.delete('/api/quote-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      const id = parseInt(req.params.id);
      await storage.deleteQuoteItem(id);
      res.json({ message: "Quote item deleted successfully" });
    } catch (error) {
      console.error("Error deleting quote item:", error);
      res.status(500).json({ message: "Failed to delete quote item" });
    }
  });



  // Pricing schemas routes
  app.get('/api/pricing-schemas', isAuthenticated, async (req, res) => {
    try {
      const schemas = await storage.getPricingSchemas();
      res.json(schemas);
    } catch (error) {
      console.error("Error fetching pricing schemas:", error);
      res.status(500).json({ message: "Failed to fetch pricing schemas" });
    }
  });

  app.get('/api/pricing-schemas/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const schema = await storage.getPricingSchemaById(parseInt(id));
      if (!schema) {
        return res.status(404).json({ message: "Pricing schema not found" });
      }
      res.json(schema);
    } catch (error) {
      console.error("Error fetching pricing schema:", error);
      res.status(500).json({ message: "Failed to fetch pricing schema" });
    }
  });

  app.post('/api/pricing-schemas', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertPricingSchemaSchema.parse(req.body);
      const schema = await storage.createPricingSchema(validatedData);
      res.status(201).json(schema);
    } catch (error) {
      console.error("Error creating pricing schema:", error);
      res.status(500).json({ message: "Failed to create pricing schema" });
    }
  });

  app.patch('/api/pricing-schemas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const validatedData = insertPricingSchemaSchema.partial().parse(req.body);
      const schema = await storage.updatePricingSchema(parseInt(id), validatedData);
      res.json(schema);
    } catch (error) {
      console.error("Error updating pricing schema:", error);
      res.status(500).json({ message: "Failed to update pricing schema" });
    }
  });

  app.delete('/api/pricing-schemas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      await storage.deletePricingSchema(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting pricing schema:", error);
      res.status(500).json({ message: "Failed to delete pricing schema" });
    }
  });

  // Equipment service costs endpoints
  app.get('/api/equipment/:id/service-costs', isAuthenticated, async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const serviceCosts = await storage.getEquipmentServiceCosts(equipmentId);
      res.json(serviceCosts || null);
    } catch (error) {
      console.error("Error fetching equipment service costs:", error);
      res.status(500).json({ message: "Failed to fetch equipment service costs" });
    }
  });

  app.post('/api/equipment/:id/service-costs', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const equipmentId = parseInt(req.params.id);
      const serviceCostsData = insertEquipmentServiceCostsSchema.parse({
        ...req.body,
        equipmentId
      });
      const serviceCosts = await storage.upsertEquipmentServiceCosts(serviceCostsData);
      res.json(serviceCosts);
    } catch (error) {
      console.error("Error upserting equipment service costs:", error);
      res.status(500).json({ message: "Failed to upsert equipment service costs" });
    }
  });

  // Equipment service items endpoints
  app.get('/api/equipment/:id/service-items', isAuthenticated, async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      
      // Auto-sync service work hours with admin configuration before returning data
      await storage.syncServiceWorkHours(equipmentId);
      
      const serviceItems = await storage.getEquipmentServiceItems(equipmentId);
      res.json(serviceItems);
    } catch (error) {
      console.error("Error fetching equipment service items:", error);
      res.status(500).json({ message: "Failed to fetch equipment service items" });
    }
  });

  app.post('/api/equipment/:id/service-items', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const equipmentId = parseInt(req.params.id);
      const serviceItemData = insertEquipmentServiceItemsSchema.parse({
        ...req.body,
        equipmentId
      });
      const serviceItem = await storage.createEquipmentServiceItem(serviceItemData);
      res.json(serviceItem);
    } catch (error) {
      console.error("Error creating equipment service item:", error);
      res.status(500).json({ message: "Failed to create equipment service item" });
    }
  });

  app.patch('/api/equipment-service-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      const serviceItemData = insertEquipmentServiceItemsSchema.partial().parse(req.body);
      const serviceItem = await storage.updateEquipmentServiceItem(id, serviceItemData);
      res.json(serviceItem);
    } catch (error) {
      console.error("Error updating equipment service item:", error);
      res.status(500).json({ message: "Failed to update equipment service item" });
    }
  });

  app.delete('/api/equipment-service-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      await storage.deleteEquipmentServiceItem(id);
      res.json({ message: "Equipment service item deleted successfully" });
    } catch (error) {
      console.error("Error deleting equipment service item:", error);
      res.status(500).json({ message: "Failed to delete equipment service item" });
    }
  });

  // API endpoint to sync all equipment with admin settings
  app.post('/api/admin/sync-all-equipment', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      await storage.syncAllEquipmentWithAdminSettings();
      res.json({ message: "Wszystkie urządzenia zostały zsynchronizowane z ustawieniami panelu admina" });
    } catch (error) {
      console.error("Error syncing equipment:", error);
      res.status(500).json({ message: "Failed to sync equipment" });
    }
  });

  // === NEEDS ASSESSMENT API ENDPOINTS ===
  
  // Get all needs assessment questions (for the form)
  // Public endpoint for client questions access
  app.get('/api/needs-assessment/questions', async (req: any, res) => {
    try {
      const questions = await db.select()
        .from(needsAssessmentQuestions)
        .where(eq(needsAssessmentQuestions.isActive, true))
        .orderBy(asc(needsAssessmentQuestions.category), asc(needsAssessmentQuestions.position));
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching needs assessment questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  // Save needs assessment response
  app.post('/api/needs-assessment/responses', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Received needs assessment response data:", JSON.stringify(req.body, null, 2));
      console.log("User info:", req.user.claims.sub);
      
      const validatedData = insertNeedsAssessmentResponseSchema.parse(req.body);
      console.log("Validated data:", JSON.stringify(validatedData, null, 2));
      
      // Generate response number with sequential number and date format: 01/08.2025
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      
      // Find the highest sequential number for today's date pattern
      const existingResponses = await db.select({ responseNumber: needsAssessmentResponses.responseNumber })
        .from(needsAssessmentResponses)
        .where(like(needsAssessmentResponses.responseNumber, `%/${dateStr}`))
        .orderBy(desc(needsAssessmentResponses.responseNumber));
      
      let sequentialNumber = 1;
      if (existingResponses.length > 0) {
        // Extract the highest sequential number from existing response numbers
        const highestNumber = Math.max(
          ...existingResponses.map(r => {
            const match = r.responseNumber?.match(/^(\d+)\//);
            return match ? parseInt(match[1], 10) : 0;
          })
        );
        sequentialNumber = highestNumber + 1;
      }
      
      const responseNumber = `${String(sequentialNumber).padStart(2, '0')}/${dateStr}`;
      console.log("Generated response number:", responseNumber);
      
      const [response] = await db.insert(needsAssessmentResponses).values({
        ...validatedData,
        attachments: req.body.attachments || [], // Save attachments to database
        responseNumber,
        userId: req.user.claims.sub,
      }).returning();
      
      console.log("Successfully saved response:", response);
      
      // Create notification for all employees about new guest assessment
      try {
        // Get all employees to notify
        const employees = await db.select({ id: users.id }).from(users).where(
          inArray(users.role, ['admin', 'electrical_manager', 'transport_manager', 'general_manager', 'employee'])
        );
        
        // Create a notification for each employee
        const notificationPromises = employees.map(employee => 
          db.insert(notifications).values({
            userId: employee.id,
            type: 'guest_assessment',
            title: '📋 Nowe badanie potrzeb od gościa',
            message: `Klient ${validatedData.clientCompanyName} wypełnił badanie potrzeb ${response.responseNumber}. Prosimy o sprawdzenie wyników.`,
            relatedId: response.id,
            clientName: validatedData.clientCompanyName || 'Nieznany klient',
          })
        );
        
        await Promise.all(notificationPromises);
        console.log(`Notifications created for ${employees.length} employees about guest assessment:`, response.id);
      } catch (notificationError) {
        console.error('Error creating guest assessment notification:', notificationError);
        // Don't fail the assessment creation if notification fails
      }
      
      res.json(response);
    } catch (error: any) {
      console.error("Error saving needs assessment response:", error);
      console.error("Error details:", error.message, error.stack);
      res.status(500).json({ message: "Failed to save response", error: error.message });
    }
  });

  // Get all needs assessment responses (for managers and admin)
  app.get('/api/needs-assessment/responses', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && 
          user?.role !== 'electrical_manager' && 
          user?.role !== 'transport_manager' && 
          user?.role !== 'general_manager') {
        return res.status(403).json({ message: "Access denied. Manager or admin role required." });
      }

      // Get only employee-created responses (exclude CLIENT- prefixed)
      const responses = await db.select()
        .from(needsAssessmentResponses)
        .where(sql`${needsAssessmentResponses.responseNumber} NOT LIKE 'CLIENT-%'`)
        .orderBy(desc(needsAssessmentResponses.createdAt));
      
      res.json(responses);
    } catch (error) {
      console.error("Error fetching needs assessment responses:", error);
      res.status(500).json({ message: "Failed to fetch responses" });
    }
  });

  // Get client assessment responses list (CLIENT prefixed only) - available to all authenticated users
  app.get('/api/needs-assessment/client-responses', isAuthenticated, async (req: any, res) => {
    try {
      const responses = await db.select()
        .from(needsAssessmentResponses)
        .where(sql`${needsAssessmentResponses.responseNumber} LIKE 'CLIENT-%'`)
        .orderBy(desc(needsAssessmentResponses.createdAt));
      
      res.json(responses);
    } catch (error) {
      console.error("Error fetching client assessment responses:", error);
      res.status(500).json({ message: "Failed to fetch client responses" });
    }
  });

  app.get('/api/needs-assessment/responses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && 
          user?.role !== 'electrical_manager' && 
          user?.role !== 'transport_manager' && 
          user?.role !== 'general_manager') {
        return res.status(403).json({ message: "Access denied. Manager or admin role required." });
      }

      const id = parseInt(req.params.id);
      
      const response = await db.select()
        .from(needsAssessmentResponses)
        .where(eq(needsAssessmentResponses.id, id))
        .limit(1);
        
      if (response.length === 0) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      res.json(response[0]);
    } catch (error) {
      console.error("Error fetching needs assessment response:", error);
      res.status(500).json({ message: "Failed to fetch response" });
    }
  });

  // Create new needs assessment question (admin only)
  app.post('/api/needs-assessment/questions', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const validatedData = insertNeedsAssessmentQuestionSchema.parse(req.body);
      const [question] = await db.insert(needsAssessmentQuestions).values(validatedData).returning();
      res.json(question);
    } catch (error) {
      console.error("Error creating needs assessment question:", error);
      res.status(500).json({ message: "Failed to create question" });
    }
  });

  // Update needs assessment question (admin only)
  app.patch('/api/needs-assessment/questions/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const updateData = req.body;
      
      const [question] = await db.update(needsAssessmentQuestions)
        .set(updateData)
        .where(eq(needsAssessmentQuestions.id, questionId))
        .returning();
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      res.json(question);
    } catch (error) {
      console.error("Error updating needs assessment question:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  // Delete needs assessment question (admin only)
  app.delete('/api/needs-assessment/questions/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const questionId = parseInt(req.params.id);
      
      await db.delete(needsAssessmentQuestions)
        .where(eq(needsAssessmentQuestions.id, questionId));
      
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting needs assessment question:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // Delete entire category (all questions in that category)
  app.delete('/api/needs-assessment/categories/:categoryName', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const categoryName = decodeURIComponent(req.params.categoryName);
      
      await db.delete(needsAssessmentQuestions)
        .where(eq(needsAssessmentQuestions.category, categoryName));
      
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting needs assessment category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Print needs assessment response
  app.get('/api/needs-assessment/responses/:id/print', isAuthenticated, async (req: any, res) => {
    try {
      const responseId = parseInt(req.params.id);
      
      // Get the response
      const response = await db.select()
        .from(needsAssessmentResponses)
        .where(eq(needsAssessmentResponses.id, responseId))
        .limit(1);
      
      if (!response || response.length === 0) {
        return res.status(404).json({ message: "Needs assessment response not found" });
      }
      
      const assessmentResponse = response[0];
      
      // Get all questions to display proper labels
      const questions = await db.select()
        .from(needsAssessmentQuestions)
        .orderBy(needsAssessmentQuestions.position);
      
      // Group questions by category
      const questionsByCategory = questions.reduce((acc, question) => {
        if (!acc[question.category]) {
          acc[question.category] = [];
        }
        acc[question.category].push(question);
        return acc;
      }, {} as Record<string, any[]>);
      
      // Generate HTML for print
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Badanie Potrzeb #${assessmentResponse.responseNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .company-name { font-size: 18px; font-weight: bold; color: #0066cc; }
            .title { font-size: 24px; font-weight: bold; margin: 10px 0; }
            .client-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
            .category { margin-bottom: 30px; }
            .category-title { font-size: 18px; font-weight: bold; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
            .question-item { margin-bottom: 15px; padding: 10px; border-left: 3px solid #0066cc; background: #f9f9f9; }
            .question { font-weight: bold; margin-bottom: 5px; }
            .answer { color: #555; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
            .print-button { position: fixed; top: 20px; right: 20px; z-index: 1000; background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
            .print-button:hover { background: #0052a3; }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Drukuj</button>
          
          <div class="header">
            <div class="company-name">Sebastian Popiel :: PPP :: Program</div>
            <div class="title">Badanie Potrzeb</div>
            <div>Nr: ${assessmentResponse.responseNumber}</div>
            <div>Data utworzenia: ${assessmentResponse.createdAt ? new Date(assessmentResponse.createdAt).toLocaleDateString('pl-PL') : 'Nieznana'}</div>
          </div>
          
          ${assessmentResponse.clientCompanyName ? `
          <div class="client-info">
            <h3>Informacje o kliencie</h3>
            ${assessmentResponse.clientCompanyName ? `<p><strong>Firma:</strong> ${assessmentResponse.clientCompanyName}</p>` : ''}
            ${assessmentResponse.clientContactPerson ? `<p><strong>Osoba kontaktowa:</strong> ${assessmentResponse.clientContactPerson}</p>` : ''}
            ${assessmentResponse.clientPhone ? `<p><strong>Telefon:</strong> ${assessmentResponse.clientPhone}</p>` : ''}
            ${assessmentResponse.clientEmail ? `<p><strong>Email:</strong> ${assessmentResponse.clientEmail}</p>` : ''}
            ${assessmentResponse.clientAddress ? `<p><strong>Adres:</strong> ${assessmentResponse.clientAddress}</p>` : ''}
          </div>
          ` : ''}
          
          ${Object.entries(questionsByCategory).map(([category, categoryQuestions]) => {
            const responses = assessmentResponse.responses as Record<string, string> || {};
            const hasAnswers = categoryQuestions.some(q => responses[q.id.toString()]);
            if (!hasAnswers) return '';
            
            return `
              <div class="category">
                <div class="category-title">${category}</div>
                ${categoryQuestions.map(question => {
                  const answer = responses[question.id.toString()];
                  if (!answer || !answer.trim()) return '';
                  
                  return `
                    <div class="question-item">
                      <div class="question">${question.question}</div>
                      <div class="answer">${answer}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
          
          ${assessmentResponse.attachments && Array.isArray(assessmentResponse.attachments) && assessmentResponse.attachments.length > 0 ? `
          <div class="attachments" style="margin-top: 40px; border-top: 2px solid #333; padding-top: 20px;">
            <h3 style="color: #333; margin-bottom: 20px;">Załączniki</h3>
            <div class="attachment-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
              ${(assessmentResponse.attachments as any[]).map((attachment: any, index: number) => {
                const isImage = attachment.type && attachment.type.startsWith('image/');
                return `
                  <div class="attachment-item" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #f9f9f9;">
                    ${isImage ? `
                      <div style="height: 150px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f0f0f0;">
                        <img src="/api/needs-assessment/responses/${assessmentResponse.id}/attachments/${attachment.url.split('/').pop()}" alt="${attachment.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                      </div>
                    ` : `
                      <div style="height: 150px; display: flex; align-items: center; justify-content: center; background: #f0f0f0; color: #666;">
                        <svg style="width: 48px; height: 48px;" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      </div>
                    `}
                    <div style="padding: 10px;">
                      <p style="margin: 0; font-size: 12px; font-weight: bold; color: #333; word-break: break-all;" title="${attachment.name}">
                        ${attachment.name.length > 25 ? attachment.name.substring(0, 25) + '...' : attachment.name}
                      </p>
                      <p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">
                        ${attachment.size ? (attachment.size / 1024 / 1024).toFixed(1) + ' MB' : 'Nieznany rozmiar'}
                      </p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>PPP :: Program - Wynajem sprzętu</p>
            <p>Wygenerowano: ${new Date().toLocaleString('pl-PL')}</p>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(printHtml);
    } catch (error) {
      console.error("Error generating needs assessment print view:", error);
      res.status(500).json({ message: "Failed to generate print view" });
    }
  });

  // Serve attachment files for needs assessment print (no auth required for print context)
  app.get('/api/needs-assessment/responses/:responseId/attachments/:fileId', async (req: any, res) => {
    try {
      const responseId = parseInt(req.params.responseId);
      const fileId = req.params.fileId;
      
      // Verify the file belongs to this response
      const response = await db.select()
        .from(needsAssessmentResponses)
        .where(eq(needsAssessmentResponses.id, responseId))
        .limit(1);
      
      if (!response || response.length === 0) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      const attachments = response[0].attachments as any[] || [];
      const attachment = attachments.find(att => att.url.includes(fileId));
      
      if (!attachment) {
        return res.status(404).json({ message: "Attachment not found" });
      }
      
      // Serve the file using object storage
      const objectStorageService = new ObjectStorageService();
      const privateDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${privateDir}/uploads/${fileId}`;
      
      const pathParts = fullPath.startsWith("/") ? fullPath.split("/") : `/${fullPath}`.split("/");
      const bucketName = pathParts[1];
      const objectName = pathParts.slice(2).join("/");
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Set proper content type
      if (attachment.type) {
        res.setHeader('Content-Type', attachment.type);
      }
      
      // Stream the file
      const stream = file.createReadStream();
      stream.pipe(res);
      
    } catch (error) {
      console.error("Error serving attachment:", error);
      res.status(500).json({ message: "Failed to serve attachment" });
    }
  });

  // Update needs assessment response (admin only)
  app.put('/api/needs-assessment/responses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const responseId = parseInt(req.params.id);
      
      const validatedData = insertNeedsAssessmentResponseSchema.parse(req.body);
      
      const updatedResponse = await db.update(needsAssessmentResponses)
        .set({
          clientCompanyName: validatedData.clientCompanyName,
          clientContactPerson: validatedData.clientContactPerson,
          clientPhone: validatedData.clientPhone,
          clientEmail: validatedData.clientEmail,
          clientAddress: validatedData.clientAddress,
          responses: validatedData.responses,
          attachments: validatedData.attachments || [],
          updatedAt: new Date(),
        })
        .where(eq(needsAssessmentResponses.id, responseId))
        .returning();

      if (!updatedResponse || updatedResponse.length === 0) {
        return res.status(404).json({ message: "Needs assessment response not found" });
      }

      console.log("Assessment updated successfully:", updatedResponse[0]);
      res.json(updatedResponse[0]);
    } catch (error) {
      console.error("Error updating needs assessment response:", error);
      res.status(500).json({ message: "Failed to update assessment response" });
    }
  });

  // Delete needs assessment response (admin only)
  app.delete('/api/needs-assessment/responses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const id = parseInt(req.params.id);
      
      const result = await db.delete(needsAssessmentResponses)
        .where(eq(needsAssessmentResponses.id, id))
        .returning();
        
      if (result.length === 0) {
        return res.status(404).json({ message: "Response not found" });
      }
      
      res.json({ message: "Badanie potrzeb zostało usunięte" });
    } catch (error) {
      console.error("Error deleting needs assessment response:", error);
      res.status(500).json({ message: "Failed to delete response" });
    }
  });

  // API Key management endpoints (admin only)
  app.get('/api/admin/api-keys', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const keys = await db.select()
        .from(apiKeys)
        .orderBy(desc(apiKeys.createdAt));
      
      // Return full key values - masking will be handled on frontend
      res.json(keys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post('/api/admin/api-keys', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const keyData = insertApiKeySchema.parse({
        ...req.body,
        createdById: user?.id,
        keyValue: `ppp_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
      });
      
      const newKey = await db.insert(apiKeys)
        .values(keyData)
        .returning();
      
      res.status(201).json(newKey[0]);
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.delete('/api/admin/api-keys/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const keyId = parseInt(req.params.id);
      
      const deletedKey = await db.delete(apiKeys)
        .where(eq(apiKeys.id, keyId))
        .returning();
      
      if (deletedKey.length === 0) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  app.patch('/api/admin/api-keys/:id', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const keyId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const updatedKey = await db.update(apiKeys)
        .set({ isActive })
        .where(eq(apiKeys.id, keyId))
        .returning();
      
      if (updatedKey.length === 0) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json(updatedKey[0]);
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  // Public API endpoints for external integration
  
  // Get available equipment for external quote creation
  app.get('/api/public/equipment', requireApiKey(['quotes:create']), async (req, res) => {
    try {
      const equipmentList = await db.select({
        id: equipment.id,
        name: equipment.name,
        categoryId: equipment.categoryId,
        category: equipmentCategories.name,
        description: equipment.description,
        model: equipment.model,
        power: equipment.power,
        availableQuantity: equipment.availableQuantity,
        isActive: equipment.isActive
      })
      .from(equipment)
      .innerJoin(equipmentCategories, eq(equipment.categoryId, equipmentCategories.id))
      .where(and(
        eq(equipment.isActive, true),
        sql`${equipment.availableQuantity} > 0`
      ))
      .orderBy(equipmentCategories.name, equipment.name);

      // Get pricing for each equipment
      const equipmentWithPricing = await Promise.all(
        equipmentList.map(async (item) => {
          const pricing = await db.select()
            .from(equipmentPricing)
            .where(eq(equipmentPricing.equipmentId, item.id))
            .orderBy(equipmentPricing.periodStart);

          return {
            ...item,
            pricing
          };
        })
      );

      res.json(equipmentWithPricing);
    } catch (error) {
      console.error("Error fetching public equipment list:", error);
      res.status(500).json({ 
        error: "Failed to fetch equipment", 
        message: "Unable to retrieve equipment list" 
      });
    }
  });

  // Create quote via public API
  app.post('/api/public/quotes', requireApiKey(['quotes:create']), async (req: any, res) => {
    try {
      const quoteData = publicQuoteSchema.parse(req.body);
      
      // Create or find client
      let client = await db.select()
        .from(clients)
        .where(eq(clients.companyName, quoteData.clientCompanyName))
        .limit(1);

      if (client.length === 0) {
        const newClient = await db.insert(clients)
          .values({
            companyName: quoteData.clientCompanyName,
            contactPerson: quoteData.clientContactPerson,
            phone: quoteData.clientPhone,
            email: quoteData.clientEmail,
            address: quoteData.clientAddress,
          })
          .returning();
        client = newClient;
      }

      // Generate quote number
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      const todayQuotes = await db.select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(and(
          sql`${quotes.createdAt} >= ${startOfDay.toISOString()}`,
          sql`${quotes.createdAt} <= ${endOfDay.toISOString()}`
        ));
      
      const sequentialNumber = (todayQuotes[0]?.count || 0) + 1;
      const quoteNumber = `${String(sequentialNumber).padStart(2, '0')}/${dateStr}`;

      // Calculate pricing
      let totalNet = 0;

      // Create quote first
      const newQuote = await db.insert(quotes)
        .values({
          quoteNumber,
          clientId: client[0].id,
          totalNet: "0",
          totalGross: "0",
          pricingSchemaId: 3, // Default pricing schema
          createdById: null, // API created quote
        })
        .returning();

      // Process equipment items
      for (const item of quoteData.equipment) {
        // Get pricing for rental period
        const pricing = await db.select()
          .from(equipmentPricing)
          .where(and(
            eq(equipmentPricing.equipmentId, item.equipmentId),
            sql`${equipmentPricing.periodStart} <= ${item.rentalPeriod}`,
            sql`(${equipmentPricing.periodEnd} IS NULL OR ${equipmentPricing.periodEnd} >= ${item.rentalPeriod})`
          ))
          .orderBy(desc(equipmentPricing.periodStart))
          .limit(1);

        if (pricing.length === 0) {
          return res.status(400).json({ 
            error: "No pricing available", 
            message: `No pricing available for equipment ${item.equipmentId} for ${item.rentalPeriod} days` 
          });
        }

        const basePrice = parseFloat(pricing[0].pricePerDay.toString());
        const discount = parseFloat(pricing[0].discountPercent.toString());
        const discountedPrice = basePrice * (1 - discount / 100);
        const itemTotal = discountedPrice * item.quantity * item.rentalPeriod;
        
        totalNet += itemTotal;
        
        // Create quote item
        await db.insert(quoteItems)
          .values({
            quoteId: newQuote[0].id,
            equipmentId: item.equipmentId,
            quantity: item.quantity,
            rentalPeriodDays: item.rentalPeriod,
            pricePerDay: basePrice.toString(),
            discountPercent: discount.toString(),
            totalPrice: itemTotal.toString()
          });
      }

      const totalGross = totalNet * 1.23; // VAT 23%

      // Update quote totals
      await db.update(quotes)
        .set({
          totalNet: totalNet.toString(),
          totalGross: totalGross.toString()
        })
        .where(eq(quotes.id, newQuote[0].id));

      res.status(201).json({
        quote: { ...newQuote[0], totalNet: totalNet.toString(), totalGross: totalGross.toString() },
        message: "Quote created successfully"
      });
      
    } catch (error) {
      console.error("Error creating public quote:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          message: "Invalid request data",
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to create quote", 
        message: "Unable to process quote request" 
      });
    }
  });

  // Get needs assessment questions for external form
  app.get('/api/public/needs-assessment/questions', requireApiKey(['assessments:create']), async (req, res) => {
    try {
      const questions = await db.select()
        .from(needsAssessmentQuestions)
        .where(eq(needsAssessmentQuestions.isActive, true))
        .orderBy(needsAssessmentQuestions.category, needsAssessmentQuestions.position);

      // Group by category
      const questionsByCategory = questions.reduce((acc, question) => {
        if (!acc[question.category]) {
          acc[question.category] = [];
        }
        acc[question.category].push(question);
        return acc;
      }, {} as Record<string, any[]>);

      res.json({
        questions: questionsByCategory,
        categories: Object.keys(questionsByCategory)
      });
    } catch (error) {
      console.error("Error fetching public assessment questions:", error);
      res.status(500).json({ 
        error: "Failed to fetch questions", 
        message: "Unable to retrieve assessment questions" 
      });
    }
  });

  // Create needs assessment via public client portal (no API key required)
  app.post('/api/client/needs-assessment', async (req: any, res) => {
    try {
      console.log("Received client needs assessment data:", JSON.stringify(req.body, null, 2));
      
      const validatedData = insertNeedsAssessmentResponseSchema.parse(req.body);
      console.log("Validated client data:", JSON.stringify(validatedData, null, 2));
      
      // Generate response number for client assessments with CLIENT prefix
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      
      // Get the count of CLIENT responses created today
      const todayClientResponses = await db.select({ count: sql<number>`count(*)` })
        .from(needsAssessmentResponses)
        .where(sql`DATE(${needsAssessmentResponses.createdAt}) = DATE(NOW()) AND ${needsAssessmentResponses.responseNumber} LIKE 'CLIENT-%'`);
      
      const sequentialNumber = (todayClientResponses[0]?.count || 0) + 1;
      const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp for uniqueness
      const responseNumber = `CLIENT-${String(sequentialNumber).padStart(2, '0')}${timestamp}/${dateStr}`;

      const newResponse = await db.insert(needsAssessmentResponses)
        .values({
          responseNumber,
          clientCompanyName: validatedData.clientCompanyName,
          clientContactPerson: validatedData.clientContactPerson,
          clientPhone: validatedData.clientPhone,
          clientEmail: validatedData.clientEmail,
          clientAddress: validatedData.clientAddress,
          responses: validatedData.responses,
          attachments: validatedData.attachments || [],
        })
        .returning();

      console.log("Client assessment saved successfully:", newResponse[0]);
      
      // Create notifications for all employees about new client assessment
      try {
        // Get all employees to notify
        const employees = await db.select({ id: users.id }).from(users).where(
          inArray(users.role, ['admin', 'electrical_manager', 'transport_manager', 'general_manager', 'employee'])
        );
        
        // Create a notification for each employee
        const notificationPromises = employees.map(employee => 
          db.insert(notifications).values({
            userId: employee.id,
            type: 'guest_assessment',
            title: '📋 Nowe badanie potrzeb od klienta',
            message: `Klient ${validatedData.clientCompanyName || 'Nieznany'} wypełnił badanie potrzeb ${newResponse[0].responseNumber}. Prosimy o sprawdzenie wyników.`,
            relatedId: newResponse[0].id,
            clientName: validatedData.clientCompanyName || 'Nieznany klient',
          })
        );
        
        await Promise.all(notificationPromises);
        console.log(`Notifications created for ${employees.length} employees about client assessment:`, newResponse[0].id);
      } catch (notificationError) {
        console.error('Error creating client assessment notifications:', notificationError);
        // Don't fail the assessment creation if notification fails
      }
      
      res.status(201).json(newResponse[0]);
    } catch (error) {
      console.error("Error saving client needs assessment:", error);
      res.status(500).json({ message: "Failed to save client assessment" });
    }
  });

  // Create needs assessment via public API
  app.post('/api/public/needs-assessment', requireApiKey(['assessments:create']), async (req: any, res) => {
    try {
      const assessmentData = publicAssessmentSchema.parse(req.body);
      
      // Generate response number for client assessments with CLIENT prefix
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      
      // Get the count of CLIENT responses created today
      const todayClientResponses = await db.select({ count: sql<number>`count(*)` })
        .from(needsAssessmentResponses)
        .where(sql`DATE(${needsAssessmentResponses.createdAt}) = DATE(NOW()) AND ${needsAssessmentResponses.responseNumber} LIKE 'CLIENT-%'`);
      
      const sequentialNumber = (todayClientResponses[0]?.count || 0) + 1;
      const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp for uniqueness
      const responseNumber = `CLIENT-${String(sequentialNumber).padStart(2, '0')}${timestamp}/${dateStr}`;

      const newResponse = await db.insert(needsAssessmentResponses)
        .values({
          responseNumber,
          clientCompanyName: assessmentData.clientCompanyName,
          clientContactPerson: assessmentData.clientContactPerson,
          clientPhone: assessmentData.clientPhone,
          clientEmail: assessmentData.clientEmail,
          clientAddress: assessmentData.clientAddress,
          responses: assessmentData.responses,
          userId: null, // API created assessment
        })
        .returning();

      // Create notifications for all employees about new API assessment
      try {
        // Get all employees to notify
        const employees = await db.select({ id: users.id }).from(users).where(
          inArray(users.role, ['admin', 'electrical_manager', 'transport_manager', 'general_manager', 'employee'])
        );
        
        // Create a notification for each employee
        const notificationPromises = employees.map(employee => 
          db.insert(notifications).values({
            userId: employee.id,
            type: 'guest_assessment',
            title: '📋 Nowe badanie potrzeb (API)',
            message: `Klient ${assessmentData.clientCompanyName || 'Nieznany'} wypełnił badanie potrzeb ${newResponse[0].responseNumber} przez API. Prosimy o sprawdzenie wyników.`,
            relatedId: newResponse[0].id,
            clientName: assessmentData.clientCompanyName || 'Nieznany klient',
          })
        );
        
        await Promise.all(notificationPromises);
        console.log(`Notifications created for ${employees.length} employees about API assessment:`, newResponse[0].id);
      } catch (notificationError) {
        console.error('Error creating API assessment notifications:', notificationError);
        // Don't fail the assessment creation if notification fails
      }
      
      res.status(201).json({
        assessment: newResponse[0],
        message: "Needs assessment created successfully"
      });
      
    } catch (error) {
      console.error("Error creating public assessment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation error", 
          message: "Invalid request data",
          details: error.errors 
        });
      }
      res.status(500).json({ 
        error: "Failed to create assessment", 
        message: "Unable to process assessment request" 
      });
    }
  });

  // API documentation endpoint
  app.get('/api/public/docs', (req, res) => {
    res.json({
      title: "PPP :: Program Equipment Rental API",
      version: "1.0.0",
      description: "Public API for creating equipment rental quotes and needs assessments",
      authentication: {
        type: "API Key",
        headerName: "X-API-Key",
        alternativeHeader: "Authorization: Bearer {api_key}"
      },
      endpoints: {
        "GET /api/public/equipment": {
          description: "Get available equipment with pricing",
          permission: "quotes:create"
        },
        "POST /api/public/quotes": {
          description: "Create a new equipment rental quote",
          permission: "quotes:create"
        },
        "GET /api/public/needs-assessment/questions": {
          description: "Get needs assessment questions grouped by category",
          permission: "assessments:create"
        },
        "POST /api/public/needs-assessment": {
          description: "Submit a needs assessment response",
          permission: "assessments:create"
        }
      }
    });
  });

  // Transport vehicles endpoints
  app.get('/api/transport-vehicles', isAuthenticated, async (req, res) => {
    try {
      const vehicles = await storage.getTransportVehicles();
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching transport vehicles:", error);
      res.status(500).json({ message: "Failed to fetch transport vehicles" });
    }
  });

  app.get('/api/transport-vehicles/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const vehicle = await storage.getTransportVehicleById(id);
      
      if (!vehicle) {
        return res.status(404).json({ message: "Transport vehicle not found" });
      }
      
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching transport vehicle:", error);
      res.status(500).json({ message: "Failed to fetch transport vehicle" });
    }
  });

  app.post('/api/transport-vehicles', isAuthenticated, requireTransportManager, async (req: any, res) => {
    try {
      const vehicleData = insertTransportVehicleSchema.parse(req.body);
      const vehicle = await storage.createTransportVehicle(vehicleData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error creating transport vehicle:", error);
      res.status(500).json({ message: "Failed to create transport vehicle" });
    }
  });

  app.put('/api/transport-vehicles/:id', isAuthenticated, requireTransportManager, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const vehicleData = insertTransportVehicleSchema.partial().parse(req.body);
      const vehicle = await storage.updateTransportVehicle(id, vehicleData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating transport vehicle:", error);
      res.status(500).json({ message: "Failed to update transport vehicle" });
    }
  });

  app.delete('/api/transport-vehicles/:id', isAuthenticated, requireTransportManager, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransportVehicle(id);
      res.json({ message: "Transport vehicle deleted successfully" });
    } catch (error) {
      console.error("Error deleting transport vehicle:", error);
      res.status(500).json({ message: "Failed to delete transport vehicle" });
    }
  });

  // Transport quotes endpoints
  app.get('/api/transport-quotes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'transport_manager') {
        return res.status(403).json({ message: "Access denied. Transport department access required." });
      }

      const quotes = await storage.getTransportQuotes();
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching transport quotes:", error);
      res.status(500).json({ message: "Failed to fetch transport quotes" });
    }
  });

  app.get('/api/transport-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'transport_manager') {
        return res.status(403).json({ message: "Access denied. Transport department access required." });
      }

      const id = parseInt(req.params.id);
      const quote = await storage.getTransportQuoteById(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Transport quote not found" });
      }
      
      res.json(quote);
    } catch (error) {
      console.error("Error fetching transport quote:", error);
      res.status(500).json({ message: "Failed to fetch transport quote" });
    }
  });

  app.post('/api/transport-quotes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee' && user?.role !== 'transport_manager') {
        return res.status(403).json({ message: "Access denied. Transport department access required." });
      }

      // Generate unique quote number
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const dateStr = `${month}.${year}`;
      
      // Get existing transport quotes for today to generate sequential number
      const existingQuotes = await storage.getTransportQuotes();
      const todayQuotes = existingQuotes.filter(q => 
        q.quoteNumber?.includes(dateStr)
      );
      
      let sequentialNumber = 1;
      if (todayQuotes.length > 0) {
        const highestNumber = Math.max(
          ...todayQuotes.map(q => {
            const match = q.quoteNumber?.match(/^T(\d+)\//);
            return match ? parseInt(match[1], 10) : 0;
          })
        );
        sequentialNumber = highestNumber + 1;
      }
      
      const quoteNumber = `T${String(sequentialNumber).padStart(2, '0')}/${dateStr}`;
      
      const quoteData = insertTransportQuoteSchema.parse({
        ...req.body,
        quoteNumber,
        userId: req.user.claims.sub,
      });
      
      const quote = await storage.createTransportQuote(quoteData);
      res.json(quote);
    } catch (error) {
      console.error("Error creating transport quote:", error);
      res.status(500).json({ message: "Failed to create transport quote" });
    }
  });

  app.put('/api/transport-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      const id = parseInt(req.params.id);
      const quoteData = insertTransportQuoteSchema.partial().parse(req.body);
      const quote = await storage.updateTransportQuote(id, quoteData);
      res.json(quote);
    } catch (error) {
      console.error("Error updating transport quote:", error);
      res.status(500).json({ message: "Failed to update transport quote" });
    }
  });

  app.delete('/api/transport-quotes/:id', isAuthenticated, requireTransportManager, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTransportQuote(id);
      res.json({ message: "Transport quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting transport quote:", error);
      res.status(500).json({ message: "Failed to delete transport quote" });
    }
  });

  app.get('/api/transport-quotes/:id/print', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const quote = await storage.getTransportQuoteById(id);
      
      if (!quote) {
        return res.status(404).json({ message: "Transport quote not found" });
      }

      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'transport_manager' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied" });
      }

      const html = generateTransportQuoteHTML(quote);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Error generating transport quote print:', error);
      res.status(500).json({ message: 'Failed to generate print' });
    }
  });

  // ================================
  // ELECTRICAL EQUIPMENT ROUTES
  // ================================

  // Get all electrical equipment categories
  app.get('/api/electrical-equipment-categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await db.select().from(electricalEquipmentCategories).orderBy(electricalEquipmentCategories.name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching electrical equipment categories:", error);
      res.status(500).json({ message: "Failed to fetch electrical equipment categories" });
    }
  });

  // Create electrical equipment category
  app.post('/api/electrical-equipment-categories', isAuthenticated, requireElectricalManager, async (req: any, res) => {
    try {

      const categoryData = insertElectricalEquipmentCategorySchema.parse(req.body);
      const newCategory = await db.insert(electricalEquipmentCategories).values(categoryData).returning();
      res.status(201).json(newCategory[0]);
    } catch (error) {
      console.error("Error creating electrical equipment category:", error);
      res.status(500).json({ message: "Failed to create electrical equipment category" });
    }
  });

  // Get general equipment categories
  app.get('/api/general-equipment-categories', isAuthenticated, async (req, res) => {
    try {
      const categories = await db.select().from(generalEquipmentCategories).orderBy(generalEquipmentCategories.name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching general equipment categories:", error);
      res.status(500).json({ message: "Failed to fetch general equipment categories" });
    }
  });

  // Create general equipment category
  app.post('/api/general-equipment-categories', isAuthenticated, requireGeneralManager, async (req: any, res) => {
    try {

      const categoryData = insertGeneralEquipmentCategorySchema.parse(req.body);
      const newCategory = await db.insert(generalEquipmentCategories).values(categoryData).returning();
      res.status(201).json(newCategory[0]);
    } catch (error) {
      console.error("Error creating general equipment category:", error);
      res.status(500).json({ message: "Failed to create general equipment category" });
    }
  });

  // Delete general equipment category
  app.delete('/api/general-equipment-categories/:id', isAuthenticated, requireGeneralManager, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);

      // Check if category has equipment
      const equipmentInCategory = await db.select().from(generalEquipment).where(eq(generalEquipment.categoryId, categoryId));
      
      if (equipmentInCategory.length > 0) {
        return res.status(400).json({ 
          message: `Nie można usunąć kategorii - zawiera ${equipmentInCategory.length} pozycji sprzętu`
        });
      }

      await db.delete(generalEquipmentCategories).where(eq(generalEquipmentCategories.id, categoryId));
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting general equipment category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Get all general equipment with categories and pricing
  app.get('/api/general-equipment', async (req, res) => {
    try {
      const equipmentList = await db.select({
        id: generalEquipment.id,
        name: generalEquipment.name,
        categoryId: generalEquipment.categoryId,
        description: generalEquipment.description,
        model: generalEquipment.model,
        power: generalEquipment.power,
        fuelConsumption75: generalEquipment.fuelConsumption75,
        dimensions: generalEquipment.dimensions,
        weight: generalEquipment.weight,
        engine: generalEquipment.engine,
        alternator: generalEquipment.alternator,
        fuelTankCapacity: generalEquipment.fuelTankCapacity,
        imageUrl: generalEquipment.imageUrl,
        quantity: generalEquipment.quantity,
        availableQuantity: generalEquipment.availableQuantity,
        isActive: generalEquipment.isActive,
        createdAt: generalEquipment.createdAt,
        updatedAt: generalEquipment.updatedAt,
        category: {
          id: generalEquipmentCategories.id,
          name: generalEquipmentCategories.name,
          description: generalEquipmentCategories.description,
        }
      })
      .from(generalEquipment)
      .innerJoin(generalEquipmentCategories, eq(generalEquipment.categoryId, generalEquipmentCategories.id))
      .where(eq(generalEquipment.isActive, true))
      .orderBy(generalEquipmentCategories.name, generalEquipment.name);

      // Get pricing and additional equipment for each item
      const equipmentWithDetails = await Promise.all(
        equipmentList.map(async (item) => {
          const [pricing, additionalEquipment] = await Promise.all([
            db.select().from(generalEquipmentPricing).where(eq(generalEquipmentPricing.equipmentId, item.id)).orderBy(generalEquipmentPricing.periodStart),
            db.select().from(generalEquipmentAdditional).where(eq(generalEquipmentAdditional.equipmentId, item.id)).orderBy(generalEquipmentAdditional.type, generalEquipmentAdditional.position)
          ]);

          return {
            ...item,
            pricing,
            additionalEquipment
          };
        })
      );

      res.json(equipmentWithDetails);
    } catch (error) {
      console.error("Error fetching general equipment:", error);
      res.status(500).json({ message: "Failed to fetch general equipment" });
    }
  });

  // Create general equipment
  app.post('/api/general-equipment', isAuthenticated, requireGeneralManager, async (req: any, res) => {
    try {

      const validatedEquipmentData = insertGeneralEquipmentSchema.parse(req.body);
      const newEquipment = await db.insert(generalEquipment).values(validatedEquipmentData).returning();

      res.status(201).json(newEquipment[0]);
    } catch (error) {
      console.error("Error creating general equipment:", error);
      res.status(500).json({ message: "Failed to create general equipment" });
    }
  });

  // Update general equipment
  app.put('/api/general-equipment/:id', isAuthenticated, requireGeneralManager, async (req: any, res) => {
    try {

      const equipmentId = parseInt(req.params.id);
      const equipmentData = req.body;

      await db.update(generalEquipment)
        .set({
          name: equipmentData.name,
          categoryId: equipmentData.categoryId,
          description: equipmentData.description || null,
          model: equipmentData.model || null,
          power: equipmentData.power || null,
          fuelConsumption75: equipmentData.fuelConsumption75 || null,
          dimensions: equipmentData.dimensions || null,
          weight: equipmentData.weight || null,
          engine: equipmentData.engine || null,
          alternator: equipmentData.alternator || null,
          fuelTankCapacity: equipmentData.fuelTankCapacity || null,
          imageUrl: equipmentData.imageUrl || null,
          quantity: equipmentData.quantity || 0,
          availableQuantity: equipmentData.availableQuantity || 0,
          isActive: equipmentData.isActive !== undefined ? equipmentData.isActive : true,
          updatedAt: new Date(),
        })
        .where(eq(generalEquipment.id, equipmentId));

      res.json({ message: "Equipment updated successfully" });
    } catch (error) {
      console.error("Error updating general equipment:", error);
      res.status(500).json({ message: "Failed to update equipment" });
    }
  });

  // Update general equipment pricing
  app.put('/api/general-equipment/:id/pricing', isAuthenticated, requireGeneralManager, async (req: any, res) => {
    try {

      const equipmentId = parseInt(req.params.id);
      const pricingData = req.body;

      // Delete existing pricing
      await db.delete(generalEquipmentPricing).where(eq(generalEquipmentPricing.equipmentId, equipmentId));

      // Insert new pricing
      if (pricingData.length > 0) {
        const newPricing = pricingData.map((p: any) => ({
          equipmentId,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          pricePerDay: p.pricePerDay,
          discountPercent: p.discountPercent || "0",
        }));
        await db.insert(generalEquipmentPricing).values(newPricing);
      }

      res.json({ message: "Pricing updated successfully" });
    } catch (error) {
      console.error("Error updating general equipment pricing:", error);
      res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  // Update general equipment additional equipment
  app.put('/api/general-equipment/:id/additional', isAuthenticated, requireGeneralManager, async (req: any, res) => {
    try {

      const equipmentId = parseInt(req.params.id);
      const additionalData = req.body;

      // Delete existing additional equipment
      await db.delete(generalEquipmentAdditional).where(eq(generalEquipmentAdditional.equipmentId, equipmentId));

      // Insert new additional equipment
      if (additionalData.length > 0) {
        const newAdditional = additionalData.map((a: any) => ({
          equipmentId,
          type: a.type,
          position: a.position,
          name: a.name,
          description: a.description || '',
          pricePerDay: a.pricePerDay,
          isOptional: a.isOptional,
        }));
        await db.insert(generalEquipmentAdditional).values(newAdditional);
      }

      res.json({ message: "Additional equipment updated successfully" });
    } catch (error) {
      console.error("Error updating general equipment additional:", error);
      res.status(500).json({ message: "Failed to update additional equipment" });
    }
  });

  // Delete general equipment
  app.delete('/api/general-equipment/:id', isAuthenticated, requireGeneralManager, async (req: any, res) => {
    try {

      const equipmentId = parseInt(req.params.id);

      // Delete related data first
      await db.delete(generalEquipmentPricing).where(eq(generalEquipmentPricing.equipmentId, equipmentId));
      await db.delete(generalEquipmentAdditional).where(eq(generalEquipmentAdditional.equipmentId, equipmentId));
      
      // Delete the equipment
      await db.delete(generalEquipment).where(eq(generalEquipment.id, equipmentId));

      res.json({ message: "Equipment deleted successfully" });
    } catch (error) {
      console.error("Error deleting general equipment:", error);
      res.status(500).json({ message: "Failed to delete equipment" });
    }
  });

  // Get all electrical equipment with categories and pricing
  app.get('/api/electrical-equipment', async (req, res) => {
    try {
      const equipmentList = await db.select({
        id: electricalEquipment.id,
        name: electricalEquipment.name,
        categoryId: electricalEquipment.categoryId,
        description: electricalEquipment.description,
        model: electricalEquipment.model,
        power: electricalEquipment.power,
        fuelConsumption75: electricalEquipment.fuelConsumption75,
        dimensions: electricalEquipment.dimensions,
        weight: electricalEquipment.weight,
        engine: electricalEquipment.engine,
        alternator: electricalEquipment.alternator,
        fuelTankCapacity: electricalEquipment.fuelTankCapacity,
        imageUrl: electricalEquipment.imageUrl,
        quantity: electricalEquipment.quantity,
        availableQuantity: electricalEquipment.availableQuantity,
        isActive: electricalEquipment.isActive,
        createdAt: electricalEquipment.createdAt,
        updatedAt: electricalEquipment.updatedAt,
        category: {
          id: electricalEquipmentCategories.id,
          name: electricalEquipmentCategories.name,
          description: electricalEquipmentCategories.description,
        }
      })
      .from(electricalEquipment)
      .innerJoin(electricalEquipmentCategories, eq(electricalEquipment.categoryId, electricalEquipmentCategories.id))
      .where(eq(electricalEquipment.isActive, true))
      .orderBy(electricalEquipmentCategories.name, electricalEquipment.name);

      // Get pricing and additional equipment for each item
      const equipmentWithDetails = await Promise.all(
        equipmentList.map(async (item) => {
          const [pricing, additionalEquipment] = await Promise.all([
            db.select().from(electricalEquipmentPricing).where(eq(electricalEquipmentPricing.equipmentId, item.id)).orderBy(electricalEquipmentPricing.periodStart),
            db.select().from(electricalEquipmentAdditional).where(eq(electricalEquipmentAdditional.equipmentId, item.id)).orderBy(electricalEquipmentAdditional.type, electricalEquipmentAdditional.position)
          ]);

          return {
            ...item,
            pricing,
            additionalEquipment: additionalEquipment.map(additional => ({
              ...additional,
              pricePerDay: additional.pricePerDay
            }))
          };
        })
      );

      res.json(equipmentWithDetails);
    } catch (error) {
      console.error("Error fetching electrical equipment:", error);
      res.status(500).json({ message: "Failed to fetch electrical equipment" });
    }
  });

  // Create electrical equipment
  app.post('/api/electrical-equipment', isAuthenticated, requireElectricalManager, async (req: any, res) => {
    try {

      const { createPricing, startingPrice, ...equipmentData } = req.body;
      const validatedEquipmentData = insertElectricalEquipmentSchema.parse(equipmentData);
      const newEquipment = await db.insert(electricalEquipment).values(validatedEquipmentData).returning();
      
      // Create default pricing if requested
      if (createPricing && startingPrice && newEquipment[0]) {
        const basePrice = parseFloat(startingPrice);
        const defaultPricing = [
          {
            equipmentId: newEquipment[0].id,
            periodStart: 1,
            periodEnd: 2,
            pricePerDay: basePrice.toFixed(2),
            discountPercent: "0",
          },
          {
            equipmentId: newEquipment[0].id,
            periodStart: 3,
            periodEnd: 7,
            pricePerDay: (basePrice * (1 - 0.1429)).toFixed(2), // 14.29% discount
            discountPercent: "14.29",
          },
          {
            equipmentId: newEquipment[0].id,
            periodStart: 8,
            periodEnd: 18,
            pricePerDay: (basePrice * (1 - 0.2857)).toFixed(2), // 28.57% discount
            discountPercent: "28.57",
          },
          {
            equipmentId: newEquipment[0].id,
            periodStart: 19,
            periodEnd: 29,
            pricePerDay: (basePrice * (1 - 0.4286)).toFixed(2), // 42.86% discount
            discountPercent: "42.86",
          },
          {
            equipmentId: newEquipment[0].id,
            periodStart: 30,
            periodEnd: null,
            pricePerDay: (basePrice * (1 - 0.5714)).toFixed(2), // 57.14% discount
            discountPercent: "57.14",
          }
        ];
        
        await db.insert(electricalEquipmentPricing).values(defaultPricing);
      }
      
      res.status(201).json(newEquipment[0]);
    } catch (error) {
      console.error("Error creating electrical equipment:", error);
      res.status(500).json({ message: "Failed to create electrical equipment" });
    }
  });

  // Update electrical equipment pricing
  app.put('/api/electrical-equipment/:id/pricing', isAuthenticated, requireElectricalManager, async (req: any, res) => {
    try {

      const equipmentId = parseInt(req.params.id);
      const pricingData = req.body;

      // Delete existing pricing
      await db.delete(electricalEquipmentPricing).where(eq(electricalEquipmentPricing.equipmentId, equipmentId));

      // Insert new pricing
      if (pricingData.length > 0) {
        const newPricing = pricingData.map((p: any) => ({
          equipmentId,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          pricePerDay: p.pricePerDay,
          discountPercent: p.discountPercent || "0",
        }));
        await db.insert(electricalEquipmentPricing).values(newPricing);
      }

      res.json({ message: "Pricing updated successfully" });
    } catch (error) {
      console.error("Error updating electrical equipment pricing:", error);
      res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  // Update electrical equipment additional equipment
  app.put('/api/electrical-equipment/:id/additional', isAuthenticated, requireElectricalManager, async (req: any, res) => {
    try {

      const equipmentId = parseInt(req.params.id);
      const additionalData = req.body;

      // Delete existing additional equipment
      await db.delete(electricalEquipmentAdditional).where(eq(electricalEquipmentAdditional.equipmentId, equipmentId));

      // Insert new additional equipment
      if (additionalData.length > 0) {
        const newAdditional = additionalData.map((a: any) => ({
          equipmentId,
          type: a.type,
          position: a.position,
          name: a.name,
          description: a.description || '',
          pricePerDay: a.pricePerDay,
          isOptional: a.isOptional,
        }));
        await db.insert(electricalEquipmentAdditional).values(newAdditional);
      }

      res.json({ message: "Additional equipment updated successfully" });
    } catch (error) {
      console.error("Error updating electrical equipment additional:", error);
      res.status(500).json({ message: "Failed to update additional equipment" });
    }
  });

  // Delete electrical equipment
  app.delete('/api/electrical-equipment/:id', isAuthenticated, requireElectricalManager, async (req: any, res) => {
    try {

      const equipmentId = parseInt(req.params.id);

      // Delete related data first
      await db.delete(electricalEquipmentPricing).where(eq(electricalEquipmentPricing.equipmentId, equipmentId));
      await db.delete(electricalEquipmentAdditional).where(eq(electricalEquipmentAdditional.equipmentId, equipmentId));
      
      // Delete the equipment
      await db.delete(electricalEquipment).where(eq(electricalEquipment.id, equipmentId));

      res.json({ message: "Equipment deleted successfully" });
    } catch (error) {
      console.error("Error deleting electrical equipment:", error);
      res.status(500).json({ message: "Failed to delete equipment" });
    }
  });

  // Delete electrical equipment category
  app.delete('/api/electrical-equipment-categories/:id', isAuthenticated, requireElectricalManager, async (req: any, res) => {
    try {

      const categoryId = parseInt(req.params.id);

      // Check if category has equipment
      const equipmentInCategory = await db.select().from(electricalEquipment).where(eq(electricalEquipment.categoryId, categoryId));
      
      if (equipmentInCategory.length > 0) {
        return res.status(400).json({ 
          message: `Nie można usunąć kategorii - zawiera ${equipmentInCategory.length} pozycji sprzętu` 
        });
      }

      // Delete the category
      await db.delete(electricalEquipmentCategories).where(eq(electricalEquipmentCategories.id, categoryId));

      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting electrical equipment category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Get all electrical quotes
  app.get('/api/electrical-quotes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'electrical_manager') {
        return res.status(403).json({ message: "Access denied. Electrical department access required." });
      }

      const quotesResult = await db.select({
        id: electricalQuotes.id,
        quoteNumber: electricalQuotes.quoteNumber,
        clientId: electricalQuotes.clientId,
        totalNet: electricalQuotes.totalNet,
        totalGross: electricalQuotes.totalGross,
        status: electricalQuotes.status,
        notes: electricalQuotes.notes,
        createdAt: electricalQuotes.createdAt,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactPerson: clients.contactPerson,
          email: clients.email,
          phone: clients.phone,
        }
      })
      .from(electricalQuotes)
      .innerJoin(clients, eq(electricalQuotes.clientId, clients.id))
      .orderBy(desc(electricalQuotes.createdAt));

      res.json(quotesResult);
    } catch (error) {
      console.error("Error fetching electrical quotes:", error);
      res.status(500).json({ message: "Failed to fetch electrical quotes" });
    }
  });

  // Create electrical quote
  app.post('/api/electrical-quotes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee' && user?.role !== 'electrical_manager') {
        return res.status(403).json({ message: "Access denied. Electrical department access required." });
      }

      const { client: clientData, items, ...quoteData } = req.body;

      // Create or find client
      let client = await db.select().from(clients)
        .where(eq(clients.companyName, clientData.companyName))
        .limit(1);

      if (client.length === 0) {
        const newClient = await db.insert(clients).values(clientData).returning();
        client = newClient;
      }

      // Generate quote number
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      
      const todayQuotes = await db.select({ count: sql<number>`count(*)` })
        .from(electricalQuotes)
        .where(and(
          sql`${electricalQuotes.createdAt} >= ${startOfDay.toISOString()}`,
          sql`${electricalQuotes.createdAt} <= ${endOfDay.toISOString()}`
        ));
      
      const quoteNumber = `EL/${String(todayQuotes[0].count + 1).padStart(3, '0')}/${dateStr}`;

      // Create quote
      const { isGuestQuote, guestEmail, pricingSchemaId, ...cleanQuoteData } = quoteData;
      const newQuote = await db.insert(electricalQuotes).values({
        ...cleanQuoteData,
        quoteNumber,
        clientId: client[0].id,
        createdById: user?.id,
        isGuestQuote: isGuestQuote || false,
        guestEmail: guestEmail || null,
        pricingSchemaId: pricingSchemaId || null,
      }).returning();

      // Create quote items - filter only the fields that exist in the database
      console.log('Raw items received:', JSON.stringify(items, null, 2));
      
      const quoteItemsData = items.map((item: any) => {
        const cleanItem = {
          quoteId: newQuote[0].id,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          rentalPeriodDays: item.rentalPeriodDays,
          pricePerDay: item.pricePerDay,
          discountPercent: item.discountPercent || "0",
          totalPrice: item.totalPrice,
          // notes: item.notes || null, // Column doesn't exist in DB
        };
        console.log('Clean item to insert:', JSON.stringify(cleanItem, null, 2));
        return cleanItem;
      });

      // Use raw SQL to avoid Drizzle schema issues with missing columns
      for (const item of quoteItemsData) {
        await db.execute(sql`
          INSERT INTO electrical_quote_items (
            quote_id, equipment_id, quantity, rental_period_days,
            price_per_day, discount_percent, total_price
          ) VALUES (
            ${item.quoteId}, ${item.equipmentId}, ${item.quantity}, ${item.rentalPeriodDays},
            ${item.pricePerDay}, ${item.discountPercent}, ${item.totalPrice}
          )
        `);
      }

      res.status(201).json(newQuote[0]);
    } catch (error) {
      console.error("Error creating electrical quote:", error);
      res.status(500).json({ message: "Failed to create electrical quote" });
    }
  });

  // Print electrical quote endpoint
  app.get('/api/electrical-quotes/:id/print', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Fetch the electrical quote with full details
      const quoteResult = await db.select({
        id: electricalQuotes.id,
        quoteNumber: electricalQuotes.quoteNumber,
        clientId: electricalQuotes.clientId,
        totalNet: electricalQuotes.totalNet,
        totalGross: electricalQuotes.totalGross,
        status: electricalQuotes.status,
        notes: electricalQuotes.notes,
        createdAt: electricalQuotes.createdAt,
        updatedAt: electricalQuotes.updatedAt,
        // Client details
        companyName: clients.companyName,
        contactPerson: clients.contactPerson,
        phone: clients.phone,
        email: clients.email,
        address: clients.address,
        // Creator details
        creatorFirstName: users.firstName,
        creatorLastName: users.lastName,
        creatorEmail: users.email,
      })
      .from(electricalQuotes)
      .innerJoin(clients, eq(electricalQuotes.clientId, clients.id))
      .leftJoin(users, eq(electricalQuotes.createdById, users.id))
      .where(eq(electricalQuotes.id, id))
      .limit(1);

      if (quoteResult.length === 0) {
        return res.status(404).json({ message: "Electrical quote not found" });
      }

      const quote = quoteResult[0];

      // Fetch quote items with equipment details
      const itemsResult = await db.select({
        id: electricalQuoteItems.id,
        equipmentId: electricalQuoteItems.equipmentId,
        quantity: electricalQuoteItems.quantity,
        rentalPeriodDays: electricalQuoteItems.rentalPeriodDays,
        pricePerDay: electricalQuoteItems.pricePerDay,
        discountPercent: electricalQuoteItems.discountPercent,
        totalPrice: electricalQuoteItems.totalPrice,
        // Equipment details
        equipmentName: electricalEquipment.name,
        equipmentDescription: electricalEquipment.description,
        equipmentModel: electricalEquipment.model,
        equipmentPower: electricalEquipment.power,
      })
      .from(electricalQuoteItems)
      .innerJoin(electricalEquipment, eq(electricalQuoteItems.equipmentId, electricalEquipment.id))
      .where(eq(electricalQuoteItems.quoteId, id));

      const htmlContent = generateElectricalQuoteHTML({
        ...quote,
        items: itemsResult
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);
    } catch (error) {
      console.error("Error generating electrical quote print:", error);
      res.status(500).json({ message: "Failed to generate print version" });
    }
  });

  // Delete electrical quote endpoint
  app.delete('/api/electrical-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee' && user?.role !== 'electrical_manager') {
        return res.status(403).json({ message: "Access denied. Electrical department access required." });
      }

      const quoteId = parseInt(req.params.id);

      // Delete quote items first (foreign key constraint)
      await db.delete(electricalQuoteItems)
        .where(eq(electricalQuoteItems.quoteId, quoteId));

      // Delete the quote
      const deletedQuote = await db.delete(electricalQuotes)
        .where(eq(electricalQuotes.id, quoteId))
        .returning();

      if (deletedQuote.length === 0) {
        return res.status(404).json({ message: "Electrical quote not found" });
      }

      res.json({ message: "Electrical quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting electrical quote:", error);
      res.status(500).json({ message: "Failed to delete electrical quote" });
    }
  });

  // Get all general quotes
  app.get('/api/general-quotes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee' && user?.role !== 'general_manager') {
        return res.status(403).json({ message: "Access denied. General equipment access required." });
      }

      const quotesResult = await db.select({
        id: generalQuotes.id,
        quoteNumber: generalQuotes.quoteNumber,
        clientId: generalQuotes.clientId,
        totalNet: generalQuotes.totalNet,
        totalGross: generalQuotes.totalGross,
        status: generalQuotes.status,
        notes: generalQuotes.notes,
        createdAt: generalQuotes.createdAt,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactPerson: clients.contactPerson,
          email: clients.email,
          phone: clients.phone,
        }
      })
      .from(generalQuotes)
      .innerJoin(clients, eq(generalQuotes.clientId, clients.id))
      .orderBy(desc(generalQuotes.createdAt));

      // Get items for each quote
      const quotesWithItems = await Promise.all(
        quotesResult.map(async (quote) => {
          const items = await db.select({
            id: generalQuoteItems.id,
            quantity: generalQuoteItems.quantity,
            rentalPeriodDays: generalQuoteItems.rentalPeriodDays,
            equipment: {
              name: generalEquipment.name,
            }
          })
          .from(generalQuoteItems)
          .innerJoin(generalEquipment, eq(generalQuoteItems.equipmentId, generalEquipment.id))
          .where(eq(generalQuoteItems.quoteId, quote.id));

          return { ...quote, items };
        })
      );

      res.json(quotesWithItems);
    } catch (error) {
      console.error("Error fetching general quotes:", error);
      res.status(500).json({ message: "Failed to fetch general quotes" });
    }
  });

  // Create general quote
  app.post('/api/general-quotes', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee' && user?.role !== 'general_manager') {
        return res.status(403).json({ message: "Access denied. General equipment access required." });
      }

      const { client: clientData, items, ...quoteData } = req.body;

      // Create or find client
      let client = await db.select().from(clients)
        .where(eq(clients.companyName, clientData.companyName))
        .limit(1);

      if (client.length === 0) {
        const newClient = await db.insert(clients).values(clientData).returning();
        client = newClient;
      }

      // Generate quote number with better logic and race condition protection
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      
      // Try multiple times to generate a unique number (handle race conditions)
      let quoteNumber;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        // Get all existing quotes for this month/year to find the highest number
        const existingQuotes = await db.select({ quoteNumber: generalQuotes.quoteNumber })
          .from(generalQuotes)
          .where(like(generalQuotes.quoteNumber, `GEN/%/${dateStr}`))
          .orderBy(desc(generalQuotes.quoteNumber));
        
        let sequentialNumber = 1;
        if (existingQuotes.length > 0) {
          const numbers = existingQuotes
            .map(q => {
              const match = q.quoteNumber?.match(/^GEN\/(\d+)\//);
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter(n => n > 0);
            
          if (numbers.length > 0) {
            sequentialNumber = Math.max(...numbers) + 1;
          }
        }
        
        quoteNumber = `GEN/${String(sequentialNumber).padStart(3, '0')}/${dateStr}`;
        
        // Check if this number already exists
        const existingQuote = await db.select({ id: generalQuotes.id })
          .from(generalQuotes)
          .where(eq(generalQuotes.quoteNumber, quoteNumber))
          .limit(1);
          
        if (existingQuote.length === 0) {
          break; // Found a unique number
        }
        
        attempts++;
        // If we still have conflicts, add current timestamp to make it unique
        if (attempts === maxAttempts) {
          const timestamp = Date.now().toString().slice(-4);
          quoteNumber = `GEN/${String(sequentialNumber + parseInt(timestamp.slice(-2))).padStart(3, '0')}/${dateStr}`;
        }
      }

      // Create quote
      const newQuote = await db.insert(generalQuotes).values({
        ...quoteData,
        quoteNumber,
        clientId: client[0].id,
        createdBy: user?.id,
      }).returning();

      // Create quote items (only fields that exist in general_quote_items table)
      const quoteItemsData = items.map((item: any) => ({
        quoteId: newQuote[0].id,
        equipmentId: item.equipmentId,
        quantity: item.quantity,
        rentalPeriodDays: item.rentalPeriodDays,
        pricePerDay: item.pricePerDay,
        discountPercent: item.discountPercent || "0",
        totalPrice: item.totalPrice,
        notes: item.notes || null,
      }));

      await db.insert(generalQuoteItems).values(quoteItemsData);

      res.status(201).json(newQuote[0]);
    } catch (error) {
      console.error("Error creating general quote:", error);
      res.status(500).json({ message: "Failed to create general quote" });
    }
  });

  // Get single general quote
  app.get('/api/general-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee' && user?.role !== 'general_manager') {
        return res.status(403).json({ message: "Access denied. General equipment access required." });
      }

      const quoteId = parseInt(req.params.id);

      const quoteResult = await db.select({
        id: generalQuotes.id,
        quoteNumber: generalQuotes.quoteNumber,
        clientId: generalQuotes.clientId,
        totalNet: generalQuotes.totalNet,
        totalGross: generalQuotes.totalGross,
        status: generalQuotes.status,
        notes: generalQuotes.notes,
        createdAt: generalQuotes.createdAt,
        updatedAt: generalQuotes.updatedAt,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactPerson: clients.contactPerson,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
          nip: clients.nip,
        }
      })
      .from(generalQuotes)
      .innerJoin(clients, eq(generalQuotes.clientId, clients.id))
      .where(eq(generalQuotes.id, quoteId))
      .limit(1);

      if (quoteResult.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Get quote items (only existing fields)
      const items = await db.select({
        id: generalQuoteItems.id,
        quantity: generalQuoteItems.quantity,
        rentalPeriodDays: generalQuoteItems.rentalPeriodDays,
        pricePerDay: generalQuoteItems.pricePerDay,
        discountPercent: generalQuoteItems.discountPercent,
        totalPrice: generalQuoteItems.totalPrice,
        notes: generalQuoteItems.notes,
        equipment: {
          id: generalEquipment.id,
          name: generalEquipment.name,
          model: generalEquipment.model,
          power: generalEquipment.power,
        }
      })
      .from(generalQuoteItems)
      .innerJoin(generalEquipment, eq(generalQuoteItems.equipmentId, generalEquipment.id))
      .where(eq(generalQuoteItems.quoteId, quoteId));

      const quote = { ...quoteResult[0], items };
      res.json(quote);
    } catch (error) {
      console.error("Error fetching general quote:", error);
      res.status(500).json({ message: "Failed to fetch general quote" });
    }
  });

  // Update general quote
  app.put('/api/general-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      const quoteId = parseInt(req.params.id);
      const { items, notes, totalNet, totalGross } = req.body;

      // Update quote
      await db.update(generalQuotes)
        .set({
          notes,
          totalNet,
          totalGross,
          updatedAt: new Date(),
        })
        .where(eq(generalQuotes.id, quoteId));

      // Delete existing items
      await db.delete(generalQuoteItems)
        .where(eq(generalQuoteItems.quoteId, quoteId));

      // Insert new items (only fields that exist in general_quote_items table)
      if (items && items.length > 0) {
        const quoteItemsData = items.map((item: any) => ({
          quoteId,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          rentalPeriodDays: item.rentalPeriodDays,
          pricePerDay: item.pricePerDay,
          discountPercent: item.discountPercent || "0",
          totalPrice: item.totalPrice,
          notes: item.notes || null,
        }));

        await db.insert(generalQuoteItems).values(quoteItemsData);
      }

      res.json({ message: "Quote updated successfully" });
    } catch (error) {
      console.error("Error updating general quote:", error);
      res.status(500).json({ message: "Failed to update general quote" });
    }
  });

  // Delete general quote
  app.delete('/api/general-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee' && user?.role !== 'general_manager') {
        return res.status(403).json({ message: "Access denied. General equipment access required." });
      }

      const quoteId = parseInt(req.params.id);

      // Delete quote items first
      await db.delete(generalQuoteItems)
        .where(eq(generalQuoteItems.quoteId, quoteId));

      // Delete quote
      await db.delete(generalQuotes)
        .where(eq(generalQuotes.id, quoteId));

      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting general quote:", error);
      res.status(500).json({ message: "Failed to delete general quote" });
    }
  });

  // Copy general quote
  app.post('/api/general-quotes/:id/copy', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee' && user?.role !== 'general_manager') {
        return res.status(403).json({ message: "Access denied. General equipment access required." });
      }

      const quoteId = parseInt(req.params.id);

      // Get original quote
      const originalQuote = await db.select({
        id: generalQuotes.id,
        clientId: generalQuotes.clientId,
        status: generalQuotes.status,
        totalNet: generalQuotes.totalNet,
        totalGross: generalQuotes.totalGross,
        notes: generalQuotes.notes,
      })
      .from(generalQuotes)
      .where(eq(generalQuotes.id, quoteId))
      .limit(1);

      if (originalQuote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Get quote items
      const originalItems = await db.select()
        .from(generalQuoteItems)
        .where(eq(generalQuoteItems.quoteId, quoteId));

      // Generate new quote number
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
      
      const existingQuotes = await db.select({ quoteNumber: generalQuotes.quoteNumber })
        .from(generalQuotes)
        .where(like(generalQuotes.quoteNumber, `%/${dateStr}`))
        .orderBy(desc(generalQuotes.quoteNumber));
      
      let sequentialNumber = 1;
      if (existingQuotes.length > 0) {
        const highestNumber = Math.max(
          ...existingQuotes.map(q => {
            const match = q.quoteNumber?.match(/^(\d+)\//);  
            return match ? parseInt(match[1], 10) : 0;
          })
        );
        sequentialNumber = highestNumber + 1;
      }
      
      const newQuoteNumber = `${String(sequentialNumber).padStart(2, '0')}/${dateStr}`;

      // Create new quote
      const newQuote = await db.insert(generalQuotes).values({
        quoteNumber: newQuoteNumber,
        clientId: originalQuote[0].clientId,
        createdBy: user?.id,
        status: 'draft',
        totalNet: originalQuote[0].totalNet,
        totalGross: originalQuote[0].totalGross,
        notes: originalQuote[0].notes,
      }).returning({ id: generalQuotes.id });

      const newQuoteId = newQuote[0].id;

      // Copy all quote items (only fields that exist in general_quote_items table)
      if (originalItems.length > 0) {
        const itemsData = originalItems.map(item => ({
          quoteId: newQuoteId,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          rentalPeriodDays: item.rentalPeriodDays,
          pricePerDay: item.pricePerDay,
          discountPercent: item.discountPercent,
          totalPrice: item.totalPrice,
          notes: item.notes,
        }));

        await db.insert(generalQuoteItems).values(itemsData);
      }

      res.json({ 
        message: "Quote copied successfully",
        newQuoteId: newQuoteId,
        newQuoteNumber: newQuoteNumber
      });
    } catch (error) {
      console.error("Error copying general quote:", error);
      res.status(500).json({ message: "Failed to copy general quote" });
    }
  });

  // Print general quote
  app.get('/api/general-quotes/:id/print', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'employee') {
        return res.status(403).json({ message: "Access denied. Admin or employee role required." });
      }

      const quoteId = parseInt(req.params.id);

      // Get quote with items (same logic as single quote endpoint)
      const quoteResult = await db.select({
        id: generalQuotes.id,
        quoteNumber: generalQuotes.quoteNumber,
        clientId: generalQuotes.clientId,
        totalNet: generalQuotes.totalNet,
        totalGross: generalQuotes.totalGross,
        status: generalQuotes.status,
        notes: generalQuotes.notes,
        createdAt: generalQuotes.createdAt,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactPerson: clients.contactPerson,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
          nip: clients.nip,
        }
      })
      .from(generalQuotes)
      .innerJoin(clients, eq(generalQuotes.clientId, clients.id))
      .where(eq(generalQuotes.id, quoteId))
      .limit(1);

      if (quoteResult.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const items = await db.select({
        id: generalQuoteItems.id,
        quantity: generalQuoteItems.quantity,
        rentalPeriodDays: generalQuoteItems.rentalPeriodDays,
        pricePerDay: generalQuoteItems.pricePerDay,
        totalPrice: generalQuoteItems.totalPrice,
        notes: generalQuoteItems.notes,
        equipment: {
          name: generalEquipment.name,
          model: generalEquipment.model,
          power: generalEquipment.power,
        }
      })
      .from(generalQuoteItems)
      .innerJoin(generalEquipment, eq(generalQuoteItems.equipmentId, generalEquipment.id))
      .where(eq(generalQuoteItems.quoteId, quoteId));

      const quote = { ...quoteResult[0], items };

      // Generate professional HTML for printing (matching main rental format)
      const html = generateGeneralQuoteHTML(quote);

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error("Error generating print version:", error);
      res.status(500).json({ message: "Failed to generate print version" });
    }
  });

  // ===============================================
  // PUBLIC RENTAL DEPARTMENT API ENDPOINTS
  // ===============================================

  // Public equipment categories endpoints  
  app.get('/api/public-equipment-categories', async (req, res) => {
    try {
      const categories = await db.select().from(publicEquipmentCategories).orderBy(publicEquipmentCategories.name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching public equipment categories:", error);
      res.status(500).json({ message: "Failed to fetch public equipment categories" });
    }
  });

  app.post('/api/public-equipment-categories', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const categoryData = req.body;
      const newCategory = await db.insert(publicEquipmentCategories).values(categoryData).returning();
      res.json(newCategory[0]);
    } catch (error) {
      console.error("Error creating public equipment category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.delete('/api/public-equipment-categories/:id', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);

      // Check if category has equipment
      const equipmentInCategory = await db.select().from(publicEquipment).where(eq(publicEquipment.categoryId, categoryId));
      
      if (equipmentInCategory.length > 0) {
        return res.status(400).json({ 
          message: `Nie można usunąć kategorii - zawiera ${equipmentInCategory.length} pozycji sprzętu`
        });
      }

      await db.delete(publicEquipmentCategories).where(eq(publicEquipmentCategories.id, categoryId));
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting public equipment category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Public equipment endpoints
  app.get('/api/public-equipment', async (req, res) => {
    try {
      const equipment = await db.select({
        id: publicEquipment.id,
        name: publicEquipment.name,
        categoryId: publicEquipment.categoryId,
        description: publicEquipment.description,
        model: publicEquipment.model,
        power: publicEquipment.power,
        fuelConsumption75: publicEquipment.fuelConsumption75,
        dimensions: publicEquipment.dimensions,
        weight: publicEquipment.weight,
        engine: publicEquipment.engine,
        alternator: publicEquipment.alternator,
        fuelTankCapacity: publicEquipment.fuelTankCapacity,
        imageUrl: publicEquipment.imageUrl,
        quantity: publicEquipment.quantity,
        availableQuantity: publicEquipment.availableQuantity,
        isActive: publicEquipment.isActive,
        createdAt: publicEquipment.createdAt,
        updatedAt: publicEquipment.updatedAt,
        category: {
          id: publicEquipmentCategories.id,
          name: publicEquipmentCategories.name,
        }
      })
      .from(publicEquipment)
      .leftJoin(publicEquipmentCategories, eq(publicEquipment.categoryId, publicEquipmentCategories.id))
      .orderBy(publicEquipment.name);

      // Load pricing and additional equipment for each item
      const equipmentWithRelations = await Promise.all(
        equipment.map(async (item) => {
          const [pricing, additionalEquipment] = await Promise.all([
            db.select().from(publicEquipmentPricing).where(eq(publicEquipmentPricing.equipmentId, item.id)),
            db.select().from(publicEquipmentAdditional).where(eq(publicEquipmentAdditional.equipmentId, item.id))
          ]);
          
          return {
            ...item,
            pricing,
            additionalEquipment
          };
        })
      );
      
      res.json(equipmentWithRelations);
    } catch (error) {
      console.error("Error fetching public equipment:", error);
      res.status(500).json({ message: "Failed to fetch public equipment" });
    }
  });

  app.post('/api/public-equipment', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const equipmentData = req.body;
      console.log("Raw equipment data received:", equipmentData);
      
      // Clean up numeric fields - convert empty strings to null
      const cleanedData = {
        ...equipmentData,
        fuelConsumption75: equipmentData.fuelConsumption75 === "" ? null : equipmentData.fuelConsumption75,
        fuelTankCapacity: equipmentData.fuelTankCapacity === "" ? null : equipmentData.fuelTankCapacity,
        quantity: Number(equipmentData.quantity) || 0,
        availableQuantity: Number(equipmentData.availableQuantity) || 0,
      };
      
      console.log("Cleaned equipment data:", cleanedData);
      
      const newEquipment = await db.insert(publicEquipment).values(cleanedData).returning();
      res.status(201).json(newEquipment[0]);
    } catch (error) {
      console.error("Error creating public equipment:", error);
      res.status(500).json({ message: "Failed to create public equipment" });
    }
  });

  app.put('/api/public-equipment/:id', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const equipmentData = req.body;
      
      const updatedEquipment = await db.update(publicEquipment)
        .set(equipmentData)
        .where(eq(publicEquipment.id, equipmentId))
        .returning();
        
      if (updatedEquipment.length === 0) {
        return res.status(404).json({ message: "Equipment not found" });
      }
      
      res.json(updatedEquipment[0]);
    } catch (error) {
      console.error("Error updating public equipment:", error);
      res.status(500).json({ message: "Failed to update public equipment" });
    }
  });

  app.delete('/api/public-equipment/:id', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      console.log('Attempting to delete public equipment with ID:', equipmentId);
      
      // Check if equipment exists in any quotes
      const quoteItems = await db.select().from(publicQuoteItems).where(eq(publicQuoteItems.equipmentId, equipmentId));
      if (quoteItems.length > 0) {
        return res.status(400).json({ 
          message: "Nie można usunąć sprzętu - jest używany w wycenach. Usuń najpierw powiązane wyceny." 
        });
      }
      
      // Delete related data first using raw SQL to avoid schema issues
      console.log('Deleting related data...');
      await db.execute(sql`DELETE FROM public_equipment_pricing WHERE equipment_id = ${equipmentId}`);
      await db.execute(sql`DELETE FROM public_equipment_additional WHERE equipment_id = ${equipmentId}`);
      await db.execute(sql`DELETE FROM public_equipment_service_costs WHERE equipment_id = ${equipmentId}`);
      await db.execute(sql`DELETE FROM public_equipment_service_items WHERE equipment_id = ${equipmentId}`);
      
      // Delete the equipment
      console.log('Deleting equipment...');
      await db.execute(sql`DELETE FROM public_equipment WHERE id = ${equipmentId}`);
      
      console.log('Public equipment deleted successfully');
      res.json({ message: "Equipment deleted successfully" });
    } catch (error) {
      console.error("Error deleting public equipment:", error);
      res.status(500).json({ message: "Failed to delete public equipment" });
    }
  });

  // Public equipment pricing endpoints
  app.get('/api/public-equipment/:id/pricing', async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const pricing = await db.select().from(publicEquipmentPricing).where(eq(publicEquipmentPricing.equipmentId, equipmentId));
      res.json(pricing);
    } catch (error) {
      console.error("Error fetching public equipment pricing:", error);
      res.status(500).json({ message: "Failed to fetch pricing" });
    }
  });

  app.post('/api/public-equipment/:id/pricing', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const pricingData = req.body.map((tier: any) => ({
        ...tier,
        equipmentId,
      }));

      // Delete existing pricing
      await db.delete(publicEquipmentPricing).where(eq(publicEquipmentPricing.equipmentId, equipmentId));
      
      // Insert new pricing
      if (pricingData.length > 0) {
        await db.insert(publicEquipmentPricing).values(pricingData);
      }

      res.json({ message: "Pricing updated successfully" });
    } catch (error) {
      console.error("Error updating public equipment pricing:", error);
      res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  // Additional equipment endpoints
  app.get('/api/public-equipment/:id/additional', async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const additional = await db.select().from(publicEquipmentAdditional).where(eq(publicEquipmentAdditional.equipmentId, equipmentId));
      res.json(additional);
    } catch (error) {
      console.error("Error fetching public equipment additional:", error);
      res.status(500).json({ message: "Failed to fetch additional equipment" });
    }
  });

  app.post('/api/public-equipment-additional', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const additionalData = req.body;
      const newAdditional = await db.insert(publicEquipmentAdditional).values(additionalData).returning();
      res.json(newAdditional[0]);
    } catch (error) {
      console.error("Error creating public equipment additional:", error);
      res.status(500).json({ message: "Failed to create additional equipment" });
    }
  });

  app.put('/api/public-equipment-additional/:id', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const additionalData = req.body;
      
      const updated = await db.update(publicEquipmentAdditional)
        .set(additionalData)
        .where(eq(publicEquipmentAdditional.id, id))
        .returning();
        
      if (updated.length === 0) {
        return res.status(404).json({ message: "Additional equipment not found" });
      }
      
      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating public equipment additional:", error);
      res.status(500).json({ message: "Failed to update additional equipment" });
    }
  });

  app.delete('/api/public-equipment-additional/:id', isAuthenticated, requirePublicManager, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(publicEquipmentAdditional).where(eq(publicEquipmentAdditional.id, id));
      res.json({ message: "Additional equipment deleted successfully" });
    } catch (error) {
      console.error("Error deleting public equipment additional:", error);
      res.status(500).json({ message: "Failed to delete additional equipment" });
    }
  });

  // Delete public quote
  app.delete('/api/public-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const quoteId = parseInt(req.params.id);
      
      // First delete quote items
      await db.delete(publicQuoteItems).where(eq(publicQuoteItems.quoteId, quoteId));
      
      // Then delete the quote
      const deletedQuote = await db.delete(publicQuotes)
        .where(eq(publicQuotes.id, quoteId))
        .returning();

      if (deletedQuote.length === 0) {
        return res.status(404).json({ message: "Public quote not found" });
      }

      res.json({ message: "Public quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting public quote:", error);
      res.status(500).json({ message: "Failed to delete public quote" });
    }
  });

  app.get('/api/public-quotes', isAuthenticated, async (req, res) => {
    try {
      const quotes = await db.select({
        id: publicQuotes.id,
        quoteNumber: publicQuotes.quoteNumber,
        clientId: publicQuotes.clientId,
        status: publicQuotes.status,
        totalNet: publicQuotes.totalNet,
        totalGross: publicQuotes.totalGross,
        createdAt: publicQuotes.createdAt,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactPerson: clients.contactPerson,
          email: clients.email,
          phone: clients.phone,
        }
      })
      .from(publicQuotes)
      .leftJoin(clients, eq(publicQuotes.clientId, clients.id))
      .orderBy(desc(publicQuotes.createdAt));

      res.json(quotes);
    } catch (error) {
      console.error("Error fetching public quotes:", error);
      res.status(500).json({ message: "Failed to fetch public quotes" });
    }
  });

  app.post('/api/public-quotes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quoteData = req.body;

      // Generate quote number
      const lastQuote = await db.select({ quoteNumber: publicQuotes.quoteNumber })
        .from(publicQuotes)
        .where(like(publicQuotes.quoteNumber, 'PUB/%'))
        .orderBy(desc(publicQuotes.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (lastQuote.length > 0) {
        const match = lastQuote[0].quoteNumber.match(/PUB\/(\d+)\//);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const currentDate = new Date();
      const monthStr = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const yearStr = currentDate.getFullYear().toString();
      const quoteNumber = `PUB/${nextNumber.toString().padStart(3, '0')}/${monthStr}.${yearStr}`;

      // Create or find client
      let clientId = quoteData.clientId;
      
      // If clientName is provided instead of clientId, create or find client
      if (!clientId && quoteData.clientName) {
        // Try to find existing client
        const existingClient = await db.select()
          .from(clients)
          .where(eq(clients.companyName, quoteData.clientName))
          .limit(1);

        if (existingClient.length > 0) {
          clientId = existingClient[0].id;
        } else {
          // Create new client with data from form
          const newClient = await db.insert(clients).values({
            companyName: quoteData.clientName,
            contactPerson: quoteData.contactPerson || "",
            email: quoteData.email || "",
            phone: quoteData.phone || "",
            address: quoteData.address || "",
            city: quoteData.city || "",
            postalCode: quoteData.postalCode || "",
            nip: "",
          }).returning();
          clientId = newClient[0].id;
        }
      }

      // Legacy support for client object
      if (!clientId && quoteData.client) {
        const newClient = await db.insert(clients).values(quoteData.client).returning();
        clientId = newClient[0].id;
      }

      if (!clientId) {
        return res.status(400).json({ message: "Client ID or clientName is required" });
      }

      // Create quote
      const newQuote = await db.insert(publicQuotes).values({
        quoteNumber,
        clientId,
        createdById: userId,
        status: quoteData.status || 'draft',
        totalNet: quoteData.totalNet,
        vatRate: quoteData.vatRate || "23",
        totalGross: quoteData.totalGross,
        notes: quoteData.notes,
      }).returning();

      // Save quote items if provided
      if (quoteData.items && quoteData.items.length > 0) {
        // Use raw SQL to avoid schema mismatch issues
        for (const item of quoteData.items) {
          await db.execute(sql`
            INSERT INTO public_quote_items (
              quote_id, equipment_id, quantity, rental_period_days, 
              price_per_day, discount_percent, total_price, 
              additional_cost, accessories_cost, selected_additional, notes
            ) VALUES (
              ${newQuote[0].id}, ${item.equipmentId}, ${item.quantity}, ${item.rentalPeriodDays},
              ${item.pricePerDay}, ${item.discountPercent || "0"}, ${item.totalPrice},
              ${item.additionalCost || "0"}, ${item.accessoriesCost || "0"}, 
              ${JSON.stringify(item.selectedAdditional || [])}, ${item.notes || ""}
            )
          `);
        }
      }

      res.json(newQuote[0]);
    } catch (error) {
      console.error("Error creating public quote:", error);
      res.status(500).json({ message: "Failed to create public quote" });
    }
  });

  // Get single public quote
  app.get('/api/public-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'public_manager') {
        return res.status(403).json({ message: "Access denied. Public equipment access required." });
      }

      const quoteId = parseInt(req.params.id);

      // Get quote with client data
      const quoteResult = await db.select({
        id: publicQuotes.id,
        quoteNumber: publicQuotes.quoteNumber,
        clientId: publicQuotes.clientId,
        createdById: publicQuotes.createdById,
        totalNet: publicQuotes.totalNet,
        totalGross: publicQuotes.totalGross,
        vatRate: publicQuotes.vatRate,
        status: publicQuotes.status,
        notes: publicQuotes.notes,
        createdAt: publicQuotes.createdAt,
        client: {
          id: clients.id,
          companyName: clients.companyName,
          contactPerson: clients.contactPerson,
          email: clients.email,
          phone: clients.phone,
          address: clients.address,
          nip: clients.nip,
        }
      })
      .from(publicQuotes)
      .innerJoin(clients, eq(publicQuotes.clientId, clients.id))
      .where(eq(publicQuotes.id, quoteId))
      .limit(1);

      if (quoteResult.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Get quote items with equipment details
      const itemsResult = await db.execute(sql`
        SELECT 
          qi.id, qi.quantity, qi.rental_period_days, qi.price_per_day,
          qi.discount_percent, qi.total_price, qi.additional_cost,
          qi.accessories_cost, qi.notes, qi.selected_additional,
          e.id as equipment_id, e.name as equipment_name, e.description as equipment_description, 
          e.model as equipment_model, e.power as equipment_power
        FROM public_quote_items qi
        LEFT JOIN public_equipment e ON qi.equipment_id = e.id
        WHERE qi.quote_id = ${quoteId}
      `);

      // Get additional equipment for each item
      const itemsWithAdditional = await Promise.all((itemsResult.rows || []).map(async (item: any) => {
        let additionalItems = [];
        
        if (item.selected_additional) {
          try {
            const selectedIds = JSON.parse(item.selected_additional);
            if (selectedIds && selectedIds.length > 0) {
              const additionalData = await db.select()
                .from(publicEquipmentAdditional)
                .where(inArray(publicEquipmentAdditional.id, selectedIds));
              additionalItems = additionalData;
            }
          } catch (e) {
            console.error('Error parsing selected_additional:', e);
          }
        }
        
        return {
          id: item.id,
          equipmentId: item.equipment_id,
          quantity: item.quantity,
          rentalPeriodDays: item.rental_period_days,
          pricePerDay: item.price_per_day,
          discountPercent: item.discount_percent,
          totalPrice: item.total_price,
          additionalCost: item.additional_cost,
          accessoriesCost: item.accessories_cost,
          notes: item.notes,
          selectedAdditional: item.selected_additional ? JSON.parse(item.selected_additional) : [],
          equipment: {
            id: item.equipment_id,
            name: item.equipment_name,
            description: item.equipment_description,
            model: item.equipment_model,
            power: item.equipment_power,
          },
          additionalItems
        };
      }));

      const quote = { 
        ...quoteResult[0], 
        items: itemsWithAdditional 
      };

      res.json(quote);
    } catch (error) {
      console.error("Error fetching public quote:", error);
      res.status(500).json({ message: "Failed to fetch public quote" });
    }
  });

  // Update public quote
  app.put('/api/public-quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'public_manager') {
        return res.status(403).json({ message: "Access denied. Public equipment access required." });
      }

      const quoteId = parseInt(req.params.id);
      const { client: clientData, items, ...quoteData } = req.body;

      // Update client if provided
      if (clientData && quoteData.clientId) {
        await db.update(clients)
          .set({
            companyName: clientData.companyName,
            contactPerson: clientData.contactPerson,
            email: clientData.email,
            phone: clientData.phone,
            address: clientData.address,
            nip: clientData.nip,
          })
          .where(eq(clients.id, quoteData.clientId));
      }

      // Update quote
      await db.update(publicQuotes)
        .set({
          status: quoteData.status,
          totalNet: quoteData.totalNet,
          totalGross: quoteData.totalGross,
          notes: quoteData.notes,
        })
        .where(eq(publicQuotes.id, quoteId));

      // Update quote items - delete old ones and insert new ones
      await db.execute(sql`DELETE FROM public_quote_items WHERE quote_id = ${quoteId}`);

      if (items && items.length > 0) {
        for (const item of items) {
          await db.execute(sql`
            INSERT INTO public_quote_items (
              quote_id, equipment_id, quantity, rental_period_days, 
              price_per_day, discount_percent, total_price, 
              additional_cost, accessories_cost, selected_additional, notes
            ) VALUES (
              ${quoteId}, ${item.equipmentId}, ${item.quantity}, ${item.rentalPeriodDays},
              ${item.pricePerDay}, ${item.discountPercent || "0"}, ${item.totalPrice},
              ${item.additionalCost || "0"}, ${item.accessoriesCost || "0"}, 
              ${JSON.stringify(item.selectedAdditional || [])}, ${item.notes || ""}
            )
          `);
        }
      }

      res.json({ message: "Quote updated successfully" });
    } catch (error) {
      console.error("Error updating public quote:", error);
      res.status(500).json({ message: "Failed to update public quote" });
    }
  });

  // Copy public quote
  app.post('/api/public-quotes/:id/copy', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'public_manager') {
        return res.status(403).json({ message: "Access denied. Public equipment access required." });
      }

      const quoteId = parseInt(req.params.id);

      // Get original quote
      const originalQuote = await db.select({
        id: publicQuotes.id,
        clientId: publicQuotes.clientId,
        status: publicQuotes.status,
        totalNet: publicQuotes.totalNet,
        totalGross: publicQuotes.totalGross,
        vatRate: publicQuotes.vatRate,
        notes: publicQuotes.notes,
      })
      .from(publicQuotes)
      .where(eq(publicQuotes.id, quoteId))
      .limit(1);

      if (originalQuote.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Generate new quote number
      const currentDate = new Date();
      const monthStr = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const yearStr = currentDate.getFullYear().toString();

      const lastQuote = await db.select({ quoteNumber: publicQuotes.quoteNumber })
        .from(publicQuotes)
        .where(like(publicQuotes.quoteNumber, 'PUB/%'))
        .orderBy(desc(publicQuotes.createdAt))
        .limit(1);

      let nextNumber = 1;
      if (lastQuote.length > 0) {
        const match = lastQuote[0].quoteNumber.match(/PUB\/(\d+)\//);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const quoteNumber = `PUB/${nextNumber.toString().padStart(3, '0')}/${monthStr}.${yearStr}`;

      // Create new quote
      const newQuote = await db.insert(publicQuotes).values({
        quoteNumber,
        clientId: originalQuote[0].clientId,
        createdById: user?.id,
        status: 'draft',
        totalNet: originalQuote[0].totalNet,
        totalGross: originalQuote[0].totalGross,
        vatRate: originalQuote[0].vatRate,
        notes: originalQuote[0].notes,
      }).returning();

      // Get original quote items and copy them
      const originalItems = await db.execute(sql`
        SELECT * FROM public_quote_items WHERE quote_id = ${quoteId}
      `);

      if (originalItems.rows && originalItems.rows.length > 0) {
        for (const item of originalItems.rows as any[]) {
          await db.execute(sql`
            INSERT INTO public_quote_items (
              quote_id, equipment_id, quantity, rental_period_days, 
              price_per_day, discount_percent, total_price, 
              additional_cost, accessories_cost, selected_additional, notes
            ) VALUES (
              ${newQuote[0].id}, ${item.equipment_id}, ${item.quantity}, ${item.rental_period_days},
              ${item.price_per_day}, ${item.discount_percent}, ${item.total_price},
              ${item.additional_cost}, ${item.accessories_cost}, 
              ${item.selected_additional}, ${item.notes}
            )
          `);
        }
      }

      res.json(newQuote[0]);
    } catch (error) {
      console.error("Error copying public quote:", error);
      res.status(500).json({ message: "Failed to copy public quote" });
    }
  });

  // Print public quote
  app.get('/api/public-quotes/:id/print', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get quote data
      const quoteData = await db.select()
        .from(publicQuotes)
        .where(eq(publicQuotes.id, id))
        .limit(1);
      
      if (quoteData.length === 0) {
        return res.status(404).json({ message: "Quote not found" });
      }

      const quote = quoteData[0];

      // Get client data separately
      let client = null;
      if (quote.clientId) {
        const clientData = await db.select()
          .from(clients)
          .where(eq(clients.id, quote.clientId))
          .limit(1);
        
        if (clientData.length > 0) {
          client = clientData[0];
          console.log("DEBUG Public print - Client data:", {
            id: client.id,
            companyName: client.companyName,
            phone: client.phone,
            email: client.email
          });
        }
      }

      // Get quote items with equipment details - use raw SQL to avoid schema mismatch
      const quoteItemsData = await db.execute(sql`
        SELECT 
          qi.id, qi.quantity, qi.rental_period_days, qi.price_per_day,
          qi.discount_percent, qi.total_price, qi.additional_cost,
          qi.accessories_cost, qi.notes, qi.selected_additional,
          e.name as equipment_name, e.description as equipment_description, e.model as equipment_model
        FROM public_quote_items qi
        LEFT JOIN public_equipment e ON qi.equipment_id = e.id
        WHERE qi.quote_id = ${id}
      `);

      // Extract rows from SQL result and get additional equipment details
      const quoteItemsWithAdditional = await Promise.all((quoteItemsData.rows || []).map(async (item: any) => {
        let additionalItems = [];
        
        if (item.selected_additional) {
          try {
            const selectedIds = JSON.parse(item.selected_additional);
            if (selectedIds && selectedIds.length > 0) {
              const additionalData = await db.select()
                .from(publicEquipmentAdditional)
                .where(inArray(publicEquipmentAdditional.id, selectedIds));
              additionalItems = additionalData;
            }
          } catch (e) {
            console.error('Error parsing selected_additional:', e);
          }
        }
        
        return {
          ...item,
          additionalItems
        };
      }));

      // Generate unified HTML for print
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Wycena ${quote.quoteNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
            .company-logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .quote-title { font-size: 20px; opacity: 0.9; }
            .quote-number { background: white; color: #1e40af; padding: 10px 20px; border-radius: 25px; display: inline-block; margin-top: 15px; font-weight: bold; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; color: #1e40af; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 2px solid #e5e7eb; }
            .client-info { background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; }
            .client-row { display: flex; margin-bottom: 8px; }
            .client-label { font-weight: bold; min-width: 120px; color: #059669; }
            .client-value { color: #374151; }
            .equipment-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .equipment-table th, .equipment-table td { border: 1px solid #d1d5db; padding: 12px; text-align: left; }
            .equipment-table th { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; font-weight: bold; }
            .equipment-table tr:nth-child(even) { background: #f8fafc; }
            .equipment-table tr:hover { background: #e0f2fe; }
            .summary { background: #f8fafc; padding: 20px; border-radius: 8px; margin-top: 20px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; padding: 8px 0; }
            .summary-label { font-weight: bold; }
            .summary-value { color: #1e40af; font-weight: bold; }
            .total-row { background: #dbeafe; font-weight: bold; border-top: 2px solid #3b82f6; padding-top: 15px; margin-top: 15px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
            .print-button { position: fixed; top: 20px; right: 20px; z-index: 1000; background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
            .print-button:hover { background: #0052a3; }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Drukuj</button>
          <div class="header">
            <div class="company-logo">PPP :: Program</div>
            <div class="quote-title">Wycena Publiczna</div>
            <div class="quote-number">Numer: ${quote.quoteNumber}</div>
          </div>

          <div class="section">
            <div class="section-title">Informacje o kliencie</div>
            <div class="client-info">
              <div class="client-row">
                <span class="client-label">Firma:</span>
                <span class="client-value">${client?.companyName || 'Brak danych'}</span>
              </div>
              <div class="client-row">
                <span class="client-label">Osoba kontaktowa:</span>
                <span class="client-value">${client?.contactPerson || 'Brak danych'}</span>
              </div>
              <div class="client-row">
                <span class="client-label">Email:</span>
                <span class="client-value">${client?.email || 'Brak danych'}</span>
              </div>
              <div class="client-row">
                <span class="client-label">Telefon:</span>
                <span class="client-value">${client?.phone || 'Brak danych'}</span>
              </div>
              <div class="client-row">
                <span class="client-label">Adres:</span>
                <span class="client-value">${client?.address || 'Brak danych'}</span>
              </div>
              <div class="client-row">
                <span class="client-label">NIP:</span>
                <span class="client-value">${client?.nip || 'Brak danych'}</span>
              </div>
            </div>
          </div>

          ${quoteItemsWithAdditional.length > 0 ? `
          <div class="section">
            <div class="section-title">Pozycje wyceny</div>
            <table class="equipment-table">
              <thead>
                <tr>
                  <th>Sprzęt</th>
                  <th>Ilość</th>
                  <th>Okres (dni)</th>
                  <th>Cena/dzień</th>
                  <th>Rabat</th>
                  <th>Dodatkowe wyposażenie</th>
                  <th>Suma</th>
                </tr>
              </thead>
              <tbody>
                ${quoteItemsWithAdditional.map(item => `
                <tr>
                  <td>
                    <strong>${item.equipment_name || 'Nieznany sprzęt'}</strong>
                    ${item.equipment_description ? `<br><small>${item.equipment_description}</small>` : ''}
                    ${item.equipment_model ? `<br><small>Model: ${item.equipment_model}</small>` : ''}
                    ${item.notes ? `<br><small style="color: #666;">${item.notes}</small>` : ''}
                  </td>
                  <td>${item.quantity || 0}</td>
                  <td>${item.rental_period_days || 0}</td>
                  <td>${parseFloat(item.price_per_day || '0').toFixed(2)} PLN</td>
                  <td>${parseFloat(item.discount_percent || '0').toFixed(0)}%</td>
                  <td>
                    ${item.additionalItems && item.additionalItems.length > 0 ? 
                      item.additionalItems.map(add => `${add.name} (+${parseFloat(add.price).toFixed(2)} PLN)`).join('<br>') 
                      : 'Brak'}
                  </td>
                  <td><strong>${parseFloat(item.total_price || '0').toFixed(2)} PLN</strong></td>
                </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Podsumowanie finansowe</div>
            <div class="summary">
              <div class="summary-row">
                <span class="summary-label">Wartość netto:</span>
                <span class="summary-value">${parseFloat(quote.totalNet).toFixed(2)} PLN</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">VAT (${quote.vatRate}%):</span>
                <span class="summary-value">${(parseFloat(quote.totalGross) - parseFloat(quote.totalNet)).toFixed(2)} PLN</span>
              </div>
              <div class="summary-row total-row">
                <span class="summary-label">Wartość brutto:</span>
                <span class="summary-value">${parseFloat(quote.totalGross).toFixed(2)} PLN</span>
              </div>
            </div>
          </div>

          ${quote.notes ? `
          <div class="section">
            <div class="section-title">Uwagi</div>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #6b7280;">
              ${quote.notes}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>Wycena wygenerowana: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}</p>
            <p>PPP :: Program | Status: ${quote.status}</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(printHTML);

    } catch (error) {
      console.error("Error generating public quote print:", error);
      res.status(500).json({ message: "Failed to generate print view" });
    }
  });

  // Object Storage routes - accessible for both employees and public needs assessment  
  app.post("/api/objects/upload", async (req: any, res) => {
    try {
      console.log("Upload URL request received");
      const objectStorageService = new ObjectStorageService();
      console.log("ObjectStorageService created");
      
      const uploadURL = await objectStorageService.getGeneralUploadURL();
      console.log("Upload URL generated:", uploadURL);
      
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: "Failed to get upload URL", details: error.message });
    }
  });

  // Specific endpoint for uploaded files (equipment images, needs assessment, etc.)
  app.get("/objects/uploads/:fileId", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      // Construct the private object path
      const privateDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${privateDir}/uploads/${req.params.fileId}`;
      
      // Parse the path to get bucket and object name
      const pathParts = fullPath.startsWith("/") ? fullPath.split("/") : `/${fullPath}`.split("/");
      const bucketName = pathParts[1];
      const objectName = pathParts.slice(2).join("/");
      
      const bucket = objectStorageClient.bucket(bucketName);
      const objectFile = bucket.file(objectName);
      
      const [exists] = await objectFile.exists();
      if (!exists) {
        return res.sendStatus(404);
      }

      // For now, allow authenticated users to access uploaded files
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving uploaded file:", error);
      return res.sendStatus(500);
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: "read" as any,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  const httpServer = createServer(app);
  // Public equipment service costs endpoints
  app.get("/api/public-equipment/:id/service-costs", async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const serviceCosts = await db.select().from(publicEquipmentServiceCosts).where(eq(publicEquipmentServiceCosts.equipmentId, equipmentId)).limit(1);
      res.json(serviceCosts[0] || null);
    } catch (error) {
      console.error("Error fetching public equipment service costs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/public-equipment/:id/service-costs", async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const { serviceIntervalMonths, serviceIntervalKm, serviceIntervalMotohours, workerHours, workerCostPerHour } = req.body;

      // Check if service costs already exist
      const existing = await db.select().from(publicEquipmentServiceCosts).where(eq(publicEquipmentServiceCosts.equipmentId, equipmentId)).limit(1);

      let result;
      if (existing.length > 0) {
        // Update existing
        result = await db.update(publicEquipmentServiceCosts)
          .set({
            serviceIntervalMonths: serviceIntervalMonths || 6,
            serviceIntervalKm,
            serviceIntervalMotohours,
            workerHours,
            workerCostPerHour,
            updatedAt: new Date(),
          })
          .where(eq(publicEquipmentServiceCosts.equipmentId, equipmentId))
          .returning();
      } else {
        // Create new
        result = await db.insert(publicEquipmentServiceCosts)
          .values({
            equipmentId,
            serviceIntervalMonths: serviceIntervalMonths || 6,
            serviceIntervalKm,
            serviceIntervalMotohours,
            workerHours,
            workerCostPerHour,
          })
          .returning();
      }

      res.json(result[0]);
    } catch (error) {
      console.error("Error saving public equipment service costs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public equipment service items endpoints
  app.get("/api/public-equipment/:id/service-items", async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const serviceItems = await db.select().from(publicEquipmentServiceItems)
        .where(eq(publicEquipmentServiceItems.equipmentId, equipmentId))
        .orderBy(publicEquipmentServiceItems.sortOrder, publicEquipmentServiceItems.itemName);
      res.json(serviceItems);
    } catch (error) {
      console.error("Error fetching public equipment service items:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/public-equipment/:id/service-items", async (req, res) => {
    try {
      const equipmentId = parseInt(req.params.id);
      const { itemName, itemCost, sortOrder } = req.body;

      const result = await db.insert(publicEquipmentServiceItems)
        .values({
          equipmentId,
          itemName,
          itemCost,
          sortOrder: sortOrder || 0,
        })
        .returning();

      res.json(result[0]);
    } catch (error) {
      console.error("Error creating public equipment service item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/public-equipment-service-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { itemName, itemCost } = req.body;

      const result = await db.update(publicEquipmentServiceItems)
        .set({
          itemName,
          itemCost,
          updatedAt: new Date(),
        })
        .where(eq(publicEquipmentServiceItems.id, id))
        .returning();

      res.json(result[0]);
    } catch (error) {
      console.error("Error updating public equipment service item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/public-equipment-service-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(publicEquipmentServiceItems).where(eq(publicEquipmentServiceItems.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting public equipment service item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ================================
  // OBJECT STORAGE ROUTES
  // ================================

  // This endpoint is used to serve public assets.
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get upload URL for shop product images
  app.post("/api/shop-images/upload", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin" && user?.role !== "shop_manager") {
        return res.status(403).json({ message: "Access denied. Admin or shop manager role required." });
      }

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getShopImageUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // ================================
  // SHOP ROUTES
  // ================================

  // Get all shop categories
  app.get("/api/shop-categories", async (req, res) => {
    try {
      const categories = await db.select().from(shopCategories).orderBy(shopCategories.name);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching shop categories:", error);
      res.status(500).json({ message: "Failed to fetch shop categories" });
    }
  });

  // Create shop category (admin/shop_manager only)
  app.post("/api/shop-categories", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin" && user?.role !== "shop_manager") {
        return res.status(403).json({ message: "Access denied. Admin or shop manager role required." });
      }

      const categoryData = insertShopCategorySchema.parse(req.body);
      const result = await db.insert(shopCategories).values(categoryData).returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating shop category:", error);
      res.status(500).json({ message: "Failed to create shop category" });
    }
  });

  // Update shop category (admin/shop_manager only)
  app.put("/api/shop-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin" && user?.role !== "shop_manager") {
        return res.status(403).json({ message: "Access denied. Admin or shop manager role required." });
      }

      const categoryId = parseInt(req.params.id);
      const categoryData = req.body;

      await db.update(shopCategories)
        .set({
          name: categoryData.name,
          description: categoryData.description || null,
          icon: categoryData.icon || "Package",
        })
        .where(eq(shopCategories.id, categoryId));

      res.json({ message: "Shop category updated successfully" });
    } catch (error) {
      console.error("Error updating shop category:", error);
      res.status(500).json({ message: "Failed to update shop category" });
    }
  });

  // Delete shop category (admin/shop_manager only)
  app.delete("/api/shop-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin" && user?.role !== "shop_manager") {
        return res.status(403).json({ message: "Access denied. Admin or shop manager role required." });
      }

      const categoryId = parseInt(req.params.id);
      
      // Check if category has products
      const productsCount = await db.select({ count: sql`count(*)` })
        .from(shopProducts)
        .where(eq(shopProducts.categoryId, categoryId));
      
      if (Number(productsCount[0].count) > 0) {
        return res.status(400).json({ 
          message: "Cannot delete category with products. Please delete or reassign products first." 
        });
      }

      await db.delete(shopCategories).where(eq(shopCategories.id, categoryId));
      res.json({ message: "Shop category deleted successfully" });
    } catch (error) {
      console.error("Error deleting shop category:", error);
      res.status(500).json({ message: "Failed to delete shop category" });
    }
  });

  // Get all shop products with category information
  app.get("/api/shop-products", async (req, res) => {
    try {
      const products = await db.select({
        id: shopProducts.id,
        name: shopProducts.name,
        categoryId: shopProducts.categoryId,
        description: shopProducts.description,
        model: shopProducts.model,
        specifications: shopProducts.specifications,
        imageUrl: shopProducts.imageUrl,
        image1Url: shopProducts.image1Url,
        image2Url: shopProducts.image2Url,
        image3Url: shopProducts.image3Url,
        image4Url: shopProducts.image4Url,
        price: shopProducts.price,
        quantity: shopProducts.quantity,
        phone: shopProducts.phone,
        condition: shopProducts.condition,
        isActive: shopProducts.isActive,
        createdAt: shopProducts.createdAt,
        updatedAt: shopProducts.updatedAt,
        category: {
          id: shopCategories.id,
          name: shopCategories.name,
        }
      })
      .from(shopProducts)
      .leftJoin(shopCategories, eq(shopProducts.categoryId, shopCategories.id))
      .orderBy(shopProducts.name);

      res.json(products);
    } catch (error) {
      console.error("Error fetching shop products:", error);
      res.status(500).json({ message: "Failed to fetch shop products" });
    }
  });

  // Get single shop product
  app.get("/api/shop-products/:id", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const products = await db.select({
        id: shopProducts.id,
        name: shopProducts.name,
        categoryId: shopProducts.categoryId,
        description: shopProducts.description,
        model: shopProducts.model,
        specifications: shopProducts.specifications,
        imageUrl: shopProducts.imageUrl,
        image1Url: shopProducts.image1Url,
        image2Url: shopProducts.image2Url,
        image3Url: shopProducts.image3Url,
        image4Url: shopProducts.image4Url,
        price: shopProducts.price,
        quantity: shopProducts.quantity,
        phone: shopProducts.phone,
        condition: shopProducts.condition,
        isActive: shopProducts.isActive,
        createdAt: shopProducts.createdAt,
        updatedAt: shopProducts.updatedAt,
        category: {
          id: shopCategories.id,
          name: shopCategories.name,
        }
      })
      .from(shopProducts)
      .leftJoin(shopCategories, eq(shopProducts.categoryId, shopCategories.id))
      .where(eq(shopProducts.id, productId))
      .limit(1);

      if (products.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json(products[0]);
    } catch (error) {
      console.error("Error fetching shop product:", error);
      res.status(500).json({ message: "Failed to fetch shop product" });
    }
  });

  // Create shop product (admin/shop_manager only)
  app.post("/api/shop-products", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin" && user?.role !== "shop_manager") {
        return res.status(403).json({ message: "Access denied. Admin or shop manager role required." });
      }

      const productData = insertShopProductSchema.parse(req.body);
      
      // Normalize image URLs using object storage service
      const objectStorageService = new ObjectStorageService();
      const normalizedImageUrl = productData.imageUrl ? objectStorageService.normalizeShopImagePath(productData.imageUrl) : null;
      const normalizedImage1Url = productData.image1Url ? objectStorageService.normalizeShopImagePath(productData.image1Url) : null;
      const normalizedImage2Url = productData.image2Url ? objectStorageService.normalizeShopImagePath(productData.image2Url) : null;
      const normalizedImage3Url = productData.image3Url ? objectStorageService.normalizeShopImagePath(productData.image3Url) : null;
      const normalizedImage4Url = productData.image4Url ? objectStorageService.normalizeShopImagePath(productData.image4Url) : null;

      const result = await db.insert(shopProducts).values({
        ...productData,
        imageUrl: normalizedImageUrl,
        image1Url: normalizedImage1Url,
        image2Url: normalizedImage2Url,
        image3Url: normalizedImage3Url,
        image4Url: normalizedImage4Url,
      }).returning();
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error creating shop product:", error);
      res.status(500).json({ message: "Failed to create shop product" });
    }
  });

  // Update shop product (admin/shop_manager only)
  app.put("/api/shop-products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin" && user?.role !== "shop_manager") {
        return res.status(403).json({ message: "Access denied. Admin or shop manager role required." });
      }

      const productId = parseInt(req.params.id);
      const productData = req.body;

      // Normalize image URLs using object storage service
      const objectStorageService = new ObjectStorageService();
      const normalizedImageUrl = productData.imageUrl ? objectStorageService.normalizeShopImagePath(productData.imageUrl) : null;
      const normalizedImage1Url = productData.image1Url ? objectStorageService.normalizeShopImagePath(productData.image1Url) : null;
      const normalizedImage2Url = productData.image2Url ? objectStorageService.normalizeShopImagePath(productData.image2Url) : null;
      const normalizedImage3Url = productData.image3Url ? objectStorageService.normalizeShopImagePath(productData.image3Url) : null;
      const normalizedImage4Url = productData.image4Url ? objectStorageService.normalizeShopImagePath(productData.image4Url) : null;

      await db.update(shopProducts)
        .set({
          name: productData.name,
          categoryId: productData.categoryId,
          description: productData.description || null,
          model: productData.model || null,
          specifications: productData.specifications || null,
          imageUrl: normalizedImageUrl,
          image1Url: normalizedImage1Url,
          image2Url: normalizedImage2Url,
          image3Url: normalizedImage3Url,
          image4Url: normalizedImage4Url,
          price: productData.price,
          quantity: productData.quantity || 0,
          phone: productData.phone || "",
          condition: productData.condition || "new",
          isActive: productData.isActive !== undefined ? productData.isActive : true,
          updatedAt: new Date(),
        })
        .where(eq(shopProducts.id, productId));

      res.json({ message: "Shop product updated successfully" });
    } catch (error) {
      console.error("Error updating shop product:", error);
      res.status(500).json({ message: "Failed to update shop product" });
    }
  });

  // Delete shop product (admin/shop_manager only)
  app.delete("/api/shop-products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin" && user?.role !== "shop_manager") {
        return res.status(403).json({ message: "Access denied. Admin or shop manager role required." });
      }

      const productId = parseInt(req.params.id);
      await db.delete(shopProducts).where(eq(shopProducts.id, productId));
      res.json({ message: "Shop product deleted successfully" });
    } catch (error) {
      console.error("Error deleting shop product:", error);
      res.status(500).json({ message: "Failed to delete shop product" });
    }
  });

  // ================================
  // SHOP SETTINGS ENDPOINTS
  // ================================

  // Get shop setting by key
  app.get("/api/shop-settings/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const settings = await db.select().from(shopSettings).where(eq(shopSettings.key, key)).limit(1);
      
      if (settings.length === 0) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(settings[0]);
    } catch (error) {
      console.error("Error fetching shop setting:", error);
      res.status(500).json({ message: "Failed to fetch shop setting" });
    }
  });

  // Update shop setting (admin/shop_manager only)
  app.put("/api/shop-settings/:key", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== "admin" && user?.role !== "shop_manager") {
        return res.status(403).json({ message: "Access denied. Admin or shop manager role required." });
      }

      const key = req.params.key;
      const { value } = req.body;

      const result = await db.insert(shopSettings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: shopSettings.key,
          set: { value, updatedAt: new Date() }
        })
        .returning();

      res.json(result[0]);
    } catch (error) {
      console.error("Error updating shop setting:", error);
      res.status(500).json({ message: "Failed to update shop setting" });
    }
  });

  return httpServer;
}

function generateElectricalQuoteHTML(quote: any) {
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "0,00 zł";
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRentalPeriodText = (days: number) => {
    if (days === 1) return "1 dzień";
    if (days < 5) return `${days} dni`;
    return `${days} dni`;
  };

  const itemsHTML = quote.items.map((item: any) => {
    const detailsRows = [];
    
    // Podstawowa linia sprzętu
    detailsRows.push(`
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${item.equipmentName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${getRentalPeriodText(item.rentalPeriodDays)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.pricePerDay)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.discountPercent}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(item.totalPrice)}</td>
      </tr>
    `);

    // Opcje elektryczne - wyświetl uwagi jeśli istnieją
    if (item.notes && item.notes.trim().length > 0) {
      let userNotes = "";
      try {
        if (item.notes.startsWith('{"selectedAdditional"')) {
          const notesData = JSON.parse(item.notes);
          userNotes = notesData.userNotes || "";
          
          // Check if userNotes is also a JSON string (nested)
          if (userNotes.startsWith('{"selectedAdditional"')) {
            try {
              const nestedNotesData = JSON.parse(userNotes);
              userNotes = nestedNotesData.userNotes || "";
            } catch (e) {
              // If parsing fails, use as is
            }
          }
        } else {
          userNotes = item.notes;
        }
      } catch (e) {
        userNotes = item.notes;
      }
      
      if (userNotes && userNotes.trim().length > 0) {
        detailsRows.push(`
          <tr>
            <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #fffacd; font-size: 0.9em;">
              <strong>📝 Uwagi:</strong> ${userNotes}
            </td>
          </tr>
        `);
      }
    }

    return detailsRows.join('');
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wycena ${quote.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-logo { font-size: 28px; font-weight: bold; color: #0066cc; margin-bottom: 10px; }
        .quote-title { font-size: 20px; margin-top: 10px; color: #333; }
        .quote-info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .quote-info div { background-color: #f8f9fa; padding: 20px; border-radius: 8px; }
        .quote-info h3 { margin: 0 0 15px 0; color: #28a745; font-size: 16px; border-bottom: 2px solid #28a745; padding-bottom: 5px; }
        .quote-info p { margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: linear-gradient(135deg, #0066cc 0%, #004499 100%); color: white; padding: 15px; text-align: left; font-weight: bold; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .total-row { font-weight: bold; background-color: #f8f9fa; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        .print-button { position: fixed; top: 20px; right: 20px; z-index: 1000; background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .print-button:hover { background: #0052a3; }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">🖨️ Drukuj</button>
      <div class="header">
        <div class="company-logo">Sebastian Popiel :: PPP :: Program</div>
        <div class="quote-title">Wycena sprzętu elektrycznego</div>
      </div>

      <div class="quote-info">
        <div>
          <h3>Dane klienta:</h3>
          <p><strong>${quote.companyName || 'Nie podano'}</strong></p>
          ${quote.contactPerson ? `<p>Osoba kontaktowa: ${quote.contactPerson}</p>` : ''}
          ${quote.email ? `<p>Email: ${quote.email}</p>` : ''}
          ${quote.phone ? `<p>Telefon: ${quote.phone}</p>` : ''}
          ${quote.address ? `<p>Adres: ${quote.address}</p>` : ''}
        </div>
        <div>
          <h3>Dane wyceny:</h3>
          <p><strong>Numer:</strong> ${quote.quoteNumber}</p>
          <p><strong>Data utworzenia:</strong> ${formatDate(quote.createdAt)}</p>
          <p><strong>Utworzył:</strong> ${quote.createdBy 
            ? (quote.createdBy.firstName && quote.createdBy.lastName 
                ? `${quote.createdBy.firstName} ${quote.createdBy.lastName}`
                : quote.createdBy.email || 'Nieznany użytkownik')
            : 'Wycena gościnna'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nazwa sprzętu</th>
            <th>Ilość</th>
            <th>Okres wynajmu</th>
            <th>Cena za dzień</th>
            <th>Rabat</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
          <tr class="total-row">
            <td colspan="5" style="text-align: right; padding: 15px;">Wartość netto:</td>
            <td style="text-align: right; padding: 15px;">${formatCurrency(quote.totalNet)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="5" style="text-align: right; padding: 15px;">Wartość brutto (VAT 23%):</td>
            <td style="text-align: right; padding: 15px;">${formatCurrency(quote.totalGross)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Wycena wygenerowana: ${formatDate(new Date().toISOString())}</p>
        <p>PPP :: Program - Wynajem sprzętu elektrycznego</p>
      </div>
    </body>
    </html>
  `;
}

function generateGeneralQuoteHTML(quote: any) {
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "0,00 zł";
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRentalPeriodText = (days: number) => {
    if (days === 1) return "1 dzień";
    if (days < 5) return `${days} dni`;
    return `${days} dni`;
  };

  const itemsHTML = quote.items.map((item: any) => {
    const detailsRows = [];
    
    // Podstawowa linia sprzętu
    detailsRows.push(`
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${item.equipment.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${getRentalPeriodText(item.rentalPeriodDays)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.pricePerDay)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.discountPercent || 0}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(item.totalPrice)}</td>
      </tr>
    `);

    // Wyświetl uwagi jeśli istnieją
    if (item.notes && item.notes.trim().length > 0) {
      let userNotes = "";
      try {
        if (item.notes.startsWith('{"selectedAdditional"')) {
          const notesData = JSON.parse(item.notes);
          userNotes = notesData.userNotes || "";
          
          // Check if userNotes is also a JSON string (nested)
          if (userNotes.startsWith('{"selectedAdditional"')) {
            try {
              const nestedNotesData = JSON.parse(userNotes);
              userNotes = nestedNotesData.userNotes || "";
            } catch (e) {
              // If parsing fails, use as is
            }
          }
        } else {
          userNotes = item.notes;
        }
      } catch (e) {
        userNotes = item.notes;
      }
      
      if (userNotes && userNotes.trim().length > 0) {
        detailsRows.push(`
          <tr>
            <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #fffacd; font-size: 0.9em;">
              <strong>📝 Uwagi:</strong> ${userNotes}
            </td>
          </tr>
        `);
      }
    }

    return detailsRows.join('');
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wycena ${quote.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-logo { font-size: 28px; font-weight: bold; color: #0066cc; margin-bottom: 10px; }
        .quote-title { font-size: 20px; margin-top: 10px; color: #333; }
        .quote-info { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .quote-info div { background-color: #f8f9fa; padding: 20px; border-radius: 8px; }
        .quote-info h3 { margin: 0 0 15px 0; color: #28a745; font-size: 16px; border-bottom: 2px solid #28a745; padding-bottom: 5px; }
        .quote-info p { margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: linear-gradient(135deg, #0066cc 0%, #004499 100%); color: white; padding: 15px; text-align: left; font-weight: bold; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .total-row { font-weight: bold; background-color: #f8f9fa; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        .print-button { position: fixed; top: 20px; right: 20px; z-index: 1000; background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .print-button:hover { background: #0052a3; }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">🖨️ Drukuj</button>
      <div class="header">
        <div class="company-logo">Sebastian Popiel :: PPP :: Program</div>
        <div class="quote-title">Wycena sprzętu ogólnego</div>
      </div>

      <div class="quote-info">
        <div>
          <h3>Dane klienta:</h3>
          <p><strong>${quote.client?.companyName || 'Nie podano'}</strong></p>
          ${quote.client?.contactPerson ? `<p>Osoba kontaktowa: ${quote.client.contactPerson}</p>` : ''}
          ${quote.client?.email ? `<p>Email: ${quote.client.email}</p>` : ''}
          ${quote.client?.phone ? `<p>Telefon: ${quote.client.phone}</p>` : ''}
          ${quote.client?.address ? `<p>Adres: ${quote.client.address}</p>` : ''}
          ${quote.client?.nip ? `<p>NIP: ${quote.client.nip}</p>` : ''}
        </div>
        <div>
          <h3>Dane wyceny:</h3>
          <p><strong>Numer:</strong> ${quote.quoteNumber}</p>
          <p><strong>Data utworzenia:</strong> ${formatDate(quote.createdAt)}</p>
          <p><strong>Utworzył:</strong> ${quote.createdBy 
            ? (quote.createdBy.firstName && quote.createdBy.lastName 
                ? `${quote.createdBy.firstName} ${quote.createdBy.lastName}`
                : quote.createdBy.email || 'Nieznany użytkownik')
            : 'Wycena gościnna'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nazwa sprzętu</th>
            <th>Ilość</th>
            <th>Okres wynajmu</th>
            <th>Cena za dzień</th>
            <th>Rabat</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
          <tr class="total-row">
            <td colspan="5" style="text-align: right; padding: 15px;">Wartość netto:</td>
            <td style="text-align: right; padding: 15px;">${formatCurrency(quote.totalNet)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="5" style="text-align: right; padding: 15px;">Wartość brutto (VAT 23%):</td>
            <td style="text-align: right; padding: 15px;">${formatCurrency(quote.totalGross)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Wycena wygenerowana: ${formatDate(new Date().toISOString())}</p>
        <p>PPP :: Program - Wynajem sprzętu ogólnego</p>
      </div>
    </body>
    </html>
  `;
}

function generateTransportQuoteHTML(quote: any) {
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "0,00 zł";
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Transport ma specjalną strukturę - jedna pozycja z informacjami o trasie
  const transportItemHTML = `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${quote.vehicle?.name || 'Pojazd transportowy'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">1</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">Jednorazowo</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(quote.vehicle?.costPerKm || 0)}/km</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">-</td>
      <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(quote.totalCost)}</td>
    </tr>
    <tr>
      <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #f0f8ff; font-size: 0.9em;">
        <strong>🚚 Szczegóły transportu:</strong><br>
        • Adres początkowy: ${quote.fromAddress}<br>
        • Adres docelowy: ${quote.toAddress}<br>
        • Dystans: ${parseFloat(quote.distance).toFixed(1)} km<br>
        • Cena za km: ${formatCurrency(quote.vehicle?.costPerKm || 0)}<br>
        ${quote.notes ? `• Uwagi: ${quote.notes}` : ''}
      </td>
    </tr>
  `;

  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wycena ${quote.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-logo { font-size: 24px; font-weight: bold; color: #0066cc; }
        .quote-title { font-size: 18px; margin-top: 10px; }
        .quote-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .quote-info div { flex: 1; }
        .quote-info h3 { margin: 0 0 10px 0; color: #0066cc; }
        .quote-info p { margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        th { background: linear-gradient(135deg, #0066cc 0%, #004499 100%); color: white; padding: 15px; text-align: left; font-weight: bold; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .total-row { font-weight: bold; background-color: #f8f9fa; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        .print-button { position: fixed; top: 20px; right: 20px; z-index: 1000; background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .print-button:hover { background: #0052a3; }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">🖨️ Drukuj</button>
      <div class="header">
        <div class="company-logo">Sebastian Popiel :: PPP :: Program</div>
        <div class="quote-title">Wycena transportu</div>
      </div>

      <div class="quote-info">
        <div>
          <h3>Dane klienta:</h3>
          <p><strong>${quote.clientName || 'Nie podano'}</strong></p>
        </div>
        <div>
          <h3>Dane wyceny:</h3>
          <p><strong>Numer:</strong> ${quote.quoteNumber}</p>
          <p><strong>Data utworzenia:</strong> ${formatDate(quote.createdAt)}</p>
          <p><strong>Utworzył:</strong> ${quote.createdBy 
            ? (quote.createdBy.firstName && quote.createdBy.lastName 
                ? `${quote.createdBy.firstName} ${quote.createdBy.lastName}`
                : quote.createdBy.email || 'Nieznany użytkownik')
            : 'Wycena gościnna'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Usługa transportowa</th>
            <th>Ilość</th>
            <th>Typ</th>
            <th>Cena</th>
            <th>Rabat</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          ${transportItemHTML}
          <tr class="total-row">
            <td colspan="5" style="text-align: right; padding: 15px;">KOSZT CAŁKOWITY:</td>
            <td style="text-align: right; padding: 15px;">${formatCurrency(quote.totalCost)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Wycena wygenerowana: ${formatDate(new Date().toISOString())}</p>
        <p>PPP :: Program - Transport</p>
      </div>
    </body>
    </html>
  `;
}

function generateQuoteHTML(quote: any) {
  
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return "0,00 zł";
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRentalPeriodText = (days: number) => {
    if (days === 1) return "1 dzień";
    if (days < 5) return `${days} dni`;
    return `${days} dni`;
  };

  const itemsHTML = quote.items.map((item: any) => {
    const detailsRows = [];
    
    // Podstawowa linia sprzętu
    detailsRows.push(`
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">${item.equipment.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${getRentalPeriodText(item.rentalPeriodDays)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.pricePerDay)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.discountPercent}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(item.totalPrice)}</td>
      </tr>
    `);

    // Opcja: Koszt paliwa
    if (item.includeFuelCost && parseFloat(item.totalFuelCost || 0) > 0) {
      let fuelDetails = '';
      if (item.calculationType === 'kilometers') {
        // Pojazdy - kalkulacja kilometrowa
        const totalKm = item.kilometersPerDay * item.rentalPeriodDays;
        const totalFuelConsumption = (totalKm / 100) * parseFloat(item.fuelConsumptionPer100km);
        fuelDetails = `
          • Zużycie: ${item.fuelConsumptionPer100km} l/100km<br>
          • Kilometry dziennie: ${item.kilometersPerDay} km<br>
          • Całkowite kilometry: ${totalKm} km<br>
          • Całkowite zużycie: ${totalFuelConsumption.toFixed(1)} l<br>
          • Cena paliwa: ${formatCurrency(item.fuelPricePerLiter)}/l
        `;
      } else {
        // Tradycyjne urządzenia - kalkulacja motogodzinowa
        const totalFuelConsumption = parseFloat(item.fuelConsumptionLH) * item.hoursPerDay * item.rentalPeriodDays;
        fuelDetails = `
          • Zużycie: ${item.fuelConsumptionLH} l/h<br>
          • Godziny pracy dziennie: ${item.hoursPerDay} h<br>
          • Całkowite zużycie: ${totalFuelConsumption.toFixed(1)} l<br>
          • Cena paliwa: ${formatCurrency(item.fuelPricePerLiter)}/l
        `;
      }
      
      detailsRows.push(`
        <tr>
          <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #f8f9ff; font-size: 0.9em;">
            <strong>🛢️ Uwzględniono koszt paliwa:</strong> ${formatCurrency(item.totalFuelCost)}<br>
            ${fuelDetails}
          </td>
        </tr>
      `);
    }

    // Opcja: Koszt montażu - pokazuj gdy flaga jest zaznaczona
    if (item.includeInstallationCost) {
      detailsRows.push(`
        <tr>
          <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #f0fff8; font-size: 0.9em;">
            <strong>🔧 Uwzględniono koszt montażu:</strong> ${formatCurrency(item.totalInstallationCost || 0)}<br>
            • Dystans (tam i z powrotem): ${item.installationDistanceKm || 0} km<br>
            • Liczba techników: ${item.numberOfTechnicians || 1}<br>
            • Stawka za technika: ${formatCurrency(item.serviceRatePerTechnician || 150)}<br>
            • Stawka za km: ${formatCurrency(item.travelRatePerKm || 1.15)}/km
          </td>
        </tr>
      `);
    }

    // Opcja: Koszt demontażu - pokazuj gdy flaga jest zaznaczona
    if (item.includeDisassemblyCost) {
      detailsRows.push(`
        <tr>
          <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #fff8f0; font-size: 0.9em;">
            <strong>🔨 Uwzględniono koszt demontażu:</strong> ${formatCurrency(item.totalDisassemblyCost || 0)}<br>
            • Dystans (tam i z powrotem): ${item.disassemblyDistanceKm || 0} km<br>
            • Liczba techników: ${item.disassemblyNumberOfTechnicians || 1}<br>
            • Stawka za technika: ${formatCurrency(item.disassemblyServiceRatePerTechnician || 150)}<br>
            • Stawka za km: ${formatCurrency(item.disassemblyTravelRatePerKm || 1.15)}/km
          </td>
        </tr>
      `);
    }

    // Opcja: Koszt dojazdu / serwis - pokazuj gdy flaga jest zaznaczona
    if (item.includeTravelServiceCost) {
      detailsRows.push(`
        <tr>
          <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #f8fff0; font-size: 0.9em;">
            <strong>🚚 Uwzględniono koszt dojazdu / serwis:</strong> ${formatCurrency(item.totalTravelServiceCost || 0)}<br>
            • Dystans (tam i z powrotem): ${item.travelServiceDistanceKm || 0} km<br>
            • Liczba techników: ${item.travelServiceNumberOfTechnicians || 1}<br>
            • Stawka za technika: ${formatCurrency(item.travelServiceServiceRatePerTechnician || 150)}<br>
            • Stawka za km: ${formatCurrency(item.travelServiceTravelRatePerKm || 1.15)}/km<br>
            • Ilość wyjazdów: ${item.travelServiceNumberOfTrips || 1}
          </td>
        </tr>
      `);
    }

    // Opcja: Koszty serwisowe (pozycje serwisowe) - pokazuj gdy flaga jest zaznaczona
    if (item.includeServiceItems) {
      let serviceItemsHTML = '';
      
      // Pobierz rzeczywiste nazwy usług z bazy danych
      if (item.serviceItems && item.serviceItems.length > 0) {
        if (parseFloat(item.serviceItem1Cost || 0) > 0 && item.serviceItems[0]) {
          serviceItemsHTML += `• ${item.serviceItems[0].itemName}: ${formatCurrency(item.serviceItem1Cost)}<br>`;
        }
        if (parseFloat(item.serviceItem2Cost || 0) > 0 && item.serviceItems[1]) {
          serviceItemsHTML += `• ${item.serviceItems[1].itemName}: ${formatCurrency(item.serviceItem2Cost)}<br>`;
        }
        if (parseFloat(item.serviceItem3Cost || 0) > 0 && item.serviceItems[2]) {
          serviceItemsHTML += `• ${item.serviceItems[2].itemName}: ${formatCurrency(item.serviceItem3Cost)}<br>`;
        }
        if (parseFloat(item.serviceItem4Cost || 0) > 0 && item.serviceItems[3]) {
          serviceItemsHTML += `• ${item.serviceItems[3].itemName}: ${formatCurrency(item.serviceItem4Cost)}<br>`;
        }
      } else {
        // Fallback nazwy
        if (parseFloat(item.serviceItem1Cost || 0) > 0) {
          serviceItemsHTML += `• Pozycja serwisowa 1: ${formatCurrency(item.serviceItem1Cost)}<br>`;
        }
        if (parseFloat(item.serviceItem2Cost || 0) > 0) {
          serviceItemsHTML += `• Pozycja serwisowa 2: ${formatCurrency(item.serviceItem2Cost)}<br>`;
        }
        if (parseFloat(item.serviceItem3Cost || 0) > 0) {
          serviceItemsHTML += `• Pozycja serwisowa 3: ${formatCurrency(item.serviceItem3Cost)}<br>`;
        }
        if (parseFloat(item.serviceItem4Cost || 0) > 0) {
          serviceItemsHTML += `• Pozycja serwisowa 4: ${formatCurrency(item.serviceItem4Cost)}<br>`;
        }
      }
      
      detailsRows.push(`
        <tr>
          <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #fff0f8; font-size: 0.9em;">
            <strong>🛠️ Uwzględniono koszty serwisowe:</strong> ${formatCurrency(item.totalServiceItemsCost)}<br>
            ${serviceItemsHTML}
          </td>
        </tr>
      `);
    }

    // Opcja: Wyposażenie dodatkowe i akcesoria
    const hasAdditionalCosts = parseFloat(item.additionalCost || 0) > 0;
    const hasAccessoriesCosts = parseFloat(item.accessoriesCost || "0") > 0;
    
    
    if (hasAdditionalCosts || hasAccessoriesCosts) {
      let additionalHTML = '';
      
      // Parse selected items from notes
      let selectedAdditional = [];
      let selectedAccessories = [];
      
      try {
        if (item.notes && item.notes.startsWith('{"selectedAdditional"')) {
          const notesData = JSON.parse(item.notes);
          selectedAdditional = notesData.selectedAdditional || [];
          selectedAccessories = notesData.selectedAccessories || [];
        }
      } catch (e) {
        console.error('Error parsing notes for additional equipment:', e);
      }
      
      // Show detailed equipment and accessories using pre-fetched data
      if (hasAdditionalCosts && item.additionalEquipmentData && item.additionalEquipmentData.length > 0) {
        additionalHTML += `<strong>📦 Wyposażenie dodatkowe:</strong><br>`;
        
        for (const additionalItem of item.additionalEquipmentData) {
          const itemCost = parseFloat(additionalItem.price) * item.quantity;
          additionalHTML += `&nbsp;&nbsp;• ${additionalItem.name}: ${formatCurrency(parseFloat(additionalItem.price))} × ${item.quantity} = ${formatCurrency(itemCost)}<br>`;
        }
        additionalHTML += `&nbsp;&nbsp;<strong>Suma wyposażenia dodatkowego: ${formatCurrency(parseFloat(item.additionalCost))}</strong><br><br>`;
      } else if (hasAdditionalCosts) {
        additionalHTML += `• 📦 Wyposażenie dodatkowe: ${formatCurrency(parseFloat(item.additionalCost))}<br>`;
      }
      
      if (hasAccessoriesCosts && item.accessoriesData && item.accessoriesData.length > 0) {
        additionalHTML += `<strong>🔧 Akcesoria:</strong><br>`;
        
        for (const accessoryItem of item.accessoriesData) {
          const itemCost = parseFloat(accessoryItem.price) * item.quantity;
          additionalHTML += `&nbsp;&nbsp;• ${accessoryItem.name}: ${formatCurrency(parseFloat(accessoryItem.price))} × ${item.quantity} = ${formatCurrency(itemCost)}<br>`;
        }
        additionalHTML += `&nbsp;&nbsp;<strong>Suma akcesoriów: ${formatCurrency(parseFloat(item.accessoriesCost))}</strong><br>`;
      } else if (hasAccessoriesCosts) {
        additionalHTML += `• 🔧 Akcesoria: ${formatCurrency(parseFloat(item.accessoriesCost))}<br>`;
      }
      
      const totalAdditionalCost = (parseFloat(item.additionalCost || "0") + parseFloat(item.accessoriesCost || "0"));
      
      detailsRows.push(`
        <tr>
          <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #f0f8ff; font-size: 0.9em;">
            <strong>📦 Uwzględniono wyposażenie dodatkowe i akcesoria:</strong> ${formatCurrency(totalAdditionalCost)}<br>
            ${additionalHTML}
          </td>
        </tr>
      `);
    }

    // Uwagi użytkownika
    let userNotes = "";
    try {
      if (item.notes && item.notes.startsWith('{"selectedAdditional"')) {
        const notesData = JSON.parse(item.notes);
        userNotes = notesData.userNotes || "";
        
        // Check if userNotes is also a JSON string (nested)
        if (userNotes.startsWith('{"selectedAdditional"')) {
          try {
            const nestedNotesData = JSON.parse(userNotes);
            userNotes = nestedNotesData.userNotes || "";
          } catch (e) {
            // If parsing fails, use as is
          }
        }
      } else {
        userNotes = item.notes || "";
      }
    } catch (e) {
      userNotes = item.notes || "";
    }
    
    // Wyświetl uwagi - jeśli są puste, pokaż "Brak uwag"
    const displayNotes = userNotes.trim() || "Brak uwag";
    detailsRows.push(`
      <tr>
        <td colspan="6" style="padding: 8px 15px; border-bottom: 1px solid #eee; background-color: #f5f5f5; font-size: 0.9em;">
          <strong>📝 Uwagi:</strong> ${displayNotes}
        </td>
      </tr>
    `);

    return detailsRows.join('');
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="pl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wycena ${quote.quoteNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-logo { font-size: 24px; font-weight: bold; color: #0066cc; }
        .quote-title { font-size: 18px; margin-top: 10px; }
        .quote-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .quote-info div { flex: 1; }
        .quote-info h3 { margin: 0 0 10px 0; color: #0066cc; }
        .quote-info p { margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #0066cc; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .total-row { font-weight: bold; background-color: #f0f0f0; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
        .print-button { position: fixed; top: 20px; right: 20px; z-index: 1000; background: #0066cc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
        .print-button:hover { background: #0052a3; }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">🖨️ Drukuj</button>
      <div class="header">
        <div class="company-logo">Sebastian Popiel :: PPP :: Program</div>
        <div class="quote-title">Wycena sprzętu</div>
      </div>

      <div class="quote-info">
        <div>
          <h3>Dane klienta:</h3>
          <p><strong>${quote.client.companyName}</strong></p>
          ${quote.client.contactPerson ? `<p>Osoba kontaktowa: ${quote.client.contactPerson}</p>` : ''}
          ${quote.client.email ? `<p>Email: ${quote.client.email}</p>` : ''}
          ${quote.client.phone ? `<p>Telefon: ${quote.client.phone}</p>` : ''}
          ${quote.client.address ? `<p>Adres: ${quote.client.address}</p>` : ''}
          ${quote.client.nip ? `<p>NIP: ${quote.client.nip}</p>` : ''}
        </div>
        <div>
          <h3>Dane wyceny:</h3>
          <p><strong>Numer:</strong> ${quote.quoteNumber}</p>
          <p><strong>Data utworzenia:</strong> ${formatDate(quote.createdAt)}</p>
          <p><strong>Utworzył:</strong> ${quote.createdBy 
            ? (quote.createdBy.firstName && quote.createdBy.lastName 
                ? `${quote.createdBy.firstName} ${quote.createdBy.lastName}`
                : quote.createdBy.email || 'Nieznany użytkownik')
            : 'Wycena gościnna'}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Nazwa sprzętu</th>
            <th>Ilość</th>
            <th>Okres wynajmu</th>
            <th>Cena za dzień</th>
            <th>Rabat</th>
            <th>Wartość</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
          <tr class="total-row">
            <td colspan="5" style="text-align: right; padding: 15px;">Wartość netto:</td>
            <td style="text-align: right; padding: 15px;">${formatCurrency(quote.totalNet)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="5" style="text-align: right; padding: 15px;">Wartość brutto (VAT 23%):</td>
            <td style="text-align: right; padding: 15px;">${formatCurrency(quote.totalGross)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Wycena wygenerowana: ${formatDate(new Date().toISOString())}</p>
        <p>PPP :: Program - Wynajem sprzętu</p>
      </div>
    </body>
    </html>
  `;
}
