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

// Cloud Function: Dispatch stock between cities
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

  const CityStock = Parse.Object.extend("CityStock");
  const Product = Parse.Object.extend("Product");
  const Delivery = Parse.Object.extend("Deliveries");

  // Use master key for all operations
  const useMasterKey = true;

  // Process each item
  for (const { productId, qty } of items) {
    // Use raw Pointer format for queries and saves to avoid schema validation issues
    const productPtr = {
      __type: "Pointer",
      className: "Product",
      objectId: productId,
    };
    const cityFromPtr = {
      __type: "Pointer",
      className: "City",
      objectId: sourceCityId,
    };
    const cityToPtr = {
      __type: "Pointer",
      className: "City",
      objectId: destCityId,
    };

    // Decrement from source
    const fromQuery = new Parse.Query(CityStock);
    fromQuery.equalTo("product", productPtr);
    fromQuery.equalTo("city", cityFromPtr);
    const fromEntry = await fromQuery.first({ useMasterKey });

    if (fromEntry) {
      const current = fromEntry.get("stock") || 0;
      fromEntry.set("stock", Math.max(0, current - qty));
      await fromEntry.save(null, { useMasterKey });
    }

    // Increment in destination
    const toQuery = new Parse.Query(CityStock);
    toQuery.equalTo("product", productPtr);
    toQuery.equalTo("city", cityToPtr);
    const toEntry = await toQuery.first({ useMasterKey });

    if (toEntry) {
      toEntry.set("stock", (toEntry.get("stock") || 0) + qty);
      await toEntry.save(null, { useMasterKey });
    } else {
      const newEntry = new CityStock();
      newEntry.set("product", productPtr);
      newEntry.set("city", cityToPtr);
      newEntry.set("stock", qty);
      await newEntry.save(null, { useMasterKey });
    }

    // Update product transit status
    const prodQuery = new Parse.Query(Product);
    const freshProduct = await prodQuery.get(productId, { useMasterKey });
    const eta = new Date();
    eta.setHours(eta.getHours() + 2);
    const timeString = eta.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    freshProduct.set("transitStatus", `In Transit to ${toCityName}`);
    freshProduct.set("deliveryDate", `ETA: ${timeString}`);
    await freshProduct.save(null, { useMasterKey });
  }

  // Create the Logistics Record (The Truck)
  const truck = new Delivery();
  truck.set("origin", `${fromCityName} Hub`);
  truck.set("destination", `${toCityName} Warehouse`);
  truck.set("status", "In Transit");
  truck.set("cargoCount", items.length);
  truck.set(
    "itemNames",
    manifestData.map((d) => d.name),
  );
  truck.set(
    "itemImages",
    manifestData.map((d) => d.image),
  );
  truck.set(
    "itemQtys",
    items.map((i) => i.qty),
  );
  truck.set("eta", "45 mins");
  await truck.save(null, { useMasterKey });

  return { success: true };
});

// Cloud Function: Confirm arrival of products at destination
Parse.Cloud.define("confirmArrival", async (request) => {
  const { productIds, destinationHub, destCityName } = request.params;

  if (!productIds || !destinationHub) {
    throw new Parse.Error(
      Parse.Error.INVALID_PARAMS,
      "Missing required parameters: productIds, destinationHub",
    );
  }

  const Product = Parse.Object.extend("Product");
  const Delivery = Parse.Object.extend("Deliveries");

  // 1. Close the truck record
  const deliveryQuery = new Parse.Query(Delivery);
  deliveryQuery.equalTo("status", "In Transit");
  deliveryQuery.equalTo("destination", destinationHub);
  deliveryQuery.descending("createdAt");

  const truckRecord = await deliveryQuery.first({ useMasterKey: true });
  if (truckRecord) {
    truckRecord.set("status", "Delivered");
    truckRecord.set("arrivedAt", new Date().toISOString());
    await truckRecord.save(null, { useMasterKey: true });
  }

  // 2. Mark products as delivered (skip any that no longer exist)
  let updatedCount = 0;
  for (const productId of productIds) {
    try {
      const prodQuery = new Parse.Query(Product);
      const freshProduct = await prodQuery.get(productId, {
        useMasterKey: true,
      });

      freshProduct.set("transitStatus", "");
      freshProduct.set("deliveryDate", new Date().toISOString());
      await freshProduct.save(null, { useMasterKey: true });
      updatedCount++;
    } catch (err) {
      console.warn(
        `Product ${productId} not found or could not be updated, skipping.`,
      );
    }
  }

  return { success: true, updatedCount };
});

// Explicitly start the Parse API before mounting
async function start() {
  await api.start();

  app.use("/parse", api.app);
  app.use("/dashboard", dashboard);

  app.listen(1337, "0.0.0.0", () => {
    console.log("--------------------------------------------");
    console.log("✅ Server: http://127.0.0.1:1337/parse");
    console.log("📊 Dashboard: http://127.0.0.1:1337/dashboard");
    console.log("--------------------------------------------");
  });
}

start();
