import { Router, Request, Response } from "express";
import { query } from "../db/connection.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function isReviewerRole(role?: string): boolean {
  return ["admin", "manager", "leader"].includes(String(role || ""));
}

function isAdmin(role?: string): boolean {
  return String(role || "") === "admin";
}

function isEmployee(role?: string): boolean {
  return String(role || "") === "employee";
}

async function isTaskAssignedToUser(
  taskId: string,
  userId: string,
): Promise<boolean> {
  const assignmentRes = await query(
    "SELECT 1 FROM task_assignments WHERE task_id = $1 AND user_id = $2 LIMIT 1",
    [taskId, userId],
  );
  return assignmentRes.rows.length > 0;
}

function parseAssignments(
  rawAssignments: any,
): Array<{ user_id: string; responsibility: string | null }> {
  let value = rawAssignments;
  if (typeof rawAssignments === "string") {
    try {
      value = JSON.parse(rawAssignments);
    } catch {
      value = [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      user_id: item?.user_id,
      responsibility: item?.responsibility ?? null,
    }))
    .filter((item) => !!item.user_id);
}

async function getTaskWithAssignments(taskId: string) {
  const taskRes = await query(
    `SELECT
            t.*,
            COALESCE(
                json_agg(
                    json_build_object(
                        'user_id', ta.user_id,
                        'responsibility', ta.responsibility
                    )
                ) FILTER (WHERE ta.user_id IS NOT NULL),
                '[]'::json
            ) AS assignments
        FROM tasks t
        LEFT JOIN task_assignments ta ON ta.task_id = t.id
        WHERE t.id = $1
        GROUP BY t.id`,
    [taskId],
  );

  if (!taskRes.rows.length) return null;
  const task = taskRes.rows[0];
  const assignments = parseAssignments(task.assignments);

  return {
    ...task,
    assignments,
    assignedTo: assignments.length ? assignments[0].user_id : null,
    assignee_id: assignments.length ? assignments[0].user_id : null,
  };
}

