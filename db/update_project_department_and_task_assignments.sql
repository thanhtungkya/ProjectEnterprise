-- Add department ownership for projects and responsibility for task assignments.

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments (id) ON DELETE SET NULL;

ALTER TABLE task_assignments
ADD COLUMN IF NOT EXISTS responsibility TEXT;

-- Optional index to speed up filtering projects by department.
CREATE INDEX IF NOT EXISTS idx_projects_department_id ON projects (department_id)
WHERE
    is_deleted = FALSE;