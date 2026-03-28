-- Add avatar_url support for existing databases without resetting data.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

UPDATE users
SET
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin_user&backgroundColor=b6e3f4,c0aede,d1d4f9'
WHERE
    username = 'admin_user';

UPDATE users
SET
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager_it&backgroundColor=b6e3f4,c0aede,d1d4f9'
WHERE
    username = 'manager_it';

UPDATE users
SET
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=employee_it&backgroundColor=b6e3f4,c0aede,d1d4f9'
WHERE
    username = 'employee_it';

UPDATE users
SET
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=employee_hr&backgroundColor=b6e3f4,c0aede,d1d4f9'
WHERE
    username = 'employee_hr';

UPDATE users
SET
    avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=employee_sales&backgroundColor=b6e3f4,c0aede,d1d4f9'
WHERE
    username = 'employee_sales';