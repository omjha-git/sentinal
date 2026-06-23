import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import * as Sentry from "@sentry/react";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

Sentry.init({
  dsn: "https://43ade20a9d5df0b0fca0f82c5cd803db@o4511426015068160.ingest.de.sentry.io/4511591058243664",
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <App />
  </ClerkProvider>
);