router.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const tasksRes = await query(
      `SELECT
                t.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'user_id', ta.user_id,
                            'responsibility', ta.responsibility
                        )
                    ) FILTER (WHERE ta.user_id IS NOT NULL),
                    '[]'::json
                ) AS assignments
             FROM tasks t 
             LEFT JOIN task_assignments ta ON ta.task_id = t.id 
             WHERE t.is_deleted = FALSE 
             GROUP BY t.id 
             ORDER BY t.created_at DESC`,
    );
    const tasks = tasksRes.rows.map((t) => {
      const assignments = parseAssignments(t.assignments);
      return {
        ...t,
        assignments,
        assignedTo: assignments[0]?.user_id || null,
        assignee_id: assignments[0]?.user_id || null,
      };
    });
    res.json(tasks);
  } catch (err) {
    console.error("Get tasks error:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  if (!isReviewerRole(req.user?.role)) {
    return res
      .status(403)
      .json({ error: "Only reviewer roles can create tasks" });
  }
  const {
    title,
    description,
    assignedTo,
    status,
    priority,
    projectId,
    assignments,
    responsibility,
  } = req.body;
  if (!title || !projectId) {
    return res.status(400).json({ error: "Title and projectId are required" });
  }

  try {
    const taskRes = await query(
      "INSERT INTO tasks (project_id, created_by, title, description, status, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, FALSE, NOW(), NOW()) RETURNING *",
      [projectId, req.user!.id, title, description || null, status || "todo"],
    );
    const newTask = taskRes.rows[0];

    const incomingAssignments = Array.isArray(assignments)
      ? assignments.filter((item: any) => item?.userId || item?.user_id)
      : [];

    if (incomingAssignments.length) {
      for (const item of incomingAssignments) {
        await query(
          "INSERT INTO task_assignments (task_id, user_id, responsibility) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO UPDATE SET responsibility = EXCLUDED.responsibility",
          [
            newTask.id,
            item.userId || item.user_id,
            item.responsibility || null,
          ],
        );
      }
    } else if (assignedTo) {
      await query(
        "INSERT INTO task_assignments (task_id, user_id, responsibility) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO UPDATE SET responsibility = EXCLUDED.responsibility",
        [newTask.id, assignedTo, responsibility || null],
      );
    }

    const fullTask = await getTaskWithAssignments(newTask.id);
    res
      .status(201)
      .json(fullTask || { ...newTask, assignedTo, assignee_id: assignedTo });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const role = req.user?.role;
  const {
    title,
    description,
    status,
    priority,
    assignedTo,
    assignments,
    responsibility,
  } = req.body;
  const fields: string[] = [];
  const values: any[] = [];

  const hasAdminFields =
    title !== undefined ||
    description !== undefined ||
    priority !== undefined ||
    assignedTo !== undefined ||
    assignments !== undefined ||
    responsibility !== undefined;

  const hasAssignmentFields =
    assignedTo !== undefined ||
    assignments !== undefined ||
    responsibility !== undefined;

  const reviewComment =
    typeof req.body.reviewComment === "string"
      ? String(req.body.reviewComment).trim()
      : "";
  const reworkDueAt =
    typeof req.body.reworkDueAt === "string"
      ? String(req.body.reworkDueAt).trim()
      : "";

  if (isEmployee(role) && hasAdminFields) {
    return res.status(403).json({ error: "You cannot edit task content" });
  }

  if (
    !isAdmin(role) &&
    !status &&
    !(isReviewerRole(role) && hasAssignmentFields)
  ) {
    return res.status(400).json({ error: "Status is required" });
  }

  if (!isAdmin(role)) {
    const currentTask = await getTaskWithAssignments(req.params.id);
    if (!currentTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    const currentStatus = String(currentTask.status || "todo");

    if (isEmployee(role)) {
      const assigned = await isTaskAssignedToUser(req.params.id, req.user!.id);
      if (!assigned) {
        return res.status(403).json({ error: "Task is not assigned to you" });
      }

      const validTransition =
        (currentStatus === "todo" && status === "in_progress") ||
        (currentStatus === "in_progress" && status === "review");

      if (!validTransition) {
        return res.status(403).json({
          error:
            "Employees can only move assigned tasks from todo to in_progress or in_progress to review",
        });
      }
    } else if (isReviewerRole(role)) {
      if (status) {
        const validTransition =
          currentStatus === "review" &&
          (status === "done" || status === "in_progress");
        if (!validTransition) {
          return res.status(403).json({
            error:
              "Reviewer can only evaluate tasks in review and mark done or not done",
          });
        }

        if (status === "in_progress" && reworkDueAt) {
          const descriptionText = String(currentTask.description || "").replace(
            /\n?\[REWORK_DUE:[^\]]+\]/g,
            "",
          );
          const noteBlock = reviewComment
            ? `\n[REVIEW_NOTE:${reviewComment}]`
            : "";
          const dueBlock = `\n[REWORK_DUE:${reworkDueAt}]`;
          fields.push(`description = $${fields.length + 1}`);
          values.push(`${descriptionText}${noteBlock}${dueBlock}`.trim());
        } else if (status === "done" && reviewComment) {
          const descriptionText = String(currentTask.description || "").replace(
            /\n?\[REVIEW_NOTE:[^\]]+\]/g,
            "",
          );
          fields.push(`description = $${fields.length + 1}`);
          values.push(
            `${descriptionText}\n[REVIEW_NOTE:${reviewComment}]`.trim(),
          );
        }
      }
    } else {
      return res.status(403).json({ error: "You cannot update tasks" });
    }
  }

  if (title) {
    fields.push(`title = $${fields.length + 1}`);
    values.push(title);
  }
  if (description !== undefined) {
    fields.push(`description = $${fields.length + 1}`);
    values.push(description);
  }
  if (status) {
    fields.push(`status = $${fields.length + 1}`);
    values.push(status);
  }
  if (priority) {
    fields.push(`priority = $${fields.length + 1}`);
    values.push(priority);
  }

  try {
    let task;
    if (fields.length) {
      values.push(req.params.id);
      const update = await query(
        `UPDATE tasks SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values,
      );
      if (!update.rows.length)
        return res.status(404).json({ error: "Task not found" });
      task = update.rows[0];
    } else {
      const fetch = await query("SELECT * FROM tasks WHERE id = $1", [
        req.params.id,
      ]);
      if (!fetch.rows.length)
        return res.status(404).json({ error: "Task not found" });
      task = fetch.rows[0];
    }

    if (assignments !== undefined) {
      await query("DELETE FROM task_assignments WHERE task_id = $1", [
        req.params.id,
      ]);
      if (Array.isArray(assignments)) {
        for (const item of assignments) {
          const userId = item?.userId || item?.user_id;
          if (!userId) continue;
          await query(
            "INSERT INTO task_assignments (task_id, user_id, responsibility) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO UPDATE SET responsibility = EXCLUDED.responsibility",
            [req.params.id, userId, item.responsibility || null],
          );
        }
      }
    } else if (assignedTo !== undefined) {
      await query("DELETE FROM task_assignments WHERE task_id = $1", [
        req.params.id,
      ]);
      if (assignedTo) {
        await query(
          "INSERT INTO task_assignments (task_id, user_id, responsibility) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO UPDATE SET responsibility = EXCLUDED.responsibility",
          [req.params.id, assignedTo, responsibility || null],
        );
      }
    }

    const fullTask = await getTaskWithAssignments(req.params.id);
    res.json(fullTask || task);
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  if (!isAdmin(req.user?.role)) {
    return res.status(403).json({ error: "Only admin can delete tasks" });
  }
  try {
    await query(
      "UPDATE tasks SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1",
      [req.params.id],
    );
    res.status(204).send();
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
