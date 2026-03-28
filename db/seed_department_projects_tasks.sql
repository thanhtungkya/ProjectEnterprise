-- Seed data for department-based teams, projects, and tasks.
-- Includes user: nguyenvietanh / password123
-- Safe to run multiple times.

BEGIN;

-- Ensure required columns exist for current schema state.
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments (id) ON DELETE SET NULL;

ALTER TABLE task_assignments
ADD COLUMN IF NOT EXISTS responsibility TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure base roles exist.
INSERT INTO
    roles (name)
VALUES ('admin'),
    ('manager'),
    ('employee') ON CONFLICT (name) DO NOTHING;

-- Ensure departments exist with fixed IDs used by frontend.
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
    ) ON CONFLICT (id) DO
UPDATE
SET
    name = EXCLUDED.name;

-- Shared bcrypt hash for password123.
-- Hash source matches existing project seed style.
-- password: password123

-- Core users by department.
INSERT INTO
    users (
        id,
        username,
        password_hash,
        avatar_url,
        department_id,
        public_key,
        is_deleted,
        created_at,
        updated_at
    )
VALUES (
        '11111111-1111-4111-8111-111111111111',
        'nguyenvietanh',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=nguyenvietanh&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        'pub_key_nguyenvietanh',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '11111111-1111-4111-8111-111111111112',
        'it_lead_hoang',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=it_lead_hoang&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        'pub_key_it_hoang',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '11111111-1111-4111-8111-111111111113',
        'it_dev_linh',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=it_dev_linh&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        'pub_key_it_linh',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '11111111-1111-4111-8111-111111111114',
        'hr_lead_thao',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=hr_lead_thao&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
        'pub_key_hr_thao',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '11111111-1111-4111-8111-111111111115',
        'hr_exec_hanh',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=hr_exec_hanh&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
        'pub_key_hr_hanh',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '11111111-1111-4111-8111-111111111116',
        'sales_mgr_quan',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=sales_mgr_quan&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
        'pub_key_sales_quan',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '11111111-1111-4111-8111-111111111117',
        'sales_exec_nhi',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=sales_exec_nhi&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
        'pub_key_sales_nhi',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '11111111-1111-4111-8111-111111111118',
        'finance_lead_tram',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=finance_lead_tram&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
        'pub_key_finance_tram',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '11111111-1111-4111-8111-111111111119',
        'finance_exec_an',
        '$2b$10$bHsCHtBns/sAuQ2utdCB5u4q.Nf/RHj1d/lBSxeQTFmjrPEWKlTjm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=finance_exec_an&backgroundColor=b6e3f4,c0aede,d1d4f9',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
        'pub_key_finance_an',
        FALSE,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO
UPDATE
SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    avatar_url = EXCLUDED.avatar_url,
    department_id = EXCLUDED.department_id,
    is_deleted = FALSE,
    updated_at = NOW();

-- Assign roles.
INSERT INTO
    user_roles (user_id, role_id)
SELECT '11111111-1111-4111-8111-111111111111', r.id
FROM roles r
WHERE
    r.name = 'manager' ON CONFLICT DO NOTHING;

INSERT INTO
    user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
    JOIN roles r ON r.name = 'manager'
WHERE
    u.id IN (
        '11111111-1111-4111-8111-111111111112',
        '11111111-1111-4111-8111-111111111114',
        '11111111-1111-4111-8111-111111111116',
        '11111111-1111-4111-8111-111111111118'
    ) ON CONFLICT DO NOTHING;

INSERT INTO
    user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
    JOIN roles r ON r.name = 'employee'
WHERE
    u.id IN (
        '11111111-1111-4111-8111-111111111113',
        '11111111-1111-4111-8111-111111111115',
        '11111111-1111-4111-8111-111111111117',
        '11111111-1111-4111-8111-111111111119'
    ) ON CONFLICT DO NOTHING;

-- Department projects.
INSERT INTO
    projects (
        id,
        name,
        description,
        department_id,
        is_deleted,
        created_at,
        updated_at
    )
VALUES (
        '22222222-2222-4222-8222-222222222201',
        'IT Infrastructure Upgrade',
        'Nang cap ha tang va bao mat he thong noi bo.',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '22222222-2222-4222-8222-222222222202',
        'HR Onboarding Optimization',
        'Toi uu quy trinh onboarding cho nhan su moi.',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '22222222-2222-4222-8222-222222222203',
        'Sales Pipeline Acceleration',
        'Tang toc chuyen doi lead thanh co hoi ban hang.',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '22222222-2222-4222-8222-222222222204',
        'Finance Cost Control 2026',
        'Theo doi va toi uu chi phi van hanh theo quy.',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '22222222-2222-4222-8222-222222222205',
        'Cross-Department Digital Workflow',
        'Du an lien phong ban ve quy trinh so hoa.',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        FALSE,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO
UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    department_id = EXCLUDED.department_id,
    is_deleted = FALSE,
    updated_at = NOW();

-- Tasks by project.
INSERT INTO
    tasks (
        id,
        project_id,
        created_by,
        title,
        description,
        status,
        is_deleted,
        created_at,
        updated_at
    )
VALUES (
        '33333333-3333-4333-8333-333333333301',
        '22222222-2222-4222-8222-222222222201',
        '11111111-1111-4111-8111-111111111111',
        'Audit current servers',
        'Kiem tra hieu nang va lo hong tren toan bo server noi bo.',
        'todo',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333302',
        '22222222-2222-4222-8222-222222222201',
        '11111111-1111-4111-8111-111111111112',
        'Implement backup automation',
        'Tu dong hoa sao luu du lieu theo lich tuan.',
        'in_progress',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333303',
        '22222222-2222-4222-8222-222222222202',
        '11111111-1111-4111-8111-111111111114',
        'Standardize onboarding checklist',
        'Chuan hoa checklist onboarding cho cac vi tri.',
        'review',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333304',
        '22222222-2222-4222-8222-222222222202',
        '11111111-1111-4111-8111-111111111114',
        'Build probation tracking template',
        'Tao mau theo doi thu viec cho HRBP.',
        'todo',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333305',
        '22222222-2222-4222-8222-222222222203',
        '11111111-1111-4111-8111-111111111116',
        'Segment enterprise leads',
        'Phan nhom lead theo nganh va quy mo doanh thu.',
        'in_progress',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333306',
        '22222222-2222-4222-8222-222222222203',
        '11111111-1111-4111-8111-111111111116',
        'Prepare monthly sales review',
        'Tong hop KPI va de xuat hanh dong cai thien.',
        'todo',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333307',
        '22222222-2222-4222-8222-222222222204',
        '11111111-1111-4111-8111-111111111118',
        'Validate expense categories',
        'Rasoat phan loai chi phi theo phong ban.',
        'done',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333308',
        '22222222-2222-4222-8222-222222222204',
        '11111111-1111-4111-8111-111111111118',
        'Quarterly budget variance report',
        'Phan tich chenhlech ngan sach quy.',
        'review',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333309',
        '22222222-2222-4222-8222-222222222205',
        '11111111-1111-4111-8111-111111111111',
        'Design shared workflow model',
        'Thiet ke quy trinh phoi hop giua IT, HR, Sales, Finance.',
        'in_progress',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333310',
        '22222222-2222-4222-8222-222222222205',
        '11111111-1111-4111-8111-111111111111',
        'Pilot automation in one business unit',
        'Thu nghiem quy trinh so hoa tren mot don vi kinh doanh.',
        'todo',
        FALSE,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO
UPDATE
SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    is_deleted = FALSE,
    updated_at = NOW();

-- Task assignments with explicit responsibilities (team responsibilities by department).
INSERT INTO
    task_assignments (
        task_id,
        user_id,
        responsibility
    )
VALUES (
        '33333333-3333-4333-8333-333333333301',
        '11111111-1111-4111-8111-111111111112',
        'Lead technical assessment and risk register'
    ),
    (
        '33333333-3333-4333-8333-333333333301',
        '11111111-1111-4111-8111-111111111113',
        'Collect infrastructure metrics and baseline'
    ),
    (
        '33333333-3333-4333-8333-333333333302',
        '11111111-1111-4111-8111-111111111111',
        'Approve backup policy and SLA'
    ),
    (
        '33333333-3333-4333-8333-333333333302',
        '11111111-1111-4111-8111-111111111113',
        'Implement scripts and monitor daily jobs'
    ),
    (
        '33333333-3333-4333-8333-333333333303',
        '11111111-1111-4111-8111-111111111114',
        'Define onboarding standards by role'
    ),
    (
        '33333333-3333-4333-8333-333333333303',
        '11111111-1111-4111-8111-111111111115',
        'Prepare HR onboarding document templates'
    ),
    (
        '33333333-3333-4333-8333-333333333304',
        '11111111-1111-4111-8111-111111111115',
        'Draft probation progress form and reminders'
    ),
    (
        '33333333-3333-4333-8333-333333333305',
        '11111111-1111-4111-8111-111111111116',
        'Define segmentation criteria and targets'
    ),
    (
        '33333333-3333-4333-8333-333333333305',
        '11111111-1111-4111-8111-111111111117',
        'Tag leads and update CRM pipeline stages'
    ),
    (
        '33333333-3333-4333-8333-333333333306',
        '11111111-1111-4111-8111-111111111117',
        'Prepare dashboard and monthly insights'
    ),
    (
        '33333333-3333-4333-8333-333333333307',
        '11111111-1111-4111-8111-111111111118',
        'Approve final expense mapping framework'
    ),
    (
        '33333333-3333-4333-8333-333333333307',
        '11111111-1111-4111-8111-111111111119',
        'Validate accounting entries and evidence'
    ),
    (
        '33333333-3333-4333-8333-333333333308',
        '11111111-1111-4111-8111-111111111119',
        'Produce variance report and commentary'
    ),
    (
        '33333333-3333-4333-8333-333333333309',
        '11111111-1111-4111-8111-111111111111',
        'Coordinate cross-department workshop'
    ),
    (
        '33333333-3333-4333-8333-333333333309',
        '11111111-1111-4111-8111-111111111114',
        'Map HR handoff checkpoints'
    ),
    (
        '33333333-3333-4333-8333-333333333309',
        '11111111-1111-4111-8111-111111111116',
        'Map Sales process dependencies'
    ),
    (
        '33333333-3333-4333-8333-333333333309',
        '11111111-1111-4111-8111-111111111118',
        'Map Finance approval controls'
    ),
    (
        '33333333-3333-4333-8333-333333333310',
        '11111111-1111-4111-8111-111111111113',
        'Automate workflow trigger and notifications'
    ),
    (
        '33333333-3333-4333-8333-333333333310',
        '11111111-1111-4111-8111-111111111115',
        'Define HR acceptance criteria for pilot'
    ) ON CONFLICT (task_id, user_id) DO
UPDATE
SET
    responsibility = EXCLUDED.responsibility;

-- Department chat channels and one cross-department operations channel.
INSERT INTO
    chats (
        id,
        name,
        type,
        department_id,
        is_deleted,
        created_at,
        updated_at
    )
VALUES (
        '44444444-4444-4444-8444-444444444401',
        'IT Engineering Hub',
        'department',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444402',
        'HR Operations Hub',
        'department',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444403',
        'Sales GTM Hub',
        'department',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444404',
        'Finance Control Hub',
        'department',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04',
        FALSE,
        NOW(),
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444405',
        'Cross Department Delivery',
        'group',
        NULL,
        FALSE,
        NOW(),
        NOW()
    ) ON CONFLICT (id) DO
UPDATE
SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    department_id = EXCLUDED.department_id,
    is_deleted = FALSE,
    updated_at = NOW();

-- Channel members per department.
INSERT INTO
    chat_members (chat_id, user_id, joined_at)
VALUES (
        '44444444-4444-4444-8444-444444444401',
        '11111111-1111-4111-8111-111111111111',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444401',
        '11111111-1111-4111-8111-111111111112',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444401',
        '11111111-1111-4111-8111-111111111113',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444402',
        '11111111-1111-4111-8111-111111111114',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444402',
        '11111111-1111-4111-8111-111111111115',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444403',
        '11111111-1111-4111-8111-111111111116',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444403',
        '11111111-1111-4111-8111-111111111117',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444404',
        '11111111-1111-4111-8111-111111111118',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444404',
        '11111111-1111-4111-8111-111111111119',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444405',
        '11111111-1111-4111-8111-111111111111',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444405',
        '11111111-1111-4111-8111-111111111114',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444405',
        '11111111-1111-4111-8111-111111111116',
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444405',
        '11111111-1111-4111-8111-111111111118',
        NOW()
    ) ON CONFLICT (chat_id, user_id) DO NOTHING;

-- Sample conversations in department channels.
INSERT INTO
    messages (
        id,
        chat_id,
        sender_id,
        encrypted_content,
        is_deleted,
        created_at,
        updated_at
    )
VALUES (
        '55555555-5555-4555-8555-555555555501',
        '44444444-4444-4444-8444-444444444401',
        '11111111-1111-4111-8111-111111111112',
        'IT team: review server baseline before Friday.',
        FALSE,
        NOW() - INTERVAL '50 minutes',
        NOW() - INTERVAL '50 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555502',
        '44444444-4444-4444-8444-444444444401',
        '11111111-1111-4111-8111-111111111113',
        'Got it. I will upload metrics from app and db nodes.',
        FALSE,
        NOW() - INTERVAL '45 minutes',
        NOW() - INTERVAL '45 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555503',
        '44444444-4444-4444-8444-444444444402',
        '11111111-1111-4111-8111-111111111114',
        'HR team: onboarding checklist v2 is ready for review.',
        FALSE,
        NOW() - INTERVAL '40 minutes',
        NOW() - INTERVAL '40 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555504',
        '44444444-4444-4444-8444-444444444402',
        '11111111-1111-4111-8111-111111111115',
        'I will finalize probation template this afternoon.',
        FALSE,
        NOW() - INTERVAL '36 minutes',
        NOW() - INTERVAL '36 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555505',
        '44444444-4444-4444-8444-444444444403',
        '11111111-1111-4111-8111-111111111116',
        'Sales team: pipeline acceleration weekly sync starts now.',
        FALSE,
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '30 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555506',
        '44444444-4444-4444-8444-444444444403',
        '11111111-1111-4111-8111-111111111117',
        'Lead scoring update done for SMB segment.',
        FALSE,
        NOW() - INTERVAL '26 minutes',
        NOW() - INTERVAL '26 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555507',
        '44444444-4444-4444-8444-444444444404',
        '11111111-1111-4111-8111-111111111118',
        'Finance team: cost control report draft published.',
        FALSE,
        NOW() - INTERVAL '20 minutes',
        NOW() - INTERVAL '20 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555508',
        '44444444-4444-4444-8444-444444444404',
        '11111111-1111-4111-8111-111111111119',
        'Variance report needs sales spend notes before close.',
        FALSE,
        NOW() - INTERVAL '16 minutes',
        NOW() - INTERVAL '16 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555509',
        '44444444-4444-4444-8444-444444444405',
        '11111111-1111-4111-8111-111111111111',
        'Cross-team sync: please share blockers in this thread.',
        FALSE,
        NOW() - INTERVAL '12 minutes',
        NOW() - INTERVAL '12 minutes'
    ),
    (
        '55555555-5555-4555-8555-555555555510',
        '44444444-4444-4444-8444-444444444405',
        '11111111-1111-4111-8111-111111111118',
        'Finance blocker: waiting final owner list for approvals.',
        FALSE,
        NOW() - INTERVAL '8 minutes',
        NOW() - INTERVAL '8 minutes'
    ) ON CONFLICT (id) DO
UPDATE
SET
    chat_id = EXCLUDED.chat_id,
    sender_id = EXCLUDED.sender_id,
    encrypted_content = EXCLUDED.encrypted_content,
    is_deleted = FALSE,
    updated_at = NOW();

-- Bulk example data: many projects and tasks (idempotent).
WITH project_seed AS (
    SELECT
        gs AS project_no,
        CASE (gs % 4)
            WHEN 1 THEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'::uuid
            WHEN 2 THEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'::uuid
            WHEN 3 THEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03'::uuid
            ELSE 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04'::uuid
        END AS department_id,
        CASE (gs % 4)
            WHEN 1 THEN '11111111-1111-4111-8111-111111111112'::uuid
            WHEN 2 THEN '11111111-1111-4111-8111-111111111114'::uuid
            WHEN 3 THEN '11111111-1111-4111-8111-111111111116'::uuid
            ELSE '11111111-1111-4111-8111-111111111118'::uuid
        END AS lead_user_id,
        md5('bulk-project-' || gs::text) AS project_hash
    FROM generate_series(1, 40) AS gs
),
project_rows AS (
    SELECT
        (
            substr(project_hash, 1, 8) || '-' ||
            substr(project_hash, 9, 4) || '-4' ||
            substr(project_hash, 14, 3) || '-a' ||
            substr(project_hash, 18, 3) || '-' ||
            substr(project_hash, 21, 12)
        )::uuid AS project_id,
        project_no,
        department_id,
        lead_user_id
    FROM project_seed
)
INSERT INTO projects (
    id,
    name,
    description,
    department_id,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    pr.project_id,
    'Department Project Example #' || lpad(pr.project_no::text, 2, '0'),
    'Auto-generated project example for demo and testing volume.',
    pr.department_id,
    FALSE,
    NOW() - ((pr.project_no % 14) || ' days')::interval,
    NOW()
FROM project_rows pr
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    department_id = EXCLUDED.department_id,
    is_deleted = FALSE,
    updated_at = NOW();

WITH project_seed AS (
    SELECT
        gs AS project_no,
        CASE (gs % 4)
            WHEN 1 THEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'::uuid
            WHEN 2 THEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02'::uuid
            WHEN 3 THEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03'::uuid
            ELSE 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04'::uuid
        END AS department_id,
        CASE (gs % 4)
            WHEN 1 THEN '11111111-1111-4111-8111-111111111112'::uuid
            WHEN 2 THEN '11111111-1111-4111-8111-111111111114'::uuid
            WHEN 3 THEN '11111111-1111-4111-8111-111111111116'::uuid
            ELSE '11111111-1111-4111-8111-111111111118'::uuid
        END AS lead_user_id,
        CASE (gs % 4)
            WHEN 1 THEN '11111111-1111-4111-8111-111111111113'::uuid
            WHEN 2 THEN '11111111-1111-4111-8111-111111111115'::uuid
            WHEN 3 THEN '11111111-1111-4111-8111-111111111117'::uuid
            ELSE '11111111-1111-4111-8111-111111111119'::uuid
        END AS member_user_id,
        md5('bulk-project-' || gs::text) AS project_hash
    FROM generate_series(1, 40) AS gs
),
project_rows AS (
    SELECT
        (
            substr(project_hash, 1, 8) || '-' ||
            substr(project_hash, 9, 4) || '-4' ||
            substr(project_hash, 14, 3) || '-a' ||
            substr(project_hash, 18, 3) || '-' ||
            substr(project_hash, 21, 12)
        )::uuid AS project_id,
        project_no,
        department_id,
        lead_user_id,
        member_user_id
    FROM project_seed
),
task_rows AS (
    SELECT
        seeded.project_no,
        seeded.project_id,
        seeded.department_id,
        seeded.lead_user_id,
        seeded.member_user_id,
        seeded.task_no,
        (
            substr(task_hash, 1, 8) || '-' ||
            substr(task_hash, 9, 4) || '-4' ||
            substr(task_hash, 14, 3) || '-b' ||
            substr(task_hash, 18, 3) || '-' ||
            substr(task_hash, 21, 12)
        )::uuid AS task_id,
        CASE task_no
            WHEN 1 THEN 'todo'::task_status
            WHEN 2 THEN 'in_progress'::task_status
            WHEN 3 THEN 'review'::task_status
            ELSE 'done'::task_status
        END AS task_status
    FROM (
        SELECT
            pr.*, 
            task_no,
            md5('bulk-task-' || pr.project_no::text || '-' || task_no::text) AS task_hash
        FROM project_rows pr
        CROSS JOIN generate_series(1, 4) AS task_no
    ) seeded
)
INSERT INTO tasks (
    id,
    project_id,
    created_by,
    title,
    description,
    status,
    is_deleted,
    created_at,
    updated_at
)
SELECT
    tr.task_id,
    tr.project_id,
    tr.lead_user_id,
    'Task Example P' || lpad(tr.project_no::text, 2, '0') || '-T' || tr.task_no::text,
    'Auto-generated task example for project volume test.',
    tr.task_status,
    FALSE,
    NOW() - (((tr.project_no + tr.task_no) % 10) || ' days')::interval,
    NOW()
FROM task_rows tr
ON CONFLICT (id) DO UPDATE
SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    is_deleted = FALSE,
    updated_at = NOW();

WITH project_seed AS (
    SELECT
        gs AS project_no,
        CASE (gs % 4)
            WHEN 1 THEN '11111111-1111-4111-8111-111111111112'::uuid
            WHEN 2 THEN '11111111-1111-4111-8111-111111111114'::uuid
            WHEN 3 THEN '11111111-1111-4111-8111-111111111116'::uuid
            ELSE '11111111-1111-4111-8111-111111111118'::uuid
        END AS lead_user_id,
        CASE (gs % 4)
            WHEN 1 THEN '11111111-1111-4111-8111-111111111113'::uuid
            WHEN 2 THEN '11111111-1111-4111-8111-111111111115'::uuid
            WHEN 3 THEN '11111111-1111-4111-8111-111111111117'::uuid
            ELSE '11111111-1111-4111-8111-111111111119'::uuid
        END AS member_user_id,
        md5('bulk-project-' || gs::text) AS project_hash
    FROM generate_series(1, 40) AS gs
),
task_rows AS (
    SELECT
        (
            substr(task_hash, 1, 8) || '-' ||
            substr(task_hash, 9, 4) || '-4' ||
            substr(task_hash, 14, 3) || '-b' ||
            substr(task_hash, 18, 3) || '-' ||
            substr(task_hash, 21, 12)
        )::uuid AS task_id,
        seeded.lead_user_id,
        seeded.member_user_id,
        seeded.task_no
    FROM (
        SELECT
            ps.lead_user_id,
            ps.member_user_id,
            task_no,
            md5('bulk-task-' || ps.project_no::text || '-' || task_no::text) AS task_hash
        FROM project_seed ps
        CROSS JOIN generate_series(1, 4) AS task_no
    ) seeded
)
INSERT INTO task_assignments (task_id, user_id, responsibility)
SELECT
    task_id,
    lead_user_id,
    'Lead execution and QA for this task'
FROM task_rows
UNION ALL
SELECT
    task_id,
    member_user_id,
    CASE task_no
        WHEN 1 THEN 'Prepare requirement details and checklist'
        WHEN 2 THEN 'Implement main workload and update progress'
        WHEN 3 THEN 'Review output and consolidate feedback'
        ELSE 'Finalize documentation and handover'
    END
FROM task_rows
ON CONFLICT (task_id, user_id) DO UPDATE
SET
    responsibility = EXCLUDED.responsibility;

COMMIT;