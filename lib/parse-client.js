import Parse from "parse";

const APP_ID = "stock-manage-app";
const JS_KEY = "unused";
const SERVER_URL = "http://127.0.0.1:1337/parse";

if (typeof window !== "undefined") {
  Parse.initialize(APP_ID, JS_KEY);
  Parse.serverURL = SERVER_URL;

  // 🚩 SAFE SESSION CHECK (No StorageController needed)
  const validateSession = async () => {
    const currentUser = Parse.User.current();
    if (currentUser) {
      try {
        // This simple call verifies if the token is valid on the server
        await Parse.Session.current();
      } catch (error) {
        if (error.code === 209) {
          console.warn("Invalid Session detected. Cleaning up...");
          // We use the SDK's own logout to clean the storage correctly
          await Parse.User.logOut();
          localStorage.clear();
          window.location.reload();
        }
      }
    }
  };

  validateSession();
}

export default Parse;
