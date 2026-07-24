import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App.jsx";
import "./index.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const hasClerk =
  PUBLISHABLE_KEY &&
  PUBLISHABLE_KEY.startsWith("pk_") &&
  PUBLISHABLE_KEY.length > 20 &&
  PUBLISHABLE_KEY !== "pk_test_your_key_here";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {hasClerk ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App clerkEnabled />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
