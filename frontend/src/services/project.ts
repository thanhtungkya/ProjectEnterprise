function getAuthHeaders(): Record<string, string> {
  const session = localStorage.getItem("messenger_session");
  const token = session ? JSON.parse(session).token : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export const ProjectService = {
  async getAllProjects() {
    const response = await fetch("/api/projects", {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot retrieve projects");
    }
    return await response.json();
  },

  async getProjectById(id: string) {
    const projects = await this.getAllProjects();
    return projects.find((p: any) => p.id === id);
  },

  async getProjectsForUser(_userId: string) {
    // Current backend returns all visible projects for authenticated users.
    return await this.getAllProjects();
  },

  async createProject(data: Record<string, any>) {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot create project");
    }
    return await response.json();
  },

  async updateProject(id: string, data: Record<string, any>) {
    const response = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Cannot update project");
    }
    return await response.json();
  },
};
