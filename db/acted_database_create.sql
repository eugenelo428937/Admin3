--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

-- Started on 2025-02-17 14:22:53

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP DATABASE IF EXISTS "ACTEDDBDEV01";
--
-- TOC entry 4968 (class 1262 OID 16664)
-- Name: ACTEDDBDEV01; Type: DATABASE; Schema: -; Owner: eugenelo1030
--

CREATE DATABASE "ACTEDDBDEV01" WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_United Kingdom.1252';


ALTER DATABASE "ACTEDDBDEV01" OWNER TO "eugenelo1030";

\connect "ACTEDDBDEV01";

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 4 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS "public";
ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- TOC entry 4969 (class 0 OID 0)
-- Dependencies: 4
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- TOC entry 222 (class 1259 OID 16688)
-- Name: auth_group; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."auth_group" (
    "id" integer NOT NULL,
    "name" character varying(150) NOT NULL
);


ALTER TABLE "public"."auth_group" OWNER TO "eugenelo1030";

--
-- TOC entry 221 (class 1259 OID 16687)
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."auth_group" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_group_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 16696)
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."auth_group_permissions" (
    "id" bigint NOT NULL,
    "group_id" integer NOT NULL,
    "permission_id" integer NOT NULL
);


ALTER TABLE "public"."auth_group_permissions" OWNER TO "eugenelo1030";

--
-- TOC entry 223 (class 1259 OID 16695)
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."auth_group_permissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_group_permissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 16682)
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."auth_permission" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "content_type_id" integer NOT NULL,
    "codename" character varying(100) NOT NULL
);


ALTER TABLE "public"."auth_permission" OWNER TO "eugenelo1030";

