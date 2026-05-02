const express = require("express");
const { ParseServer } = require("parse-server");
const ParseDashboard = require("parse-dashboard");
const cors = require("cors");

const app = express();
app.set("trust proxy", true); // Helps dashboard connectivity
app.use(cors());

// Using 127.0.0.1 is more stable than 'localhost' on Windows
const databaseURI = "mongodb://127.0.0.1:27017/stock-manage";

const api = new ParseServer({
  databaseURI: databaseURI,
  appId: "stock-manage-app",
  masterKey: "admin", // Change localhost to 127.0.0.1 here
  serverURL: "http://127.0.0.1:1337/parse",
  publicServerURL: "http://127.0.0.1:1337/parse",

  // Enable LiveQuery for real-time updates
  startLiveQueryServer: true,
  liveQuery: {
    classNames: [
      "Product",
      "CityStock",
      "Order",
      "Deliveries",
      "City",
      "Cargo",
    ],
  },
  masterKeyIps: ["0.0.0.0/0", "::/0", "127.0.0.1"], // Added '::1' for local IPv6
  allowClientClassCreation: true,

  fileUpload: {
    enableForPublic: true, // This replaces allowPublicFileUploads
    enableForAnonymousUser: true,
  }, // ADD THIS SECTION TO UNLOCK EDITING

  schema: {
    definitions: [
      {
        className: "Product",
        fields: {
          name: { type: "String" },
          stock: { type: "Number" },
          price: { type: "Number" },
          image: { type: "File" },
          category: { type: "String" },
          transitStatus: { type: "String" },
          deliveryDate: { type: "String" },
        },
        classLevelPermissions: {
          find: { "*": true },
          get: { "*": true },
          create: { "*": true },
          update: { "*": true },
          delete: { "*": true },
        },
      },
      {
        className: "City",
        fields: {
          name: { type: "String" },
          shortCode: { type: "String" },
          color: { type: "String" },
          isActive: { type: "Boolean" },
          paypalLink: { type: "String" },
          bankDetails: { type: "String" },
        },
        classLevelPermissions: {
          find: { "*": true },
          get: { "*": true },
          create: { "*": true },
          update: { "*": true },
          delete: { "*": true },
        },
      },
      {
        className: "CityStock",
        fields: {
          product: { type: "Pointer", targetClass: "Product" },
          city: { type: "Pointer", targetClass: "City" },
          stock: { type: "Number" },
        },
        classLevelPermissions: {
          find: { "*": true },
          get: { "*": true },
          create: { "*": true },
          update: { "*": true },
          delete: { "*": true },
        },
      },
      {
        className: "Order",
        fields: {
          orderNumber: { type: "String" },
          recipientName: { type: "String" },
          phone: { type: "String" },
          address: { type: "String" },
          itemCount: { type: "Number" },
          total: { type: "Number" },
          status: { type: "String" },
          user: { type: "Pointer", targetClass: "_User" },
          itemSummary: { type: "String" },
          itemImages: { type: "Array" },
          cities: { type: "Array" },
        },
        classLevelPermissions: {
          find: { "*": true },
          get: { "*": true },
          create: { "*": true },
          update: { "*": true },
          delete: { "*": true },
        },
      },
      {
        className: "Deliveries",
        fields: {
          order: { type: "Pointer", targetClass: "Order" },
          status: { type: "String" },
          trackingNumber: { type: "String" },
          cargoCount: { type: "Number" },
          totalValue: { type: "Number" },
          recipient: { type: "String" },
          itemNames: { type: "Array" },
          itemImages: { type: "Array" },
          itemQtys: { type: "Array" },
          eta: { type: "String" },
          arrivedAt: { type: "String" },
        },
        classLevelPermissions: {
          find: { "*": true },
          get: { "*": true },
          create: { "*": true },
          update: { "*": true },
          delete: { "*": true },
        },
      },
      {
        className: "Cargo",
        fields: {
          status: { type: "String" },
          fromCity: { type: "String" },
          toCity: { type: "String" },
          fromCityId: { type: "String" },
          toCityId: { type: "String" },
          itemNames: { type: "Array" },
          itemImages: { type: "Array" },
          itemQtys: { type: "Array" },
          cargoCount: { type: "Number" },
          eta: { type: "String" },
          arrivedAt: { type: "String" },
        },
        classLevelPermissions: {
          find: { "*": true },
          get: { "*": true },
          create: { "*": true },
          update: { "*": true },
          delete: { "*": true },
        },
      },
    ],
  },
});

const dashboard = new ParseDashboard(
  {
    apps: [
      {
        serverURL: "http://127.0.0.1:1337/parse", // Must match the serverURL above
        appId: "stock-manage-app",
        masterKey: "admin",
        appName: "Stock Management",
      },
    ],
    users: [{ user: "admin", pass: "admin" }],
  },
  { allowInsecureHTTP: true },
);

