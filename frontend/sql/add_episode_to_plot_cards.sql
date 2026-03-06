-- Add episode column to plot_cards table
ALTER TABLE plot_cards 
ADD COLUMN episode integer DEFAULT 1 NOT NULL;

-- Comment on column
COMMENT ON COLUMN plot_cards.episode IS 'Episode number within the chapter (list)';
