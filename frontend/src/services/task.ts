function getAuthHeaders(): Record<string, string> {
  const session = localStorage.getItem("messenger_session");
  const token = session ? JSON.parse(session).token : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export const TaskService = {
  async getAllTasks() {
    const response = await fetch("/api/tasks", {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot retrieve tasks");
    }
    return await response.json();
  },

  async getTasksForUser(userId: string) {
    const tasks = await this.getAllTasks();
    return tasks.filter((t: any) => {
      const inAssignments = Array.isArray(t.assignments)
        ? t.assignments.some(
            (a: any) => a?.user_id === userId || a?.userId === userId,
          )
        : false;
      return (
        t.assignedTo === userId || t.assignee_id === userId || inAssignments
      );
    });
  },

  async updateStatus(id: string, newStatus: string) {
    const response = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot update task status");
    }
    return await response.json();
  },

  async createTask(data: Record<string, any>) {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot create task");
    }
    return await response.json();
  },

  async updateTask(id: string, data: Record<string, any>) {
    const response = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot update task");
    }
    return await response.json();
  },
};
