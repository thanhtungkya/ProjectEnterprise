import { Router, Request, Response } from "express";
import { query } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function requireAdmin(req: Request, res: Response): boolean {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Only admin can modify projects" });
    return false;
  }
  return true;
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const projects = await query(
      `SELECT p.*, d.name AS department_name
       FROM projects p
       LEFT JOIN departments d ON d.id = p.department_id
       WHERE p.is_deleted = FALSE
       ORDER BY p.created_at DESC`,
    );
    res.json(projects.rows);
  } catch (err) {
    console.error("Get projects error:", err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { name, description, status, progress, departmentId } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  try {
    const projectRes = await query(
      "INSERT INTO projects (name, description, department_id, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, FALSE, NOW(), NOW()) RETURNING *",
      [name, description || null, departmentId || null],
    );
    const project = projectRes.rows[0];
    res.status(201).json({
      ...project,
      status: status || project.status || "active",
      progress:
        typeof progress === "number" ? progress : (project.progress ?? 0),
    });
  } catch (err) {
    console.error("Create project error:", err);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { name, description, status, progress, departmentId } = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  if (name) {
    fields.push(`name = $${fields.length + 1}`);
    values.push(name);
  }
  if (description !== undefined) {
    fields.push(`description = $${fields.length + 1}`);
    values.push(description);
  }
  if (status) {
    fields.push(`status = $${fields.length + 1}`);
    values.push(status);
  }
  if (progress !== undefined) {
    fields.push(`progress = $${fields.length + 1}`);
    values.push(progress);
  }
  if (departmentId !== undefined) {
    fields.push(`department_id = $${fields.length + 1}`);
    values.push(departmentId || null);
  }

  if (!fields.length)
    return res.status(400).json({ error: "No fields to update" });

  try {
    values.push(req.params.id);
    const projectRes = await query(
      `UPDATE projects SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!projectRes.rows.length)
      return res.status(404).json({ error: "Project not found" });

    const fullRes = await query(
      `SELECT p.*, d.name AS department_name
       FROM projects p
       LEFT JOIN departments d ON d.id = p.department_id
       WHERE p.id = $1`,
      [projectRes.rows[0].id],
    );
    res.json(fullRes.rows[0]);
  } catch (err) {
    console.error("Update project error:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  try {
    await query(
      "UPDATE projects SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1",
      [req.params.id],
    );
    res.status(204).send();
  } catch (err) {
    console.error("Delete project error:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
