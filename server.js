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
  allowKeyOverrides: true,
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
        },
        classLevelPermissions: {
          find: { "*": true }, // Public can see list
          get: { "*": true }, // Public can see details
          create: { "*": true }, // Public can add (for your admin dev)
          update: { "*": true }, // Public can edit
          delete: { "*": true }, // Public can remove
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
