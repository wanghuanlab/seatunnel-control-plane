-- Create the application database (run against the postgres maintenance DB).
-- Usage:
--   psql -h 127.0.0.1 -p 5360 -U postgres -f sql/create-database.sql

SELECT 'CREATE DATABASE seatunnel_control_plane WITH ENCODING ''UTF8'' TEMPLATE template0'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'seatunnel_control_plane')\gexec
