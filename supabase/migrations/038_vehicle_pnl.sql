-- Vehicle P&L Dashboard
-- Adds fixed cost fields to vehicles and a summary view for per-vehicle profitability

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS monthly_insurance_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS monthly_payment DECIMAL(10,2);

-- Drop view if it exists so we can recreate cleanly
DROP VIEW IF EXISTS vehicle_pnl_summary;

CREATE OR REPLACE VIEW vehicle_pnl_summary AS
WITH booking_stats AS (
  SELECT
    vehicle_id,
    COUNT(*) AS booking_count,
    COALESCE(SUM(total_price), 0) AS total_revenue,
    COALESCE(SUM(duration_days), 0) AS days_booked
  FROM bookings
  WHERE
    status = 'completed'
    AND end_date >= CURRENT_DATE - INTERVAL '30 days'
),
maintenance_stats AS (
  SELECT
    vehicle_id,
    COALESCE(SUM(cost), 0) AS total_maintenance
  FROM maintenance_records
  WHERE
    status = 'completed'
    AND date_performed >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT
  v.id,
  v.operator_id,
  v.make,
  v.model,
  v.year,
  v.plate AS license_plate,
  v.status AS vehicle_status,
  v.daily_rate,
  v.monthly_insurance_cost,
  v.monthly_payment,
  COALESCE(bs.booking_count, 0) AS booking_count,
  COALESCE(bs.total_revenue, 0) AS total_revenue,
  COALESCE(bs.days_booked, 0) AS days_booked,
  COALESCE(ms.total_maintenance, 0) AS total_maintenance,
  ROUND(
    COALESCE(bs.days_booked, 0)::NUMERIC / 30.0 * 100,
    1
  ) AS utilization_rate,
  COALESCE(bs.total_revenue, 0)
    - COALESCE(ms.total_maintenance, 0)
    - COALESCE(v.monthly_insurance_cost, 0)
    - COALESCE(v.monthly_payment, 0)
  AS net_profit
FROM vehicles v
LEFT JOIN booking_stats bs ON bs.vehicle_id = v.id
LEFT JOIN maintenance_stats ms ON ms.vehicle_id = v.id;
