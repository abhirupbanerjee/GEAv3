--
-- PostgreSQL database dump
--

\restrict mO0Xxpt8UqpRVqwcCgJDv8eKZodwoGN08YaNZNGYCldT6aOcroi0nGwv9guGo00

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

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
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: captcha_challenges; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.captcha_challenges (
    challenge_id integer NOT NULL,
    ip_hash character varying(64) NOT NULL,
    challenge_issued_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    challenge_completed_at timestamp without time zone,
    success boolean
);


ALTER TABLE public.captcha_challenges OWNER TO feedback_user;

--
-- Name: captcha_challenges_challenge_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.captcha_challenges_challenge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.captcha_challenges_challenge_id_seq OWNER TO feedback_user;

--
-- Name: captcha_challenges_challenge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.captcha_challenges_challenge_id_seq OWNED BY public.captcha_challenges.challenge_id;


--
-- Name: ea_service_request_attachments; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.ea_service_request_attachments (
    attachment_id integer NOT NULL,
    request_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    mimetype character varying(100) NOT NULL,
    file_content bytea NOT NULL,
    file_size integer NOT NULL,
    is_mandatory boolean DEFAULT false,
    uploaded_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_ea_file_size CHECK (((file_size > 0) AND (file_size <= 5242880)))
);


ALTER TABLE public.ea_service_request_attachments OWNER TO feedback_user;

--
-- Name: ea_service_request_attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.ea_service_request_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ea_service_request_attachments_attachment_id_seq OWNER TO feedback_user;

--
-- Name: ea_service_request_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.ea_service_request_attachments_attachment_id_seq OWNED BY public.ea_service_request_attachments.attachment_id;


--
-- Name: ea_service_requests; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.ea_service_requests (
    request_id integer NOT NULL,
    request_number character varying(20) NOT NULL,
    service_id character varying(50) NOT NULL,
    entity_id character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'submitted'::character varying NOT NULL,
    requester_name character varying(255) NOT NULL,
    requester_email character varying(255) NOT NULL,
    requester_phone character varying(50),
    requester_ministry character varying(255),
    request_description text,
    submission_ip_hash character varying(64),
    assigned_to character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    created_by character varying(255) DEFAULT 'system'::character varying,
    updated_by character varying(255) DEFAULT 'system'::character varying
);


ALTER TABLE public.ea_service_requests OWNER TO feedback_user;

--
-- Name: ea_service_requests_request_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.ea_service_requests_request_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ea_service_requests_request_id_seq OWNER TO feedback_user;

--
-- Name: ea_service_requests_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.ea_service_requests_request_id_seq OWNED BY public.ea_service_requests.request_id;


