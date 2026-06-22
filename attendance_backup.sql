--
-- PostgreSQL database dump
--

\restrict EBUJshAT89NMShrldzaUE8jqrrMcmhvB3anFyTFrkUvx50aE6RoBQnYsP7g1B3k

-- Dumped from database version 15.18 (Debian 15.18-1.pgdg13+1)
-- Dumped by pg_dump version 15.18 (Debian 15.18-1.pgdg13+1)

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
-- Name: request_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.request_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
);


ALTER TYPE public.request_status OWNER TO postgres;

--
-- Name: request_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.request_type AS ENUM (
    'leave',
    'permission',
    'flexible',
    'ot'
);


ALTER TYPE public.request_type OWNER TO postgres;

--
-- Name: swap_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.swap_status AS ENUM (
    'pending',
    'accepted_by_target',
    'approved_by_manager',
    'approved_by_admin',
    'rejected'
);


ALTER TYPE public.swap_status OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'employee',
    'manager',
    'admin',
    'staff',
    'line_manager',
    'department_head',
    'management_hr',
    'payroll_officer'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    key character varying(100) NOT NULL,
    value text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date date NOT NULL,
    check_in_time time without time zone,
    check_in_lat numeric(10,8),
    check_in_lon numeric(11,8),
    check_out_time time without time zone,
    check_out_lat numeric(10,8),
    check_out_lon numeric(11,8),
    is_late boolean,
    is_early_checkout boolean,
    worked_hours numeric(5,2),
    remark character varying(255),
    flexible_scan boolean DEFAULT false,
    requires_manager_approval boolean DEFAULT false,
    manager_approved boolean,
    manager_approved_at timestamp without time zone,
    manager_approved_by integer,
    needs_approval_reason character varying(255),
    swap_related boolean DEFAULT false,
    swap_id integer,
    swapped_out boolean DEFAULT false
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: company_location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_location (
    id integer NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    radius_meters integer NOT NULL
);


ALTER TABLE public.company_location OWNER TO postgres;

--
-- Name: company_location_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.company_location_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.company_location_id_seq OWNER TO postgres;

--
-- Name: company_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.company_location_id_seq OWNED BY public.company_location.id;


