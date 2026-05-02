/**
 * One-time seed script to create Parse Roles and assign existing users.
 *
 * Run with: node cloud/seed.js
 * (Make sure the Parse server is running first)
 */

const Parse = require("parse/node");

const APP_ID = "stock-manage-app";
const MASTER_KEY = "admin";
const SERVER_URL = "http://127.0.0.1:1337/parse";

Parse.initialize(APP_ID, null, MASTER_KEY);
Parse.serverURL = SERVER_URL;

const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  CLIENT: "client",
};

async function seed() {
  console.log("🌱 Starting seed...\n");

  // ── 1. Create or fetch Parse Roles ──────────────────────────
  const roleNames = Object.values(ROLES);
  const createdRoles = {};

  for (const name of roleNames) {
    const roleQuery = new Parse.Query(Parse.Role);
    roleQuery.equalTo("name", name);
    const existing = await roleQuery.first({ useMasterKey: true });

    if (existing) {
      console.log(`  ✅ Role "${name}" already exists (${existing.id})`);
      createdRoles[name] = existing;
    } else {
      const role = new Parse.Role();
      role.set("name", name);
      // Start with no users — we'll assign them below
      const acl = new Parse.ACL();
      acl.setPublicReadAccess(true); // Role names are public
      acl.setRoleWriteAccess(ROLES.ADMIN, true); // Only admin can modify roles
      role.setACL(acl);
      await role.save(null, { useMasterKey: true });
      console.log(`  ✅ Role "${name}" created (${role.id})`);
      createdRoles[name] = role;
    }
  }

  // ── 2. Assign existing users to roles ───────────────────────
  const userQuery = new Parse.Query(Parse.User);
  const users = await userQuery.find({ useMasterKey: true });
  console.log(`\n  📋 Found ${users.length} users to process...`);

  for (const user of users) {
    const username = user.get("username");
    const roleField = user.get("role") || "client";

    // Determine which Parse Role this user belongs to
    let targetRoleName;
    if (username === "admin" || roleField === "admin") {
      targetRoleName = ROLES.ADMIN;
    } else if (username === "manager" || roleField === "manager") {
      targetRoleName = ROLES.MANAGER;
    } else {
      targetRoleName = ROLES.CLIENT;
    }

    const role = createdRoles[targetRoleName];
    if (!role) {
      console.log(
        `  ⚠️  Role "${targetRoleName}" not found, skipping ${username}`,
      );
      continue;
    }

    // Check if user is already in the role's users relation
    const relation = role.getUsers();
    const query = relation.query();
    query.equalTo("objectId", user.id);
    const alreadyAssigned = await query.first({ useMasterKey: true });

    if (alreadyAssigned) {
      console.log(`  ➡️  ${username} already in role "${targetRoleName}"`);
    } else {
      relation.add(user);
      await role.save(null, { useMasterKey: true });
      console.log(`  ✅ ${username} → role "${targetRoleName}"`);
    }
  }

  // ── 3. Summary ──────────────────────────────────────────────
  console.log("\n  ─── Role Membership Summary ───");
  for (const name of roleNames) {
    const role = createdRoles[name];
    const userRelation = role.getUsers();
    const members = await userRelation.query().find({ useMasterKey: true });
    const memberNames =
      members.map((u) => u.get("username")).join(", ") || "(none)";
    console.log(`  ${name}: ${memberNames}`);
  }

  console.log("\n🌱 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
