-- Seed department channels and example messages (idempotent)
-- Run with: psql "$DATABASE_URL" -f db/seed_department_message_channels.sql

WITH target_departments AS (
    SELECT id, name
    FROM departments
    WHERE id IN (
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04'
    )
),
channel_map AS (
    SELECT id, type, department_id, name
    FROM chats
    WHERE is_deleted = FALSE
      AND type = 'department'
),
missing_channels AS (
    SELECT d.id AS department_id,
           CASE d.id
               WHEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' THEN 'IT General'
               WHEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02' THEN 'HR Lounge'
               WHEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03' THEN 'Sales Floor'
               WHEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04' THEN 'Finance Hub'
               ELSE d.name || ' Channel'
           END AS channel_name
    FROM target_departments d
    LEFT JOIN channel_map cm
      ON cm.department_id = d.id
    WHERE cm.id IS NULL
),
inserted_channels AS (
    INSERT INTO chats (id, name, type, department_id, is_deleted, created_at, updated_at)
    SELECT uuid_generate_v4(), mc.channel_name, 'department'::chat_type, mc.department_id, FALSE, NOW(), NOW()
    FROM missing_channels mc
    RETURNING id, name, type, department_id
),
resolved_channels AS (
    SELECT cm.id, cm.name, cm.department_id
    FROM channel_map cm
    UNION ALL
    SELECT ic.id, ic.name, ic.department_id
    FROM inserted_channels ic
),
joined_members AS (
    INSERT INTO chat_members (chat_id, user_id, joined_at)
    SELECT rc.id, u.id, NOW()
    FROM resolved_channels rc
    JOIN users u ON u.department_id = rc.department_id
    ON CONFLICT (chat_id, user_id) DO NOTHING
    RETURNING chat_id, user_id
)
SELECT 1;

-- Insert sample messages per department channel if no message exists yet
WITH
    resolved_channels AS (
        SELECT c.id, c.name, c.department_id
        FROM chats c
        WHERE
            c.is_deleted = FALSE
            AND c.type = 'department'
            AND c.department_id IN (
                'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
                'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
                'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03',
                'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04'
            )
    ),
    channel_senders AS (
        SELECT
            rc.id AS chat_id,
            rc.department_id,
            (
                SELECT u.id
                FROM users u
                WHERE
                    u.department_id = rc.department_id
                    AND u.is_deleted = FALSE
                ORDER BY u.created_at ASC
                LIMIT 1
            ) AS sender_id,
            (
                SELECT COUNT(1)
                FROM messages m
                WHERE
                    m.chat_id = rc.id
                    AND m.is_deleted = FALSE
            ) AS message_count
        FROM resolved_channels rc
    ),
    seed_rows AS (
        SELECT
            chat_id,
            sender_id,
            CASE department_id
                WHEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01' THEN 'Chao team IT. Hom nay minh cap nhat tien do sprint va deployment plan.'
                WHEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02' THEN 'Chao team HR. Day la thong bao lich onboarding va training thang nay.'
                WHEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03' THEN 'Chao team Sales. KPI tuan nay da cap nhat, moi nguoi theo doi dashboard nhe.'
                WHEN 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04' THEN 'Chao team Finance. Bao cao budget va du toan quy moi da san sang.'
                ELSE 'Department update channel created.'
            END AS body
        FROM channel_senders
        WHERE
            sender_id IS NOT NULL
            AND message_count = 0
    ),
    ins1 AS (
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
        SELECT
            uuid_generate_v4 (),
            s.chat_id,
            s.sender_id,
            s.body,
            FALSE,
            NOW() - INTERVAL '12 minutes',
            NOW() - INTERVAL '12 minutes'
        FROM seed_rows s RETURNING chat_id
    ),
    ins2 AS (
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
        SELECT
            uuid_generate_v4 (),
            s.chat_id,
            s.sender_id,
            CASE
                WHEN s.body LIKE 'Chao team IT%' THEN 'Reminder: 15:00 co meeting review bug critical.'
                WHEN s.body LIKE 'Chao team HR%' THEN 'Reminder: Nho cap nhat danh sach nhan su onboarding vao thu 6.'
                WHEN s.body LIKE 'Chao team Sales%' THEN 'Reminder: Follow-up khach hang tier A truoc 17:00.'
                WHEN s.body LIKE 'Chao team Finance%' THEN 'Reminder: Chot so lieu chi phi van hanh truoc cuoi ngay.'
                ELSE 'Reminder message.'
            END,
            FALSE,
            NOW() - INTERVAL '5 minutes',
            NOW() - INTERVAL '5 minutes'
        FROM seed_rows s RETURNING chat_id
    )
SELECT (
        SELECT COUNT(*)
        FROM chats
        WHERE
            type = 'department'
            AND is_deleted = FALSE
    ) AS total_department_channels,
    (
        SELECT COUNT(*)
        FROM chat_members
    ) AS total_chat_members,
    (
        SELECT COUNT(*)
        FROM messages
        WHERE
            is_deleted = FALSE
    ) AS total_messages;