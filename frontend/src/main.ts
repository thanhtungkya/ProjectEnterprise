import { AuthService } from "./services/auth.ts";
import { RBAC } from "./utils/rbac.ts";
import { ChatService } from "./services/chat.ts";
import { TaskService } from "./services/task.ts";
import { ProjectService } from "./services/project.ts";

type ViewName =
  | "dashboard"
  | "messages"
  | "tasks"
  | "projects"
  | "team"
  | "settings"
  | "administration";

document.addEventListener("DOMContentLoaded", async () => {
  AuthService.checkAuth();
  const user = AuthService.getCurrentUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  setupTopbar(user);
  setupSidebarNavigation();
  RBAC.applyPermissions(user.role);
  await switchView("dashboard");
});

function generateAvatar(username: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

function setupTopbar(user: any) {
  const userNameEl = document.getElementById("user-name");
  const userRoleEl = document.getElementById("user-role");
  const userAvatarEl = document.getElementById("user-avatar") as HTMLImageElement | null;
  const dropdownUserNameEl = document.getElementById("dropdown-user-name");
  const trigger = document.getElementById("user-menu-trigger");
  const dropdown = document.getElementById("user-dropdown");
  const logoutBtn = document.getElementById("dropdown-logout");

  if (userNameEl) userNameEl.textContent = user.username || "User";
  if (userRoleEl) userRoleEl.textContent = (user.role || "employee").toUpperCase();
  if (dropdownUserNameEl) dropdownUserNameEl.textContent = user.username || "User";

  if (userAvatarEl) {
    userAvatarEl.src = user.avatar || generateAvatar(user.username || "User");
    userAvatarEl.onerror = () => {
      userAvatarEl.src = generateAvatar(user.username || "User");
    };
  }

  if (trigger) {
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle("show");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      AuthService.logout();
      window.location.href = "index.html";
    });
  }

  document.addEventListener("click", () => {
    dropdown?.classList.remove("show");
  });
}

function setupSidebarNavigation() {
  const navItems = Array.from(document.querySelectorAll(".nav-item"));

  navItems.forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      const view = target.dataset.view as ViewName | undefined;
      if (!view) return;

      navItems.forEach((el) => el.classList.remove("active"));
      target.classList.add("active");

      await switchView(view);
    });
  });

  // Support inline handlers in HTML dropdown.
  (window as any).switchView = switchView;
}

async function switchView(view: ViewName) {
  const contentArea = document.getElementById("main-content");
  const titleEl = document.getElementById("current-view-title");
  if (!contentArea) return;

  if (titleEl) {
    titleEl.textContent = view.charAt(0).toUpperCase() + view.slice(1);
  }

  contentArea.innerHTML =
    '<div class="flex items-center justify-center h-full"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>';

  try {
    switch (view) {
      case "dashboard":
        await renderDashboard();
        break;
      case "messages":
        await renderMessages();
        break;
      case "tasks":
        await renderTasks();
        break;
      case "projects":
        await renderProjects();
        break;
      case "team":
        await renderTeam();
        break;
      case "settings":
        await renderSettings();
        break;
      case "administration":
        await renderAdministration();
        break;
      default:
        renderError("View not found");
    }
  } catch (error) {
    console.error(`Error rendering view ${view}:`, error);
    renderError("Khong the tai giao dien. Vui long thu lai.");
  }
}

function renderError(message: string) {
  const contentArea = document.getElementById("main-content");
  if (!contentArea) return;
  contentArea.innerHTML = `<div class="bg-white border border-red-200 rounded-xl p-6 text-red-600">${message}</div>`;
}

