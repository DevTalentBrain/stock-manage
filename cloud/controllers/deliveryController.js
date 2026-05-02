const deliveryService = require("../services/deliveryService");

Parse.Cloud.define("dispatchStock", async (request) => {
  return await deliveryService.dispatchStock(request.params);
});

Parse.Cloud.define("confirmArrival", async (request) => {
  return await deliveryService.confirmArrival(request.params);
});
