import { AuthService } from "./services/auth";
import { RBAC } from "./utils/rbac";
import { ChatService } from "./services/chat";
import { TaskService } from "./services/task";
import { ProjectService } from "./services/project";

const appState = {
  activeChannelId: "" as string,
  departmentFilter: "all" as string,
  projectDepartmentFilter: "all" as string,
  currentView: "dashboard" as ViewName,
  sidebarCollapsed: false,
  sidebarOpenMobile: false,
  messageRefreshTimer: null as ReturnType<typeof setInterval> | null,
  messageSignature: "" as string,
  topbarOutsideHandlerBound: false,
  notificationPollTimer: null as ReturnType<typeof setInterval> | null,
  notificationUnreadCount: 0,
  notificationItems: [] as Array<{
    id: string;
    scope: "messages" | "tasks" | "projects" | "team";
    title: string;
    detail: string;
    timestamp: number;
    isRead: boolean;
  }>,
  notificationSignatures: {
    messages: "",
    tasks: "",
    projects: "",
    team: "",
  },
  notificationBaselineReady: false,
  notificationStats: null as {
    messagesCount: number;
    tasksCount: number;
    doneTasksCount: number;
    reviewTasksCount: number;
    overdueEmployeeTaskCount: number;
    projectsCount: number;
    teamMemberCount: number;
    teamOthersHash: string;
    myDepartmentId: string;
    myProfileHash: string;
    myDeptMemberCount: number;
  } | null,
};

const NOTIFICATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_TASK_DEADLINE_HOURS = 72;

type ViewName =
  | "dashboard"
  | "messages"
  | "tasks"
  | "projects"
  | "team"
  | "settings"
  | "profile"
  | "administration";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await AuthService.requireAuth();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  setupTopbar(user);
  setupSidebarNavigation();
  setupSidebarToggle();
  setupNotificationCenter(user);
  RBAC.applyPermissions(user.role);
  await switchView("dashboard");
});

function generateAvatar(username: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "done":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
      return "bg-indigo-100 text-indigo-700";
    case "review":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getDepartmentLabel(departmentId: string): string {
  const map: Record<string, string> = {
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01": "IT & Engineering",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02": "Human Resources",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03": "Sales & Marketing",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04": "Finance",
  };
  return map[departmentId] || "Unknown";
}

function getDepartmentTagClass(departmentId: string): string {
  switch (departmentId) {
    case "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01":
      return "bg-sky-100 text-sky-700";
    case "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02":
      return "bg-rose-100 text-rose-700";
    case "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03":
      return "bg-amber-100 text-amber-700";
    case "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function setupTopbar(user: any) {
  const userNameEl = document.getElementById("user-name");
  const userRoleEl = document.getElementById("user-role");
  const userAvatarEl = document.getElementById(
    "user-avatar",
  ) as HTMLImageElement | null;
  const dropdownUserNameEl = document.getElementById("dropdown-user-name");
  const trigger = document.getElementById("user-menu-trigger");
  const dropdown = document.getElementById("user-dropdown");
  const logoutBtn = document.getElementById("dropdown-logout");
  const notificationDropdown = document.getElementById("notification-dropdown");

  if (userNameEl) userNameEl.textContent = user.username || "User";
  if (userRoleEl)
    userRoleEl.textContent = (user.role || "employee").toUpperCase();
  if (dropdownUserNameEl)
    dropdownUserNameEl.textContent = user.username || "User";

  if (userAvatarEl) {
    userAvatarEl.src = user.avatar || generateAvatar(user.username || "User");
    userAvatarEl.onerror = () => {
      userAvatarEl.src = generateAvatar(user.username || "User");
    };
  }

  if (trigger) {
    trigger.onclick = (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle("show");
      notificationDropdown?.classList.remove("show");
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      stopNotificationPolling();
      AuthService.logout();
      window.location.href = "index.html";
    };
  }

  if (!appState.topbarOutsideHandlerBound) {
    document.addEventListener("click", () => {
      dropdown?.classList.remove("show");
      notificationDropdown?.classList.remove("show");
    });
    appState.topbarOutsideHandlerBound = true;
  }
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

      if (window.matchMedia("(max-width: 1024px)").matches) {
        setSidebarState({ sidebarOpenMobile: false });
      }

      await switchView(view);
    });
  });

  (window as any).switchView = switchView;
}

function setSidebarState(partial: {
  sidebarCollapsed?: boolean;
  sidebarOpenMobile?: boolean;
}) {
  const layout = document.getElementById("dashboard-layout");
  if (!layout) return;

  if (typeof partial.sidebarCollapsed === "boolean") {
    appState.sidebarCollapsed = partial.sidebarCollapsed;
  }
  if (typeof partial.sidebarOpenMobile === "boolean") {
    appState.sidebarOpenMobile = partial.sidebarOpenMobile;
  }

  layout.classList.toggle("sidebar-collapsed", appState.sidebarCollapsed);
  layout.classList.toggle("sidebar-open", appState.sidebarOpenMobile);
}

function setupSidebarToggle() {
  const toggleBtn = document.getElementById("sidebar-toggle");
  const overlay = document.getElementById("sidebar-overlay");

  toggleBtn?.addEventListener("click", () => {
    const isMobile = window.matchMedia("(max-width: 1024px)").matches;
    if (isMobile) {
      setSidebarState({ sidebarOpenMobile: !appState.sidebarOpenMobile });
      return;
    }

    setSidebarState({ sidebarCollapsed: !appState.sidebarCollapsed });
  });

  overlay?.addEventListener("click", () => {
    setSidebarState({ sidebarOpenMobile: false });
  });

  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 1024px)").matches) {
      setSidebarState({ sidebarOpenMobile: false });
    }
  });
}

function stopMessageAutoRefresh() {
  if (appState.messageRefreshTimer) {
    clearInterval(appState.messageRefreshTimer);
    appState.messageRefreshTimer = null;
  }
}

function computeMessageSignature(messages: any[]): string {
  if (!messages.length) return "empty";
  const last = messages[messages.length - 1];
  return `${messages.length}:${last?.id || ""}:${last?.updated_at || last?.created_at || ""}`;
}

function stopNotificationPolling() {
  if (appState.notificationPollTimer) {
    clearInterval(appState.notificationPollTimer);
    appState.notificationPollTimer = null;
  }
}

