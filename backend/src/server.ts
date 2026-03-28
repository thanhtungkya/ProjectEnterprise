import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// Routes
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import taskRoutes from "./routes/tasks.js";
import projectRoutes from "./routes/projects.js";
import messageRoutes from "./routes/messages.js";
import chatRoutes from "./routes/chats.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  const isEmbeddedFrontend = process.env.EMBED_FRONTEND_IN_BACKEND === "true";
  const projectRoot = path.resolve(__dirname, "..", "..");
  const frontendRootPath = path.resolve(projectRoot, "frontend");
  const frontendDistPath = path.resolve(projectRoot, "frontend/dist/frontend");

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "postgresql" });
  });

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/chats", chatRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && isEmbeddedFrontend) {
    const vite = await createViteServer({
      root: frontendRootPath,
      server: { middlewareMode: true, hmr: false },
      appType: "mpa",
    });

    app.get(["/", "/index.html", "/dashboard.html"], async (req, res, next) => {
      try {
        const requested =
          req.path === "/" ? "/public/index.html" : `/public${req.path}`;
        const htmlPath = path.join(frontendRootPath, requested.slice(1));
        const template = await fs.readFile(htmlPath, "utf-8");
        const transformed = await vite.transformIndexHtml(requested, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
      } catch (err) {
        next(err);
      }
    });

    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV !== "production") {
    app.get("/", (req, res) => {
      res.status(200).json({
        status: "ok",
        message:
          "API server is running. Start frontend with npm run dev:frontend",
      });
    });
  } else {
    app.use(express.static(frontendDistPath));
    app.get("*", (req, res) => {
      const target =
        req.path === "/dashboard.html" ? "dashboard.html" : "index.html";
      res.sendFile(path.join(frontendDistPath, target));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