// Cloud Function: Dispatch stock between cities (creates Cargo record, no stock changes)
Parse.Cloud.define("dispatchStock", async (request) => {
  const {
    items,
    sourceCityId,
    destCityId,
    manifestData,
    fromCityName,
    toCityName,
  } = request.params;

  if (!items || !sourceCityId || !destCityId) {
    throw new Parse.Error(
      Parse.Error.INVALID_PARAMS,
      "Missing required parameters.",
    );
  }

  const Cargo = Parse.Object.extend("Cargo");
  const useMasterKey = true;

  // Check if there's already an "In Transit" Cargo for this route
  const existingQuery = new Parse.Query(Cargo);
  existingQuery.equalTo("status", "In Transit");
  existingQuery.equalTo("fromCityId", sourceCityId);
  existingQuery.equalTo("toCityId", destCityId);
  const existingCargo = await existingQuery.first({ useMasterKey });

  if (existingCargo) {
    // Merge: append new items and sum quantities for matching items
    const existingNames = existingCargo.get("itemNames") || [];
    const existingImages = existingCargo.get("itemImages") || [];
    const existingQtys = existingCargo.get("itemQtys") || [];

    for (let i = 0; i < items.length; i++) {
      const newName = manifestData[i].name;
      const newImage = manifestData[i].image;
      const newQty = items[i].qty;

      const existingIdx = existingNames.indexOf(newName);
      if (existingIdx >= 0) {
        // Sum quantity for existing item
        existingQtys[existingIdx] = (existingQtys[existingIdx] || 0) + newQty;
      } else {
        // Append new item
        existingNames.push(newName);
        existingImages.push(newImage);
        existingQtys.push(newQty);
      }
    }

    existingCargo.set("itemNames", existingNames);
    existingCargo.set("itemImages", existingImages);
    existingCargo.set("itemQtys", existingQtys);
    existingCargo.set("cargoCount", existingNames.length);
    await existingCargo.save(null, { useMasterKey });

    return { success: true, merged: true };
  }

  // Create new Cargo Record
  const cargo = new Cargo();
  cargo.set("status", "In Transit");
  cargo.set("fromCity", fromCityName);
  cargo.set("toCity", toCityName);
  cargo.set("fromCityId", sourceCityId);
  cargo.set("toCityId", destCityId);
  cargo.set("cargoCount", items.length);
  cargo.set(
    "itemNames",
    manifestData.map((d) => d.name),
  );
  cargo.set(
    "itemImages",
    manifestData.map((d) => d.image),
  );
  cargo.set(
    "itemQtys",
    items.map((i) => i.qty),
  );
  cargo.set("eta", "45 mins");
  await cargo.save(null, { useMasterKey });

  return { success: true, merged: false };
});

// Cloud Function: Confirm arrival — moves stock from source to destination
Parse.Cloud.define("confirmArrival", async (request) => {
  const { productIds, destinationHub } = request.params;

  if (!productIds || !destinationHub) {
    throw new Parse.Error(
      Parse.Error.INVALID_PARAMS,
      "Missing required parameters: productIds, destinationHub",
    );
  }

  const Cargo = Parse.Object.extend("Cargo");
  const CityStock = Parse.Object.extend("CityStock");
  const useMasterKey = true;

  // Find the most recent "In Transit" Cargo record
  const cargoQuery = new Parse.Query(Cargo);
  cargoQuery.equalTo("status", "In Transit");
  cargoQuery.descending("createdAt");

  const cargoRecord = await cargoQuery.first({ useMasterKey });
  if (!cargoRecord) {
    throw new Parse.Error(
      Parse.Error.OBJECT_NOT_FOUND,
      "No cargo in transit found.",
    );
  }

  const sourceCityId = cargoRecord.get("fromCityId");
  const destCityId = cargoRecord.get("toCityId");
  const itemQtys = cargoRecord.get("itemQtys") || [];
  const itemNames = cargoRecord.get("itemNames") || [];

  // Move stock: decrement from source, increment in destination
  for (let i = 0; i < itemNames.length; i++) {
    const productName = itemNames[i];
    const qty = itemQtys[i] || 0;
    if (qty <= 0) continue;

    // Find the Product by name
    const Product = Parse.Object.extend("Product");
    const productQuery = new Parse.Query(Product);
    productQuery.equalTo("name", productName);
    const product = await productQuery.first({ useMasterKey });
    if (!product) continue;

    const productPtr = {
      __type: "Pointer",
      className: "Product",
      objectId: product.id,
    };

    // Decrement from source city
    const fromQuery = new Parse.Query(CityStock);
    fromQuery.equalTo("product", productPtr);
    fromQuery.equalTo("city", {
      __type: "Pointer",
      className: "City",
      objectId: sourceCityId,
    });
    const fromEntry = await fromQuery.first({ useMasterKey });
    if (fromEntry) {
      const current = fromEntry.get("stock") || 0;
      fromEntry.set("stock", Math.max(0, current - qty));
      await fromEntry.save(null, { useMasterKey });
    }

    // Increment in destination city
    const toQuery = new Parse.Query(CityStock);
    toQuery.equalTo("product", productPtr);
    toQuery.equalTo("city", {
      __type: "Pointer",
      className: "City",
      objectId: destCityId,
    });
    const toEntry = await toQuery.first({ useMasterKey });
    if (toEntry) {
      toEntry.set("stock", (toEntry.get("stock") || 0) + qty);
      await toEntry.save(null, { useMasterKey });
    } else {
      const newEntry = new CityStock();
      newEntry.set("product", productPtr);
      newEntry.set("city", {
        __type: "Pointer",
        className: "City",
        objectId: destCityId,
      });
      newEntry.set("stock", qty);
      await newEntry.save(null, { useMasterKey });
    }
  }

  // Close the cargo record
  cargoRecord.set("status", "Delivered");
  cargoRecord.set("arrivedAt", new Date().toISOString());
  await cargoRecord.save(null, { useMasterKey });

  return { success: true, updatedCount: itemNames.length };
});