async function renderDashboard() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;

  let taskCount = 0;
  try {
    const tasks = user.role === "admin" ? await TaskService.getAllTasks() : await TaskService.getTasksForUser(user.id);
    taskCount = Array.isArray(tasks) ? tasks.length : 0;
  } catch {
    taskCount = 0;
  }

  contentArea.innerHTML = `
    <div class="space-y-8">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 class="text-3xl font-bold text-slate-900">Welcome, ${user.username}</h1>
        <p class="text-slate-600 mt-2">Role: ${user.role}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div class="text-indigo-600 font-bold text-2xl">${taskCount}</div>
          <div class="text-slate-500 text-sm">Tasks</div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div class="text-emerald-600 font-bold text-2xl">Online</div>
          <div class="text-slate-500 text-sm">System status</div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div class="text-amber-600 font-bold text-2xl">Secure</div>
          <div class="text-slate-500 text-sm">Encrypted communication</div>
        </div>
      </div>
    </div>
  `;
}

async function renderMessages() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;

  let count = 0;
  try {
    const chats = await ChatService.getChatsForUser(user.id);
    count = Array.isArray(chats) ? chats.length : 0;
  } catch {
    count = 0;
  }

  contentArea.innerHTML = `
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 class="text-2xl font-bold text-slate-900 mb-2">Messages</h2>
      <p class="text-slate-600">${count} conversation(s) found.</p>
      <p class="text-slate-500 mt-4">Neu backend tam thoi loi, view van click duoc va khong bi trang.</p>
    </div>
  `;
}

async function renderTasks() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;

  let tasks: any[] = [];
  try {
    tasks = await TaskService.getTasksForUser(user.id);
    if (!Array.isArray(tasks)) tasks = [];
  } catch {
    tasks = [];
  }

  contentArea.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 class="text-2xl font-bold text-slate-900">Tasks</h2>
        <p class="text-slate-600 mt-2">You have ${tasks.length} task(s).</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${tasks
          .slice(0, 6)
          .map(
            (task) => `
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div class="font-semibold text-slate-900">${task.title || "Untitled task"}</div>
            <div class="text-sm text-slate-500 mt-1">${task.status || "todo"}</div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

async function renderProjects() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;

  let projects: any[] = [];
  try {
    projects = await ProjectService.getProjectsForUser(user.id);
    if (!Array.isArray(projects)) projects = [];
  } catch {
    projects = [];
  }

  contentArea.innerHTML = `
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 class="text-2xl font-bold text-slate-900">Projects</h2>
      <p class="text-slate-600 mt-2">${projects.length} project(s) available.</p>
    </div>
  `;
}

async function renderTeam() {
  const contentArea = document.getElementById("main-content");
  if (!contentArea) return;

  let users: any[] = [];
  try {
    users = await AuthService.getAllUsers();
    if (!Array.isArray(users)) users = [];
  } catch {
    users = [];
  }

  contentArea.innerHTML = `
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 class="text-2xl font-bold text-slate-900">Team</h2>
      <p class="text-slate-600 mt-2">${users.length} member(s).</p>
      <div class="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${users
          .slice(0, 9)
          .map(
            (u) => `
          <div class="border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <img src="${generateAvatar(u.username || "User")}" class="w-10 h-10 rounded-full" alt="avatar" />
            <div>
              <div class="font-semibold text-slate-900">${u.username || "Unknown"}</div>
              <div class="text-xs text-slate-500">${u.role || "employee"}</div>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;
}

async function renderSettings() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;

  contentArea.innerHTML = `
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 class="text-2xl font-bold text-slate-900">Settings</h2>
      <p class="text-slate-600 mt-2">Account: ${user.username}</p>
      <p class="text-slate-600">Role: ${user.role}</p>
    </div>
  `;
}

async function renderAdministration() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;

  if (user.role !== "admin") {
    renderError("Ban khong co quyen truy cap muc nay.");
    return;
  }

  let users: any[] = [];
  try {
    users = await AuthService.getAllUsers();
    if (!Array.isArray(users)) users = [];
  } catch {
    users = [];
  }

  contentArea.innerHTML = `
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h2 class="text-2xl font-bold text-slate-900">Administration</h2>
      <p class="text-slate-600 mt-2">Total users: ${users.length}</p>
    </div>
  `;
}
