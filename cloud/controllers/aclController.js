const tables = require("../consts/tables");
const roles = require("../consts/roles");

/**
 * beforeSave hook for Order:
 * - Sets the `user` pointer to the current user if not set
 * - Sets ACL so only the owner, admin, and manager can read/write
 */
Parse.Cloud.beforeSave(tables.ORDER, async (request) => {
  const { object, user, master } = request;

  // If master key is used (cloud functions), skip ACL enforcement
  if (master) return;

  if (!user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      "You must be logged in to create an order.",
    );
  }

  // If new object, set the user pointer
  if (!object.existed()) {
    object.set("user", user);
  }

  // Set ACL: owner can read/write, admin and manager roles can read/write
  const acl = new Parse.ACL();
  acl.setReadAccess(user.id, true);
  acl.setWriteAccess(user.id, true);
  acl.setRoleReadAccess(roles.ADMIN, true);
  acl.setRoleWriteAccess(roles.ADMIN, true);
  acl.setRoleReadAccess(roles.MANAGER, true);
  acl.setRoleWriteAccess(roles.MANAGER, true);
  object.setACL(acl);
});

/**
 * beforeSave hook for SupportMessage:
 * - Sets the `user` pointer to the current user if not set
 * - Sets ACL so only the owner, admin, and manager can read/write
 */
Parse.Cloud.beforeSave(tables.SUPPORT_MESSAGE, async (request) => {
  const { object, user, master } = request;

  if (master) return;

  if (!user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      "You must be logged in to send a message.",
    );
  }

  if (!object.existed()) {
    object.set("user", user);
  }

  const acl = new Parse.ACL();
  acl.setReadAccess(user.id, true);
  acl.setWriteAccess(user.id, true);
  acl.setRoleReadAccess(roles.ADMIN, true);
  acl.setRoleWriteAccess(roles.ADMIN, true);
  acl.setRoleReadAccess(roles.MANAGER, true);
  acl.setRoleWriteAccess(roles.MANAGER, true);
  object.setACL(acl);
});

/**
 * beforeSave hook for InternalChat:
 * - Only admin and manager roles can create
 * - Sets ACL for admin and manager roles
 */
Parse.Cloud.beforeSave("InternalChat", async (request) => {
  const { object, user, master } = request;

  if (master) return;

  if (!user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      "Not authenticated.",
    );
  }

  const acl = new Parse.ACL();
  acl.setRoleReadAccess(roles.ADMIN, true);
  acl.setRoleWriteAccess(roles.ADMIN, true);
  acl.setRoleReadAccess(roles.MANAGER, true);
  acl.setRoleWriteAccess(roles.MANAGER, true);
  object.setACL(acl);
});

/**
 * beforeSave hook for Deliveries:
 * - Only admin and manager can create/update
 * - Sets ACL for admin and manager roles
 */
Parse.Cloud.beforeSave(tables.DELIVERIES, async (request) => {
  const { object, user, master } = request;

  if (master) return;

  if (!user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      "Not authenticated.",
    );
  }

  const acl = new Parse.ACL();
  acl.setRoleReadAccess(roles.ADMIN, true);
  acl.setRoleWriteAccess(roles.ADMIN, true);
  acl.setRoleReadAccess(roles.MANAGER, true);
  acl.setRoleWriteAccess(roles.MANAGER, true);
  object.setACL(acl);
});

/**
 * beforeSave hook for Cargo:
 * - Only admin and manager can create/update
 * - Sets ACL for admin and manager roles
 */
Parse.Cloud.beforeSave(tables.CARGO, async (request) => {
  const { object, user, master } = request;

  if (master) return;

  if (!user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      "Not authenticated.",
    );
  }

  const acl = new Parse.ACL();
  acl.setRoleReadAccess(roles.ADMIN, true);
  acl.setRoleWriteAccess(roles.ADMIN, true);
  acl.setRoleReadAccess(roles.MANAGER, true);
  acl.setRoleWriteAccess(roles.MANAGER, true);
  object.setACL(acl);
});
