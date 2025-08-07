-- Add api_key column to anonymous_tasks table to store the Freepik API key used for the task
ALTER TABLE anonymous_tasks ADD COLUMN api_key TEXT;

-- Add index for better query performance when looking up tasks by api_key
CREATE INDEX idx_anonymous_tasks_api_key ON anonymous_tasks(api_key);

-- Add comment to document the column purpose
COMMENT ON COLUMN anonymous_tasks.api_key IS 'The actual Freepik API key string used for this task (e.g., FPSXd078fd5f8654e3612a7da3d4297efd2f)';