const userService = require("../services/userService");

Parse.Cloud.define("clearNotifications", async (request) => {
  return await userService.clearNotifications(request.user);
});
