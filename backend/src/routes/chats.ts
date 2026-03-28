import { Router, Request, Response } from "express";
import { query } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const chatsRes = await query(
      `SELECT
                c.*,
                COALESCE(array_agg(cm.user_id) FILTER (WHERE cm.user_id IS NOT NULL), '{}'::uuid[]) AS member_ids
            FROM chats c
            LEFT JOIN chat_members cm ON cm.chat_id = c.id
            WHERE c.is_deleted = FALSE
            GROUP BY c.id
            HAVING $1::uuid = ANY(COALESCE(array_agg(cm.user_id) FILTER (WHERE cm.user_id IS NOT NULL), '{}'::uuid[]))
            ORDER BY c.created_at DESC`,
      [req.user!.id],
    );
    res.json(chatsRes.rows);
  } catch (err) {
    console.error("Get chats error:", err);
    res.status(500).json({ error: "Failed to fetch chats" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  if (req.user?.role === "employee") {
    return res.status(403).json({ error: "Employees cannot create channels" });
  }

  const { name, type, projectId, departmentId } = req.body;
  if (!type) return res.status(400).json({ error: "Chat type required" });

  try {
    const chatRes = await query(
      "INSERT INTO chats (name, type, project_id, department_id, is_deleted, created_at, updated_at) VALUES ($1,$2,$3,$4,FALSE,NOW(),NOW()) RETURNING *",
      [name || null, type, projectId || null, departmentId || null],
    );
    const chat = chatRes.rows[0];

    await query(
      "INSERT INTO chat_members (chat_id, user_id, joined_at) VALUES ($1, $2, NOW()) ON CONFLICT (chat_id, user_id) DO NOTHING",
      [chat.id, req.user!.id],
    );

    res.status(201).json({ ...chat, member_ids: [req.user!.id] });
  } catch (err) {
    console.error("Create chat error:", err);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

export default router;
