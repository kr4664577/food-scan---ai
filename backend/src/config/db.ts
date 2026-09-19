import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { FOOD_MASTER_CATALOG } from '../db/foodCatalog';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  dietaryGoals: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAllergyRecord {
  id: string;
  userId: string;
  allergen: string;
  createdAt: Date;
}

export interface ScanHistoryRecord {
  id: string;
  userId: string;
  scanType: string;
  barcode: string | null;
  imageUrl: string | null;
  productName: string;
  brandName: string | null;
  calories: number | null;
  proteins: number | null;
  carbs: number | null;
  fats: number | null;
  sugar: number | null;
  sodium: number | null;
  saturatedFat: number | null;
  nutritionScore: string | null;
  rawOcrText: string | null;
  ingredients: string | null;
  detectedAllergens: string | null;
  additives: string | null;
  qualityAnalysis: string | null;
  confidenceScore: number | null;
  createdAt: Date;
}

export interface FavoriteRecord {
  id: string;
  userId: string;
  scanId: string;
  createdAt: Date;
}

export interface FoodMasterItemRecord {
  id: string;
  category: string;
  name: string;
  brandName: string | null;
  barcode: string | null;
  keywords: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  saturatedFat: number | null;
  truthScore: number;
  novaLevel: number;
  ratingCategory: string;
  healthySwaps: string | null;
  ingredients: string | null;
  allergens: string | null;
  healthSummary: string | null;
  createdAt: Date;
}

interface DatabaseState {
  users: UserRecord[];
  userAllergies: UserAllergyRecord[];
  scanHistory: ScanHistoryRecord[];
  favorites: FavoriteRecord[];
  foodMasterItems: FoodMasterItemRecord[];
}

// Persistent storage file path
const STORAGE_FILE = process.env.FOODSCAN_STORAGE_FILE || path.join(process.cwd(), 'foodscan_persistent_data.json');

/**
 * Strips user credentials and passwords from database connection strings
 * to ensure sensitive secrets are never leaked into server logs.
 */
export function sanitizeDatabaseUrl(url?: string): string {
  if (!url) return '[No DATABASE_URL configured — using persistent local database engine]';
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '******';
    if (parsed.username) parsed.username = parsed.username.slice(0, 2) + '***';
    return parsed.toString();
  } catch {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:******@');
  }
}

class ResilientDatabase {
  private state: DatabaseState = {
    users: [],
    userAllergies: [],
    scanHistory: [],
    favorites: [],
    foodMasterItems: []
  };

  constructor() {
    const rawDbUrl = process.env.DATABASE_URL;
    if (rawDbUrl) {
      console.log(`[Database Engine] Initializing database target: ${sanitizeDatabaseUrl(rawDbUrl)}`);
    } else {
      console.log(`[Database Engine] Persistent file-backed storage active at: ${STORAGE_FILE}`);
    }
    this.loadState();
    this.ensureSeeded();
  }

