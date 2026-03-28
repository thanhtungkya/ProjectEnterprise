-- ===============================================================
-- Secure Enterprise Messenger - Database Schema (PostgreSQL)
-- ===============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE chat_type AS ENUM ('private', 'group', 'project', 'department');

CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');

CREATE TYPE message_status_type AS ENUM ('sent', 'delivered', 'seen');

-- 0. Departments Table
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    department_id UUID REFERENCES departments (id) ON DELETE SET NULL,
    public_key TEXT, -- For E2EE (e.g., Kyber Public Key)
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles Table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name VARCHAR(20) UNIQUE NOT NULL -- admin, manager, employee
);

-- 3. User Roles (Many-to-Many)
CREATE TABLE user_roles (
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 4. Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments (id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Chats Table
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name VARCHAR(100), -- Nullable for private chats
    type chat_type NOT NULL,
    project_id UUID REFERENCES projects (id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments (id) ON DELETE SET NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Chat Members (Many-to-Many)
CREATE TABLE chat_members (
    chat_id UUID REFERENCES chats (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    joined_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (chat_id, user_id)
);

-- 7. Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    chat_id UUID REFERENCES chats (id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users (id) ON DELETE SET NULL,
    encrypted_content TEXT NOT NULL, -- The AES-encrypted message body
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Message Keys (E2EE Support)
-- Stores the AES session key encrypted with each recipient's public key
CREATE TABLE message_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    message_id UUID REFERENCES messages (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL, -- AES key encrypted with user's public key
    UNIQUE (message_id, user_id)
);

-- 9. Message Status (Bonus)
CREATE TABLE message_status (
    message_id UUID REFERENCES messages (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    status message_status_type DEFAULT 'sent',
    updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (message_id, user_id)
);

-- 10. Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    project_id UUID REFERENCES projects (id) ON DELETE CASCADE,
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Task Assignments (Many-to-Many)
CREATE TABLE task_assignments (
    task_id UUID REFERENCES tasks (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users (id) ON DELETE CASCADE,
    responsibility TEXT,
    PRIMARY KEY (task_id, user_id)
);

-- ===============================================================
-- Indexes for Performance
-- ===============================================================

CREATE INDEX idx_users_username ON users (username)
WHERE
    is_deleted = FALSE;

CREATE INDEX idx_messages_chat_id ON messages (chat_id)
WHERE
    is_deleted = FALSE;

CREATE INDEX idx_messages_created_at ON messages (created_at);

CREATE INDEX idx_tasks_project_id ON tasks (project_id)
WHERE
    is_deleted = FALSE;

CREATE INDEX idx_tasks_status ON tasks (status);

CREATE INDEX idx_chat_members_user_id ON chat_members (user_id);

CREATE INDEX idx_message_status_user_id ON message_status (user_id, status);

-- ===============================================================
-- Sample Data
-- ===============================================================

-- Insert Departments
INSERT INTO
    departments (id, name)
VALUES (
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        'IT & Engineering'
    ),
    (
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
        'Human Resources'
    ),
    (
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
        'Sales & Marketing'
    ),
    (
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
        'Finance'
    );

-- Insert Roles
INSERT INTO
    roles (id, name)
VALUES (uuid_generate_v4 (), 'admin'),
    (
        uuid_generate_v4 (),
        'manager'
    ),
    (
        uuid_generate_v4 (),
        'employee'
    );

-- Insert Sample Users (Password is 'password123' hashed)
INSERT INTO
    users (
        id,
        username,
        password_hash,
        avatar_url,
        department_id,
        public_key
    )
VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'admin_user',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=admin_user&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        'pub_key_admin_123'
    ),
    (
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
        'manager_it',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=manager_it&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        'pub_key_manager_456'
    ),
    (
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        'employee_it',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=employee_it&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        'pub_key_employee_789'
    ),
    (
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        'employee_hr',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=employee_hr&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
        'pub_key_hr_123'
    ),
    (
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        'employee_sales',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=employee_sales&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
        'pub_key_sales_123'
    );

-- Assign Roles
INSERT INTO
    user_roles (user_id, role_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', id
FROM roles
WHERE
    name = 'admin';

INSERT INTO
    user_roles (user_id, role_id)
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', id
FROM roles
WHERE
    name = 'manager';

INSERT INTO
    user_roles (user_id, role_id)
SELECT id, (
        SELECT id
        FROM roles
        WHERE
            name = 'employee'
    )
FROM users
WHERE
    username LIKE 'employee_%';

-- Insert Sample Project
INSERT INTO
    projects (
        id,
        name,
        description,
        department_id
    )
VALUES (
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
        'Project Phoenix',
        'Modernizing the enterprise stack.',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
    );

-- Insert Department Channels
INSERT INTO chats (id, name, type, department_id) VALUES 
(uuid_generate_v4(), 'IT General', 'department', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'),
(uuid_generate_v4(), 'HR Lounge', 'department', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'),
(uuid_generate_v4(), 'Sales Floor', 'department', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03'),
(uuid_generate_v4(), 'Finance Hub', 'department', 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04');

-- Insert Global Channel
INSERT INTO
    chats (id, name, type)
VALUES (
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
        'General Announcements',
        'group'
    );