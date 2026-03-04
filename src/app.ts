import express from "express";
import userRoutes from "./modules/users/user.route";
import authRoutes from "./modules/auth/auth.route";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("🦌 Bambi E-Commerce API is running...");
});

app.use("/users", userRoutes);
app.use("/auth", authRoutes);
export default app;