// Cloud Function: Clear notification badges for user
Parse.Cloud.define("clearNotifications", async (request) => {
  const user = request.user;
  if (!user) {
    throw new Parse.Error(
      Parse.Error.INVALID_SESSION_TOKEN,
      "Not authenticated.",
    );
  }
  // Store the current timestamp so getNotificationCount only counts orders updated after this point
  user.set("lastNotificationCheck", new Date().toISOString());
  await user.save(null, { useMasterKey: true });
  return { cleared: 1 };
});

// Cloud Function: Customer confirms receipt — order becomes Complete
Parse.Cloud.define("confirmReceived", async (request) => {
  const { orderId } = request.params;
  if (!orderId) {
    throw new Parse.Error(
      Parse.Error.INVALID_PARAMS,
      "Missing orderId parameter.",
    );
  }

  const Order = Parse.Object.extend("Order");
  const Delivery = Parse.Object.extend("Deliveries");

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
});

// Cloud Function: Get notification count for the current user
Parse.Cloud.define("getNotificationCount", async (request) => {
  const user = request.user;
  if (!user) {
    return { count: 0 };
  }

  const lastCheck = user.get("lastNotificationCheck");
  const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);

  // 1. Count orders with status changes
  const Order = Parse.Object.extend("Order");
  const orderQuery = new Parse.Query(Order);
  orderQuery.equalTo("user", user);
  orderQuery.containedIn("status", ["Approved", "Dispatched", "Complete"]);
  orderQuery.greaterThan("updatedAt", lastCheckDate);

  // 2. Count support messages with admin replies (management responded)
  const SupportMessage = Parse.Object.extend("SupportMessage");
  const supportQuery = new Parse.Query(SupportMessage);
  supportQuery.equalTo("user", user);
  supportQuery.exists("adminReply");
  supportQuery.greaterThan("updatedAt", lastCheckDate);

  const [orderCount, supportCount] = await Promise.all([
    orderQuery.count({ useMasterKey: true }),
    supportQuery.count({ useMasterKey: true }),
  ]);

  return { count: orderCount + supportCount };
});

// Cloud Function: Get pending order count for management dashboard
Parse.Cloud.define("getPendingOrderCount", async () => {
  const Order = Parse.Object.extend("Order");
  const query = new Parse.Query(Order);
  query.equalTo("status", "Pending Approval");
  const count = await query.count({ useMasterKey: true });
  return { count };
});

// Explicitly start the Parse API before mounting
async function start() {
  await api.start();

  app.use("/parse", api.app);
  app.use("/dashboard", dashboard);

  const server = app.listen(1337, "0.0.0.0", () => {
    console.log("--------------------------------------------");
    console.log("✅ Server: http://127.0.0.1:1337/parse");
    console.log("📊 Dashboard: http://127.0.0.1:1337/dashboard");
    console.log("--------------------------------------------");
  });

  // Manually create the LiveQuery WebSocket server on the same HTTP server
  // This is needed because we use api.start() + manual app.listen() instead of ParseServer.startApp()
  await ParseServer.createLiveQueryServer(server, {
    classNames: [
      "Product",
      "CityStock",
      "Order",
      "Deliveries",
      "City",
      "Cargo",
    ],
  });
}

start();