function normalizeDateMs(value: unknown): number {
  const ms = new Date(String(value || "")).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function getTaskDeadlineMs(task: any): number {
  const description = String(task?.description || "");
  const reworkMatch = description.match(/\[REWORK_DUE:([^\]]+)\]/);
  if (reworkMatch?.[1]) {
    const reworkMs = normalizeDateMs(reworkMatch[1]);
    if (reworkMs > 0) return reworkMs;
  }

  const explicit =
    task?.due_at || task?.dueAt || task?.deadline_at || task?.deadline;
  const explicitMs = explicit ? normalizeDateMs(explicit) : 0;
  if (explicitMs > 0) return explicitMs;

  const baseMs =
    normalizeDateMs(task?.updated_at || task?.created_at) || Date.now();
  return baseMs + DEFAULT_TASK_DEADLINE_HOURS * 60 * 60 * 1000;
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return "Expired";
  const totalMinutes = Math.floor(msRemaining / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatNotificationTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function pruneExpiredNotifications() {
  const cutoff = Date.now() - NOTIFICATION_TTL_MS;
  appState.notificationItems = appState.notificationItems.filter(
    (item) => item.timestamp >= cutoff,
  );
}

function recomputeUnreadCount() {
  appState.notificationUnreadCount = appState.notificationItems.filter(
    (item) => !item.isRead,
  ).length;
}

function renderNotificationCenter() {
  pruneExpiredNotifications();
  recomputeUnreadCount();

  const badge = document.getElementById("notification-badge");
  const list = document.getElementById("notification-list");

  if (badge) {
    if (appState.notificationUnreadCount > 0) {
      badge.textContent =
        appState.notificationUnreadCount > 99
          ? "99+"
          : String(appState.notificationUnreadCount);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  if (list) {
    if (!appState.notificationItems.length) {
      list.innerHTML =
        '<div class="px-4 py-6 text-sm text-slate-500 text-center">No new notifications.</div>';
    } else {
      list.innerHTML = appState.notificationItems
        .slice(0, 20)
        .map(
          (item) => `
          <button type="button" data-notification-id="${escapeHtml(item.id)}" data-notification-scope="${escapeHtml(item.scope)}" class="notification-item w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50">
            <div class="flex items-center justify-between gap-2">
              <div class="text-sm font-semibold text-slate-900 flex items-center gap-2">
                ${item.isRead ? "" : '<span class="notification-unread-dot"></span>'}
                ${escapeHtml(item.title)}
              </div>
              <span class="text-[11px] text-slate-400">${escapeHtml(formatNotificationTime(item.timestamp))}</span>
            </div>
            <div class="text-xs text-slate-500 mt-1">${escapeHtml(item.detail)}</div>
          </button>
        `,
        )
        .join("");

      list.querySelectorAll("[data-notification-scope]").forEach((el) => {
        el.addEventListener("click", async () => {
          const id = (el as HTMLElement).dataset.notificationId;
          const scope = (el as HTMLElement).dataset.notificationScope as
            | ViewName
            | undefined;
          if (!scope || !id) return;

          appState.notificationItems = appState.notificationItems.filter(
            (item) => item.id !== id,
          );
          renderNotificationCenter();
          document
            .getElementById("notification-dropdown")
            ?.classList.remove("show");

          const navItems = Array.from(document.querySelectorAll(".nav-item"));
          navItems.forEach((item) => item.classList.remove("active"));
          const targetNav = document.querySelector(
            `.nav-item[data-view='${scope}']`,
          ) as HTMLElement | null;
          targetNav?.classList.add("active");
          await switchView(scope);
        });
      });
    }
  }
}

function enqueueNotification(entry: {
  scope: "messages" | "tasks" | "projects" | "team";
  title: string;
  detail: string;
}) {
  pruneExpiredNotifications();

  const notification = {
    id: `${entry.scope}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    isRead: false,
    ...entry,
  };
  appState.notificationItems = [
    notification,
    ...appState.notificationItems,
  ].slice(0, 50);
  renderNotificationCenter();
}

async function getMessagesGlobalDigest(userId: string): Promise<{
  signature: string;
  total: number;
}> {
  let chats: any[] = [];
  try {
    chats = await ChatService.getChatsForUser(userId);
    if (!Array.isArray(chats)) chats = [];
  } catch {
    chats = [];
  }

  const channelIds = chats.map((chat) => String(chat.id || "")).filter(Boolean);
  if (!channelIds.length) {
    return {
      signature: "channels:0:messages:0:last:0",
      total: 0,
    };
  }

  const results = await Promise.all(
    channelIds.map(async (channelId) => {
      try {
        const list = await ChatService.getMessages(channelId);
        const messages = Array.isArray(list) ? list : [];
        const latest = messages[messages.length - 1];
        const latestMs = normalizeDateMs(
          latest?.updated_at || latest?.created_at || latest?.sent_at,
        );
        const tail = messages
          .slice(-3)
          .map((m) => String(m?.id || ""))
          .join(",");
        return {
          count: messages.length,
          latestMs,
          tail,
        };
      } catch {
        return {
          count: 0,
          latestMs: 0,
          tail: "",
        };
      }
    }),
  );

  const totalCount = results.reduce((sum, item) => sum + item.count, 0);
  const latestMs = results.reduce(
    (max, item) => Math.max(max, item.latestMs),
    0,
  );
  const tails = results.map((item) => item.tail).join("|");
  return {
    signature: `channels:${channelIds.length}:messages:${totalCount}:last:${latestMs}:tails:${tails}`,
    total: totalCount,
  };
}

async function collectNotificationDataset(user: any): Promise<{
  messages: string;
  tasks: string;
  projects: string;
  team: string;
  stats: {
    messagesCount: number;
    tasksCount: number;
    doneTasksCount: number;
    reviewTasksCount: number;
    overdueEmployeeTaskCount: number;
    projectsCount: number;
    teamMemberCount: number;
    teamOthersHash: string;
    myDepartmentId: string;
    myProfileHash: string;
    myDeptMemberCount: number;
  };
}> {
  const isLeaderPlus = ["admin", "manager", "leader"].includes(
    String(user.role || ""),
  );

  const [tasksRaw, projectsRaw, usersRaw, messagesDigest, freshUser] =
    await Promise.all([
      (async () => {
        try {
          if (isLeaderPlus) {
            return await TaskService.getAllTasks();
          }
          return await TaskService.getTasksForUser(user.id);
        } catch {
          return [];
        }
      })(),
      (async () => {
        try {
          if (isLeaderPlus && "getAllProjects" in ProjectService) {
            return await (ProjectService as any).getAllProjects();
          }
          return await ProjectService.getProjectsForUser(user.id);
        } catch {
          return [];
        }
      })(),
      (async () => {
        try {
          return await AuthService.getAllUsers();
        } catch {
          return [user];
        }
      })(),
      getMessagesGlobalDigest(String(user.id || "")),
      (async () => {
        try {
          return await AuthService.verifySession();
        } catch {
          return null;
        }
      })(),
    ]);

  const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
  const projects = Array.isArray(projectsRaw) ? projectsRaw : [];
  const users = Array.isArray(usersRaw) ? usersRaw : [];
  const me =
    freshUser ||
    users.find(
      (member) => String(member?.id || "") === String(user.id || ""),
    ) ||
    user;
  const myDepartmentId = String(me?.department_id || "");

  const taskSignature = tasks
    .map(
      (task) =>
        `${String(task.id || "")}:${String(task.status || "")}:${String(task.title || "")}:${normalizeDateMs(task.updated_at || task.created_at)}`,
    )
    .sort()
    .join("|");

  const projectSignature = projects
    .map(
      (project) =>
        `${String(project.id || "")}:${String(project.name || "")}:${String(project.progress || 0)}:${String(project.department_id || "")}:${normalizeDateMs(project.updated_at || project.created_at)}`,
    )
    .sort()
    .join("|");

  const teamSignature = users
    .map(
      (member) =>
        `${String(member.id || "")}:${String(member.username || "")}:${String(member.role || "")}:${String(member.department_id || "")}:${String(member.avatar || "")}:${normalizeDateMs(member.updated_at || member.created_at)}`,
    )
    .sort()
    .join("|");

  const teamOthersHash = users
    .filter((member) => String(member?.id || "") !== String(user.id || ""))
    .map(
      (member) =>
        `${String(member.id || "")}:${String(member.username || "")}:${String(member.role || "")}:${String(member.department_id || "")}:${normalizeDateMs(member.updated_at || member.created_at)}`,
    )
    .sort()
    .join("|");

  const myDeptMemberCount = myDepartmentId
    ? users.filter(
        (member) => String(member?.department_id || "") === myDepartmentId,
      ).length
    : 0;

  const doneTasksCount = tasks.filter((task) => task.status === "done").length;
  const reviewTasksCount = tasks.filter(
    (task) => task.status === "review",
  ).length;
  const myProfileHash = `${String(me?.username || "")}:${String(me?.role || "")}:${String(me?.avatar || "")}:${myDepartmentId}`;

  const userRoleById = new Map<string, string>();
  users.forEach((member) => {
    userRoleById.set(String(member.id || ""), String(member.role || ""));
  });

  const overdueEmployeeTaskCount = tasks.filter((task) => {
    if (String(task?.status || "") === "done") return false;
    if (getTaskDeadlineMs(task) > Date.now()) return false;

    const assignments = Array.isArray(task?.assignments)
      ? task.assignments
      : [];
    return assignments.some((item: any) => {
      const uid = String(item?.user_id || item?.userId || "");
      return userRoleById.get(uid) === "employee";
    });
  }).length;

  return {
    messages: messagesDigest.signature,
    tasks: taskSignature,
    projects: projectSignature,
    team: teamSignature,
    stats: {
      messagesCount: messagesDigest.total,
      tasksCount: tasks.length,
      doneTasksCount,
      reviewTasksCount,
      overdueEmployeeTaskCount,
      projectsCount: projects.length,
      teamMemberCount: users.length,
      teamOthersHash,
      myDepartmentId,
      myProfileHash,
      myDeptMemberCount,
    },
  };
}

async function refreshNotificationState() {
  const user = AuthService.getCurrentUser();
  if (!user) return;
  const isLeaderPlus = ["admin", "manager", "leader"].includes(
    String(user.role || ""),
  );

  try {
    const next = await collectNotificationDataset(user);

    if (!appState.notificationBaselineReady) {
      appState.notificationSignatures = {
        messages: next.messages,
        tasks: next.tasks,
        projects: next.projects,
        team: next.team,
      };
      appState.notificationStats = next.stats;
      appState.notificationBaselineReady = true;
      renderNotificationCenter();
      return;
    }

    const prevStats = appState.notificationStats;
    const prevSignatures = appState.notificationSignatures;
    if (!prevStats) {
      appState.notificationStats = next.stats;
      appState.notificationSignatures = {
        messages: next.messages,
        tasks: next.tasks,
        projects: next.projects,
        team: next.team,
      };
      return;
    }

    if (next.messages !== prevSignatures.messages) {
      enqueueNotification({
        scope: "messages",
        title: "Tin nhan moi",
        detail:
          next.stats.messagesCount > prevStats.messagesCount
            ? `Ban co ${next.stats.messagesCount - prevStats.messagesCount} tin nhan moi.`
            : "Noi dung tin nhan da duoc cap nhat.",
      });
    }

    if (isLeaderPlus) {
      if (next.stats.reviewTasksCount > prevStats.reviewTasksCount) {
        enqueueNotification({
          scope: "tasks",
          title: "Can kiem tra danh gia",
          detail: `${next.stats.reviewTasksCount - prevStats.reviewTasksCount} task moi dang cho review.`,
        });
      }

      if (
        next.stats.overdueEmployeeTaskCount > prevStats.overdueEmployeeTaskCount
      ) {
        enqueueNotification({
          scope: "tasks",
          title: "Canh bao qua han",
          detail: `${next.stats.overdueEmployeeTaskCount - prevStats.overdueEmployeeTaskCount} nhiem vu cua nhan vien da qua han chua done.`,
        });
      }

      if (next.stats.doneTasksCount > prevStats.doneTasksCount) {
        enqueueNotification({
          scope: "tasks",
          title: "Tien do task tang",
          detail: `${next.stats.doneTasksCount - prevStats.doneTasksCount} task da hoan thanh moi.`,
        });
      } else if (next.tasks !== prevSignatures.tasks) {
        enqueueNotification({
          scope: "tasks",
          title: "Task duoc cap nhat",
          detail: "Tien do/task state da thay doi.",
        });
      }

      if (next.stats.projectsCount > prevStats.projectsCount) {
        enqueueNotification({
          scope: "projects",
          title: "Du an moi trong he thong",
          detail: `Co ${next.stats.projectsCount - prevStats.projectsCount} du an moi cho cac tai khoan khac.`,
        });
      } else if (next.projects !== prevSignatures.projects) {
        enqueueNotification({
          scope: "projects",
          title: "Du an thay doi",
          detail: "Thong tin du an da duoc cap nhat.",
        });
      }

      if (next.stats.teamOthersHash !== prevStats.teamOthersHash) {
        enqueueNotification({
          scope: "team",
          title: "Nhan su team thay doi",
          detail: "Co cap nhat nhan su lien quan den cac tai khoan khac.",
        });
      }
    } else {
      if (next.stats.myDepartmentId !== prevStats.myDepartmentId) {
        enqueueNotification({
          scope: "team",
          title: "Ban vua vao team moi",
          detail: "Bo phan cua ban da thay doi trong he thong.",
        });
      }

      if (next.stats.myProfileHash !== prevStats.myProfileHash) {
        enqueueNotification({
          scope: "team",
          title: "Thong bao nhan su",
          detail: "Thong tin nhan su cua ban da duoc cap nhat.",
        });
      }

      if (next.stats.myDeptMemberCount !== prevStats.myDeptMemberCount) {
        enqueueNotification({
          scope: "team",
          title: "Team co thay doi nhan su",
          detail: "So luong thanh vien trong team cua ban da thay doi.",
        });
      }

      if (next.stats.tasksCount > prevStats.tasksCount) {
        enqueueNotification({
          scope: "tasks",
          title: "Nhiem vu moi",
          detail: `Ban co them ${next.stats.tasksCount - prevStats.tasksCount} nhiem vu moi.`,
        });
      } else if (next.tasks !== prevSignatures.tasks) {
        enqueueNotification({
          scope: "tasks",
          title: "Nhiem vu cap nhat",
          detail: "Noi dung/trang thai task cua ban da thay doi.",
        });
      }

      if (next.stats.projectsCount > prevStats.projectsCount) {
        enqueueNotification({
          scope: "projects",
          title: "Du an moi",
          detail: `Ban co them ${next.stats.projectsCount - prevStats.projectsCount} du an moi lien quan.`,
        });
      } else if (next.projects !== prevSignatures.projects) {
        enqueueNotification({
          scope: "projects",
          title: "Du an cap nhat",
          detail: "Du an lien quan den ban da thay doi.",
        });
      }
    }

    appState.notificationSignatures = {
      messages: next.messages,
      tasks: next.tasks,
      projects: next.projects,
      team: next.team,
    };
    appState.notificationStats = next.stats;
  } catch {
    // Polling should stay resilient if one cycle fails.
  }
}

function setupNotificationCenter(user: any) {
  const trigger = document.getElementById("notification-trigger");
  const dropdown = document.getElementById("notification-dropdown");
  const markReadBtn = document.getElementById("notification-mark-read");

  renderNotificationCenter();

  const triggerEl = trigger as HTMLButtonElement | null;
  if (triggerEl) {
    triggerEl.onclick = (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle("show");
      document.getElementById("user-dropdown")?.classList.remove("show");
    };
  }

  const markReadEl = markReadBtn as HTMLButtonElement | null;
  if (markReadEl) {
    markReadEl.onclick = () => {
      pruneExpiredNotifications();
      appState.notificationItems = appState.notificationItems
        .filter((item) => item.scope !== "messages")
        .map((item) => ({
          ...item,
          isRead: true,
        }));
      renderNotificationCenter();
    };
  }

  stopNotificationPolling();
  appState.notificationBaselineReady = false;
  appState.notificationSignatures = {
    messages: "",
    tasks: "",
    projects: "",
    team: "",
  };
  appState.notificationStats = null;

  void refreshNotificationState();
  appState.notificationPollTimer = setInterval(() => {
    void refreshNotificationState();
  }, 6000);
}

async function switchView(view: ViewName) {
  appState.currentView = view;
  if (view !== "messages") {
    stopMessageAutoRefresh();
  }

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
      case "profile":
        await renderProfile();
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

  let tasks: any[] = [];
  let myTasks: any[] = [];
  let projects: any[] = [];
  let taskCount = 0;
  let myTaskCount = 0;
  let todoCount = 0;
  let inProgressCount = 0;
  let reviewCount = 0;
  let doneCount = 0;

  try {
    tasks = await TaskService.getAllTasks();
    taskCount = Array.isArray(tasks) ? tasks.length : 0;

    myTasks = await TaskService.getTasksForUser(user.id);
    myTaskCount = Array.isArray(myTasks) ? myTasks.length : 0;

    todoCount = tasks.filter((task) => task.status === "todo").length;
    inProgressCount = tasks.filter(
      (task) => task.status === "in_progress",
    ).length;
    reviewCount = tasks.filter((task) => task.status === "review").length;
    doneCount = tasks.filter((task) => task.status === "done").length;
  } catch {
    taskCount = 0;
    myTaskCount = 0;
  }

  try {
    projects = await ProjectService.getProjectsForUser(user.id);
    if (!Array.isArray(projects)) projects = [];
  } catch {
    projects = [];
  }

  const recentTasks = [...tasks]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime(),
    )
    .slice(0, 5);

  const projectNameById = new Map<string, string>();
  projects.forEach((project) => {
    projectNameById.set(String(project.id), String(project.name || "Untitled"));
  });

  const completionRate = taskCount
    ? Math.round((doneCount / taskCount) * 100)
    : 0;

  contentArea.innerHTML = `
    <div class="space-y-8">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-3xl font-bold text-slate-900">Welcome, ${escapeHtml(user.username)}</h1>
            <p class="text-slate-600 mt-2">Role: ${escapeHtml(user.role)}</p>
          </div>
          <div class="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm space-y-1">
            <div>Total DB Tasks: ${taskCount}</div>
            <div class="text-slate-300">My Tasks: ${myTaskCount}</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div class="text-indigo-600 font-bold text-2xl">${taskCount}</div>
          <div class="text-slate-500 text-sm">Total Tasks</div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div class="text-blue-600 font-bold text-2xl">${inProgressCount}</div>
          <div class="text-slate-500 text-sm">In Progress</div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div class="text-emerald-600 font-bold text-2xl">${doneCount}</div>
          <div class="text-slate-500 text-sm">Done</div>
        </div>
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div class="text-amber-600 font-bold text-2xl">${completionRate}%</div>
          <div class="text-slate-500 text-sm">Completion Rate</div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold text-slate-900">Tasks Snapshot</h2>
            <p class="text-sm text-slate-500">Realtime totals from database (all tasks), plus your personal workload count.</p>
          </div>
          <button id="go-tasks-view" class="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Open Tasks Board</button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div class="text-slate-500">To do</div>
            <div class="text-lg font-bold text-slate-900">${todoCount}</div>
          </div>
          <div class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
            <div class="text-blue-600">In progress</div>
            <div class="text-lg font-bold text-blue-700">${inProgressCount}</div>
          </div>
          <div class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <div class="text-amber-600">Review</div>
            <div class="text-lg font-bold text-amber-700">${reviewCount}</div>
          </div>
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div class="text-emerald-600">Done</div>
            <div class="text-lg font-bold text-emerald-700">${doneCount}</div>
          </div>
        </div>

        <div class="space-y-2">
          ${
            recentTasks.length
              ? recentTasks
                  .map(
                    (task) => `
                <div class="border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-semibold text-slate-900 truncate">${escapeHtml(task.title || "Untitled task")}</div>
                    <div class="text-xs text-slate-500 truncate">Project: ${escapeHtml(projectNameById.get(String(task.project_id)) || String(task.project_id || "-"))}</div>
                  </div>
                  <span class="shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(task.status || "todo")}">${escapeHtml(task.status || "todo")}</span>
                </div>
              `,
                  )
                  .join("")
              : '<div class="text-sm text-slate-500">No tasks found from database.</div>'
          }
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("go-tasks-view")
    ?.addEventListener("click", async () => {
      const navItems = Array.from(document.querySelectorAll(".nav-item"));
      navItems.forEach((el) => el.classList.remove("active"));
      const tasksNav = document.querySelector(
        '.nav-item[data-view="tasks"]',
      ) as HTMLElement | null;
      tasksNav?.classList.add("active");
      await switchView("tasks");
    });
}

async function renderMessages() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;
  const isEmployee = user.role === "employee";

  stopMessageAutoRefresh();

  let channels: any[] = [];
  let messages: any[] = [];

  try {
    channels = await ChatService.getChatsForUser(user.id);
    if (!Array.isArray(channels)) channels = [];
  } catch {
    channels = [];
  }

  const departmentChannels = channels.filter((c) => c.type === "department");
  const crossDepartmentChannels = channels.filter(
    (c) => c.type !== "department",
  );
  const allDepartmentIds = [
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04",
  ];

  const filteredDepartmentChannels =
    appState.departmentFilter === "all"
      ? departmentChannels
      : departmentChannels.filter(
          (c) => c.department_id === appState.departmentFilter,
        );

  const candidateChannels =
    filteredDepartmentChannels.length > 0
      ? filteredDepartmentChannels
      : [...departmentChannels, ...crossDepartmentChannels];

  if (!appState.activeChannelId && candidateChannels.length) {
    appState.activeChannelId = candidateChannels[0].id;
  }

  if (
    appState.activeChannelId &&
    !channels.some((c) => c.id === appState.activeChannelId)
  ) {
    appState.activeChannelId = candidateChannels[0]?.id || "";
  }

  if (appState.activeChannelId) {
    try {
      messages = await ChatService.getMessages(appState.activeChannelId);
      if (!Array.isArray(messages)) messages = [];
    } catch {
      messages = [];
    }
  }

  const activeChannel = channels.find((c) => c.id === appState.activeChannelId);
  const activeChannelMeta =
    activeChannel?.type === "department"
      ? `Department: ${getDepartmentLabel(activeChannel.department_id || "")}`
      : "Cross-department discussion";

  contentArea.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-96">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Department Hubs</h2>
          <p class="text-xs text-slate-500 mt-1">Create channels by department and keep inter-department discussions organized.</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button data-dept-filter="all" class="px-2 py-1 rounded-full text-xs ${appState.departmentFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}">All</button>
          ${allDepartmentIds
            .map(
              (id) => `
            <button data-dept-filter="${id}" class="px-2 py-1 rounded-full text-xs ${appState.departmentFilter === id ? "bg-indigo-600 text-white" : getDepartmentTagClass(id)}">
              ${escapeHtml(getDepartmentLabel(id).split(" ")[0])}
            </button>
          `,
            )
            .join("")}
        </div>

        ${
          isEmployee
            ? '<div class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Employee mode: you can only view and send messages in channels you have joined.</div>'
            : `<form id="create-channel-form" class="grid grid-cols-1 gap-2">
          <input id="channel-name" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Channel name (e.g. IT x HR Sync)" />
          <div class="grid grid-cols-2 gap-2">
            <select id="channel-type" class="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="department">Department</option>
              <option value="group">Cross-Department</option>
            </select>
            <select id="channel-department" class="border border-slate-200 rounded-lg px-3 py-2 text-sm">
              ${allDepartmentIds
                .map(
                  (id) =>
                    `<option value="${id}">${escapeHtml(getDepartmentLabel(id))}</option>`,
                )
                .join("")}
            </select>
          </div>
          <button class="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm" type="submit">Create Channel</button>
        </form>`
        }

        <div class="space-y-2 overflow-y-auto pr-1">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Department Channels</h3>
          ${
            filteredDepartmentChannels
              .map(
                (c) => `
            <button data-chat-id="${escapeHtml(c.id)}" class="w-full text-left px-3 py-2 rounded-lg border ${c.id === appState.activeChannelId ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}">
              <div class="font-semibold text-slate-900 text-sm">${escapeHtml(c.name || "Unnamed")}</div>
              <div class="text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${getDepartmentTagClass(c.department_id || "")}">${escapeHtml(getDepartmentLabel(c.department_id || ""))}</div>
            </button>
          `,
              )
              .join("") ||
            '<div class="text-sm text-slate-500">No department channels found.</div>'
          }

          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500 pt-2">Cross-Department Channels</h3>
          ${
            crossDepartmentChannels
              .map(
                (c) => `
            <button data-chat-id="${escapeHtml(c.id)}" class="w-full text-left px-3 py-2 rounded-lg border ${c.id === appState.activeChannelId ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"}">
              <div class="font-semibold text-slate-900 text-sm">${escapeHtml(c.name || "Unnamed")}</div>
              <div class="text-xs text-slate-500">${escapeHtml((c.type || "group").replace("_", " "))}</div>
            </button>
          `,
              )
              .join("") ||
            '<div class="text-sm text-slate-500">No cross-department channels found.</div>'
          }
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:col-span-2">
        <div class="px-6 py-4 border-b border-slate-100">
          <h3 class="font-bold text-slate-900">${escapeHtml(activeChannel?.name || "Select a channel")}</h3>
          <div class="text-xs text-slate-500 mt-1">${escapeHtml(activeChannelMeta)}</div>
        </div>
        <div class="flex-1 p-6 space-y-3 overflow-y-auto" id="message-list"></div>
        <form id="send-message-form" class="p-4 border-t border-slate-100 flex gap-2">
          <input id="message-text" class="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Type message..." ${activeChannel ? "" : "disabled"} />
          <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm" type="submit" ${activeChannel ? "" : "disabled"}>Send</button>
        </form>
      </div>
    </div>
  `;

  contentArea.querySelectorAll("[data-dept-filter]").forEach((el) => {
    el.addEventListener("click", async () => {
      const next = (el as HTMLElement).dataset.deptFilter;
      if (!next) return;
      appState.departmentFilter = next;
      await renderMessages();
    });
  });

  contentArea.querySelectorAll("[data-chat-id]").forEach((el) => {
    el.addEventListener("click", async () => {
      const chatId = (el as HTMLElement).dataset.chatId;
      if (!chatId) return;
      appState.activeChannelId = chatId;
      await renderMessages();
    });
  });

  const messageListEl = document.getElementById(
    "message-list",
  ) as HTMLDivElement | null;

  const drawMessages = (nextMessages: any[], forceScroll = false) => {
    if (!messageListEl) return;
    const nearBottom =
      messageListEl.scrollHeight -
        messageListEl.scrollTop -
        messageListEl.clientHeight <
      100;

    messageListEl.innerHTML = nextMessages.length
      ? nextMessages
          .map(
            (m) => `
        <div class="${m.sender_id === user.id ? "ml-auto bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"} max-w-[80%] rounded-xl px-4 py-2">
          <div class="text-xs opacity-80 mb-1">${escapeHtml(m.sender_name || m.sender_id || "user")}</div>
          <div class="text-sm">${escapeHtml(m.text || "")}</div>
        </div>
      `,
          )
          .join("")
      : '<div class="text-sm text-slate-500">No messages yet.</div>';

    appState.messageSignature = computeMessageSignature(nextMessages);
    if (forceScroll || nearBottom) {
      messageListEl.scrollTop = messageListEl.scrollHeight;
    }
  };

  drawMessages(messages, true);

  if (appState.activeChannelId) {
    const watchingChannelId = appState.activeChannelId;
    appState.messageRefreshTimer = setInterval(async () => {
      if (
        appState.currentView !== "messages" ||
        appState.activeChannelId !== watchingChannelId
      ) {
        stopMessageAutoRefresh();
        return;
      }

      try {
        const latest = await ChatService.getMessages(watchingChannelId);
        if (!Array.isArray(latest)) return;

        const nextSignature = computeMessageSignature(latest);
        if (nextSignature !== appState.messageSignature) {
          messages = latest;
          drawMessages(messages, false);
        }
      } catch {
        // Keep polling alive even if one request fails.
      }
    }, 2500);
  }

  document
    .getElementById("create-channel-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = (
        document.getElementById("channel-name") as HTMLInputElement | null
      )?.value.trim();
      const type = (
        document.getElementById("channel-type") as HTMLSelectElement | null
      )?.value;
      const departmentId = (
        document.getElementById(
          "channel-department",
        ) as HTMLSelectElement | null
      )?.value;

      if (!name) {
        alert("Channel name is required.");
        return;
      }

      try {
        const created = await ChatService.createChannel({
          name,
          type: type || "group",
          departmentId: type === "department" ? departmentId || null : null,
        });
        appState.activeChannelId = created.id;
        if (type === "department" && departmentId) {
          appState.departmentFilter = departmentId;
        }
        await renderMessages();
      } catch (err) {
        console.error(err);
        alert("Cannot create channel.");
      }
    });

  document
    .getElementById("send-message-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!appState.activeChannelId) return;

      const input = document.getElementById(
        "message-text",
      ) as HTMLInputElement | null;
      const submitButton = (e.currentTarget as HTMLFormElement).querySelector(
        "button[type='submit']",
      ) as HTMLButtonElement | null;
      const text = input?.value.trim();
      if (!text) return;

      const optimistic = {
        id: `temp-${Date.now()}`,
        sender_id: user.id,
        sender_name: user.username,
        text,
      };

      messages = [...messages, optimistic];
      drawMessages(messages, true);
      if (input) input.value = "";
      if (submitButton) submitButton.disabled = true;

      try {
        await ChatService.sendMessage(user.id, appState.activeChannelId, text);
        const latest = await ChatService.getMessages(appState.activeChannelId);
        if (Array.isArray(latest)) {
          messages = latest;
          drawMessages(messages, true);
        }
      } catch (err) {
        console.error(err);
        const errorText =
          err instanceof Error ? err.message : "Cannot send message.";
        alert(errorText);
        messages = messages.filter((m) => m.id !== optimistic.id);
        drawMessages(messages, false);
        if (input) input.value = text;
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
}

async function renderTasks() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;
  const isAdmin = user.role === "admin";
  const isEmployee = user.role === "employee";
  const isReviewer = ["admin", "manager", "leader"].includes(user.role);

  let tasks: any[] = [];
  let projects: any[] = [];
  let users: any[] = [];
  try {
    const canViewAll = ["admin", "manager", "leader"].includes(user.role);
    tasks = canViewAll
      ? await TaskService.getAllTasks()
      : await TaskService.getTasksForUser(user.id);
    if (!Array.isArray(tasks)) tasks = [];
  } catch {
    tasks = [];
  }

  try {
    projects = await ProjectService.getAllProjects();
    if (!Array.isArray(projects)) projects = [];
  } catch {
    projects = [];
  }

  try {
    users = await AuthService.getAllUsers();
    if (!Array.isArray(users)) users = [];
  } catch {
    users = [];
  }

  const userNameById = new Map<string, string>();
  users.forEach((member) => {
    userNameById.set(String(member.id), String(member.username || "Unknown"));
  });

  function normalizeTaskAssignments(task: any): Array<{
    user_id: string;
    responsibility: string | null;
  }> {
    const fromApi = Array.isArray(task.assignments)
      ? task.assignments
          .map((item: any) => ({
            user_id: String(item?.user_id || item?.userId || ""),
            responsibility: item?.responsibility
              ? String(item.responsibility)
              : null,
          }))
          .filter((item: { user_id: string }) => !!item.user_id)
      : [];

    if (fromApi.length) {
      return fromApi;
    }

    const fallbackAssignedTo = task.assignedTo || task.assignee_id;
    if (fallbackAssignedTo) {
      return [
        {
          user_id: String(fallbackAssignedTo),
          responsibility: null,
        },
      ];
    }

    return [];
  }

  const lanes = [
    {
      key: "todo",
      label: "To do",
      laneClass: "border-slate-200 bg-slate-50/80",
      badgeClass: "bg-slate-200 text-slate-700",
    },
    {
      key: "in_progress",
      label: "In progress",
      laneClass: "border-blue-200 bg-blue-50/70",
      badgeClass: "bg-blue-200 text-blue-700",
    },
    {
      key: "review",
      label: "Review",
      laneClass: "border-amber-200 bg-amber-50/70",
      badgeClass: "bg-amber-200 text-amber-700",
    },
    {
      key: "done",
      label: "Done",
      laneClass: "border-emerald-200 bg-emerald-50/70",
      badgeClass: "bg-emerald-200 text-emerald-700",
    },
  ] as const;

  const projectNameById = new Map<string, string>();
  projects.forEach((project) => {
    projectNameById.set(
      String(project.id),
      project.name ? String(project.name) : "Untitled project",
    );
  });

  const tasksByLane = tasks.reduce<Record<string, any[]>>((acc, task) => {
    const status = String(task.status || "todo");
    const normalizedStatus = lanes.some((lane) => lane.key === status)
      ? status
      : "todo";
    if (!acc[normalizedStatus]) {
      acc[normalizedStatus] = [];
    }
    acc[normalizedStatus].push(task);
    return acc;
  }, {});

  contentArea.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <h2 class="text-2xl font-bold text-slate-900">Tasks</h2>
        <p class="text-slate-600">Kanban board style like Jira. ${isAdmin ? "Drag a card to another column to update status." : isEmployee ? "Employee mode: open each task and move by Got it / Finished." : "Reviewer mode: evaluate tasks in review."}</p>
        <div class="flex flex-wrap gap-2 text-xs">
          ${lanes
            .map(
              (lane) => `
            <span class="inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${lane.badgeClass}">
              ${lane.label}: ${(tasksByLane[lane.key] || []).length}
            </span>
          `,
            )
            .join("")}
        </div>
        ${
          isAdmin
            ? `<form id="create-task-form" class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input id="task-title" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Task title" required />
          <select id="task-project-id" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" required>
            <option value="">Select project</option>
            ${projects.map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name || "Untitled")}</option>`).join("")}
          </select>
          <select id="task-status" class="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="todo">todo</option>
            <option value="in_progress">in_progress</option>
            <option value="review">review</option>
            <option value="done">done</option>
          </select>
          <select id="task-assignee" class="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Assign member (optional)</option>
            ${users.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.username || "Unknown")}</option>`).join("")}
          </select>
          <input id="task-responsibility" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Responsibility (optional)" />
          <button class="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold" type="submit">Create Task</button>
        </form>`
            : '<div class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Only admin can create, assign, move, or update tasks.</div>'
        }
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        ${lanes
          .map((lane) => {
            const laneTasks = tasksByLane[lane.key] || [];
            return `
              <section class="rounded-2xl border ${lane.laneClass} p-3 min-h-[420px] flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">${lane.label}</h3>
                  <span class="text-xs px-2 py-0.5 rounded-full ${lane.badgeClass}">${laneTasks.length}</span>
                </div>
                <div data-drop-zone="true" data-status="${lane.key}" class="task-drop-zone flex-1 space-y-3 rounded-xl p-1 transition border border-dashed border-transparent">
                  ${
                    laneTasks.length
                      ? laneTasks
                          .map((task) => {
                            const assignments = normalizeTaskAssignments(task);
                            const isOverdueEmployeeTask =
                              isEmployee &&
                              String(task.status || "") !== "done" &&
                              getTaskDeadlineMs(task) <= Date.now();

                            return `
                          <article
                            draggable="${isAdmin ? "true" : "false"}"
                            data-task-card="true"
                            data-task-id="${escapeHtml(task.id)}"
                            ${isEmployee ? `data-task-detail="${escapeHtml(task.id)}"` : ""}
                            data-status="${escapeHtml(task.status || "todo")}"
                            class="group ${isAdmin ? "cursor-grab active:cursor-grabbing" : isEmployee ? "cursor-pointer" : "cursor-default"} bg-white border ${isOverdueEmployeeTask ? "border-red-400 bg-red-50/40" : "border-slate-200"} rounded-xl p-3 shadow-sm hover:shadow-md transition"
                          >
                            <div class="flex items-start justify-between gap-2">
                              <h4 class="text-sm font-semibold text-slate-900">${escapeHtml(task.title || "Untitled task")}</h4>
                              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadgeClass(task.status || "todo")}">${escapeHtml(task.status || "todo")}</span>
                            </div>
                            <p class="text-xs text-slate-600 mt-2 line-clamp-3">${escapeHtml(task.description || "No description")}</p>
                            <div class="mt-2 text-[11px] text-slate-500">Project: ${escapeHtml(projectNameById.get(String(task.project_id)) || task.project_id || "-")}</div>
                            <div class="mt-3 space-y-2">
                              <div class="text-[11px] font-semibold text-slate-500">Members and responsibilities</div>
                              <div class="space-y-1">
                                ${
                                  assignments.length
                                    ? assignments
                                        .map(
                                          (assignment) => `
                                      <div class="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
                                        <div class="text-[11px] text-slate-700">
                                          <span class="font-semibold">${escapeHtml(userNameById.get(assignment.user_id) || assignment.user_id)}</span>
                                          <span class="text-slate-500">${escapeHtml(assignment.responsibility || "General implementation")}</span>
                                        </div>
                                        ${
                                          isAdmin
                                            ? `<button type="button" data-remove-assignment-task-id="${escapeHtml(task.id)}" data-remove-assignment-user-id="${escapeHtml(assignment.user_id)}" class="text-[10px] px-2 py-1 rounded bg-red-100 text-red-700">Remove</button>`
                                            : ""
                                        }
                                      </div>
                                    `,
                                        )
                                        .join("")
                                    : '<div class="text-[11px] text-slate-500">No members assigned yet.</div>'
                                }
                              </div>
                              <div class="grid grid-cols-1 gap-2">
                                <select data-assignment-member="${escapeHtml(task.id)}" class="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white" ${isAdmin ? "" : "disabled"}>
                                  <option value="">Select member</option>
                                  ${users.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.username || "Unknown")}</option>`).join("")}
                                </select>
                                <input data-assignment-responsibility="${escapeHtml(task.id)}" class="border border-slate-200 rounded-lg px-2 py-1 text-xs" placeholder="Part of work (e.g. API integration)" ${isAdmin ? "" : "disabled"} />
                                ${
                                  isAdmin
                                    ? `<button type="button" data-add-assignment="${escapeHtml(task.id)}" class="px-2 py-1.5 bg-slate-900 text-white rounded-lg text-xs">Add member responsibility</button>`
                                    : ""
                                }
                              </div>
                            </div>
                            <div class="mt-3">
                              <label class="block text-[11px] text-slate-500 mb-1">Quick move</label>
                              <select data-task-id="${escapeHtml(task.id)}" class="task-status-select w-full border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white" ${isAdmin ? "" : "disabled"}>
                                <option value="todo" ${task.status === "todo" ? "selected" : ""}>To do</option>
                                <option value="in_progress" ${task.status === "in_progress" ? "selected" : ""}>In progress</option>
                                <option value="review" ${task.status === "review" ? "selected" : ""}>Review</option>
                                <option value="done" ${task.status === "done" ? "selected" : ""}>Done</option>
                              </select>
                            </div>
                            ${
                              task.status === "done"
                                ? `<div class="mt-2 text-[11px] text-emerald-700">Completed at: ${escapeHtml(new Date(task.updated_at || task.created_at || Date.now()).toLocaleString())}</div>`
                                : ""
                            }
                            ${
                              isReviewer && task.status === "review"
                                ? `<div class="mt-3 border border-slate-200 rounded-lg p-2 space-y-2 bg-slate-50">
                              <label class="block text-[11px] text-slate-500">Review note</label>
                              <textarea data-review-note="${escapeHtml(task.id)}" class="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs" rows="2" placeholder="Write your review..."></textarea>
                              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <button type="button" data-review-done="${escapeHtml(task.id)}" class="px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">Done</button>
                                <button type="button" data-review-not-done="${escapeHtml(task.id)}" class="px-2 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold">Not done</button>
                              </div>
                            </div>`
                                : ""
                            }
                            ${
                              isEmployee
                                ? `<div class="mt-3">
                              <button type="button" data-task-detail="${escapeHtml(task.id)}" class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">View task details</button>
                            </div>`
                                : ""
                            }
                          </article>
                        `;
                          })
                          .join("")
                      : '<div class="h-full min-h-20 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 grid place-items-center">Drop tasks here</div>'
                  }
                </div>
              </section>
            `;
          })
          .join("")}
      </div>
    </div>
  `;

  if (isAdmin) {
    document
      .getElementById("create-task-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = (
          document.getElementById("task-title") as HTMLInputElement | null
        )?.value.trim();
        const projectId = (
          document.getElementById("task-project-id") as HTMLSelectElement | null
        )?.value;
        const status = (
          document.getElementById("task-status") as HTMLSelectElement | null
        )?.value;
        const assigneeId = (
          document.getElementById("task-assignee") as HTMLSelectElement | null
        )?.value;
        const responsibility = (
          document.getElementById(
            "task-responsibility",
          ) as HTMLInputElement | null
        )?.value.trim();

        if (!title || !projectId) {
          alert("Task title and project are required.");
          return;
        }

        try {
          await TaskService.createTask({
            title,
            projectId,
            status: status || "todo",
            assignments: assigneeId
              ? [{ userId: assigneeId, responsibility: responsibility || null }]
              : [],
          });
          await renderTasks();
        } catch (err) {
          console.error(err);
          alert("Cannot create task.");
        }
      });
  }

  if (isReviewer) {
    contentArea.querySelectorAll("[data-review-done]").forEach((el) => {
      el.addEventListener("click", async () => {
        const taskId = (el as HTMLElement).dataset.reviewDone;
        if (!taskId) return;

        const noteInput = contentArea.querySelector(
          `[data-review-note='${taskId}']`,
        ) as HTMLTextAreaElement | null;

        try {
          await TaskService.updateTask(taskId, {
            status: "done",
            reviewComment: noteInput?.value.trim() || null,
          });
          await renderTasks();
        } catch (err) {
          console.error(err);
          alert("Cannot mark task as done.");
        }
      });
    });

    contentArea.querySelectorAll("[data-review-not-done]").forEach((el) => {
      el.addEventListener("click", async () => {
        const taskId = (el as HTMLElement).dataset.reviewNotDone;
        if (!taskId) return;

        const noteInput = contentArea.querySelector(
          `[data-review-note='${taskId}']`,
        ) as HTMLTextAreaElement | null;

        const deadlineRaw = window.prompt(
          "Nhap thoi han lam lai (format: YYYY-MM-DDTHH:mm)",
        );
        if (!deadlineRaw) return;

        const parsedDeadline = new Date(deadlineRaw);
        if (Number.isNaN(parsedDeadline.getTime())) {
          alert("Invalid deadline format.");
          return;
        }

        try {
          await TaskService.updateTask(taskId, {
            status: "in_progress",
            reviewComment: noteInput?.value.trim() || null,
            reworkDueAt: parsedDeadline.toISOString(),
          });
          enqueueNotification({
            scope: "tasks",
            title: "Nhiem vu can lam lai",
            detail: `Task da duoc tra ve in progress. Han lam lai: ${parsedDeadline.toLocaleString()}`,
          });
          await renderTasks();
        } catch (err) {
          console.error(err);
          alert("Cannot send task back to in progress.");
        }
      });
    });
  }

  if (isAdmin) {
    contentArea.querySelectorAll("[data-add-assignment]").forEach((el) => {
      el.addEventListener("click", async () => {
        const taskId = (el as HTMLElement).dataset.addAssignment;
        if (!taskId) return;

        const memberSelect = contentArea.querySelector(
          `[data-assignment-member='${taskId}']`,
        ) as HTMLSelectElement | null;
        const responsibilityInput = contentArea.querySelector(
          `[data-assignment-responsibility='${taskId}']`,
        ) as HTMLInputElement | null;

        const memberId = memberSelect?.value;
        const responsibility = responsibilityInput?.value.trim() || null;

        if (!memberId) {
          alert("Please choose a member.");
          return;
        }

        const targetTask = tasks.find((task) => String(task.id) === taskId);
        if (!targetTask) return;

        const currentAssignments = normalizeTaskAssignments(targetTask);
        const exists = currentAssignments.some(
          (item) => item.user_id === String(memberId),
        );

        const nextAssignments = exists
          ? currentAssignments.map((item) =>
              item.user_id === String(memberId)
                ? { ...item, responsibility }
                : item,
            )
          : [
              ...currentAssignments,
              {
                user_id: String(memberId),
                responsibility,
              },
            ];

        try {
          await TaskService.updateTask(taskId, {
            assignments: nextAssignments,
          });
          await renderTasks();
        } catch (err) {
          console.error(err);
          alert("Cannot add member responsibility.");
        }
      });
    });
  }

  if (isAdmin) {
    contentArea
      .querySelectorAll("[data-remove-assignment-user-id]")
      .forEach((el) => {
        el.addEventListener("click", async () => {
          const target = el as HTMLElement;
          const taskId = target.dataset.removeAssignmentTaskId;
          const userId = target.dataset.removeAssignmentUserId;
          if (!taskId || !userId) return;

          const targetTask = tasks.find((task) => String(task.id) === taskId);
          if (!targetTask) return;

          const currentAssignments = normalizeTaskAssignments(targetTask);
          const nextAssignments = currentAssignments.filter(
            (item) => item.user_id !== String(userId),
          );

          try {
            await TaskService.updateTask(taskId, {
              assignments: nextAssignments,
            });
            await renderTasks();
          } catch (err) {
            console.error(err);
            alert("Cannot remove assignment.");
          }
        });
      });
  }

  let draggedTaskId: string | null = null;

  if (isAdmin) {
    contentArea.querySelectorAll("[data-task-card='true']").forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        const dragEvent = e as DragEvent;
        const current = e.currentTarget as HTMLElement;
        const taskId = current.dataset.taskId || null;
        draggedTaskId = taskId;
        current.classList.add("opacity-60");
        if (dragEvent.dataTransfer && taskId) {
          dragEvent.dataTransfer.effectAllowed = "move";
          dragEvent.dataTransfer.setData("text/plain", taskId);
        }
      });

      card.addEventListener("dragend", (e) => {
        const current = e.currentTarget as HTMLElement;
        current.classList.remove("opacity-60");
        draggedTaskId = null;
      });
    });
  }

  if (isAdmin) {
    contentArea.querySelectorAll("[data-drop-zone='true']").forEach((zone) => {
      zone.addEventListener("dragover", (e) => {
        e.preventDefault();
        const current = e.currentTarget as HTMLElement;
        current.classList.add("ring-2", "ring-indigo-300", "bg-indigo-50/60");
      });

      zone.addEventListener("dragleave", (e) => {
        const current = e.currentTarget as HTMLElement;
        current.classList.remove(
          "ring-2",
          "ring-indigo-300",
          "bg-indigo-50/60",
        );
      });

      zone.addEventListener("drop", async (e) => {
        e.preventDefault();
        const dragEvent = e as DragEvent;
        const current = e.currentTarget as HTMLElement;
        current.classList.remove(
          "ring-2",
          "ring-indigo-300",
          "bg-indigo-50/60",
        );

        const status = current.dataset.status;
        const taskIdFromTransfer =
          dragEvent.dataTransfer?.getData("text/plain") || null;
        const taskId = taskIdFromTransfer || draggedTaskId;

        if (!status || !taskId) return;
        const currentTask = tasks.find((task) => String(task.id) === taskId);
        if (currentTask && String(currentTask.status || "todo") === status)
          return;

        try {
          await TaskService.updateStatus(taskId, status);
          await renderTasks();
        } catch (err) {
          console.error(err);
          alert("Cannot move task.");
        }
      });
    });
  }

  if (isAdmin) {
    contentArea.querySelectorAll(".task-status-select").forEach((el) => {
      el.addEventListener("change", async (e) => {
        const target = e.currentTarget as HTMLSelectElement;
        const taskId = target.dataset.taskId;
        const status = target.value;
        if (!taskId || !status) return;

        try {
          await TaskService.updateStatus(taskId, status);
          await renderTasks();
        } catch (err) {
          console.error(err);
          alert("Cannot update task status.");
        }
      });
    });
  }

  if (isEmployee) {
    const openTaskDetailModal = (taskId: string) => {
      const task = tasks.find((item) => String(item.id) === taskId);
      if (!task) return;

      const assignments = normalizeTaskAssignments(task);
      const membersMarkup = assignments.length
        ? assignments
            .map(
              (assignment) =>
                `<div class="text-sm text-slate-700"><span class="font-semibold">${escapeHtml(userNameById.get(assignment.user_id) || assignment.user_id)}</span>: ${escapeHtml(assignment.responsibility || "General implementation")}</div>`,
            )
            .join("")
        : '<div class="text-sm text-slate-500">No members assigned.</div>';

      const existing = document.getElementById("task-detail-modal");
      existing?.remove();

      const overlay = document.createElement("div");
      overlay.id = "task-detail-modal";
      overlay.className = "modal-overlay";
      const status = String(task.status || "todo");
      const actionLabel =
        status === "todo"
          ? "Got it"
          : status === "in_progress"
            ? "Finished"
            : "";
      overlay.innerHTML = `
        <div class="modal-content max-w-2xl" role="dialog" aria-modal="true" aria-label="Task details">
          <div class="modal-header">
            <h3 class="text-lg font-bold text-slate-900">Task Details</h3>
            <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(task.status || "todo")}">${escapeHtml(task.status || "todo")}</span>
          </div>
          <div class="modal-body space-y-3">
            <div>
              <p class="text-xs text-slate-500">Title</p>
              <p class="text-sm font-semibold text-slate-900">${escapeHtml(task.title || "Untitled task")}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Project</p>
              <p class="text-sm text-slate-700">${escapeHtml(projectNameById.get(String(task.project_id)) || task.project_id || "-")}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Description</p>
              <p class="text-sm text-slate-700 whitespace-pre-wrap">${escapeHtml(task.description || "No description")}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Members and responsibilities</p>
              <div class="mt-1 space-y-1">${membersMarkup}</div>
            </div>
          </div>
          <div class="modal-footer items-center justify-between">
            <div class="text-xs text-slate-500">Deadline in <span data-task-countdown class="font-semibold text-slate-800">--</span></div>
            ${
              actionLabel
                ? `<button type="button" data-task-detail-action class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">${actionLabel}</button>`
                : '<span class="text-xs text-slate-500">Waiting for manager/leader review</span>'
            }
          </div>
        </div>
      `;

      let timer: ReturnType<typeof setInterval> | null = null;
      const countdownEl = overlay.querySelector(
        "[data-task-countdown]",
      ) as HTMLElement | null;
      const deadlineMs = getTaskDeadlineMs(task);

      const updateCountdown = () => {
        if (!countdownEl) return;
        const remaining = deadlineMs - Date.now();
        countdownEl.textContent = formatCountdown(remaining);
        countdownEl.className =
          remaining <= 0
            ? "font-semibold text-red-600"
            : "font-semibold text-slate-800";
      };

      const closeModal = () => {
        if (timer) {
          clearInterval(timer);
        }
        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          closeModal();
        }
      };

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          closeModal();
        }
      });

      overlay
        .querySelector("[data-task-detail-action]")
        ?.addEventListener("click", async () => {
          const nextStatus =
            status === "todo"
              ? "in_progress"
              : status === "in_progress"
                ? "review"
                : null;
          if (!nextStatus) return;

          try {
            await TaskService.updateStatus(String(task.id), nextStatus);
            closeModal();
            await renderTasks();
          } catch (err) {
            console.error(err);
            alert("Cannot update task workflow.");
          }
        });

      document.addEventListener("keydown", onKeyDown);
      updateCountdown();
      timer = setInterval(updateCountdown, 1000);
      document.body.appendChild(overlay);
    };

    contentArea.querySelectorAll("[data-task-detail]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        const taskId = (el as HTMLElement).dataset.taskDetail;
        if (!taskId) return;
        openTaskDetailModal(taskId);
      });
    });

    contentArea.querySelectorAll("[data-task-card='true']").forEach((card) => {
      card.addEventListener("click", (event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button") || target.closest("select")) {
          return;
        }
        const taskId = (card as HTMLElement).dataset.taskDetail;
        if (!taskId) return;
        openTaskDetailModal(taskId);
      });
    });
  }
}

async function renderProjects() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;
  const isAdmin = user.role === "admin";

  let projects: any[] = [];
  try {
    projects = await ProjectService.getProjectsForUser(user.id);
    if (!Array.isArray(projects)) projects = [];
  } catch {
    projects = [];
  }

  const departmentIds = [
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04",
  ];

  const buckets = departmentIds.map((departmentId) => ({
    departmentId,
    departmentName: getDepartmentLabel(departmentId),
    items: projects.filter((project) => project.department_id === departmentId),
  }));

  const unassignedProjects = projects.filter(
    (project) => !project.department_id,
  );
  const visibleBuckets =
    appState.projectDepartmentFilter === "all"
      ? buckets
      : buckets.filter(
          (bucket) => bucket.departmentId === appState.projectDepartmentFilter,
        );

  contentArea.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <h2 class="text-2xl font-bold text-slate-900">Projects</h2>
        <p class="text-slate-600">${projects.length} project(s) available. Projects are split by department. ${isAdmin ? "" : "Read-only mode for non-admin."}</p>
        <div class="flex flex-wrap gap-2">
          <button data-project-dept-filter="all" class="px-2.5 py-1 rounded-full text-xs font-semibold ${appState.projectDepartmentFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}">All departments</button>
          ${departmentIds
            .map(
              (departmentId) => `
            <button data-project-dept-filter="${departmentId}" class="px-2.5 py-1 rounded-full text-xs font-semibold ${appState.projectDepartmentFilter === departmentId ? "bg-indigo-600 text-white" : getDepartmentTagClass(departmentId)}">${escapeHtml(getDepartmentLabel(departmentId))}</button>
          `,
            )
            .join("")}
        </div>
        ${
          isAdmin
            ? `<form id="create-project-form" class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input id="project-name" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Project name" required />
          <input id="project-description" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Description" />
          <select id="project-department" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" required>
            ${departmentIds
              .map(
                (departmentId) =>
                  `<option value="${departmentId}" ${
                    (user.department_id || departmentIds[0]) === departmentId
                      ? "selected"
                      : ""
                  }>${escapeHtml(getDepartmentLabel(departmentId))}</option>`,
              )
              .join("")}
          </select>
          <button class="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold" type="submit">Create Project</button>
        </form>`
            : '<div class="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">Only admin can create or edit projects.</div>'
        }
      </div>

      <div class="space-y-4">
        ${visibleBuckets
          .map(
            (bucket) => `
          <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(bucket.departmentName)}</h3>
              <span class="px-2 py-1 rounded-full text-xs font-semibold ${getDepartmentTagClass(bucket.departmentId)}">${bucket.items.length} project(s)</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${
                bucket.items.length
                  ? bucket.items
                      .map(
                        (p) => `
                    <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                      <div class="font-semibold text-slate-900">${escapeHtml(p.name || "Untitled")}</div>
                      <div class="text-sm text-slate-600">${escapeHtml(p.description || "No description")}</div>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        <input type="number" min="0" max="100" value="${escapeHtml(p.progress ?? 0)}" data-project-progress="${escapeHtml(p.id)}" class="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm" ${isAdmin ? "" : "disabled"} />
                        <select data-project-department="${escapeHtml(p.id)}" class="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm" ${isAdmin ? "" : "disabled"}>
                          ${departmentIds
                            .map(
                              (departmentId) =>
                                `<option value="${departmentId}" ${p.department_id === departmentId ? "selected" : ""}>${escapeHtml(getDepartmentLabel(departmentId))}</option>`,
                            )
                            .join("")}
                        </select>
                        ${isAdmin ? `<button data-project-save="${escapeHtml(p.id)}" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm" type="button">Save</button>` : ""}
                      </div>
                    </div>
                  `,
                      )
                      .join("")
                  : '<div class="text-sm text-slate-500">No projects in this department.</div>'
              }
            </div>
          </section>
        `,
          )
          .join("")}
        ${
          appState.projectDepartmentFilter === "all" &&
          unassignedProjects.length
            ? `
          <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 class="text-lg font-semibold text-slate-900">Unassigned Department</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${unassignedProjects
                .map(
                  (p) => `
                <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div class="font-semibold text-slate-900">${escapeHtml(p.name || "Untitled")}</div>
                  <div class="text-sm text-slate-600">${escapeHtml(p.description || "No description")}</div>
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <input type="number" min="0" max="100" value="${escapeHtml(p.progress ?? 0)}" data-project-progress="${escapeHtml(p.id)}" class="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm" ${isAdmin ? "" : "disabled"} />
                    <select data-project-department="${escapeHtml(p.id)}" class="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm" ${isAdmin ? "" : "disabled"}>
                      ${departmentIds
                        .map(
                          (departmentId) =>
                            `<option value="${departmentId}">${escapeHtml(getDepartmentLabel(departmentId))}</option>`,
                        )
                        .join("")}
                    </select>
                    ${isAdmin ? `<button data-project-save="${escapeHtml(p.id)}" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm" type="button">Save</button>` : ""}
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>
          </section>
        `
            : ""
        }
      </div>
    </div>
  `;

  contentArea.querySelectorAll("[data-project-dept-filter]").forEach((el) => {
    el.addEventListener("click", async () => {
      const filter = (el as HTMLElement).dataset.projectDeptFilter;
      if (!filter) return;
      appState.projectDepartmentFilter = filter;
      await renderProjects();
    });
  });

  if (isAdmin) {
    document
      .getElementById("create-project-form")
      ?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = (
          document.getElementById("project-name") as HTMLInputElement | null
        )?.value.trim();
        const description = (
          document.getElementById(
            "project-description",
          ) as HTMLInputElement | null
        )?.value.trim();
        const departmentId = (
          document.getElementById(
            "project-department",
          ) as HTMLSelectElement | null
        )?.value;

        if (!name) {
          alert("Project name is required.");
          return;
        }

        try {
          await ProjectService.createProject({
            name,
            description,
            departmentId,
          });
          await renderProjects();
        } catch (err) {
          console.error(err);
          alert("Cannot create project.");
        }
      });
  }

  if (isAdmin) {
    contentArea.querySelectorAll("[data-project-save]").forEach((el) => {
      el.addEventListener("click", async () => {
        const projectId = (el as HTMLElement).dataset.projectSave;
        if (!projectId) return;

        const progressInput = contentArea.querySelector(
          `[data-project-progress='${projectId}']`,
        ) as HTMLInputElement | null;
        const departmentInput = contentArea.querySelector(
          `[data-project-department='${projectId}']`,
        ) as HTMLSelectElement | null;
        const progress = Number(progressInput?.value ?? 0);
        const departmentId = departmentInput?.value || null;

        try {
          await ProjectService.updateProject(projectId, {
            progress: Number.isNaN(progress) ? 0 : progress,
            departmentId,
          });
          await renderProjects();
        } catch (err) {
          console.error(err);
          alert("Cannot update project.");
        }
      });
    });
  }
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

  const departmentIds = [
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03",
    "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04",
  ];

  const teams = departmentIds.map((departmentId) => {
    const members = users.filter((u) => u.department_id === departmentId);
    return {
      id: departmentId,
      name: getDepartmentLabel(departmentId),
      members,
      managers: members.filter((m) => m.role === "manager").length,
    };
  });

  const unassignedMembers = users.filter(
    (u) => !departmentIds.includes(String(u.department_id || "")),
  );

  contentArea.innerHTML = `
    <div class="space-y-4">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Team</h2>
          <p class="text-slate-600 mt-1">${users.length} member(s) split by department team.</p>
        </div>
        <button id="team-refresh" class="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm">Refresh</button>
      </div>
      </div>

      ${teams
        .map(
          (team) => `
        <section class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(team.name)}</h3>
              <p class="text-xs text-slate-500">${team.members.length} member(s), ${team.managers} manager(s)</p>
            </div>
            <span class="px-2 py-1 rounded-full text-xs font-semibold ${getDepartmentTagClass(team.id)}">Department Team</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${
              team.members.length
                ? team.members
                    .map(
                      (u) => `
                  <div class="border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <img src="${escapeHtml(u.avatar || generateAvatar(u.username || "User"))}" class="w-10 h-10 rounded-full" alt="avatar" />
                    <div>
                      <div class="font-semibold text-slate-900">${escapeHtml(u.username || "Unknown")}</div>
                      <div class="text-xs text-slate-500">${escapeHtml(u.role || "employee")}</div>
                      <div class="text-xs text-slate-400">${escapeHtml(team.name)}</div>
                    </div>
                  </div>
                `,
                    )
                    .join("")
                : '<div class="text-sm text-slate-500">No members in this team yet.</div>'
            }
          </div>
        </section>
      `,
        )
        .join("")}

      ${
        unassignedMembers.length
          ? `
        <section class="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 class="text-lg font-semibold text-slate-900">Unassigned Team</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${unassignedMembers
              .map(
                (u) => `
              <div class="border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                <img src="${escapeHtml(u.avatar || generateAvatar(u.username || "User"))}" class="w-10 h-10 rounded-full" alt="avatar" />
                <div>
                  <div class="font-semibold text-slate-900">${escapeHtml(u.username || "Unknown")}</div>
                  <div class="text-xs text-slate-500">${escapeHtml(u.role || "employee")}</div>
                  <div class="text-xs text-slate-400">No department</div>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </section>
      `
          : ""
      }
    </div>
  `;

  document
    .getElementById("team-refresh")
    ?.addEventListener("click", async () => {
      await renderTeam();
    });
}

async function renderSettings() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;

  contentArea.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 class="text-2xl font-bold text-slate-900">Settings</h2>
        <p class="text-slate-600 mt-2">Account: ${escapeHtml(user.username)}</p>
        <p class="text-slate-600">Role: ${escapeHtml(user.role)}</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <button id="go-profile" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Open Profile</button>
          <button id="refresh-session" class="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm">Refresh Session</button>
          <button id="logout-now" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Logout</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("go-profile")?.addEventListener("click", async () => {
    await switchView("profile");
  });

  document
    .getElementById("refresh-session")
    ?.addEventListener("click", async () => {
      const refreshedUser = await AuthService.requireAuth();
      if (refreshedUser) {
        setupTopbar(refreshedUser);
        alert("Session refreshed.");
      }
    });

  document.getElementById("logout-now")?.addEventListener("click", () => {
    AuthService.logout();
  });
}

async function renderProfile() {
  const contentArea = document.getElementById("main-content");
  const user = AuthService.getCurrentUser();
  if (!contentArea || !user) return;

  contentArea.innerHTML = `
    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-3xl">
      <h2 class="text-2xl font-bold text-slate-900">Profile</h2>
      <p class="text-slate-600 mt-2">Update your account information.</p>
      <form id="profile-form" class="mt-6 space-y-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Username</label>
          <input id="profile-username" class="w-full border border-slate-200 rounded-lg px-3 py-2" value="${escapeHtml(user.username || "")}" />
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">Avatar URL</label>
          <input id="profile-avatar" class="w-full border border-slate-200 rounded-lg px-3 py-2" value="${escapeHtml(user.avatar || "")}" />
        </div>
        <div class="flex gap-3 items-center">
          <img src="${escapeHtml(user.avatar || generateAvatar(user.username || "User"))}" alt="avatar" class="w-16 h-16 rounded-full border border-slate-200" />
          <span class="text-sm text-slate-500">Preview avatar</span>
        </div>
        <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold" type="submit">Save Profile</button>
      </form>
    </div>
  `;

  document
    .getElementById("profile-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = (
        document.getElementById("profile-username") as HTMLInputElement | null
      )?.value.trim();
      const avatarUrl = (
        document.getElementById("profile-avatar") as HTMLInputElement | null
      )?.value.trim();

      if (!username) {
        alert("Username is required.");
        return;
      }

      try {
        const updated = await AuthService.updateUser(user.id, {
          username,
          avatarUrl: avatarUrl || null,
        });
        setupTopbar(updated);
        alert("Profile updated.");
        await renderProfile();
      } catch (err) {
        console.error(err);
        alert("Cannot update profile.");
      }
    });
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
    <div class="space-y-6">
      <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 class="text-2xl font-bold text-slate-900">Administration</h2>
        <p class="text-slate-600 mt-2">Total users: ${users.length}</p>
        <form id="admin-create-user" class="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <input id="admin-username" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="username" required />
          <input id="admin-password" class="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="password" required />
          <select id="admin-role" class="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="employee">employee</option>
            <option value="manager">manager</option>
            <option value="admin">admin</option>
          </select>
          <select id="admin-department" class="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01">IT & Engineering</option>
            <option value="f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02">Human Resources</option>
            <option value="f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03">Sales & Marketing</option>
            <option value="f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04">Finance</option>
          </select>
          <button class="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-semibold" type="submit">Create User</button>
        </form>
      </div>

      <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        ${users
          .map(
            (u) => `
          <div class="flex flex-wrap items-center gap-3 border border-slate-100 rounded-xl p-3">
            <img src="${escapeHtml(u.avatar || generateAvatar(u.username || "User"))}" class="w-10 h-10 rounded-full" alt="avatar" />
            <div class="min-w-36">
              <div class="font-semibold text-slate-900 text-sm">${escapeHtml(u.username || "unknown")}</div>
              <div class="text-xs text-slate-500">${escapeHtml(getDepartmentLabel(u.department_id || ""))}</div>
            </div>
            <select data-role-user-id="${escapeHtml(u.id)}" class="border border-slate-200 rounded-lg px-2 py-1 text-sm">
              <option value="employee" ${u.role === "employee" ? "selected" : ""}>employee</option>
              <option value="manager" ${u.role === "manager" ? "selected" : ""}>manager</option>
              <option value="admin" ${u.role === "admin" ? "selected" : ""}>admin</option>
            </select>
            <button data-save-user-id="${escapeHtml(u.id)}" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm" type="button">Save</button>
            <button data-delete-user-id="${escapeHtml(u.id)}" class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm" type="button">Disable</button>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  document
    .getElementById("admin-create-user")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = (
        document.getElementById("admin-username") as HTMLInputElement | null
      )?.value.trim();
      const password = (
        document.getElementById("admin-password") as HTMLInputElement | null
      )?.value.trim();
      const role = (
        document.getElementById("admin-role") as HTMLSelectElement | null
      )?.value;
      const departmentId = (
        document.getElementById("admin-department") as HTMLSelectElement | null
      )?.value;

      if (!username || !password || !role) {
        alert("username, password and role are required.");
        return;
      }

      try {
        await AuthService.createUser({
          username,
          password,
          role,
          name: username,
          departmentId,
        });
        await renderAdministration();
      } catch (err) {
        console.error(err);
        alert("Cannot create user.");
      }
    });

  contentArea.querySelectorAll("[data-save-user-id]").forEach((el) => {
    el.addEventListener("click", async () => {
      const userId = (el as HTMLElement).dataset.saveUserId;
      if (!userId) return;

      const roleSelect = contentArea.querySelector(
        `[data-role-user-id='${userId}']`,
      ) as HTMLSelectElement | null;
      const role = roleSelect?.value;
      if (!role) return;

      try {
        await AuthService.updateUser(userId, { role });
        await renderAdministration();
      } catch (err) {
        console.error(err);
        alert("Cannot update user role.");
      }
    });
  });

  contentArea.querySelectorAll("[data-delete-user-id]").forEach((el) => {
    el.addEventListener("click", async () => {
      const userId = (el as HTMLElement).dataset.deleteUserId;
      if (!userId) return;
      if (!window.confirm("Disable this user?")) return;

      try {
        await AuthService.deleteUser(userId);
        await renderAdministration();
      } catch (err) {
        console.error(err);
        alert("Cannot disable user.");
      }
    });
  });
}