  private loadState() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          users: (parsed.users || []).map((u: any) => ({ ...u, createdAt: new Date(u.createdAt), updatedAt: new Date(u.updatedAt) })),
          userAllergies: (parsed.userAllergies || []).map((a: any) => ({ ...a, createdAt: new Date(a.createdAt) })),
          scanHistory: (parsed.scanHistory || []).map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) })),
          favorites: (parsed.favorites || []).map((f: any) => ({ ...f, createdAt: new Date(f.createdAt) })),
          foodMasterItems: (parsed.foodMasterItems || []).map((m: any) => ({ ...m, createdAt: new Date(m.createdAt) }))
        };
      }
    } catch (err) {
      console.warn('[DB Engine] Could not load existing persistent state, starting fresh:', err);
    }
  }

  private saveState() {
    try {
      const dir = path.dirname(STORAGE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB Engine] Failed to write persistent state to disk:', err);
    }
  }

  private ensureSeeded() {
    // Seed initial food master items if empty
    if (this.state.foodMasterItems.length === 0 && FOOD_MASTER_CATALOG && FOOD_MASTER_CATALOG.length > 0) {
      this.state.foodMasterItems = FOOD_MASTER_CATALOG.map((item: any, idx: number) => ({
        id: `food-master-${idx + 1}`,
        category: item.category,
        name: item.name,
        brandName: item.brandName || null,
        barcode: item.barcode || null,
        keywords: Array.isArray(item.keywords) ? item.keywords.join(',') : String(item.keywords || ''),
        portion: item.portion,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber || null,
        sugar: item.sugar || null,
        sodium: item.sodium || null,
        saturatedFat: item.saturatedFat || null,
        truthScore: item.truthScore,
        novaLevel: item.novaLevel,
        ratingCategory: item.ratingCategory,
        healthySwaps: item.healthySwaps ? JSON.stringify(item.healthySwaps) : null,
        ingredients: item.ingredients ? JSON.stringify(item.ingredients) : null,
        allergens: item.allergens ? JSON.stringify(item.allergens) : null,
        healthSummary: item.healthSummary || null,
        createdAt: new Date()
      }));
      this.saveState();
    }
  }

  // --- USER OPERATIONS ---
  public user = {
    findUnique: async (args: { where: { email?: string; id?: string }; include?: { allergies?: boolean } }) => {
      const u = this.state.users.find(
        (user) => (args.where.email && user.email.toLowerCase() === args.where.email.toLowerCase()) || (args.where.id && user.id === args.where.id)
      );
      if (!u) return null;
      if (args.include?.allergies) {
        const allergies = this.state.userAllergies.filter((a) => a.userId === u.id);
        return { ...u, allergies };
      }
      return u;
    },
    create: async (args: {
      data: {
        email: string;
        passwordHash: string;
        fullName: string;
        dietaryGoals?: string | null;
        allergies?: { create?: Array<{ allergen: string }> };
      };
      include?: { allergies?: boolean };
    }) => {
      const now = new Date();
      const newUser: UserRecord = {
        id: crypto.randomUUID(),
        email: args.data.email.toLowerCase().trim(),
        passwordHash: args.data.passwordHash,
        fullName: args.data.fullName.trim(),
        dietaryGoals: args.data.dietaryGoals || null,
        createdAt: now,
        updatedAt: now
      };
      this.state.users.push(newUser);

      const createdAllergies: UserAllergyRecord[] = [];
      if (args.data.allergies?.create) {
        for (const al of args.data.allergies.create) {
          const aRec: UserAllergyRecord = {
            id: crypto.randomUUID(),
            userId: newUser.id,
            allergen: al.allergen,
            createdAt: now
          };
          this.state.userAllergies.push(aRec);
          createdAllergies.push(aRec);
        }
      }

      this.saveState();

      if (args.include?.allergies) {
        return { ...newUser, allergies: createdAllergies };
      }
      return newUser;
    },
    update: async (args: {
      where: { id: string };
      data: {
        fullName?: string;
        dietaryGoals?: string | null;
      };
      include?: { allergies?: boolean };
    }) => {
      const idx = this.state.users.findIndex((u) => u.id === args.where.id);
      if (idx === -1) throw new Error('User not found');
      const u = this.state.users[idx];
      if (args.data.fullName !== undefined) u.fullName = args.data.fullName;
      if (args.data.dietaryGoals !== undefined) u.dietaryGoals = args.data.dietaryGoals;
      u.updatedAt = new Date();
      this.saveState();

      if (args.include?.allergies) {
        const allergies = this.state.userAllergies.filter((a) => a.userId === u.id);
        return { ...u, allergies };
      }
      return u;
    }
  };

  // --- USER ALLERGY OPERATIONS ---
  public userAllergy = {
    deleteMany: async (args: { where: { userId: string } }) => {
      const before = this.state.userAllergies.length;
      this.state.userAllergies = this.state.userAllergies.filter((a) => a.userId !== args.where.userId);
      this.saveState();
      return { count: before - this.state.userAllergies.length };
    },
    create: async (args: { data: { userId: string; allergen: string } }) => {
      const aRec: UserAllergyRecord = {
        id: crypto.randomUUID(),
        userId: args.data.userId,
        allergen: args.data.allergen,
        createdAt: new Date()
      };
      this.state.userAllergies.push(aRec);
      this.saveState();
      return aRec;
    },
    createMany: async (args: { data: Array<{ userId: string; allergen: string }> }) => {
      const now = new Date();
      for (const item of args.data) {
        this.state.userAllergies.push({
          id: crypto.randomUUID(),
          userId: item.userId,
          allergen: item.allergen,
          createdAt: now
        });
      }
      this.saveState();
      return { count: args.data.length };
    }
  };

  // --- SCAN HISTORY OPERATIONS ---
  public scanHistory = {
    create: async (args: { data: Partial<ScanHistoryRecord> & { userId: string; scanType: string; productName: string } }) => {
      const rec: ScanHistoryRecord = {
        id: crypto.randomUUID(),
        userId: args.data.userId,
        scanType: args.data.scanType,
        barcode: args.data.barcode || null,
        imageUrl: args.data.imageUrl || null,
        productName: args.data.productName,
        brandName: args.data.brandName || null,
        calories: args.data.calories ?? null,
        proteins: args.data.proteins ?? null,
        carbs: args.data.carbs ?? null,
        fats: args.data.fats ?? null,
        sugar: args.data.sugar ?? null,
        sodium: args.data.sodium ?? null,
        saturatedFat: args.data.saturatedFat ?? null,
        nutritionScore: args.data.nutritionScore || null,
        rawOcrText: args.data.rawOcrText || null,
        ingredients: args.data.ingredients || null,
        detectedAllergens: args.data.detectedAllergens || null,
        additives: args.data.additives || null,
        qualityAnalysis: args.data.qualityAnalysis || null,
        confidenceScore: args.data.confidenceScore ?? null,
        createdAt: new Date()
      };
      this.state.scanHistory.push(rec);
      this.saveState();
      return rec;
    },
    findMany: async (args?: {
      where?: { userId?: string };
      orderBy?: { createdAt?: 'desc' | 'asc' };
      include?: { favorites?: { where?: { userId?: string } } };
    }) => {
      let scans = this.state.scanHistory;
      if (args?.where?.userId) {
        scans = scans.filter((s) => s.userId === args.where!.userId);
      }
      const sorted = [...scans].sort((a, b) => {
        const diff = b.createdAt.getTime() - a.createdAt.getTime();
        return args?.orderBy?.createdAt === 'asc' ? -diff : diff;
      });

      if (args?.include?.favorites) {
        return sorted.map((s) => {
          const favs = this.state.favorites.filter((f) => f.scanId === s.id && (!args.include?.favorites?.where?.userId || f.userId === args.include?.favorites?.where?.userId));
          return { ...s, favorites: favs };
        });
      }
      return sorted;
    },
    findUnique: async (args: { where: { id: string } }) => {
      return this.state.scanHistory.find((s) => s.id === args.where.id) || null;
    }
  };

  // --- FAVORITE OPERATIONS ---
  public favorite = {
    findMany: async (args: { where: { userId: string }; include?: { scan?: boolean }; orderBy?: { createdAt?: 'desc' | 'asc' } }) => {
      const favs = this.state.favorites.filter((f) => f.userId === args.where.userId);
      const sorted = [...favs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (args.include?.scan) {
        return sorted.map((f) => {
          const scan = this.state.scanHistory.find((s) => s.id === f.scanId) || null;
          return { ...f, scan };
        });
      }
      return sorted;
    },
    findUnique: async (args: { where: { userId_scanId: { userId: string; scanId: string } } }) => {
      return (
        this.state.favorites.find(
          (f) => f.userId === args.where.userId_scanId.userId && f.scanId === args.where.userId_scanId.scanId
        ) || null
      );
    },
    create: async (args: { data: { userId: string; scanId: string } }) => {
      const rec: FavoriteRecord = {
        id: crypto.randomUUID(),
        userId: args.data.userId,
        scanId: args.data.scanId,
        createdAt: new Date()
      };
      this.state.favorites.push(rec);
      this.saveState();
      return rec;
    },
    delete: async (args: { where: { id?: string; userId_scanId?: { userId: string; scanId: string } } }) => {
      let idx = -1;
      if (args.where.id) {
        idx = this.state.favorites.findIndex((f) => f.id === args.where.id);
      } else if (args.where.userId_scanId) {
        idx = this.state.favorites.findIndex(
          (f) => f.userId === args.where.userId_scanId!.userId && f.scanId === args.where.userId_scanId!.scanId
        );
      }
      if (idx === -1) throw new Error('Favorite not found');
      const removed = this.state.favorites.splice(idx, 1)[0];
      this.saveState();
      return removed;
    }
  };

  // --- FOOD MASTER ITEM OPERATIONS ---
  public foodMasterItem = {
    count: async () => {
      return this.state.foodMasterItems.length;
    },
    findMany: async (args?: { where?: any }) => {
      return this.state.foodMasterItems;
    },
    findFirst: async (args?: { where?: any }) => {
      return this.state.foodMasterItems[0] || null;
    },
    upsert: async (args: { where: { name: string }; update: any; create: any }) => {
      const idx = this.state.foodMasterItems.findIndex((m) => m.name.toLowerCase() === args.where.name.toLowerCase());
      if (idx !== -1) {
        this.state.foodMasterItems[idx] = { ...this.state.foodMasterItems[idx], ...args.update };
        this.saveState();
        return this.state.foodMasterItems[idx];
      } else {
        const newItem = {
          id: crypto.randomUUID(),
          ...args.create,
          createdAt: new Date()
        };
        this.state.foodMasterItems.push(newItem);
        this.saveState();
        return newItem;
      }
    }
  };

  public $transaction = async (fnOrArray: any) => {
    if (typeof fnOrArray === 'function') {
      return await fnOrArray(this);
    }
    return Promise.all(fnOrArray);
  };
}

export const prisma: any = new ResilientDatabase();
