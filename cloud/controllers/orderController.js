const orderService = require("../services/orderService");

Parse.Cloud.define("confirmReceived", async (request) => {
  return await orderService.confirmReceived(request.params);
});

Parse.Cloud.define("getNotificationCount", async (request) => {
  return await orderService.getNotificationCount(request.user);
});

Parse.Cloud.define("getPendingOrderCount", async () => {
  return await orderService.getPendingOrderCount();
});
