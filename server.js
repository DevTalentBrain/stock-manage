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
          create: { "role:admin": true },
          update: { "role:admin": true },
          delete: { "role:admin": true },
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
          create: { "role:admin": true },
          update: { "role:admin": true },
          delete: { "role:admin": true },
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
          create: { "role:admin": true },
          update: { "role:admin": true },
          delete: { "role:admin": true },
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
          find: { "role:admin": true, "role:manager": true },
          get: { "role:admin": true, "role:manager": true },
          create: { "*": true },
          update: { "role:admin": true, "role:manager": true },
          delete: { "role:admin": true },
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
          find: { "role:admin": true, "role:manager": true },
          get: { "role:admin": true, "role:manager": true },
          create: { "*": true },
          update: { "role:admin": true, "role:manager": true },
          delete: { "role:admin": true },
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
          find: { "role:admin": true, "role:manager": true },
          get: { "role:admin": true, "role:manager": true },
          create: { "role:admin": true, "role:manager": true },
          update: { "role:admin": true, "role:manager": true },
          delete: { "role:admin": true },
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

// Explicitly start the Parse API before mounting
async function start() {
  await api.start();

  // Load Cloud Functions after Parse is initialized
  require("./cloud/main");

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
