import Parse from "parse";

// These must be defined BEFORE you try to use them
const APP_ID = "stock-manage-app";
const JS_KEY = "unused";
const SERVER_URL = "http://127.0.0.1:1337/parse";

// This check ensures Parse only initializes on the browser (client-side)
// and prevents the "node.js environment" warning.
if (typeof window !== "undefined") {
  Parse.initialize(APP_ID, JS_KEY);
  Parse.serverURL = SERVER_URL;
}

export default Parse;
