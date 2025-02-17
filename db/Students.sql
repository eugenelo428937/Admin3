-- Table: public.Students

-- DROP TABLE IF EXISTS public."Students";
CREATE SEQUENCE students_student_ref_seq RESTART WITH 66666;

CREATE TABLE IF NOT EXISTS public."Students"
(
    student_ref integer NOT NULL DEFAULT nextval('"Students_student_ref_seq"'::regclass),
    user_id integer NOT NULL,
    CONSTRAINT "Students_pkey" PRIMARY KEY (student_ref)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public."Students"
    OWNER to postgres;

