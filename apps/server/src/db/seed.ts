/**
 * Database seed script for plugin registry
 * Run with: bun run src/db/seed.ts
 * 
 * Seeds only categories - plugins should be published through the API
 */

import { getDb } from "./index";
import { pluginCategories } from "@launcher/db";

const CATEGORIES = [
  { id: "productivity", name: "Productivity", description: "Boost your workflow efficiency", iconName: "Zap", sortOrder: 1 },
  { id: "development", name: "Development", description: "Tools for developers", iconName: "Code", sortOrder: 2 },
  { id: "utilities", name: "Utilities", description: "Handy system utilities", iconName: "Wrench", sortOrder: 3 },
  { id: "security", name: "Security", description: "Password managers and security tools", iconName: "Shield", sortOrder: 4 },
  { id: "media", name: "Media", description: "Music, videos, and entertainment", iconName: "Music", sortOrder: 5 },
  { id: "communication", name: "Communication", description: "Chat and messaging integrations", iconName: "MessageSquare", sortOrder: 6 },
  { id: "devops", name: "DevOps", description: "Container and infrastructure tools", iconName: "Server", sortOrder: 7 },
  { id: "ai", name: "AI Tools", description: "AI-powered plugins", iconName: "Brain", sortOrder: 8 },
  { id: "project-management", name: "Project Management", description: "Task and project tracking", iconName: "CheckSquare", sortOrder: 9 },
  { id: "files", name: "Files & Storage", description: "File management and cloud storage", iconName: "Folder", sortOrder: 10 },
];

async function seed() {
  console.log("🌱 Seeding database...");
  
  const db = getDb();

  // Seed categories
  console.log("📁 Creating categories...");
  for (const category of CATEGORIES) {
    try {
      await db.insert(pluginCategories).values(category).onConflictDoNothing();
      console.log(`  ✅ ${category.name}`);
    } catch (e: any) {
      if (e.code !== "23505") { // Ignore duplicate key errors
        console.error(`  ❌ ${category.name}: ${e.message}`);
      }
    }
  }
  
  console.log(`\n✅ Created ${CATEGORIES.length} categories`);
  console.log("\n📝 Note: Plugins should be published through the API using:");
  console.log("   POST /api/plugins - Create a plugin");
  console.log("   POST /api/plugins/:id/versions - Publish a version");
  console.log("\n🎉 Seeding complete!");
}

// Run seed
seed().catch(console.error);
