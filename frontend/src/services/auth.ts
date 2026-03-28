export const AuthService = {
  async login(username: string, password: string) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        const session = {
          user: data.user,
          token: data.token,
        };
        localStorage.setItem("messenger_session", JSON.stringify(session));
        return { success: true, user: data.user };
      }
      return { success: false, message: data.error || "Login failed" };
    } catch (err) {
      console.error("Login error:", err);
      return { success: false, message: "Server connection error" };
    }
  },

  logout() {
    localStorage.removeItem("messenger_session");
    window.location.href = "index.html";
  },

  getSession() {
    const session = localStorage.getItem("messenger_session");
    return session ? JSON.parse(session) : null;
  },

  getCurrentUser() {
    const session = this.getSession();
    return session ? session.user : null;
  },

  getToken() {
    const session = this.getSession();
    return session ? session.token : null;
  },

  isAuthenticated() {
    const session = this.getSession();
    return !!(session && session.user && session.token);
  },

  checkAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = "index.html";
    }
  },

  async verifySession() {
    const token = this.getToken();
    if (!token) return null;

    const response = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  },

  async requireAuth() {
    if (!this.isAuthenticated()) {
      this.logout();
      return null;
    }

    try {
      const user = await this.verifySession();
      if (!user) {
        this.logout();
        return null;
      }

      const session = this.getSession();
      localStorage.setItem(
        "messenger_session",
        JSON.stringify({ ...session, user }),
      );
      return user;
    } catch (err) {
      console.error("Session validation error:", err);
      this.logout();
      return null;
    }
  },

  async getAllUsers() {
    const token = this.getToken();
    const response = await fetch("/api/users", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch users");
    }
    return await response.json();
  },

  async updateUser(id: string, data: Record<string, any>) {
    const token = this.getToken();
    const response = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update user");
    }
    const updatedUser = await response.json();

    const current = this.getCurrentUser();
    if (current && current.id === updatedUser.id) {
      const session = this.getSession();
      session.user = updatedUser;
      localStorage.setItem("messenger_session", JSON.stringify(session));
    }

    return updatedUser;
  },

  async createUser(data: Record<string, any>) {
    const token = this.getToken();
    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create user");
    }
    return await response.json();
  },

  async deleteUser(id: string) {
    const token = this.getToken();
    const response = await fetch(`/api/users/${id}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete user");
    }
    return true;
  },

  async getDepartments() {
    return [
      { id: "d1", name: "IT & Engineering" },
      { id: "d2", name: "Human Resources" },
      { id: "d3", name: "Sales & Marketing" },
    ];
  },
};
