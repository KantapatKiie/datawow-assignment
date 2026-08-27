-- One active seat per user per concert.
-- A partial index is used so a cancelled reservation does not block the user from booking
-- the same concert again later. This is the database-level guarantee behind the
-- "1 seat per 1 user per concert" rule.
CREATE UNIQUE INDEX "reservations_one_active_per_user_concert"
  ON "reservations" ("user_id", "concert_id")
  WHERE "status" = 'RESERVED';

-- Last line of defence against overbooking: even a buggy release cannot push the counter past
-- capacity or below zero, the transaction simply fails.
ALTER TABLE "concerts"
  ADD CONSTRAINT "concerts_reserved_seats_within_capacity"
  CHECK ("reserved_seats" >= 0 AND "reserved_seats" <= "total_seats");
