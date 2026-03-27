/**
 * Role-Based Access Control Logic
 */

export const RBAC = {
    ROLES: {
        ADMIN: 'admin',
        MANAGER: 'manager',
        EMPLOYEE: 'employee'
    },

    PERMISSIONS: {
        VIEW_ADMIN_PANEL: ['admin'],
        MANAGE_TASKS: ['admin', 'manager'],
        CREATE_PROJECTS: ['admin', 'manager'],
        CHAT: ['admin', 'manager', 'employee'],
        VIEW_TEAM: ['admin', 'manager', 'employee']
    },

    hasPermission(userRole: string, permission: string): boolean {
        const allowedRoles = (this.PERMISSIONS as any)[permission];
        return allowedRoles ? allowedRoles.includes(userRole) : false;
    },

    applyPermissions(userRole: string) {
        if (userRole !== this.ROLES.ADMIN) {
            document.querySelectorAll('[data-role="admin"]').forEach(el => {
                (el as HTMLElement).style.display = 'none';
            });
        }

        if (![this.ROLES.ADMIN, this.ROLES.MANAGER].includes(userRole)) {
            document.querySelectorAll('[data-role="manager"]').forEach(el => {
                (el as HTMLElement).style.display = 'none';
            });
        }
    }
};