--
-- TOC entry 219 (class 1259 OID 16681)
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."auth_permission" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_permission_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 16702)
-- Name: auth_user; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."auth_user" (
    "id" integer NOT NULL,
    "password" character varying(128) NOT NULL,
    "last_login" timestamp with time zone,
    "is_superuser" boolean NOT NULL,
    "username" character varying(150) NOT NULL,
    "first_name" character varying(150) NOT NULL,
    "last_name" character varying(150) NOT NULL,
    "email" character varying(254) NOT NULL,
    "is_staff" boolean NOT NULL,
    "is_active" boolean NOT NULL,
    "date_joined" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."auth_user" OWNER TO "eugenelo1030";

--
-- TOC entry 228 (class 1259 OID 16710)
-- Name: auth_user_groups; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."auth_user_groups" (
    "id" bigint NOT NULL,
    "user_id" integer NOT NULL,
    "group_id" integer NOT NULL
);


ALTER TABLE "public"."auth_user_groups" OWNER TO "eugenelo1030";

--
-- TOC entry 227 (class 1259 OID 16709)
-- Name: auth_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."auth_user_groups" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_user_groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 225 (class 1259 OID 16701)
-- Name: auth_user_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."auth_user" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_user_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 230 (class 1259 OID 16716)
-- Name: auth_user_user_permissions; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."auth_user_user_permissions" (
    "id" bigint NOT NULL,
    "user_id" integer NOT NULL,
    "permission_id" integer NOT NULL
);


ALTER TABLE "public"."auth_user_user_permissions" OWNER TO "eugenelo1030";

--
-- TOC entry 229 (class 1259 OID 16715)
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."auth_user_user_permissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."auth_user_user_permissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 232 (class 1259 OID 16774)
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."django_admin_log" (
    "id" integer NOT NULL,
    "action_time" timestamp with time zone NOT NULL,
    "object_id" "text",
    "object_repr" character varying(200) NOT NULL,
    "action_flag" smallint NOT NULL,
    "change_message" "text" NOT NULL,
    "content_type_id" integer,
    "user_id" integer NOT NULL,
    CONSTRAINT "django_admin_log_action_flag_check" CHECK (("action_flag" >= 0))
);


ALTER TABLE "public"."django_admin_log" OWNER TO "eugenelo1030";

--
-- TOC entry 231 (class 1259 OID 16773)
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."django_admin_log" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."django_admin_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 218 (class 1259 OID 16674)
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."django_content_type" (
    "id" integer NOT NULL,
    "app_label" character varying(100) NOT NULL,
    "model" character varying(100) NOT NULL
);


ALTER TABLE "public"."django_content_type" OWNER TO "eugenelo1030";

--
-- TOC entry 217 (class 1259 OID 16673)
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."django_content_type" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."django_content_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 216 (class 1259 OID 16666)
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."django_migrations" (
    "id" bigint NOT NULL,
    "app" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "applied" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."django_migrations" OWNER TO "eugenelo1030";

--
-- TOC entry 215 (class 1259 OID 16665)
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."django_migrations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."django_migrations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 233 (class 1259 OID 16802)
-- Name: django_session; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."django_session" (
    "session_key" character varying(40) NOT NULL,
    "session_data" "text" NOT NULL,
    "expire_date" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."django_session" OWNER TO "eugenelo1030";

--
-- TOC entry 235 (class 1259 OID 16812)
-- Name: students; Type: TABLE; Schema: public; Owner: eugenelo1030
--

CREATE TABLE "public"."students" (
    "student_ref" integer NOT NULL,
    "student_type" character varying(50) NOT NULL,
    "apprentice_type" character varying(50) NOT NULL,
    "create_date" timestamp with time zone NOT NULL,
    "modified_date" timestamp with time zone NOT NULL,
    "remarks" "text",
    "user_id" integer NOT NULL
);


ALTER TABLE "public"."students" OWNER TO "eugenelo1030";

--
-- TOC entry 234 (class 1259 OID 16811)
-- Name: students_student_ref_seq; Type: SEQUENCE; Schema: public; Owner: eugenelo1030
--

ALTER TABLE "public"."students" ALTER COLUMN "student_ref" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."students_student_ref_seq"
    START WITH 66666
    INCREMENT BY 1
    MINVALUE 66666
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4949 (class 0 OID 16688)
-- Dependencies: 222
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--



--
-- TOC entry 4951 (class 0 OID 16696)
-- Dependencies: 224
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--



--
-- TOC entry 4947 (class 0 OID 16682)
-- Dependencies: 220
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--

INSERT INTO "public"."auth_permission" VALUES (1, 'Can add student', 1, 'add_student');
INSERT INTO "public"."auth_permission" VALUES (2, 'Can change student', 1, 'change_student');
INSERT INTO "public"."auth_permission" VALUES (3, 'Can delete student', 1, 'delete_student');
INSERT INTO "public"."auth_permission" VALUES (4, 'Can view student', 1, 'view_student');
INSERT INTO "public"."auth_permission" VALUES (5, 'Can add log entry', 2, 'add_logentry');
INSERT INTO "public"."auth_permission" VALUES (6, 'Can change log entry', 2, 'change_logentry');
INSERT INTO "public"."auth_permission" VALUES (7, 'Can delete log entry', 2, 'delete_logentry');
INSERT INTO "public"."auth_permission" VALUES (8, 'Can view log entry', 2, 'view_logentry');
INSERT INTO "public"."auth_permission" VALUES (9, 'Can add permission', 3, 'add_permission');
INSERT INTO "public"."auth_permission" VALUES (10, 'Can change permission', 3, 'change_permission');
INSERT INTO "public"."auth_permission" VALUES (11, 'Can delete permission', 3, 'delete_permission');
INSERT INTO "public"."auth_permission" VALUES (12, 'Can view permission', 3, 'view_permission');
INSERT INTO "public"."auth_permission" VALUES (13, 'Can add group', 4, 'add_group');
INSERT INTO "public"."auth_permission" VALUES (14, 'Can change group', 4, 'change_group');
INSERT INTO "public"."auth_permission" VALUES (15, 'Can delete group', 4, 'delete_group');
INSERT INTO "public"."auth_permission" VALUES (16, 'Can view group', 4, 'view_group');
INSERT INTO "public"."auth_permission" VALUES (17, 'Can add user', 5, 'add_user');
INSERT INTO "public"."auth_permission" VALUES (18, 'Can change user', 5, 'change_user');
INSERT INTO "public"."auth_permission" VALUES (19, 'Can delete user', 5, 'delete_user');
INSERT INTO "public"."auth_permission" VALUES (20, 'Can view user', 5, 'view_user');
INSERT INTO "public"."auth_permission" VALUES (21, 'Can add content type', 6, 'add_contenttype');
INSERT INTO "public"."auth_permission" VALUES (22, 'Can change content type', 6, 'change_contenttype');
INSERT INTO "public"."auth_permission" VALUES (23, 'Can delete content type', 6, 'delete_contenttype');
INSERT INTO "public"."auth_permission" VALUES (24, 'Can view content type', 6, 'view_contenttype');
INSERT INTO "public"."auth_permission" VALUES (25, 'Can add session', 7, 'add_session');
INSERT INTO "public"."auth_permission" VALUES (26, 'Can change session', 7, 'change_session');
INSERT INTO "public"."auth_permission" VALUES (27, 'Can delete session', 7, 'delete_session');
INSERT INTO "public"."auth_permission" VALUES (28, 'Can view session', 7, 'view_session');


--
-- TOC entry 4953 (class 0 OID 16702)
-- Dependencies: 226
-- Data for Name: auth_user; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--

INSERT INTO "public"."auth_user" VALUES (2, 'pbkdf2_sha256$870000$LjR5ckGh65jfVGufBaiSJe$XhorYUkQY3PQcDfMezUenKT5zhzvprbI18UzpYQgGW4=', NULL, false, 'gluc', '', '', '', false, true, '2024-10-15 12:01:14.948246+01');
INSERT INTO "public"."auth_user" VALUES (4, 'pbkdf2_sha256$870000$DISVRxk9anARPe80JEPddg$8Lu2wK70jLyzunVHcebsf1z/MvlO2GLdHXSqRrSC9UY=', NULL, false, 'testuser', '', '', 'testuser@example.com', false, true, '2024-10-15 13:47:05.04944+01');
INSERT INTO "public"."auth_user" VALUES (6, 'pbkdf2_sha256$870000$uqzz1Hmn15rzZkCRk1jvgv$1qQfojK6yDz6iQoO/EfWdLscUjSIBvn0v+X7NbVFR9w=', NULL, false, 'testuser1', '', '', 'testuser@example.com', false, true, '2024-10-15 13:47:55.449768+01');
INSERT INTO "public"."auth_user" VALUES (7, 'pbkdf2_sha256$870000$30W9dAN3PbEUMHD35awrLI$HxqgjaW7KepiRwyjhWcI0DZ3VzTkEX99UfQwPwcCHZE=', '2024-10-15 17:36:20.190822+01', false, 'test1', '', '', 'test1@bpp.com', false, true, '2024-10-15 17:16:15.825945+01');
INSERT INTO "public"."auth_user" VALUES (8, 'pbkdf2_sha256$870000$ROF92isqpvefJGqOly7188$qH2f6N0ewQMkXNl8Vu2mlUfga92D2f5J7fOPui5a7eA=', '2025-02-17 13:09:52.311242+00', true, 'eugenelo@bpp.com', '', '', 'eugenelo@bpp.com', true, true, '2025-02-17 13:09:29.572344+00');
INSERT INTO "public"."auth_user" VALUES (1, 'pbkdf2_sha256$870000$bfmjsPDEsjss9gPqNRSiuu$/nUO8rdKV4mtXwkAWy4KX3YrWhVFPMYBY0WmY5ExIEs=', '2024-10-15 12:00:35.900443+01', true, 'elo', '', '', 'eugenelo@bpp.com', true, true, '2024-10-15 12:00:17.61488+01');


--
-- TOC entry 4955 (class 0 OID 16710)
-- Dependencies: 228
-- Data for Name: auth_user_groups; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--



--
-- TOC entry 4957 (class 0 OID 16716)
-- Dependencies: 230
-- Data for Name: auth_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--



--
-- TOC entry 4959 (class 0 OID 16774)
-- Dependencies: 232
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--

INSERT INTO "public"."django_admin_log" VALUES (1, '2024-10-15 12:01:15.26379+01', '2', 'gluc', 1, '[{"added": {}}]', 5, 1);
INSERT INTO "public"."django_admin_log" VALUES (2, '2024-10-15 12:01:36.998671+01', '1', 'gluc - 1', 1, '[{"added": {}}]', 1, 1);
INSERT INTO "public"."django_admin_log" VALUES (3, '2024-10-15 16:56:28.867209+01', '66667', 'testuser1 - Full-time', 3, '', 1, 1);
INSERT INTO "public"."django_admin_log" VALUES (4, '2025-02-17 13:10:17.888068+00', '66669', 'testuser1 - 1', 1, '[{"added": {}}]', 1, 8);
INSERT INTO "public"."django_admin_log" VALUES (5, '2025-02-17 14:01:19.596812+00', '1', 'elo', 2, '[{"changed": {"fields": ["password"]}}]', 5, 8);


--
-- TOC entry 4945 (class 0 OID 16674)
-- Dependencies: 218
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--

INSERT INTO "public"."django_content_type" VALUES (1, 'students', 'student');
INSERT INTO "public"."django_content_type" VALUES (2, 'admin', 'logentry');
INSERT INTO "public"."django_content_type" VALUES (3, 'auth', 'permission');
INSERT INTO "public"."django_content_type" VALUES (4, 'auth', 'group');
INSERT INTO "public"."django_content_type" VALUES (5, 'auth', 'user');
INSERT INTO "public"."django_content_type" VALUES (6, 'contenttypes', 'contenttype');
INSERT INTO "public"."django_content_type" VALUES (7, 'sessions', 'session');


--
-- TOC entry 4943 (class 0 OID 16666)
-- Dependencies: 216
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--

INSERT INTO "public"."django_migrations" VALUES (1, 'contenttypes', '0001_initial', '2024-10-11 17:10:57.403873+01');
INSERT INTO "public"."django_migrations" VALUES (2, 'auth', '0001_initial', '2024-10-11 17:10:57.610687+01');
INSERT INTO "public"."django_migrations" VALUES (3, 'admin', '0001_initial', '2024-10-11 17:10:57.667247+01');
INSERT INTO "public"."django_migrations" VALUES (4, 'admin', '0002_logentry_remove_auto_add', '2024-10-11 17:10:57.674288+01');
INSERT INTO "public"."django_migrations" VALUES (5, 'admin', '0003_logentry_add_action_flag_choices', '2024-10-11 17:10:57.680963+01');
INSERT INTO "public"."django_migrations" VALUES (6, 'contenttypes', '0002_remove_content_type_name', '2024-10-11 17:10:57.696496+01');
INSERT INTO "public"."django_migrations" VALUES (7, 'auth', '0002_alter_permission_name_max_length', '2024-10-11 17:10:57.704538+01');
INSERT INTO "public"."django_migrations" VALUES (8, 'auth', '0003_alter_user_email_max_length', '2024-10-11 17:10:57.712157+01');
INSERT INTO "public"."django_migrations" VALUES (9, 'auth', '0004_alter_user_username_opts', '2024-10-11 17:10:57.719228+01');
INSERT INTO "public"."django_migrations" VALUES (10, 'auth', '0005_alter_user_last_login_null', '2024-10-11 17:10:57.727231+01');
INSERT INTO "public"."django_migrations" VALUES (11, 'auth', '0006_require_contenttypes_0002', '2024-10-11 17:10:57.729745+01');
INSERT INTO "public"."django_migrations" VALUES (12, 'auth', '0007_alter_validators_add_error_messages', '2024-10-11 17:10:57.738259+01');
INSERT INTO "public"."django_migrations" VALUES (13, 'auth', '0008_alter_user_username_max_length', '2024-10-11 17:10:57.754877+01');
INSERT INTO "public"."django_migrations" VALUES (14, 'auth', '0009_alter_user_last_name_max_length', '2024-10-11 17:10:57.76226+01');
INSERT INTO "public"."django_migrations" VALUES (15, 'auth', '0010_alter_group_name_max_length', '2024-10-11 17:10:57.770736+01');
INSERT INTO "public"."django_migrations" VALUES (16, 'auth', '0011_update_proxy_permissions', '2024-10-11 17:10:57.779485+01');
INSERT INTO "public"."django_migrations" VALUES (17, 'auth', '0012_alter_user_first_name_max_length', '2024-10-11 17:10:57.786507+01');
INSERT INTO "public"."django_migrations" VALUES (18, 'sessions', '0001_initial', '2024-10-11 17:10:57.813826+01');
INSERT INTO "public"."django_migrations" VALUES (19, 'students', '0001_initial', '2024-10-11 17:10:57.8567+01');


--
-- TOC entry 4960 (class 0 OID 16802)
-- Dependencies: 233
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--

INSERT INTO "public"."django_session" VALUES ('4n8e7pn9vf132gbvw6834el99nc8jgjf', '.eJxVjMsOwiAURP-FtSFwS0Fcuu83EO5DqRqalHZl_HfbpAtdzGbOmXmrlNelpLXJnEZWF2XV6bfDTE-pO-BHrvdJ01SXeUS9K_qgTQ8Ty-t6uH8HJbeyrb1EcSjGQtwCZJ0T788hkxH2QBEtMhimAL2HngQhdBxiYNvdODj1-QLVYDea:1t0fI3:q1NriF6sMXfrB6AR6C8miXky94BcCFgMBCv9AWiGObs', '2024-10-29 11:00:35.920845+00');
INSERT INTO "public"."django_session" VALUES ('gjyln5rkhcj7z20uuuqdb8j2nfrqt17a', '.eJxVjDsOwjAQBe_iGllaf2Kbkp4zWOvdDQ4gR4qTCnF3iJQC2jcz76UybmvNW5clT6zOKqjT71aQHtJ2wHdst1nT3NZlKnpX9EG7vs4sz8vh_h1U7PVbD-hEGBxgBBaP6EJJCSITJOCxOBZrDZMpwVjvvBCYNAASB0EZo3p_AACyOL8:1t0kFX:Keu5DnupD6RSY7DVyBfC3j2WcOKaz5lWLVuzL61bahI', '2024-10-29 16:18:19.559957+00');
INSERT INTO "public"."django_session" VALUES ('03qjew1h9u0liwad4284z3z3alcp6bst', '.eJxVjDsOwjAQBe_iGllaf2Kbkp4zWOvdDQ4gR4qTCnF3iJQC2jcz76UybmvNW5clT6zOKqjT71aQHtJ2wHdst1nT3NZlKnpX9EG7vs4sz8vh_h1U7PVbD-hEGBxgBBaP6EJJCSITJOCxOBZrDZMpwVjvvBCYNAASB0EZo3p_AACyOL8:1t0kWy:sGS5vImZn8Mku-l06t53bm52uyrqf9Cz8k9ZPLVlgDE', '2024-10-29 16:36:20.196568+00');
INSERT INTO "public"."django_session" VALUES ('xr7vv4bsp3arzth27ty48k8yg6w7249s', '.eJxVjDsOwjAQBe_iGln-fyjpOYO1a69xADlSnFSIu0OkFNC-mXkvlmBbW9oGLWkq7MwCO_1uCPlBfQflDv028zz3dZmQ7wo_6ODXudDzcrh_Bw1G-9YyKsrSqAAkbCGLVQRtUYHxmjxSrV4gCGeirC6Cy4Kytt5XAI1GFfb-AO-AOFw:1tk1gV:jX1wp7i54QkjfJd3TBPeFk-7fu9OBXEOdxdf8qJbRFc', '2025-03-03 14:01:19.621926+00');


--
-- TOC entry 4962 (class 0 OID 16812)
-- Dependencies: 235
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--

INSERT INTO "public"."students" VALUES (1, '1', '2', '2024-10-15 12:01:36.992812+01', '2024-10-15 12:01:36.992812+01', 'asd', 2);
INSERT INTO "public"."students" VALUES (66666, 'Full-time', 'Type A', '2024-10-15 13:47:05.408635+01', '2024-10-15 13:47:05.408635+01', 'No remarks', 4);
INSERT INTO "public"."students" VALUES (66668, '1', '2', '2024-10-15 17:16:16.352086+01', '2024-10-15 17:16:16.352086+01', '321', 7);
INSERT INTO "public"."students" VALUES (66669, '1', '4', '2025-02-17 13:10:17.882054+00', '2025-02-17 13:10:17.882054+00', '', 6);


--
-- TOC entry 4970 (class 0 OID 0)
-- Dependencies: 221
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."auth_group_id_seq"', 1, false);


--
-- TOC entry 4971 (class 0 OID 0)
-- Dependencies: 223
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."auth_group_permissions_id_seq"', 1, false);


--
-- TOC entry 4972 (class 0 OID 0)
-- Dependencies: 219
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."auth_permission_id_seq"', 28, true);


--
-- TOC entry 4973 (class 0 OID 0)
-- Dependencies: 227
-- Name: auth_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."auth_user_groups_id_seq"', 1, false);


--
-- TOC entry 4974 (class 0 OID 0)
-- Dependencies: 225
-- Name: auth_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."auth_user_id_seq"', 8, true);


--
-- TOC entry 4975 (class 0 OID 0)
-- Dependencies: 229
-- Name: auth_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."auth_user_user_permissions_id_seq"', 1, false);


--
-- TOC entry 4976 (class 0 OID 0)
-- Dependencies: 231
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."django_admin_log_id_seq"', 5, true);


--
-- TOC entry 4977 (class 0 OID 0)
-- Dependencies: 217
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."django_content_type_id_seq"', 7, true);


--
-- TOC entry 4978 (class 0 OID 0)
-- Dependencies: 215
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."django_migrations_id_seq"', 19, true);


--
-- TOC entry 4979 (class 0 OID 0)
-- Dependencies: 234
-- Name: students_student_ref_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('"public"."students_student_ref_seq"', 66669, true);


--
-- TOC entry 4751 (class 2606 OID 16800)
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_group"
    ADD CONSTRAINT "auth_group_name_key" UNIQUE ("name");


--
-- TOC entry 4756 (class 2606 OID 16731)
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_group_permissions"
    ADD CONSTRAINT "auth_group_permissions_group_id_permission_id_0cd325b0_uniq" UNIQUE ("group_id", "permission_id");


--
-- TOC entry 4759 (class 2606 OID 16700)
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_group_permissions"
    ADD CONSTRAINT "auth_group_permissions_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4753 (class 2606 OID 16692)
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_group"
    ADD CONSTRAINT "auth_group_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4746 (class 2606 OID 16722)
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_permission"
    ADD CONSTRAINT "auth_permission_content_type_id_codename_01ab375a_uniq" UNIQUE ("content_type_id", "codename");


--
-- TOC entry 4748 (class 2606 OID 16686)
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_permission"
    ADD CONSTRAINT "auth_permission_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4767 (class 2606 OID 16714)
-- Name: auth_user_groups auth_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user_groups"
    ADD CONSTRAINT "auth_user_groups_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4770 (class 2606 OID 16746)
-- Name: auth_user_groups auth_user_groups_user_id_group_id_94350c0c_uniq; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user_groups"
    ADD CONSTRAINT "auth_user_groups_user_id_group_id_94350c0c_uniq" UNIQUE ("user_id", "group_id");


--
-- TOC entry 4761 (class 2606 OID 16706)
-- Name: auth_user auth_user_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user"
    ADD CONSTRAINT "auth_user_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4773 (class 2606 OID 16720)
-- Name: auth_user_user_permissions auth_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user_user_permissions"
    ADD CONSTRAINT "auth_user_user_permissions_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4776 (class 2606 OID 16760)
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_permission_id_14a6b632_uniq; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user_user_permissions"
    ADD CONSTRAINT "auth_user_user_permissions_user_id_permission_id_14a6b632_uniq" UNIQUE ("user_id", "permission_id");


--
-- TOC entry 4764 (class 2606 OID 16795)
-- Name: auth_user auth_user_username_key; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user"
    ADD CONSTRAINT "auth_user_username_key" UNIQUE ("username");


--
-- TOC entry 4779 (class 2606 OID 16781)
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."django_admin_log"
    ADD CONSTRAINT "django_admin_log_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4741 (class 2606 OID 16680)
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."django_content_type"
    ADD CONSTRAINT "django_content_type_app_label_model_76bd3d3b_uniq" UNIQUE ("app_label", "model");


--
-- TOC entry 4743 (class 2606 OID 16678)
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."django_content_type"
    ADD CONSTRAINT "django_content_type_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4739 (class 2606 OID 16672)
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."django_migrations"
    ADD CONSTRAINT "django_migrations_pkey" PRIMARY KEY ("id");


--
-- TOC entry 4783 (class 2606 OID 16808)
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."django_session"
    ADD CONSTRAINT "django_session_pkey" PRIMARY KEY ("session_key");


--
-- TOC entry 4786 (class 2606 OID 16818)
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("student_ref");


--
-- TOC entry 4788 (class 2606 OID 16820)
-- Name: students students_user_id_key; Type: CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_key" UNIQUE ("user_id");


--
-- TOC entry 4749 (class 1259 OID 16801)
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_group_name_a6ea08ec_like" ON "public"."auth_group" USING "btree" ("name" "varchar_pattern_ops");


--
-- TOC entry 4754 (class 1259 OID 16742)
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_group_permissions_group_id_b120cbf9" ON "public"."auth_group_permissions" USING "btree" ("group_id");


--
-- TOC entry 4757 (class 1259 OID 16743)
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_group_permissions_permission_id_84c5c92e" ON "public"."auth_group_permissions" USING "btree" ("permission_id");


--
-- TOC entry 4744 (class 1259 OID 16728)
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_permission_content_type_id_2f476e4b" ON "public"."auth_permission" USING "btree" ("content_type_id");


--
-- TOC entry 4765 (class 1259 OID 16758)
-- Name: auth_user_groups_group_id_97559544; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_user_groups_group_id_97559544" ON "public"."auth_user_groups" USING "btree" ("group_id");


--
-- TOC entry 4768 (class 1259 OID 16757)
-- Name: auth_user_groups_user_id_6a12ed8b; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_user_groups_user_id_6a12ed8b" ON "public"."auth_user_groups" USING "btree" ("user_id");


--
-- TOC entry 4771 (class 1259 OID 16772)
-- Name: auth_user_user_permissions_permission_id_1fbb5f2c; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_user_user_permissions_permission_id_1fbb5f2c" ON "public"."auth_user_user_permissions" USING "btree" ("permission_id");


--
-- TOC entry 4774 (class 1259 OID 16771)
-- Name: auth_user_user_permissions_user_id_a95ead1b; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_user_user_permissions_user_id_a95ead1b" ON "public"."auth_user_user_permissions" USING "btree" ("user_id");


--
-- TOC entry 4762 (class 1259 OID 16796)
-- Name: auth_user_username_6821ab7c_like; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "auth_user_username_6821ab7c_like" ON "public"."auth_user" USING "btree" ("username" "varchar_pattern_ops");


--
-- TOC entry 4777 (class 1259 OID 16792)
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "django_admin_log_content_type_id_c4bce8eb" ON "public"."django_admin_log" USING "btree" ("content_type_id");


--
-- TOC entry 4780 (class 1259 OID 16793)
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "django_admin_log_user_id_c564eba6" ON "public"."django_admin_log" USING "btree" ("user_id");


--
-- TOC entry 4781 (class 1259 OID 16810)
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "django_session_expire_date_a5c62663" ON "public"."django_session" USING "btree" ("expire_date");


--
-- TOC entry 4784 (class 1259 OID 16809)
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: eugenelo1030
--

CREATE INDEX "django_session_session_key_c0390e0f_like" ON "public"."django_session" USING "btree" ("session_key" "varchar_pattern_ops");


--
-- TOC entry 4790 (class 2606 OID 16737)
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_group_permissions"
    ADD CONSTRAINT "auth_group_permissio_permission_id_84c5c92e_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "public"."auth_permission"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4791 (class 2606 OID 16732)
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_group_permissions"
    ADD CONSTRAINT "auth_group_permissions_group_id_b120cbf9_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "public"."auth_group"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4789 (class 2606 OID 16723)
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_permission"
    ADD CONSTRAINT "auth_permission_content_type_id_2f476e4b_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "public"."django_content_type"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4792 (class 2606 OID 16752)
-- Name: auth_user_groups auth_user_groups_group_id_97559544_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user_groups"
    ADD CONSTRAINT "auth_user_groups_group_id_97559544_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "public"."auth_group"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4793 (class 2606 OID 16747)
-- Name: auth_user_groups auth_user_groups_user_id_6a12ed8b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user_groups"
    ADD CONSTRAINT "auth_user_groups_user_id_6a12ed8b_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4794 (class 2606 OID 16766)
-- Name: auth_user_user_permissions auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user_user_permissions"
    ADD CONSTRAINT "auth_user_user_permi_permission_id_1fbb5f2c_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "public"."auth_permission"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4795 (class 2606 OID 16761)
-- Name: auth_user_user_permissions auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."auth_user_user_permissions"
    ADD CONSTRAINT "auth_user_user_permissions_user_id_a95ead1b_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4796 (class 2606 OID 16782)
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."django_admin_log"
    ADD CONSTRAINT "django_admin_log_content_type_id_c4bce8eb_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "public"."django_content_type"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4797 (class 2606 OID 16787)
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."django_admin_log"
    ADD CONSTRAINT "django_admin_log_user_id_c564eba6_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 4798 (class 2606 OID 16821)
-- Name: students students_user_id_42864fc9_fk_auth_user_id; Type: FK CONSTRAINT; Schema: public; Owner: eugenelo1030
--

ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_42864fc9_fk_auth_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") DEFERRABLE INITIALLY DEFERRED;


-- Completed on 2025-02-17 14:22:54

--
-- PostgreSQL database dump complete
--

