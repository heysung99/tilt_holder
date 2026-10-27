// Columns added after the tables were first created. The API server runs this on
// first use so existing databases pick them up without a separate migration step;
// the ALTERs only run when a column is missing, so routine cold starts don't take
// a lock on the tables.
export const addMissingColumnsSql = `
  DO $$
  BEGIN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = current_schema() AND (
          (table_name = 'games' AND column_name IN ('buy_ins', 'buy_in_log', 'hand_histories'))
          OR (table_name = 'current_session' AND column_name = 'hand_histories'))) < 4 THEN
      ALTER TABLE games
        ADD COLUMN IF NOT EXISTS buy_ins jsonb,
        ADD COLUMN IF NOT EXISTS buy_in_log jsonb,
        ADD COLUMN IF NOT EXISTS hand_histories jsonb;
      ALTER TABLE current_session
        ADD COLUMN IF NOT EXISTS hand_histories jsonb NOT NULL DEFAULT '[]'::jsonb;
    END IF;
  END $$
`;
