-- Add missing foreign key constraint from vehicles.location_id to locations.id
-- This enables PostgREST embedded resource queries like select('*, locations(name)')

ALTER TABLE vehicles
ADD CONSTRAINT vehicles_location_id_fkey
FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;