--
-- Name: employee_histories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_histories (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event_type character varying(50) NOT NULL,
    title character varying(120) NOT NULL,
    description text,
    effective_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.employee_histories OWNER TO postgres;

--
-- Name: employee_histories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_histories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employee_histories_id_seq OWNER TO postgres;

--
-- Name: employee_histories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_histories_id_seq OWNED BY public.employee_histories.id;


--
-- Name: employee_movement_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_movement_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    requested_by integer NOT NULL,
    movement_type character varying(50) NOT NULL,
    effective_date date NOT NULL,
    current_position character varying(100),
    proposed_position character varying(100),
    current_department character varying(100),
    proposed_department character varying(100),
    current_sub_department character varying(100),
    proposed_sub_department character varying(100),
    current_job_grade character varying(50),
    proposed_job_grade character varying(50),
    current_salary numeric(12,2),
    proposed_salary numeric(12,2),
    current_contract_type character varying(50),
    proposed_contract_type character varying(50),
    current_status character varying(30),
    proposed_status character varying(30),
    reason text,
    status character varying(30) NOT NULL,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    review_remarks text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.employee_movement_requests OWNER TO postgres;

--
-- Name: employee_movement_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_movement_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employee_movement_requests_id_seq OWNER TO postgres;

--
-- Name: employee_movement_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_movement_requests_id_seq OWNED BY public.employee_movement_requests.id;


--
-- Name: employee_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employee_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    phone character varying(50),
    address character varying(255),
    "position" character varying(100),
    sub_department character varying(100),
    job_grade character varying(50),
    contract_type character varying(50) NOT NULL,
    contract_start_date date,
    contract_end_date date,
    basic_salary numeric(12,2) NOT NULL,
    bank_account character varying(100),
    profile_photo text,
    status character varying(30) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.employee_profiles OWNER TO postgres;

--
-- Name: employee_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employee_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employee_profiles_id_seq OWNER TO postgres;

--
-- Name: employee_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employee_profiles_id_seq OWNED BY public.employee_profiles.id;


--
-- Name: kpi_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kpi_records (
    id integer NOT NULL,
    user_id integer NOT NULL,
    name character varying(120) NOT NULL,
    target_value numeric(12,2) NOT NULL,
    actual_value numeric(12,2) NOT NULL,
    weight numeric(5,2) NOT NULL,
    period character varying(40) NOT NULL,
    status character varying(30) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.kpi_records OWNER TO postgres;

--
-- Name: kpi_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kpi_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.kpi_records_id_seq OWNER TO postgres;

--
-- Name: kpi_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kpi_records_id_seq OWNED BY public.kpi_records.id;


--
-- Name: location_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_alerts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date date NOT NULL,
    latitude numeric(10,8) NOT NULL,
    longitude numeric(11,8) NOT NULL,
    distance_meters numeric(10,2) NOT NULL,
    action_type character varying(20) NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.location_alerts OWNER TO postgres;

--
-- Name: location_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.location_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.location_alerts_id_seq OWNER TO postgres;

--
-- Name: location_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.location_alerts_id_seq OWNED BY public.location_alerts.id;


--
-- Name: payroll_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payroll_records (
    id integer NOT NULL,
    user_id integer NOT NULL,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    basic_salary numeric(12,2) NOT NULL,
    overtime_amount numeric(12,2) NOT NULL,
    allowances numeric(12,2) NOT NULL,
    bonus numeric(12,2) NOT NULL,
    benefits numeric(12,2) NOT NULL,
    salary_adjustment numeric(12,2) NOT NULL,
    tax_deduction numeric(12,2) NOT NULL,
    nssf_deduction numeric(12,2) NOT NULL,
    other_deductions numeric(12,2) NOT NULL,
    gross_pay numeric(12,2) NOT NULL,
    net_pay numeric(12,2) NOT NULL,
    status character varying(30) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.payroll_records OWNER TO postgres;

--
-- Name: payroll_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payroll_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.payroll_records_id_seq OWNER TO postgres;

--
-- Name: payroll_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payroll_records_id_seq OWNED BY public.payroll_records.id;


--
-- Name: performance_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.performance_reviews (
    id integer NOT NULL,
    user_id integer NOT NULL,
    reviewer_id integer,
    review_period character varying(40) NOT NULL,
    score numeric(5,2) NOT NULL,
    rating character varying(40) NOT NULL,
    comments text,
    status character varying(30) NOT NULL,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.performance_reviews OWNER TO postgres;

--
-- Name: performance_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.performance_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.performance_reviews_id_seq OWNER TO postgres;

--
-- Name: performance_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.performance_reviews_id_seq OWNED BY public.performance_reviews.id;


--
-- Name: public_holidays; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.public_holidays (
    id integer NOT NULL,
    name character varying(120) NOT NULL,
    holiday_date date NOT NULL,
    country character varying(80) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.public_holidays OWNER TO postgres;

--
-- Name: public_holidays_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.public_holidays_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.public_holidays_id_seq OWNER TO postgres;

--
-- Name: public_holidays_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.public_holidays_id_seq OWNED BY public.public_holidays.id;


--
-- Name: requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type public.request_type NOT NULL,
    date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    reason text,
    status public.request_status,
    admin_remarks text,
    created_at timestamp without time zone DEFAULT now(),
    leave_type character varying(50),
    backup_user_id integer,
    backup_status character varying(20) DEFAULT 'skipped'::character varying,
    backup_approved_at timestamp without time zone,
    line_manager_status character varying(20) DEFAULT 'pending'::character varying,
    line_manager_approved_by integer,
    line_manager_approved_at timestamp without time zone,
    department_head_status character varying(20) DEFAULT 'pending'::character varying,
    department_head_approved_by integer,
    department_head_approved_at timestamp without time zone,
    hr_status character varying(20) DEFAULT 'pending'::character varying,
    hr_approved_by integer,
    hr_approved_at timestamp without time zone
);


ALTER TABLE public.requests OWNER TO postgres;

--
-- Name: requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.requests_id_seq OWNER TO postgres;

--
-- Name: requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.requests_id_seq OWNED BY public.requests.id;


--
-- Name: schedule_changes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.schedule_changes (
    id integer NOT NULL,
    schedule_id integer,
    user_id integer NOT NULL,
    old_shift character varying(120),
    new_shift character varying(120) NOT NULL,
    reason character varying(255) NOT NULL,
    status character varying(30) NOT NULL,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.schedule_changes OWNER TO postgres;

--
-- Name: schedule_changes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.schedule_changes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.schedule_changes_id_seq OWNER TO postgres;

--
-- Name: schedule_changes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.schedule_changes_id_seq OWNED BY public.schedule_changes.id;


--
-- Name: shift_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift_schedules (
    id integer NOT NULL,
    user_id integer NOT NULL,
    shift_name character varying(80) NOT NULL,
    work_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    location character varying(120),
    is_active boolean NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shift_schedules OWNER TO postgres;

--
-- Name: shift_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.shift_schedules_id_seq OWNER TO postgres;

--
-- Name: shift_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_schedules_id_seq OWNED BY public.shift_schedules.id;


--
-- Name: swap_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.swap_requests (
    id integer NOT NULL,
    requester_id integer NOT NULL,
    target_user_id integer NOT NULL,
    swap_date date NOT NULL,
    status public.swap_status NOT NULL
);


ALTER TABLE public.swap_requests OWNER TO postgres;

--
-- Name: swap_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.swap_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.swap_requests_id_seq OWNER TO postgres;

--
-- Name: swap_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.swap_requests_id_seq OWNED BY public.swap_requests.id;


--
-- Name: training_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.training_records (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(120) NOT NULL,
    provider character varying(120),
    start_date date NOT NULL,
    end_date date,
    status character varying(30) NOT NULL,
    score numeric(5,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.training_records OWNER TO postgres;

--
-- Name: training_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.training_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.training_records_id_seq OWNER TO postgres;

--
-- Name: training_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.training_records_id_seq OWNED BY public.training_records.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    emp_code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    department character varying(100),
    manager_id integer
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: company_location id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_location ALTER COLUMN id SET DEFAULT nextval('public.company_location_id_seq'::regclass);


--
-- Name: employee_histories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_histories ALTER COLUMN id SET DEFAULT nextval('public.employee_histories_id_seq'::regclass);


--
-- Name: employee_movement_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_movement_requests ALTER COLUMN id SET DEFAULT nextval('public.employee_movement_requests_id_seq'::regclass);


--
-- Name: employee_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles ALTER COLUMN id SET DEFAULT nextval('public.employee_profiles_id_seq'::regclass);


--
-- Name: kpi_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kpi_records ALTER COLUMN id SET DEFAULT nextval('public.kpi_records_id_seq'::regclass);


--
-- Name: location_alerts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_alerts ALTER COLUMN id SET DEFAULT nextval('public.location_alerts_id_seq'::regclass);


--
-- Name: payroll_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_records ALTER COLUMN id SET DEFAULT nextval('public.payroll_records_id_seq'::regclass);


--
-- Name: performance_reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_reviews ALTER COLUMN id SET DEFAULT nextval('public.performance_reviews_id_seq'::regclass);


--
-- Name: public_holidays id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_holidays ALTER COLUMN id SET DEFAULT nextval('public.public_holidays_id_seq'::regclass);


--
-- Name: requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests ALTER COLUMN id SET DEFAULT nextval('public.requests_id_seq'::regclass);


--
-- Name: schedule_changes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_changes ALTER COLUMN id SET DEFAULT nextval('public.schedule_changes_id_seq'::regclass);


--
-- Name: shift_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_schedules ALTER COLUMN id SET DEFAULT nextval('public.shift_schedules_id_seq'::regclass);


--
-- Name: swap_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swap_requests ALTER COLUMN id SET DEFAULT nextval('public.swap_requests_id_seq'::regclass);


--
-- Name: training_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_records ALTER COLUMN id SET DEFAULT nextval('public.training_records_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (key, value, updated_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, user_id, date, check_in_time, check_in_lat, check_in_lon, check_out_time, check_out_lat, check_out_lon, is_late, is_early_checkout, worked_hours, remark, flexible_scan, requires_manager_approval, manager_approved, manager_approved_at, manager_approved_by, needs_approval_reason, swap_related, swap_id, swapped_out) FROM stdin;
8	2	2026-06-01	01:56:57	11.55261236	104.88425708	10:04:15	11.55245065	104.88440653	f	t	8.12	\N	t	f	\N	\N	\N	\N	f	\N	f
9	4	2026-06-01	10:23:47	11.55240771	104.88444931	10:42:15	\N	\N	t	t	0.31	 checkout scan (no location)	f	f	t	\N	\N	\N	f	\N	f
10	8	2026-06-05	16:19:38	11.55235099	104.88452216	\N	\N	\N	t	f	\N	\N	f	f	t	\N	\N	\N	f	\N	f
1	2	2026-05-30	17:46:52	10.00000000	106.00000000	18:31:59	11.55250084	104.88434686	t	f	0.75	\N	f	f	\N	\N	\N	\N	f	\N	f
3	10	2026-05-31	16:14:48	11.52778215	104.91207646	16:15:11	11.52778215	104.91207646	t	t	0.01	\N	t	t	\N	\N	\N	Late flexible check-in	f	\N	f
4	5	2026-05-31	16:16:05	11.52773697	104.91207325	\N	\N	\N	t	f	\N	\N	t	t	\N	\N	\N	Late flexible check-in	f	\N	f
5	8	2026-05-31	16:22:55	11.52773697	104.91207325	16:23:08	11.52773697	104.91207325	t	t	0.00	\N	t	t	\N	\N	\N	Late flexible check-in	f	\N	f
6	7	2026-05-31	16:23:39	11.52776500	104.91206750	16:24:45	11.52776500	104.91206750	t	t	0.02	\N	t	t	\N	\N	\N	Late flexible check-in	f	\N	f
2	2	2026-05-31	09:00:00	10.00000000	106.00000000	16:31:53	11.52773675	104.91208173	t	t	7.53	\N	f	f	\N	\N	\N	\N	f	\N	f
7	4	2026-05-31	17:18:56	11.52771339	104.91206604	23:59:00	\N	\N	t	f	6.67	system override	t	t	\N	\N	\N	Late flexible check-in	f	\N	f
\.


--
-- Data for Name: company_location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.company_location (id, latitude, longitude, radius_meters) FROM stdin;
1	11.55244230	104.88438160	1000
\.


--
-- Data for Name: employee_histories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_histories (id, user_id, event_type, title, description, effective_date, created_at) FROM stdin;
1	2	hire	Employee onboarded	Management HR joined the HR department.	2026-01-01	2026-06-05 09:17:14.623603
2	3	hire	Employee onboarded	Developer Head joined the Developer department.	2026-01-01	2026-06-05 09:17:14.623603
3	4	hire	Employee onboarded	Finance Head joined the Finance department.	2026-01-01	2026-06-05 09:17:14.623603
4	5	hire	Employee onboarded	HR Head joined the HR department.	2026-01-01	2026-06-05 09:17:14.623603
5	6	hire	Employee onboarded	Operations Head joined the Operations department.	2026-01-01	2026-06-05 09:17:14.623603
6	12	hire	Employee onboarded	Payroll Officer joined the Finance department.	2026-01-01	2026-06-05 09:17:14.623603
7	7	hire	Employee onboarded	Developer Line Manager joined the Developer department.	2026-01-01	2026-06-05 09:17:14.623603
8	8	hire	Employee onboarded	Developer Staff joined the Developer department.	2026-01-01	2026-06-05 09:17:14.623603
9	9	hire	Employee onboarded	Finance Staff joined the Finance department.	2026-01-01	2026-06-05 09:17:14.623603
10	10	hire	Employee onboarded	HR Staff joined the HR department.	2026-01-01	2026-06-05 09:17:14.623603
11	11	hire	Employee onboarded	Operations Staff joined the Operations department.	2026-01-01	2026-06-05 09:17:14.623603
\.


--
-- Data for Name: employee_movement_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_movement_requests (id, user_id, requested_by, movement_type, effective_date, current_position, proposed_position, current_department, proposed_department, current_sub_department, proposed_sub_department, current_job_grade, proposed_job_grade, current_salary, proposed_salary, current_contract_type, proposed_contract_type, current_status, proposed_status, reason, status, reviewed_by, reviewed_at, review_remarks, created_at) FROM stdin;
\.


--
-- Data for Name: employee_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employee_profiles (id, user_id, phone, address, "position", sub_department, job_grade, contract_type, contract_start_date, contract_end_date, basic_salary, bank_account, profile_photo, status, created_at, updated_at) FROM stdin;
1	2	+855 12 000002	Phnom Penh	HR Manager	\N	\N	full_time	2026-01-01	\N	2200.00	PSB000002	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
2	3	+855 12 000003	Phnom Penh	Department Head	\N	\N	full_time	2026-01-01	\N	1800.00	PSB000003	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
3	4	+855 12 000004	Phnom Penh	Department Head	\N	\N	full_time	2026-01-01	\N	1800.00	PSB000004	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
4	5	+855 12 000005	Phnom Penh	Department Head	\N	\N	full_time	2026-01-01	\N	1800.00	PSB000005	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
5	6	+855 12 000006	Phnom Penh	Department Head	\N	\N	full_time	2026-01-01	\N	1800.00	PSB000006	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
6	12	+855 12 000012	Phnom Penh	Payroll Officer	\N	\N	full_time	2026-01-01	\N	1600.00	PSB000012	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
7	7	+855 12 000007	Phnom Penh	Line Manager	\N	\N	full_time	2026-01-01	\N	1400.00	PSB000007	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
8	8	+855 12 000008	Phnom Penh	Employee	\N	\N	full_time	2026-01-01	\N	900.00	PSB000008	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
9	9	+855 12 000009	Phnom Penh	Employee	\N	\N	full_time	2026-01-01	\N	900.00	PSB000009	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
10	10	+855 12 000010	Phnom Penh	Employee	\N	\N	full_time	2026-01-01	\N	900.00	PSB000010	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
11	11	+855 12 000011	Phnom Penh	Employee	\N	\N	full_time	2026-01-01	\N	900.00	PSB000011	\N	active	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
\.


--
-- Data for Name: kpi_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.kpi_records (id, user_id, name, target_value, actual_value, weight, period, status, created_at) FROM stdin;
1	2	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
2	3	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
3	4	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
4	5	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
5	6	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
6	12	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
7	7	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
8	8	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
9	9	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
10	10	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
11	11	Monthly delivery quality	95.00	91.00	40.00	2026-Q2	tracking	2026-06-05 09:17:14.623603
\.


--
-- Data for Name: location_alerts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.location_alerts (id, user_id, date, latitude, longitude, distance_meters, action_type, message, created_at) FROM stdin;
4	2	2026-05-30	10.00000000	106.00000000	3644214.41	checkin	Outside allowed company radius	2026-05-30 10:44:22.04286
5	2	2026-05-30	11.55249740	104.88434078	211309.78	checkout	Outside allowed company radius	2026-05-30 10:46:58.535464
6	2	2026-05-30	11.55249740	104.88434078	211309.78	checkout	Outside allowed company radius	2026-05-30 10:47:00.412206
7	2	2026-05-30	11.55248847	104.88435121	211308.31	checkout	Outside allowed company radius	2026-05-30 10:47:19.336044
8	2	2026-05-30	11.55248847	104.88435121	211308.31	checkout	Outside allowed company radius	2026-05-30 10:47:19.344033
9	2	2026-05-30	11.55248847	104.88435121	211308.31	checkout	Outside allowed company radius	2026-05-30 10:47:19.344745
10	2	2026-05-30	11.55248847	104.88435121	211308.31	checkout	Outside allowed company radius	2026-05-30 10:47:19.356823
11	2	2026-05-30	11.55248847	104.88435121	211308.31	checkout	Outside allowed company radius	2026-05-30 10:47:19.387941
12	2	2026-05-30	11.55248847	104.88435121	211308.31	checkout	Outside allowed company radius	2026-05-30 10:47:19.886184
13	2	2026-05-30	11.55248736	104.88433516	211309.22	checkout	Outside allowed company radius	2026-05-30 10:47:36.111346
14	2	2026-05-30	11.55250615	104.88434248	211310.46	checkout	Outside allowed company radius	2026-05-30 10:49:01.125421
15	2	2026-05-30	11.55251363	104.88431150	211313.09	checkout	Outside allowed company radius	2026-05-30 10:49:30.547451
16	2	2026-05-30	11.55251363	104.88431150	211313.09	checkout	Outside allowed company radius	2026-05-30 10:49:30.704786
17	2	2026-05-30	11.55251363	104.88431150	211313.09	checkout	Outside allowed company radius	2026-05-30 10:49:31.053987
18	2	2026-05-30	11.55251363	104.88431150	211313.09	checkout	Outside allowed company radius	2026-05-30 10:49:31.227482
19	2	2026-05-30	11.55249857	104.88432107	211311.12	checkout	Outside allowed company radius	2026-05-30 10:49:43.799111
20	2	2026-05-30	11.55249857	104.88432107	211311.12	checkout	Outside allowed company radius	2026-05-30 10:49:43.801809
21	2	2026-05-30	11.55249857	104.88432107	211311.12	checkout	Outside allowed company radius	2026-05-30 10:49:43.800618
22	2	2026-05-30	11.55249785	104.88434602	211309.49	checkout	Outside allowed company radius	2026-05-30 11:01:32.688457
23	2	2026-05-30	11.55249785	104.88434602	211309.49	checkout	Outside allowed company radius	2026-05-30 11:01:34.261614
24	2	2026-05-30	11.55246061	104.88435011	211305.85	checkout	Outside allowed company radius	2026-05-30 11:01:55.079479
25	2	2026-05-30	11.55249310	104.88428354	211312.99	checkout	Outside allowed company radius	2026-05-30 11:02:41.500562
26	2	2026-05-30	11.55252621	104.88430847	211314.43	checkout	Outside allowed company radius	2026-05-30 11:03:16.589994
27	2	2026-05-30	11.55252639	104.88429528	211315.27	checkout	Outside allowed company radius	2026-05-30 11:04:02.325147
28	2	2026-05-30	11.55252639	104.88429528	211315.27	checkout	Outside allowed company radius	2026-05-30 11:04:02.326213
29	2	2026-05-30	11.55252639	104.88429528	211315.27	checkout	Outside allowed company radius	2026-05-30 11:04:04.253652
30	2	2026-05-30	11.55249255	104.88433849	211309.48	checkout	Outside allowed company radius	2026-05-30 11:04:18.988172
31	2	2026-05-30	11.55249255	104.88433849	211309.48	checkout	Outside allowed company radius	2026-05-30 11:04:23.306614
32	2	2026-05-31	21.02437400	105.84771300	1058223.24	checkout	Outside allowed company radius	2026-05-31 15:46:58.595171
33	2	2026-05-31	21.02437400	105.84771300	1058223.24	checkout	Outside allowed company radius	2026-05-31 15:47:07.127288
34	2	2026-05-31	11.52776578	104.91206146	4077.04	checkout	Outside allowed company radius	2026-05-31 15:47:22.503499
35	2	2026-05-31	11.52776578	104.91206146	4077.04	checkout	Outside allowed company radius	2026-05-31 15:47:29.596157
36	2	2026-05-31	11.52778087	104.91206604	4076.28	checkout	Outside allowed company radius	2026-05-31 15:47:51.66603
37	2	2026-05-31	11.52781000	104.91210200	4077.00	checkout	Outside allowed company radius	2026-05-31 15:48:37.580076
38	2	2026-05-31	11.52781866	104.91210200	4076.36	checkout	Outside allowed company radius	2026-05-31 15:48:48.333768
39	2	2026-05-31	11.52783100	104.91210200	4075.43	checkout	Outside allowed company radius	2026-05-31 15:51:10.234706
40	2	2026-05-31	11.52782064	104.91206238	4073.01	checkout	Outside allowed company radius	2026-05-31 15:52:11.890853
41	2	2026-05-31	11.52776500	104.91206750	4077.59	checkout	Outside allowed company radius	2026-05-31 16:05:56.426123
42	2	2026-05-31	11.52776500	104.91206750	4077.59	checkout	Outside allowed company radius	2026-05-31 16:07:28.75208
43	10	2026-05-31	11.52771226	104.91207646	4082.26	flex_checkin	Outside allowed company radius	2026-05-31 16:13:00.499739
44	10	2026-05-31	11.52778215	104.91207646	4077.02	flex_checkin	Outside allowed company radius	2026-05-31 16:14:30.067841
45	10	2026-05-31	11.52778215	104.91207646	4077.02	flex_checkin	Outside allowed company radius	2026-05-31 16:14:35.280034
46	10	2026-05-31	11.52778215	104.91207646	4077.02	flex_checkin	Outside allowed company radius	2026-05-31 16:14:39.923211
\.


--
-- Data for Name: payroll_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payroll_records (id, user_id, period_year, period_month, basic_salary, overtime_amount, allowances, bonus, benefits, salary_adjustment, tax_deduction, nssf_deduction, other_deductions, gross_pay, net_pay, status, created_at, updated_at) FROM stdin;
1	2	2026	6	2200.00	0.00	100.00	0.00	0.00	0.00	110.00	44.00	0.00	2300.00	2146.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
2	3	2026	6	1800.00	0.00	100.00	0.00	0.00	0.00	90.00	36.00	0.00	1900.00	1774.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
3	4	2026	6	1800.00	0.00	100.00	0.00	0.00	0.00	90.00	36.00	0.00	1900.00	1774.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
4	5	2026	6	1800.00	0.00	100.00	0.00	0.00	0.00	90.00	36.00	0.00	1900.00	1774.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
5	6	2026	6	1800.00	0.00	100.00	0.00	0.00	0.00	90.00	36.00	0.00	1900.00	1774.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
6	12	2026	6	1600.00	0.00	100.00	0.00	0.00	0.00	80.00	32.00	0.00	1700.00	1588.00	draft	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
7	7	2026	6	1400.00	0.00	100.00	0.00	0.00	0.00	70.00	28.00	0.00	1500.00	1402.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
8	8	2026	6	900.00	25.00	50.00	0.00	0.00	0.00	0.00	18.00	0.00	975.00	957.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
9	9	2026	6	900.00	25.00	50.00	0.00	0.00	0.00	0.00	18.00	0.00	975.00	957.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
10	10	2026	6	900.00	25.00	50.00	0.00	0.00	0.00	0.00	18.00	0.00	975.00	957.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
11	11	2026	6	900.00	25.00	50.00	0.00	0.00	0.00	0.00	18.00	0.00	975.00	957.00	approved	2026-06-05 09:17:14.623603	2026-06-05 09:17:14.623603
\.


--
-- Data for Name: performance_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.performance_reviews (id, user_id, reviewer_id, review_period, score, rating, comments, status, reviewed_at, created_at) FROM stdin;
1	2	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
2	3	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
3	4	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
4	5	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
5	6	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
6	12	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
7	7	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
8	8	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
9	9	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
10	10	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
11	11	2	2026-Q2	86.00	meets_expectations	Seed appraisal for HRIS dashboard testing.	completed	\N	2026-06-05 09:17:14.623603
\.


--
-- Data for Name: public_holidays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.public_holidays (id, name, holiday_date, country, created_at) FROM stdin;
1	King Norodom Sihamoni's Birthday	2026-05-14	Cambodia	2026-06-05 09:17:14.623603
\.


--
-- Data for Name: requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.requests (id, user_id, type, date, start_time, end_time, reason, status, admin_remarks, created_at, leave_type, backup_user_id, backup_status, backup_approved_at, line_manager_status, line_manager_approved_by, line_manager_approved_at, department_head_status, department_head_approved_by, department_head_approved_at, hr_status, hr_approved_by, hr_approved_at) FROM stdin;
1	2	permission	2026-05-29	\N	\N	dds	cancelled	\N	2026-05-30 11:18:29.53225	\N	\N	skipped	\N	pending	\N	\N	pending	\N	\N	pending	\N	\N
2	9	leave	2026-05-31	23:34:00	23:35:00	testing	approved	Reviewed	2026-05-31 16:34:21.232413	\N	\N	skipped	\N	skipped	\N	\N	approved	4	2026-05-31 23:36:26.527658	approved	2	2026-05-31 23:38:08.364576
3	8	leave	2026-05-28	\N	\N	Seed test: approved sick leave for report preview	approved	Seeded approved workflow	2026-05-31 16:43:25.669915	sick	7	approved	2026-05-31 23:43:25.699631	approved	7	2026-05-31 23:43:25.699631	approved	3	2026-05-31 23:43:25.699631	approved	2	2026-05-31 23:43:25.699631
4	8	leave	2026-05-29	\N	\N	Seed test: approved sick leave for report preview	approved	Seeded approved workflow	2026-05-31 16:43:25.669915	sick	7	approved	2026-05-31 23:43:25.699631	approved	7	2026-05-31 23:43:25.699631	approved	3	2026-05-31 23:43:25.699631	approved	2	2026-05-31 23:43:25.699631
5	9	leave	2026-05-28	\N	\N	Seed test: approved sick leave for report preview	approved	Seeded approved workflow	2026-05-31 16:43:25.669915	sick	4	approved	2026-05-31 23:43:25.699631	approved	4	2026-05-31 23:43:25.699631	approved	4	2026-05-31 23:43:25.699631	approved	2	2026-05-31 23:43:25.699631
6	9	leave	2026-05-29	\N	\N	Seed test: approved sick leave for report preview	approved	Seeded approved workflow	2026-05-31 16:43:25.669915	sick	4	approved	2026-05-31 23:43:25.699631	approved	4	2026-05-31 23:43:25.699631	approved	4	2026-05-31 23:43:25.699631	approved	2	2026-05-31 23:43:25.699631
7	10	leave	2026-05-28	\N	\N	Seed test: approved sick leave for report preview	approved	Seeded approved workflow	2026-05-31 16:43:25.669915	sick	5	approved	2026-05-31 23:43:25.699631	approved	5	2026-05-31 23:43:25.699631	approved	5	2026-05-31 23:43:25.699631	approved	2	2026-05-31 23:43:25.699631
8	10	leave	2026-05-29	\N	\N	Seed test: approved sick leave for report preview	approved	Seeded approved workflow	2026-05-31 16:43:25.669915	sick	5	approved	2026-05-31 23:43:25.699631	approved	5	2026-05-31 23:43:25.699631	approved	5	2026-05-31 23:43:25.699631	approved	2	2026-05-31 23:43:25.699631
9	11	leave	2026-05-28	\N	\N	Seed test: approved sick leave for report preview	approved	Seeded approved workflow	2026-05-31 16:43:25.669915	sick	6	approved	2026-05-31 23:43:25.699631	approved	6	2026-05-31 23:43:25.699631	approved	6	2026-05-31 23:43:25.699631	approved	2	2026-05-31 23:43:25.699631
10	11	leave	2026-05-29	\N	\N	Seed test: approved sick leave for report preview	approved	Seeded approved workflow	2026-05-31 16:43:25.669915	sick	6	approved	2026-05-31 23:43:25.699631	approved	6	2026-05-31 23:43:25.699631	approved	6	2026-05-31 23:43:25.699631	approved	2	2026-05-31 23:43:25.699631
11	2	leave	2026-06-01	\N	\N	testing\r\nStart shift: morning\r\nEnd shift: morning\r\nEnd date: 2026-05-31\r\nReturn date: 2026-05-31\r\nDays: 0	pending	\N	2026-05-31 16:55:19.95493	special	\N	skipped	\N	skipped	\N	\N	pending	\N	\N	pending	\N	\N
\.


--
-- Data for Name: schedule_changes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.schedule_changes (id, schedule_id, user_id, old_shift, new_shift, reason, status, changed_by, changed_at) FROM stdin;
\.


--
-- Data for Name: shift_schedules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift_schedules (id, user_id, shift_name, work_date, start_time, end_time, location, is_active, created_at) FROM stdin;
1	2	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
2	3	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
3	4	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
4	5	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
5	6	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
6	12	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
7	7	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
8	8	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
9	9	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
10	10	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
11	11	Standard Day	2026-06-02	08:00:00	17:30:00	Head Office	t	2026-06-05 09:17:14.623603
\.


--
-- Data for Name: swap_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.swap_requests (id, requester_id, target_user_id, swap_date, status) FROM stdin;
\.


--
-- Data for Name: training_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.training_records (id, user_id, title, provider, start_date, end_date, status, score, created_at) FROM stdin;
1	2	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
2	3	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
3	4	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
4	5	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
5	6	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
6	12	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
7	7	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
8	8	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
9	9	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
10	10	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
11	11	HR compliance basics	Internal HR	2026-06-10	2026-06-10	planned	\N	2026-06-05 09:17:14.623603
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, emp_code, name, email, password_hash, role, created_at, department, manager_id) FROM stdin;
2	EMP001	Management HR	hr@example.com	$argon2id$v=19$m=65536,t=3,p=4$MKZ0bo0xxliLUWotxbi3lg$sttlPCeeUTGOL+oJXHLiCzqbVhdLqlsDhIaDAXZC+kY	management_hr	2026-05-30 10:40:16.377572	HR	\N
3	EMP002	Developer Head	developer.head@example.com	$argon2id$v=19$m=65536,t=3,p=4$FgLg3DsnJOR8730v5VzrvQ$TnW67+L1oU91AHfbsDCSx46fYSodyhmFefqSUPoFsCg	department_head	2026-05-31 16:05:25.754313	Developer	\N
4	EMP003	Finance Head	finance.head@example.com	$argon2id$v=19$m=65536,t=3,p=4$jhFi7B1DCAFgbI0RImRsDQ$WHxRwadhYVneLFw0yf3R3S1kibNFwX+DLAdI+fOvoLk	department_head	2026-05-31 16:05:25.754313	Finance	\N
5	EMP004	HR Head	hr.head@example.com	$argon2id$v=19$m=65536,t=3,p=4$PsdYC4Hwfi8l5FyLUUpJSQ$baPSkXjTOMdFWLXXtince2LrOErWhyqmMAKsB6sor9E	department_head	2026-05-31 16:05:25.754313	HR	\N
6	EMP005	Operations Head	operations.head@example.com	$argon2id$v=19$m=65536,t=3,p=4$sVbqfU9pLUXIGUPI+f8f4w$TdefuoDbp+Dqh6b299Lhgc8KWG41f1ob2UsF4PBZyoI	department_head	2026-05-31 16:11:37.122549	Operations	\N
12	EMP011	Payroll Officer	payroll@example.com	$argon2id$v=19$m=65536,t=3,p=4$FKK0du5dq5Uy5tx7j1GK0Q$m55+wO59boSSyMFKBpKfCGZdXpJ58MoQ8a4rZCJqR0Q	payroll_officer	2026-06-05 09:17:14.623603	Finance	\N
7	EMP006	Developer Line Manager	developer.manager@example.com	$argon2id$v=19$m=65536,t=3,p=4$SglBKCUEQGitlVKKEWJsjQ$WZ5d/N4aFRlcVZoOwfAHzNUrLe4Exf3Z5cCxCQ5gL7g	line_manager	2026-05-31 16:11:37.122549	Developer	3
8	EMP007	Developer Staff	developer.staff@example.com	$argon2id$v=19$m=65536,t=3,p=4$HEPIeW/N+Z8TgjAGIGTsHQ$xGUca7YED3VQuZTnFbRoglb2sDKj89cTNEiBKOgdnBo	staff	2026-05-31 16:11:37.122549	Developer	7
9	EMP008	Finance Staff	finance.staff@example.com	$argon2id$v=19$m=65536,t=3,p=4$DME4h5ByDmHsXUvpPee8Vw$NNQkXUdat2QiPXoivNS48WwhxfN+tVVGUIokDJbMe68	staff	2026-05-31 16:11:37.122549	Finance	4
10	EMP009	HR Staff	hr.staff@example.com	$argon2id$v=19$m=65536,t=3,p=4$KgVACEHIeS9FSKlVCgEAYA$AZD9nLzqAp2aTcqd0Oq3qnvh56xzUnURSNKlIrnuY84	staff	2026-05-31 16:11:37.122549	HR	5
11	EMP010	Operations Staff	operations.staff@example.com	$argon2id$v=19$m=65536,t=3,p=4$Zsy5d651DmGMcU6ptZYSIg$UOEhQlHpES1HvjhckxsoYVx7SjhrUuS8Dl0v9PRAV2M	staff	2026-05-31 16:11:37.122549	Operations	6
\.


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 10, true);


--
-- Name: company_location_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.company_location_id_seq', 1, false);


--
-- Name: employee_histories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_histories_id_seq', 11, true);


--
-- Name: employee_movement_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_movement_requests_id_seq', 1, false);


--
-- Name: employee_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.employee_profiles_id_seq', 11, true);


--
-- Name: kpi_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.kpi_records_id_seq', 11, true);


--
-- Name: location_alerts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.location_alerts_id_seq', 46, true);


--
-- Name: payroll_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.payroll_records_id_seq', 11, true);


--
-- Name: performance_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.performance_reviews_id_seq', 11, true);


--
-- Name: public_holidays_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.public_holidays_id_seq', 1, true);


--
-- Name: requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.requests_id_seq', 11, true);


--
-- Name: schedule_changes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.schedule_changes_id_seq', 1, false);


--
-- Name: shift_schedules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_schedules_id_seq', 11, true);


--
-- Name: swap_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.swap_requests_id_seq', 1, false);


--
-- Name: training_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.training_records_id_seq', 11, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 12, true);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: company_location company_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_location
    ADD CONSTRAINT company_location_pkey PRIMARY KEY (id);


--
-- Name: employee_histories employee_histories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_histories
    ADD CONSTRAINT employee_histories_pkey PRIMARY KEY (id);


--
-- Name: employee_movement_requests employee_movement_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_movement_requests
    ADD CONSTRAINT employee_movement_requests_pkey PRIMARY KEY (id);


--
-- Name: employee_profiles employee_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_pkey PRIMARY KEY (id);


--
-- Name: kpi_records kpi_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kpi_records
    ADD CONSTRAINT kpi_records_pkey PRIMARY KEY (id);


--
-- Name: location_alerts location_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_alerts
    ADD CONSTRAINT location_alerts_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: performance_reviews performance_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_pkey PRIMARY KEY (id);


--
-- Name: public_holidays public_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_holidays
    ADD CONSTRAINT public_holidays_pkey PRIMARY KEY (id);


--
-- Name: requests requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_pkey PRIMARY KEY (id);


--
-- Name: schedule_changes schedule_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_changes
    ADD CONSTRAINT schedule_changes_pkey PRIMARY KEY (id);


--
-- Name: shift_schedules shift_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_schedules
    ADD CONSTRAINT shift_schedules_pkey PRIMARY KEY (id);


--
-- Name: swap_requests swap_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swap_requests
    ADD CONSTRAINT swap_requests_pkey PRIMARY KEY (id);


--
-- Name: training_records training_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_records
    ADD CONSTRAINT training_records_pkey PRIMARY KEY (id);


--
-- Name: attendance uq_attendance_user_date; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT uq_attendance_user_date UNIQUE (user_id, date);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_app_settings_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_app_settings_key ON public.app_settings USING btree (key);


--
-- Name: ix_attendance_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_attendance_date ON public.attendance USING btree (date);


--
-- Name: ix_attendance_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_attendance_id ON public.attendance USING btree (id);


--
-- Name: ix_attendance_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_attendance_user_id ON public.attendance USING btree (user_id);


--
-- Name: ix_employee_histories_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_employee_histories_id ON public.employee_histories USING btree (id);


--
-- Name: ix_employee_histories_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_employee_histories_user_id ON public.employee_histories USING btree (user_id);


--
-- Name: ix_employee_movement_requests_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_employee_movement_requests_id ON public.employee_movement_requests USING btree (id);


--
-- Name: ix_employee_movement_requests_requested_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_employee_movement_requests_requested_by ON public.employee_movement_requests USING btree (requested_by);


--
-- Name: ix_employee_movement_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_employee_movement_requests_user_id ON public.employee_movement_requests USING btree (user_id);


--
-- Name: ix_employee_profiles_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_employee_profiles_id ON public.employee_profiles USING btree (id);


--
-- Name: ix_employee_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_employee_profiles_user_id ON public.employee_profiles USING btree (user_id);


--
-- Name: ix_kpi_records_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_kpi_records_id ON public.kpi_records USING btree (id);


--
-- Name: ix_kpi_records_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_kpi_records_user_id ON public.kpi_records USING btree (user_id);


--
-- Name: ix_location_alerts_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_location_alerts_id ON public.location_alerts USING btree (id);


--
-- Name: ix_location_alerts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_location_alerts_user_id ON public.location_alerts USING btree (user_id);


--
-- Name: ix_payroll_records_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payroll_records_id ON public.payroll_records USING btree (id);


--
-- Name: ix_payroll_records_period_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payroll_records_period_month ON public.payroll_records USING btree (period_month);


--
-- Name: ix_payroll_records_period_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payroll_records_period_year ON public.payroll_records USING btree (period_year);


--
-- Name: ix_payroll_records_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_payroll_records_user_id ON public.payroll_records USING btree (user_id);


--
-- Name: ix_performance_reviews_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_performance_reviews_id ON public.performance_reviews USING btree (id);


--
-- Name: ix_performance_reviews_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_performance_reviews_user_id ON public.performance_reviews USING btree (user_id);


--
-- Name: ix_public_holidays_holiday_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_public_holidays_holiday_date ON public.public_holidays USING btree (holiday_date);


--
-- Name: ix_public_holidays_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_public_holidays_id ON public.public_holidays USING btree (id);


--
-- Name: ix_requests_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_requests_date ON public.requests USING btree (date);


--
-- Name: ix_requests_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_requests_id ON public.requests USING btree (id);


--
-- Name: ix_requests_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_requests_user_id ON public.requests USING btree (user_id);


--
-- Name: ix_schedule_changes_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_schedule_changes_id ON public.schedule_changes USING btree (id);


--
-- Name: ix_schedule_changes_schedule_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_schedule_changes_schedule_id ON public.schedule_changes USING btree (schedule_id);


--
-- Name: ix_schedule_changes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_schedule_changes_user_id ON public.schedule_changes USING btree (user_id);


--
-- Name: ix_shift_schedules_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_shift_schedules_id ON public.shift_schedules USING btree (id);


--
-- Name: ix_shift_schedules_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_shift_schedules_user_id ON public.shift_schedules USING btree (user_id);


--
-- Name: ix_shift_schedules_work_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_shift_schedules_work_date ON public.shift_schedules USING btree (work_date);


--
-- Name: ix_swap_requests_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_swap_requests_id ON public.swap_requests USING btree (id);


--
-- Name: ix_swap_requests_requester_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_swap_requests_requester_id ON public.swap_requests USING btree (requester_id);


--
-- Name: ix_swap_requests_swap_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_swap_requests_swap_date ON public.swap_requests USING btree (swap_date);


--
-- Name: ix_swap_requests_target_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_swap_requests_target_user_id ON public.swap_requests USING btree (target_user_id);


--
-- Name: ix_training_records_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_training_records_id ON public.training_records USING btree (id);


--
-- Name: ix_training_records_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_training_records_user_id ON public.training_records USING btree (user_id);


--
-- Name: ix_users_emp_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_users_emp_code ON public.users USING btree (emp_code);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: attendance attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employee_histories employee_histories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_histories
    ADD CONSTRAINT employee_histories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employee_movement_requests employee_movement_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_movement_requests
    ADD CONSTRAINT employee_movement_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: employee_movement_requests employee_movement_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_movement_requests
    ADD CONSTRAINT employee_movement_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: employee_movement_requests employee_movement_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_movement_requests
    ADD CONSTRAINT employee_movement_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: employee_profiles employee_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employee_profiles
    ADD CONSTRAINT employee_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: kpi_records kpi_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kpi_records
    ADD CONSTRAINT kpi_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: location_alerts location_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_alerts
    ADD CONSTRAINT location_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payroll_records payroll_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: performance_reviews performance_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id);


--
-- Name: performance_reviews performance_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: requests requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: schedule_changes schedule_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_changes
    ADD CONSTRAINT schedule_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: schedule_changes schedule_changes_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_changes
    ADD CONSTRAINT schedule_changes_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.shift_schedules(id);


--
-- Name: schedule_changes schedule_changes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.schedule_changes
    ADD CONSTRAINT schedule_changes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: shift_schedules shift_schedules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift_schedules
    ADD CONSTRAINT shift_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: swap_requests swap_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swap_requests
    ADD CONSTRAINT swap_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id);


--
-- Name: swap_requests swap_requests_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swap_requests
    ADD CONSTRAINT swap_requests_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id);


--
-- Name: training_records training_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.training_records
    ADD CONSTRAINT training_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict EBUJshAT89NMShrldzaUE8jqrrMcmhvB3anFyTFrkUvx50aE6RoBQnYsP7g1B3k

