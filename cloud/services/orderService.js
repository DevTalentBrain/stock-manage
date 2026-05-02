const tables = require("../consts/tables");

class OrderService {
  /**
   * Customer confirms receipt — order becomes Complete.
   */
  async confirmReceived({ orderId }) {
    if (!orderId) {
      throw new Parse.Error(
        Parse.Error.INVALID_PARAMS,
        "Missing orderId parameter.",
      );
    }

    const Order = Parse.Object.extend(tables.ORDER);
    const Delivery = Parse.Object.extend(tables.DELIVERIES);

    // 1. Update order status to Complete
    const orderQuery = new Parse.Query(Order);
    const order = await orderQuery.get(orderId, { useMasterKey: true });
    order.set("status", "Complete");
    await order.save(null, { useMasterKey: true });

    // 2. Update the associated delivery record to Delivered
    const deliveryQuery = new Parse.Query(Delivery);
    deliveryQuery.equalTo("order", order);
    const delivery = await deliveryQuery.first({ useMasterKey: true });
    if (delivery) {
      delivery.set("status", "Delivered");
      delivery.set("arrivedAt", new Date().toISOString());
      await delivery.save(null, { useMasterKey: true });
    }

    return { success: true };
  }

  /**
   * Get notification count for the current user.
   */
  async getNotificationCount(user) {
    if (!user) {
      return { count: 0 };
    }

    const lastCheck = user.get("lastNotificationCheck");
    const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);

    // 1. Count orders with status changes
    const Order = Parse.Object.extend(tables.ORDER);
    const orderQuery = new Parse.Query(Order);
    orderQuery.equalTo("user", user);
    orderQuery.containedIn("status", ["Approved", "Dispatched", "Complete"]);
    orderQuery.greaterThan("updatedAt", lastCheckDate);

    // 2. Count support messages with admin replies
    const SupportMessage = Parse.Object.extend(tables.SUPPORT_MESSAGE);
    const supportQuery = new Parse.Query(SupportMessage);
    supportQuery.equalTo("user", user);
    supportQuery.exists("adminReply");
    supportQuery.greaterThan("updatedAt", lastCheckDate);

    const [orderCount, supportCount] = await Promise.all([
      orderQuery.count({ useMasterKey: true }),
      supportQuery.count({ useMasterKey: true }),
    ]);

    return { count: orderCount + supportCount };
  }

  /**
   * Get pending order count for management dashboard.
   */
  async getPendingOrderCount() {
    const Order = Parse.Object.extend(tables.ORDER);
    const query = new Parse.Query(Order);
    query.equalTo("status", "Pending Approval");
    const count = await query.count({ useMasterKey: true });
    return { count };
  }
}

module.exports = new OrderService();
