import express from "express";
import path from "path";
import userRoutes from "./modules/users/user.route";
import authRoutes from "./modules/auth/auth.route";
import productRoutes from "./modules/products/product.route";
import cartRoutes from "./modules/cart/cart.route";
import checkoutRoutes from "./modules/checkout/checkout.route";
import orderRoutes from "./modules/orders/order.route";
import shipmentRoutes from "./modules/shipments/shipment.route";
import reviewRoutes from "./modules/reviews/review.route";
import shopRoutes from "./modules/shops/shop.route";
import adminRoutes from "./modules/admin/admin.route";
import searchRoutes from "./modules/search/search.route";
import paymentRoutes from "./modules/payments/payment.route";
import returnRoutes from "./modules/returns/return.route";
import categoryRoutes from "./modules/categories/category.route";
import notificationRoutes from "./modules/notifications/notification.route";

const app = express();

app.use(express.json());
app.get("/ui/runtime-config.js", (_req, res) => {
  res.type("application/javascript");
  res.setHeader("Cache-Control", "no-store");
  res.send(
    `window.BAMBI_GOOGLE_MAPS_EMBED_KEY = ${JSON.stringify(
      process.env.GOOGLE_MAPS_EMBED_KEY || process.env.GOOGLE_MAPS_API_KEY || ""
    )};`
  );
});
app.use("/ui", express.static(path.join(process.cwd(), "public")));

app.get("/", (req, res) => {
  res.send("🦌 Bambi E-Commerce API is running...");
});

app.use("/users", userRoutes);
app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/orders", orderRoutes);
app.use("/shipments", shipmentRoutes);
app.use("/reviews", reviewRoutes);
app.use("/shops", shopRoutes);
app.use("/admin", adminRoutes);
app.use("/search", searchRoutes);
app.use("/payments", paymentRoutes);
app.use("/returns", returnRoutes);
app.use("/categories", categoryRoutes);
app.use("/notifications", notificationRoutes);
export default app;
