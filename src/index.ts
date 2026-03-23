import "dotenv/config";
import app from "./app";
import { startScheduler } from "./jobs/scheduler";

const PORT = Number(process.env.PORT || "3000");

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

startScheduler();