--
-- Name: entity_master; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.entity_master (
    unique_entity_id character varying(50) NOT NULL,
    entity_name character varying(255) NOT NULL,
    entity_type character varying(50) NOT NULL,
    parent_entity_id character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.entity_master OWNER TO feedback_user;

--
-- Name: grievance_attachments; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.grievance_attachments (
    attachment_id integer NOT NULL,
    grievance_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    mimetype character varying(100) NOT NULL,
    file_content bytea NOT NULL,
    file_size integer NOT NULL,
    uploaded_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_grievance_file_size CHECK (((file_size > 0) AND (file_size <= 5242880)))
);


ALTER TABLE public.grievance_attachments OWNER TO feedback_user;

--
-- Name: grievance_attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.grievance_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.grievance_attachments_attachment_id_seq OWNER TO feedback_user;

--
-- Name: grievance_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.grievance_attachments_attachment_id_seq OWNED BY public.grievance_attachments.attachment_id;


--
-- Name: grievance_tickets; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.grievance_tickets (
    grievance_id integer NOT NULL,
    grievance_number character varying(20) NOT NULL,
    service_id character varying(50) NOT NULL,
    entity_id character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    submitter_category character varying(50),
    submitter_name character varying(255) NOT NULL,
    submitter_email character varying(255) NOT NULL,
    submitter_phone character varying(50),
    grievance_subject character varying(255) NOT NULL,
    grievance_description text NOT NULL,
    incident_date date,
    submission_ip_hash character varying(64),
    assigned_to character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    created_by character varying(255) DEFAULT 'system'::character varying,
    updated_by character varying(255) DEFAULT 'system'::character varying
);


ALTER TABLE public.grievance_tickets OWNER TO feedback_user;

--
-- Name: grievance_tickets_grievance_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.grievance_tickets_grievance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.grievance_tickets_grievance_id_seq OWNER TO feedback_user;

--
-- Name: grievance_tickets_grievance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.grievance_tickets_grievance_id_seq OWNED BY public.grievance_tickets.grievance_id;


--
-- Name: priority_levels; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.priority_levels (
    priority_id integer NOT NULL,
    priority_code character varying(20) NOT NULL,
    priority_name character varying(50) NOT NULL,
    sla_multiplier numeric(3,2) DEFAULT 1.0,
    sort_order integer DEFAULT 0,
    color_code character varying(7),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.priority_levels OWNER TO feedback_user;

--
-- Name: priority_levels_priority_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.priority_levels_priority_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.priority_levels_priority_id_seq OWNER TO feedback_user;

--
-- Name: priority_levels_priority_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.priority_levels_priority_id_seq OWNED BY public.priority_levels.priority_id;


--
-- Name: qr_codes; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.qr_codes (
    qr_code_id character varying(50) NOT NULL,
    service_id character varying(50) NOT NULL,
    entity_id character varying(50) NOT NULL,
    location_name character varying(255) NOT NULL,
    location_address text,
    location_type character varying(50),
    generated_url text NOT NULL,
    scan_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(100),
    deactivated_at timestamp without time zone
);


ALTER TABLE public.qr_codes OWNER TO feedback_user;

--
-- Name: service_attachments; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.service_attachments (
    service_attachment_id integer NOT NULL,
    service_id character varying(50) NOT NULL,
    filename character varying(255) NOT NULL,
    file_extension character varying(10),
    is_mandatory boolean DEFAULT false,
    description text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.service_attachments OWNER TO feedback_user;

--
-- Name: service_attachments_service_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.service_attachments_service_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.service_attachments_service_attachment_id_seq OWNER TO feedback_user;

--
-- Name: service_attachments_service_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.service_attachments_service_attachment_id_seq OWNED BY public.service_attachments.service_attachment_id;


--
-- Name: service_feedback; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.service_feedback (
    feedback_id integer NOT NULL,
    service_id character varying(50) NOT NULL,
    entity_id character varying(50) NOT NULL,
    channel character varying(20) NOT NULL,
    qr_code_id character varying(50),
    recipient_group character varying(50),
    q1_ease integer,
    q2_clarity integer,
    q3_timeliness integer,
    q4_trust integer,
    q5_overall_satisfaction integer,
    comment_text text,
    grievance_flag boolean DEFAULT false,
    grievance_ticket_id integer,
    feedback_type character varying(50) DEFAULT 'general'::character varying,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_hash character varying(64),
    user_agent_hash character varying(64)
);


ALTER TABLE public.service_feedback OWNER TO feedback_user;

--
-- Name: service_feedback_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.service_feedback_feedback_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.service_feedback_feedback_id_seq OWNER TO feedback_user;

--
-- Name: service_feedback_feedback_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.service_feedback_feedback_id_seq OWNED BY public.service_feedback.feedback_id;


--
-- Name: service_master; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.service_master (
    service_id character varying(50) NOT NULL,
    service_name character varying(255) NOT NULL,
    entity_id character varying(50) NOT NULL,
    service_category character varying(100),
    service_description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.service_master OWNER TO feedback_user;

--
-- Name: sla_breaches; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.sla_breaches (
    breach_id integer NOT NULL,
    ticket_id integer NOT NULL,
    breach_type character varying(20),
    target_time timestamp without time zone NOT NULL,
    actual_time timestamp without time zone,
    breach_duration_hours numeric(10,2),
    is_active boolean DEFAULT true,
    detected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sla_breaches OWNER TO feedback_user;

--
-- Name: sla_breaches_breach_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.sla_breaches_breach_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sla_breaches_breach_id_seq OWNER TO feedback_user;

--
-- Name: sla_breaches_breach_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.sla_breaches_breach_id_seq OWNED BY public.sla_breaches.breach_id;


--
-- Name: submission_attempts; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.submission_attempts (
    attempt_id integer NOT NULL,
    ip_hash character varying(64) NOT NULL,
    attempt_type character varying(50) DEFAULT 'ticket_submit'::character varying,
    attempt_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    success boolean DEFAULT true
);


ALTER TABLE public.submission_attempts OWNER TO feedback_user;

--
-- Name: submission_attempts_attempt_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.submission_attempts_attempt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.submission_attempts_attempt_id_seq OWNER TO feedback_user;

--
-- Name: submission_attempts_attempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.submission_attempts_attempt_id_seq OWNED BY public.submission_attempts.attempt_id;


--
-- Name: submission_rate_limit; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.submission_rate_limit (
    ip_hash character varying(64) NOT NULL,
    submission_count integer DEFAULT 1,
    attempt_type character varying(50) DEFAULT 'ticket_submit'::character varying,
    window_start timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.submission_rate_limit OWNER TO feedback_user;

--
-- Name: ticket_activities; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.ticket_activities (
    activity_id integer NOT NULL,
    ticket_id integer NOT NULL,
    activity_type character varying(50) NOT NULL,
    activity_description text,
    field_name character varying(100),
    old_value text,
    new_value text,
    performed_by character varying(255) DEFAULT 'system'::character varying,
    performed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_hash character varying(64),
    is_public boolean DEFAULT false
);


ALTER TABLE public.ticket_activities OWNER TO feedback_user;

--
-- Name: ticket_activities_activity_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.ticket_activities_activity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ticket_activities_activity_id_seq OWNER TO feedback_user;

--
-- Name: ticket_activities_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.ticket_activities_activity_id_seq OWNED BY public.ticket_activities.activity_id;


--
-- Name: ticket_attachments; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.ticket_attachments (
    attachment_id integer NOT NULL,
    ticket_id integer NOT NULL,
    filename character varying(255) NOT NULL,
    mimetype character varying(100) NOT NULL,
    file_content bytea NOT NULL,
    file_size integer NOT NULL,
    uploaded_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_file_size CHECK (((file_size > 0) AND (file_size <= 5242880)))
);


ALTER TABLE public.ticket_attachments OWNER TO feedback_user;

--
-- Name: ticket_attachments_attachment_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.ticket_attachments_attachment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ticket_attachments_attachment_id_seq OWNER TO feedback_user;

--
-- Name: ticket_attachments_attachment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.ticket_attachments_attachment_id_seq OWNED BY public.ticket_attachments.attachment_id;


--
-- Name: ticket_categories; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.ticket_categories (
    category_id integer NOT NULL,
    category_code character varying(50) NOT NULL,
    category_name character varying(255) NOT NULL,
    description text,
    entity_id character varying(50),
    sla_response_hours integer DEFAULT 24,
    sla_resolution_hours integer DEFAULT 72,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    icon character varying(50) DEFAULT NULL::character varying,
    service_id character varying(50) DEFAULT NULL::character varying
);


ALTER TABLE public.ticket_categories OWNER TO feedback_user;

--
-- Name: ticket_categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.ticket_categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ticket_categories_category_id_seq OWNER TO feedback_user;

--
-- Name: ticket_categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.ticket_categories_category_id_seq OWNED BY public.ticket_categories.category_id;


--
-- Name: ticket_notes; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.ticket_notes (
    note_id integer NOT NULL,
    ticket_id integer NOT NULL,
    note_text text NOT NULL,
    is_public boolean DEFAULT false,
    created_by character varying(255) DEFAULT 'system'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ticket_notes OWNER TO feedback_user;

--
-- Name: ticket_notes_note_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.ticket_notes_note_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ticket_notes_note_id_seq OWNER TO feedback_user;

--
-- Name: ticket_notes_note_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.ticket_notes_note_id_seq OWNED BY public.ticket_notes.note_id;


--
-- Name: ticket_status; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.ticket_status (
    status_id integer NOT NULL,
    status_code character varying(50) NOT NULL,
    status_name character varying(100) NOT NULL,
    status_type character varying(20),
    is_terminal boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    color_code character varying(7),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.ticket_status OWNER TO feedback_user;

--
-- Name: ticket_status_status_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.ticket_status_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ticket_status_status_id_seq OWNER TO feedback_user;

--
-- Name: ticket_status_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.ticket_status_status_id_seq OWNED BY public.ticket_status.status_id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.tickets (
    ticket_id integer NOT NULL,
    ticket_number character varying(20) NOT NULL,
    category_id integer,
    priority_id integer,
    status_id integer,
    subject character varying(255) NOT NULL,
    description text NOT NULL,
    submitter_name character varying(255),
    submitter_email character varying(255),
    submitter_phone character varying(50),
    submission_ip_hash character varying(64),
    assigned_entity_id character varying(50),
    assigned_user_id character varying(36),
    sla_response_target timestamp without time zone,
    sla_resolution_target timestamp without time zone,
    first_response_at timestamp without time zone,
    resolved_at timestamp without time zone,
    closed_at timestamp without time zone,
    feedback_id integer,
    service_id character varying(50),
    source character varying(50) DEFAULT 'portal'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(255) DEFAULT 'system'::character varying,
    updated_by character varying(255) DEFAULT 'system'::character varying
);


ALTER TABLE public.tickets OWNER TO feedback_user;

--
-- Name: tickets_ticket_id_seq; Type: SEQUENCE; Schema: public; Owner: feedback_user
--

CREATE SEQUENCE public.tickets_ticket_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tickets_ticket_id_seq OWNER TO feedback_user;

--
-- Name: tickets_ticket_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: feedback_user
--

ALTER SEQUENCE public.tickets_ticket_id_seq OWNED BY public.tickets.ticket_id;


--
-- Name: captcha_challenges challenge_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.captcha_challenges ALTER COLUMN challenge_id SET DEFAULT nextval('public.captcha_challenges_challenge_id_seq'::regclass);


--
-- Name: ea_service_request_attachments attachment_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ea_service_request_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.ea_service_request_attachments_attachment_id_seq'::regclass);


--
-- Name: ea_service_requests request_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ea_service_requests ALTER COLUMN request_id SET DEFAULT nextval('public.ea_service_requests_request_id_seq'::regclass);


--
-- Name: grievance_attachments attachment_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.grievance_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.grievance_attachments_attachment_id_seq'::regclass);


--
-- Name: grievance_tickets grievance_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.grievance_tickets ALTER COLUMN grievance_id SET DEFAULT nextval('public.grievance_tickets_grievance_id_seq'::regclass);


--
-- Name: priority_levels priority_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.priority_levels ALTER COLUMN priority_id SET DEFAULT nextval('public.priority_levels_priority_id_seq'::regclass);


--
-- Name: service_attachments service_attachment_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_attachments ALTER COLUMN service_attachment_id SET DEFAULT nextval('public.service_attachments_service_attachment_id_seq'::regclass);


--
-- Name: service_feedback feedback_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_feedback ALTER COLUMN feedback_id SET DEFAULT nextval('public.service_feedback_feedback_id_seq'::regclass);


--
-- Name: sla_breaches breach_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.sla_breaches ALTER COLUMN breach_id SET DEFAULT nextval('public.sla_breaches_breach_id_seq'::regclass);


--
-- Name: submission_attempts attempt_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.submission_attempts ALTER COLUMN attempt_id SET DEFAULT nextval('public.submission_attempts_attempt_id_seq'::regclass);


--
-- Name: ticket_activities activity_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_activities ALTER COLUMN activity_id SET DEFAULT nextval('public.ticket_activities_activity_id_seq'::regclass);


--
-- Name: ticket_attachments attachment_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_attachments ALTER COLUMN attachment_id SET DEFAULT nextval('public.ticket_attachments_attachment_id_seq'::regclass);


--
-- Name: ticket_categories category_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_categories ALTER COLUMN category_id SET DEFAULT nextval('public.ticket_categories_category_id_seq'::regclass);


--
-- Name: ticket_notes note_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_notes ALTER COLUMN note_id SET DEFAULT nextval('public.ticket_notes_note_id_seq'::regclass);


--
-- Name: ticket_status status_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_status ALTER COLUMN status_id SET DEFAULT nextval('public.ticket_status_status_id_seq'::regclass);


--
-- Name: tickets ticket_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.tickets ALTER COLUMN ticket_id SET DEFAULT nextval('public.tickets_ticket_id_seq'::regclass);


--
-- Data for Name: captcha_challenges; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.captcha_challenges (challenge_id, ip_hash, challenge_issued_at, challenge_completed_at, success) FROM stdin;
\.


--
-- Data for Name: ea_service_request_attachments; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.ea_service_request_attachments (attachment_id, request_id, filename, mimetype, file_content, file_size, is_mandatory, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: ea_service_requests; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.ea_service_requests (request_id, request_number, service_id, entity_id, status, requester_name, requester_email, requester_phone, requester_ministry, request_description, submission_ip_hash, assigned_to, created_at, updated_at, resolved_at, closed_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: entity_master; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active, created_at, updated_at) FROM stdin;
DEPT-001	Immigration Department	department	\N	t	2025-11-19 03:58:43.789823	2025-11-19 03:58:43.789823
DEPT-002	Inland Revenue Division	department	\N	t	2025-11-19 03:58:43.789823	2025-11-19 03:58:43.789823
DEPT-004	Civil Registry & Deeds	department	\N	t	2025-11-19 03:58:43.789823	2025-11-19 03:58:43.789823
AGY-002	Digital Transformation Agency	agency	\N	t	2025-11-19 03:58:43.789823	2025-11-19 03:58:43.789823
\.


--
-- Data for Name: grievance_attachments; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.grievance_attachments (attachment_id, grievance_id, filename, mimetype, file_content, file_size, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: grievance_tickets; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.grievance_tickets (grievance_id, grievance_number, service_id, entity_id, status, submitter_category, submitter_name, submitter_email, submitter_phone, grievance_subject, grievance_description, incident_date, submission_ip_hash, assigned_to, created_at, updated_at, resolved_at, closed_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: priority_levels; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.priority_levels (priority_id, priority_code, priority_name, sla_multiplier, sort_order, color_code, is_active, created_at, updated_at) FROM stdin;
1	URGENT	Urgent	0.50	1	#ef4444	t	2025-11-19 03:58:43.785235	2025-11-19 03:58:43.785235
2	HIGH	High	0.75	2	#fb923c	t	2025-11-19 03:58:43.785235	2025-11-19 03:58:43.785235
3	MEDIUM	Medium	1.00	3	#fbbf24	t	2025-11-19 03:58:43.785235	2025-11-19 03:58:43.785235
4	LOW	Low	2.00	4	#93c5fd	t	2025-11-19 03:58:43.785235	2025-11-19 03:58:43.785235
\.


--
-- Data for Name: qr_codes; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.qr_codes (qr_code_id, service_id, entity_id, location_name, location_address, location_type, generated_url, scan_count, is_active, notes, created_at, created_by, deactivated_at) FROM stdin;
\.


--
-- Data for Name: service_attachments; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.service_attachments (service_attachment_id, service_id, filename, file_extension, is_mandatory, description, sort_order, is_active, created_at) FROM stdin;
1	digital-roadmap	Senior leadership approval letter or email	pdf	t	Approval for roadmap support request	1	t	2025-11-19 03:59:28.198949
2	digital-roadmap	Digital vision / strategic plan	docx	t	Vision document or strategic plan	2	t	2025-11-19 03:59:28.198949
3	digital-roadmap	Inventory of services and systems	xlsx	t	List of current services and IT systems	3	t	2025-11-19 03:59:28.198949
4	digital-roadmap	Organizational structure	pdf	f	Organizational chart or structure document	4	t	2025-11-19 03:59:28.198949
5	digital-roadmap	Existing system/vendor contracts	pdf	f	Current system contracts and agreements	5	t	2025-11-19 03:59:28.198949
6	ea-framework-review	Details of domain/method requiring update	docx	t	Specific domain or methodology needing review	1	t	2025-11-19 03:59:28.205671
7	ea-framework-review	Senior Government leadership approval	pdf	t	Approval from senior government leadership	2	t	2025-11-19 03:59:28.205671
8	ea-framework-review	Supporting EA documents (drafts, models, standards)	pdf	f	Draft documents, models, or standards for reference	3	t	2025-11-19 03:59:28.205671
9	maturity-assessment	Budget or funding request to MoF	pdf	t	Scan of budget request letter or email to Ministry of Finance	1	t	2025-11-19 03:59:28.208227
10	maturity-assessment	Description of proposed digital initiative	docx	t	Initiative description with KPIs and target outcomes	2	t	2025-11-19 03:59:28.208227
11	maturity-assessment	Architecture or system documentation	pdf	f	Relevant architecture or system documentation	3	t	2025-11-19 03:59:28.208227
12	repository-access	Senior leadership approval	pdf	t	Approval from senior government leadership	1	t	2025-11-19 03:59:28.210659
13	repository-access	Required duration of access	docx	t	Specify duration needed (e.g., 6 months, 1 year)	2	t	2025-11-19 03:59:28.210659
14	compliance-review	Senior leadership approval	pdf	t	Approval from senior government leadership	1	t	2025-11-19 03:59:28.213284
15	compliance-review	Current state architecture documents	pdf	t	As-is architecture documentation	2	t	2025-11-19 03:59:28.213284
16	compliance-review	Target state architecture design document	pdf	t	To-be architecture design	3	t	2025-11-19 03:59:28.213284
17	compliance-review	Solution design documents	pdf	t	Detailed solution design documents	4	t	2025-11-19 03:59:28.213284
18	compliance-review	Vendor contracts / SOWs	pdf	f	Vendor contracts and statements of work	5	t	2025-11-19 03:59:28.213284
19	compliance-review	Integration diagrams	pdf	f	System integration diagrams	6	t	2025-11-19 03:59:28.213284
20	compliance-review	Security documentation	pdf	f	Security design and documentation	7	t	2025-11-19 03:59:28.213284
21	compliance-review	Data architecture diagrams	pdf	f	Data flow and architecture diagrams	8	t	2025-11-19 03:59:28.213284
22	portfolio-review	Senior leadership approval	pdf	t	Approval from senior government leadership	1	t	2025-11-19 03:59:28.216335
23	portfolio-review	Baseline inventory of systems and services	xlsx	t	Complete inventory of IT systems and services	2	t	2025-11-19 03:59:28.216335
24	portfolio-review	Existing IT contracts and SLAs	pdf	f	Current contracts and service level agreements	3	t	2025-11-19 03:59:28.216335
25	training-capacity	Senior leadership approval	pdf	t	Approval from senior government leadership	1	t	2025-11-19 03:59:28.218769
26	training-capacity	Intended audience list	xlsx	t	List with names, designations, and parent organisation details	2	t	2025-11-19 03:59:28.218769
27	training-capacity	Training topics or customization needs	docx	f	Specific topics or customization requirements	3	t	2025-11-19 03:59:28.218769
\.


--
-- Data for Name: service_feedback; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.service_feedback (feedback_id, service_id, entity_id, channel, qr_code_id, recipient_group, q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction, comment_text, grievance_flag, grievance_ticket_id, feedback_type, submitted_at, ip_hash, user_agent_hash) FROM stdin;
1	SVC-DIG-002	AGY-002	ea_portal	\N	citizen	2	2	2	5	5	\N	f	\N	general	2025-11-19 04:02:11.553508	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
2	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	4	5	5	\N	f	\N	general	2025-11-19 05:26:59.385565	6b3479192afc5e3b	07d1d539047ef019
\.


--
-- Data for Name: service_master; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.service_master (service_id, service_name, entity_id, service_category, service_description, is_active, created_at, updated_at) FROM stdin;
SVC-IMM-001	Passport Application	DEPT-001	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
SVC-IMM-002	Passport Renewal	DEPT-001	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
SVC-TAX-001	Business Registration	DEPT-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
SVC-TAX-002	Tax Filing	DEPT-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
SVC-REG-010	Birth Certificate	DEPT-004	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
SVC-DIG-001	eServices Account	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
SVC-DIG-002	Portal Support	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
digital-roadmap	Public Sector Digital Roadmap Support	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
ea-framework-review	Grenada EA Framework Management	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
maturity-assessment	Grenada EA Maturity Assessment	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
repository-access	Grenada EA Repository Access	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
compliance-review	Grenada EA Compliance Review	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
portfolio-review	IT Portfolio Review	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
training-capacity	EA Training & Capacity Development	AGY-002	\N	\N	t	2025-11-19 03:58:43.793538	2025-11-19 03:58:43.793538
\.


--
-- Data for Name: sla_breaches; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.sla_breaches (breach_id, ticket_id, breach_type, target_time, actual_time, breach_duration_hours, is_active, detected_at) FROM stdin;
\.


--
-- Data for Name: submission_attempts; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.submission_attempts (attempt_id, ip_hash, attempt_type, attempt_time, success) FROM stdin;
\.


--
-- Data for Name: submission_rate_limit; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.submission_rate_limit (ip_hash, submission_count, attempt_type, window_start) FROM stdin;
4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	1	ticket_submit	2025-11-19 04:02:11.549547
\.


--
-- Data for Name: ticket_activities; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.ticket_activities (activity_id, ticket_id, activity_type, activity_description, field_name, old_value, new_value, performed_by, performed_at, ip_hash, is_public) FROM stdin;
\.


--
-- Data for Name: ticket_attachments; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.ticket_attachments (attachment_id, ticket_id, filename, mimetype, file_content, file_size, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: ticket_categories; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.ticket_categories (category_id, category_code, category_name, description, entity_id, sla_response_hours, sla_resolution_hours, is_active, created_at, updated_at, icon, service_id) FROM stdin;
1	GENERAL_INQUIRY	General Inquiry	General questions	\N	24	72	t	2025-11-18 23:04:49.53588	2025-11-18 23:04:49.53588	\N	\N
2	FEEDBACK	Feedback	Service feedback	\N	48	96	t	2025-11-18 23:04:49.53588	2025-11-18 23:04:49.53588	\N	\N
3	COMPLAINT	Complaint	Service complaints	\N	12	48	t	2025-11-18 23:04:49.53588	2025-11-18 23:04:49.53588	\N	\N
4	TECHNICAL_ISSUE	Technical Issue	Technical problems	\N	8	48	t	2025-11-18 23:04:49.53588	2025-11-18 23:04:49.53588	\N	\N
5	PORTAL_ISSUE	Portal Issue	Portal problems	\N	2	8	t	2025-11-18 23:04:49.53588	2025-11-18 23:04:49.53588	\N	\N
6	LOGIN_ISSUE	Login Issue	Access problems	\N	4	24	t	2025-11-18 23:04:49.53588	2025-11-18 23:04:49.53588	\N	\N
\.


--
-- Data for Name: ticket_notes; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.ticket_notes (note_id, ticket_id, note_text, is_public, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: ticket_status; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.ticket_status (status_id, status_code, status_name, status_type, is_terminal, sort_order, color_code, is_active, created_at, updated_at) FROM stdin;
1	OPEN	Open	open	f	1	#dbeafe	t	2025-11-18 23:04:49.532127	2025-11-18 23:04:49.532127
2	IN_PROGRESS	In Progress	working	f	2	#fef3c7	t	2025-11-18 23:04:49.532127	2025-11-18 23:04:49.532127
3	PENDING	Pending	working	f	3	#fed7aa	t	2025-11-18 23:04:49.532127	2025-11-18 23:04:49.532127
4	RESOLVED	Resolved	closed	t	4	#d9f99d	t	2025-11-18 23:04:49.532127	2025-11-18 23:04:49.532127
5	CLOSED	Closed	closed	t	5	#e5e7eb	t	2025-11-18 23:04:49.532127	2025-11-18 23:04:49.532127
6	CANCELLED	Cancelled	closed	t	6	#fecaca	t	2025-11-18 23:04:49.532127	2025-11-18 23:04:49.532127
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.tickets (ticket_id, ticket_number, category_id, priority_id, status_id, subject, description, submitter_name, submitter_email, submitter_phone, submission_ip_hash, assigned_entity_id, assigned_user_id, sla_response_target, sla_resolution_target, first_response_at, resolved_at, closed_at, feedback_id, service_id, source, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Name: captcha_challenges_challenge_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.captcha_challenges_challenge_id_seq', 1, false);


--
-- Name: ea_service_request_attachments_attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.ea_service_request_attachments_attachment_id_seq', 1, false);


--
-- Name: ea_service_requests_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.ea_service_requests_request_id_seq', 1, false);


--
-- Name: grievance_attachments_attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.grievance_attachments_attachment_id_seq', 1, false);


--
-- Name: grievance_tickets_grievance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.grievance_tickets_grievance_id_seq', 1, false);


--
-- Name: priority_levels_priority_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.priority_levels_priority_id_seq', 4, true);


--
-- Name: service_attachments_service_attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.service_attachments_service_attachment_id_seq', 27, true);


--
-- Name: service_feedback_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.service_feedback_feedback_id_seq', 2, true);


--
-- Name: sla_breaches_breach_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.sla_breaches_breach_id_seq', 1, false);


--
-- Name: submission_attempts_attempt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.submission_attempts_attempt_id_seq', 1, false);


--
-- Name: ticket_activities_activity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.ticket_activities_activity_id_seq', 1, false);


--
-- Name: ticket_attachments_attachment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.ticket_attachments_attachment_id_seq', 1, false);


--
-- Name: ticket_categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.ticket_categories_category_id_seq', 18, true);


--
-- Name: ticket_notes_note_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.ticket_notes_note_id_seq', 1, false);


--
-- Name: ticket_status_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.ticket_status_status_id_seq', 18, true);


--
-- Name: tickets_ticket_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.tickets_ticket_id_seq', 1, false);


--
-- Name: captcha_challenges captcha_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.captcha_challenges
    ADD CONSTRAINT captcha_challenges_pkey PRIMARY KEY (challenge_id);


--
-- Name: ea_service_request_attachments ea_service_request_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ea_service_request_attachments
    ADD CONSTRAINT ea_service_request_attachments_pkey PRIMARY KEY (attachment_id);


--
-- Name: ea_service_requests ea_service_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ea_service_requests
    ADD CONSTRAINT ea_service_requests_pkey PRIMARY KEY (request_id);


--
-- Name: ea_service_requests ea_service_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ea_service_requests
    ADD CONSTRAINT ea_service_requests_request_number_key UNIQUE (request_number);


--
-- Name: entity_master entity_master_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.entity_master
    ADD CONSTRAINT entity_master_pkey PRIMARY KEY (unique_entity_id);


--
-- Name: grievance_attachments grievance_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.grievance_attachments
    ADD CONSTRAINT grievance_attachments_pkey PRIMARY KEY (attachment_id);


--
-- Name: grievance_tickets grievance_tickets_grievance_number_key; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.grievance_tickets
    ADD CONSTRAINT grievance_tickets_grievance_number_key UNIQUE (grievance_number);


--
-- Name: grievance_tickets grievance_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.grievance_tickets
    ADD CONSTRAINT grievance_tickets_pkey PRIMARY KEY (grievance_id);


--
-- Name: priority_levels priority_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.priority_levels
    ADD CONSTRAINT priority_levels_pkey PRIMARY KEY (priority_id);


--
-- Name: priority_levels priority_levels_priority_code_key; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.priority_levels
    ADD CONSTRAINT priority_levels_priority_code_key UNIQUE (priority_code);


--
-- Name: qr_codes qr_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_pkey PRIMARY KEY (qr_code_id);


--
-- Name: service_attachments service_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_attachments
    ADD CONSTRAINT service_attachments_pkey PRIMARY KEY (service_attachment_id);


--
-- Name: service_feedback service_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_feedback
    ADD CONSTRAINT service_feedback_pkey PRIMARY KEY (feedback_id);


--
-- Name: service_master service_master_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_master
    ADD CONSTRAINT service_master_pkey PRIMARY KEY (service_id);


--
-- Name: sla_breaches sla_breaches_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.sla_breaches
    ADD CONSTRAINT sla_breaches_pkey PRIMARY KEY (breach_id);


--
-- Name: submission_attempts submission_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.submission_attempts
    ADD CONSTRAINT submission_attempts_pkey PRIMARY KEY (attempt_id);


--
-- Name: submission_rate_limit submission_rate_limit_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.submission_rate_limit
    ADD CONSTRAINT submission_rate_limit_pkey PRIMARY KEY (ip_hash);


--
-- Name: ticket_activities ticket_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_activities
    ADD CONSTRAINT ticket_activities_pkey PRIMARY KEY (activity_id);


--
-- Name: ticket_attachments ticket_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_pkey PRIMARY KEY (attachment_id);


--
-- Name: ticket_categories ticket_categories_category_code_key; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_categories
    ADD CONSTRAINT ticket_categories_category_code_key UNIQUE (category_code);


--
-- Name: ticket_categories ticket_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_categories
    ADD CONSTRAINT ticket_categories_pkey PRIMARY KEY (category_id);


--
-- Name: ticket_notes ticket_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_notes
    ADD CONSTRAINT ticket_notes_pkey PRIMARY KEY (note_id);


--
-- Name: ticket_status ticket_status_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_status
    ADD CONSTRAINT ticket_status_pkey PRIMARY KEY (status_id);


--
-- Name: ticket_status ticket_status_status_code_key; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_status
    ADD CONSTRAINT ticket_status_status_code_key UNIQUE (status_code);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (ticket_id);


--
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: service_attachments unique_service_file; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_attachments
    ADD CONSTRAINT unique_service_file UNIQUE (service_id, filename);


--
-- Name: idx_activity_ticket; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_activity_ticket ON public.ticket_activities USING btree (ticket_id);


--
-- Name: idx_activity_type; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_activity_type ON public.ticket_activities USING btree (activity_type);


--
-- Name: idx_attachment_created; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_attachment_created ON public.ticket_attachments USING btree (created_at);


--
-- Name: idx_attachment_ticket; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_attachment_ticket ON public.ticket_attachments USING btree (ticket_id);


--
-- Name: idx_attempts_ip; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_attempts_ip ON public.submission_attempts USING btree (ip_hash);


--
-- Name: idx_breach_ticket; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_breach_ticket ON public.sla_breaches USING btree (ticket_id);


--
-- Name: idx_captcha_ip; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_captcha_ip ON public.captcha_challenges USING btree (ip_hash);


--
-- Name: idx_category_code; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_category_code ON public.ticket_categories USING btree (category_code);


--
-- Name: idx_ea_attachment; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_ea_attachment ON public.ea_service_request_attachments USING btree (request_id);


--
-- Name: idx_ea_attachment_created; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_ea_attachment_created ON public.ea_service_request_attachments USING btree (created_at);


--
-- Name: idx_entity_active; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_entity_active ON public.entity_master USING btree (is_active);


--
-- Name: idx_entity_type; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_entity_type ON public.entity_master USING btree (entity_type);


--
-- Name: idx_feedback_channel; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_channel ON public.service_feedback USING btree (channel);


--
-- Name: idx_feedback_entity; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_entity ON public.service_feedback USING btree (entity_id);


--
-- Name: idx_feedback_grievance; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_grievance ON public.service_feedback USING btree (grievance_flag);


--
-- Name: idx_feedback_qr; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_qr ON public.service_feedback USING btree (qr_code_id);


--
-- Name: idx_feedback_service; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_service ON public.service_feedback USING btree (service_id);


--
-- Name: idx_feedback_submitted; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_submitted ON public.service_feedback USING btree (submitted_at DESC);


--
-- Name: idx_grievance_attachment; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_grievance_attachment ON public.grievance_attachments USING btree (grievance_id);


--
-- Name: idx_grievance_created; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_grievance_created ON public.grievance_tickets USING btree (created_at DESC);


--
-- Name: idx_grievance_number; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_grievance_number ON public.grievance_tickets USING btree (grievance_number);


--
-- Name: idx_grievance_service; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_grievance_service ON public.grievance_tickets USING btree (service_id);


--
-- Name: idx_grievance_status; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_grievance_status ON public.grievance_tickets USING btree (status);


--
-- Name: idx_grievance_submitter; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_grievance_submitter ON public.grievance_tickets USING btree (submitter_email);


--
-- Name: idx_notes_ticket; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_notes_ticket ON public.ticket_notes USING btree (ticket_id);


--
-- Name: idx_priority_code; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_priority_code ON public.priority_levels USING btree (priority_code);


--
-- Name: idx_qr_active; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_qr_active ON public.qr_codes USING btree (is_active);


--
-- Name: idx_qr_service; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_qr_service ON public.qr_codes USING btree (service_id);


--
-- Name: idx_request_created; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_request_created ON public.ea_service_requests USING btree (created_at DESC);


--
-- Name: idx_request_number; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_request_number ON public.ea_service_requests USING btree (request_number);


--
-- Name: idx_request_service; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_request_service ON public.ea_service_requests USING btree (service_id);


--
-- Name: idx_request_status; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_request_status ON public.ea_service_requests USING btree (status);


--
-- Name: idx_request_submitter; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_request_submitter ON public.ea_service_requests USING btree (requester_email);


--
-- Name: idx_service_active; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_service_active ON public.service_master USING btree (is_active);


--
-- Name: idx_service_attachment_active; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_service_attachment_active ON public.service_attachments USING btree (is_active);


--
-- Name: idx_service_attachment_service; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_service_attachment_service ON public.service_attachments USING btree (service_id);


--
-- Name: idx_service_entity; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_service_entity ON public.service_master USING btree (entity_id);


--
-- Name: idx_status_code; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_status_code ON public.ticket_status USING btree (status_code);


--
-- Name: idx_ticket_category; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_ticket_category ON public.tickets USING btree (category_id);


--
-- Name: idx_ticket_created; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_ticket_created ON public.tickets USING btree (created_at DESC);


--
-- Name: idx_ticket_number; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_ticket_number ON public.tickets USING btree (ticket_number);


--
-- Name: idx_ticket_service; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_ticket_service ON public.tickets USING btree (service_id);


--
-- Name: idx_ticket_status; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_ticket_status ON public.tickets USING btree (status_id);


--
-- Name: ea_service_request_attachments ea_service_request_attachments_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ea_service_request_attachments
    ADD CONSTRAINT ea_service_request_attachments_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.ea_service_requests(request_id) ON DELETE CASCADE;


--
-- Name: ea_service_requests ea_service_requests_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ea_service_requests
    ADD CONSTRAINT ea_service_requests_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entity_master(unique_entity_id);


--
-- Name: ea_service_requests ea_service_requests_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ea_service_requests
    ADD CONSTRAINT ea_service_requests_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_master(service_id);


--
-- Name: entity_master entity_master_parent_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.entity_master
    ADD CONSTRAINT entity_master_parent_entity_id_fkey FOREIGN KEY (parent_entity_id) REFERENCES public.entity_master(unique_entity_id);


--
-- Name: grievance_attachments grievance_attachments_grievance_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.grievance_attachments
    ADD CONSTRAINT grievance_attachments_grievance_id_fkey FOREIGN KEY (grievance_id) REFERENCES public.grievance_tickets(grievance_id) ON DELETE CASCADE;


--
-- Name: grievance_tickets grievance_tickets_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.grievance_tickets
    ADD CONSTRAINT grievance_tickets_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entity_master(unique_entity_id);


--
-- Name: grievance_tickets grievance_tickets_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.grievance_tickets
    ADD CONSTRAINT grievance_tickets_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_master(service_id);


--
-- Name: qr_codes qr_codes_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entity_master(unique_entity_id);


--
-- Name: qr_codes qr_codes_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_master(service_id);


--
-- Name: service_attachments service_attachments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_attachments
    ADD CONSTRAINT service_attachments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_master(service_id);


--
-- Name: service_feedback service_feedback_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_feedback
    ADD CONSTRAINT service_feedback_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entity_master(unique_entity_id);


--
-- Name: service_feedback service_feedback_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_feedback
    ADD CONSTRAINT service_feedback_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.service_master(service_id);


--
-- Name: service_master service_master_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_master
    ADD CONSTRAINT service_master_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entity_master(unique_entity_id);


--
-- Name: sla_breaches sla_breaches_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.sla_breaches
    ADD CONSTRAINT sla_breaches_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id);


--
-- Name: ticket_activities ticket_activities_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_activities
    ADD CONSTRAINT ticket_activities_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: ticket_attachments ticket_attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: ticket_notes ticket_notes_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.ticket_notes
    ADD CONSTRAINT ticket_notes_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(ticket_id) ON DELETE CASCADE;


--
-- Name: tickets tickets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.ticket_categories(category_id);


--
-- Name: tickets tickets_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.ticket_status(status_id);


--
-- PostgreSQL database dump complete
--

\unrestrict mO0Xxpt8UqpRVqwcCgJDv8eKZodwoGN08YaNZNGYCldT6aOcroi0nGwv9guGo00

