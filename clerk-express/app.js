require("dotenv").config();

console.log("PK:", process.env.CLERK_PUBLISHABLE_KEY);
console.log("SK:", process.env.CLERK_SECRET_KEY);

const express = require("express");
const { clerkMiddleware } = require("@clerk/express");

const app = express();
const PORT = 3000;

app.use(clerkMiddleware());

app.get("/", (req, res) => {
  res.send("Clerk Express is running");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});