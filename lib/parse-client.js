import Parse from "parse";

const APP_ID = "stock-manage-app";
const JS_KEY = "unused";
const SERVER_URL = "http://127.0.0.1:1337/parse";

if (typeof window !== "undefined") {
  // Removed the Master Key argument to stop the SDK error
  Parse.initialize(APP_ID, JS_KEY);
  Parse.serverURL = SERVER_URL;
}

export default Parse;
