- Create a trigger function
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on the table
CREATE TRIGGER update_acted_exam_session_subject_products_timestamp
BEFORE UPDATE ON "acted_exam_session_subject_products"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();