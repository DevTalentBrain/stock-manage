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
  masterKey: "admin",
  // Change localhost to 127.0.0.1 here
  serverURL: "http://127.0.0.1:1337/parse",
  publicServerURL: "http://127.0.0.1:1337/parse",

  fileUpload: {
    enableForPublic: true, // This replaces allowPublicFileUploads
    enableForAnonymousUser: true,
  },

  allowClientClassCreation: true,
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
