--
-- PostgreSQL database dump
--

\restrict DOg1UraVxQhfkMEQEt89BvuE0LepIO37cn2WTUrQX2op3DzpfJluUgBMPVvekTC

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

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
-- Name: cleanup_rate_limits(); Type: FUNCTION; Schema: public; Owner: feedback_user
--

CREATE FUNCTION public.cleanup_rate_limits() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM submission_rate_limit 
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$;


ALTER FUNCTION public.cleanup_rate_limits() OWNER TO feedback_user;

--
-- Name: refresh_search_index(); Type: FUNCTION; Schema: public; Owner: feedback_user
--

CREATE FUNCTION public.refresh_search_index() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REINDEX INDEX idx_service_name_trgm;
END;
$$;


ALTER FUNCTION public.refresh_search_index() OWNER TO feedback_user;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: feedback_user
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO feedback_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

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
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT entity_master_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['ministry'::character varying, 'department'::character varying, 'agency'::character varying, 'statutory_body'::character varying, 'regulator'::character varying, 'portal'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.entity_master OWNER TO feedback_user;

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
    deactivated_at timestamp without time zone,
    CONSTRAINT qr_codes_location_type_check CHECK (((location_type)::text = ANY ((ARRAY['office'::character varying, 'kiosk'::character varying, 'service_center'::character varying, 'event'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.qr_codes OWNER TO feedback_user;

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
    q1_ease integer NOT NULL,
    q2_clarity integer NOT NULL,
    q3_timeliness integer NOT NULL,
    q4_trust integer NOT NULL,
    q5_overall_satisfaction integer NOT NULL,
    comment_text text,
    grievance_flag boolean DEFAULT false,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    ip_hash character varying(64),
    user_agent_hash character varying(64),
    CONSTRAINT service_feedback_channel_check CHECK (((channel)::text = ANY ((ARRAY['ea_portal'::character varying, 'qr_code'::character varying])::text[]))),
    CONSTRAINT service_feedback_q1_ease_check CHECK (((q1_ease >= 1) AND (q1_ease <= 5))),
    CONSTRAINT service_feedback_q2_clarity_check CHECK (((q2_clarity >= 1) AND (q2_clarity <= 5))),
    CONSTRAINT service_feedback_q3_timeliness_check CHECK (((q3_timeliness >= 1) AND (q3_timeliness <= 5))),
    CONSTRAINT service_feedback_q4_trust_check CHECK (((q4_trust >= 1) AND (q4_trust <= 5))),
    CONSTRAINT service_feedback_q5_overall_satisfaction_check CHECK (((q5_overall_satisfaction >= 1) AND (q5_overall_satisfaction <= 5))),
    CONSTRAINT service_feedback_recipient_group_check CHECK (((recipient_group)::text = ANY ((ARRAY['citizen'::character varying, 'business'::character varying, 'government'::character varying, 'visitor'::character varying, 'other'::character varying])::text[])))
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
-- Name: submission_rate_limit; Type: TABLE; Schema: public; Owner: feedback_user
--

CREATE TABLE public.submission_rate_limit (
    ip_hash character varying(64) NOT NULL,
    submission_count integer DEFAULT 1,
    window_start timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.submission_rate_limit OWNER TO feedback_user;

--
-- Name: v_qr_performance; Type: VIEW; Schema: public; Owner: feedback_user
--

CREATE VIEW public.v_qr_performance AS
 SELECT q.qr_code_id,
    q.location_name,
    q.location_type,
    s.service_name,
    e.entity_name,
    q.scan_count,
    count(f.feedback_id) AS submission_count,
    round(avg(f.q5_overall_satisfaction), 2) AS avg_satisfaction,
    max(f.submitted_at) AS last_scanned_at
   FROM (((public.qr_codes q
     JOIN public.service_master s ON (((q.service_id)::text = (s.service_id)::text)))
     JOIN public.entity_master e ON (((q.entity_id)::text = (e.unique_entity_id)::text)))
     LEFT JOIN public.service_feedback f ON (((q.qr_code_id)::text = (f.qr_code_id)::text)))
  WHERE (q.is_active = true)
  GROUP BY q.qr_code_id, q.location_name, q.location_type, s.service_name, e.entity_name, q.scan_count;


ALTER TABLE public.v_qr_performance OWNER TO feedback_user;

--
-- Name: v_service_performance; Type: VIEW; Schema: public; Owner: feedback_user
--

CREATE VIEW public.v_service_performance AS
 SELECT s.service_id,
    s.service_name,
    e.entity_name,
    count(f.feedback_id) AS total_submissions,
    round(avg(f.q5_overall_satisfaction), 2) AS avg_satisfaction,
    round(avg(f.q1_ease), 2) AS avg_ease,
    round(avg(f.q2_clarity), 2) AS avg_clarity,
    round(avg(f.q3_timeliness), 2) AS avg_timeliness,
    round(avg(f.q4_trust), 2) AS avg_trust,
    sum(
        CASE
            WHEN f.grievance_flag THEN 1
            ELSE 0
        END) AS grievance_count,
    max(f.submitted_at) AS last_feedback_at
   FROM ((public.service_master s
     JOIN public.entity_master e ON (((s.entity_id)::text = (e.unique_entity_id)::text)))
     LEFT JOIN public.service_feedback f ON (((s.service_id)::text = (f.service_id)::text)))
  WHERE (s.is_active = true)
  GROUP BY s.service_id, s.service_name, e.entity_name;


ALTER TABLE public.v_service_performance OWNER TO feedback_user;

--
-- Name: service_feedback feedback_id; Type: DEFAULT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.service_feedback ALTER COLUMN feedback_id SET DEFAULT nextval('public.service_feedback_feedback_id_seq'::regclass);


--
-- Data for Name: entity_master; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.entity_master (unique_entity_id, entity_name, entity_type, parent_entity_id, is_active, created_at, updated_at) FROM stdin;
AGY-001	Grenada Tourism Authority (GTA)	agency	MIN-005	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.338257
AGY-003	National Water & Sewerage Authority (NAWASA)	statutory_body	MIN-006	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.338257
AGY-004	Grenada Electricity Services Ltd (GRENLEC)	statutory_body	MIN-006	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.338257
AGY-005	Grenada Development Bank (GDB)	statutory_body	MIN-001	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-006	National Insurance Scheme (NIS)	statutory_body	MIN-001	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-007	Grenada Investment Development Corporation (GIDC)	agency	MIN-005	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-008	Grenada Ports Authority (GPA)	statutory_body	MIN-006	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-009	Grenada Airports Authority (GAA)	statutory_body	MIN-006	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-010	Grenada Solid Waste Management Authority (GSWMA)	statutory_body	MIN-006	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
MIN-001	Ministry of Finance	ministry	\N	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.328778
MIN-002	Ministry of Health, Wellness & Religious Affairs	ministry	\N	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.328778
MIN-003	Ministry of Education, Youth & Sports	ministry	\N	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.328778
MIN-004	Ministry of Legal Affairs, Labour & Consumer Affairs	ministry	\N	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.328778
MIN-005	Ministry of Economic Development, Planning & Tourism	ministry	\N	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.328778
MIN-006	Ministry of Infrastructure, Public Utilities, Civil Aviation & Transport	ministry	\N	t	2025-11-08 23:15:59.478599	2025-11-08 23:18:32.328778
MIN-007	Ministry of Social & Community Development, Housing & Gender Affairs	ministry	\N	t	2025-11-08 23:15:59.478599	2025-11-08 23:18:32.328778
MIN-008	Office of the Prime Minister	ministry	\N	t	2025-11-08 23:15:59.478599	2025-11-08 23:18:32.328778
DEPT-001	Immigration Department	department	MIN-004	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.335202
DEPT-002	Inland Revenue Division (IRD)	department	MIN-001	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.335202
DEPT-003	Customs & Excise Division	department	MIN-001	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.335202
DEPT-004	Civil Registry & Deeds	department	MIN-004	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.335202
DEPT-005	Public Health Department	department	MIN-002	t	2025-11-08 15:08:17.383107	2025-11-08 23:18:32.335202
DEPT-006	Central Statistical Office (CSO)	department	MIN-001	t	2025-11-08 23:15:59.496626	2025-11-08 23:18:32.335202
DEPT-007	Accountant General’s Division	department	MIN-001	t	2025-11-08 23:15:59.496626	2025-11-08 23:18:32.335202
DEPT-008	Budget Unit	department	MIN-001	t	2025-11-08 23:15:59.496626	2025-11-08 23:18:32.335202
DEPT-009	Debt Management Unit	department	MIN-001	t	2025-11-08 23:15:59.496626	2025-11-08 23:18:32.335202
DEPT-010	Office of Public Procurement	department	MIN-001	t	2025-11-08 23:15:59.496626	2025-11-08 23:18:32.335202
DEPT-011	Department of ICT (DoICT)	department	MIN-008	t	2025-11-08 23:15:59.496626	2025-11-08 23:18:32.335202
DEPT-012	Government Information Service (GIS)	department	MIN-008	t	2025-11-08 23:15:59.496626	2025-11-08 23:18:32.335202
AGY-011	Housing Authority of Grenada (HAG)	statutory_body	MIN-007	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-012	Planning & Development Authority (PDA)	agency	MIN-005	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-013	Grenada Bureau of Standards (GBS)	agency	MIN-005	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-014	Marketing & National Importing Board (MNIB)	statutory_body	MIN-005	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
AGY-015	Parliamentary Elections Office (PEO)	agency	\N	t	2025-11-08 23:15:59.501809	2025-11-08 23:18:32.338257
REG-001	Grenada Authority for the Regulation of Financial Institutions (GARFIN)	regulator	MIN-001	t	2025-11-08 23:18:32.34114	2025-11-08 23:18:32.34114
REG-002	Public Utilities Regulatory Commission (PURC)	regulator	MIN-006	t	2025-11-08 23:18:32.34114	2025-11-08 23:18:32.34114
REG-003	National Telecommunications Regulatory Commission (NTRC)	regulator	MIN-006	t	2025-11-08 23:18:32.34114	2025-11-08 23:18:32.34114
REG-004	Financial Intelligence Unit (FIU)	regulator	MIN-001	t	2025-11-08 23:18:32.34114	2025-11-08 23:18:32.34114
REG-005	Integrity Commission of Grenada	regulator	MIN-008	t	2025-11-08 23:18:32.34114	2025-11-08 23:18:32.34114
PRT-001	my.gov.gd (Unified eServices Portal)	portal	DEPT-011	t	2025-11-08 23:18:32.345353	2025-11-08 23:18:32.345353
PRT-002	pay.gov.gd (Government Payments Portal)	portal	DEPT-011	t	2025-11-08 23:18:32.345353	2025-11-08 23:18:32.345353
PRT-003	ptax.gov.gd (Tax Portal)	portal	DEPT-002	t	2025-11-08 23:18:32.345353	2025-11-08 23:18:32.345353
MIN-010	Cabinet Office	department	MIN-008	f	2025-11-09 01:15:09.242041	2025-11-09 01:59:06.109513
DEPT-013	Cabinet Office	department	MIN-008	t	2025-11-09 01:59:50.3272	2025-11-09 01:59:50.3272
AGY-002	Digital Transformation Agency (DTA)	agency	MIN-008	t	2025-11-08 15:08:17.383107	2025-11-12 01:12:24.252217
\.


--
-- Data for Name: qr_codes; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.qr_codes (qr_code_id, service_id, entity_id, location_name, location_address, location_type, generated_url, scan_count, is_active, notes, created_at, created_by, deactivated_at) FROM stdin;
QR-SVC-TRN-001-1	SVC-TRN-001	MIN-006	Ministry of Infrastructure, Public Utilities, Civil Aviation & Transport - Service Point	St. George's, Grenada	kiosk	https://gea.abhirup.app/feedback/qr?c=QR-SVC-TRN-001-1	98	t		2025-11-08 23:26:08.289113	synthetic_data	\N
QR-IMM-001-TEST	SVC-IMM-001	DEPT-001	Immigration Office - St. George’s	Ministerial Complex, St. George’s	office	https://gea.abhirup.app/feedback/qr?c=QR-IMM-001-TEST	6	t	\N	2025-11-08 15:08:17.403359	system	\N
QR-TAX-001-TEST	SVC-TAX-001	DEPT-002	Inland Revenue - Main Office	Melville Street, St. George’s	office	https://gea.abhirup.app/feedback/qr?c=QR-TAX-001-TEST	19	t	\N	2025-11-08 15:08:17.403359	system	\N
QR-REG-001-TEST	SVC-REG-010	DEPT-004	Registry Office - St. George’s	Church Street, St. George’s	office	https://gea.abhirup.app/feedback/qr?c=QR-REG-001-TEST	14	t	\N	2025-11-08 15:08:17.403359	system	\N
QR-SVC-IMM-002-1	SVC-IMM-002	DEPT-001	Immigration Department - Service Point	St. George's, Grenada	kiosk	https://gea.abhirup.app/feedback/qr?c=QR-SVC-IMM-002-1	118	t	\N	2025-11-08 23:26:08.289113	synthetic_data	\N
QR-SVC-REG-010-1	SVC-REG-010	DEPT-004	Civil Registry & Deeds - Service Point	St. George's, Grenada	kiosk	https://gea.abhirup.app/feedback/qr?c=QR-SVC-REG-010-1	113	t	\N	2025-11-08 23:26:08.289113	synthetic_data	\N
QR-SVC-UTL-002-1	SVC-UTL-002	AGY-003	National Water & Sewerage Authority (NAWASA) - Service Point	St. George's, Grenada	kiosk	https://gea.abhirup.app/feedback/qr?c=QR-SVC-UTL-002-1	26	t	\N	2025-11-08 23:26:08.289113	synthetic_data	\N
QR-SVC-UTL-004-1	SVC-UTL-004	AGY-004	Grenada Electricity Services Ltd (GRENLEC) - Service Point	St. George's, Grenada	kiosk	https://gea.abhirup.app/feedback/qr?c=QR-SVC-UTL-004-1	82	t	\N	2025-11-08 23:26:08.289113	synthetic_data	\N
QR-SVC-TRN-003-1	SVC-TRN-003	MIN-006	Ministry of Infrastructure, Public Utilities, Civil Aviation & Transport - Service Point	St. George's, Grenada	kiosk	https://gea.abhirup.app/feedback/qr?c=QR-SVC-TRN-003-1	69	t		2025-11-08 23:26:08.289113	synthetic_data	\N
QR-SVC-NIS-001-1	SVC-NIS-001	AGY-006	National Insurance Scheme (NIS) - Service Point	St. George's, Grenada	kiosk	https://gea.abhirup.app/feedback/qr?c=QR-SVC-NIS-001-1	54	t		2025-11-08 23:26:08.289113	synthetic_data	\N
QR-DTA-002	SVC-DIG-007	AGY-002	EA portal	gea.abhirup.app	service_center	https://gea.abhirup.app/feedback/qr?c=QR-DTA-002	4	t	QR code for service portal	2025-11-10 04:24:44.797877	system	\N
QR-SVC-TAX-002-1	SVC-TAX-002	DEPT-002	Inland Revenue Division (IRD) - Service Point	St. George's, Grenada	kiosk	https://gea.abhirup.app/feedback/qr?c=QR-SVC-TAX-002-1	102	t		2025-11-08 23:26:08.289113	synthetic_data	\N
QR-DGR-001	SVC-EVT-001	AGY-002	Ballroom#1	True Blue Hotel	event	 https://gea.abhirup.app/feedback/qr?c=QR-DGR-001	2	t	Demo QR Code	2025-11-12 02:45:01.581611	system	\N
\.


--
-- Data for Name: service_feedback; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.service_feedback (feedback_id, service_id, entity_id, channel, qr_code_id, recipient_group, q1_ease, q2_clarity, q3_timeliness, q4_trust, q5_overall_satisfaction, comment_text, grievance_flag, submitted_at, ip_hash, user_agent_hash) FROM stdin;
1	SVC-DIG-002	AGY-002	ea_portal	\N	government	5	5	5	5	5	excellent	f	2025-11-08 22:35:45.313454	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
2	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	3	1	2	4	4	please improve service time and instruction clarity	t	2025-11-08 22:36:56.182734	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
3	SVC-PLAN-001	AGY-012	ea_portal	\N	business	4	4	3	4	4	\N	f	2025-11-08 23:21:26.854389	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
4	SVC-REG-001	DEPT-004	ea_portal	\N	business	5	3	4	3	5	Online portal works well	f	2025-10-23 19:26:08.289113	ee7c52509a488a0d5efd885d498ba104	5d160f4c764fc54869d15d7e42abed81
5	SVC-REG-001	DEPT-004	ea_portal	\N	business	3	4	2	4	3	Waiting time was reasonable	f	2025-09-08 07:26:08.289113	2a1ba5c9ad48d47645b25bc19e7382d8	52408d687ae3bbab937a0ebc93bacbc9
6	SVC-REG-001	DEPT-004	ea_portal	\N	government	4	5	2	5	3	\N	f	2025-09-18 17:26:08.289113	5df2a578a47c2d2eaa814b0e940c49db	220a9bea7af15ca75b4fa56f3125c580
7	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	5	4	4	5	3	Process was straightforward and efficient	f	2025-10-20 00:26:08.289113	508b3177cc3a8d3fc709833b40f67de3	3c8ba02a15cc7e850382da44a04a1d68
8	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	3	4	2	4	4	Information was not clear	f	2025-10-27 01:26:08.289113	7c6c839c531c446527ab19ceb4b6e51f	ce2b04d66d8ba622c4f64073362bf501
9	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	5	4	3	5	4	\N	f	2025-08-17 15:26:08.289113	54d7703a087c3a68c7ba75cbab931c20	fe341de2974c98beb0cb3b6a17ce5024
10	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	5	4	2	3	5	\N	f	2025-09-06 18:26:08.289113	7ac6fa086562b3d38c40c9d22c3da64f	cff63d34ef4b24ab1b2d522e2184b675
11	SVC-REG-001	DEPT-004	ea_portal	\N	government	5	5	2	3	3	\N	f	2025-11-02 20:26:08.289113	25b3e0cb371290fc96ed97730254c98d	82571f372fe3f2dfb3023274088daff9
12	SVC-REG-001	DEPT-004	ea_portal	\N	other	3	4	3	5	3	Staff were helpful and professional	f	2025-09-24 04:26:08.289113	a4e91d043dee026b774041b17d651f01	a25bf253b8fad8771a81c70e9b51d840
13	SVC-REG-001	DEPT-004	ea_portal	\N	government	3	4	3	5	3	\N	f	2025-10-09 18:26:08.289113	83e5380baa4ebda6f65f05e4ee94ff31	3634cd6d5f0d8c7ecb395959074225f4
14	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	3	3	2	4	5	Staff were helpful and professional	f	2025-10-09 10:26:08.289113	23344e68b56bced5266ae2e647882679	8b0a54837768cb0eabc2f7ff4da51622
15	SVC-REG-001	DEPT-004	ea_portal	\N	other	5	4	2	4	5	\N	f	2025-10-22 05:26:08.289113	5d96f0e56193a881d9237d0c41940cea	0ffaacc58988223f07ca96d9dd66594f
16	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	3	5	3	5	5	\N	f	2025-09-07 19:26:08.289113	535987bb5b3c79fc4bd09e2569dc0689	d60912abe2aee39735814b28c6fe9358
17	SVC-REG-001	DEPT-004	ea_portal	\N	business	3	5	2	3	3	\N	f	2025-09-30 23:26:08.289113	1f5e408f90c813d046f0489bcb4a1bf3	f98dc6b0b5d1f0c5c036102c24663633
18	SVC-REG-001	DEPT-004	ea_portal	\N	government	4	5	2	3	4	Staff were helpful and professional	f	2025-10-19 08:26:08.289113	f3a253962743e27c0cb542f3d11a3e75	269c1a7debd201bbb8b463d2b370268c
19	SVC-REG-001	DEPT-004	ea_portal	\N	business	4	5	3	3	4	\N	f	2025-10-07 15:26:08.289113	c4041de15890686b3327a7adde6f632d	384bc57d0acfb0fdd9b6d350127b1db8
20	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	4	3	4	4	5	\N	f	2025-09-30 10:26:08.289113	948e5e14256e25380df39f889436c683	7e67cec51492ff8359607dfa8be8283a
21	SVC-REG-001	DEPT-004	ea_portal	\N	other	5	3	3	5	5	Documentation requirements unclear	f	2025-08-11 23:26:08.289113	638aee62cf819b37d59fe4d39ae0bbbe	c6eb6e6e6126fc98cde6d3092d6e6dba
22	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	5	4	4	4	5	\N	f	2025-08-18 15:26:08.289113	4ded8fcb56d2d906d346f993e1d68617	b876b2cc50dcd0ec68c8baf641596c1a
23	SVC-REG-001	DEPT-004	ea_portal	\N	business	3	5	2	4	4	System was easy to use	f	2025-11-07 10:26:08.289113	850457ccccbba37580a1705a9414c939	d483dfb198ba244f434cad810c71a18f
24	SVC-REG-001	DEPT-004	ea_portal	\N	government	3	4	2	3	5	\N	f	2025-08-11 13:26:08.289113	df6e4fca42656bf365068a1cc5735a8c	750c057d93c2f0f2aefd8c45d2d79547
25	SVC-REG-001	DEPT-004	ea_portal	\N	other	4	4	2	3	5	Process needs improvement	f	2025-09-14 08:26:08.289113	5c13905943a2d19e99487a0cf0db8aa3	407130efd00a3625c3b0f90193da5cb6
26	SVC-REG-001	DEPT-004	ea_portal	\N	government	4	5	2	3	3	\N	f	2025-09-19 06:26:08.289113	710d782e04fc3b8b4c972207515a0849	f49809e7260afc6537e338ae544c2890
27	SVC-REG-001	DEPT-004	ea_portal	\N	government	3	5	4	4	5	\N	f	2025-09-27 09:26:08.289113	24b313f2de3255516bb603081fbb4e22	a2f1416a4c03db2e859b0eca8b59b81d
28	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	3	5	2	5	5	\N	f	2025-09-04 00:26:08.289113	e17a6f098509955535f3f1f38bc79d8f	08b0e5518831c5f0eee6de2e23996c8a
29	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	5	5	3	4	5	\N	f	2025-08-17 10:26:08.289113	78739598944fa6eaf9ce96ddf8385183	148a658f903a969ba9dadf9f07934243
30	SVC-REG-001	DEPT-004	ea_portal	\N	business	4	4	4	3	4	Service exceeded expectations	f	2025-09-12 20:26:08.289113	fb0c0cac0b177c7f1dad86ccea81bd1b	277ae74bc10a8a7e3c7e8d662b8c16c5
31	SVC-REG-001	DEPT-004	ea_portal	\N	other	3	3	2	5	4	System was easy to use	f	2025-10-30 22:26:08.289113	795649861fed294fd4e31dce93dce469	2d73a2bec4ff8aeddca403f4bb7ff1ff
32	SVC-REG-001	DEPT-004	ea_portal	\N	business	5	4	4	5	3	System had technical issues	f	2025-09-14 22:26:08.289113	c37e44359564307d5c900ea414d8ee14	126f5a8458e643efc9dbbf3aa431ba7f
33	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	5	3	4	3	3	\N	t	2025-09-17 05:26:08.289113	6d670bdca41a5f957cbb337fdff0209d	ccc2daced677e7b6ff61d72cf9b217da
34	SVC-REG-001	DEPT-004	ea_portal	\N	business	3	5	3	3	3	\N	f	2025-10-01 21:26:08.289113	f60e2eb8190b22e4b35f1e161a07be7d	80d5418953fde6cbd1424f905adac1b9
35	SVC-REG-001	DEPT-004	ea_portal	\N	business	3	3	3	4	5	Information was not clear	t	2025-08-22 18:26:08.289113	6da8b80035feef30732ad7a7ea6dc04d	f623d2ca14dfdb774bfc8a02723cd4a0
36	SVC-REG-001	DEPT-004	ea_portal	\N	other	3	3	4	5	4	Staff were helpful and professional	f	2025-10-23 22:26:08.289113	973603537668b8247fafc42b32167b47	0ad99666ef50e1baf8614b09adbb9f2a
37	SVC-REG-001	DEPT-004	ea_portal	\N	other	3	4	3	3	4	\N	f	2025-10-30 05:26:08.289113	e46bac6c40dc894c0d4cb86802522f8b	dd21346fb0c17dacbd5aa6dfd3ec9b2f
38	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	5	3	4	4	4	Waiting time was reasonable	f	2025-10-07 16:26:08.289113	09adaba3e9b71faaeaec944ec98b1d76	bc0c0f5d6bdab2824f8e8e2a8690928b
39	SVC-REG-001	DEPT-004	ea_portal	\N	government	4	3	4	5	3	Online portal works well	f	2025-09-21 15:26:08.289113	73641eda1c10f8eb89826eb78511615a	65c8ed612fb308ec464cba7ba24bcf3a
40	SVC-REG-001	DEPT-004	ea_portal	\N	other	3	3	4	3	3	\N	f	2025-08-21 02:26:08.289113	72f03fbef61387913603decf9365283f	6e14470699d9fc9a1a8aa8947c302f9c
41	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	3	5	2	5	4	Quick and efficient processing	f	2025-09-15 13:26:08.289113	436a1627175f161a9439668926ad3ebd	5dc62dc6ef8a3fa19473f04df2a219f5
42	SVC-REG-001	DEPT-004	ea_portal	\N	business	3	5	2	4	4	\N	f	2025-09-27 14:26:08.289113	d44badf0696345178bdd87ddd44145a1	d16ab23651a41560ed2c4f917a9bae59
43	SVC-REG-001	DEPT-004	ea_portal	\N	government	5	5	2	5	4	\N	f	2025-09-01 18:26:08.289113	e481ab3ceec6fadc9c23325dd21fb377	0443cf56171bec8aba377503389e2209
44	SVC-REG-001	DEPT-004	ea_portal	\N	other	3	4	3	3	5	\N	f	2025-10-07 03:26:08.289113	fec9e2a70d35a3fd9357a303e323a64d	fa3fa2db70068f19dd5734dacdd8c98a
45	SVC-REG-001	DEPT-004	ea_portal	\N	government	3	4	4	5	5	System was easy to use	f	2025-09-12 16:26:08.289113	35330feee0edfac28ae5dbcae9f0ba4b	b8a052325f120ccca7997268e1cbe6db
46	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	5	4	3	4	5	\N	f	2025-09-20 11:26:08.289113	ded405a34606fcfe7077fbb275c4d619	db83d085aec0ab7a97b891bff56bf26a
47	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	5	5	4	3	3	System was easy to use	f	2025-10-22 03:26:08.289113	50ca3b140b4871f49c68af6983f14a07	cc586dd8e89af6720b8d7a0ae89a2900
48	SVC-REG-001	DEPT-004	ea_portal	\N	business	5	5	3	4	5	\N	f	2025-11-02 16:26:08.289113	e53bba5a979c4e28d139ca1690aafa98	95777564db99859e29e34179f824ac3d
49	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	5	5	3	5	4	Staff need more training	f	2025-09-16 06:26:08.289113	ec9fc2a486811719bfe560d1be1f348b	86b4ab355a3ce5393cc7c6860927f194
50	SVC-REG-001	DEPT-004	ea_portal	\N	business	5	5	3	5	5	\N	f	2025-09-24 04:26:08.289113	e16741657298df5e8b60479cf39ffca4	c2266c04f632edb24ffd38ff3ba6334b
51	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	4	4	2	5	4	Long wait times experienced	f	2025-09-17 06:26:08.289113	f37f787fe141b6fca54bbff96933e2d1	2cc1dd3193ef645588da653b42e09ada
52	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	4	3	4	3	4	Staff were helpful and professional	f	2025-11-01 20:26:08.289113	05bd9b03c0eb9783b085427838fedabc	543efc4c31da3112d2857c48a07c4320
53	SVC-REG-001	DEPT-004	ea_portal	\N	visitor	4	3	4	5	5	\N	f	2025-08-11 15:26:08.289113	834cb7c644c605b417407526df6ed1bc	cfa751d11fd5c6d285749c1bad1b7808
54	SVC-REG-001	DEPT-004	ea_portal	\N	government	3	5	2	5	3	Quick and efficient processing	f	2025-10-02 17:26:08.289113	0e56af305b60bda3c84e68466dd0ab7e	4d541339311e8b9b81f48dbfd97f084e
55	SVC-REG-002	DEPT-004	ea_portal	\N	other	4	5	3	5	4	Forms were confusing	f	2025-10-27 08:26:08.289113	54dd6cf980267d5d338f2d6ac457a1cf	5d160f4c764fc54869d15d7e42abed81
56	SVC-REG-002	DEPT-004	ea_portal	\N	government	4	3	2	5	5	\N	f	2025-08-22 14:26:08.289113	d22605e9f079dc862cd3360c68458722	52408d687ae3bbab937a0ebc93bacbc9
57	SVC-REG-002	DEPT-004	ea_portal	\N	business	3	4	3	3	5	\N	f	2025-10-13 02:26:08.289113	a32b3b48fc420370fcdf1e1211c16e09	220a9bea7af15ca75b4fa56f3125c580
58	SVC-REG-002	DEPT-004	ea_portal	\N	business	3	3	3	4	3	\N	f	2025-08-24 16:26:08.289113	1b16eee19728703665981e1b0d6da9ac	3c8ba02a15cc7e850382da44a04a1d68
59	SVC-REG-002	DEPT-004	ea_portal	\N	citizen	4	3	4	4	5	Information was not clear	f	2025-10-10 09:26:08.289113	72b3d89830f7864a85eb10f1f95f94f6	ce2b04d66d8ba622c4f64073362bf501
60	SVC-REG-002	DEPT-004	ea_portal	\N	business	3	3	4	4	3	\N	f	2025-11-07 09:26:08.289113	1d54c63c7ea833af6e8e7134e9f8932f	fe341de2974c98beb0cb3b6a17ce5024
61	SVC-REG-002	DEPT-004	ea_portal	\N	citizen	5	3	3	3	5	\N	f	2025-10-26 19:26:08.289113	b73003f85f9197c7843e79854e7005a3	cff63d34ef4b24ab1b2d522e2184b675
62	SVC-REG-002	DEPT-004	ea_portal	\N	business	5	5	4	4	5	\N	f	2025-11-04 23:26:08.289113	410928f18b84d25dabe795e857ef091b	82571f372fe3f2dfb3023274088daff9
63	SVC-REG-002	DEPT-004	ea_portal	\N	citizen	4	4	2	5	3	Staff were helpful and professional	f	2025-08-23 08:26:08.289113	b5d0ee0fa2bc4820c3899125cc1ff611	a25bf253b8fad8771a81c70e9b51d840
64	SVC-REG-002	DEPT-004	ea_portal	\N	business	3	3	3	3	5	\N	f	2025-09-21 07:26:08.289113	4d8a623005a8a5fbacc32f011e067d6b	3634cd6d5f0d8c7ecb395959074225f4
65	SVC-REG-002	DEPT-004	ea_portal	\N	government	4	3	4	4	4	\N	f	2025-09-11 17:26:08.289113	6d079621ba7b38e500ec43038adad309	8b0a54837768cb0eabc2f7ff4da51622
66	SVC-REG-002	DEPT-004	ea_portal	\N	visitor	5	4	4	5	5	\N	f	2025-09-05 02:26:08.289113	a60cbfb90c35c8c5fdbb424a5b5b0120	0ffaacc58988223f07ca96d9dd66594f
67	SVC-REG-002	DEPT-004	ea_portal	\N	citizen	4	5	4	5	5	Information was not clear	t	2025-11-02 07:26:08.289113	f3b6b146d4341ece333917b9f4af3cc2	d60912abe2aee39735814b28c6fe9358
68	SVC-REG-002	DEPT-004	ea_portal	\N	government	4	4	2	3	5	\N	f	2025-08-11 13:26:08.289113	efdab42870fe531caef1658b1f08fadd	f98dc6b0b5d1f0c5c036102c24663633
69	SVC-REG-002	DEPT-004	ea_portal	\N	government	3	3	4	5	5	Clear instructions provided	f	2025-08-25 03:26:08.289113	2a2283a1084fbf26977e90b7a8f60d13	269c1a7debd201bbb8b463d2b370268c
70	SVC-REG-002	DEPT-004	ea_portal	\N	visitor	3	5	3	3	3	Staff were helpful and professional	f	2025-09-05 17:26:08.289113	fb1eabc8cb3fe0666c6c3752bdd0c576	384bc57d0acfb0fdd9b6d350127b1db8
71	SVC-REG-002	DEPT-004	ea_portal	\N	government	4	3	4	4	4	\N	f	2025-08-12 17:26:08.289113	bf08f7ce21f7fff91d2a7373f690c4b3	7e67cec51492ff8359607dfa8be8283a
72	SVC-REG-002	DEPT-004	ea_portal	\N	other	5	4	3	4	3	Waiting time was reasonable	f	2025-11-05 10:26:08.289113	9eb97f76768891a399b4214e0015939b	c6eb6e6e6126fc98cde6d3092d6e6dba
73	SVC-REG-002	DEPT-004	ea_portal	\N	business	3	4	4	4	5	\N	f	2025-10-16 13:26:08.289113	3a66baeca85dfff23cb8690fddc4d8ea	b876b2cc50dcd0ec68c8baf641596c1a
74	SVC-REG-002	DEPT-004	ea_portal	\N	visitor	3	4	4	5	3	\N	f	2025-10-23 17:26:08.289113	51e4b2560aada09a42a0e8cc2b6cb4b1	d483dfb198ba244f434cad810c71a18f
75	SVC-REG-002	DEPT-004	ea_portal	\N	other	4	3	2	4	5	\N	f	2025-10-23 05:26:08.289113	9a2e0f401a6b2aa67bdf4aa93d1d531f	750c057d93c2f0f2aefd8c45d2d79547
76	SVC-REG-002	DEPT-004	ea_portal	\N	citizen	3	5	2	5	3	\N	f	2025-09-01 03:26:08.289113	a85f92b44e5bec0d2ffe5a8572854c96	407130efd00a3625c3b0f90193da5cb6
77	SVC-REG-002	DEPT-004	ea_portal	\N	visitor	3	3	4	4	3	System had technical issues	f	2025-10-18 13:26:08.289113	b86bbffc84b242b6d92e83a6b7cb1245	f49809e7260afc6537e338ae544c2890
78	SVC-REG-002	DEPT-004	ea_portal	\N	business	5	3	4	3	4	\N	f	2025-10-07 21:26:08.289113	f87f41737cc120f505af68842ab6a8e6	a2f1416a4c03db2e859b0eca8b59b81d
79	SVC-REG-002	DEPT-004	ea_portal	\N	citizen	4	4	4	5	5	\N	f	2025-11-02 19:26:08.289113	9c962a345735919981248e2e4bd68f44	08b0e5518831c5f0eee6de2e23996c8a
80	SVC-REG-002	DEPT-004	ea_portal	\N	visitor	5	4	4	4	5	System had technical issues	f	2025-10-25 15:26:08.289113	06ddc0c60aae78d4ef32bc42f2fb0b00	148a658f903a969ba9dadf9f07934243
81	SVC-REG-002	DEPT-004	ea_portal	\N	citizen	3	5	2	4	3	\N	t	2025-09-25 02:26:08.289113	9d8d8be8b2152bc16bb17b6d46b97aef	277ae74bc10a8a7e3c7e8d662b8c16c5
82	SVC-REG-003	DEPT-004	ea_portal	\N	government	3	4	3	4	4	\N	f	2025-08-20 11:26:08.289113	9738ba91608cc9b5e13a53a948c08cee	5d160f4c764fc54869d15d7e42abed81
83	SVC-REG-003	DEPT-004	ea_portal	\N	visitor	3	5	3	3	5	Information was not clear	f	2025-09-05 05:26:08.289113	f2c175f00d3b2e469ca74897aefedfcd	52408d687ae3bbab937a0ebc93bacbc9
84	SVC-REG-003	DEPT-004	ea_portal	\N	business	4	4	2	4	3	Online portal works well	f	2025-08-29 02:26:08.289113	0bac21feae19cb25a5e3e40954146bc6	220a9bea7af15ca75b4fa56f3125c580
85	SVC-REG-003	DEPT-004	ea_portal	\N	government	5	4	2	5	4	Excellent service, very satisfied	f	2025-10-30 19:26:08.289113	5f7d115569da36066848dbde1186a200	3c8ba02a15cc7e850382da44a04a1d68
86	SVC-REG-003	DEPT-004	ea_portal	\N	government	4	4	2	3	4	\N	f	2025-08-30 18:26:08.289113	16f7c3fe99681afb7aeeecfd3134bdda	ce2b04d66d8ba622c4f64073362bf501
87	SVC-REG-003	DEPT-004	ea_portal	\N	other	5	3	2	5	4	\N	f	2025-10-18 15:26:08.289113	99f3d1d2cc04654535248aa1b4a73f5b	fe341de2974c98beb0cb3b6a17ce5024
88	SVC-REG-003	DEPT-004	ea_portal	\N	other	3	3	3	4	4	Information was not clear	f	2025-10-12 18:26:08.289113	df813a2016a0d7a8345c4c7bcbf91c4e	cff63d34ef4b24ab1b2d522e2184b675
89	SVC-REG-003	DEPT-004	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-10-29 10:26:08.289113	4de4dc7c4ba265d1b25d83506102c58c	82571f372fe3f2dfb3023274088daff9
90	SVC-REG-003	DEPT-004	ea_portal	\N	government	4	4	3	5	5	Service exceeded expectations	f	2025-09-28 10:26:08.289113	28ea0b162b075e80b9ed2f6fcb379f4c	a25bf253b8fad8771a81c70e9b51d840
91	SVC-REG-003	DEPT-004	ea_portal	\N	business	5	3	4	4	3	Staff need more training	f	2025-10-11 13:26:08.289113	e8a2d5a6b3a9a3cb8beaa2b123507eca	3634cd6d5f0d8c7ecb395959074225f4
92	SVC-REG-003	DEPT-004	ea_portal	\N	visitor	5	3	4	3	3	\N	f	2025-09-17 03:26:08.289113	f8f187b9c3262fc658caa365da6c68fd	8b0a54837768cb0eabc2f7ff4da51622
93	SVC-REG-003	DEPT-004	ea_portal	\N	business	4	5	4	3	3	\N	f	2025-10-03 06:26:08.289113	49c1a9601508efce35d911e77304187a	0ffaacc58988223f07ca96d9dd66594f
94	SVC-REG-003	DEPT-004	ea_portal	\N	visitor	4	3	3	4	5	\N	f	2025-09-03 17:26:08.289113	6cf817ee67f7a32aa9cd8c15c059d8a3	d60912abe2aee39735814b28c6fe9358
95	SVC-REG-003	DEPT-004	ea_portal	\N	citizen	4	3	4	4	5	Would recommend this service	f	2025-09-03 22:26:08.289113	fc7396667709eeb0277a171e3bf8b03b	f98dc6b0b5d1f0c5c036102c24663633
96	SVC-REG-003	DEPT-004	ea_portal	\N	other	4	4	3	3	3	\N	f	2025-09-14 20:26:08.289113	a08bc1b3a3142faa6b7725b164507987	269c1a7debd201bbb8b463d2b370268c
97	SVC-REG-003	DEPT-004	ea_portal	\N	government	3	5	4	3	3	Information was not clear	f	2025-09-01 06:26:08.289113	325770f4a3764820f8cdf83b196665f9	384bc57d0acfb0fdd9b6d350127b1db8
98	SVC-REG-003	DEPT-004	ea_portal	\N	government	5	5	4	5	5	\N	t	2025-10-10 09:26:08.289113	2316cdaa135a09c6a8aac69efed66a5f	7e67cec51492ff8359607dfa8be8283a
99	SVC-REG-003	DEPT-004	ea_portal	\N	government	5	3	2	5	4	\N	f	2025-10-24 19:26:08.289113	64ca34255f09f344d9797c840d591326	c6eb6e6e6126fc98cde6d3092d6e6dba
100	SVC-REG-003	DEPT-004	ea_portal	\N	citizen	5	5	4	5	5	Online portal works well	f	2025-09-30 12:26:08.289113	233c332346d65a64055267c9a6ef094d	b876b2cc50dcd0ec68c8baf641596c1a
101	SVC-REG-003	DEPT-004	ea_portal	\N	visitor	5	4	2	4	5	\N	f	2025-08-14 21:26:08.289113	83251dc646394f08273b99c761aed744	d483dfb198ba244f434cad810c71a18f
102	SVC-REG-003	DEPT-004	ea_portal	\N	business	4	3	4	3	3	Would recommend this service	t	2025-09-17 19:26:08.289113	cd921f2eca3a38b01f547544870ed631	750c057d93c2f0f2aefd8c45d2d79547
103	SVC-REG-003	DEPT-004	ea_portal	\N	other	3	5	4	5	3	\N	f	2025-11-02 10:26:08.289113	6b6681619e041a46c56273cc6d021623	407130efd00a3625c3b0f90193da5cb6
104	SVC-REG-003	DEPT-004	ea_portal	\N	business	5	5	4	5	3	Clear instructions provided	f	2025-10-18 15:26:08.289113	3d708ab14ba8e77db403bbc96d2f0f88	f49809e7260afc6537e338ae544c2890
105	SVC-REG-003	DEPT-004	ea_portal	\N	business	4	5	2	3	3	\N	f	2025-08-22 14:26:08.289113	bd86e889f93cba3f7afcfbc8f3e2c704	a2f1416a4c03db2e859b0eca8b59b81d
106	SVC-REG-003	DEPT-004	ea_portal	\N	government	5	3	3	4	4	\N	f	2025-09-12 04:26:08.289113	bdc2a82245383d067ea7e6b75acb364c	08b0e5518831c5f0eee6de2e23996c8a
107	SVC-REG-003	DEPT-004	ea_portal	\N	visitor	4	3	4	4	5	\N	f	2025-09-23 03:26:08.289113	e951c6d90285ec70d231c0665547c8fe	148a658f903a969ba9dadf9f07934243
108	SVC-REG-003	DEPT-004	ea_portal	\N	visitor	5	5	3	3	5	Excellent service, very satisfied	f	2025-08-22 10:26:08.289113	20df07a4d8d019a8444c2ef1f79a87a3	277ae74bc10a8a7e3c7e8d662b8c16c5
109	SVC-REG-003	DEPT-004	ea_portal	\N	government	5	5	4	5	4	\N	f	2025-09-06 13:26:08.289113	7167e791c7c62cdc46d0ecd39ca8f393	2d73a2bec4ff8aeddca403f4bb7ff1ff
110	SVC-REG-004	DEPT-004	ea_portal	\N	other	5	5	3	5	3	\N	f	2025-08-20 14:26:08.289113	cfe99c5a036a677365a760984ca4e95f	5d160f4c764fc54869d15d7e42abed81
111	SVC-REG-004	DEPT-004	ea_portal	\N	business	5	3	2	5	5	\N	f	2025-10-06 22:26:08.289113	8d3705726eca3e9429db01201da1307d	52408d687ae3bbab937a0ebc93bacbc9
112	SVC-REG-004	DEPT-004	ea_portal	\N	government	3	5	2	3	5	\N	f	2025-10-23 02:26:08.289113	8de233eb741f265404190cb0349c7459	220a9bea7af15ca75b4fa56f3125c580
113	SVC-REG-004	DEPT-004	ea_portal	\N	citizen	5	3	4	3	4	\N	f	2025-08-17 20:26:08.289113	532d9835a3f0a016de15f43ee23b5dce	3c8ba02a15cc7e850382da44a04a1d68
114	SVC-REG-004	DEPT-004	ea_portal	\N	business	4	5	4	4	5	\N	t	2025-09-03 04:26:08.289113	2404bdee39f4f668ab8ed73dea370c50	ce2b04d66d8ba622c4f64073362bf501
115	SVC-REG-004	DEPT-004	ea_portal	\N	visitor	4	5	2	5	5	\N	f	2025-09-01 17:26:08.289113	e7abef8c9aabf534438394abae5e8f36	fe341de2974c98beb0cb3b6a17ce5024
116	SVC-REG-004	DEPT-004	ea_portal	\N	visitor	5	3	3	4	4	\N	f	2025-09-06 11:26:08.289113	0955515e604885247a17c0b646253cbc	cff63d34ef4b24ab1b2d522e2184b675
117	SVC-REG-004	DEPT-004	ea_portal	\N	government	5	5	2	4	5	\N	f	2025-09-13 23:26:08.289113	452b24db0f703f81056ac98c435b1ebe	82571f372fe3f2dfb3023274088daff9
118	SVC-REG-004	DEPT-004	ea_portal	\N	government	5	5	3	3	4	Process needs improvement	f	2025-08-14 13:26:08.289113	2d5bf8c9145e69d9e5022a5ebc240c68	a25bf253b8fad8771a81c70e9b51d840
119	SVC-REG-004	DEPT-004	ea_portal	\N	government	4	4	3	4	3	Waiting time was reasonable	t	2025-08-16 16:26:08.289113	6d3f928acddf25023a53aafafc227720	3634cd6d5f0d8c7ecb395959074225f4
120	SVC-REG-004	DEPT-004	ea_portal	\N	business	5	4	2	5	5	Could be faster but overall good experience	t	2025-08-23 08:26:08.289113	62b9135113f67bbcaa721f1c91b1d757	8b0a54837768cb0eabc2f7ff4da51622
121	SVC-REG-004	DEPT-004	ea_portal	\N	visitor	4	3	3	3	4	\N	f	2025-10-15 19:26:08.289113	0d2a37ba36a59a48a60ac1a6b52de0fc	0ffaacc58988223f07ca96d9dd66594f
122	SVC-REG-004	DEPT-004	ea_portal	\N	visitor	4	5	4	3	4	Quick and efficient processing	f	2025-09-24 18:26:08.289113	c6ddf54d582b5870b72ea412409e7ccc	d60912abe2aee39735814b28c6fe9358
123	SVC-REG-004	DEPT-004	ea_portal	\N	business	4	4	4	3	4	\N	f	2025-10-13 22:26:08.289113	bf31dd8cebf3c57fab5fbf9c4cd21a3d	f98dc6b0b5d1f0c5c036102c24663633
124	SVC-REG-004	DEPT-004	ea_portal	\N	other	4	3	4	5	3	Staff need more training	f	2025-09-25 05:26:08.289113	3ab32da9496955c2b943e45f1860b490	269c1a7debd201bbb8b463d2b370268c
125	SVC-REG-004	DEPT-004	ea_portal	\N	government	5	4	4	4	4	\N	f	2025-09-10 07:26:08.289113	dd72391b72c36c247982f5dddef14e6a	384bc57d0acfb0fdd9b6d350127b1db8
126	SVC-REG-004	DEPT-004	ea_portal	\N	visitor	5	4	4	5	4	\N	f	2025-08-29 03:26:08.289113	093fbc8317e4a9b079f25787faa4a420	7e67cec51492ff8359607dfa8be8283a
127	SVC-REG-004	DEPT-004	ea_portal	\N	government	4	5	3	5	3	\N	f	2025-09-18 16:26:08.289113	05aa120eb4e22591c1212aba8b8855a4	c6eb6e6e6126fc98cde6d3092d6e6dba
128	SVC-REG-004	DEPT-004	ea_portal	\N	visitor	4	5	2	5	3	\N	f	2025-11-04 16:26:08.289113	354a5842e366b843ee022975ef4d88d3	b876b2cc50dcd0ec68c8baf641596c1a
129	SVC-REG-004	DEPT-004	ea_portal	\N	business	5	5	3	3	3	\N	f	2025-08-27 22:26:08.289113	97ebe068004deec3289304931295c959	d483dfb198ba244f434cad810c71a18f
130	SVC-REG-004	DEPT-004	ea_portal	\N	government	3	4	3	4	5	\N	f	2025-11-06 06:26:08.289113	22cb7017ca0f35aac95501dd8c016beb	750c057d93c2f0f2aefd8c45d2d79547
131	SVC-REG-004	DEPT-004	ea_portal	\N	visitor	4	4	3	4	4	\N	f	2025-09-28 00:26:08.289113	1b31977ac9348c331beac20447b782b6	407130efd00a3625c3b0f90193da5cb6
132	SVC-REG-004	DEPT-004	ea_portal	\N	visitor	4	3	4	3	3	\N	f	2025-09-10 02:26:08.289113	2030d1a0e61b994c667b84f223bb6e07	f49809e7260afc6537e338ae544c2890
133	SVC-REG-004	DEPT-004	ea_portal	\N	citizen	5	4	4	4	4	\N	f	2025-10-25 11:26:08.289113	1f53189eb7c40af36e71933d28cccdf5	a2f1416a4c03db2e859b0eca8b59b81d
134	SVC-REG-004	DEPT-004	ea_portal	\N	government	5	5	4	3	5	Staff need more training	f	2025-09-25 11:26:08.289113	c3d1157ba59029dd68b9a40f6bd1377a	08b0e5518831c5f0eee6de2e23996c8a
135	SVC-TAX-001	DEPT-002	ea_portal	\N	citizen	3	4	3	4	3	\N	f	2025-09-20 02:26:08.289113	ff9def45a2151fdbe6edd1e19e0d911c	5d160f4c764fc54869d15d7e42abed81
136	SVC-TAX-001	DEPT-002	ea_portal	\N	citizen	3	5	2	4	3	System had technical issues	f	2025-08-24 02:26:08.289113	a1ca3ea7161b6fca8b20cc36fe074668	52408d687ae3bbab937a0ebc93bacbc9
137	SVC-TAX-001	DEPT-002	ea_portal	\N	government	5	5	3	5	4	\N	f	2025-09-26 07:26:08.289113	1d45b10102f9405a50fd5e1251b8b400	220a9bea7af15ca75b4fa56f3125c580
138	SVC-TAX-001	DEPT-002	ea_portal	\N	other	4	3	3	5	5	Service exceeded expectations	f	2025-10-07 04:26:08.289113	78f19dd1045fded8ddd2f59292fe02f0	3c8ba02a15cc7e850382da44a04a1d68
139	SVC-TAX-001	DEPT-002	ea_portal	\N	citizen	4	4	2	3	3	\N	f	2025-08-15 23:26:08.289113	ce87738943927b0f56a67d035b2992ad	ce2b04d66d8ba622c4f64073362bf501
140	SVC-TAX-001	DEPT-002	ea_portal	\N	business	3	4	4	4	3	\N	f	2025-09-02 20:26:08.289113	380c0913797b9ada0ed176ea5889a9e1	fe341de2974c98beb0cb3b6a17ce5024
141	SVC-TAX-001	DEPT-002	ea_portal	\N	other	5	3	3	5	5	System was easy to use	f	2025-11-08 17:26:08.289113	4702f843d4b6164b1f04dd1e5086485f	cff63d34ef4b24ab1b2d522e2184b675
142	SVC-TAX-001	DEPT-002	ea_portal	\N	other	3	4	3	3	4	\N	t	2025-08-26 18:26:08.289113	f898c4654e74b8c9f44d19c91706418c	82571f372fe3f2dfb3023274088daff9
143	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	5	3	2	3	3	Staff were helpful and professional	f	2025-09-04 20:26:08.289113	9686961cd2292aba27eb48be81be65f2	a25bf253b8fad8771a81c70e9b51d840
144	SVC-TAX-001	DEPT-002	ea_portal	\N	citizen	5	3	3	3	4	\N	f	2025-09-11 08:26:08.289113	9b948daa3de226d54ea656c4713e986c	3634cd6d5f0d8c7ecb395959074225f4
145	SVC-TAX-001	DEPT-002	ea_portal	\N	other	4	5	2	3	5	Forms were confusing	f	2025-08-18 19:26:08.289113	f362779abc9ef0bbdc0c518c629f5390	8b0a54837768cb0eabc2f7ff4da51622
146	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	5	5	3	4	4	\N	f	2025-10-31 10:26:08.289113	7f8e3bc07ac75da73ca792511388bdcf	0ffaacc58988223f07ca96d9dd66594f
147	SVC-TAX-001	DEPT-002	ea_portal	\N	business	4	3	4	3	4	\N	f	2025-08-13 04:26:08.289113	513198998502a06dd29004a2004b0c5f	d60912abe2aee39735814b28c6fe9358
148	SVC-TAX-001	DEPT-002	ea_portal	\N	government	5	5	3	3	4	Forms were confusing	f	2025-09-10 02:26:08.289113	69a04d435837eeb247c82e2118061a6e	f98dc6b0b5d1f0c5c036102c24663633
149	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	4	5	2	5	5	Information was not clear	f	2025-08-18 13:26:08.289113	b4185fc5da6393ae5ac91907b74a6d26	269c1a7debd201bbb8b463d2b370268c
150	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	3	5	4	3	3	Would recommend this service	f	2025-09-28 07:26:08.289113	9fa6a34f325c3048cade247ccf8e86d8	384bc57d0acfb0fdd9b6d350127b1db8
151	SVC-TAX-001	DEPT-002	ea_portal	\N	government	5	3	2	3	4	Forms were confusing	f	2025-10-10 12:26:08.289113	db04d1bc80561ab5c966d506881f50bb	7e67cec51492ff8359607dfa8be8283a
152	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	5	3	3	4	5	\N	f	2025-10-05 16:26:08.289113	3b0c314562fd0165a5cbfd140db24156	c6eb6e6e6126fc98cde6d3092d6e6dba
153	SVC-TAX-001	DEPT-002	ea_portal	\N	government	5	3	2	5	5	\N	f	2025-08-29 14:26:08.289113	6f9e998776b12cf19163067c1f08b7d1	b876b2cc50dcd0ec68c8baf641596c1a
154	SVC-TAX-001	DEPT-002	ea_portal	\N	business	3	5	2	5	4	\N	f	2025-10-24 22:26:08.289113	34603bb53bc61bf04b9776f35304a120	d483dfb198ba244f434cad810c71a18f
155	SVC-TAX-001	DEPT-002	ea_portal	\N	other	4	3	3	4	5	Excellent service, very satisfied	t	2025-11-01 19:26:08.289113	2e9e7a73f3f8d2ec5c9e732cbdd582b7	750c057d93c2f0f2aefd8c45d2d79547
156	SVC-TAX-001	DEPT-002	ea_portal	\N	government	3	5	4	5	3	Service exceeded expectations	f	2025-08-29 10:26:08.289113	d0b221d67931adfa222fb2a505e05480	407130efd00a3625c3b0f90193da5cb6
157	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	3	4	3	3	4	Long wait times experienced	f	2025-08-30 13:26:08.289113	bd8ccf725aa177107e552fca5f72f060	f49809e7260afc6537e338ae544c2890
158	SVC-TAX-001	DEPT-002	ea_portal	\N	business	5	4	4	3	5	Process was straightforward and efficient	f	2025-08-16 19:26:08.289113	3fbb6023077712d800f46ee9548dec24	a2f1416a4c03db2e859b0eca8b59b81d
159	SVC-TAX-001	DEPT-002	ea_portal	\N	other	3	3	2	5	5	\N	f	2025-10-13 13:26:08.289113	6de32e72e4f3bdf96dbaac7f5a78293b	08b0e5518831c5f0eee6de2e23996c8a
160	SVC-TAX-001	DEPT-002	ea_portal	\N	citizen	4	5	3	3	3	\N	f	2025-09-21 02:26:08.289113	228997d21c5515fbe5f20b9a65777ec5	148a658f903a969ba9dadf9f07934243
161	SVC-TAX-001	DEPT-002	ea_portal	\N	business	5	3	3	3	3	\N	f	2025-10-11 18:26:08.289113	2d3f00d6e9bf62cea6a1ee9eb306f6b0	277ae74bc10a8a7e3c7e8d662b8c16c5
162	SVC-TAX-001	DEPT-002	ea_portal	\N	other	3	4	3	5	4	\N	f	2025-09-16 11:26:08.289113	c0363dddc187def0c96ca014c508af51	2d73a2bec4ff8aeddca403f4bb7ff1ff
163	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	3	5	2	4	4	Could be faster but overall good experience	f	2025-09-05 17:26:08.289113	8e67c357932bb9cbb9356c50534be129	126f5a8458e643efc9dbbf3aa431ba7f
164	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	4	3	4	4	4	\N	f	2025-08-21 10:26:08.289113	3803325360ef990515b03f54392ccfa2	ccc2daced677e7b6ff61d72cf9b217da
165	SVC-TAX-001	DEPT-002	ea_portal	\N	citizen	5	3	2	4	5	\N	f	2025-08-30 21:26:08.289113	3ac4384223691b7a91ecd924baf75c45	80d5418953fde6cbd1424f905adac1b9
166	SVC-TAX-001	DEPT-002	ea_portal	\N	business	3	4	4	4	3	\N	f	2025-10-11 00:26:08.289113	c84df6a26ffd54ad6c80484133149c78	f623d2ca14dfdb774bfc8a02723cd4a0
167	SVC-TAX-001	DEPT-002	ea_portal	\N	other	4	5	3	5	3	\N	f	2025-11-01 18:26:08.289113	23245f802de8f15812d5fdf1b8fbe1eb	0ad99666ef50e1baf8614b09adbb9f2a
168	SVC-TAX-001	DEPT-002	ea_portal	\N	government	3	4	3	5	3	\N	f	2025-08-26 07:26:08.289113	470993b94c03d20d7df1bd7f149621e4	dd21346fb0c17dacbd5aa6dfd3ec9b2f
169	SVC-TAX-001	DEPT-002	ea_portal	\N	citizen	4	4	2	4	5	Process was straightforward and efficient	f	2025-09-16 06:26:08.289113	337426f9228ada6f0b7c78648bdb17df	bc0c0f5d6bdab2824f8e8e2a8690928b
170	SVC-TAX-001	DEPT-002	ea_portal	\N	business	5	5	2	4	3	\N	f	2025-09-20 07:26:08.289113	7bbb31a8abe942ba2c237eaf63d73827	65c8ed612fb308ec464cba7ba24bcf3a
171	SVC-TAX-001	DEPT-002	ea_portal	\N	business	3	4	3	4	5	\N	f	2025-10-02 07:26:08.289113	67b7a98382dfedf2942ee8c3056a2e79	6e14470699d9fc9a1a8aa8947c302f9c
172	SVC-TAX-001	DEPT-002	ea_portal	\N	government	4	5	3	5	5	\N	f	2025-10-17 11:26:08.289113	23cad55d5ca2c124c2b5c7d7197659af	5dc62dc6ef8a3fa19473f04df2a219f5
173	SVC-TAX-001	DEPT-002	ea_portal	\N	business	4	5	4	3	3	\N	f	2025-10-19 22:26:08.289113	5dc53618b0be81217b197c565337af9d	d16ab23651a41560ed2c4f917a9bae59
174	SVC-TAX-001	DEPT-002	ea_portal	\N	visitor	4	5	2	4	3	\N	f	2025-09-20 01:26:08.289113	23e821011fdd125fb43330936b103c53	0443cf56171bec8aba377503389e2209
175	SVC-TAX-001	DEPT-002	ea_portal	\N	business	3	3	2	5	5	Staff need more training	f	2025-08-24 07:26:08.289113	cc5247f3e570899f7e8d5cde555fc797	fa3fa2db70068f19dd5734dacdd8c98a
176	SVC-TAX-001	DEPT-002	ea_portal	\N	other	4	4	4	3	5	Process was straightforward and efficient	f	2025-08-29 19:26:08.289113	6af933c0d7170afa6e803b2af7accbb5	b8a052325f120ccca7997268e1cbe6db
177	SVC-TAX-001	DEPT-002	ea_portal	\N	business	4	5	4	5	4	\N	f	2025-10-26 01:26:08.289113	8aa3fe9a6bbbd7c553cfcbb64fab0d44	db83d085aec0ab7a97b891bff56bf26a
178	SVC-TAX-001	DEPT-002	ea_portal	\N	business	3	4	3	5	3	\N	f	2025-09-28 13:26:08.289113	6d44ef41adf378a8b8dd343e511bc523	cc586dd8e89af6720b8d7a0ae89a2900
179	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	4	3	2	5	4	Long wait times experienced	f	2025-09-21 08:26:08.289113	6ef7abd9678a4d6e410483f1b94754ea	5d160f4c764fc54869d15d7e42abed81
180	SVC-TAX-002	DEPT-002	ea_portal	\N	other	3	5	3	4	5	\N	f	2025-10-11 13:26:08.289113	e85f6608cb2a28f0a432cf0bc24d51b0	52408d687ae3bbab937a0ebc93bacbc9
181	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	4	4	3	\N	f	2025-10-02 20:26:08.289113	c672b66e1038cd958bc59394748365e1	220a9bea7af15ca75b4fa56f3125c580
182	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	4	4	3	4	\N	f	2025-10-17 12:26:08.289113	9f6c34ce019e1e70e2a1b89b1408c893	3c8ba02a15cc7e850382da44a04a1d68
183	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	4	3	4	4	5	\N	f	2025-09-26 14:26:08.289113	7f74c30734900c6ee261a58517416725	ce2b04d66d8ba622c4f64073362bf501
184	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	4	5	2	5	4	Clear instructions provided	f	2025-08-24 17:26:08.289113	6b00cbcaa1ab347095de9887e01c2955	fe341de2974c98beb0cb3b6a17ce5024
185	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	3	4	3	4	\N	f	2025-09-07 00:26:08.289113	b313ba325da87d27a702c417641c3781	cff63d34ef4b24ab1b2d522e2184b675
186	SVC-TAX-002	DEPT-002	ea_portal	\N	other	4	5	4	3	4	\N	f	2025-08-11 05:26:08.289113	65945934a67acc49c4d40ac512cbc2d8	82571f372fe3f2dfb3023274088daff9
187	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	4	3	2	3	3	\N	f	2025-10-30 12:26:08.289113	2b576830d5c666a52161ba1256ce3d07	a25bf253b8fad8771a81c70e9b51d840
188	SVC-TAX-002	DEPT-002	ea_portal	\N	government	4	3	3	3	5	Online portal works well	f	2025-08-14 20:26:08.289113	e12bcf933f433e387630c96db4a42e0e	3634cd6d5f0d8c7ecb395959074225f4
189	SVC-TAX-002	DEPT-002	ea_portal	\N	other	3	5	2	4	5	Service exceeded expectations	f	2025-08-12 00:26:08.289113	093e4622e0cfd538e9763ba4097053fd	8b0a54837768cb0eabc2f7ff4da51622
190	SVC-TAX-002	DEPT-002	ea_portal	\N	business	4	4	4	5	4	Staff need more training	f	2025-10-27 10:26:08.289113	cbd0a8a581dacbaa11c09b7ac101b299	0ffaacc58988223f07ca96d9dd66594f
191	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	4	5	3	5	5	Excellent service, very satisfied	f	2025-10-07 08:26:08.289113	6003660bbc0c279501a400a41ae0c64e	d60912abe2aee39735814b28c6fe9358
192	SVC-TAX-002	DEPT-002	ea_portal	\N	other	3	3	2	4	3	\N	f	2025-10-22 08:26:08.289113	b9a949c3b580f2dcceac0991c2c9c839	f98dc6b0b5d1f0c5c036102c24663633
193	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	4	4	3	5	\N	f	2025-10-23 01:26:08.289113	5323443363007e847a9de7e4fbe87e5a	269c1a7debd201bbb8b463d2b370268c
194	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	4	5	2	5	5	\N	f	2025-11-06 11:26:08.289113	46ef4cbfc6ccbee5372a17fe1fc558e6	384bc57d0acfb0fdd9b6d350127b1db8
195	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	3	4	4	4	Staff were helpful and professional	t	2025-10-31 04:26:08.289113	471a2e3eae7331ed677aa5e5e96649e8	7e67cec51492ff8359607dfa8be8283a
196	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	4	5	4	3	5	Process needs improvement	f	2025-09-14 20:26:08.289113	d8f2588835de8a1f5709269bc1c7093e	c6eb6e6e6126fc98cde6d3092d6e6dba
197	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	4	2	5	3	\N	f	2025-08-18 19:26:08.289113	64d6dc980e0a7836534538736b90470e	b876b2cc50dcd0ec68c8baf641596c1a
198	SVC-TAX-002	DEPT-002	ea_portal	\N	business	4	5	2	4	5	\N	f	2025-10-04 09:26:08.289113	5608bd376adfe9357103ee5e3daebfa4	d483dfb198ba244f434cad810c71a18f
199	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	4	3	3	3	3	\N	f	2025-09-15 16:26:08.289113	87ecfdb71937c7d7741ae9c5fc1bfec7	750c057d93c2f0f2aefd8c45d2d79547
200	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	2	3	3	Clear instructions provided	f	2025-09-19 07:26:08.289113	26c8a49139b983ffde10b8f4f427c246	407130efd00a3625c3b0f90193da5cb6
201	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	4	5	4	\N	f	2025-08-21 02:26:08.289113	e21f83db5795f0db26bf7064ae275de6	f49809e7260afc6537e338ae544c2890
202	SVC-TAX-002	DEPT-002	ea_portal	\N	other	4	4	4	4	5	Service exceeded expectations	f	2025-09-04 05:26:08.289113	75e155c613e055730b3fec4a56daba1c	a2f1416a4c03db2e859b0eca8b59b81d
203	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	4	4	4	3	5	\N	f	2025-10-22 15:26:08.289113	87e5c1d08ae3fab518841772f40778aa	08b0e5518831c5f0eee6de2e23996c8a
204	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	4	3	2	3	3	\N	f	2025-10-14 03:26:08.289113	3224331c1fc21df98b9a9fad16aea651	148a658f903a969ba9dadf9f07934243
205	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	3	2	5	5	Could be faster but overall good experience	f	2025-09-08 19:26:08.289113	e269ec4074d387691d2bd34efed8e2ae	277ae74bc10a8a7e3c7e8d662b8c16c5
206	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	3	5	3	5	3	Forms were confusing	f	2025-10-10 19:26:08.289113	ba61c48030803cc04e2ccf3d72038605	2d73a2bec4ff8aeddca403f4bb7ff1ff
207	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	2	3	5	\N	f	2025-10-31 21:26:08.289113	33871986b7c51a44b8075fc4c8561a7d	126f5a8458e643efc9dbbf3aa431ba7f
208	SVC-TAX-002	DEPT-002	ea_portal	\N	government	3	5	3	5	5	\N	f	2025-09-27 22:26:08.289113	b0283c1f426f5601e8675e5b7a574c43	ccc2daced677e7b6ff61d72cf9b217da
209	SVC-TAX-002	DEPT-002	ea_portal	\N	government	4	5	2	4	3	Would recommend this service	f	2025-08-30 19:26:08.289113	4b713f3f0a686564b6f89c035adc4bce	80d5418953fde6cbd1424f905adac1b9
210	SVC-TAX-002	DEPT-002	ea_portal	\N	government	3	4	3	5	4	Process was straightforward and efficient	f	2025-11-07 20:26:08.289113	ccb69c1950f434353b0be2e6b46f4560	f623d2ca14dfdb774bfc8a02723cd4a0
211	SVC-TAX-002	DEPT-002	ea_portal	\N	other	3	3	3	3	3	\N	f	2025-09-15 09:26:08.289113	39c7701ae591c8da7c48b90a995daf91	0ad99666ef50e1baf8614b09adbb9f2a
212	SVC-TAX-002	DEPT-002	ea_portal	\N	other	4	4	2	3	5	Staff were helpful and professional	f	2025-09-19 15:26:08.289113	08c7f6e61201768be663fa8cc487338c	dd21346fb0c17dacbd5aa6dfd3ec9b2f
213	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	3	4	4	5	Quick and efficient processing	f	2025-10-09 07:26:08.289113	ba27fcfc7ed53e170af643576a9fc6b3	bc0c0f5d6bdab2824f8e8e2a8690928b
214	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	4	5	4	4	4	\N	f	2025-09-28 19:26:08.289113	c6222dc005a2efc98824e98d68115d85	65c8ed612fb308ec464cba7ba24bcf3a
215	SVC-TAX-002	DEPT-002	ea_portal	\N	government	4	3	2	4	3	\N	f	2025-10-24 04:26:08.289113	6d57d49e9b82beb84d029bb3ba6803c5	6e14470699d9fc9a1a8aa8947c302f9c
216	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	3	5	2	5	3	\N	t	2025-09-08 13:26:08.289113	01124c6ccf8cbdf18722e7d48600d027	5dc62dc6ef8a3fa19473f04df2a219f5
217	SVC-TAX-002	DEPT-002	ea_portal	\N	government	4	4	4	3	4	\N	f	2025-08-14 05:26:08.289113	76239ea9c129efb2077ff91a4848a60c	d16ab23651a41560ed2c4f917a9bae59
218	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	3	5	3	4	3	\N	f	2025-11-03 02:26:08.289113	d9f76e75246a44600582ed6abff0f53e	0443cf56171bec8aba377503389e2209
219	SVC-TAX-002	DEPT-002	ea_portal	\N	business	4	3	4	5	5	\N	f	2025-10-03 04:26:08.289113	3b7717ee5b3f198fd91ad5e542d41298	fa3fa2db70068f19dd5734dacdd8c98a
220	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	4	4	5	5	\N	f	2025-10-15 17:26:08.289113	54d94b33af031a985d084b446acad97e	b8a052325f120ccca7997268e1cbe6db
221	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	4	2	5	4	\N	f	2025-10-22 22:26:08.289113	e40abc7a1b87125656adcd3a124e9089	db83d085aec0ab7a97b891bff56bf26a
222	SVC-TAX-002	DEPT-002	ea_portal	\N	business	4	5	2	3	4	Process was straightforward and efficient	f	2025-10-23 06:26:08.289113	bdb01aecfe218de3093a34bcb447143d	cc586dd8e89af6720b8d7a0ae89a2900
223	SVC-TAX-002	DEPT-002	ea_portal	\N	other	4	3	4	4	3	\N	f	2025-09-20 22:26:08.289113	68652b7a1d72bfe5e58136c16e529c28	95777564db99859e29e34179f824ac3d
224	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	3	3	2	5	3	\N	f	2025-08-22 10:26:08.289113	675c3ee58364e9a41f4b2ade0f3e4b87	86b4ab355a3ce5393cc7c6860927f194
225	SVC-TAX-002	DEPT-002	ea_portal	\N	other	4	5	3	4	5	\N	f	2025-10-30 04:26:08.289113	4524e15338608f27a6d377ded035a4c3	c2266c04f632edb24ffd38ff3ba6334b
226	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	4	3	4	3	5	Excellent service, very satisfied	f	2025-09-11 06:26:08.289113	e0cbb29b69b2c97711881f795fc6754b	2cc1dd3193ef645588da653b42e09ada
227	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	4	3	5	3	\N	t	2025-10-01 10:26:08.289113	5fae7b77e2da12e0147d974491d44417	543efc4c31da3112d2857c48a07c4320
228	SVC-TAX-002	DEPT-002	ea_portal	\N	government	3	5	2	3	4	System was easy to use	t	2025-08-13 06:26:08.289113	2368b791bca1b06f78379d1450bb98ce	cfa751d11fd5c6d285749c1bad1b7808
229	SVC-TAX-002	DEPT-002	ea_portal	\N	business	4	4	2	4	5	System was easy to use	f	2025-09-27 07:26:08.289113	8c886d52cd13adb68729a056eaaf0909	4d541339311e8b9b81f48dbfd97f084e
230	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	2	4	3	Would recommend this service	f	2025-09-13 12:26:08.289113	4f69d3e20e6376ee6f5ee689e7b19b1f	3f8eb4f7b542955fe44f9bd7ff6b5c2c
231	SVC-TAX-003	DEPT-002	ea_portal	\N	government	4	3	3	3	5	\N	f	2025-10-15 16:26:08.289113	fe20484d72bcffe5477a32db379ecc9b	5d160f4c764fc54869d15d7e42abed81
232	SVC-TAX-003	DEPT-002	ea_portal	\N	other	5	3	3	4	4	Process needs improvement	f	2025-09-12 09:26:08.289113	94597de6f36813346dbecfb95cae8b02	52408d687ae3bbab937a0ebc93bacbc9
233	SVC-TAX-003	DEPT-002	ea_portal	\N	government	4	4	2	5	5	\N	f	2025-08-25 01:26:08.289113	98d63cb7f7e325ba67a72986ae371a77	220a9bea7af15ca75b4fa56f3125c580
234	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	5	5	3	4	5	\N	t	2025-11-02 14:26:08.289113	510bef67d0c064483e9801f9b9f7a90a	3c8ba02a15cc7e850382da44a04a1d68
235	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	5	5	4	3	4	\N	f	2025-08-11 04:26:08.289113	59fbe5eb8ceb28cae2f46f664251e6a4	ce2b04d66d8ba622c4f64073362bf501
236	SVC-TAX-003	DEPT-002	ea_portal	\N	other	4	5	3	5	3	Documentation requirements unclear	f	2025-10-21 03:26:08.289113	cec1aacee10a03e80f61a2078a6f38d7	fe341de2974c98beb0cb3b6a17ce5024
237	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	3	5	2	3	4	Information was not clear	f	2025-10-15 08:26:08.289113	bd8380a22d961bb8a4efa8aaadc39fb0	cff63d34ef4b24ab1b2d522e2184b675
238	SVC-TAX-003	DEPT-002	ea_portal	\N	government	3	5	2	3	3	\N	f	2025-10-31 19:26:08.289113	e24533426edacad8eee489cd10f253a2	82571f372fe3f2dfb3023274088daff9
239	SVC-TAX-003	DEPT-002	ea_portal	\N	other	5	3	2	3	3	\N	f	2025-08-27 03:26:08.289113	d99b19aae54fa000564e6ad566aa1e3e	a25bf253b8fad8771a81c70e9b51d840
240	SVC-TAX-003	DEPT-002	ea_portal	\N	citizen	3	4	3	4	3	Staff were helpful and professional	f	2025-09-28 12:26:08.289113	066ea9f8beaf6fbeaebba82ba56a9941	3634cd6d5f0d8c7ecb395959074225f4
241	SVC-TAX-003	DEPT-002	ea_portal	\N	government	4	4	3	5	5	\N	f	2025-09-19 14:26:08.289113	cfd88232644b4c683fceafc42f4d7e94	8b0a54837768cb0eabc2f7ff4da51622
242	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	3	4	3	3	3	\N	f	2025-10-31 12:26:08.289113	a355712b473971f2ff9080b28da7c0ba	0ffaacc58988223f07ca96d9dd66594f
243	SVC-TAX-003	DEPT-002	ea_portal	\N	citizen	4	5	2	3	5	\N	f	2025-08-21 12:26:08.289113	6037f93e3beaa7be59873bc2bbaef604	d60912abe2aee39735814b28c6fe9358
244	SVC-TAX-003	DEPT-002	ea_portal	\N	government	4	4	4	5	3	Online portal works well	f	2025-09-08 03:26:08.289113	b856e9d87499a1d75e9ed484e0f37dc7	f98dc6b0b5d1f0c5c036102c24663633
245	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	3	5	3	4	4	Process was straightforward and efficient	f	2025-10-30 10:26:08.289113	42b7c0bdf8cd659f03254ec8f23c443e	269c1a7debd201bbb8b463d2b370268c
246	SVC-TAX-003	DEPT-002	ea_portal	\N	citizen	3	5	4	4	4	\N	f	2025-11-04 21:26:08.289113	af015ffc3cfaf6273297451d95a88e25	384bc57d0acfb0fdd9b6d350127b1db8
247	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	5	3	3	4	4	Waiting time was reasonable	t	2025-09-08 14:26:08.289113	8cba8aa2e4780978795705f0ad975d33	7e67cec51492ff8359607dfa8be8283a
248	SVC-TAX-003	DEPT-002	ea_portal	\N	other	5	3	2	5	5	Would recommend this service	f	2025-09-09 14:26:08.289113	121ee9c5ca41ea5b49437135b4617cc1	c6eb6e6e6126fc98cde6d3092d6e6dba
249	SVC-TAX-003	DEPT-002	ea_portal	\N	business	3	5	4	5	4	\N	f	2025-10-06 23:26:08.289113	c4066a57cfd2bcdc34bab81e6324585e	b876b2cc50dcd0ec68c8baf641596c1a
250	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	3	3	2	5	5	\N	f	2025-11-07 16:26:08.289113	3e1e6617edaae3395d4d9e64b7241ea4	d483dfb198ba244f434cad810c71a18f
251	SVC-TAX-003	DEPT-002	ea_portal	\N	business	4	4	4	5	4	\N	f	2025-10-18 21:26:08.289113	9129f3c59427eabbfd4212f34136ff64	750c057d93c2f0f2aefd8c45d2d79547
252	SVC-TAX-003	DEPT-002	ea_portal	\N	government	5	3	3	5	4	Service exceeded expectations	f	2025-08-29 17:26:08.289113	ff36a580480bda69c0e11d63ed411a1d	407130efd00a3625c3b0f90193da5cb6
253	SVC-TAX-003	DEPT-002	ea_portal	\N	other	3	3	2	5	4	Online portal works well	f	2025-09-17 00:26:08.289113	22bf48e01910345f65ed315fb65e203c	f49809e7260afc6537e338ae544c2890
254	SVC-TAX-003	DEPT-002	ea_portal	\N	other	5	4	2	3	3	System had technical issues	f	2025-10-25 22:26:08.289113	918cc1e87842df3d65979aa216e14d56	a2f1416a4c03db2e859b0eca8b59b81d
255	SVC-TAX-003	DEPT-002	ea_portal	\N	citizen	4	5	4	5	4	\N	f	2025-08-18 00:26:08.289113	454d1d6d534538cfa9edaea49969f173	08b0e5518831c5f0eee6de2e23996c8a
256	SVC-TAX-003	DEPT-002	ea_portal	\N	citizen	5	4	4	4	4	\N	f	2025-10-16 00:26:08.289113	25c3a6b878709ba167205d43462fb320	148a658f903a969ba9dadf9f07934243
257	SVC-TAX-003	DEPT-002	ea_portal	\N	business	3	5	2	5	5	\N	f	2025-08-28 03:26:08.289113	f6c58ae2b8b98dae1458fbe6d56d5444	277ae74bc10a8a7e3c7e8d662b8c16c5
258	SVC-TAX-003	DEPT-002	ea_portal	\N	government	5	3	4	3	3	Waiting time was reasonable	f	2025-08-25 13:26:08.289113	a16bd34b89938ac05cf1111b416ce806	2d73a2bec4ff8aeddca403f4bb7ff1ff
259	SVC-TAX-003	DEPT-002	ea_portal	\N	citizen	4	3	2	3	4	\N	f	2025-09-07 19:26:08.289113	a27d95f3d8d4b3fde523f4745d7e0d0a	126f5a8458e643efc9dbbf3aa431ba7f
260	SVC-TAX-003	DEPT-002	ea_portal	\N	government	3	5	2	3	4	\N	f	2025-09-28 15:26:08.289113	d383de5dc9116fff6443261621442257	ccc2daced677e7b6ff61d72cf9b217da
261	SVC-TAX-003	DEPT-002	ea_portal	\N	government	5	4	4	4	4	\N	f	2025-09-07 15:26:08.289113	a78f833a20c29372dfc55d4c7b323aef	80d5418953fde6cbd1424f905adac1b9
262	SVC-TAX-003	DEPT-002	ea_portal	\N	other	3	5	2	3	4	\N	f	2025-08-19 19:26:08.289113	3df29429a9d374b1ebbe9138a37439f3	f623d2ca14dfdb774bfc8a02723cd4a0
263	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	5	3	2	4	5	Excellent service, very satisfied	f	2025-10-04 02:26:08.289113	ba7dad167f37f7c764b33acd824c1b7b	0ad99666ef50e1baf8614b09adbb9f2a
264	SVC-TAX-003	DEPT-002	ea_portal	\N	business	4	4	2	3	5	Waiting time was reasonable	f	2025-09-24 03:26:08.289113	e798b36e6c255549a2a50d9c9c98b100	dd21346fb0c17dacbd5aa6dfd3ec9b2f
265	SVC-TAX-003	DEPT-002	ea_portal	\N	government	4	4	2	5	4	\N	f	2025-09-14 05:26:08.289113	577176c39a7f728ecf92dbc9bde2a9e2	bc0c0f5d6bdab2824f8e8e2a8690928b
266	SVC-TAX-003	DEPT-002	ea_portal	\N	government	4	4	2	3	3	Forms were confusing	f	2025-08-11 22:26:08.289113	466cb83abbd3c7b70dc7b2699eaee3a6	65c8ed612fb308ec464cba7ba24bcf3a
267	SVC-TAX-003	DEPT-002	ea_portal	\N	business	4	3	2	4	5	Staff were helpful and professional	f	2025-08-17 23:26:08.289113	7de522c3d7e2ca4f2e130147ab053c21	6e14470699d9fc9a1a8aa8947c302f9c
268	SVC-TAX-003	DEPT-002	ea_portal	\N	government	3	3	3	5	4	Online portal works well	f	2025-08-20 17:26:08.289113	ae163124f93885c1270fee85496ac1a7	5dc62dc6ef8a3fa19473f04df2a219f5
269	SVC-TAX-003	DEPT-002	ea_portal	\N	government	5	3	2	3	3	\N	f	2025-09-09 03:26:08.289113	261acfe54144cd192a8f061294613a33	d16ab23651a41560ed2c4f917a9bae59
270	SVC-TAX-003	DEPT-002	ea_portal	\N	other	3	5	3	5	3	Excellent service, very satisfied	t	2025-09-03 03:26:08.289113	31a04adf3e2970614e95b42e1c50d06d	0443cf56171bec8aba377503389e2209
271	SVC-TAX-003	DEPT-002	ea_portal	\N	government	5	3	3	5	5	\N	f	2025-11-07 20:26:08.289113	c8decfd2d7c64aa9555b6f1a5fa5d131	fa3fa2db70068f19dd5734dacdd8c98a
272	SVC-TAX-003	DEPT-002	ea_portal	\N	citizen	5	3	2	5	3	Excellent service, very satisfied	f	2025-08-28 13:26:08.289113	c04a0df5026912d2fc18a39f43db5f6b	b8a052325f120ccca7997268e1cbe6db
273	SVC-TAX-003	DEPT-002	ea_portal	\N	business	5	4	2	5	5	Online portal works well	f	2025-09-26 23:26:08.289113	b1540928d15d931a565195b7efa326b3	db83d085aec0ab7a97b891bff56bf26a
274	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	4	4	2	3	4	\N	f	2025-09-24 13:26:08.289113	a6d1e0aa9921e6b3a25f1f748539ced9	cc586dd8e89af6720b8d7a0ae89a2900
275	SVC-TAX-003	DEPT-002	ea_portal	\N	visitor	5	3	2	4	3	\N	f	2025-10-27 12:26:08.289113	c1b96e3ed601c15e280235e18cad15f7	95777564db99859e29e34179f824ac3d
276	SVC-TAX-003	DEPT-002	ea_portal	\N	government	5	5	4	3	3	\N	f	2025-10-18 18:26:08.289113	62cf5edf97c5c2eb53d5c1a3a011627d	86b4ab355a3ce5393cc7c6860927f194
277	SVC-SOC-001	MIN-007	ea_portal	\N	business	5	5	3	4	5	\N	f	2025-10-10 13:26:08.289113	32bf84f9ac2c7463ce179fabe05d9f37	5d160f4c764fc54869d15d7e42abed81
278	SVC-SOC-001	MIN-007	ea_portal	\N	citizen	4	3	4	3	5	\N	f	2025-09-13 23:26:08.289113	b08b03f7f63bbd1ef110f5e16453f09b	52408d687ae3bbab937a0ebc93bacbc9
279	SVC-SOC-001	MIN-007	ea_portal	\N	citizen	4	5	2	5	3	Waiting time was reasonable	f	2025-10-27 10:26:08.289113	4adc609b6b8b082a7bc77cfa199b61c7	220a9bea7af15ca75b4fa56f3125c580
280	SVC-SOC-001	MIN-007	ea_portal	\N	business	3	3	2	4	5	\N	f	2025-09-16 06:26:08.289113	67096a2b6ff7a6ef5de404fa2eb4cae6	3c8ba02a15cc7e850382da44a04a1d68
281	SVC-SOC-001	MIN-007	ea_portal	\N	visitor	3	4	2	4	5	Long wait times experienced	f	2025-09-03 18:26:08.289113	e626cfbb59f95a7965f5178a50ef113d	ce2b04d66d8ba622c4f64073362bf501
282	SVC-SOC-001	MIN-007	ea_portal	\N	business	3	5	4	3	5	Clear instructions provided	f	2025-09-05 22:26:08.289113	49b031b98e059f9f9d7b6e66ee951953	fe341de2974c98beb0cb3b6a17ce5024
283	SVC-SOC-001	MIN-007	ea_portal	\N	government	4	4	3	3	4	\N	f	2025-09-23 10:26:08.289113	6ca6f4998c88261b35a33da6184c32fd	cff63d34ef4b24ab1b2d522e2184b675
284	SVC-SOC-001	MIN-007	ea_portal	\N	visitor	3	4	2	3	3	\N	f	2025-08-28 21:26:08.289113	ad4197069efdd82cfe75ea6e7b638879	82571f372fe3f2dfb3023274088daff9
285	SVC-SOC-001	MIN-007	ea_portal	\N	visitor	5	5	4	5	4	\N	f	2025-11-01 18:26:08.289113	7c739dac51b10c0f0e5401c521ac8bd8	a25bf253b8fad8771a81c70e9b51d840
286	SVC-SOC-001	MIN-007	ea_portal	\N	business	3	4	2	5	4	Forms were confusing	f	2025-08-11 23:26:08.289113	17541a070965f99edffaa3a149b96bfb	3634cd6d5f0d8c7ecb395959074225f4
287	SVC-SOC-001	MIN-007	ea_portal	\N	visitor	5	3	4	3	3	\N	f	2025-11-03 23:26:08.289113	50d5e9b14a7e1eddaf2e7fb26f7ed13c	8b0a54837768cb0eabc2f7ff4da51622
288	SVC-SOC-001	MIN-007	ea_portal	\N	visitor	3	3	3	3	4	\N	f	2025-10-08 14:26:08.289113	0e0a6bab37b6acd3f3b9d940c6c11add	0ffaacc58988223f07ca96d9dd66594f
289	SVC-SOC-001	MIN-007	ea_portal	\N	visitor	3	4	3	5	5	\N	f	2025-08-12 18:26:08.289113	5e975fd709d5027ca204817f72f6b169	d60912abe2aee39735814b28c6fe9358
290	SVC-SOC-001	MIN-007	ea_portal	\N	citizen	3	5	3	4	5	Long wait times experienced	f	2025-09-25 06:26:08.289113	81bd6b23c7765f22c07406ee5523ba7c	f98dc6b0b5d1f0c5c036102c24663633
291	SVC-SOC-001	MIN-007	ea_portal	\N	business	3	4	4	4	4	\N	f	2025-10-17 18:26:08.289113	edc4fb886f2b07b3548e4da6c42d7836	269c1a7debd201bbb8b463d2b370268c
292	SVC-SOC-001	MIN-007	ea_portal	\N	business	4	5	3	5	4	\N	f	2025-10-19 10:26:08.289113	53cfa539117c32866e93e0fec2f7c7ff	384bc57d0acfb0fdd9b6d350127b1db8
293	SVC-SOC-001	MIN-007	ea_portal	\N	other	3	3	4	3	5	Forms were confusing	f	2025-08-13 22:26:08.289113	f656fc10be19fe6cbe2029a7123424c5	7e67cec51492ff8359607dfa8be8283a
294	SVC-SOC-001	MIN-007	ea_portal	\N	other	3	3	4	5	3	\N	f	2025-10-01 01:26:08.289113	0196caef6f0be3ad5e537cb4aeac89cb	c6eb6e6e6126fc98cde6d3092d6e6dba
295	SVC-SOC-001	MIN-007	ea_portal	\N	visitor	5	5	3	3	3	\N	f	2025-08-22 19:26:08.289113	8d75a120c018a5f321da2938f6d739f3	b876b2cc50dcd0ec68c8baf641596c1a
296	SVC-SOC-001	MIN-007	ea_portal	\N	business	5	3	3	3	5	Could be faster but overall good experience	f	2025-10-01 22:26:08.289113	f00a18cae55673b8b3d66f72a8e8502e	d483dfb198ba244f434cad810c71a18f
297	SVC-SOC-001	MIN-007	ea_portal	\N	business	3	5	2	5	3	\N	f	2025-09-11 03:26:08.289113	53bc4007a43bc947d83d0161e9e15216	750c057d93c2f0f2aefd8c45d2d79547
298	SVC-SOC-001	MIN-007	ea_portal	\N	business	5	4	3	4	5	Process was straightforward and efficient	f	2025-08-20 22:26:08.289113	b9125f5c69b0e6e90a09da6c7fcd3c31	407130efd00a3625c3b0f90193da5cb6
299	SVC-SOC-001	MIN-007	ea_portal	\N	government	5	4	3	5	5	\N	f	2025-11-02 01:26:08.289113	0ca538dfa736cf2ab9f94d126a29a420	f49809e7260afc6537e338ae544c2890
300	SVC-SOC-001	MIN-007	ea_portal	\N	citizen	5	3	2	4	3	\N	f	2025-08-19 03:26:08.289113	0f7097dd620060ba8e9178f0c6f0a37c	a2f1416a4c03db2e859b0eca8b59b81d
301	SVC-HOU-001	AGY-011	ea_portal	\N	business	3	4	4	3	5	System had technical issues	f	2025-09-13 22:26:08.289113	9dff1e56e9ed511cf8e9eb22c470aba7	5d160f4c764fc54869d15d7e42abed81
302	SVC-HOU-001	AGY-011	ea_portal	\N	visitor	5	5	2	4	4	\N	f	2025-10-28 00:26:08.289113	16772e9bf5f646de404aadcca1b36317	52408d687ae3bbab937a0ebc93bacbc9
303	SVC-HOU-001	AGY-011	ea_portal	\N	visitor	4	4	4	3	3	\N	f	2025-10-15 07:26:08.289113	43ef4c4862b507527afe9d48fbbae49a	220a9bea7af15ca75b4fa56f3125c580
304	SVC-HOU-001	AGY-011	ea_portal	\N	government	5	4	4	4	3	Documentation requirements unclear	f	2025-10-01 09:26:08.289113	62e45e4ffbf270a45315a42ed904752c	3c8ba02a15cc7e850382da44a04a1d68
305	SVC-HOU-001	AGY-011	ea_portal	\N	visitor	4	4	3	4	4	Information was not clear	f	2025-10-09 15:26:08.289113	2891b56086e8a2ec7fe1cbe17650ea58	ce2b04d66d8ba622c4f64073362bf501
306	SVC-HOU-001	AGY-011	ea_portal	\N	citizen	4	5	4	4	5	Service exceeded expectations	f	2025-09-23 04:26:08.289113	dbaac77382311d8b34b1cd6b99b3dc47	fe341de2974c98beb0cb3b6a17ce5024
307	SVC-HOU-001	AGY-011	ea_portal	\N	business	5	4	3	3	3	\N	f	2025-08-19 18:26:08.289113	9242a9917336733018401a8ac81ed5b4	cff63d34ef4b24ab1b2d522e2184b675
308	SVC-HOU-001	AGY-011	ea_portal	\N	other	5	5	2	5	5	\N	f	2025-10-16 08:26:08.289113	1dcb28db2ae62112a63e90cfb02b15b9	82571f372fe3f2dfb3023274088daff9
309	SVC-HOU-001	AGY-011	ea_portal	\N	government	4	3	3	4	5	Quick and efficient processing	f	2025-09-24 04:26:08.289113	7fabd4cb96ba548782d93c35a6102f4b	a25bf253b8fad8771a81c70e9b51d840
310	SVC-HOU-001	AGY-011	ea_portal	\N	business	4	3	3	5	5	Staff need more training	f	2025-08-30 00:26:08.289113	7dd9feeba28b9bae742b801b9daf29b9	3634cd6d5f0d8c7ecb395959074225f4
311	SVC-HOU-001	AGY-011	ea_portal	\N	government	3	5	4	4	4	\N	f	2025-11-01 13:26:08.289113	c035164ed2beef3b022fba7a49b2dfe0	8b0a54837768cb0eabc2f7ff4da51622
312	SVC-HOU-001	AGY-011	ea_portal	\N	other	5	3	2	5	4	\N	f	2025-08-22 09:26:08.289113	f0185257492ada6d14b9c72f769e2769	0ffaacc58988223f07ca96d9dd66594f
313	SVC-HOU-001	AGY-011	ea_portal	\N	government	5	3	4	4	4	\N	f	2025-08-28 00:26:08.289113	9043aa00813e43085f01022a83abfaf8	d60912abe2aee39735814b28c6fe9358
314	SVC-HOU-001	AGY-011	ea_portal	\N	visitor	5	5	4	3	3	\N	f	2025-10-19 20:26:08.289113	d4b33469b4ad647c46d908d007ee96dc	f98dc6b0b5d1f0c5c036102c24663633
315	SVC-HOU-001	AGY-011	ea_portal	\N	visitor	5	4	3	3	3	\N	f	2025-09-13 09:26:08.289113	9940e4a7109ad974742a8ccb06e41454	269c1a7debd201bbb8b463d2b370268c
316	SVC-HOU-001	AGY-011	ea_portal	\N	citizen	4	3	2	5	3	\N	f	2025-10-03 01:26:08.289113	d8037b136897697086d7ac3cb3b2d5d9	384bc57d0acfb0fdd9b6d350127b1db8
317	SVC-HOU-001	AGY-011	ea_portal	\N	citizen	5	3	3	5	3	\N	f	2025-10-21 14:26:08.289113	235944bf41a59f5e60868b5592b65145	7e67cec51492ff8359607dfa8be8283a
318	SVC-HOU-001	AGY-011	ea_portal	\N	government	5	3	4	5	4	\N	f	2025-08-18 16:26:08.289113	4b66f4577ba0d5f6294d559704784ae2	c6eb6e6e6126fc98cde6d3092d6e6dba
319	SVC-HOU-001	AGY-011	ea_portal	\N	citizen	4	3	3	5	4	Process was straightforward and efficient	f	2025-11-08 00:26:08.289113	53c7e962ce529c3996e295d1aa328eaa	b876b2cc50dcd0ec68c8baf641596c1a
320	SVC-NIS-001	AGY-006	ea_portal	\N	other	4	3	2	3	4	Waiting time was reasonable	f	2025-09-03 19:26:08.289113	4f3b27871d71de3204eb67bbb97c7536	5d160f4c764fc54869d15d7e42abed81
321	SVC-NIS-001	AGY-006	ea_portal	\N	government	4	4	2	4	3	Waiting time was reasonable	f	2025-10-25 16:26:08.289113	a99e2c8c602a917e35ce89fc6d2c2449	52408d687ae3bbab937a0ebc93bacbc9
322	SVC-NIS-001	AGY-006	ea_portal	\N	other	5	3	4	3	3	Quick and efficient processing	f	2025-09-13 19:26:08.289113	e166d90f55d497e856e6705d3ac8af5e	220a9bea7af15ca75b4fa56f3125c580
323	SVC-NIS-001	AGY-006	ea_portal	\N	other	4	5	4	5	3	Clear instructions provided	f	2025-09-16 20:26:08.289113	bc22d33fb51b56befb7368f9ae117534	3c8ba02a15cc7e850382da44a04a1d68
324	SVC-NIS-001	AGY-006	ea_portal	\N	citizen	4	4	3	4	5	\N	f	2025-09-06 02:26:08.289113	868072f46715dfc8a24a7cc7b2e02b70	ce2b04d66d8ba622c4f64073362bf501
325	SVC-NIS-001	AGY-006	ea_portal	\N	business	5	4	4	3	4	\N	f	2025-10-06 18:26:08.289113	b3ff1203c19bf8735faf0de951443afc	fe341de2974c98beb0cb3b6a17ce5024
326	SVC-NIS-001	AGY-006	ea_portal	\N	other	4	4	4	5	5	\N	f	2025-08-19 16:26:08.289113	67adb91eac8a0e9436b621f57cdf8200	cff63d34ef4b24ab1b2d522e2184b675
327	SVC-NIS-001	AGY-006	ea_portal	\N	government	4	4	4	4	5	Would recommend this service	f	2025-09-21 13:26:08.289113	047ccc086edf4c7c140d8f407742e9df	82571f372fe3f2dfb3023274088daff9
328	SVC-NIS-001	AGY-006	ea_portal	\N	business	3	3	3	4	3	\N	f	2025-08-17 20:26:08.289113	1a8ef368e5b750adb4654e8cadced202	a25bf253b8fad8771a81c70e9b51d840
329	SVC-NIS-001	AGY-006	ea_portal	\N	citizen	4	5	3	3	4	\N	f	2025-11-04 23:26:08.289113	93ef5f31a12ca883429031f324a2a3da	3634cd6d5f0d8c7ecb395959074225f4
330	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	4	4	5	3	Online portal works well	f	2025-09-19 03:26:08.289113	f74556edc0adf796c68b84ffb14385cd	5d160f4c764fc54869d15d7e42abed81
331	SVC-IMM-001	DEPT-001	ea_portal	\N	business	4	5	4	4	3	\N	f	2025-10-05 08:26:08.289113	a4548d873ca7596d1ccbb806365574cb	52408d687ae3bbab937a0ebc93bacbc9
332	SVC-IMM-001	DEPT-001	ea_portal	\N	government	4	4	2	5	4	Staff need more training	f	2025-08-11 04:26:08.289113	268e32b8ff1d4c4a93a2e15ee0e98cc1	220a9bea7af15ca75b4fa56f3125c580
333	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	4	4	2	3	5	Information was not clear	f	2025-10-02 18:26:08.289113	c924fe5769ed2366c2e41885710b2bc2	3c8ba02a15cc7e850382da44a04a1d68
334	SVC-IMM-001	DEPT-001	ea_portal	\N	business	3	3	2	5	3	Process needs improvement	f	2025-09-24 13:26:08.289113	1ce5581e7c7be90c8203802d8ad2f084	ce2b04d66d8ba622c4f64073362bf501
335	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	4	4	4	3	\N	f	2025-08-22 20:26:08.289113	5c35a036721b2e204e324dc1fe51f6e1	fe341de2974c98beb0cb3b6a17ce5024
336	SVC-IMM-001	DEPT-001	ea_portal	\N	government	4	3	4	3	5	\N	f	2025-11-06 20:26:08.289113	ede4bfd8de0fcb9bf451920dd8756141	cff63d34ef4b24ab1b2d522e2184b675
337	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	4	4	3	5	\N	f	2025-10-02 21:26:08.289113	587d173f943badd0056a3c0a0c3b2c44	82571f372fe3f2dfb3023274088daff9
338	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	4	3	4	3	4	\N	f	2025-11-01 21:26:08.289113	d43df498f946a7510554ac8ec5db272c	a25bf253b8fad8771a81c70e9b51d840
339	SVC-IMM-001	DEPT-001	ea_portal	\N	other	3	3	2	4	4	\N	t	2025-10-09 14:26:08.289113	bda45541b9e9bfa8e1cf0be0d582f483	3634cd6d5f0d8c7ecb395959074225f4
340	SVC-IMM-001	DEPT-001	ea_portal	\N	business	4	4	3	4	4	\N	f	2025-10-03 14:26:08.289113	ed44a1e83ae18e5d2bda0d23de47cab1	8b0a54837768cb0eabc2f7ff4da51622
341	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	3	3	4	5	\N	f	2025-09-23 19:26:08.289113	ed0d1dd9c31285e9fe82205990d77027	0ffaacc58988223f07ca96d9dd66594f
342	SVC-IMM-001	DEPT-001	ea_portal	\N	business	3	3	3	3	3	\N	f	2025-10-02 16:26:08.289113	487492c922c1cd5bbd628c0177ce0079	d60912abe2aee39735814b28c6fe9358
343	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	3	3	4	5	Information was not clear	f	2025-10-13 01:26:08.289113	b62728327ae6ccca5e87ac176d10449f	f98dc6b0b5d1f0c5c036102c24663633
344	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-09-06 14:26:08.289113	b8501579198ee1ac39cf454f9a04b323	269c1a7debd201bbb8b463d2b370268c
345	SVC-IMM-001	DEPT-001	ea_portal	\N	business	3	4	4	3	4	\N	f	2025-09-15 09:26:08.289113	a36875f3aa90694d77fd6e96ad6af467	384bc57d0acfb0fdd9b6d350127b1db8
346	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	3	4	3	3	\N	f	2025-09-22 22:26:08.289113	f53ed4e40591fd7e5067d3c77261f47b	7e67cec51492ff8359607dfa8be8283a
347	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	4	3	4	4	\N	f	2025-08-22 14:26:08.289113	f498c8e1a035674ddce0411460a0c3b4	c6eb6e6e6126fc98cde6d3092d6e6dba
348	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	3	3	3	4	4	Could be faster but overall good experience	f	2025-11-06 09:26:08.289113	8f04d06c57451b83bcf5ef4c24ce82fe	b876b2cc50dcd0ec68c8baf641596c1a
349	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	4	5	2	4	4	\N	f	2025-08-26 12:26:08.289113	484b4a219509251ae269499ea5ac4c90	d483dfb198ba244f434cad810c71a18f
350	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	5	2	4	3	Staff need more training	f	2025-09-23 08:26:08.289113	383981381a523d54778647ec561626f9	750c057d93c2f0f2aefd8c45d2d79547
351	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	4	3	3	4	4	Process needs improvement	f	2025-09-11 12:26:08.289113	b93fc1f414446d2e40c053263ab00445	407130efd00a3625c3b0f90193da5cb6
352	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	2	3	4	\N	f	2025-09-24 18:26:08.289113	4f197d49efa8072424d3b3a2b35909b9	f49809e7260afc6537e338ae544c2890
353	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	3	3	3	3	\N	f	2025-11-05 21:26:08.289113	63e27340c0a6e3e03c96304333864247	a2f1416a4c03db2e859b0eca8b59b81d
354	SVC-IMM-001	DEPT-001	ea_portal	\N	government	3	5	2	4	3	Excellent service, very satisfied	f	2025-08-14 01:26:08.289113	c91b03a71be195e0e7d7298afeff4760	08b0e5518831c5f0eee6de2e23996c8a
355	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	4	4	5	5	Could be faster but overall good experience	f	2025-08-28 21:26:08.289113	a7141ab278e9710fdd054a44d0467739	148a658f903a969ba9dadf9f07934243
356	SVC-IMM-001	DEPT-001	ea_portal	\N	other	4	3	4	3	4	System had technical issues	f	2025-08-20 06:26:08.289113	c027c5c44a0b1d5bcb3e6e7a21eeabc9	277ae74bc10a8a7e3c7e8d662b8c16c5
357	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	5	4	5	5	\N	f	2025-09-15 11:26:08.289113	c80ecd615a4ec65f18b8b10ed526a8ff	2d73a2bec4ff8aeddca403f4bb7ff1ff
358	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	3	5	3	3	5	Waiting time was reasonable	f	2025-09-28 02:26:08.289113	e2554212772f5acede7785986678dab7	126f5a8458e643efc9dbbf3aa431ba7f
359	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	4	3	5	5	\N	f	2025-10-22 00:26:08.289113	32451725655d740de874bf6695b7c6a4	ccc2daced677e7b6ff61d72cf9b217da
360	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	3	3	4	5	System had technical issues	f	2025-10-20 17:26:08.289113	f33d79bfbc5b161a64545c4d71b7c689	80d5418953fde6cbd1424f905adac1b9
361	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	4	3	4	4	\N	f	2025-09-03 15:26:08.289113	4655013c8e160e055e4494b32f854d82	f623d2ca14dfdb774bfc8a02723cd4a0
362	SVC-IMM-001	DEPT-001	ea_portal	\N	business	4	3	2	3	3	\N	f	2025-10-25 19:26:08.289113	aa3e216dfb2f08838f727ce2f47da278	0ad99666ef50e1baf8614b09adbb9f2a
363	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	4	3	5	3	\N	f	2025-11-05 00:26:08.289113	f3dcba9012df7c54c8d77f755e989976	dd21346fb0c17dacbd5aa6dfd3ec9b2f
364	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	3	4	4	5	Quick and efficient processing	f	2025-09-07 23:26:08.289113	596d279b68a68b53a899bb61cf81f014	bc0c0f5d6bdab2824f8e8e2a8690928b
365	SVC-IMM-001	DEPT-001	ea_portal	\N	other	3	4	4	4	3	\N	t	2025-08-25 11:26:08.289113	75a20fdf341d6556a0573e3250868396	65c8ed612fb308ec464cba7ba24bcf3a
366	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	4	3	5	3	\N	f	2025-08-27 15:26:08.289113	1e2a182703031ddbd482782cdf967f43	6e14470699d9fc9a1a8aa8947c302f9c
367	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	3	4	5	3	\N	f	2025-08-31 03:26:08.289113	e17261303ef7411622f3b5b8b5c816ad	5dc62dc6ef8a3fa19473f04df2a219f5
368	SVC-IMM-001	DEPT-001	ea_portal	\N	other	4	3	2	4	3	System was easy to use	f	2025-11-02 10:26:08.289113	e46b948971403816ac011ece6726d48f	d16ab23651a41560ed2c4f917a9bae59
369	SVC-IMM-001	DEPT-001	ea_portal	\N	business	4	3	2	3	5	\N	f	2025-09-24 14:26:08.289113	551b9b629b89db92a80b7e9f9420bff0	0443cf56171bec8aba377503389e2209
370	SVC-IMM-001	DEPT-001	ea_portal	\N	business	4	5	2	5	5	\N	f	2025-09-29 17:26:08.289113	5692d44794c353605b2d5f37ff293e49	fa3fa2db70068f19dd5734dacdd8c98a
371	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	4	2	5	5	\N	f	2025-09-25 06:26:08.289113	5b44f4db164e0e609ae0e42399ecd84e	b8a052325f120ccca7997268e1cbe6db
372	SVC-IMM-001	DEPT-001	ea_portal	\N	other	3	4	3	4	4	Staff need more training	f	2025-10-19 12:26:08.289113	b89ab46f6cba229d883942eefdb8931b	db83d085aec0ab7a97b891bff56bf26a
373	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	2	3	5	\N	f	2025-10-02 06:26:08.289113	926587d5644e33018981efc4bfc1cc0a	cc586dd8e89af6720b8d7a0ae89a2900
374	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	3	4	5	4	Forms were confusing	f	2025-08-29 13:26:08.289113	604c5275a5cbce947544384965477e4f	95777564db99859e29e34179f824ac3d
375	SVC-IMM-001	DEPT-001	ea_portal	\N	other	3	5	2	4	5	\N	f	2025-09-02 05:26:08.289113	be9add35a3e7690020c5057b39cfa900	86b4ab355a3ce5393cc7c6860927f194
376	SVC-IMM-001	DEPT-001	ea_portal	\N	government	4	4	2	5	4	\N	f	2025-10-12 11:26:08.289113	46ca9f4c2fed388490765026e9d9d4cc	c2266c04f632edb24ffd38ff3ba6334b
377	SVC-IMM-001	DEPT-001	ea_portal	\N	business	4	4	2	4	5	Would recommend this service	f	2025-08-28 04:26:08.289113	dba3f802d26f34538c7d958482acc8dd	2cc1dd3193ef645588da653b42e09ada
378	SVC-IMM-002	DEPT-001	ea_portal	\N	other	3	3	2	3	3	Online portal works well	f	2025-11-07 14:26:08.289113	d620aebdea405373212bed544114f733	5d160f4c764fc54869d15d7e42abed81
379	SVC-IMM-002	DEPT-001	ea_portal	\N	visitor	3	3	2	3	3	\N	f	2025-10-31 08:26:08.289113	f089c0cb7e8c26f850a36b223c50327b	52408d687ae3bbab937a0ebc93bacbc9
380	SVC-IMM-002	DEPT-001	ea_portal	\N	business	3	3	3	5	3	\N	f	2025-09-05 21:26:08.289113	9d8d991a87e870d0a92ead59f134c10d	220a9bea7af15ca75b4fa56f3125c580
381	SVC-IMM-002	DEPT-001	ea_portal	\N	visitor	5	3	4	3	3	\N	f	2025-10-15 18:26:08.289113	72049b6f67433aa036660009c3ed1dd3	3c8ba02a15cc7e850382da44a04a1d68
382	SVC-IMM-002	DEPT-001	ea_portal	\N	business	4	3	3	4	4	Process needs improvement	f	2025-09-24 14:26:08.289113	998ac7596235bdc0427b5c62b41d9c8d	ce2b04d66d8ba622c4f64073362bf501
383	SVC-IMM-002	DEPT-001	ea_portal	\N	government	5	5	2	4	4	Process needs improvement	f	2025-09-04 16:26:08.289113	9e5f43669118a6825d4172650c765cd5	fe341de2974c98beb0cb3b6a17ce5024
384	SVC-IMM-002	DEPT-001	ea_portal	\N	business	3	4	2	4	3	\N	t	2025-09-26 10:26:08.289113	42b579508bd041a1b3294071799b4dc7	cff63d34ef4b24ab1b2d522e2184b675
385	SVC-IMM-002	DEPT-001	ea_portal	\N	visitor	4	3	2	3	3	\N	f	2025-08-19 06:26:08.289113	4c7170aa8c789e2bc493f1867743ecb8	82571f372fe3f2dfb3023274088daff9
386	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	3	5	4	4	4	\N	f	2025-08-16 06:26:08.289113	3c6f4f3e6d983a1259dc16971c24146e	a25bf253b8fad8771a81c70e9b51d840
387	SVC-IMM-002	DEPT-001	ea_portal	\N	business	4	4	4	5	5	\N	f	2025-10-18 05:26:08.289113	96bda6a9bba80d3c9bf997f031f014af	3634cd6d5f0d8c7ecb395959074225f4
388	SVC-IMM-002	DEPT-001	ea_portal	\N	business	4	3	2	4	3	Quick and efficient processing	f	2025-10-18 15:26:08.289113	bc1ee20172155355246de2dcc322e1af	8b0a54837768cb0eabc2f7ff4da51622
389	SVC-IMM-002	DEPT-001	ea_portal	\N	other	3	5	4	5	5	Quick and efficient processing	f	2025-10-19 02:26:08.289113	dc7b4e24f1742f72226a406c835cd9d2	0ffaacc58988223f07ca96d9dd66594f
390	SVC-IMM-002	DEPT-001	ea_portal	\N	visitor	4	5	3	4	3	\N	f	2025-10-02 12:26:08.289113	fa191da6a3144565c5d0872ff20b2044	d60912abe2aee39735814b28c6fe9358
391	SVC-IMM-002	DEPT-001	ea_portal	\N	government	3	4	3	3	5	\N	f	2025-10-05 15:26:08.289113	54b489836b82a99c0c533d06b2c24e1d	f98dc6b0b5d1f0c5c036102c24663633
392	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	5	5	3	4	4	System had technical issues	f	2025-10-05 01:26:08.289113	8607db238f0544d04acf5c9eac4671fd	269c1a7debd201bbb8b463d2b370268c
393	SVC-IMM-002	DEPT-001	ea_portal	\N	government	3	3	2	4	4	Service exceeded expectations	f	2025-10-18 23:26:08.289113	57c894c3869de756dfca735b6732ec55	384bc57d0acfb0fdd9b6d350127b1db8
394	SVC-IMM-002	DEPT-001	ea_portal	\N	government	4	3	3	3	3	\N	f	2025-10-20 18:26:08.289113	bad73a92ae7b7ab9a89a4329283b4d74	7e67cec51492ff8359607dfa8be8283a
395	SVC-IMM-002	DEPT-001	ea_portal	\N	other	5	3	4	5	5	\N	f	2025-11-06 23:26:08.289113	6e00ec6e278159bb094d9675e64cc57b	c6eb6e6e6126fc98cde6d3092d6e6dba
396	SVC-IMM-002	DEPT-001	ea_portal	\N	business	4	4	3	5	3	Long wait times experienced	f	2025-09-19 09:26:08.289113	d81b6339c3dc3e33024123b8b99bcf7e	b876b2cc50dcd0ec68c8baf641596c1a
397	SVC-IMM-002	DEPT-001	ea_portal	\N	government	5	4	2	4	4	\N	f	2025-10-08 04:26:08.289113	c6852f6ce382c9dad0b75f13f5e666b4	d483dfb198ba244f434cad810c71a18f
398	SVC-IMM-002	DEPT-001	ea_portal	\N	visitor	4	5	4	3	3	\N	f	2025-08-23 20:26:08.289113	5129b91575b617b7b2a246a3ff011a3e	750c057d93c2f0f2aefd8c45d2d79547
399	SVC-IMM-002	DEPT-001	ea_portal	\N	business	4	4	2	3	5	\N	f	2025-10-28 14:26:08.289113	71b25b410edebb3b13d49e89bdc18813	407130efd00a3625c3b0f90193da5cb6
400	SVC-IMM-002	DEPT-001	ea_portal	\N	visitor	3	3	2	3	5	\N	f	2025-09-10 23:26:08.289113	da512da69a2b183c8ec00e90674a2891	f49809e7260afc6537e338ae544c2890
401	SVC-IMM-002	DEPT-001	ea_portal	\N	government	4	4	4	4	3	\N	f	2025-10-02 01:26:08.289113	636428b1c94b4173b83132f86f18daae	a2f1416a4c03db2e859b0eca8b59b81d
402	SVC-IMM-002	DEPT-001	ea_portal	\N	visitor	3	3	3	4	3	\N	f	2025-09-06 07:26:08.289113	b91cade8eba61fc945e95202e342a8e2	08b0e5518831c5f0eee6de2e23996c8a
403	SVC-IMM-002	DEPT-001	ea_portal	\N	government	4	5	2	3	3	\N	f	2025-10-24 23:26:08.289113	cd1c9204783c02fce3238a9cffd95608	148a658f903a969ba9dadf9f07934243
404	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	5	5	2	4	4	\N	f	2025-11-07 07:26:08.289113	d9bffd77a8f5a8084e724e6287a69b06	277ae74bc10a8a7e3c7e8d662b8c16c5
405	SVC-IMM-002	DEPT-001	ea_portal	\N	visitor	4	4	4	5	5	Quick and efficient processing	f	2025-10-29 04:26:08.289113	4a62773247629d6c9c36f41a3fb9c239	2d73a2bec4ff8aeddca403f4bb7ff1ff
406	SVC-IMM-002	DEPT-001	ea_portal	\N	government	4	3	4	3	5	\N	f	2025-08-22 00:26:08.289113	f4e62c76f47a1da856527fe77a27de7a	126f5a8458e643efc9dbbf3aa431ba7f
407	SVC-IMM-002	DEPT-001	ea_portal	\N	business	3	3	3	4	3	\N	f	2025-08-24 05:26:08.289113	1d2c552388bd1607762b8b09d40c6c53	ccc2daced677e7b6ff61d72cf9b217da
408	SVC-IMM-002	DEPT-001	ea_portal	\N	other	4	5	2	4	3	Staff were helpful and professional	f	2025-08-30 03:26:08.289113	ce195d39564c8e24314a47a558ad372c	80d5418953fde6cbd1424f905adac1b9
409	SVC-IMM-002	DEPT-001	ea_portal	\N	other	4	3	3	3	4	Online portal works well	f	2025-10-25 01:26:08.289113	5f7aa6fa290aee5d5a9a662c1edd8179	f623d2ca14dfdb774bfc8a02723cd4a0
410	SVC-IMM-002	DEPT-001	ea_portal	\N	other	3	4	4	4	4	\N	f	2025-09-21 06:26:08.289113	46d10815430a7499b25dea9cdbd081e6	0ad99666ef50e1baf8614b09adbb9f2a
411	SVC-IMM-002	DEPT-001	ea_portal	\N	government	3	3	4	4	5	\N	f	2025-08-12 02:26:08.289113	86cb85158204c5e090f9ab4f3c427c97	dd21346fb0c17dacbd5aa6dfd3ec9b2f
412	SVC-IMM-002	DEPT-001	ea_portal	\N	business	4	3	2	3	4	\N	f	2025-10-10 05:26:08.289113	2a28309d409c6da71337280e39ff42e1	bc0c0f5d6bdab2824f8e8e2a8690928b
413	SVC-IMM-002	DEPT-001	ea_portal	\N	business	4	3	2	4	3	Forms were confusing	f	2025-10-28 18:26:08.289113	ec2a5fe891335f43ac6d3e5a19153f36	65c8ed612fb308ec464cba7ba24bcf3a
414	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	5	4	2	4	5	\N	t	2025-09-11 23:26:08.289113	0accc8641e8118e97aafe17835b84a42	6e14470699d9fc9a1a8aa8947c302f9c
415	SVC-IMM-002	DEPT-001	ea_portal	\N	other	4	5	3	4	3	System was easy to use	f	2025-09-08 13:26:08.289113	6ce843e672aefa1259a55f7493bc594a	5dc62dc6ef8a3fa19473f04df2a219f5
416	SVC-IMM-002	DEPT-001	ea_portal	\N	other	3	5	4	3	5	Excellent service, very satisfied	f	2025-08-17 16:26:08.289113	2b99713f730fded8e843eb746654dcca	d16ab23651a41560ed2c4f917a9bae59
417	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	3	3	3	5	4	Staff need more training	f	2025-09-11 14:26:08.289113	bc30ea0e4fb95bacdeb009a4ec670047	0443cf56171bec8aba377503389e2209
418	SVC-IMM-002	DEPT-001	ea_portal	\N	government	3	5	2	4	3	\N	f	2025-10-31 05:26:08.289113	05ab5c171a65b1973def4da9104aa57b	fa3fa2db70068f19dd5734dacdd8c98a
419	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	5	4	4	3	5	\N	f	2025-08-28 16:26:08.289113	a5a4a729c5f0aa19fd068ae1b6a31a6e	b8a052325f120ccca7997268e1cbe6db
420	SVC-IMM-003	DEPT-001	ea_portal	\N	government	5	3	3	5	4	\N	f	2025-10-11 01:26:08.289113	dd2b33d6d6d8c5e8ee922f1540335c7d	5d160f4c764fc54869d15d7e42abed81
421	SVC-IMM-003	DEPT-001	ea_portal	\N	government	4	4	2	3	4	Process was straightforward and efficient	f	2025-09-11 11:26:08.289113	ab6966d73db8b6c9c71acfe0594795d4	52408d687ae3bbab937a0ebc93bacbc9
422	SVC-IMM-003	DEPT-001	ea_portal	\N	citizen	4	5	3	3	5	Online portal works well	f	2025-10-14 17:26:08.289113	ea0f091c62099e32893137095a68c7d3	220a9bea7af15ca75b4fa56f3125c580
423	SVC-IMM-003	DEPT-001	ea_portal	\N	citizen	5	4	3	3	3	Waiting time was reasonable	f	2025-09-17 06:26:08.289113	af0c01cbdca8d1ee16e29d1163127d6f	3c8ba02a15cc7e850382da44a04a1d68
424	SVC-IMM-003	DEPT-001	ea_portal	\N	other	5	5	3	5	4	\N	f	2025-10-11 15:26:08.289113	661ecbb4c026b643bfe5c73df411c02a	ce2b04d66d8ba622c4f64073362bf501
425	SVC-IMM-003	DEPT-001	ea_portal	\N	other	5	3	3	3	4	\N	f	2025-10-15 21:26:08.289113	e9ec3fd8a6cf432ff9d4ca661122aa29	fe341de2974c98beb0cb3b6a17ce5024
426	SVC-IMM-003	DEPT-001	ea_portal	\N	other	4	4	4	5	5	\N	f	2025-08-20 09:26:08.289113	94c669f7ef28f17f8626f22f8a7cc6ba	cff63d34ef4b24ab1b2d522e2184b675
427	SVC-IMM-003	DEPT-001	ea_portal	\N	visitor	3	3	4	3	3	\N	f	2025-10-18 17:26:08.289113	9eb20b6adf4d0a23003c9ff2a1401828	82571f372fe3f2dfb3023274088daff9
428	SVC-IMM-003	DEPT-001	ea_portal	\N	other	5	4	3	3	3	System had technical issues	f	2025-08-16 10:26:08.289113	9e09f8d2475c1ec74225b9090187e43a	a25bf253b8fad8771a81c70e9b51d840
429	SVC-IMM-003	DEPT-001	ea_portal	\N	citizen	5	4	3	4	4	Could be faster but overall good experience	f	2025-09-02 17:26:08.289113	fcae6e8035b1f92e0cffd03a298f3f7e	3634cd6d5f0d8c7ecb395959074225f4
430	SVC-IMM-003	DEPT-001	ea_portal	\N	business	4	5	3	3	5	\N	f	2025-08-21 19:26:08.289113	b297b7d523b30c41fca55b32d212d68a	8b0a54837768cb0eabc2f7ff4da51622
431	SVC-IMM-003	DEPT-001	ea_portal	\N	government	4	5	2	5	3	Service exceeded expectations	f	2025-09-02 19:26:08.289113	3d6fd7e3f2c2474c78560844d6bb80fa	0ffaacc58988223f07ca96d9dd66594f
432	SVC-IMM-003	DEPT-001	ea_portal	\N	visitor	5	5	2	4	4	Excellent service, very satisfied	f	2025-08-28 15:26:08.289113	f9b30ab3d214cd4bdab43b7f5f574729	d60912abe2aee39735814b28c6fe9358
433	SVC-IMM-003	DEPT-001	ea_portal	\N	business	4	5	4	5	4	\N	f	2025-09-20 12:26:08.289113	7da3eb498f003e64b665193a42ab2735	f98dc6b0b5d1f0c5c036102c24663633
434	SVC-IMM-003	DEPT-001	ea_portal	\N	citizen	5	5	3	5	4	Process needs improvement	f	2025-10-25 08:26:08.289113	4202fd0a48f2ccca683b360910d2043d	269c1a7debd201bbb8b463d2b370268c
435	SVC-IMM-003	DEPT-001	ea_portal	\N	visitor	4	4	2	3	5	\N	f	2025-10-06 10:26:08.289113	b06064924ece29436d469b4dd7c58938	384bc57d0acfb0fdd9b6d350127b1db8
436	SVC-IMM-003	DEPT-001	ea_portal	\N	business	4	3	3	3	3	\N	f	2025-10-18 03:26:08.289113	f502cb29fa6388b850c193323337c431	7e67cec51492ff8359607dfa8be8283a
437	SVC-IMM-003	DEPT-001	ea_portal	\N	government	4	3	2	4	5	\N	f	2025-10-06 14:26:08.289113	b334b2d772b3839e401ea2d949a09f9a	c6eb6e6e6126fc98cde6d3092d6e6dba
438	SVC-IMM-003	DEPT-001	ea_portal	\N	visitor	3	4	2	4	4	\N	f	2025-09-02 16:26:08.289113	39e65a011ccd1fe03ffbb76cbb0cb8ff	b876b2cc50dcd0ec68c8baf641596c1a
439	SVC-IMM-003	DEPT-001	ea_portal	\N	citizen	3	4	3	4	5	Staff were helpful and professional	f	2025-10-08 16:26:08.289113	5cf30c343b3bf248b77a405930d9cd3e	d483dfb198ba244f434cad810c71a18f
440	SVC-IMM-004	DEPT-001	ea_portal	\N	visitor	5	5	2	4	3	System had technical issues	f	2025-10-31 03:26:08.289113	1a3b13375129c99c2b15ad31257a1ce0	5d160f4c764fc54869d15d7e42abed81
441	SVC-IMM-004	DEPT-001	ea_portal	\N	citizen	3	4	4	5	4	\N	f	2025-08-21 20:26:08.289113	4b3787e3e9e14fb0ddaa224da73a6fd8	52408d687ae3bbab937a0ebc93bacbc9
442	SVC-IMM-004	DEPT-001	ea_portal	\N	business	4	3	2	5	4	\N	f	2025-08-20 04:26:08.289113	1c055528976a8af9c27d56caa4aef9df	220a9bea7af15ca75b4fa56f3125c580
443	SVC-IMM-004	DEPT-001	ea_portal	\N	business	5	3	3	5	5	\N	f	2025-10-15 10:26:08.289113	48b0b072d8cf483b12526f175e798e41	3c8ba02a15cc7e850382da44a04a1d68
444	SVC-IMM-004	DEPT-001	ea_portal	\N	citizen	3	5	3	3	5	\N	f	2025-10-01 13:26:08.289113	d376d2a0c824d18dff19262f66aaad74	ce2b04d66d8ba622c4f64073362bf501
445	SVC-IMM-004	DEPT-001	ea_portal	\N	other	5	4	3	5	5	\N	f	2025-09-04 21:26:08.289113	abe7ba5a71715dc217f363d5bded6b4c	fe341de2974c98beb0cb3b6a17ce5024
446	SVC-IMM-004	DEPT-001	ea_portal	\N	other	5	4	3	4	5	System was easy to use	f	2025-11-04 17:26:08.289113	35dfd68c0f11c332f5a18e9020e5c1d5	cff63d34ef4b24ab1b2d522e2184b675
447	SVC-IMM-004	DEPT-001	ea_portal	\N	citizen	5	5	3	4	5	\N	f	2025-10-18 13:26:08.289113	6cbaf65381d840046cd205f7dfa6f9d1	82571f372fe3f2dfb3023274088daff9
448	SVC-IMM-004	DEPT-001	ea_portal	\N	business	4	3	2	5	3	\N	f	2025-11-04 18:26:08.289113	5de16a068df5b55872e1c5ef6bcaa226	a25bf253b8fad8771a81c70e9b51d840
449	SVC-IMM-004	DEPT-001	ea_portal	\N	visitor	5	5	3	5	5	\N	f	2025-11-07 19:26:08.289113	076098813311127b19458cae9f91406a	3634cd6d5f0d8c7ecb395959074225f4
450	SVC-IMM-004	DEPT-001	ea_portal	\N	government	5	5	3	3	5	\N	f	2025-10-03 22:26:08.289113	356417d9d177ba3e2644da448c54aaba	8b0a54837768cb0eabc2f7ff4da51622
451	SVC-IMM-004	DEPT-001	ea_portal	\N	other	5	5	2	4	5	\N	f	2025-09-04 12:26:08.289113	d7c59877e3af222ae5cbc7df865bc3a6	0ffaacc58988223f07ca96d9dd66594f
452	SVC-IMM-004	DEPT-001	ea_portal	\N	visitor	4	4	2	4	4	Documentation requirements unclear	f	2025-10-19 11:26:08.289113	c347570b016ee5339a3e79abb063dd95	d60912abe2aee39735814b28c6fe9358
453	SVC-IMM-004	DEPT-001	ea_portal	\N	citizen	3	4	2	5	4	\N	f	2025-08-26 05:26:08.289113	db019b4af21e95d68cf2efb5c914a9d8	f98dc6b0b5d1f0c5c036102c24663633
454	SVC-IMM-004	DEPT-001	ea_portal	\N	other	3	4	3	4	3	\N	f	2025-09-23 02:26:08.289113	cefc96d0d471182f0c46130461985067	269c1a7debd201bbb8b463d2b370268c
455	SVC-IMM-004	DEPT-001	ea_portal	\N	government	3	4	4	3	5	Quick and efficient processing	f	2025-10-29 10:26:08.289113	c1e6e5e6ce07cd7f86a0aacd8a1cab57	384bc57d0acfb0fdd9b6d350127b1db8
456	SVC-IMM-004	DEPT-001	ea_portal	\N	other	3	4	4	5	4	\N	f	2025-10-20 16:26:08.289113	e4fbe619e8e5fbcb780f2894deb10dd7	7e67cec51492ff8359607dfa8be8283a
457	SVC-IMM-004	DEPT-001	ea_portal	\N	government	3	5	2	5	5	\N	f	2025-10-03 08:26:08.289113	f58b82636137d0596f8bc29a21e085fd	c6eb6e6e6126fc98cde6d3092d6e6dba
458	SVC-IMM-004	DEPT-001	ea_portal	\N	visitor	4	4	4	5	4	Waiting time was reasonable	f	2025-08-13 02:26:08.289113	6ef5d34a5843df526fe7c9e1a11a6cde	b876b2cc50dcd0ec68c8baf641596c1a
459	SVC-IMM-004	DEPT-001	ea_portal	\N	government	4	3	4	4	4	\N	f	2025-10-25 01:26:08.289113	f81c36a7a0c6f78bcc8f86dfdd362204	d483dfb198ba244f434cad810c71a18f
460	SVC-IMM-004	DEPT-001	ea_portal	\N	business	3	4	3	4	4	Long wait times experienced	f	2025-09-16 12:26:08.289113	e46c28625f7f170a27ccff00559ebab9	750c057d93c2f0f2aefd8c45d2d79547
461	SVC-LEG-001	DEPT-001	ea_portal	\N	government	4	5	3	3	3	Documentation requirements unclear	f	2025-09-21 09:26:08.289113	af2f4f5e1a11550914ba456c7f294eb9	5d160f4c764fc54869d15d7e42abed81
462	SVC-LEG-001	DEPT-001	ea_portal	\N	other	3	3	2	4	3	Waiting time was reasonable	f	2025-08-15 11:26:08.289113	97e09f9a4de9886e34252b923f4f0c33	52408d687ae3bbab937a0ebc93bacbc9
463	SVC-LEG-001	DEPT-001	ea_portal	\N	citizen	5	3	3	5	4	\N	f	2025-10-23 16:26:08.289113	720f877022adf006cd83b246658bf5fb	220a9bea7af15ca75b4fa56f3125c580
464	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	3	3	3	5	4	\N	f	2025-10-17 00:26:08.289113	3471f3ee9a3c2f4207e79799a4975cfc	3c8ba02a15cc7e850382da44a04a1d68
465	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	3	5	4	3	3	Staff were helpful and professional	f	2025-08-29 06:26:08.289113	e4489a3499a2a9a05a83b9a139127db7	ce2b04d66d8ba622c4f64073362bf501
466	SVC-LEG-001	DEPT-001	ea_portal	\N	other	5	4	2	5	3	\N	f	2025-10-13 10:26:08.289113	fc50a51936c37e6db51f0cf68a5f16c7	fe341de2974c98beb0cb3b6a17ce5024
467	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	4	4	3	3	3	\N	f	2025-10-30 10:26:08.289113	2d6cadbe235c165559d97158c061569b	cff63d34ef4b24ab1b2d522e2184b675
468	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	3	5	3	5	3	\N	f	2025-10-11 11:26:08.289113	da1fd12176dc2c486d8f1c5666da0add	82571f372fe3f2dfb3023274088daff9
469	SVC-LEG-001	DEPT-001	ea_portal	\N	business	4	4	3	3	3	\N	f	2025-10-23 17:26:08.289113	d1d4262dde0c916f4856103e0a7dc5b8	a25bf253b8fad8771a81c70e9b51d840
470	SVC-LEG-001	DEPT-001	ea_portal	\N	government	3	5	4	4	4	\N	f	2025-10-31 16:26:08.289113	2a814aec5fb872c31bbca9126f83336d	3634cd6d5f0d8c7ecb395959074225f4
471	SVC-LEG-001	DEPT-001	ea_portal	\N	business	5	5	2	3	4	\N	f	2025-08-12 23:26:08.289113	15de2704369a5c7ac833aade2a1a6247	8b0a54837768cb0eabc2f7ff4da51622
472	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	4	4	4	4	3	\N	f	2025-10-29 20:26:08.289113	21ed6f7e0e896c6d99020758191cbf8c	0ffaacc58988223f07ca96d9dd66594f
473	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	4	5	4	4	3	\N	f	2025-10-10 18:26:08.289113	89019c610d404e77d036fa2497b807a7	d60912abe2aee39735814b28c6fe9358
474	SVC-LEG-001	DEPT-001	ea_portal	\N	government	4	5	3	4	5	Clear instructions provided	f	2025-09-16 09:26:08.289113	0584c54420a6f94969fd6abffc931537	f98dc6b0b5d1f0c5c036102c24663633
475	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	4	3	2	4	4	\N	f	2025-09-12 11:26:08.289113	df9d1caf0634aa9baf5fce7fa0d17dbc	269c1a7debd201bbb8b463d2b370268c
476	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	5	3	3	4	3	\N	f	2025-10-19 20:26:08.289113	1e10ab3eb3193d5ab3645a0c0b9f97ae	384bc57d0acfb0fdd9b6d350127b1db8
477	SVC-LEG-001	DEPT-001	ea_portal	\N	other	5	5	2	4	3	\N	f	2025-09-13 05:26:08.289113	bf308f2c4444590f0e8dca17716b5a44	7e67cec51492ff8359607dfa8be8283a
478	SVC-LEG-001	DEPT-001	ea_portal	\N	government	3	4	2	5	3	\N	f	2025-09-06 15:26:08.289113	aea8851c6c6916884cd8176244d9a7fe	c6eb6e6e6126fc98cde6d3092d6e6dba
479	SVC-LEG-001	DEPT-001	ea_portal	\N	other	5	5	4	4	4	\N	f	2025-08-13 20:26:08.289113	68d7541038de9db61a9a0e2f9c501d30	b876b2cc50dcd0ec68c8baf641596c1a
480	SVC-LEG-001	DEPT-001	ea_portal	\N	government	4	4	2	4	5	\N	f	2025-09-20 14:26:08.289113	3bc9f07b4add8eda6c2b921aeceb8d82	d483dfb198ba244f434cad810c71a18f
481	SVC-LEG-001	DEPT-001	ea_portal	\N	other	5	3	2	5	3	\N	f	2025-10-23 04:26:08.289113	5eac3601aff381239454c742e022f036	750c057d93c2f0f2aefd8c45d2d79547
482	SVC-LEG-001	DEPT-001	ea_portal	\N	other	4	3	4	3	3	\N	f	2025-09-07 15:26:08.289113	4817eb0d69ec64ba9d318206f093eb35	407130efd00a3625c3b0f90193da5cb6
483	SVC-LEG-001	DEPT-001	ea_portal	\N	business	4	4	4	4	4	Long wait times experienced	f	2025-08-26 14:26:08.289113	51e648de1bf8e7a8627cd19d24bfe4c3	f49809e7260afc6537e338ae544c2890
484	SVC-LEG-001	DEPT-001	ea_portal	\N	government	3	5	2	3	5	\N	f	2025-10-11 09:26:08.289113	e370daad3c25bb1eae1ef0dd9610462e	a2f1416a4c03db2e859b0eca8b59b81d
485	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	4	5	3	4	5	\N	f	2025-09-26 12:26:08.289113	e200010327bd4b5fc49aeb6e3e1c91e8	08b0e5518831c5f0eee6de2e23996c8a
486	SVC-LEG-001	DEPT-001	ea_portal	\N	citizen	3	5	2	5	3	\N	f	2025-10-21 08:26:08.289113	19efaba170c460678add3ceacd9a9ab8	148a658f903a969ba9dadf9f07934243
487	SVC-LEG-001	DEPT-001	ea_portal	\N	citizen	4	3	4	4	3	System had technical issues	f	2025-09-17 04:26:08.289113	1ca8f143154315916fd6abfe65534c4a	277ae74bc10a8a7e3c7e8d662b8c16c5
488	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	5	3	3	4	5	\N	t	2025-10-01 07:26:08.289113	04fc97f1a32c225e156719ecc4291656	2d73a2bec4ff8aeddca403f4bb7ff1ff
489	SVC-LEG-001	DEPT-001	ea_portal	\N	business	4	3	2	5	4	\N	f	2025-08-23 16:26:08.289113	fec051c94dd474965b9229ece7a60e3b	126f5a8458e643efc9dbbf3aa431ba7f
490	SVC-LEG-001	DEPT-001	ea_portal	\N	other	4	5	4	5	5	\N	f	2025-10-16 04:26:08.289113	0172392806a3a23e9c61acf1c0137337	ccc2daced677e7b6ff61d72cf9b217da
491	SVC-LEG-001	DEPT-001	ea_portal	\N	citizen	4	4	3	4	3	\N	f	2025-11-04 18:26:08.289113	65cde6795aa209eca0966f7f44b0530f	80d5418953fde6cbd1424f905adac1b9
492	SVC-LEG-001	DEPT-001	ea_portal	\N	business	3	5	2	5	4	\N	f	2025-09-11 07:26:08.289113	790369ee90632a4d76fbd6187331e895	f623d2ca14dfdb774bfc8a02723cd4a0
493	SVC-LEG-001	DEPT-001	ea_portal	\N	other	5	5	2	3	5	\N	f	2025-09-30 20:26:08.289113	00cbd4cd93d986097cfbab69e60ffbba	0ad99666ef50e1baf8614b09adbb9f2a
494	SVC-LEG-001	DEPT-001	ea_portal	\N	citizen	5	4	4	4	3	\N	f	2025-09-16 22:26:08.289113	967feaecc8ede468dce0fb79d67d4604	dd21346fb0c17dacbd5aa6dfd3ec9b2f
495	SVC-LEG-001	DEPT-001	ea_portal	\N	visitor	5	3	4	5	3	Documentation requirements unclear	f	2025-08-19 11:26:08.289113	108f3fe5f1ba80fdc0f2e6e0c1505deb	bc0c0f5d6bdab2824f8e8e2a8690928b
496	SVC-LEG-001	DEPT-001	ea_portal	\N	citizen	5	5	2	5	5	\N	f	2025-09-29 08:26:08.289113	e2896691d684cadba44145d491113703	65c8ed612fb308ec464cba7ba24bcf3a
497	SVC-REG-010	DEPT-004	ea_portal	\N	business	3	3	3	5	5	\N	f	2025-11-05 10:26:08.289113	27ad303b9be9700afd9a58c35ebc49ef	5d160f4c764fc54869d15d7e42abed81
498	SVC-REG-010	DEPT-004	ea_portal	\N	citizen	5	4	4	3	3	\N	f	2025-08-25 03:26:08.289113	364984b8aada8cdad31d545f692f98cd	52408d687ae3bbab937a0ebc93bacbc9
499	SVC-REG-010	DEPT-004	ea_portal	\N	government	5	5	4	4	5	\N	f	2025-10-09 03:26:08.289113	f48b83148b71e242ac252b2682095163	220a9bea7af15ca75b4fa56f3125c580
500	SVC-REG-010	DEPT-004	ea_portal	\N	visitor	5	5	2	3	5	System was easy to use	f	2025-10-17 11:26:08.289113	c2bde064fa28ed04cd89e09aa0b42de7	3c8ba02a15cc7e850382da44a04a1d68
501	SVC-REG-010	DEPT-004	ea_portal	\N	business	5	4	3	5	3	\N	f	2025-08-12 12:26:08.289113	c6fb00e3873100f4a9563256dc62c812	ce2b04d66d8ba622c4f64073362bf501
502	SVC-REG-010	DEPT-004	ea_portal	\N	visitor	3	5	4	4	4	Staff need more training	f	2025-08-15 22:26:08.289113	1bd1a42a6390489fe81c4e34016b3550	fe341de2974c98beb0cb3b6a17ce5024
503	SVC-REG-010	DEPT-004	ea_portal	\N	business	5	4	4	5	3	Staff need more training	f	2025-10-05 10:26:08.289113	037fa968ae57ddebc67c36cc548df386	cff63d34ef4b24ab1b2d522e2184b675
504	SVC-REG-010	DEPT-004	ea_portal	\N	citizen	5	4	4	3	4	Staff were helpful and professional	f	2025-09-29 02:26:08.289113	2b56395aed60eb134b6c769a8d9161ba	82571f372fe3f2dfb3023274088daff9
505	SVC-REG-010	DEPT-004	ea_portal	\N	citizen	3	4	2	5	3	\N	f	2025-08-13 09:26:08.289113	79bda9a304470c583a752eb18e4090bc	a25bf253b8fad8771a81c70e9b51d840
506	SVC-REG-010	DEPT-004	ea_portal	\N	business	3	4	4	5	5	Long wait times experienced	f	2025-11-01 11:26:08.289113	99c85fc670e1eba41c7cd38da93f6b9f	3634cd6d5f0d8c7ecb395959074225f4
507	SVC-REG-010	DEPT-004	ea_portal	\N	business	4	5	3	4	4	\N	f	2025-09-12 18:26:08.289113	06f964208962bdc88b3d1b4446d09f93	8b0a54837768cb0eabc2f7ff4da51622
508	SVC-REG-010	DEPT-004	ea_portal	\N	business	5	4	3	5	5	Information was not clear	f	2025-08-21 08:26:08.289113	f7cd0ff7500379d527ce32f47158c205	0ffaacc58988223f07ca96d9dd66594f
509	SVC-REG-010	DEPT-004	ea_portal	\N	business	4	5	2	4	4	Would recommend this service	f	2025-10-17 04:26:08.289113	aeb72278ab76baca2ee356fbed75fe09	d60912abe2aee39735814b28c6fe9358
510	SVC-REG-010	DEPT-004	ea_portal	\N	visitor	5	4	3	4	3	System had technical issues	f	2025-09-09 21:26:08.289113	f801ea6039ccf7eec5f2450dade8bb5c	f98dc6b0b5d1f0c5c036102c24663633
511	SVC-REG-010	DEPT-004	ea_portal	\N	other	4	3	3	5	4	\N	f	2025-10-23 23:26:08.289113	e01734cf8c442cd604043e4f560b5c83	269c1a7debd201bbb8b463d2b370268c
512	SVC-REG-010	DEPT-004	ea_portal	\N	government	3	5	4	4	4	Service exceeded expectations	f	2025-11-07 10:26:08.289113	92b8e154f4477c8500afbc35d1844af3	384bc57d0acfb0fdd9b6d350127b1db8
513	SVC-REG-010	DEPT-004	ea_portal	\N	citizen	3	5	2	4	3	\N	f	2025-09-14 03:26:08.289113	276efa2dd005f16a96dab6e17857c7a3	7e67cec51492ff8359607dfa8be8283a
514	SVC-REG-010	DEPT-004	ea_portal	\N	business	5	5	4	4	5	Process needs improvement	f	2025-08-17 16:26:08.289113	6729eb80372dda017b984ee6fff9ab07	c6eb6e6e6126fc98cde6d3092d6e6dba
515	SVC-REG-010	DEPT-004	ea_portal	\N	other	5	4	2	4	4	Would recommend this service	f	2025-08-24 19:26:08.289113	02cc96763a19ffd7196c0f52cb5d5550	b876b2cc50dcd0ec68c8baf641596c1a
516	SVC-REG-010	DEPT-004	ea_portal	\N	citizen	4	5	3	5	3	\N	t	2025-09-06 05:26:08.289113	bcddb0f97c82a3e5d248f3b06d1e5c80	d483dfb198ba244f434cad810c71a18f
517	SVC-REG-010	DEPT-004	ea_portal	\N	business	3	3	4	4	3	Information was not clear	f	2025-09-05 02:26:08.289113	78b2cb45a9c7a5e05fdc7790b32f2a7a	750c057d93c2f0f2aefd8c45d2d79547
518	SVC-REG-010	DEPT-004	ea_portal	\N	government	4	4	4	3	3	\N	f	2025-10-04 11:26:08.289113	5639408b237f525f19ddd076904c8acd	407130efd00a3625c3b0f90193da5cb6
519	SVC-REG-010	DEPT-004	ea_portal	\N	government	4	3	3	3	3	\N	f	2025-10-23 14:26:08.289113	ecb4c57f8ebc5b6afde69694ae328881	f49809e7260afc6537e338ae544c2890
520	SVC-REG-010	DEPT-004	ea_portal	\N	business	5	4	2	5	4	\N	f	2025-10-15 08:26:08.289113	e7534a04a53b958ecb21332da5076f13	a2f1416a4c03db2e859b0eca8b59b81d
521	SVC-REG-010	DEPT-004	ea_portal	\N	other	4	4	2	4	4	\N	f	2025-09-18 11:26:08.289113	e0f94b819f0221e412f04e312a71d97e	08b0e5518831c5f0eee6de2e23996c8a
522	SVC-REG-010	DEPT-004	ea_portal	\N	business	4	4	4	4	4	\N	f	2025-08-15 04:26:08.289113	b6ecf9db2a0e57d2b5d8afdbb55794e7	148a658f903a969ba9dadf9f07934243
523	SVC-REG-010	DEPT-004	ea_portal	\N	business	5	4	3	5	3	\N	f	2025-09-14 12:26:08.289113	40cef1cc027a37a095ab1863112b3925	277ae74bc10a8a7e3c7e8d662b8c16c5
524	SVC-REG-011	DEPT-004	ea_portal	\N	other	5	5	3	3	3	Would recommend this service	f	2025-09-10 22:26:08.289113	34826104b4dfb80597dc9052295743ad	5d160f4c764fc54869d15d7e42abed81
525	SVC-REG-011	DEPT-004	ea_portal	\N	other	5	4	2	4	5	Documentation requirements unclear	f	2025-09-23 08:26:08.289113	c5f76288282fd40e5bb9ed866708df5e	52408d687ae3bbab937a0ebc93bacbc9
526	SVC-REG-011	DEPT-004	ea_portal	\N	other	5	3	2	4	3	\N	f	2025-10-25 04:26:08.289113	0bff098b8ad7f07d4d434075e1da14ca	220a9bea7af15ca75b4fa56f3125c580
527	SVC-REG-011	DEPT-004	ea_portal	\N	government	4	4	3	4	4	\N	f	2025-08-27 12:26:08.289113	a0e5782ac13af01e18229cef8c0e2cf6	3c8ba02a15cc7e850382da44a04a1d68
528	SVC-REG-011	DEPT-004	ea_portal	\N	business	5	4	2	5	3	\N	t	2025-10-15 19:26:08.289113	12233367511aa4cee6792b1f4381a80f	ce2b04d66d8ba622c4f64073362bf501
529	SVC-REG-011	DEPT-004	ea_portal	\N	business	4	5	3	3	4	Service exceeded expectations	f	2025-10-25 02:26:08.289113	e8d73396684dc1bb6a7124dda41fd974	fe341de2974c98beb0cb3b6a17ce5024
530	SVC-REG-011	DEPT-004	ea_portal	\N	visitor	3	4	3	3	4	\N	f	2025-09-02 23:26:08.289113	95a550307f5376166af24d54e9cee887	cff63d34ef4b24ab1b2d522e2184b675
531	SVC-REG-011	DEPT-004	ea_portal	\N	visitor	5	3	3	4	5	Excellent service, very satisfied	f	2025-09-20 12:26:08.289113	67b0c7add709bc137d8ebe2876e16dc2	82571f372fe3f2dfb3023274088daff9
532	SVC-REG-011	DEPT-004	ea_portal	\N	government	5	4	4	5	4	\N	f	2025-10-10 05:26:08.289113	0048d2f43169832a0252b93dc355e0af	a25bf253b8fad8771a81c70e9b51d840
533	SVC-REG-011	DEPT-004	ea_portal	\N	visitor	4	5	4	4	4	\N	f	2025-09-29 01:26:08.289113	a28c01070cecf922fe87302e0bbd40ab	3634cd6d5f0d8c7ecb395959074225f4
534	SVC-REG-011	DEPT-004	ea_portal	\N	government	5	4	2	5	5	Documentation requirements unclear	f	2025-08-14 04:26:08.289113	1ca8858b764d3de2ba025ccb74a11b8c	8b0a54837768cb0eabc2f7ff4da51622
535	SVC-REG-011	DEPT-004	ea_portal	\N	business	5	5	4	4	4	Process needs improvement	f	2025-09-01 15:26:08.289113	c0b10197d7479f1b0e9b429f4b0b0221	0ffaacc58988223f07ca96d9dd66594f
536	SVC-REG-011	DEPT-004	ea_portal	\N	business	5	3	4	5	5	\N	f	2025-08-19 14:26:08.289113	d3058d984b60234c18804146704ea98d	d60912abe2aee39735814b28c6fe9358
537	SVC-REG-011	DEPT-004	ea_portal	\N	citizen	4	3	4	3	4	\N	f	2025-09-25 12:26:08.289113	3429d1f98db3f245a1d2977139dcaae5	f98dc6b0b5d1f0c5c036102c24663633
538	SVC-REG-011	DEPT-004	ea_portal	\N	government	4	3	2	4	3	\N	f	2025-10-06 00:26:08.289113	4e2b3e74b1620ffc759702d22927ea89	269c1a7debd201bbb8b463d2b370268c
539	SVC-REG-011	DEPT-004	ea_portal	\N	business	3	5	3	5	3	Process needs improvement	f	2025-08-14 13:26:08.289113	903c0ac5603e40d54fd3f65444970ca8	384bc57d0acfb0fdd9b6d350127b1db8
540	SVC-REG-011	DEPT-004	ea_portal	\N	citizen	5	5	2	5	5	Could be faster but overall good experience	f	2025-10-24 15:26:08.289113	44080ca283bcbbef164edb546d61d486	7e67cec51492ff8359607dfa8be8283a
541	SVC-REG-011	DEPT-004	ea_portal	\N	visitor	5	4	4	4	3	\N	f	2025-10-15 18:26:08.289113	3225abb68850a7726b15f67c2874df0c	c6eb6e6e6126fc98cde6d3092d6e6dba
542	SVC-REG-011	DEPT-004	ea_portal	\N	government	3	3	2	4	5	\N	f	2025-10-04 17:26:08.289113	b459d8e2f6c20b2659dc8d5a309b2336	b876b2cc50dcd0ec68c8baf641596c1a
543	SVC-REG-011	DEPT-004	ea_portal	\N	government	4	5	3	5	5	\N	f	2025-11-08 04:26:08.289113	d22e91d3b6a771784f86cda68566a093	d483dfb198ba244f434cad810c71a18f
544	SVC-REG-011	DEPT-004	ea_portal	\N	citizen	3	5	3	4	5	\N	f	2025-09-29 03:26:08.289113	a165804f8759eebcdeef30605254998f	750c057d93c2f0f2aefd8c45d2d79547
545	SVC-REG-011	DEPT-004	ea_portal	\N	visitor	3	3	4	4	3	\N	f	2025-10-13 14:26:08.289113	8cf08dd96cc375865a4ef70f4e084749	407130efd00a3625c3b0f90193da5cb6
546	SVC-REG-011	DEPT-004	ea_portal	\N	business	3	4	2	3	3	Waiting time was reasonable	f	2025-08-19 12:26:08.289113	420b91f34eb783bfc5301c3db5c8e0fa	f49809e7260afc6537e338ae544c2890
547	SVC-REG-011	DEPT-004	ea_portal	\N	visitor	5	3	4	5	3	\N	f	2025-08-14 10:26:08.289113	f9d65685dcd6e304f08a23b752c480db	a2f1416a4c03db2e859b0eca8b59b81d
548	SVC-REG-011	DEPT-004	ea_portal	\N	government	4	5	2	5	3	\N	f	2025-10-11 00:26:08.289113	ffdef58d24820d35b24e694745dab76e	08b0e5518831c5f0eee6de2e23996c8a
549	SVC-REG-011	DEPT-004	ea_portal	\N	citizen	5	5	4	5	4	\N	f	2025-09-19 13:26:08.289113	da2af48378866a7a321576b6e26a2d45	148a658f903a969ba9dadf9f07934243
550	SVC-REG-012	DEPT-004	ea_portal	\N	other	4	5	2	5	4	\N	f	2025-10-25 12:26:08.289113	254b39ec9809b6cdfb62465244a9e257	5d160f4c764fc54869d15d7e42abed81
551	SVC-REG-012	DEPT-004	ea_portal	\N	other	4	5	3	3	3	Staff were helpful and professional	f	2025-10-09 03:26:08.289113	318207fc7b7d339ffff4a15857060058	52408d687ae3bbab937a0ebc93bacbc9
552	SVC-REG-012	DEPT-004	ea_portal	\N	visitor	5	5	4	3	5	Would recommend this service	f	2025-09-29 11:26:08.289113	3f7d002fdaccddd5ee527d37c4a5b494	220a9bea7af15ca75b4fa56f3125c580
553	SVC-REG-012	DEPT-004	ea_portal	\N	citizen	4	4	4	4	3	\N	f	2025-09-28 05:26:08.289113	1de0c6bccbe81764e15d8182901e695e	3c8ba02a15cc7e850382da44a04a1d68
554	SVC-REG-012	DEPT-004	ea_portal	\N	business	4	4	4	3	3	\N	f	2025-09-29 06:26:08.289113	af952104f2186a6e60dac06d6de8f077	ce2b04d66d8ba622c4f64073362bf501
555	SVC-REG-012	DEPT-004	ea_portal	\N	visitor	3	5	2	4	3	\N	f	2025-09-08 00:26:08.289113	53c57d353608d948291366e5bf4c785a	fe341de2974c98beb0cb3b6a17ce5024
556	SVC-REG-012	DEPT-004	ea_portal	\N	government	4	3	4	4	5	\N	f	2025-09-26 11:26:08.289113	7e5bbd6ccc0dd1833026dcb42de8d9f2	cff63d34ef4b24ab1b2d522e2184b675
557	SVC-REG-012	DEPT-004	ea_portal	\N	government	4	5	2	5	5	\N	f	2025-10-21 14:26:08.289113	ada876387920831b830f7a3352a62553	82571f372fe3f2dfb3023274088daff9
558	SVC-REG-012	DEPT-004	ea_portal	\N	citizen	3	5	2	5	4	\N	f	2025-10-11 02:26:08.289113	4faa90188fb2a612c6a995da143c1f59	a25bf253b8fad8771a81c70e9b51d840
559	SVC-REG-012	DEPT-004	ea_portal	\N	citizen	3	4	4	4	4	Service exceeded expectations	f	2025-10-24 01:26:08.289113	0a81ccdc2a3cfe6d86c06869424a4e75	3634cd6d5f0d8c7ecb395959074225f4
560	SVC-REG-012	DEPT-004	ea_portal	\N	other	5	4	4	4	5	Information was not clear	f	2025-08-11 16:26:08.289113	4ebb4ecb720e2c823f66a8263f689778	8b0a54837768cb0eabc2f7ff4da51622
561	SVC-REG-012	DEPT-004	ea_portal	\N	citizen	3	4	4	3	3	\N	f	2025-08-26 00:26:08.289113	6082f818d5110fc8af64faedb3511202	0ffaacc58988223f07ca96d9dd66594f
562	SVC-REG-012	DEPT-004	ea_portal	\N	government	3	5	3	4	5	\N	f	2025-08-20 12:26:08.289113	7b237dec418685040b161e1f550333ec	d60912abe2aee39735814b28c6fe9358
563	SVC-REG-012	DEPT-004	ea_portal	\N	other	5	3	2	4	3	Quick and efficient processing	f	2025-09-20 16:26:08.289113	e47a124276e9ab151569c573a0ddab0c	f98dc6b0b5d1f0c5c036102c24663633
564	SVC-REG-012	DEPT-004	ea_portal	\N	business	5	5	3	3	4	Long wait times experienced	f	2025-08-14 16:26:08.289113	6f6e390467797d09e323f8da31053ef4	269c1a7debd201bbb8b463d2b370268c
565	SVC-REG-012	DEPT-004	ea_portal	\N	visitor	5	5	3	5	4	\N	f	2025-08-17 04:26:08.289113	40d764fc9fe726aefa1d911ed4dfa0ce	384bc57d0acfb0fdd9b6d350127b1db8
566	SVC-REG-012	DEPT-004	ea_portal	\N	other	4	3	4	3	3	Excellent service, very satisfied	f	2025-10-15 16:26:08.289113	89ea1fbc0e0b62123fbaa8704b88e1a2	7e67cec51492ff8359607dfa8be8283a
567	SVC-REG-012	DEPT-004	ea_portal	\N	other	3	5	4	4	5	Would recommend this service	f	2025-10-04 16:26:08.289113	9fab7ea5958d1601035daf4630b363b2	c6eb6e6e6126fc98cde6d3092d6e6dba
568	SVC-REG-012	DEPT-004	ea_portal	\N	other	5	4	4	3	4	\N	f	2025-10-21 01:26:08.289113	189291bbf4f9f0780398db3bf1b278e0	b876b2cc50dcd0ec68c8baf641596c1a
569	SVC-REG-012	DEPT-004	ea_portal	\N	other	3	3	2	4	4	\N	f	2025-10-30 06:26:08.289113	458af5fb10d6c43137740991f38cf327	d483dfb198ba244f434cad810c71a18f
570	SVC-REG-012	DEPT-004	ea_portal	\N	other	5	5	3	4	3	\N	f	2025-09-03 21:26:08.289113	f2ec8b8706ed9e66180830221580fbc9	750c057d93c2f0f2aefd8c45d2d79547
571	SVC-REG-012	DEPT-004	ea_portal	\N	citizen	4	5	4	4	3	Could be faster but overall good experience	f	2025-10-17 02:26:08.289113	640d9ff6f6bbd0ae14de81b0a7feec17	407130efd00a3625c3b0f90193da5cb6
572	SVC-REG-012	DEPT-004	ea_portal	\N	visitor	5	4	4	3	3	Online portal works well	f	2025-10-11 23:26:08.289113	300f70b0c2ba57dd492b7bce56979e29	f49809e7260afc6537e338ae544c2890
573	SVC-REG-012	DEPT-004	ea_portal	\N	other	4	3	3	3	5	System was easy to use	f	2025-09-04 09:26:08.289113	52cbd7dfc45c3c0b727dc60ff8a80c95	a2f1416a4c03db2e859b0eca8b59b81d
574	SVC-REG-012	DEPT-004	ea_portal	\N	government	3	4	3	4	5	Process was straightforward and efficient	f	2025-08-22 20:26:08.289113	7217848f9f2166cd932e1a8cca6f032d	08b0e5518831c5f0eee6de2e23996c8a
575	SVC-REG-012	DEPT-004	ea_portal	\N	other	4	5	4	5	5	\N	f	2025-10-18 03:26:08.289113	cfdcd574204c00695e8f33410d15a88b	148a658f903a969ba9dadf9f07934243
576	SVC-REG-012	DEPT-004	ea_portal	\N	government	4	4	3	5	5	\N	f	2025-09-08 04:26:08.289113	a98b5908b965008581263a8993045893	277ae74bc10a8a7e3c7e8d662b8c16c5
577	SVC-REG-012	DEPT-004	ea_portal	\N	visitor	5	4	2	4	3	Online portal works well	f	2025-09-07 19:26:08.289113	3c28fe09b37f3ea5beffafb602b63ae2	2d73a2bec4ff8aeddca403f4bb7ff1ff
578	SVC-REG-012	DEPT-004	ea_portal	\N	government	3	4	2	5	3	Staff need more training	f	2025-09-25 20:26:08.289113	6aa9508767fb1a5e4bbafff2d8009ba6	126f5a8458e643efc9dbbf3aa431ba7f
579	SVC-REG-012	DEPT-004	ea_portal	\N	business	5	4	2	5	5	\N	f	2025-09-26 18:26:08.289113	9f8793e66e7aed17b1cd61bec5637bcd	ccc2daced677e7b6ff61d72cf9b217da
580	SVC-REG-012	DEPT-004	ea_portal	\N	other	4	4	3	4	3	\N	f	2025-08-22 07:26:08.289113	7e7e45d4079d787a8a251e789eb47134	80d5418953fde6cbd1424f905adac1b9
581	SVC-REG-012	DEPT-004	ea_portal	\N	government	3	3	4	4	5	\N	f	2025-08-18 01:26:08.289113	373d6dcd84ee629bd19f0e2bd5acc423	f623d2ca14dfdb774bfc8a02723cd4a0
582	SVC-REG-012	DEPT-004	ea_portal	\N	visitor	4	3	4	4	5	Long wait times experienced	f	2025-11-04 13:26:08.289113	36e327426552b495d901db4e73bb3cb7	0ad99666ef50e1baf8614b09adbb9f2a
583	SVC-REG-012	DEPT-004	ea_portal	\N	visitor	5	3	4	5	3	Staff need more training	f	2025-09-01 20:26:08.289113	88dc9c0dd1623e4cf2c99e227068718f	dd21346fb0c17dacbd5aa6dfd3ec9b2f
584	SVC-REG-012	DEPT-004	ea_portal	\N	government	4	3	2	4	3	\N	f	2025-10-10 00:26:08.289113	40c293d51766f6927e2f2086b29061d8	bc0c0f5d6bdab2824f8e8e2a8690928b
585	SVC-REG-012	DEPT-004	ea_portal	\N	business	5	5	4	5	4	\N	f	2025-08-28 19:26:08.289113	49e4e891a1072f20939d1c4d54a1e846	65c8ed612fb308ec464cba7ba24bcf3a
586	SVC-REG-012	DEPT-004	ea_portal	\N	government	5	3	4	5	3	\N	f	2025-09-13 01:26:08.289113	e5b529d10e80090e614aeed2d7309753	6e14470699d9fc9a1a8aa8947c302f9c
587	SVC-REG-012	DEPT-004	ea_portal	\N	government	4	3	4	5	5	Process was straightforward and efficient	f	2025-08-30 15:26:08.289113	021ecfecbdfa1529633b55aff7fe1c7f	5dc62dc6ef8a3fa19473f04df2a219f5
588	SVC-REG-012	DEPT-004	ea_portal	\N	visitor	5	4	3	3	3	Forms were confusing	t	2025-08-17 15:26:08.289113	6cb24086b99c9c5132fbd1846ec8879e	d16ab23651a41560ed2c4f917a9bae59
589	SVC-REG-012	DEPT-004	ea_portal	\N	citizen	4	5	2	5	3	\N	f	2025-09-14 21:26:08.289113	7fba180720ef826282a547f12ccfd56f	0443cf56171bec8aba377503389e2209
590	SVC-REG-012	DEPT-004	ea_portal	\N	business	5	3	2	3	4	\N	f	2025-08-24 06:26:08.289113	f3a81f42e3ad68e759cef99f26e5e461	fa3fa2db70068f19dd5734dacdd8c98a
591	SVC-REG-012	DEPT-004	ea_portal	\N	other	4	3	3	4	4	\N	f	2025-10-12 04:26:08.289113	af8fb321b28720a60503ebcd0926fc9c	b8a052325f120ccca7997268e1cbe6db
592	SVC-REG-013	DEPT-004	ea_portal	\N	business	4	4	2	5	5	Could be faster but overall good experience	f	2025-11-03 12:26:08.289113	a9039911a25c9bbf526696ab61cdabd4	5d160f4c764fc54869d15d7e42abed81
593	SVC-REG-013	DEPT-004	ea_portal	\N	government	5	3	3	5	4	Process needs improvement	f	2025-10-30 14:26:08.289113	17a5beab60459b32e3d90361c4862578	52408d687ae3bbab937a0ebc93bacbc9
594	SVC-REG-013	DEPT-004	ea_portal	\N	government	5	5	4	3	3	\N	f	2025-08-24 15:26:08.289113	c8d74093f0401200f5753a88fd1466d0	220a9bea7af15ca75b4fa56f3125c580
595	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	3	3	3	3	5	\N	f	2025-10-28 17:26:08.289113	5f2c77d8e4944b5b9cd26d91f587994c	3c8ba02a15cc7e850382da44a04a1d68
596	SVC-REG-013	DEPT-004	ea_portal	\N	government	4	3	3	4	5	\N	f	2025-10-09 08:26:08.289113	0cefa67d1a772d941fb26b5e4fa8e09d	ce2b04d66d8ba622c4f64073362bf501
597	SVC-REG-013	DEPT-004	ea_portal	\N	other	3	5	4	3	4	\N	f	2025-10-21 04:26:08.289113	71995724be447516f27c4a9a96ffa047	fe341de2974c98beb0cb3b6a17ce5024
598	SVC-REG-013	DEPT-004	ea_portal	\N	other	4	5	2	5	3	Waiting time was reasonable	f	2025-11-08 08:26:08.289113	4b791b0b727a2075a20a530777ed0460	cff63d34ef4b24ab1b2d522e2184b675
599	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	3	5	4	5	5	\N	f	2025-08-30 14:26:08.289113	3ed06eac3746991a8f20f2be2d6e5717	82571f372fe3f2dfb3023274088daff9
600	SVC-REG-013	DEPT-004	ea_portal	\N	government	3	3	2	3	3	Service exceeded expectations	f	2025-10-15 10:26:08.289113	21286c13938936206e25d23cb0d3ee2b	a25bf253b8fad8771a81c70e9b51d840
601	SVC-REG-013	DEPT-004	ea_portal	\N	business	4	3	2	3	3	\N	t	2025-10-07 02:26:08.289113	ff720fbaece511d69c1e6594a400b611	3634cd6d5f0d8c7ecb395959074225f4
602	SVC-REG-013	DEPT-004	ea_portal	\N	other	4	5	4	5	5	\N	f	2025-08-23 19:26:08.289113	7f4bae2a267eec1bcd7227b6fd140468	8b0a54837768cb0eabc2f7ff4da51622
603	SVC-REG-013	DEPT-004	ea_portal	\N	government	4	4	4	4	4	\N	f	2025-09-21 23:26:08.289113	4e21f71a3899df9dbeb15cc550effef7	0ffaacc58988223f07ca96d9dd66594f
604	SVC-REG-013	DEPT-004	ea_portal	\N	government	3	3	2	4	3	Process was straightforward and efficient	f	2025-10-09 21:26:08.289113	ba8b59ceed11bf27330b4194f43ad718	d60912abe2aee39735814b28c6fe9358
605	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	3	3	3	5	3	\N	f	2025-08-23 13:26:08.289113	9de7835b67b40f99c64d7b5b35aac440	f98dc6b0b5d1f0c5c036102c24663633
606	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	3	5	4	3	3	Excellent service, very satisfied	f	2025-08-13 08:26:08.289113	e61123df8b6126d0df4908fc87be1d1c	269c1a7debd201bbb8b463d2b370268c
607	SVC-REG-013	DEPT-004	ea_portal	\N	government	3	4	4	5	5	Process needs improvement	f	2025-09-21 09:26:08.289113	2ca631ee4e0b82cfd0848b6179fef120	384bc57d0acfb0fdd9b6d350127b1db8
608	SVC-REG-013	DEPT-004	ea_portal	\N	other	4	3	4	4	3	\N	f	2025-08-28 18:26:08.289113	f45bd769ec494bf0cf0b4d4cc79a2498	7e67cec51492ff8359607dfa8be8283a
609	SVC-REG-013	DEPT-004	ea_portal	\N	government	5	4	3	5	4	\N	f	2025-08-19 18:26:08.289113	0870a1bbb5099484b4f299d7d080d289	c6eb6e6e6126fc98cde6d3092d6e6dba
610	SVC-REG-013	DEPT-004	ea_portal	\N	government	5	3	3	3	4	Documentation requirements unclear	f	2025-08-11 05:26:08.289113	a8029698ec1ec90988e6b9ec38620024	b876b2cc50dcd0ec68c8baf641596c1a
611	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	4	3	3	3	4	Would recommend this service	f	2025-10-06 10:26:08.289113	3cb96898c1fa086646ef191cc8af1cda	d483dfb198ba244f434cad810c71a18f
612	SVC-REG-013	DEPT-004	ea_portal	\N	business	3	5	3	5	4	\N	f	2025-10-26 13:26:08.289113	60e668d39579b7d1dd2a549097c53778	750c057d93c2f0f2aefd8c45d2d79547
613	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-10-04 01:26:08.289113	41da7cfb4759357fe8f442d09da014da	407130efd00a3625c3b0f90193da5cb6
614	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	3	3	4	3	4	Quick and efficient processing	f	2025-09-01 04:26:08.289113	663015fec92625ac4c38a183ff652390	f49809e7260afc6537e338ae544c2890
615	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	3	4	3	3	4	Could be faster but overall good experience	f	2025-09-05 06:26:08.289113	fbfccb98222b948c506e6b7fe682640b	a2f1416a4c03db2e859b0eca8b59b81d
616	SVC-REG-013	DEPT-004	ea_portal	\N	government	4	4	2	4	5	System had technical issues	f	2025-10-01 11:26:08.289113	bbc45e35e1f643f1c4e45e8884089b40	08b0e5518831c5f0eee6de2e23996c8a
617	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	4	5	4	5	3	Quick and efficient processing	f	2025-08-16 02:26:08.289113	4fa73740d69d432543c384f71626b47c	148a658f903a969ba9dadf9f07934243
618	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	5	4	4	3	3	\N	f	2025-09-25 22:26:08.289113	4b53662098a523460e2e6a478ddf17a0	277ae74bc10a8a7e3c7e8d662b8c16c5
619	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	3	4	4	5	5	Clear instructions provided	f	2025-10-10 00:26:08.289113	42205e0cd1b2f51e6fb4136957d4d1b0	2d73a2bec4ff8aeddca403f4bb7ff1ff
620	SVC-REG-013	DEPT-004	ea_portal	\N	business	4	4	4	4	3	Process needs improvement	f	2025-10-08 20:26:08.289113	45f5e59924171b1d68cdc20a035e803e	126f5a8458e643efc9dbbf3aa431ba7f
621	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	4	3	2	5	4	\N	f	2025-11-02 00:26:08.289113	7299ed872627882499eda17c122b59c2	ccc2daced677e7b6ff61d72cf9b217da
622	SVC-REG-013	DEPT-004	ea_portal	\N	government	5	4	2	4	3	Excellent service, very satisfied	f	2025-08-29 18:26:08.289113	22229f655aae8a05dabe68f95d792703	80d5418953fde6cbd1424f905adac1b9
623	SVC-REG-013	DEPT-004	ea_portal	\N	business	5	4	4	4	5	Staff were helpful and professional	f	2025-09-23 03:26:08.289113	ced5b015a22cf45691b0fc45543e49a5	f623d2ca14dfdb774bfc8a02723cd4a0
624	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	4	4	4	3	5	Process was straightforward and efficient	f	2025-09-21 23:26:08.289113	a4e81b826d3a9058266f513a90494657	0ad99666ef50e1baf8614b09adbb9f2a
625	SVC-REG-013	DEPT-004	ea_portal	\N	other	3	4	3	4	5	\N	f	2025-10-06 06:26:08.289113	684a8c4605be03cbf34ad882e8fa38ba	dd21346fb0c17dacbd5aa6dfd3ec9b2f
626	SVC-REG-013	DEPT-004	ea_portal	\N	other	4	4	3	4	3	Excellent service, very satisfied	f	2025-10-26 15:26:08.289113	13828247a18348002f405ea27ece51e2	bc0c0f5d6bdab2824f8e8e2a8690928b
627	SVC-REG-013	DEPT-004	ea_portal	\N	business	5	4	4	5	4	Staff need more training	f	2025-11-01 08:26:08.289113	d934a0f92bacc705219904571629228e	65c8ed612fb308ec464cba7ba24bcf3a
628	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	3	3	3	3	3	\N	f	2025-08-12 11:26:08.289113	d0197db69eef5ac15d696970d7ef20de	6e14470699d9fc9a1a8aa8947c302f9c
629	SVC-REG-013	DEPT-004	ea_portal	\N	other	4	5	2	4	3	\N	f	2025-10-20 14:26:08.289113	8b933a0908311eb73bbc03fa44cc0ea1	5dc62dc6ef8a3fa19473f04df2a219f5
630	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	5	5	3	5	5	\N	f	2025-11-05 04:26:08.289113	0b95b54835e1a7369087797fb49333b7	d16ab23651a41560ed2c4f917a9bae59
631	SVC-REG-013	DEPT-004	ea_portal	\N	government	3	3	2	4	5	Staff need more training	f	2025-11-04 21:26:08.289113	e97568a0f3da629eb7591a3a691b6426	0443cf56171bec8aba377503389e2209
632	SVC-REG-013	DEPT-004	ea_portal	\N	government	3	3	2	4	3	\N	f	2025-08-14 19:26:08.289113	82f1b054e40003c9d5f196399723c477	fa3fa2db70068f19dd5734dacdd8c98a
633	SVC-REG-013	DEPT-004	ea_portal	\N	other	5	3	2	5	5	\N	f	2025-11-02 02:26:08.289113	7dc2a5f3ea68148d6e4e57fea20be252	b8a052325f120ccca7997268e1cbe6db
634	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	5	3	4	5	3	Clear instructions provided	f	2025-09-21 11:26:08.289113	006e66ebce3fcadb1a6a19da01a35357	db83d085aec0ab7a97b891bff56bf26a
635	SVC-REG-013	DEPT-004	ea_portal	\N	government	5	5	3	3	5	Long wait times experienced	f	2025-10-03 11:26:08.289113	fc3190c4993922929d07ce0b35389c6b	cc586dd8e89af6720b8d7a0ae89a2900
636	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	5	3	3	5	4	\N	f	2025-10-15 18:26:08.289113	1e64dcf0afc36f62abe14a6651112bbf	95777564db99859e29e34179f824ac3d
637	SVC-REG-013	DEPT-004	ea_portal	\N	citizen	4	4	2	3	4	\N	f	2025-09-09 06:26:08.289113	a783a3c2292aa8e018175fc21b8cd85c	86b4ab355a3ce5393cc7c6860927f194
638	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	5	5	2	3	4	\N	f	2025-09-16 03:26:08.289113	a25ac4c3d2e083a67df1206bfe09fbba	c2266c04f632edb24ffd38ff3ba6334b
639	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	3	5	4	3	5	Process was straightforward and efficient	t	2025-08-12 05:26:08.289113	e4785f5c1318d892409a2391600f08e6	2cc1dd3193ef645588da653b42e09ada
640	SVC-REG-013	DEPT-004	ea_portal	\N	other	4	5	2	5	3	Process was straightforward and efficient	f	2025-10-04 01:26:08.289113	099b137bd6076f40a2d5e7668d4f2fb2	543efc4c31da3112d2857c48a07c4320
641	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	3	3	3	5	4	\N	f	2025-10-13 23:26:08.289113	d1400903e3637a60faafa02f8f62fa9b	cfa751d11fd5c6d285749c1bad1b7808
642	SVC-REG-013	DEPT-004	ea_portal	\N	visitor	5	4	4	4	4	\N	f	2025-09-02 06:26:08.289113	929993b0b1ecf919ea47231ac38639da	4d541339311e8b9b81f48dbfd97f084e
643	SVC-REG-013	DEPT-004	ea_portal	\N	business	3	5	4	5	5	Information was not clear	f	2025-09-27 07:26:08.289113	752795250b0fbe3ec40ab3d49248e4ba	3f8eb4f7b542955fe44f9bd7ff6b5c2c
644	SVC-REG-013	DEPT-004	ea_portal	\N	government	5	3	2	3	3	Information was not clear	f	2025-09-24 08:26:08.289113	a306359525360e3150a7491ab875d48e	edebc0adaf2c7a7ee5e3e4cce913553e
645	SVC-REG-013	DEPT-004	ea_portal	\N	business	5	4	2	4	3	\N	f	2025-09-01 21:26:08.289113	63c081d3d8a9e1051cf1d3da1f86d00e	33e9399f86faefe2029d1bad3ebb856a
646	SVC-REG-013	DEPT-004	ea_portal	\N	business	4	4	4	3	4	Process was straightforward and efficient	f	2025-10-08 18:26:08.289113	11e5871e255148e4046562c7b68ac356	3f1a249c346038d0dd3dd73c7a242e2c
647	SVC-REG-013	DEPT-004	ea_portal	\N	government	4	3	2	3	5	\N	f	2025-09-27 06:26:08.289113	008d6c9a92f7551d72777ebc48e0e36a	8d463c072505d33fa0a53b0594a3acf5
648	SVC-CUS-001	DEPT-003	ea_portal	\N	other	5	5	4	5	3	Service exceeded expectations	f	2025-10-31 05:26:08.289113	abab5f5b9340a81d66fb247c34141b35	5d160f4c764fc54869d15d7e42abed81
649	SVC-CUS-001	DEPT-003	ea_portal	\N	visitor	3	4	4	3	3	\N	f	2025-08-26 12:26:08.289113	2324a8156ff95f74296887f65ba0ef02	52408d687ae3bbab937a0ebc93bacbc9
650	SVC-CUS-001	DEPT-003	ea_portal	\N	government	4	4	3	4	4	Staff need more training	f	2025-10-05 06:26:08.289113	fc64dc95e26808b44ae3c3c4efb447de	220a9bea7af15ca75b4fa56f3125c580
692	SVC-CUS-002	DEPT-003	ea_portal	\N	government	4	4	4	3	4	\N	f	2025-10-29 22:26:08.289113	1e1dc5f4be1b15e00e309d8b3da4f4aa	a25bf253b8fad8771a81c70e9b51d840
651	SVC-CUS-001	DEPT-003	ea_portal	\N	other	4	3	4	5	5	Excellent service, very satisfied	f	2025-08-27 07:26:08.289113	f954d54953beb38b96e3af203e5cf09d	3c8ba02a15cc7e850382da44a04a1d68
652	SVC-CUS-001	DEPT-003	ea_portal	\N	government	3	4	2	5	4	Excellent service, very satisfied	f	2025-09-02 07:26:08.289113	35270532ee5a36e4d4f855c63541a250	ce2b04d66d8ba622c4f64073362bf501
653	SVC-CUS-001	DEPT-003	ea_portal	\N	citizen	4	3	2	5	3	\N	f	2025-08-15 17:26:08.289113	34cfbef250e43bd13febe595c61156ad	fe341de2974c98beb0cb3b6a17ce5024
654	SVC-CUS-001	DEPT-003	ea_portal	\N	business	3	3	3	5	5	\N	f	2025-08-18 13:26:08.289113	b69ebb8a235d4cc217ed9000169d841e	cff63d34ef4b24ab1b2d522e2184b675
655	SVC-CUS-001	DEPT-003	ea_portal	\N	citizen	4	4	3	3	5	\N	f	2025-10-26 04:26:08.289113	5e5ab295dc793ee7438eede7f6294275	82571f372fe3f2dfb3023274088daff9
656	SVC-CUS-001	DEPT-003	ea_portal	\N	citizen	3	4	3	5	4	System had technical issues	f	2025-09-28 04:26:08.289113	7cc09c1b04c36d9e170f3f2673c0b3a1	a25bf253b8fad8771a81c70e9b51d840
657	SVC-CUS-001	DEPT-003	ea_portal	\N	other	3	4	4	4	4	\N	f	2025-11-05 15:26:08.289113	4964f492293705690341149328e6aaf0	3634cd6d5f0d8c7ecb395959074225f4
658	SVC-CUS-001	DEPT-003	ea_portal	\N	visitor	5	4	2	3	3	\N	f	2025-09-30 02:26:08.289113	32c1fecd2bbd3d5686764a896da3ce7e	8b0a54837768cb0eabc2f7ff4da51622
659	SVC-CUS-001	DEPT-003	ea_portal	\N	other	3	4	4	4	4	\N	f	2025-10-13 00:26:08.289113	518a721c3ae9ae9e412d05b4c85de645	0ffaacc58988223f07ca96d9dd66594f
660	SVC-CUS-001	DEPT-003	ea_portal	\N	business	4	3	3	3	4	\N	f	2025-08-19 23:26:08.289113	5665a483312d32d8bf10eb44922bcfbe	d60912abe2aee39735814b28c6fe9358
661	SVC-CUS-001	DEPT-003	ea_portal	\N	citizen	3	3	4	4	3	Staff need more training	f	2025-10-21 20:26:08.289113	b3c843606b091b19f6c3f49a2c7a2eb4	f98dc6b0b5d1f0c5c036102c24663633
662	SVC-CUS-001	DEPT-003	ea_portal	\N	other	4	4	4	3	4	Process was straightforward and efficient	f	2025-09-02 04:26:08.289113	e9f6365af6ea25f9eda49a999e02169f	269c1a7debd201bbb8b463d2b370268c
663	SVC-CUS-001	DEPT-003	ea_portal	\N	other	5	3	3	5	5	\N	f	2025-08-28 17:26:08.289113	9ee0b8da8759e0942f046324ca167cea	384bc57d0acfb0fdd9b6d350127b1db8
664	SVC-CUS-001	DEPT-003	ea_portal	\N	government	5	5	2	3	5	\N	f	2025-11-01 00:26:08.289113	6409249634deb290f26585d7b4e18a4f	7e67cec51492ff8359607dfa8be8283a
665	SVC-CUS-001	DEPT-003	ea_portal	\N	government	4	5	3	4	3	\N	f	2025-10-14 18:26:08.289113	8a254ae2257e2ddbe698a1ad551d48d4	c6eb6e6e6126fc98cde6d3092d6e6dba
666	SVC-CUS-001	DEPT-003	ea_portal	\N	visitor	5	4	3	5	3	\N	f	2025-09-17 02:26:08.289113	cfd04c13c349e80b1d087714779f0756	b876b2cc50dcd0ec68c8baf641596c1a
667	SVC-CUS-001	DEPT-003	ea_portal	\N	business	4	4	3	4	3	Staff need more training	f	2025-09-03 02:26:08.289113	78f9741e29a7085537f9ba4d5f58d49f	d483dfb198ba244f434cad810c71a18f
668	SVC-CUS-001	DEPT-003	ea_portal	\N	visitor	4	3	3	3	3	Documentation requirements unclear	f	2025-08-19 04:26:08.289113	1dea0efad756f450e7442fa9f9c14d8a	750c057d93c2f0f2aefd8c45d2d79547
669	SVC-CUS-001	DEPT-003	ea_portal	\N	government	3	3	2	5	5	\N	f	2025-09-05 08:26:08.289113	01017382d14e79ed11cd0a9d86b12255	407130efd00a3625c3b0f90193da5cb6
670	SVC-CUS-001	DEPT-003	ea_portal	\N	citizen	3	3	4	3	5	\N	f	2025-09-28 15:26:08.289113	a0459b26ee57b0ace3a8d8e82541f702	f49809e7260afc6537e338ae544c2890
671	SVC-CUS-001	DEPT-003	ea_portal	\N	government	4	4	4	3	3	\N	f	2025-09-29 03:26:08.289113	db607c57e9016cea3cb4792d71bf0019	a2f1416a4c03db2e859b0eca8b59b81d
672	SVC-CUS-001	DEPT-003	ea_portal	\N	government	4	3	3	3	4	Service exceeded expectations	f	2025-09-09 08:26:08.289113	ef4095a1c7a8f9e964eb29904b1f6f2f	08b0e5518831c5f0eee6de2e23996c8a
673	SVC-CUS-001	DEPT-003	ea_portal	\N	business	4	3	4	4	3	\N	f	2025-09-23 09:26:08.289113	dc754e94bcc5992a8b8c7bf442bd7c06	148a658f903a969ba9dadf9f07934243
674	SVC-CUS-001	DEPT-003	ea_portal	\N	other	5	5	2	4	4	\N	f	2025-08-19 09:26:08.289113	76f3b279b3ea95c382eca14431291273	277ae74bc10a8a7e3c7e8d662b8c16c5
675	SVC-CUS-001	DEPT-003	ea_portal	\N	citizen	5	5	2	3	5	Excellent service, very satisfied	f	2025-11-07 06:26:08.289113	ab04b24cd1617a9de7fe2aba94b67e59	2d73a2bec4ff8aeddca403f4bb7ff1ff
676	SVC-CUS-001	DEPT-003	ea_portal	\N	citizen	4	4	3	4	4	\N	f	2025-09-04 04:26:08.289113	edfee0264d434e46b0ee4c6c6e72140b	126f5a8458e643efc9dbbf3aa431ba7f
677	SVC-CUS-001	DEPT-003	ea_portal	\N	business	4	4	2	3	3	Clear instructions provided	t	2025-10-03 21:26:08.289113	4320806cccb85fe3a59056c862a6c322	ccc2daced677e7b6ff61d72cf9b217da
678	SVC-CUS-001	DEPT-003	ea_portal	\N	business	4	5	2	3	5	\N	f	2025-09-03 09:26:08.289113	187d6dacbe361fd10d2f260ab2ed9784	80d5418953fde6cbd1424f905adac1b9
679	SVC-CUS-001	DEPT-003	ea_portal	\N	other	3	3	4	4	3	Staff need more training	f	2025-10-26 21:26:08.289113	df7b7de2a6052a63548a61457be091b0	f623d2ca14dfdb774bfc8a02723cd4a0
680	SVC-CUS-001	DEPT-003	ea_portal	\N	business	3	3	4	5	5	\N	f	2025-08-27 14:26:08.289113	e025d8c475b6218ab0b4b81f226f28b8	0ad99666ef50e1baf8614b09adbb9f2a
681	SVC-CUS-001	DEPT-003	ea_portal	\N	other	3	5	2	3	5	\N	f	2025-10-11 08:26:08.289113	172dd38e5d100c25731d9c5949e97f86	dd21346fb0c17dacbd5aa6dfd3ec9b2f
682	SVC-CUS-001	DEPT-003	ea_portal	\N	visitor	4	4	3	4	3	Online portal works well	t	2025-09-11 23:26:08.289113	3914e4651dd8ecffb98e468e9b0f4238	bc0c0f5d6bdab2824f8e8e2a8690928b
683	SVC-CUS-001	DEPT-003	ea_portal	\N	citizen	3	4	3	4	3	\N	f	2025-10-31 21:26:08.289113	92cf1b68bb768c7bb4b6c2865d2ee67c	65c8ed612fb308ec464cba7ba24bcf3a
684	SVC-CUS-002	DEPT-003	ea_portal	\N	government	5	4	3	5	4	\N	f	2025-09-05 12:26:08.289113	46fbcb969c03cf28e99b2c8d57e825e3	5d160f4c764fc54869d15d7e42abed81
685	SVC-CUS-002	DEPT-003	ea_portal	\N	other	4	3	4	3	4	\N	f	2025-10-11 20:26:08.289113	f0588fad2ea64682fb9c50ce8f6267ea	52408d687ae3bbab937a0ebc93bacbc9
686	SVC-CUS-002	DEPT-003	ea_portal	\N	business	4	5	3	5	3	\N	t	2025-10-09 16:26:08.289113	e35c340867bde091a21033411853d47a	220a9bea7af15ca75b4fa56f3125c580
687	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	4	4	4	3	3	Long wait times experienced	f	2025-08-23 01:26:08.289113	954d01aa1d60ae0fa14884e4c2a0c73f	3c8ba02a15cc7e850382da44a04a1d68
688	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	3	4	4	4	5	\N	f	2025-09-23 04:26:08.289113	3014335e7e72ae8eba23f00558c19b2f	ce2b04d66d8ba622c4f64073362bf501
689	SVC-CUS-002	DEPT-003	ea_portal	\N	other	5	4	3	5	4	\N	f	2025-08-22 02:26:08.289113	bc6dd7108e6faf28c6578954f6e25156	fe341de2974c98beb0cb3b6a17ce5024
690	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	5	4	3	5	3	\N	f	2025-11-04 02:26:08.289113	9d938354e10e8499ed711b754e8e2926	cff63d34ef4b24ab1b2d522e2184b675
691	SVC-CUS-002	DEPT-003	ea_portal	\N	other	4	3	2	3	3	Excellent service, very satisfied	f	2025-09-08 15:26:08.289113	5b752712b2df89fc93cf9f107e073a18	82571f372fe3f2dfb3023274088daff9
693	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	4	5	4	5	3	\N	f	2025-09-08 09:26:08.289113	d2d8778e5d8a58ca1b5983826c86e6d1	3634cd6d5f0d8c7ecb395959074225f4
694	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	5	5	2	5	3	\N	f	2025-10-10 11:26:08.289113	03da8f575e14edf6da17858a58196bc5	8b0a54837768cb0eabc2f7ff4da51622
695	SVC-CUS-002	DEPT-003	ea_portal	\N	other	4	5	4	4	5	\N	f	2025-10-08 07:26:08.289113	32eaaa060b2236ccc56770cb30c15914	0ffaacc58988223f07ca96d9dd66594f
696	SVC-CUS-002	DEPT-003	ea_portal	\N	business	3	4	4	4	4	\N	t	2025-08-28 00:26:08.289113	62fa8cd47d44d379fd21543b1fd0e5a2	d60912abe2aee39735814b28c6fe9358
697	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	5	4	2	5	3	\N	f	2025-09-24 11:26:08.289113	cd56226f8050278d29dcf17b5fff10bd	f98dc6b0b5d1f0c5c036102c24663633
698	SVC-CUS-002	DEPT-003	ea_portal	\N	other	3	4	3	5	3	\N	f	2025-08-18 14:26:08.289113	0d04e508af83a8ae88b900002d732d4e	269c1a7debd201bbb8b463d2b370268c
699	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	4	5	4	3	3	\N	f	2025-11-07 10:26:08.289113	a4baba0e77249eb0d2c2aadf5fefe657	384bc57d0acfb0fdd9b6d350127b1db8
700	SVC-CUS-002	DEPT-003	ea_portal	\N	business	3	5	4	5	3	\N	f	2025-10-15 14:26:08.289113	bb513c55e474577530ad18a75cb07d8f	7e67cec51492ff8359607dfa8be8283a
701	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	4	4	4	4	4	\N	f	2025-09-19 10:26:08.289113	ace699f5049db05ce1a7aa7560073b9e	c6eb6e6e6126fc98cde6d3092d6e6dba
702	SVC-CUS-002	DEPT-003	ea_portal	\N	business	3	3	2	3	5	\N	f	2025-08-23 10:26:08.289113	381eb23df7bc8cdb997df46c357e1863	b876b2cc50dcd0ec68c8baf641596c1a
703	SVC-CUS-002	DEPT-003	ea_portal	\N	business	3	3	4	5	5	Process was straightforward and efficient	f	2025-11-08 17:26:08.289113	bb34562b8aa581f365ef3a0f11b919e8	d483dfb198ba244f434cad810c71a18f
704	SVC-CUS-002	DEPT-003	ea_portal	\N	government	3	5	3	3	3	Quick and efficient processing	f	2025-10-06 19:26:08.289113	f8d127ad8e1ca882beced2850b85ec3b	750c057d93c2f0f2aefd8c45d2d79547
705	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	4	4	4	5	4	\N	f	2025-10-08 11:26:08.289113	8d3be0a6c18a651336805594d17c590c	407130efd00a3625c3b0f90193da5cb6
706	SVC-CUS-002	DEPT-003	ea_portal	\N	government	5	5	3	3	5	\N	f	2025-08-11 01:26:08.289113	1a8a2fecb8c525b17a77da0a26740b92	f49809e7260afc6537e338ae544c2890
707	SVC-CUS-002	DEPT-003	ea_portal	\N	government	4	5	4	5	5	\N	f	2025-09-04 05:26:08.289113	99082d2b2f3a48122b09fc7abc437aa6	a2f1416a4c03db2e859b0eca8b59b81d
708	SVC-CUS-002	DEPT-003	ea_portal	\N	business	4	4	3	4	4	Clear instructions provided	f	2025-09-23 10:26:08.289113	1706235024064b3f1a487d54e469a550	08b0e5518831c5f0eee6de2e23996c8a
709	SVC-CUS-002	DEPT-003	ea_portal	\N	business	4	4	2	4	3	\N	f	2025-09-08 14:26:08.289113	70f24987edf251cb4c0fa37d83ac44b8	148a658f903a969ba9dadf9f07934243
710	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	5	5	2	3	4	Documentation requirements unclear	t	2025-08-14 19:26:08.289113	2c6f67ac5393c54966c27768e831785c	277ae74bc10a8a7e3c7e8d662b8c16c5
711	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	3	4	3	4	4	\N	f	2025-08-19 10:26:08.289113	3a2fde6500791706432b4547802da675	2d73a2bec4ff8aeddca403f4bb7ff1ff
712	SVC-CUS-002	DEPT-003	ea_portal	\N	other	3	5	3	5	3	\N	f	2025-10-28 16:26:08.289113	e7faca81dee250423ef3761479307ca4	126f5a8458e643efc9dbbf3aa431ba7f
713	SVC-CUS-002	DEPT-003	ea_portal	\N	business	4	5	2	4	4	\N	f	2025-09-10 15:26:08.289113	e310098eff33671b9df4b7865a761165	ccc2daced677e7b6ff61d72cf9b217da
714	SVC-CUS-002	DEPT-003	ea_portal	\N	government	5	5	4	3	4	\N	f	2025-10-02 19:26:08.289113	eafc9f705f2f2aadab11f1f8a7299d17	80d5418953fde6cbd1424f905adac1b9
715	SVC-CUS-002	DEPT-003	ea_portal	\N	other	3	5	3	4	5	\N	f	2025-09-12 11:26:08.289113	7d07e81ffcaed59fcfcbefcd88329f3f	f623d2ca14dfdb774bfc8a02723cd4a0
716	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	3	4	2	4	3	Online portal works well	f	2025-09-09 13:26:08.289113	f2277294963122420937db22d675c1be	0ad99666ef50e1baf8614b09adbb9f2a
717	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	4	3	3	4	4	\N	t	2025-09-11 14:26:08.289113	646390308aceaeec47864e6117659a11	dd21346fb0c17dacbd5aa6dfd3ec9b2f
718	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	4	4	4	4	5	\N	f	2025-10-14 13:26:08.289113	f4356838e58210f999f0c76bb3505ee3	bc0c0f5d6bdab2824f8e8e2a8690928b
719	SVC-CUS-002	DEPT-003	ea_portal	\N	other	4	4	4	3	3	\N	f	2025-11-03 05:26:08.289113	d4cadefd37da4b49fa2875ebbbc989df	65c8ed612fb308ec464cba7ba24bcf3a
720	SVC-CUS-002	DEPT-003	ea_portal	\N	government	3	4	2	3	3	\N	f	2025-10-04 16:26:08.289113	6d99a18528756f6c427f8666bfc7dc9e	6e14470699d9fc9a1a8aa8947c302f9c
721	SVC-CUS-002	DEPT-003	ea_portal	\N	business	4	3	3	4	3	\N	f	2025-09-19 02:26:08.289113	6eede9c9f029595043acd58c917c16f8	5dc62dc6ef8a3fa19473f04df2a219f5
722	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	3	5	3	3	5	\N	f	2025-11-04 22:26:08.289113	a9460bb09aba783764cfae2c7ede0db1	d16ab23651a41560ed2c4f917a9bae59
723	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	3	3	4	5	5	Documentation requirements unclear	f	2025-11-08 15:26:08.289113	94e353899446f77412ed271693307f25	0443cf56171bec8aba377503389e2209
724	SVC-CUS-002	DEPT-003	ea_portal	\N	other	4	3	2	4	3	\N	f	2025-10-28 07:26:08.289113	dc89447988fd2d37969d32738ae9bcf5	fa3fa2db70068f19dd5734dacdd8c98a
725	SVC-CUS-002	DEPT-003	ea_portal	\N	business	4	5	3	5	3	\N	t	2025-08-17 08:26:08.289113	3c3a8b2b7f67ba8bd7d390997f7a476a	b8a052325f120ccca7997268e1cbe6db
726	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	5	3	2	4	4	\N	t	2025-10-30 15:26:08.289113	1c17c8e4e5a1098f74b26eb1fd5bcb04	db83d085aec0ab7a97b891bff56bf26a
727	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	4	5	3	5	4	Process needs improvement	f	2025-10-17 08:26:08.289113	09e16780e481b9c66409b7d911234ae5	cc586dd8e89af6720b8d7a0ae89a2900
728	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	5	3	4	5	4	\N	f	2025-09-02 06:26:08.289113	7beac4000c233ba9de9a1c57d75800b5	95777564db99859e29e34179f824ac3d
729	SVC-CUS-002	DEPT-003	ea_portal	\N	business	4	4	2	3	4	\N	f	2025-11-01 14:26:08.289113	183e378ddac66e34d52c1cd2cc1d14db	86b4ab355a3ce5393cc7c6860927f194
730	SVC-CUS-002	DEPT-003	ea_portal	\N	other	4	3	3	5	5	\N	f	2025-08-28 11:26:08.289113	5deccfc2a8754195a74cce6d1d2515c7	c2266c04f632edb24ffd38ff3ba6334b
731	SVC-CUS-002	DEPT-003	ea_portal	\N	government	3	5	2	3	4	\N	f	2025-09-01 08:26:08.289113	1be02264f5733ba6ff6c8c18d8175dde	2cc1dd3193ef645588da653b42e09ada
732	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	5	3	4	5	4	Quick and efficient processing	f	2025-10-07 05:26:08.289113	5365318260b09e02ed5e5423f23dd57a	543efc4c31da3112d2857c48a07c4320
733	SVC-CUS-002	DEPT-003	ea_portal	\N	government	3	4	2	5	5	Documentation requirements unclear	f	2025-10-19 19:26:08.289113	956b41c35b2cbaa41a5df4788078741c	cfa751d11fd5c6d285749c1bad1b7808
775	SVC-HLT-001	DEPT-005	ea_portal	\N	other	5	5	4	4	5	\N	f	2025-10-09 19:26:08.289113	50293c2667197d05cec9a9a63c970aed	fe341de2974c98beb0cb3b6a17ce5024
734	SVC-CUS-002	DEPT-003	ea_portal	\N	business	3	4	4	3	5	System was easy to use	f	2025-09-17 04:26:08.289113	612d0203206fe56a724a9caf93fbff6d	4d541339311e8b9b81f48dbfd97f084e
735	SVC-CUS-002	DEPT-003	ea_portal	\N	business	4	5	3	3	4	Service exceeded expectations	f	2025-10-19 18:26:08.289113	a0e7672c924f33bf835ba6dd730fbaf9	3f8eb4f7b542955fe44f9bd7ff6b5c2c
736	SVC-CUS-002	DEPT-003	ea_portal	\N	citizen	3	4	4	5	3	\N	f	2025-08-27 20:26:08.289113	2512eade9262bfe0acd91b043b99bbbe	edebc0adaf2c7a7ee5e3e4cce913553e
737	SVC-CUS-002	DEPT-003	ea_portal	\N	business	5	4	2	4	4	\N	f	2025-10-06 17:26:08.289113	5e501770a760845adb2381b4c479b605	33e9399f86faefe2029d1bad3ebb856a
738	SVC-CUS-002	DEPT-003	ea_portal	\N	visitor	4	3	3	5	4	Could be faster but overall good experience	f	2025-08-18 19:26:08.289113	0305950c74ea4962d4160a63d9a9a67b	3f1a249c346038d0dd3dd73c7a242e2c
739	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	4	3	2	3	3	\N	f	2025-09-26 08:26:08.289113	be7bba03d690914d29807af221d074e5	5d160f4c764fc54869d15d7e42abed81
740	SVC-CUS-003	DEPT-003	ea_portal	\N	government	5	5	4	4	4	\N	f	2025-09-28 11:26:08.289113	bddc82e9a9dd1d28720e55509f2a331b	52408d687ae3bbab937a0ebc93bacbc9
741	SVC-CUS-003	DEPT-003	ea_portal	\N	other	3	5	2	4	5	Forms were confusing	f	2025-10-02 15:26:08.289113	de4fe12c32b9e35eb8afdc07625f3bf8	220a9bea7af15ca75b4fa56f3125c580
742	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	3	3	2	3	5	Would recommend this service	f	2025-10-08 09:26:08.289113	89ae3bbb01028aa012c5b885ea5ca00c	3c8ba02a15cc7e850382da44a04a1d68
743	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	4	4	4	5	4	\N	f	2025-10-15 17:26:08.289113	8a2d903732be15bf88cabc805e9ca466	ce2b04d66d8ba622c4f64073362bf501
744	SVC-CUS-003	DEPT-003	ea_portal	\N	government	4	3	2	5	4	\N	t	2025-10-14 01:26:08.289113	a6fed524e4b93a1d29a3194a103120e0	fe341de2974c98beb0cb3b6a17ce5024
745	SVC-CUS-003	DEPT-003	ea_portal	\N	visitor	3	3	4	5	4	\N	f	2025-10-12 09:26:08.289113	be031f0b288a9e17f764e7b2af8bcdb9	cff63d34ef4b24ab1b2d522e2184b675
746	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	3	3	3	4	4	\N	f	2025-11-05 20:26:08.289113	f4e72b60336a1d0638925250bdeac25b	82571f372fe3f2dfb3023274088daff9
747	SVC-CUS-003	DEPT-003	ea_portal	\N	other	3	4	4	5	5	Staff need more training	f	2025-09-13 06:26:08.289113	c5b096b1d0910e7459d934acb2e771fd	a25bf253b8fad8771a81c70e9b51d840
748	SVC-CUS-003	DEPT-003	ea_portal	\N	government	3	5	3	5	3	\N	f	2025-09-15 17:26:08.289113	01d124eda5ba83764464619734cd1a1a	3634cd6d5f0d8c7ecb395959074225f4
749	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	5	5	2	5	3	\N	f	2025-08-17 18:26:08.289113	87bd82da222346d231af1ec1917276f6	8b0a54837768cb0eabc2f7ff4da51622
750	SVC-CUS-003	DEPT-003	ea_portal	\N	other	4	4	3	4	5	\N	f	2025-09-24 19:26:08.289113	6bcdc6ed447b07552991ae36eb1445e4	0ffaacc58988223f07ca96d9dd66594f
751	SVC-CUS-003	DEPT-003	ea_portal	\N	other	3	5	4	5	3	Forms were confusing	f	2025-08-17 10:26:08.289113	71e4622442c173b396f5ddd943e464ca	d60912abe2aee39735814b28c6fe9358
752	SVC-CUS-003	DEPT-003	ea_portal	\N	other	4	4	2	3	5	Would recommend this service	f	2025-10-29 08:26:08.289113	015f4f9eb2b403d869a2dca7d75a0cac	f98dc6b0b5d1f0c5c036102c24663633
753	SVC-CUS-003	DEPT-003	ea_portal	\N	visitor	4	5	3	4	5	Quick and efficient processing	f	2025-10-15 17:26:08.289113	4da82bc3b4f3b6b82f468db1caa6fb63	269c1a7debd201bbb8b463d2b370268c
754	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	4	5	4	5	5	\N	f	2025-11-06 18:26:08.289113	66f494889fb358c4eb12f058b31f6fc7	384bc57d0acfb0fdd9b6d350127b1db8
755	SVC-CUS-003	DEPT-003	ea_portal	\N	visitor	5	4	3	4	4	\N	f	2025-09-27 21:26:08.289113	b78e3bffb136357774c42bcd77e5ab50	7e67cec51492ff8359607dfa8be8283a
756	SVC-CUS-003	DEPT-003	ea_portal	\N	visitor	5	4	4	4	5	Forms were confusing	f	2025-08-25 12:26:08.289113	fb7ebfaad03d3e37e274aa6a34696fe2	c6eb6e6e6126fc98cde6d3092d6e6dba
757	SVC-CUS-003	DEPT-003	ea_portal	\N	government	5	3	4	4	5	\N	t	2025-10-24 04:26:08.289113	3514d80ac5d499d5d19eb031402c4ce0	b876b2cc50dcd0ec68c8baf641596c1a
758	SVC-CUS-003	DEPT-003	ea_portal	\N	business	4	4	4	3	5	\N	f	2025-08-13 05:26:08.289113	b7c7d4375436cabfed52d31d7f87f966	d483dfb198ba244f434cad810c71a18f
759	SVC-CUS-003	DEPT-003	ea_portal	\N	business	3	5	4	3	4	\N	f	2025-10-03 03:26:08.289113	40e197dd9a3ed27d35f28b2fd4a29918	750c057d93c2f0f2aefd8c45d2d79547
760	SVC-CUS-003	DEPT-003	ea_portal	\N	business	4	4	3	5	3	Staff were helpful and professional	f	2025-11-01 03:26:08.289113	5138c55c408ca8414df0098a27bfcc5f	407130efd00a3625c3b0f90193da5cb6
761	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	5	4	4	5	5	\N	f	2025-10-22 21:26:08.289113	038ff2a791ac489a4963e27e5ef10a38	f49809e7260afc6537e338ae544c2890
762	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	4	5	3	5	3	\N	f	2025-10-07 14:26:08.289113	da37791af84349f9895bec2a7e12cbbe	a2f1416a4c03db2e859b0eca8b59b81d
763	SVC-CUS-003	DEPT-003	ea_portal	\N	visitor	5	3	3	5	3	Would recommend this service	f	2025-09-30 19:26:08.289113	6b77be7b0b037cf05579c51f00d077bd	08b0e5518831c5f0eee6de2e23996c8a
764	SVC-CUS-003	DEPT-003	ea_portal	\N	other	5	5	4	5	4	Online portal works well	f	2025-10-13 23:26:08.289113	972cd6b540c94a0ca8ba0d0f0e82ae3d	148a658f903a969ba9dadf9f07934243
765	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	4	3	3	5	4	\N	f	2025-10-25 13:26:08.289113	ee3f47ef57b0278c81c82a5648b54fa1	277ae74bc10a8a7e3c7e8d662b8c16c5
766	SVC-CUS-003	DEPT-003	ea_portal	\N	government	3	5	4	4	4	\N	f	2025-08-14 12:26:08.289113	c970fb92b481e8a537168e0f44d83bbd	2d73a2bec4ff8aeddca403f4bb7ff1ff
767	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	3	4	3	3	4	Documentation requirements unclear	f	2025-08-21 06:26:08.289113	dd05f026ec11dd5bb5435ebc2438849a	126f5a8458e643efc9dbbf3aa431ba7f
768	SVC-CUS-003	DEPT-003	ea_portal	\N	citizen	3	5	2	4	5	System was easy to use	f	2025-09-05 05:26:08.289113	8be1909c88940c56d20a487f7ececd80	ccc2daced677e7b6ff61d72cf9b217da
769	SVC-CUS-003	DEPT-003	ea_portal	\N	visitor	3	5	4	5	4	\N	f	2025-10-30 13:26:08.289113	c02e65cc7c88bd4d0140a36f7caf1abe	80d5418953fde6cbd1424f905adac1b9
770	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	4	5	3	4	3	\N	f	2025-08-18 01:26:08.289113	e97a59e18984e86714b5e905753eedd1	5d160f4c764fc54869d15d7e42abed81
771	SVC-HLT-001	DEPT-005	ea_portal	\N	other	4	3	4	5	5	\N	f	2025-11-06 00:26:08.289113	f5915a8fee7a14c3e1e6717819a66fca	52408d687ae3bbab937a0ebc93bacbc9
772	SVC-HLT-001	DEPT-005	ea_portal	\N	business	5	4	2	3	4	\N	f	2025-08-28 09:26:08.289113	7dac870dfde896891096e56bf2b532c3	220a9bea7af15ca75b4fa56f3125c580
773	SVC-HLT-001	DEPT-005	ea_portal	\N	visitor	4	5	2	3	4	\N	f	2025-08-17 18:26:08.289113	c0c1ed2b3168842fbd4c79a2ac650c26	3c8ba02a15cc7e850382da44a04a1d68
774	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	3	4	4	5	5	\N	f	2025-11-03 08:26:08.289113	cb897fd24713434e0f3d0b7f8054a10b	ce2b04d66d8ba622c4f64073362bf501
776	SVC-HLT-001	DEPT-005	ea_portal	\N	business	5	5	2	3	4	\N	f	2025-08-22 00:26:08.289113	574c20a6027ed914d04c21bce6bf0b46	cff63d34ef4b24ab1b2d522e2184b675
777	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	4	4	2	4	4	Could be faster but overall good experience	t	2025-10-22 19:26:08.289113	2a405c10970bf9432ecc161ed33ae5a5	82571f372fe3f2dfb3023274088daff9
778	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	4	4	2	3	3	\N	f	2025-10-07 12:26:08.289113	650138eb99d5dd0a00bae147a28cf354	a25bf253b8fad8771a81c70e9b51d840
779	SVC-HLT-001	DEPT-005	ea_portal	\N	government	5	4	2	4	3	Long wait times experienced	f	2025-09-10 00:26:08.289113	8a78551666593dfa8de57f7d1fea463c	3634cd6d5f0d8c7ecb395959074225f4
780	SVC-HLT-001	DEPT-005	ea_portal	\N	visitor	5	4	3	4	5	Could be faster but overall good experience	f	2025-09-01 00:26:08.289113	6efa83fdd8696f0bddef1453ad13d40f	8b0a54837768cb0eabc2f7ff4da51622
781	SVC-HLT-001	DEPT-005	ea_portal	\N	government	4	5	3	3	3	\N	f	2025-09-14 11:26:08.289113	60c0c4ca7f847ee48f05b99822c18258	0ffaacc58988223f07ca96d9dd66594f
782	SVC-HLT-001	DEPT-005	ea_portal	\N	government	5	4	3	3	5	\N	f	2025-08-21 21:26:08.289113	b3ddc940e42aefa2d17254981263f25f	d60912abe2aee39735814b28c6fe9358
783	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	5	5	2	3	5	\N	f	2025-10-26 02:26:08.289113	25bb7847fb91df67e0ababc2156b56a6	f98dc6b0b5d1f0c5c036102c24663633
784	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	4	5	4	4	4	Could be faster but overall good experience	f	2025-08-28 09:26:08.289113	d08f987681982ea8e92750bb0ea16102	269c1a7debd201bbb8b463d2b370268c
785	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	3	3	3	3	5	Process needs improvement	f	2025-08-22 15:26:08.289113	af1854fc92d176f9bddb0a4b69d010cb	384bc57d0acfb0fdd9b6d350127b1db8
786	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	4	4	3	5	3	\N	f	2025-10-27 12:26:08.289113	eb1ee4dcd8a0daa71cae9872dcff116d	7e67cec51492ff8359607dfa8be8283a
787	SVC-HLT-001	DEPT-005	ea_portal	\N	other	4	5	2	5	5	Could be faster but overall good experience	t	2025-08-13 08:26:08.289113	47203075c11d51fef3c5bbc6e0c0c250	c6eb6e6e6126fc98cde6d3092d6e6dba
788	SVC-HLT-001	DEPT-005	ea_portal	\N	visitor	3	5	4	3	3	\N	f	2025-11-01 12:26:08.289113	bf9fed1a78bebe0bcf2af296c644f40f	b876b2cc50dcd0ec68c8baf641596c1a
789	SVC-HLT-001	DEPT-005	ea_portal	\N	other	4	4	2	5	3	\N	f	2025-10-01 06:26:08.289113	8f903472f2e6dde79afae12f4da8dc42	d483dfb198ba244f434cad810c71a18f
790	SVC-HLT-001	DEPT-005	ea_portal	\N	other	5	3	3	3	3	\N	f	2025-10-20 17:26:08.289113	396d9fe9743672d57243a05d98c884a9	750c057d93c2f0f2aefd8c45d2d79547
791	SVC-HLT-001	DEPT-005	ea_portal	\N	government	4	3	3	3	5	\N	t	2025-09-04 12:26:08.289113	10ea57e7e4edc1aba0317bfc2efaac92	407130efd00a3625c3b0f90193da5cb6
792	SVC-HLT-001	DEPT-005	ea_portal	\N	government	5	5	2	5	5	Staff need more training	f	2025-10-06 08:26:08.289113	d83f98c4a6d74a16a791c2acf989bafa	f49809e7260afc6537e338ae544c2890
793	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	5	3	3	4	4	\N	f	2025-10-14 10:26:08.289113	a8c4d5801dea54603e79c9030f7b567d	a2f1416a4c03db2e859b0eca8b59b81d
794	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	4	5	4	3	5	Quick and efficient processing	f	2025-09-21 00:26:08.289113	718e51a0899b68979ab28ec393388e33	08b0e5518831c5f0eee6de2e23996c8a
795	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	5	3	3	5	5	Forms were confusing	f	2025-09-28 09:26:08.289113	428fd38666b4f4ff0fabc2974867f30e	148a658f903a969ba9dadf9f07934243
796	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	4	3	2	5	3	Excellent service, very satisfied	f	2025-08-26 21:26:08.289113	361da59979fe30c2245cbe59c49f7c6f	277ae74bc10a8a7e3c7e8d662b8c16c5
797	SVC-HLT-001	DEPT-005	ea_portal	\N	business	5	5	4	3	5	Process was straightforward and efficient	f	2025-10-29 11:26:08.289113	9298165213202908386a372569929655	2d73a2bec4ff8aeddca403f4bb7ff1ff
798	SVC-HLT-001	DEPT-005	ea_portal	\N	business	4	3	2	4	5	\N	f	2025-08-28 23:26:08.289113	2bfca9456941693da0016f4a4019dec6	126f5a8458e643efc9dbbf3aa431ba7f
799	SVC-HLT-001	DEPT-005	ea_portal	\N	visitor	3	3	2	3	4	Quick and efficient processing	f	2025-10-10 23:26:08.289113	fd4582984bc7056667c5ee2de1357181	ccc2daced677e7b6ff61d72cf9b217da
800	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	3	4	4	3	4	\N	f	2025-09-02 02:26:08.289113	f1d618a5a784a895c3e03018e978a01e	80d5418953fde6cbd1424f905adac1b9
801	SVC-HLT-001	DEPT-005	ea_portal	\N	other	4	3	4	5	5	Staff were helpful and professional	f	2025-11-07 18:26:08.289113	d48931dd2fbebc06d07d352857f6d5b8	f623d2ca14dfdb774bfc8a02723cd4a0
802	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	3	4	2	4	4	\N	f	2025-08-25 15:26:08.289113	e2a9060e3f370a094987050e8ff07234	0ad99666ef50e1baf8614b09adbb9f2a
803	SVC-HLT-001	DEPT-005	ea_portal	\N	business	3	3	2	3	3	Process was straightforward and efficient	f	2025-10-21 23:26:08.289113	1d984ef98fdffc0f69038974d6644e3a	dd21346fb0c17dacbd5aa6dfd3ec9b2f
804	SVC-HLT-001	DEPT-005	ea_portal	\N	visitor	5	5	2	3	5	Clear instructions provided	f	2025-10-30 07:26:08.289113	c3beff3409b489e30899b4df044f270d	bc0c0f5d6bdab2824f8e8e2a8690928b
805	SVC-HLT-001	DEPT-005	ea_portal	\N	government	3	4	3	4	5	Process was straightforward and efficient	f	2025-10-28 22:26:08.289113	6670348c9886038bfb5a24e434c15985	65c8ed612fb308ec464cba7ba24bcf3a
806	SVC-HLT-001	DEPT-005	ea_portal	\N	other	4	4	4	3	5	Quick and efficient processing	f	2025-09-26 05:26:08.289113	1341b38c00f8c9f64feaeff4ddfb8915	6e14470699d9fc9a1a8aa8947c302f9c
807	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	4	4	4	5	5	\N	f	2025-09-06 12:26:08.289113	f4884f8140acc1c2274a7c38d9a22f8f	5dc62dc6ef8a3fa19473f04df2a219f5
808	SVC-HLT-001	DEPT-005	ea_portal	\N	other	3	4	3	4	3	Quick and efficient processing	f	2025-08-15 03:26:08.289113	da8e32664ab9af968b747251bac4a741	d16ab23651a41560ed2c4f917a9bae59
809	SVC-HLT-001	DEPT-005	ea_portal	\N	citizen	3	3	3	5	5	\N	f	2025-08-21 16:26:08.289113	e076e2714e2949cdb3daa6e8bf4f994b	0443cf56171bec8aba377503389e2209
810	SVC-HLT-001	DEPT-005	ea_portal	\N	government	3	3	4	4	3	Service exceeded expectations	f	2025-09-30 08:26:08.289113	b6e5d67ded0effe213b8793141558646	fa3fa2db70068f19dd5734dacdd8c98a
811	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	4	5	2	3	4	\N	f	2025-08-22 16:26:08.289113	4c77e76ecedf67a76dc88230ce65d102	5d160f4c764fc54869d15d7e42abed81
812	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	4	4	2	5	4	Process was straightforward and efficient	f	2025-08-12 14:26:08.289113	dac4745779f239a2b3096e7eb81a2886	52408d687ae3bbab937a0ebc93bacbc9
813	SVC-HLT-002	DEPT-005	ea_portal	\N	other	5	3	4	5	4	\N	f	2025-08-14 02:26:08.289113	7b8513147fc553c939c6f8cfad446c72	220a9bea7af15ca75b4fa56f3125c580
814	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	5	4	2	4	3	\N	f	2025-10-28 05:26:08.289113	f5e38f1acf346777a252897122ee404c	3c8ba02a15cc7e850382da44a04a1d68
815	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	5	4	3	4	4	\N	f	2025-10-25 17:26:08.289113	ea38dce3b8d0f2335b41caa67a8d45a3	ce2b04d66d8ba622c4f64073362bf501
816	SVC-HLT-002	DEPT-005	ea_portal	\N	government	5	3	3	4	5	\N	f	2025-10-06 03:26:08.289113	de9892bf8c90c2b68ebf8e821ecdf5ad	fe341de2974c98beb0cb3b6a17ce5024
817	SVC-HLT-002	DEPT-005	ea_portal	\N	other	3	4	2	4	5	Online portal works well	f	2025-09-19 14:26:08.289113	8f802f1dd267839686809abf67282f73	cff63d34ef4b24ab1b2d522e2184b675
818	SVC-HLT-002	DEPT-005	ea_portal	\N	other	5	3	2	5	4	\N	f	2025-08-19 14:26:08.289113	f5eb56cf445e6c900421839dc33880df	82571f372fe3f2dfb3023274088daff9
819	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	5	3	2	5	4	Staff were helpful and professional	f	2025-11-05 16:26:08.289113	dc81b1ffce3e5c74124aa9bc64141548	a25bf253b8fad8771a81c70e9b51d840
820	SVC-HLT-002	DEPT-005	ea_portal	\N	other	4	3	2	5	4	\N	t	2025-10-19 15:26:08.289113	6ff5e302fad23f12748245e388e6625c	3634cd6d5f0d8c7ecb395959074225f4
821	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	4	3	4	3	5	\N	f	2025-09-04 10:26:08.289113	3887827626a49207c662f9deabfbd0f0	8b0a54837768cb0eabc2f7ff4da51622
822	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	5	5	3	3	3	System was easy to use	f	2025-10-09 00:26:08.289113	855160fa7ac856c8a2ae41b805168311	0ffaacc58988223f07ca96d9dd66594f
823	SVC-HLT-002	DEPT-005	ea_portal	\N	other	5	4	3	5	5	\N	f	2025-08-17 20:26:08.289113	8415244c35603b6db26aab059774e97f	d60912abe2aee39735814b28c6fe9358
824	SVC-HLT-002	DEPT-005	ea_portal	\N	business	4	3	2	5	3	\N	f	2025-10-05 02:26:08.289113	9f30db0e0448fd81b8bb52d39f97cd98	f98dc6b0b5d1f0c5c036102c24663633
825	SVC-HLT-002	DEPT-005	ea_portal	\N	other	5	3	2	4	4	Would recommend this service	f	2025-09-04 07:26:08.289113	72e701238baf8a921f74046f1e2fd03f	269c1a7debd201bbb8b463d2b370268c
826	SVC-HLT-002	DEPT-005	ea_portal	\N	business	3	4	4	5	3	Documentation requirements unclear	f	2025-10-06 06:26:08.289113	210c765b4adc3438de5abb3acbdcb55b	384bc57d0acfb0fdd9b6d350127b1db8
827	SVC-HLT-002	DEPT-005	ea_portal	\N	business	5	5	2	4	5	Service exceeded expectations	f	2025-09-02 09:26:08.289113	104102e5fc3022abe3b8d0f9f2e2e7d3	7e67cec51492ff8359607dfa8be8283a
828	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	5	3	4	3	4	\N	f	2025-10-06 17:26:08.289113	55794b94adc5c351cab7aa11bbe0ea43	c6eb6e6e6126fc98cde6d3092d6e6dba
829	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	3	5	2	3	3	System was easy to use	f	2025-11-05 16:26:08.289113	51afdffb64e0bf79f9326e63762898cf	b876b2cc50dcd0ec68c8baf641596c1a
830	SVC-HLT-002	DEPT-005	ea_portal	\N	government	4	4	2	3	5	Online portal works well	f	2025-10-20 19:26:08.289113	39fc0504b53d8400b3dcca76508ebe36	d483dfb198ba244f434cad810c71a18f
831	SVC-HLT-002	DEPT-005	ea_portal	\N	government	3	3	2	3	3	\N	f	2025-10-10 03:26:08.289113	acdbaeee529f70e05a0a0b5631669d5e	750c057d93c2f0f2aefd8c45d2d79547
832	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	5	4	2	5	5	\N	t	2025-09-13 04:26:08.289113	b434aa63a3dc0497d4d5eb92439648dd	407130efd00a3625c3b0f90193da5cb6
833	SVC-HLT-002	DEPT-005	ea_portal	\N	business	4	4	3	4	5	\N	f	2025-10-14 17:26:08.289113	ae23ef428f9cd7c4b3953a57a50da757	f49809e7260afc6537e338ae544c2890
834	SVC-HLT-002	DEPT-005	ea_portal	\N	government	4	4	2	5	3	\N	f	2025-09-29 08:26:08.289113	535b9ce0b1817fd7fca876e6948adb7e	a2f1416a4c03db2e859b0eca8b59b81d
835	SVC-HLT-002	DEPT-005	ea_portal	\N	government	4	3	4	4	3	\N	f	2025-08-31 02:26:08.289113	68e69fccbed2334d30c520f87b76812f	08b0e5518831c5f0eee6de2e23996c8a
836	SVC-HLT-002	DEPT-005	ea_portal	\N	other	3	3	3	5	4	\N	f	2025-10-02 12:26:08.289113	74c512835129df44cec38c1ee1985dc9	148a658f903a969ba9dadf9f07934243
837	SVC-HLT-002	DEPT-005	ea_portal	\N	government	4	3	4	4	3	\N	f	2025-08-12 04:26:08.289113	a1b26d4cd3dfa24fbbd730cdd459e569	277ae74bc10a8a7e3c7e8d662b8c16c5
838	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	5	5	4	3	4	\N	t	2025-11-08 22:26:08.289113	e475e8cb9d13c6fc19d0c4c543464ad9	2d73a2bec4ff8aeddca403f4bb7ff1ff
839	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	5	5	4	5	4	\N	f	2025-09-17 23:26:08.289113	75d1fa1d32a531f0cef0be03d04af34a	126f5a8458e643efc9dbbf3aa431ba7f
840	SVC-HLT-002	DEPT-005	ea_portal	\N	government	4	3	3	5	5	\N	t	2025-08-14 23:26:08.289113	7ffa9639e3ec956176d84a88ce612294	ccc2daced677e7b6ff61d72cf9b217da
841	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	3	5	2	5	3	\N	t	2025-10-13 22:26:08.289113	d605b1e6f518e598562db3b2a62332cf	80d5418953fde6cbd1424f905adac1b9
842	SVC-HLT-002	DEPT-005	ea_portal	\N	government	3	3	4	5	5	System had technical issues	f	2025-08-25 06:26:08.289113	4b6962229b2692a67d5a35c8f3f43667	f623d2ca14dfdb774bfc8a02723cd4a0
843	SVC-HLT-002	DEPT-005	ea_portal	\N	government	3	4	2	3	5	Waiting time was reasonable	f	2025-10-13 22:26:08.289113	1c72e64688b061ab676f3872fa6c0ed9	0ad99666ef50e1baf8614b09adbb9f2a
844	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	3	3	3	3	5	Staff need more training	f	2025-10-11 08:26:08.289113	af70a5fed2b92b74eff499fb09870816	dd21346fb0c17dacbd5aa6dfd3ec9b2f
845	SVC-HLT-002	DEPT-005	ea_portal	\N	business	5	3	4	5	4	\N	f	2025-08-29 22:26:08.289113	affb81410afdf7d52666eb3102e94106	bc0c0f5d6bdab2824f8e8e2a8690928b
846	SVC-HLT-002	DEPT-005	ea_portal	\N	other	4	5	2	4	3	\N	f	2025-10-11 04:26:08.289113	9696c1cc6c2b2a3c52c36a6fad67e00d	65c8ed612fb308ec464cba7ba24bcf3a
847	SVC-HLT-002	DEPT-005	ea_portal	\N	business	3	3	4	4	3	\N	f	2025-08-24 03:26:08.289113	1f162d8e70c08fea5f69ed5873f03ff3	6e14470699d9fc9a1a8aa8947c302f9c
848	SVC-HLT-002	DEPT-005	ea_portal	\N	other	5	4	4	5	5	\N	f	2025-09-29 13:26:08.289113	eddc7931eda04e35b260760f529275e9	5dc62dc6ef8a3fa19473f04df2a219f5
849	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	5	5	4	5	4	\N	f	2025-11-02 01:26:08.289113	0887d6adb00e686192bc70677c571665	d16ab23651a41560ed2c4f917a9bae59
850	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	5	5	4	4	4	System had technical issues	f	2025-09-01 21:26:08.289113	6612b05cec8167c706c2cd87ca815d05	0443cf56171bec8aba377503389e2209
851	SVC-HLT-002	DEPT-005	ea_portal	\N	government	4	5	2	3	4	System was easy to use	f	2025-10-06 23:26:08.289113	546c937f1759dfdc950763bd41fa6bf2	fa3fa2db70068f19dd5734dacdd8c98a
852	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	4	5	4	5	5	System was easy to use	t	2025-10-14 10:26:08.289113	d833000d427bad7ae717ee27e126c9d4	b8a052325f120ccca7997268e1cbe6db
853	SVC-HLT-002	DEPT-005	ea_portal	\N	business	3	5	4	3	4	\N	f	2025-11-03 21:26:08.289113	121eb750c82cf5fefe1daf1145853081	db83d085aec0ab7a97b891bff56bf26a
854	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	3	3	2	4	4	\N	f	2025-10-21 11:26:08.289113	891898ef84e243d0ff484af4e16b756e	cc586dd8e89af6720b8d7a0ae89a2900
855	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	5	4	3	4	3	Could be faster but overall good experience	f	2025-09-28 14:26:08.289113	32a897e75f8c413b61d33c8352d39490	95777564db99859e29e34179f824ac3d
856	SVC-HLT-002	DEPT-005	ea_portal	\N	government	4	5	2	5	3	\N	f	2025-10-29 08:26:08.289113	be6f0a505d0a59101f8f30fde8dec743	86b4ab355a3ce5393cc7c6860927f194
857	SVC-HLT-002	DEPT-005	ea_portal	\N	other	4	5	4	4	4	\N	f	2025-09-01 08:26:08.289113	5615eef26fc7b43cc50310f9f189cbce	c2266c04f632edb24ffd38ff3ba6334b
858	SVC-HLT-002	DEPT-005	ea_portal	\N	other	3	4	4	5	3	\N	f	2025-10-27 04:26:08.289113	02788691a15e2e4ecdb40b0e706c5407	2cc1dd3193ef645588da653b42e09ada
859	SVC-HLT-002	DEPT-005	ea_portal	\N	other	3	4	3	5	3	\N	f	2025-11-02 18:26:08.289113	a420411a666f4383cdf5cca4f5851415	543efc4c31da3112d2857c48a07c4320
860	SVC-HLT-002	DEPT-005	ea_portal	\N	business	5	4	4	5	3	\N	f	2025-09-22 22:26:08.289113	ac186f9b1069f72e2f14b90c012217d5	cfa751d11fd5c6d285749c1bad1b7808
861	SVC-HLT-002	DEPT-005	ea_portal	\N	government	4	3	3	3	5	\N	f	2025-10-15 07:26:08.289113	c49a0a417b3349c047ef396f41f7986a	4d541339311e8b9b81f48dbfd97f084e
862	SVC-HLT-002	DEPT-005	ea_portal	\N	business	5	5	3	5	4	\N	f	2025-08-31 10:26:08.289113	4d5310efc0b06248be1a8cf95f88c0ce	3f8eb4f7b542955fe44f9bd7ff6b5c2c
863	SVC-HLT-002	DEPT-005	ea_portal	\N	citizen	3	4	2	4	4	Excellent service, very satisfied	f	2025-08-22 22:26:08.289113	3ccc5270df118f4443abf44b817eb723	edebc0adaf2c7a7ee5e3e4cce913553e
864	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	5	5	4	4	3	Excellent service, very satisfied	f	2025-10-13 05:26:08.289113	1ff8a82a0be7083fcbd13a3b31825091	33e9399f86faefe2029d1bad3ebb856a
865	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	5	4	2	4	5	\N	f	2025-09-14 04:26:08.289113	04fc2caf9f03bc2e74b07f5c9fe062e1	3f1a249c346038d0dd3dd73c7a242e2c
866	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	3	3	3	3	4	\N	f	2025-10-18 01:26:08.289113	bcd788f5a711b411abc10202aa2b862b	8d463c072505d33fa0a53b0594a3acf5
867	SVC-HLT-002	DEPT-005	ea_portal	\N	visitor	3	4	4	4	4	\N	f	2025-11-08 14:26:08.289113	329a9a08bf2575a8bc476f7a49e44c24	658c27ef00650aa526bb0ade0cb0ebe0
868	SVC-HLT-003	DEPT-005	ea_portal	\N	business	5	5	4	5	3	\N	f	2025-11-08 02:26:08.289113	2bfc10b4202cdcf1cb961f86546863ef	5d160f4c764fc54869d15d7e42abed81
869	SVC-HLT-003	DEPT-005	ea_portal	\N	government	5	4	3	3	4	\N	f	2025-08-29 23:26:08.289113	88ff58944bc626b7ad3ab33aacf0e3b9	52408d687ae3bbab937a0ebc93bacbc9
870	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	4	4	2	3	4	\N	f	2025-10-03 13:26:08.289113	c556731dc945d47e8e38fdac3c929125	220a9bea7af15ca75b4fa56f3125c580
871	SVC-HLT-003	DEPT-005	ea_portal	\N	other	3	3	2	4	3	Staff were helpful and professional	f	2025-08-26 02:26:08.289113	bc8d5d57a91b76aeec3c8059a8e5a81d	3c8ba02a15cc7e850382da44a04a1d68
872	SVC-HLT-003	DEPT-005	ea_portal	\N	government	5	4	4	4	3	System had technical issues	f	2025-11-08 01:26:08.289113	001819398e929532e857b8c35ed0e31f	ce2b04d66d8ba622c4f64073362bf501
873	SVC-HLT-003	DEPT-005	ea_portal	\N	business	4	3	2	4	5	\N	f	2025-10-23 21:26:08.289113	2be0637e6cec17edb9cc5fbd86360ed9	fe341de2974c98beb0cb3b6a17ce5024
874	SVC-HLT-003	DEPT-005	ea_portal	\N	business	5	3	3	4	5	\N	f	2025-10-21 05:26:08.289113	39565bd9ea1166ea9d245d55a0666773	cff63d34ef4b24ab1b2d522e2184b675
875	SVC-HLT-003	DEPT-005	ea_portal	\N	other	3	3	3	5	3	\N	f	2025-08-24 02:26:08.289113	85d94ba3677fe15e888b1106b65a022a	82571f372fe3f2dfb3023274088daff9
876	SVC-HLT-003	DEPT-005	ea_portal	\N	government	4	3	4	4	3	\N	f	2025-10-13 17:26:08.289113	b75056c4079a59e8335b78f975b9f290	a25bf253b8fad8771a81c70e9b51d840
877	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	5	5	4	3	5	\N	f	2025-08-17 00:26:08.289113	ce76a816e403b95fc3e595f94896f918	3634cd6d5f0d8c7ecb395959074225f4
878	SVC-HLT-003	DEPT-005	ea_portal	\N	other	4	3	3	5	4	\N	f	2025-10-14 04:26:08.289113	20b1b601662176ab5b854b9a0a7d572d	8b0a54837768cb0eabc2f7ff4da51622
879	SVC-HLT-003	DEPT-005	ea_portal	\N	business	5	5	3	3	5	Quick and efficient processing	f	2025-09-10 13:26:08.289113	969ea971c9dcd4501d21169d55f8d65f	0ffaacc58988223f07ca96d9dd66594f
880	SVC-HLT-003	DEPT-005	ea_portal	\N	government	4	5	2	4	3	\N	f	2025-09-16 00:26:08.289113	e7f4848ac1ca8ed018a3bfbde03af164	d60912abe2aee39735814b28c6fe9358
881	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	5	5	4	5	4	Forms were confusing	f	2025-10-21 16:26:08.289113	6ebe664a1ac41bc04851b322f059c204	f98dc6b0b5d1f0c5c036102c24663633
882	SVC-HLT-003	DEPT-005	ea_portal	\N	other	4	5	4	3	4	Would recommend this service	f	2025-09-21 11:26:08.289113	d345c342457e0585532fbcbdd492d7e9	269c1a7debd201bbb8b463d2b370268c
883	SVC-HLT-003	DEPT-005	ea_portal	\N	other	5	4	2	4	4	\N	f	2025-10-02 15:26:08.289113	93f2ac9347dc2d6a0158f19414ebb1c3	384bc57d0acfb0fdd9b6d350127b1db8
884	SVC-HLT-003	DEPT-005	ea_portal	\N	other	3	5	3	3	4	Excellent service, very satisfied	f	2025-09-26 09:26:08.289113	6ea5dfb3c0bc033a70feeb1465879237	7e67cec51492ff8359607dfa8be8283a
885	SVC-HLT-003	DEPT-005	ea_portal	\N	business	4	3	4	5	3	System was easy to use	f	2025-11-03 04:26:08.289113	b55e661b74e18a1e765c01254ada5a3b	c6eb6e6e6126fc98cde6d3092d6e6dba
886	SVC-HLT-003	DEPT-005	ea_portal	\N	business	3	5	3	4	3	System had technical issues	f	2025-08-21 02:26:08.289113	46c5a7210ad28832ed9dcaf53ca5ee3d	b876b2cc50dcd0ec68c8baf641596c1a
887	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	5	4	4	4	3	Process needs improvement	f	2025-10-06 01:26:08.289113	265c6f3c656dd1d2bbb06e05bf499117	d483dfb198ba244f434cad810c71a18f
888	SVC-HLT-003	DEPT-005	ea_portal	\N	other	5	3	2	3	3	Online portal works well	f	2025-10-27 06:26:08.289113	01b8012085c1ebeb4657ed28eba2c0b3	750c057d93c2f0f2aefd8c45d2d79547
889	SVC-HLT-003	DEPT-005	ea_portal	\N	other	5	3	4	4	4	\N	f	2025-10-29 00:26:08.289113	51c32ef0827589bb7efd1448f7689ec5	407130efd00a3625c3b0f90193da5cb6
890	SVC-HLT-003	DEPT-005	ea_portal	\N	citizen	3	5	3	5	5	\N	f	2025-10-28 11:26:08.289113	340bc706780939dab6e2547903fdd01c	f49809e7260afc6537e338ae544c2890
891	SVC-HLT-003	DEPT-005	ea_portal	\N	business	4	3	3	4	3	\N	f	2025-09-04 22:26:08.289113	9991ea5370cf796fc599943109f536e6	a2f1416a4c03db2e859b0eca8b59b81d
892	SVC-HLT-003	DEPT-005	ea_portal	\N	other	3	4	2	5	3	\N	f	2025-11-07 04:26:08.289113	579db360536dac955592cd3e126f769a	08b0e5518831c5f0eee6de2e23996c8a
893	SVC-HLT-003	DEPT-005	ea_portal	\N	citizen	5	3	3	4	3	\N	f	2025-10-31 06:26:08.289113	efd4ef80beaa4db9695634ba2fdc1034	148a658f903a969ba9dadf9f07934243
894	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	3	3	2	5	4	Long wait times experienced	f	2025-10-27 19:26:08.289113	c3b11940a84afbdbd890c0274d7f2d0c	277ae74bc10a8a7e3c7e8d662b8c16c5
895	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	3	4	2	4	5	\N	f	2025-10-04 13:26:08.289113	394b59505fad1b27a8ae7ec812d27d6b	2d73a2bec4ff8aeddca403f4bb7ff1ff
896	SVC-HLT-003	DEPT-005	ea_portal	\N	business	4	4	3	4	3	Clear instructions provided	f	2025-09-14 23:26:08.289113	346a329769b012321f2d9a4101dd8ade	126f5a8458e643efc9dbbf3aa431ba7f
897	SVC-HLT-003	DEPT-005	ea_portal	\N	citizen	4	5	3	3	3	Documentation requirements unclear	f	2025-08-21 18:26:08.289113	0720dc62f243463924a5e7428b1d2bc7	ccc2daced677e7b6ff61d72cf9b217da
898	SVC-HLT-003	DEPT-005	ea_portal	\N	citizen	3	3	4	5	3	System was easy to use	f	2025-11-07 16:26:08.289113	e56a7b5ec80121888506bef713e3eee6	80d5418953fde6cbd1424f905adac1b9
899	SVC-HLT-003	DEPT-005	ea_portal	\N	business	4	3	2	3	3	Online portal works well	f	2025-10-04 09:26:08.289113	5f03b385373b177d592e030034d06cad	f623d2ca14dfdb774bfc8a02723cd4a0
900	SVC-HLT-003	DEPT-005	ea_portal	\N	government	3	5	3	4	3	\N	f	2025-08-26 08:26:08.289113	8fd41a179e9124dfa6ea8b1856812c4a	0ad99666ef50e1baf8614b09adbb9f2a
901	SVC-HLT-003	DEPT-005	ea_portal	\N	other	5	3	2	5	4	\N	f	2025-08-13 15:26:08.289113	d56d1792b50793d2c561aff98876c4cb	dd21346fb0c17dacbd5aa6dfd3ec9b2f
902	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	3	4	3	3	3	\N	f	2025-10-21 22:26:08.289113	92951a0607d2b43fab3c0ae2a81726ac	bc0c0f5d6bdab2824f8e8e2a8690928b
903	SVC-HLT-003	DEPT-005	ea_portal	\N	business	3	4	3	5	5	Service exceeded expectations	f	2025-10-01 11:26:08.289113	8b7ff704881133319174ccb777a63506	65c8ed612fb308ec464cba7ba24bcf3a
904	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	5	5	2	4	4	\N	f	2025-10-09 17:26:08.289113	9f671a5b866b2439429096bb7c699b22	6e14470699d9fc9a1a8aa8947c302f9c
905	SVC-HLT-003	DEPT-005	ea_portal	\N	other	5	4	3	5	3	\N	f	2025-11-05 22:26:08.289113	76b67b874bcbcd48342ff88a6a3ee724	5dc62dc6ef8a3fa19473f04df2a219f5
906	SVC-HLT-003	DEPT-005	ea_portal	\N	other	4	5	4	3	4	\N	f	2025-10-11 11:26:08.289113	ffe9db7045ed582201e4d3d873bf0a98	d16ab23651a41560ed2c4f917a9bae59
907	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	4	5	3	4	3	Service exceeded expectations	f	2025-08-21 10:26:08.289113	4fd1cb9ffdee3ef6e52160e99ce661cc	0443cf56171bec8aba377503389e2209
908	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	5	4	4	3	4	Could be faster but overall good experience	f	2025-10-14 21:26:08.289113	44710aa68ddc762dbb24a62b42a904bd	fa3fa2db70068f19dd5734dacdd8c98a
909	SVC-HLT-003	DEPT-005	ea_portal	\N	business	3	4	4	5	5	\N	t	2025-08-29 12:26:08.289113	c49e98740b308f57ae4bdc9df3249186	b8a052325f120ccca7997268e1cbe6db
910	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	3	4	4	3	4	\N	f	2025-09-08 15:26:08.289113	5648042610a986d02ae107943f308653	db83d085aec0ab7a97b891bff56bf26a
911	SVC-HLT-003	DEPT-005	ea_portal	\N	government	4	4	2	4	3	Staff need more training	f	2025-09-19 11:26:08.289113	a19a56bae12d2c280bed8fb8825e0d0b	cc586dd8e89af6720b8d7a0ae89a2900
912	SVC-HLT-003	DEPT-005	ea_portal	\N	business	3	3	4	3	5	\N	f	2025-09-14 13:26:08.289113	982d560d990d0e349d9673fb8b3ea5ad	95777564db99859e29e34179f824ac3d
913	SVC-HLT-003	DEPT-005	ea_portal	\N	government	3	3	3	4	5	\N	f	2025-09-01 14:26:08.289113	46c7070fdce73c1b7f412e2ffee7eec8	86b4ab355a3ce5393cc7c6860927f194
914	SVC-HLT-003	DEPT-005	ea_portal	\N	citizen	5	5	2	5	3	\N	t	2025-08-11 07:26:08.289113	febdac68c5720b208399398780495655	c2266c04f632edb24ffd38ff3ba6334b
915	SVC-HLT-003	DEPT-005	ea_portal	\N	other	3	4	4	5	3	Forms were confusing	f	2025-09-13 23:26:08.289113	a7dddc22cbde709ad3f55c3d11df2ef6	2cc1dd3193ef645588da653b42e09ada
916	SVC-HLT-003	DEPT-005	ea_portal	\N	government	3	4	2	3	4	Documentation requirements unclear	f	2025-09-11 09:26:08.289113	34364bb9a4f2deff46b8d3f37491b7a9	543efc4c31da3112d2857c48a07c4320
917	SVC-HLT-003	DEPT-005	ea_portal	\N	business	4	4	2	5	4	\N	f	2025-09-22 17:26:08.289113	5f630215c172c5a3d5978d011f102c1b	cfa751d11fd5c6d285749c1bad1b7808
918	SVC-HLT-003	DEPT-005	ea_portal	\N	citizen	4	5	4	3	4	Process was straightforward and efficient	f	2025-10-24 11:26:08.289113	5ed5c672ab031f8131fe31e42e048d83	4d541339311e8b9b81f48dbfd97f084e
919	SVC-HLT-003	DEPT-005	ea_portal	\N	government	3	5	2	4	4	\N	f	2025-09-13 00:26:08.289113	134ab8e9e1cbff9a2aa3e809cc6816f7	3f8eb4f7b542955fe44f9bd7ff6b5c2c
920	SVC-HLT-003	DEPT-005	ea_portal	\N	government	3	5	4	3	3	Documentation requirements unclear	f	2025-10-08 19:26:08.289113	5cec0438d4e6acb7dc703b96e3ed33a3	edebc0adaf2c7a7ee5e3e4cce913553e
921	SVC-HLT-003	DEPT-005	ea_portal	\N	business	5	5	3	4	4	\N	f	2025-10-16 11:26:08.289113	424ece53ffd739e39e138ee6f4b124e7	33e9399f86faefe2029d1bad3ebb856a
922	SVC-HLT-003	DEPT-005	ea_portal	\N	citizen	3	3	2	4	5	Quick and efficient processing	f	2025-09-24 16:26:08.289113	d2672104d15ab901de1c241fa2222e5b	3f1a249c346038d0dd3dd73c7a242e2c
923	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	4	4	2	4	5	\N	f	2025-09-15 02:26:08.289113	ad69f2714cd80e7898c865b400f9e99f	8d463c072505d33fa0a53b0594a3acf5
924	SVC-HLT-003	DEPT-005	ea_portal	\N	visitor	4	5	4	3	3	\N	f	2025-08-11 06:26:08.289113	3526ab6650c2eb7de5d3adfd3461d63a	658c27ef00650aa526bb0ade0cb0ebe0
925	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	5	4	3	5	4	\N	f	2025-08-31 10:26:08.289113	3cb96bc6d35979e0954ea20d8425ed6b	5d160f4c764fc54869d15d7e42abed81
926	SVC-EDU-001	MIN-003	ea_portal	\N	business	3	3	2	4	4	\N	f	2025-09-22 08:26:08.289113	15d7a371036673f6eb40c9e6b123c66f	52408d687ae3bbab937a0ebc93bacbc9
927	SVC-EDU-001	MIN-003	ea_portal	\N	other	4	3	3	3	4	Long wait times experienced	f	2025-10-18 07:26:08.289113	87a523ae3d03d145aa039a9963cc9038	220a9bea7af15ca75b4fa56f3125c580
928	SVC-EDU-001	MIN-003	ea_portal	\N	business	3	5	3	5	3	\N	f	2025-10-18 04:26:08.289113	d7ce8c2722660858b265e7253ad6a522	3c8ba02a15cc7e850382da44a04a1d68
929	SVC-EDU-001	MIN-003	ea_portal	\N	government	3	3	4	4	3	\N	f	2025-11-02 07:26:08.289113	f93089ed033c7b8dc17622d3b015a1b5	ce2b04d66d8ba622c4f64073362bf501
930	SVC-EDU-001	MIN-003	ea_portal	\N	visitor	5	5	2	5	3	\N	f	2025-10-01 23:26:08.289113	4ed7c22d72cb48175a9b10acba8e025b	fe341de2974c98beb0cb3b6a17ce5024
931	SVC-EDU-001	MIN-003	ea_portal	\N	business	3	5	3	3	4	\N	f	2025-08-14 16:26:08.289113	f11e592ec2c956e6641ddaf265afe144	cff63d34ef4b24ab1b2d522e2184b675
932	SVC-EDU-001	MIN-003	ea_portal	\N	visitor	3	4	4	5	4	System had technical issues	f	2025-11-04 13:26:08.289113	82e8f7ae64099fefb623892708ba8d64	82571f372fe3f2dfb3023274088daff9
933	SVC-EDU-001	MIN-003	ea_portal	\N	other	3	5	4	5	3	\N	f	2025-11-06 21:26:08.289113	4efcdff019304293045987520839e0ec	a25bf253b8fad8771a81c70e9b51d840
934	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	3	3	2	3	4	\N	f	2025-10-29 14:26:08.289113	9bdd06e36d215fbbae718b49651f30bd	3634cd6d5f0d8c7ecb395959074225f4
935	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	5	5	2	4	5	\N	f	2025-08-24 14:26:08.289113	5ed63ef0041b602a0cfe3d0c0d0e5779	8b0a54837768cb0eabc2f7ff4da51622
936	SVC-EDU-001	MIN-003	ea_portal	\N	business	3	3	4	5	3	\N	f	2025-10-10 00:26:08.289113	d9bc7f1cd83330e89543d2e68810fb27	0ffaacc58988223f07ca96d9dd66594f
937	SVC-EDU-001	MIN-003	ea_portal	\N	business	3	4	3	3	4	\N	f	2025-08-12 05:26:08.289113	52e2198a44b6167a75cccb0509e4e347	d60912abe2aee39735814b28c6fe9358
938	SVC-EDU-001	MIN-003	ea_portal	\N	business	3	5	4	4	3	\N	t	2025-09-23 14:26:08.289113	021f828c6b71717830709b3ba430492d	f98dc6b0b5d1f0c5c036102c24663633
939	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	4	3	2	5	4	\N	f	2025-10-10 23:26:08.289113	ec1360ad9a5fce2ace87994010f02108	269c1a7debd201bbb8b463d2b370268c
940	SVC-EDU-001	MIN-003	ea_portal	\N	business	4	3	2	5	5	Could be faster but overall good experience	f	2025-10-20 03:26:08.289113	b3b3a82dc9ba4ae22003ffb17d921fa4	384bc57d0acfb0fdd9b6d350127b1db8
941	SVC-EDU-001	MIN-003	ea_portal	\N	other	3	5	3	5	5	\N	f	2025-09-19 06:26:08.289113	02220a75f0e3539d536e2550508862f8	7e67cec51492ff8359607dfa8be8283a
942	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	4	5	3	4	5	Staff need more training	f	2025-08-15 21:26:08.289113	ecbd00c41b19c842f339c8f6bf2e2eff	c6eb6e6e6126fc98cde6d3092d6e6dba
943	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	4	5	4	5	3	\N	f	2025-10-25 06:26:08.289113	0ce9f837ff3b7127d210896972338c25	b876b2cc50dcd0ec68c8baf641596c1a
944	SVC-EDU-001	MIN-003	ea_portal	\N	government	4	4	3	4	3	Long wait times experienced	f	2025-10-02 19:26:08.289113	4e9c2bb0e18259710f598ce9168cbae7	d483dfb198ba244f434cad810c71a18f
945	SVC-EDU-001	MIN-003	ea_portal	\N	business	3	4	2	3	4	\N	f	2025-10-05 08:26:08.289113	39d04e594bd3f0e5d713110b3491bd34	750c057d93c2f0f2aefd8c45d2d79547
946	SVC-EDU-001	MIN-003	ea_portal	\N	visitor	5	5	2	5	4	Clear instructions provided	f	2025-09-21 23:26:08.289113	ffac0cdf69006e75ebe751a33f6961f3	407130efd00a3625c3b0f90193da5cb6
947	SVC-EDU-001	MIN-003	ea_portal	\N	government	4	5	4	5	4	\N	f	2025-08-14 03:26:08.289113	3391c6d724038ba200b726c7ff2713f9	f49809e7260afc6537e338ae544c2890
948	SVC-EDU-001	MIN-003	ea_portal	\N	visitor	3	4	4	4	3	\N	f	2025-09-13 00:26:08.289113	e98b6a879cae4e242d99997d221c57ed	a2f1416a4c03db2e859b0eca8b59b81d
949	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	4	3	2	5	5	\N	f	2025-09-19 11:26:08.289113	23e85416850f08056dc469aca9826028	08b0e5518831c5f0eee6de2e23996c8a
950	SVC-EDU-001	MIN-003	ea_portal	\N	business	3	4	3	3	4	\N	f	2025-10-14 01:26:08.289113	4d91349bcc73c8f671dbaf98f7df61ae	148a658f903a969ba9dadf9f07934243
951	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	4	4	2	4	3	\N	f	2025-09-03 20:26:08.289113	d06dae769047138cbc56337e63befd84	277ae74bc10a8a7e3c7e8d662b8c16c5
952	SVC-EDU-001	MIN-003	ea_portal	\N	citizen	5	5	3	5	5	Staff were helpful and professional	f	2025-10-01 20:26:08.289113	2e57de0208d3054679f266492cb61204	2d73a2bec4ff8aeddca403f4bb7ff1ff
953	SVC-EDU-002	MIN-003	ea_portal	\N	other	3	4	2	4	5	Quick and efficient processing	f	2025-09-02 16:26:08.289113	accd881f2de5135d4d00ffba9e46ad87	5d160f4c764fc54869d15d7e42abed81
954	SVC-EDU-002	MIN-003	ea_portal	\N	government	4	4	2	4	3	Process was straightforward and efficient	f	2025-10-29 12:26:08.289113	cf655303310539c306bd8aae282a0f00	52408d687ae3bbab937a0ebc93bacbc9
955	SVC-EDU-002	MIN-003	ea_portal	\N	citizen	3	5	4	4	4	Could be faster but overall good experience	f	2025-09-03 13:26:08.289113	f20b7d8ee5d51639f3423d0cc2d32d6b	220a9bea7af15ca75b4fa56f3125c580
956	SVC-EDU-002	MIN-003	ea_portal	\N	other	5	4	3	4	3	\N	f	2025-10-20 06:26:08.289113	6349caca3437ba4531bc2d0875c9bad5	3c8ba02a15cc7e850382da44a04a1d68
957	SVC-EDU-002	MIN-003	ea_portal	\N	other	4	5	3	3	5	\N	f	2025-10-30 12:26:08.289113	5175ef5841b9b79424f97eb525b3e79b	ce2b04d66d8ba622c4f64073362bf501
958	SVC-EDU-002	MIN-003	ea_portal	\N	business	3	4	4	4	3	\N	f	2025-08-12 01:26:08.289113	d55eb57c61bf0b9dbc3c36b4d05a79c7	fe341de2974c98beb0cb3b6a17ce5024
959	SVC-EDU-002	MIN-003	ea_portal	\N	government	3	4	3	4	4	Quick and efficient processing	f	2025-10-08 10:26:08.289113	131f4f9cc10a15f3c49b8da05778d543	cff63d34ef4b24ab1b2d522e2184b675
960	SVC-EDU-002	MIN-003	ea_portal	\N	visitor	3	4	2	5	5	\N	f	2025-08-15 19:26:08.289113	22b9972fdf004d9c09b658393cc666fa	82571f372fe3f2dfb3023274088daff9
961	SVC-EDU-002	MIN-003	ea_portal	\N	business	3	4	2	5	4	Excellent service, very satisfied	f	2025-10-02 04:26:08.289113	91945475d2f48a23509da7d5ead98788	a25bf253b8fad8771a81c70e9b51d840
962	SVC-EDU-002	MIN-003	ea_portal	\N	other	3	5	3	5	3	Staff need more training	f	2025-09-30 11:26:08.289113	18ee7dc6794addae114551651620177b	3634cd6d5f0d8c7ecb395959074225f4
963	SVC-EDU-002	MIN-003	ea_portal	\N	government	4	5	4	5	3	\N	f	2025-10-12 22:26:08.289113	acccdfc175c306180a6b358c8d1d1e55	8b0a54837768cb0eabc2f7ff4da51622
964	SVC-EDU-002	MIN-003	ea_portal	\N	government	4	5	3	3	3	\N	f	2025-11-05 22:26:08.289113	04a17061956cf56b05daee663d0b0896	0ffaacc58988223f07ca96d9dd66594f
965	SVC-EDU-002	MIN-003	ea_portal	\N	government	3	5	4	5	4	\N	f	2025-09-29 04:26:08.289113	55ce184b6255f89aed8b19b6d5018f4b	d60912abe2aee39735814b28c6fe9358
966	SVC-EDU-002	MIN-003	ea_portal	\N	other	4	5	3	5	3	Could be faster but overall good experience	f	2025-09-28 22:26:08.289113	66edf9ac2c296b229306076dcb2c7841	f98dc6b0b5d1f0c5c036102c24663633
967	SVC-EDU-002	MIN-003	ea_portal	\N	government	4	5	4	4	3	Information was not clear	f	2025-10-15 11:26:08.289113	f41063af760dcd09b84a4fabd15eb55f	269c1a7debd201bbb8b463d2b370268c
968	SVC-EDU-002	MIN-003	ea_portal	\N	government	5	3	3	4	4	\N	f	2025-10-09 06:26:08.289113	9c59dcf5ba56059896799b6bf8282349	384bc57d0acfb0fdd9b6d350127b1db8
969	SVC-EDU-002	MIN-003	ea_portal	\N	visitor	5	4	3	3	3	Information was not clear	t	2025-09-28 21:26:08.289113	e481b79eeb9b00c4f117242d3c994408	7e67cec51492ff8359607dfa8be8283a
970	SVC-EDU-002	MIN-003	ea_portal	\N	citizen	3	4	4	3	3	Could be faster but overall good experience	f	2025-10-10 16:26:08.289113	6b092a742412b2e6dc48b326568d027a	c6eb6e6e6126fc98cde6d3092d6e6dba
971	SVC-EDU-002	MIN-003	ea_portal	\N	visitor	3	5	3	5	4	\N	f	2025-08-28 00:26:08.289113	d0b163077dbfccc677e04b5e281d29d0	b876b2cc50dcd0ec68c8baf641596c1a
972	SVC-EDU-002	MIN-003	ea_portal	\N	business	4	5	4	4	5	Information was not clear	f	2025-08-13 06:26:08.289113	37178135ee5dfc0a4409af3a8a025b9e	d483dfb198ba244f434cad810c71a18f
973	SVC-EDU-002	MIN-003	ea_portal	\N	other	3	5	2	4	4	\N	f	2025-09-17 18:26:08.289113	8661814fb876f187939fca496cc85bab	750c057d93c2f0f2aefd8c45d2d79547
974	SVC-EDU-002	MIN-003	ea_portal	\N	business	5	4	2	4	4	\N	f	2025-10-27 19:26:08.289113	7ac58b67ea0a9d492b50485fc3271cee	407130efd00a3625c3b0f90193da5cb6
975	SVC-EDU-002	MIN-003	ea_portal	\N	other	5	3	2	5	4	\N	f	2025-10-30 02:26:08.289113	e60c299f241408519b3ad27820617f29	f49809e7260afc6537e338ae544c2890
976	SVC-EDU-002	MIN-003	ea_portal	\N	citizen	3	5	4	4	5	\N	f	2025-10-18 01:26:08.289113	55cc885293dce47bc5a0ce5f81ce7868	a2f1416a4c03db2e859b0eca8b59b81d
977	SVC-EDU-002	MIN-003	ea_portal	\N	business	4	3	3	5	4	Staff were helpful and professional	f	2025-10-05 18:26:08.289113	8d9dda76e45acdaa158bc4251357bbe6	08b0e5518831c5f0eee6de2e23996c8a
978	SVC-EDU-002	MIN-003	ea_portal	\N	government	4	4	2	4	5	\N	f	2025-09-01 04:26:08.289113	ffb24b83e2246dbc69fadf3269ae826d	148a658f903a969ba9dadf9f07934243
979	SVC-EDU-002	MIN-003	ea_portal	\N	government	5	4	3	5	5	\N	f	2025-10-05 15:26:08.289113	247f0026899bcc79c1beb36d23518456	277ae74bc10a8a7e3c7e8d662b8c16c5
980	SVC-EDU-002	MIN-003	ea_portal	\N	citizen	3	5	3	3	4	\N	f	2025-11-07 03:26:08.289113	58ca8774c89cfe31f57497a3b6e7b29a	2d73a2bec4ff8aeddca403f4bb7ff1ff
981	SVC-EDU-002	MIN-003	ea_portal	\N	citizen	3	4	2	4	3	Would recommend this service	f	2025-09-16 02:26:08.289113	c6e53d3111039ebff586679f794b2259	126f5a8458e643efc9dbbf3aa431ba7f
982	SVC-EDU-002	MIN-003	ea_portal	\N	government	5	4	2	5	5	\N	f	2025-10-28 14:26:08.289113	de4f589967ee3cb782074fc86eb2f740	ccc2daced677e7b6ff61d72cf9b217da
983	SVC-EDU-002	MIN-003	ea_portal	\N	visitor	4	3	3	5	5	Information was not clear	f	2025-09-03 09:26:08.289113	876e77f60bca2c77fcd0f81cf93a885e	80d5418953fde6cbd1424f905adac1b9
984	SVC-EDU-002	MIN-003	ea_portal	\N	other	4	5	4	5	4	Quick and efficient processing	f	2025-09-05 04:26:08.289113	8e2f8269c20a0626e6282f9b9f8be7e0	f623d2ca14dfdb774bfc8a02723cd4a0
985	SVC-EDU-002	MIN-003	ea_portal	\N	visitor	5	3	3	3	5	\N	f	2025-08-21 01:26:08.289113	f3217ef23578c50724214e444ac3d768	0ad99666ef50e1baf8614b09adbb9f2a
986	SVC-EDU-002	MIN-003	ea_portal	\N	other	3	5	2	5	3	Would recommend this service	f	2025-09-27 01:26:08.289113	6034a6dc3b9a7ffd5f308fc4f3e17612	dd21346fb0c17dacbd5aa6dfd3ec9b2f
987	SVC-EDU-002	MIN-003	ea_portal	\N	citizen	4	4	4	3	5	Documentation requirements unclear	f	2025-10-02 23:26:08.289113	98ca03bfa06181b29fac5c09cd97e96a	bc0c0f5d6bdab2824f8e8e2a8690928b
988	SVC-EDU-003	MIN-003	ea_portal	\N	business	3	3	4	4	3	Waiting time was reasonable	f	2025-09-08 21:26:08.289113	9b28b57a000cdcc747c6b2df97dfb25b	5d160f4c764fc54869d15d7e42abed81
989	SVC-EDU-003	MIN-003	ea_portal	\N	other	3	5	4	4	5	\N	f	2025-11-08 10:26:08.289113	0ad49b95374f2b05e351deba3a9d3342	52408d687ae3bbab937a0ebc93bacbc9
990	SVC-EDU-003	MIN-003	ea_portal	\N	business	3	5	4	4	3	Process was straightforward and efficient	f	2025-10-11 01:26:08.289113	a075305c097d6cac2b4b22882928be49	220a9bea7af15ca75b4fa56f3125c580
991	SVC-EDU-003	MIN-003	ea_portal	\N	government	5	4	3	3	3	\N	f	2025-08-19 02:26:08.289113	21b35ed92435c63998e7cd2e17249130	3c8ba02a15cc7e850382da44a04a1d68
992	SVC-EDU-003	MIN-003	ea_portal	\N	citizen	4	3	2	5	5	\N	f	2025-10-26 16:26:08.289113	1015fa595c811cc912617d722775c043	ce2b04d66d8ba622c4f64073362bf501
993	SVC-EDU-003	MIN-003	ea_portal	\N	business	3	5	3	5	4	Information was not clear	t	2025-09-01 18:26:08.289113	63985b0ec55cc85b1bddf9061dd2e615	fe341de2974c98beb0cb3b6a17ce5024
994	SVC-EDU-003	MIN-003	ea_portal	\N	visitor	5	5	2	3	4	\N	f	2025-09-12 19:26:08.289113	a1b3af1785e681eeb090a6ea4a801847	cff63d34ef4b24ab1b2d522e2184b675
995	SVC-EDU-003	MIN-003	ea_portal	\N	business	3	5	2	3	3	\N	f	2025-09-03 15:26:08.289113	472bc8c703b7005144cbabb6ba45ef02	82571f372fe3f2dfb3023274088daff9
996	SVC-EDU-003	MIN-003	ea_portal	\N	government	3	4	3	4	5	\N	f	2025-10-20 07:26:08.289113	d25b1a56a95a8efb565f601a38c0cdf9	a25bf253b8fad8771a81c70e9b51d840
997	SVC-EDU-003	MIN-003	ea_portal	\N	visitor	4	4	2	3	3	\N	f	2025-10-06 21:26:08.289113	62d2e6ebb622cd223b4ce62988388ae1	3634cd6d5f0d8c7ecb395959074225f4
998	SVC-EDU-003	MIN-003	ea_portal	\N	business	3	3	2	3	5	\N	f	2025-10-31 14:26:08.289113	67badb7521d5056f7252bc221b8bda6f	8b0a54837768cb0eabc2f7ff4da51622
999	SVC-EDU-003	MIN-003	ea_portal	\N	business	4	4	4	4	3	\N	f	2025-09-18 09:26:08.289113	78caa7104c8c15ea37600b909bdd567b	0ffaacc58988223f07ca96d9dd66594f
1000	SVC-EDU-003	MIN-003	ea_portal	\N	other	4	4	3	3	4	\N	f	2025-08-25 12:26:08.289113	c74a6077708f64b3053af2e42bb7fc26	d60912abe2aee39735814b28c6fe9358
1001	SVC-EDU-003	MIN-003	ea_portal	\N	business	5	5	2	4	3	Quick and efficient processing	f	2025-08-23 23:26:08.289113	48307822afc0e884a786c8a355329a1f	f98dc6b0b5d1f0c5c036102c24663633
1002	SVC-EDU-003	MIN-003	ea_portal	\N	citizen	3	4	4	4	3	Forms were confusing	f	2025-08-25 02:26:08.289113	b8afbe6ca5f4436c6aeeedd016bf4d04	269c1a7debd201bbb8b463d2b370268c
1003	SVC-NIS-002	AGY-006	ea_portal	\N	citizen	4	5	2	4	3	Could be faster but overall good experience	t	2025-08-24 07:26:08.289113	95b8f079823c7838080298e19fd1ffcb	5d160f4c764fc54869d15d7e42abed81
1004	SVC-NIS-002	AGY-006	ea_portal	\N	citizen	4	3	2	3	5	\N	f	2025-10-09 09:26:08.289113	9757335d29196de86ec29fc8ca6b9b3b	52408d687ae3bbab937a0ebc93bacbc9
1005	SVC-NIS-002	AGY-006	ea_portal	\N	visitor	5	3	4	3	3	Excellent service, very satisfied	f	2025-09-28 02:26:08.289113	8d1125498439799581492c1cab02dfac	220a9bea7af15ca75b4fa56f3125c580
1006	SVC-NIS-002	AGY-006	ea_portal	\N	government	4	5	4	3	3	\N	t	2025-08-30 12:26:08.289113	10847b143e5d469cd6d877b24a1ded7e	3c8ba02a15cc7e850382da44a04a1d68
1007	SVC-NIS-002	AGY-006	ea_portal	\N	business	3	5	3	5	4	System was easy to use	f	2025-09-17 11:26:08.289113	6835d14c7d3f9d604e6c92d2a7c4249c	ce2b04d66d8ba622c4f64073362bf501
1008	SVC-NIS-002	AGY-006	ea_portal	\N	other	5	5	2	5	4	\N	f	2025-08-30 12:26:08.289113	0ebe232be27fe69d03c4041980a38e86	fe341de2974c98beb0cb3b6a17ce5024
1009	SVC-NIS-002	AGY-006	ea_portal	\N	business	4	3	3	4	4	Could be faster but overall good experience	f	2025-10-22 16:26:08.289113	bbe37800ff0157cbfd82c6513bf3969d	cff63d34ef4b24ab1b2d522e2184b675
1010	SVC-NIS-002	AGY-006	ea_portal	\N	visitor	4	4	2	5	3	Could be faster but overall good experience	f	2025-10-03 00:26:08.289113	032461cfc19c1f8ad48d90dacee04438	82571f372fe3f2dfb3023274088daff9
1011	SVC-NIS-002	AGY-006	ea_portal	\N	government	5	5	3	5	3	\N	f	2025-10-31 21:26:08.289113	0c9ad193cccd6484957408a14f99f4cf	a25bf253b8fad8771a81c70e9b51d840
1012	SVC-NIS-002	AGY-006	ea_portal	\N	business	4	5	4	5	3	\N	f	2025-10-28 04:26:08.289113	4db08c43a983df0444782f79a2ab475f	3634cd6d5f0d8c7ecb395959074225f4
1013	SVC-NIS-002	AGY-006	ea_portal	\N	business	3	4	3	5	5	Service exceeded expectations	f	2025-10-31 16:26:08.289113	8d4b5968a0cc2ab2abbd0f0ad2729228	8b0a54837768cb0eabc2f7ff4da51622
1014	SVC-NIS-002	AGY-006	ea_portal	\N	government	4	4	3	4	3	\N	f	2025-09-18 15:26:08.289113	91b43695d23b78b923817018b95fc713	0ffaacc58988223f07ca96d9dd66594f
1015	SVC-NIS-002	AGY-006	ea_portal	\N	citizen	4	4	2	4	3	Forms were confusing	f	2025-10-18 19:26:08.289113	0d5c263abbd3f60c5ef6f3710e14ebd7	d60912abe2aee39735814b28c6fe9358
1016	SVC-NIS-002	AGY-006	ea_portal	\N	business	4	5	4	4	3	Staff need more training	f	2025-10-24 02:26:08.289113	a9a7d78b4f8a9f86d27df8f617118705	f98dc6b0b5d1f0c5c036102c24663633
1017	SVC-NIS-002	AGY-006	ea_portal	\N	citizen	3	3	4	3	3	Waiting time was reasonable	f	2025-08-29 19:26:08.289113	dc384bc3dd4dc012dd1ee068facb8814	269c1a7debd201bbb8b463d2b370268c
1018	SVC-NIS-002	AGY-006	ea_portal	\N	government	5	4	4	3	5	Service exceeded expectations	f	2025-08-14 06:26:08.289113	f0e2d970ebf3c88b6d3ed87f9893c6cb	384bc57d0acfb0fdd9b6d350127b1db8
1019	SVC-NIS-002	AGY-006	ea_portal	\N	visitor	4	5	2	4	3	Long wait times experienced	f	2025-10-07 17:26:08.289113	220d3c9230c7c86c1127fe4b99e199b3	7e67cec51492ff8359607dfa8be8283a
1020	SVC-NIS-002	AGY-006	ea_portal	\N	business	3	5	4	4	5	Documentation requirements unclear	f	2025-10-28 08:26:08.289113	8ff6595dce3e57d16d48b486d6705376	c6eb6e6e6126fc98cde6d3092d6e6dba
1021	SVC-GDB-001	AGY-005	ea_portal	\N	visitor	4	5	3	4	4	Staff need more training	f	2025-10-18 10:26:08.289113	9f1f68d7ac99a1f8b11ba843086d6723	5d160f4c764fc54869d15d7e42abed81
1022	SVC-GDB-001	AGY-005	ea_portal	\N	visitor	3	3	3	4	5	\N	f	2025-10-17 08:26:08.289113	089b120ef3303947e1cb7d259dfed20e	52408d687ae3bbab937a0ebc93bacbc9
1023	SVC-GDB-001	AGY-005	ea_portal	\N	other	3	4	2	4	3	\N	f	2025-08-29 14:26:08.289113	fea58b1edfdfa6b361c7391c7c0ba592	220a9bea7af15ca75b4fa56f3125c580
1024	SVC-GDB-001	AGY-005	ea_portal	\N	business	5	5	2	3	5	\N	f	2025-11-02 21:26:08.289113	e0716afb5652dbe25f52f6aa46973f83	3c8ba02a15cc7e850382da44a04a1d68
1025	SVC-GDB-001	AGY-005	ea_portal	\N	government	3	5	3	4	4	Staff need more training	f	2025-09-05 19:26:08.289113	8df8176b104b8aca027ed8506d00cbf9	ce2b04d66d8ba622c4f64073362bf501
1026	SVC-GDB-001	AGY-005	ea_portal	\N	visitor	5	4	3	5	3	\N	f	2025-09-15 19:26:08.289113	fe41d10c8db375eb886771f5229ec871	fe341de2974c98beb0cb3b6a17ce5024
1027	SVC-GDB-001	AGY-005	ea_portal	\N	government	3	5	3	4	5	\N	f	2025-08-19 11:26:08.289113	6d5e0b6a419a48a1a342f708fceb65b4	cff63d34ef4b24ab1b2d522e2184b675
1028	SVC-GDB-001	AGY-005	ea_portal	\N	government	3	4	3	5	3	Quick and efficient processing	f	2025-09-18 16:26:08.289113	7460e514dd654cc2e5b8ff4429582974	82571f372fe3f2dfb3023274088daff9
1029	SVC-GDB-001	AGY-005	ea_portal	\N	visitor	4	5	3	4	5	\N	f	2025-09-18 16:26:08.289113	c53a09618e40e1927d3c17bc7a8ab158	a25bf253b8fad8771a81c70e9b51d840
1030	SVC-GDB-001	AGY-005	ea_portal	\N	business	4	4	4	5	3	Process was straightforward and efficient	f	2025-10-28 18:26:08.289113	6bd441033d73045232a577edad531c46	3634cd6d5f0d8c7ecb395959074225f4
1031	SVC-GDB-001	AGY-005	ea_portal	\N	business	4	5	3	3	4	\N	f	2025-08-13 12:26:08.289113	d682de8e7a7a7b49fc3323acb1a3975d	8b0a54837768cb0eabc2f7ff4da51622
1032	SVC-TUR-001	AGY-001	ea_portal	\N	business	5	4	3	5	3	Online portal works well	f	2025-09-13 11:26:08.289113	2988ce61673edf6c01b983f264ad0fe4	5d160f4c764fc54869d15d7e42abed81
1033	SVC-TUR-001	AGY-001	ea_portal	\N	other	4	5	2	3	4	Could be faster but overall good experience	f	2025-10-27 20:26:08.289113	944fb7d227f3140f6cb045e510ae63a3	52408d687ae3bbab937a0ebc93bacbc9
1034	SVC-TUR-001	AGY-001	ea_portal	\N	government	3	5	3	3	5	\N	f	2025-08-16 17:26:08.289113	23dbc1e9f26ceeea225ecffbc894777a	220a9bea7af15ca75b4fa56f3125c580
1035	SVC-TUR-001	AGY-001	ea_portal	\N	visitor	4	5	4	3	3	\N	f	2025-08-18 13:26:08.289113	fc8d91cdf12b2a22e97503ad69d2fb4f	3c8ba02a15cc7e850382da44a04a1d68
1036	SVC-TUR-001	AGY-001	ea_portal	\N	visitor	5	4	3	3	5	\N	f	2025-10-25 09:26:08.289113	711360a557d1873e2799a747595996cf	ce2b04d66d8ba622c4f64073362bf501
1037	SVC-TUR-001	AGY-001	ea_portal	\N	government	3	3	4	3	4	\N	f	2025-09-01 19:26:08.289113	c373ba7c53a7e55120febb36caed27da	fe341de2974c98beb0cb3b6a17ce5024
1038	SVC-TUR-001	AGY-001	ea_portal	\N	other	4	4	4	3	5	\N	f	2025-10-21 15:26:08.289113	76c023566c9714bf72e8a4da6ee776dd	cff63d34ef4b24ab1b2d522e2184b675
1039	SVC-TUR-001	AGY-001	ea_portal	\N	visitor	5	4	3	3	5	Forms were confusing	t	2025-08-27 04:26:08.289113	2a60380fbcc4654ef23e7838b6813ebd	82571f372fe3f2dfb3023274088daff9
1040	SVC-TUR-001	AGY-001	ea_portal	\N	other	4	3	3	4	5	\N	f	2025-10-23 03:26:08.289113	41d94a89ea4f7523adbbb63eb0b07f6c	a25bf253b8fad8771a81c70e9b51d840
1041	SVC-TUR-001	AGY-001	ea_portal	\N	government	5	4	4	5	5	\N	f	2025-08-18 21:26:08.289113	4246f7f4c5d02fec4fb234e09f28c04b	3634cd6d5f0d8c7ecb395959074225f4
1042	SVC-TUR-001	AGY-001	ea_portal	\N	business	3	4	4	5	3	Staff were helpful and professional	f	2025-10-26 15:26:08.289113	272323302fa45ba320715d1d522ae2da	8b0a54837768cb0eabc2f7ff4da51622
1043	SVC-TUR-001	AGY-001	ea_portal	\N	visitor	5	3	2	3	5	\N	f	2025-09-30 18:26:08.289113	d18c002639617c3fa7592d125caccf8f	0ffaacc58988223f07ca96d9dd66594f
1044	SVC-TUR-001	AGY-001	ea_portal	\N	other	4	5	4	5	4	\N	f	2025-09-27 21:26:08.289113	03f3ed98b62b271774d0f804301dd0f6	d60912abe2aee39735814b28c6fe9358
1045	SVC-TUR-001	AGY-001	ea_portal	\N	citizen	3	3	2	4	3	Clear instructions provided	f	2025-08-11 01:26:08.289113	ba219c7ae1d1d7b19c037a0025c3f25b	f98dc6b0b5d1f0c5c036102c24663633
1046	SVC-TUR-001	AGY-001	ea_portal	\N	business	5	5	4	4	4	Staff were helpful and professional	f	2025-11-05 12:26:08.289113	8254401afcb9480e4f24b64787db818d	269c1a7debd201bbb8b463d2b370268c
1047	SVC-TUR-001	AGY-001	ea_portal	\N	business	4	3	2	3	3	\N	f	2025-10-29 05:26:08.289113	92bfbcccdf9a41585c011897045b318b	384bc57d0acfb0fdd9b6d350127b1db8
1048	SVC-TUR-001	AGY-001	ea_portal	\N	visitor	5	5	2	5	5	\N	f	2025-10-23 00:26:08.289113	2a02f888daa5883f766201c2326e9dbc	7e67cec51492ff8359607dfa8be8283a
1049	SVC-TUR-001	AGY-001	ea_portal	\N	business	3	5	2	3	5	Would recommend this service	f	2025-11-03 04:26:08.289113	4e3e13cac72d179c35804c54fa95d592	c6eb6e6e6126fc98cde6d3092d6e6dba
1050	SVC-TUR-001	AGY-001	ea_portal	\N	government	4	4	3	5	5	Process was straightforward and efficient	f	2025-09-04 12:26:08.289113	f8fa41f4d4949423963ab3ee299d7192	b876b2cc50dcd0ec68c8baf641596c1a
1051	SVC-TUR-001	AGY-001	ea_portal	\N	visitor	5	5	2	3	5	\N	f	2025-10-06 03:26:08.289113	762894ef45900c00568135bc93b50d57	d483dfb198ba244f434cad810c71a18f
1052	SVC-TUR-001	AGY-001	ea_portal	\N	other	3	5	2	4	5	\N	f	2025-10-16 03:26:08.289113	e7d9a82990f340aa770dccf0347ba061	750c057d93c2f0f2aefd8c45d2d79547
1053	SVC-TUR-001	AGY-001	ea_portal	\N	business	4	5	2	3	4	System had technical issues	f	2025-10-17 07:26:08.289113	819ac1a6384ab264f5981a6f76db611c	407130efd00a3625c3b0f90193da5cb6
1054	SVC-TUR-001	AGY-001	ea_portal	\N	citizen	3	4	3	4	4	System had technical issues	f	2025-08-25 01:26:08.289113	06391c89ce3f6e47fc96e2afc1642683	f49809e7260afc6537e338ae544c2890
1055	SVC-TUR-001	AGY-001	ea_portal	\N	business	5	5	3	3	4	\N	f	2025-09-18 15:26:08.289113	ac36b3da61c8261ac33904e0e2b5b66a	a2f1416a4c03db2e859b0eca8b59b81d
1056	SVC-TUR-001	AGY-001	ea_portal	\N	citizen	5	3	3	3	4	\N	f	2025-10-06 23:26:08.289113	2aabbe82a36a4a417386f1102f45460d	08b0e5518831c5f0eee6de2e23996c8a
1057	SVC-TUR-001	AGY-001	ea_portal	\N	other	4	3	3	5	5	\N	f	2025-09-29 03:26:08.289113	a24845ab53acfc750b0c928f36da5098	148a658f903a969ba9dadf9f07934243
1058	SVC-TUR-001	AGY-001	ea_portal	\N	other	4	5	3	5	4	Process was straightforward and efficient	f	2025-10-01 14:26:08.289113	8801fddf5237a54fa50397b37b887db9	277ae74bc10a8a7e3c7e8d662b8c16c5
1059	SVC-TUR-001	AGY-001	ea_portal	\N	government	4	5	2	3	4	\N	f	2025-08-18 06:26:08.289113	7ede046c32d073092ab0d94aeecace6d	2d73a2bec4ff8aeddca403f4bb7ff1ff
1060	SVC-TUR-001	AGY-001	ea_portal	\N	business	5	4	2	5	5	Excellent service, very satisfied	t	2025-11-06 11:26:08.289113	c032254e4cfc74c5a37a6b457b2b33ec	126f5a8458e643efc9dbbf3aa431ba7f
1061	SVC-TUR-001	AGY-001	ea_portal	\N	government	3	3	3	4	5	\N	f	2025-10-02 09:26:08.289113	e975860bcd58de57eafc88884fd0bde4	ccc2daced677e7b6ff61d72cf9b217da
1062	SVC-TUR-001	AGY-001	ea_portal	\N	citizen	4	5	3	3	4	\N	f	2025-08-16 06:26:08.289113	079d32db60fc4b2c828f985a0ae4e3e7	80d5418953fde6cbd1424f905adac1b9
1063	SVC-TUR-001	AGY-001	ea_portal	\N	other	3	4	4	3	5	\N	f	2025-09-07 00:26:08.289113	8ec51b8c24250483a7af0c88e4b00aa3	f623d2ca14dfdb774bfc8a02723cd4a0
1064	SVC-TUR-002	AGY-001	ea_portal	\N	other	3	3	2	5	4	\N	f	2025-08-31 02:26:08.289113	cd5f1b86e007623c027f60036a1c7cc9	5d160f4c764fc54869d15d7e42abed81
1065	SVC-TUR-002	AGY-001	ea_portal	\N	other	4	4	4	5	5	\N	f	2025-08-23 09:26:08.289113	a02d5a93e4384bc72b13ba993b81ae89	52408d687ae3bbab937a0ebc93bacbc9
1066	SVC-TUR-002	AGY-001	ea_portal	\N	government	3	3	3	3	5	Staff were helpful and professional	f	2025-09-11 18:26:08.289113	506e4cac9da7aa4dfcb4ed447fdfed6e	220a9bea7af15ca75b4fa56f3125c580
1067	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	3	3	4	3	5	\N	f	2025-10-02 17:26:08.289113	af21dad5c5cdb075db01f41101118c98	3c8ba02a15cc7e850382da44a04a1d68
1068	SVC-TUR-002	AGY-001	ea_portal	\N	government	4	5	3	4	4	Waiting time was reasonable	f	2025-08-27 06:26:08.289113	5ffced1de2da54c5934b88bfc41fe524	ce2b04d66d8ba622c4f64073362bf501
1069	SVC-TUR-002	AGY-001	ea_portal	\N	other	5	5	4	5	3	System was easy to use	f	2025-09-27 18:26:08.289113	b3d1cdacee33473a2a12332ccbd9f900	fe341de2974c98beb0cb3b6a17ce5024
1070	SVC-TUR-002	AGY-001	ea_portal	\N	other	3	3	3	5	5	\N	f	2025-08-21 16:26:08.289113	e42068f885216be663bf93f34669e9ab	cff63d34ef4b24ab1b2d522e2184b675
1071	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	3	4	3	3	5	\N	f	2025-09-20 00:26:08.289113	31fd1634bc35cb6a32d66b69ef6a39a5	82571f372fe3f2dfb3023274088daff9
1072	SVC-TUR-002	AGY-001	ea_portal	\N	citizen	3	5	2	4	4	\N	f	2025-09-19 10:26:08.289113	50d1f040da0c1af0f904de261392a9b0	a25bf253b8fad8771a81c70e9b51d840
1073	SVC-TUR-002	AGY-001	ea_portal	\N	government	3	5	4	4	3	\N	f	2025-09-30 10:26:08.289113	7738308f08dd608cb26f9f4b13b9a178	3634cd6d5f0d8c7ecb395959074225f4
1074	SVC-TUR-002	AGY-001	ea_portal	\N	business	4	4	4	5	5	\N	f	2025-10-23 21:26:08.289113	e56b678adcac4dbca834f2d0a44ece9d	8b0a54837768cb0eabc2f7ff4da51622
1075	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	4	3	4	5	4	\N	f	2025-09-15 08:26:08.289113	6d6a69a6ff309d97b2ff24b5de56fa92	0ffaacc58988223f07ca96d9dd66594f
1076	SVC-TUR-002	AGY-001	ea_portal	\N	government	4	5	3	4	5	\N	f	2025-08-18 23:26:08.289113	93ad33c7e014173659f8a7fa4ff1aa8f	d60912abe2aee39735814b28c6fe9358
1077	SVC-TUR-002	AGY-001	ea_portal	\N	other	4	4	3	5	4	Documentation requirements unclear	f	2025-08-14 19:26:08.289113	83faea93806f857ca130cae74fc155db	f98dc6b0b5d1f0c5c036102c24663633
1078	SVC-TUR-002	AGY-001	ea_portal	\N	other	4	3	3	5	3	System had technical issues	f	2025-09-04 02:26:08.289113	f063db6d713a9cfd720f28d7f37e6541	269c1a7debd201bbb8b463d2b370268c
1079	SVC-TUR-002	AGY-001	ea_portal	\N	business	3	5	4	5	4	Clear instructions provided	f	2025-09-09 01:26:08.289113	5286ddefbfa21eab795b886d1de92527	384bc57d0acfb0fdd9b6d350127b1db8
1080	SVC-TUR-002	AGY-001	ea_portal	\N	citizen	3	3	2	4	4	\N	f	2025-11-02 18:26:08.289113	18eb1150301ee1e7ee0bb3f2374cfe4f	7e67cec51492ff8359607dfa8be8283a
1081	SVC-TUR-002	AGY-001	ea_portal	\N	other	3	3	2	4	3	\N	f	2025-10-23 05:26:08.289113	1a1080d7583b3963ad548e6498d92fce	c6eb6e6e6126fc98cde6d3092d6e6dba
1082	SVC-TUR-002	AGY-001	ea_portal	\N	government	4	3	2	4	3	Documentation requirements unclear	f	2025-09-27 17:26:08.289113	7d3325e91d02c23ce1c63e56eb66b127	b876b2cc50dcd0ec68c8baf641596c1a
1083	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	3	4	4	3	4	Staff were helpful and professional	f	2025-10-31 15:26:08.289113	7d961a37597ed79a8f9c7e6fca7c4fb0	d483dfb198ba244f434cad810c71a18f
1084	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	3	5	3	3	4	\N	f	2025-09-06 08:26:08.289113	7c3e8523686d135d891e2499d90f298d	750c057d93c2f0f2aefd8c45d2d79547
1085	SVC-TUR-002	AGY-001	ea_portal	\N	business	3	3	3	5	4	\N	f	2025-08-24 03:26:08.289113	9fdff7987b905f5df5b1753fffbf0f21	407130efd00a3625c3b0f90193da5cb6
1086	SVC-TUR-002	AGY-001	ea_portal	\N	government	4	4	2	5	3	\N	f	2025-08-14 17:26:08.289113	71e3e197ebb46f082d0ef388ce1ec525	f49809e7260afc6537e338ae544c2890
1087	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	5	4	2	4	4	\N	f	2025-10-06 20:26:08.289113	45cf2956b0477844169af4df339db399	a2f1416a4c03db2e859b0eca8b59b81d
1088	SVC-TUR-002	AGY-001	ea_portal	\N	citizen	4	5	2	5	4	\N	f	2025-08-22 02:26:08.289113	3f033c26549d3a21b58db21b6ea18874	08b0e5518831c5f0eee6de2e23996c8a
1089	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	5	4	4	5	3	\N	f	2025-10-21 04:26:08.289113	93c429c980ef3d8555d166ae776a08ef	148a658f903a969ba9dadf9f07934243
1090	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	3	5	4	3	4	\N	f	2025-11-06 16:26:08.289113	31e406ab6732ecf1167b6388a2e2c12c	277ae74bc10a8a7e3c7e8d662b8c16c5
1091	SVC-TUR-002	AGY-001	ea_portal	\N	government	4	3	3	4	4	\N	f	2025-10-05 08:26:08.289113	8e24b7440d8a6c4bd27cbfde120537b1	2d73a2bec4ff8aeddca403f4bb7ff1ff
1092	SVC-TUR-002	AGY-001	ea_portal	\N	visitor	4	3	3	5	4	\N	f	2025-10-03 19:26:08.289113	d90f28446ddf4091ffea9ddd1ebc2fe9	126f5a8458e643efc9dbbf3aa431ba7f
1093	SVC-TUR-002	AGY-001	ea_portal	\N	other	4	3	4	3	4	\N	f	2025-10-09 05:26:08.289113	48b3463a9503e6b9f7a1dfc12f740829	ccc2daced677e7b6ff61d72cf9b217da
1094	SVC-TUR-002	AGY-001	ea_portal	\N	other	3	4	4	3	3	Quick and efficient processing	f	2025-10-25 03:26:08.289113	216c5e408f157211563cd4a84cbfc6f0	80d5418953fde6cbd1424f905adac1b9
1095	SVC-TUR-002	AGY-001	ea_portal	\N	business	5	5	4	4	3	Information was not clear	f	2025-08-21 16:26:08.289113	b0dc8e95c18473d3e1214179452bfc09	f623d2ca14dfdb774bfc8a02723cd4a0
1096	SVC-TUR-002	AGY-001	ea_portal	\N	citizen	4	5	2	4	5	Clear instructions provided	f	2025-09-16 04:26:08.289113	7544d9a594233179db7d2ec40213fad7	0ad99666ef50e1baf8614b09adbb9f2a
1097	SVC-TUR-002	AGY-001	ea_portal	\N	citizen	4	5	3	4	3	Online portal works well	f	2025-09-08 11:26:08.289113	3a9b8a148857cd8ef5ca517ae441c58d	dd21346fb0c17dacbd5aa6dfd3ec9b2f
1098	SVC-TUR-002	AGY-001	ea_portal	\N	citizen	3	4	2	5	3	\N	f	2025-11-07 04:26:08.289113	d40399aab40a09c7cb66670fb81e8a9a	bc0c0f5d6bdab2824f8e8e2a8690928b
1099	SVC-TUR-003	AGY-001	ea_portal	\N	government	5	3	3	3	4	\N	f	2025-09-25 08:26:08.289113	a73a2a1ecd0e1ccfb99a6f6e01ba10d7	5d160f4c764fc54869d15d7e42abed81
1100	SVC-TUR-003	AGY-001	ea_portal	\N	business	5	4	3	5	3	Clear instructions provided	f	2025-10-03 09:26:08.289113	97f7813adf55949272e86eeb5257ad33	52408d687ae3bbab937a0ebc93bacbc9
1101	SVC-TUR-003	AGY-001	ea_portal	\N	government	3	3	4	3	4	Would recommend this service	f	2025-09-13 19:26:08.289113	4072be57b9388333de01f7d56e11f999	220a9bea7af15ca75b4fa56f3125c580
1102	SVC-TUR-003	AGY-001	ea_portal	\N	business	5	5	3	4	3	\N	f	2025-08-28 05:26:08.289113	c147557466e66ef8a89d1299d26ef48e	3c8ba02a15cc7e850382da44a04a1d68
1103	SVC-TUR-003	AGY-001	ea_portal	\N	government	3	4	2	3	4	\N	f	2025-09-20 03:26:08.289113	afdde1bf47ffbf6f76596aa30e4edc2d	ce2b04d66d8ba622c4f64073362bf501
1104	SVC-TUR-003	AGY-001	ea_portal	\N	business	4	5	2	5	3	\N	f	2025-09-26 19:26:08.289113	62b43b0267115d27c92980d1d68b78f1	fe341de2974c98beb0cb3b6a17ce5024
1105	SVC-TUR-003	AGY-001	ea_portal	\N	government	5	3	3	4	4	\N	f	2025-09-07 00:26:08.289113	cdf502529371f0adf4976684bacb393d	cff63d34ef4b24ab1b2d522e2184b675
1106	SVC-TUR-003	AGY-001	ea_portal	\N	government	5	5	3	3	3	Staff were helpful and professional	f	2025-10-21 14:26:08.289113	301e78b651971d90375a6542cc28acc1	82571f372fe3f2dfb3023274088daff9
1107	SVC-TUR-003	AGY-001	ea_portal	\N	visitor	3	5	2	5	3	\N	f	2025-09-09 09:26:08.289113	bce4fb8ed02af9b0ced3fc51ef0a0ea1	a25bf253b8fad8771a81c70e9b51d840
1108	SVC-TUR-003	AGY-001	ea_portal	\N	citizen	4	4	4	4	5	\N	f	2025-11-01 13:26:08.289113	e79bd25c6cacfb3d13df939af059bbce	3634cd6d5f0d8c7ecb395959074225f4
1109	SVC-TUR-003	AGY-001	ea_portal	\N	government	5	5	4	4	5	\N	f	2025-09-20 19:26:08.289113	356d846b2d008d9840818a383cd14fb7	8b0a54837768cb0eabc2f7ff4da51622
1110	SVC-TUR-003	AGY-001	ea_portal	\N	visitor	5	3	3	3	4	\N	f	2025-10-15 05:26:08.289113	57b584011363f9624b92b685265e8174	0ffaacc58988223f07ca96d9dd66594f
1111	SVC-TUR-003	AGY-001	ea_portal	\N	government	4	3	2	4	3	Forms were confusing	f	2025-08-26 23:26:08.289113	3f5f3c87f5a7a452025978cfff512f01	d60912abe2aee39735814b28c6fe9358
1112	SVC-TUR-003	AGY-001	ea_portal	\N	government	5	5	3	3	5	\N	f	2025-09-04 00:26:08.289113	9691b7092fea05afed35ff1db9735460	f98dc6b0b5d1f0c5c036102c24663633
1113	SVC-TUR-003	AGY-001	ea_portal	\N	citizen	5	5	3	4	4	\N	f	2025-08-18 02:26:08.289113	396321e8cb5ff46f9023b59ce7b1f267	269c1a7debd201bbb8b463d2b370268c
1114	SVC-TUR-003	AGY-001	ea_portal	\N	visitor	4	5	3	5	4	Clear instructions provided	f	2025-10-31 01:26:08.289113	4fcd8f3ecceaa222c19deb45ad528c96	384bc57d0acfb0fdd9b6d350127b1db8
1115	SVC-TUR-003	AGY-001	ea_portal	\N	government	4	5	2	5	3	Documentation requirements unclear	f	2025-11-02 17:26:08.289113	8245b31753d2ee14f0ed7ac9fa7fb3d7	7e67cec51492ff8359607dfa8be8283a
1116	SVC-TUR-003	AGY-001	ea_portal	\N	government	5	5	3	5	3	\N	f	2025-10-19 02:26:08.289113	4f54a2e25d199dc8260abafd516a8ce5	c6eb6e6e6126fc98cde6d3092d6e6dba
1117	SVC-TUR-003	AGY-001	ea_portal	\N	business	5	4	4	5	3	Online portal works well	f	2025-10-26 12:26:08.289113	d146313ce9c8a5ffad9f6e0d24a66093	b876b2cc50dcd0ec68c8baf641596c1a
1118	SVC-TUR-003	AGY-001	ea_portal	\N	business	5	3	3	3	5	\N	f	2025-10-16 00:26:08.289113	911d71e50db2a204cb07ad7715d98c02	d483dfb198ba244f434cad810c71a18f
1119	SVC-TUR-003	AGY-001	ea_portal	\N	visitor	4	5	2	5	5	Online portal works well	f	2025-09-13 04:26:08.289113	ba3878344f2b404a5d1ef08bbe2f7ebb	750c057d93c2f0f2aefd8c45d2d79547
1120	SVC-TUR-003	AGY-001	ea_portal	\N	business	3	3	4	5	3	\N	f	2025-09-28 02:26:08.289113	4d3e25d587810492fb8a5594528da258	407130efd00a3625c3b0f90193da5cb6
1121	SVC-TUR-003	AGY-001	ea_portal	\N	government	3	3	2	5	3	Staff need more training	f	2025-09-13 23:26:08.289113	40b0eda913b27e8194c5332d79be2d5d	f49809e7260afc6537e338ae544c2890
1122	SVC-TUR-003	AGY-001	ea_portal	\N	other	3	5	4	5	5	\N	f	2025-09-09 04:26:08.289113	73eb9d64b6f08da02b18f26978089ff0	a2f1416a4c03db2e859b0eca8b59b81d
1123	SVC-TUR-003	AGY-001	ea_portal	\N	other	4	3	4	4	5	Forms were confusing	f	2025-10-22 22:26:08.289113	b5a1fe30bbb461380e42ef88b074c282	08b0e5518831c5f0eee6de2e23996c8a
1124	SVC-TUR-003	AGY-001	ea_portal	\N	other	3	4	4	3	4	Staff were helpful and professional	f	2025-08-15 08:26:08.289113	0181d9c130ff8bb49b75524e2a3cbfb9	148a658f903a969ba9dadf9f07934243
1125	SVC-TUR-003	AGY-001	ea_portal	\N	other	4	5	4	4	4	\N	f	2025-09-15 12:26:08.289113	95efb7a05e6e778c25ff7927556fb492	277ae74bc10a8a7e3c7e8d662b8c16c5
1126	SVC-TUR-003	AGY-001	ea_portal	\N	citizen	4	5	2	3	3	\N	f	2025-10-10 11:26:08.289113	a007a102ed2aba37af091c52b733c9a9	2d73a2bec4ff8aeddca403f4bb7ff1ff
1127	SVC-TUR-003	AGY-001	ea_portal	\N	government	4	3	4	5	3	\N	f	2025-08-30 17:26:08.289113	b8666173a7f49617ad253d249d737721	126f5a8458e643efc9dbbf3aa431ba7f
1128	SVC-TUR-003	AGY-001	ea_portal	\N	other	3	5	4	3	5	\N	t	2025-09-28 07:26:08.289113	8f563b9aa11e3c196060bf53401d0a18	ccc2daced677e7b6ff61d72cf9b217da
1129	SVC-TUR-003	AGY-001	ea_portal	\N	citizen	4	4	4	5	3	\N	f	2025-09-28 04:26:08.289113	a97579571db079211edc8b8f82341c7f	80d5418953fde6cbd1424f905adac1b9
1130	SVC-TUR-003	AGY-001	ea_portal	\N	citizen	4	5	4	5	5	Clear instructions provided	f	2025-09-26 03:26:08.289113	5157af3e94f01e4d964aa7b1fe0a696e	f623d2ca14dfdb774bfc8a02723cd4a0
1131	SVC-TUR-003	AGY-001	ea_portal	\N	citizen	4	4	4	4	3	Online portal works well	f	2025-10-27 17:26:08.289113	98929f560dce47a7bd31472859c97898	0ad99666ef50e1baf8614b09adbb9f2a
1132	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	3	3	4	5	3	Excellent service, very satisfied	f	2025-09-06 10:26:08.289113	1ee4798bcda36083553cb64fe740ad74	5d160f4c764fc54869d15d7e42abed81
1133	SVC-BIZ-001	MIN-001	ea_portal	\N	other	4	4	3	5	3	Forms were confusing	f	2025-10-03 18:26:08.289113	933c36800256ac7a80cf7258dddf3219	52408d687ae3bbab937a0ebc93bacbc9
1134	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	3	5	3	3	5	Staff were helpful and professional	f	2025-09-22 21:26:08.289113	535dc2514620adf07123d426d792bd33	220a9bea7af15ca75b4fa56f3125c580
1135	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	5	3	2	3	4	\N	f	2025-10-31 07:26:08.289113	f8244c7673f115600559da666dfad2a4	3c8ba02a15cc7e850382da44a04a1d68
1136	SVC-BIZ-001	MIN-001	ea_portal	\N	business	3	4	3	5	5	\N	f	2025-09-12 20:26:08.289113	b3ce965fd8a62eadb87c44f6a2c7383b	ce2b04d66d8ba622c4f64073362bf501
1137	SVC-BIZ-001	MIN-001	ea_portal	\N	business	5	5	2	4	4	\N	f	2025-11-05 05:26:08.289113	6708fa14278eece11534ec8aea8ebd2a	fe341de2974c98beb0cb3b6a17ce5024
1138	SVC-BIZ-001	MIN-001	ea_portal	\N	visitor	5	3	3	5	5	\N	f	2025-10-21 00:26:08.289113	5f7c3424b69a687dbd1879bd5d30a3a5	cff63d34ef4b24ab1b2d522e2184b675
1139	SVC-BIZ-001	MIN-001	ea_portal	\N	business	5	4	2	4	4	\N	t	2025-10-30 03:26:08.289113	2df1b32f6385f0b10856896fffb88d3f	82571f372fe3f2dfb3023274088daff9
1140	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	4	5	3	3	4	\N	f	2025-08-27 08:26:08.289113	5cbf5fcc03be4497397d11a64a667827	a25bf253b8fad8771a81c70e9b51d840
1141	SVC-BIZ-001	MIN-001	ea_portal	\N	business	4	3	3	3	4	\N	f	2025-11-07 03:26:08.289113	e10be54e6d382dd916d01bb1945806cc	3634cd6d5f0d8c7ecb395959074225f4
1142	SVC-BIZ-001	MIN-001	ea_portal	\N	business	3	3	3	5	4	System was easy to use	f	2025-08-13 18:26:08.289113	8339b8e728310cd40cf99ee2a947f7cb	8b0a54837768cb0eabc2f7ff4da51622
1143	SVC-BIZ-001	MIN-001	ea_portal	\N	government	5	5	2	4	4	\N	f	2025-08-26 10:26:08.289113	ad3588c4a0eda1db3475a505c41cdb9d	0ffaacc58988223f07ca96d9dd66594f
1144	SVC-BIZ-001	MIN-001	ea_portal	\N	government	3	3	4	4	5	Process was straightforward and efficient	f	2025-10-13 18:26:08.289113	da9fe28e868180563f0c9878abe3ec7e	d60912abe2aee39735814b28c6fe9358
1145	SVC-BIZ-001	MIN-001	ea_portal	\N	government	3	5	4	3	5	\N	f	2025-09-27 08:26:08.289113	8698fec828916fb2c915397fbb6f6dad	f98dc6b0b5d1f0c5c036102c24663633
1146	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	5	4	2	4	5	\N	f	2025-11-07 10:26:08.289113	21d233ce4b38e4bfc9faab1c9ec2f472	269c1a7debd201bbb8b463d2b370268c
1147	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	4	5	3	5	5	\N	f	2025-10-01 15:26:08.289113	49a962bc161289b88cfbadfe6d30c931	384bc57d0acfb0fdd9b6d350127b1db8
1148	SVC-BIZ-001	MIN-001	ea_portal	\N	visitor	4	4	2	3	3	\N	f	2025-10-07 22:26:08.289113	4b36caea194ff223c76ad1199caf4b04	7e67cec51492ff8359607dfa8be8283a
1149	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	5	4	4	4	3	Staff need more training	f	2025-08-17 01:26:08.289113	20047f654b7d6819fe5a335f63397471	c6eb6e6e6126fc98cde6d3092d6e6dba
1150	SVC-BIZ-001	MIN-001	ea_portal	\N	visitor	3	5	3	4	3	System was easy to use	f	2025-08-15 14:26:08.289113	05d0eea063bef06c887fbf1ad5b8e83a	b876b2cc50dcd0ec68c8baf641596c1a
1151	SVC-BIZ-001	MIN-001	ea_portal	\N	other	3	4	4	4	4	\N	f	2025-09-02 23:26:08.289113	f7357ba05a72337ab91bc64c5f4f0ba6	d483dfb198ba244f434cad810c71a18f
1152	SVC-BIZ-001	MIN-001	ea_portal	\N	government	5	4	4	5	5	Forms were confusing	f	2025-09-15 10:26:08.289113	de5d2272afe804e65d1e1ac4e5887809	750c057d93c2f0f2aefd8c45d2d79547
1153	SVC-BIZ-001	MIN-001	ea_portal	\N	visitor	4	4	2	3	4	\N	f	2025-11-02 19:26:08.289113	ddd7185860a8a36a2c47995914ce656b	407130efd00a3625c3b0f90193da5cb6
1154	SVC-BIZ-001	MIN-001	ea_portal	\N	other	3	4	3	3	5	\N	f	2025-10-18 21:26:08.289113	bf3da060a18b45251678f27223c18b2c	f49809e7260afc6537e338ae544c2890
1155	SVC-BIZ-001	MIN-001	ea_portal	\N	business	3	3	4	5	5	\N	f	2025-10-31 21:26:08.289113	daba80e8385b6b7020560329b20d1d68	a2f1416a4c03db2e859b0eca8b59b81d
1156	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	4	4	2	3	3	System had technical issues	f	2025-08-26 15:26:08.289113	c3ad0f3c0a225f24b94b75005196459d	08b0e5518831c5f0eee6de2e23996c8a
1157	SVC-BIZ-001	MIN-001	ea_portal	\N	citizen	3	4	4	3	5	\N	f	2025-09-03 11:26:08.289113	5517ab35f7b5aedbf0775d4554dfd50b	148a658f903a969ba9dadf9f07934243
1158	SVC-GIDC-001	AGY-007	ea_portal	\N	business	5	3	2	5	5	\N	f	2025-09-25 17:26:08.289113	213b6a452a05563bfb63cf39dc8df226	5d160f4c764fc54869d15d7e42abed81
1159	SVC-GIDC-001	AGY-007	ea_portal	\N	business	4	5	2	4	5	\N	f	2025-11-05 22:26:08.289113	f91be11088240cb4cefcda5115abe542	52408d687ae3bbab937a0ebc93bacbc9
1160	SVC-GIDC-001	AGY-007	ea_portal	\N	business	4	4	2	3	3	\N	f	2025-10-07 11:26:08.289113	d3cf5e6fa812991f9448a3d1d14242aa	220a9bea7af15ca75b4fa56f3125c580
1161	SVC-GIDC-001	AGY-007	ea_portal	\N	government	3	3	2	5	4	\N	f	2025-08-18 20:26:08.289113	49c34a1d6dc2dadf7f5ada88c31ad686	3c8ba02a15cc7e850382da44a04a1d68
1162	SVC-GIDC-001	AGY-007	ea_portal	\N	other	3	4	3	3	4	\N	f	2025-09-29 16:26:08.289113	d0d95d450fd3c730127eed5c0b2ca4b4	ce2b04d66d8ba622c4f64073362bf501
1163	SVC-GIDC-001	AGY-007	ea_portal	\N	visitor	5	5	3	5	4	Process needs improvement	f	2025-10-12 07:26:08.289113	de79a6d8b7de9c4aab99a04556942a30	fe341de2974c98beb0cb3b6a17ce5024
1164	SVC-GIDC-001	AGY-007	ea_portal	\N	other	3	4	3	5	5	\N	f	2025-10-15 23:26:08.289113	454c9886e9138534bc6a7a5c21f3a0a2	cff63d34ef4b24ab1b2d522e2184b675
1165	SVC-GIDC-001	AGY-007	ea_portal	\N	government	4	5	3	3	4	Process needs improvement	f	2025-11-05 19:26:08.289113	059bd1bbcc06c008a387a765cdfbc7c1	82571f372fe3f2dfb3023274088daff9
1166	SVC-GIDC-001	AGY-007	ea_portal	\N	other	3	5	4	4	3	Process was straightforward and efficient	f	2025-11-03 03:26:08.289113	6e7bce3f33a38e36c91102607c9005ca	a25bf253b8fad8771a81c70e9b51d840
1167	SVC-GIDC-001	AGY-007	ea_portal	\N	government	4	5	2	3	5	Forms were confusing	f	2025-09-26 05:26:08.289113	c218c7bac651f779babc32bfdd931c3c	3634cd6d5f0d8c7ecb395959074225f4
1168	SVC-GIDC-001	AGY-007	ea_portal	\N	other	4	4	3	4	5	System was easy to use	f	2025-08-20 08:26:08.289113	9f4faa35e3911451197229573d44e7b5	8b0a54837768cb0eabc2f7ff4da51622
1169	SVC-GIDC-001	AGY-007	ea_portal	\N	other	5	4	3	3	5	\N	f	2025-08-27 03:26:08.289113	436b687528e5d164b4e4877d59f0a56c	0ffaacc58988223f07ca96d9dd66594f
1170	SVC-GIDC-001	AGY-007	ea_portal	\N	visitor	4	4	3	5	4	\N	f	2025-09-23 15:26:08.289113	9b10217aae7aadd20aa351209448e364	d60912abe2aee39735814b28c6fe9358
1171	SVC-GIDC-001	AGY-007	ea_portal	\N	business	5	5	2	3	4	Process was straightforward and efficient	f	2025-10-05 12:26:08.289113	3ba2b1bc4f6a4e6fbea9be75e4ef8855	f98dc6b0b5d1f0c5c036102c24663633
1172	SVC-GIDC-001	AGY-007	ea_portal	\N	visitor	3	3	3	5	3	\N	f	2025-09-27 18:26:08.289113	073c34fc035fc0f8fcb034cd21f1803a	269c1a7debd201bbb8b463d2b370268c
1173	SVC-GIDC-001	AGY-007	ea_portal	\N	government	3	3	2	5	3	\N	f	2025-10-02 16:26:08.289113	f50731b31900ead1b8590257d109bd1a	384bc57d0acfb0fdd9b6d350127b1db8
1174	SVC-GIDC-001	AGY-007	ea_portal	\N	business	4	4	2	5	4	\N	f	2025-10-05 07:26:08.289113	ec81f776181280e87b9a8c2594ea0fcf	7e67cec51492ff8359607dfa8be8283a
1175	SVC-GIDC-001	AGY-007	ea_portal	\N	other	4	3	3	4	4	\N	f	2025-10-06 07:26:08.289113	1cfe3c4c6b812cac3274ec53b68c3582	c6eb6e6e6126fc98cde6d3092d6e6dba
1176	SVC-GIDC-001	AGY-007	ea_portal	\N	business	4	4	2	4	3	Forms were confusing	f	2025-09-10 15:26:08.289113	adf25b75d9b28d4ab7a5ee0012c50b8d	b876b2cc50dcd0ec68c8baf641596c1a
1177	SVC-GIDC-001	AGY-007	ea_portal	\N	government	4	3	3	5	4	Quick and efficient processing	f	2025-09-04 01:26:08.289113	0f67bbd82f4828086b613008ed055bf8	d483dfb198ba244f434cad810c71a18f
1178	SVC-GIDC-001	AGY-007	ea_portal	\N	visitor	5	5	3	3	4	\N	f	2025-10-23 01:26:08.289113	34efb0063cca204ad27d4c528e707854	750c057d93c2f0f2aefd8c45d2d79547
1179	SVC-GIDC-001	AGY-007	ea_portal	\N	business	4	5	2	3	5	\N	f	2025-10-01 19:26:08.289113	2aadf1a38e6d237c3b43d9eb148604e9	407130efd00a3625c3b0f90193da5cb6
1180	SVC-GIDC-001	AGY-007	ea_portal	\N	citizen	5	3	3	3	4	Clear instructions provided	f	2025-09-21 02:26:08.289113	5309b7ba709aab7ca74d5d565412561e	f49809e7260afc6537e338ae544c2890
1181	SVC-PLAN-001	AGY-012	ea_portal	\N	citizen	5	5	4	3	3	Forms were confusing	f	2025-08-29 18:26:08.289113	e013f799c7e0559d73a970e15f6f809c	5d160f4c764fc54869d15d7e42abed81
1182	SVC-PLAN-001	AGY-012	ea_portal	\N	citizen	4	5	3	3	3	\N	f	2025-10-24 09:26:08.289113	11d7ada22a22e8404b6d474ccee5c2cf	52408d687ae3bbab937a0ebc93bacbc9
1183	SVC-PLAN-001	AGY-012	ea_portal	\N	citizen	3	3	4	5	4	Would recommend this service	f	2025-10-10 12:26:08.289113	19e64a58e6758f279b584e2298c3bb08	220a9bea7af15ca75b4fa56f3125c580
1184	SVC-PLAN-001	AGY-012	ea_portal	\N	government	5	5	2	5	4	Process was straightforward and efficient	f	2025-09-02 21:26:08.289113	964fa0b7684c9f17cc59611aeab9c7e7	3c8ba02a15cc7e850382da44a04a1d68
1185	SVC-PLAN-001	AGY-012	ea_portal	\N	visitor	5	4	4	5	4	System was easy to use	f	2025-10-15 08:26:08.289113	0bf075cf92cfd93425c8448644a03232	ce2b04d66d8ba622c4f64073362bf501
1186	SVC-PLAN-001	AGY-012	ea_portal	\N	citizen	4	5	3	5	5	\N	f	2025-09-12 22:26:08.289113	d88610db9742abae04d73bb0d4836bbc	fe341de2974c98beb0cb3b6a17ce5024
1187	SVC-PLAN-001	AGY-012	ea_portal	\N	citizen	3	4	3	4	5	Could be faster but overall good experience	f	2025-10-02 07:26:08.289113	4ba22f607994e48ebdee43314acfaebe	cff63d34ef4b24ab1b2d522e2184b675
1188	SVC-PLAN-001	AGY-012	ea_portal	\N	government	5	5	4	3	5	\N	f	2025-10-04 20:26:08.289113	ea8f93ae2ab5f599021b3c650e607acf	82571f372fe3f2dfb3023274088daff9
1189	SVC-PLAN-001	AGY-012	ea_portal	\N	other	3	4	3	4	3	Long wait times experienced	f	2025-08-21 20:26:08.289113	b2bfc0d25b1eaa841d599d2ef8aa397d	a25bf253b8fad8771a81c70e9b51d840
1190	SVC-PLAN-001	AGY-012	ea_portal	\N	other	3	4	3	5	5	Process needs improvement	t	2025-10-28 13:26:08.289113	6ddfff2adee8171bb313f5fc52becfd9	3634cd6d5f0d8c7ecb395959074225f4
1191	SVC-PLAN-001	AGY-012	ea_portal	\N	visitor	4	4	4	5	4	Long wait times experienced	f	2025-10-24 21:26:08.289113	0a039573e2532d0ea281186a13ba6a97	8b0a54837768cb0eabc2f7ff4da51622
1192	SVC-PLAN-001	AGY-012	ea_portal	\N	visitor	5	4	2	3	5	System had technical issues	f	2025-10-07 16:26:08.289113	1ac75f8d197be55b4a365d7bfc85bd4a	0ffaacc58988223f07ca96d9dd66594f
1193	SVC-PLAN-001	AGY-012	ea_portal	\N	government	4	5	4	3	5	\N	f	2025-09-07 08:26:08.289113	63958a68583b619c7e70a9c1faa14fc0	d60912abe2aee39735814b28c6fe9358
1194	SVC-PLAN-001	AGY-012	ea_portal	\N	business	4	4	3	5	5	\N	t	2025-08-13 13:26:08.289113	61aaab8862662749735ec458eb530751	f98dc6b0b5d1f0c5c036102c24663633
1195	SVC-PLAN-001	AGY-012	ea_portal	\N	visitor	4	4	4	4	5	\N	f	2025-09-10 16:26:08.289113	23b879cce39ac371ce9fcccb658e449f	269c1a7debd201bbb8b463d2b370268c
1196	SVC-PLAN-001	AGY-012	ea_portal	\N	visitor	4	5	3	3	3	\N	t	2025-09-01 06:26:08.289113	518dd5811fc5ddcae5645eb0da97dd37	384bc57d0acfb0fdd9b6d350127b1db8
1197	SVC-PLAN-001	AGY-012	ea_portal	\N	government	4	4	2	5	3	Long wait times experienced	f	2025-10-13 03:26:08.289113	46770e760f28bf8eb2589a0fbf0c3c9b	7e67cec51492ff8359607dfa8be8283a
1198	SVC-PLAN-001	AGY-012	ea_portal	\N	other	3	3	2	5	5	\N	f	2025-10-15 11:26:08.289113	90700335e92a2e264d4cb15a552898ee	c6eb6e6e6126fc98cde6d3092d6e6dba
1199	SVC-PLAN-001	AGY-012	ea_portal	\N	visitor	3	3	4	3	3	\N	f	2025-10-11 00:26:08.289113	4e639a96c385a66944278cf2b2f5adf0	b876b2cc50dcd0ec68c8baf641596c1a
1200	SVC-PLAN-001	AGY-012	ea_portal	\N	government	5	4	2	4	5	\N	f	2025-09-04 00:26:08.289113	7816e8496bb9031081ca43c7cfa65a50	d483dfb198ba244f434cad810c71a18f
1201	SVC-PLAN-001	AGY-012	ea_portal	\N	citizen	5	3	3	5	5	Staff were helpful and professional	f	2025-08-22 23:26:08.289113	c9d61eec6ed51cfb8a7ff08112c5e34b	750c057d93c2f0f2aefd8c45d2d79547
1202	SVC-PLAN-001	AGY-012	ea_portal	\N	visitor	4	5	3	5	5	Would recommend this service	f	2025-09-22 10:26:08.289113	c4a355e3d16a4647da940d8c6daef8b6	407130efd00a3625c3b0f90193da5cb6
1203	SVC-PLAN-001	AGY-012	ea_portal	\N	visitor	5	3	3	5	4	Service exceeded expectations	f	2025-09-23 12:26:08.289113	989d98ca9b5af1524b82ea8e02f66a7a	f49809e7260afc6537e338ae544c2890
1204	SVC-PLAN-001	AGY-012	ea_portal	\N	citizen	5	3	3	4	5	Process needs improvement	f	2025-09-02 11:26:08.289113	31d8b26163dcbec159c60fe820585dce	a2f1416a4c03db2e859b0eca8b59b81d
1205	SVC-PLAN-001	AGY-012	ea_portal	\N	other	5	3	4	4	3	\N	f	2025-10-27 12:26:08.289113	eda4822cf96517f3997c707e73345785	08b0e5518831c5f0eee6de2e23996c8a
1206	SVC-PLAN-001	AGY-012	ea_portal	\N	government	4	3	4	3	3	\N	f	2025-09-26 12:26:08.289113	097617bc50d3fa66d42c1f9b9d54f015	148a658f903a969ba9dadf9f07934243
1207	SVC-PLAN-001	AGY-012	ea_portal	\N	government	4	3	2	3	5	\N	f	2025-09-23 00:26:08.289113	aa73f6d0fa569eb53af104b7276c5914	277ae74bc10a8a7e3c7e8d662b8c16c5
1208	SVC-UTL-001	AGY-003	ea_portal	\N	government	5	3	2	4	5	Quick and efficient processing	f	2025-08-11 21:26:08.289113	c5028150f7d2b25e89155823a5080dc1	5d160f4c764fc54869d15d7e42abed81
1209	SVC-UTL-001	AGY-003	ea_portal	\N	government	3	3	4	4	3	\N	f	2025-08-14 09:26:08.289113	ce22f32b2551ed5c7e0566a94c33a30a	52408d687ae3bbab937a0ebc93bacbc9
1210	SVC-UTL-001	AGY-003	ea_portal	\N	citizen	4	4	3	5	3	\N	f	2025-09-27 06:26:08.289113	ebadef0c7838b64fccaa321d1cee2e2e	220a9bea7af15ca75b4fa56f3125c580
1211	SVC-UTL-001	AGY-003	ea_portal	\N	visitor	5	3	4	3	4	\N	t	2025-09-19 01:26:08.289113	a67a8620245620bba2b1f2a5aea6221c	3c8ba02a15cc7e850382da44a04a1d68
1212	SVC-UTL-001	AGY-003	ea_portal	\N	other	5	3	4	4	3	Excellent service, very satisfied	f	2025-10-29 20:26:08.289113	458fde808acc77a38c5cbe319329af91	ce2b04d66d8ba622c4f64073362bf501
1213	SVC-UTL-001	AGY-003	ea_portal	\N	citizen	4	5	2	5	4	Information was not clear	f	2025-10-14 08:26:08.289113	b8d1630b639dfc34ebaad72815dd592c	fe341de2974c98beb0cb3b6a17ce5024
1214	SVC-UTL-001	AGY-003	ea_portal	\N	government	5	3	2	3	5	System had technical issues	f	2025-11-05 06:26:08.289113	ce6f8e305dff0ffe5c8d7427d0177b71	cff63d34ef4b24ab1b2d522e2184b675
1215	SVC-UTL-001	AGY-003	ea_portal	\N	government	5	4	2	5	5	Process needs improvement	f	2025-09-28 07:26:08.289113	292418f1023391b8e89fff589f6d6c50	82571f372fe3f2dfb3023274088daff9
1216	SVC-UTL-001	AGY-003	ea_portal	\N	business	4	3	2	5	5	\N	f	2025-08-23 16:26:08.289113	0be9102c9b51b3b03e1d623b15c98f27	a25bf253b8fad8771a81c70e9b51d840
1217	SVC-UTL-001	AGY-003	ea_portal	\N	other	4	3	3	3	4	\N	f	2025-10-26 02:26:08.289113	3e433dafe908a65f9ebfdf842730ea83	3634cd6d5f0d8c7ecb395959074225f4
1218	SVC-UTL-001	AGY-003	ea_portal	\N	business	3	3	2	4	4	\N	t	2025-10-06 15:26:08.289113	2b9c2e2dc73ddce5c58ac55b756d5317	8b0a54837768cb0eabc2f7ff4da51622
1219	SVC-UTL-001	AGY-003	ea_portal	\N	government	5	5	3	5	4	\N	f	2025-10-15 13:26:08.289113	b50836447803208da046810825c6639f	0ffaacc58988223f07ca96d9dd66594f
1220	SVC-UTL-001	AGY-003	ea_portal	\N	citizen	3	3	2	4	5	\N	f	2025-09-12 14:26:08.289113	d1c73542090a526c8152af96f77be60f	d60912abe2aee39735814b28c6fe9358
1221	SVC-UTL-001	AGY-003	ea_portal	\N	citizen	5	5	2	3	4	Documentation requirements unclear	f	2025-08-15 13:26:08.289113	5a5a80a0baf50bcf928ca77fa3ce91e1	f98dc6b0b5d1f0c5c036102c24663633
1222	SVC-UTL-001	AGY-003	ea_portal	\N	visitor	5	3	4	4	4	\N	f	2025-10-30 21:26:08.289113	46b5a39b7e6656a900a2feb26b2da858	269c1a7debd201bbb8b463d2b370268c
1223	SVC-UTL-001	AGY-003	ea_portal	\N	business	4	3	2	3	3	\N	f	2025-09-24 04:26:08.289113	c6cd9b374145fec48abf3b24d279fa29	384bc57d0acfb0fdd9b6d350127b1db8
1224	SVC-UTL-001	AGY-003	ea_portal	\N	other	4	3	3	3	3	\N	f	2025-09-25 04:26:08.289113	323c3f9a962d985a3b50c0131d1631d0	7e67cec51492ff8359607dfa8be8283a
1225	SVC-UTL-001	AGY-003	ea_portal	\N	government	4	5	2	4	5	Forms were confusing	f	2025-09-05 21:26:08.289113	4251bdda27611d71421216b5d2ec92c3	c6eb6e6e6126fc98cde6d3092d6e6dba
1226	SVC-UTL-001	AGY-003	ea_portal	\N	citizen	5	3	2	4	5	\N	f	2025-09-12 09:26:08.289113	1549521c79c35d4a9b6cf377d82254e3	b876b2cc50dcd0ec68c8baf641596c1a
1227	SVC-UTL-001	AGY-003	ea_portal	\N	visitor	4	5	4	3	3	\N	f	2025-08-17 20:26:08.289113	7e0469b38280ab0c70a31bdb98f8f2ca	d483dfb198ba244f434cad810c71a18f
1228	SVC-UTL-002	AGY-003	ea_portal	\N	other	3	3	2	4	5	\N	f	2025-10-26 04:26:08.289113	17d9a59ba8b186436cf8b6c3e43fde88	5d160f4c764fc54869d15d7e42abed81
1229	SVC-UTL-002	AGY-003	ea_portal	\N	citizen	3	5	4	3	3	\N	f	2025-11-05 09:26:08.289113	4717afea73a5d4d150f296f54e78fa1a	52408d687ae3bbab937a0ebc93bacbc9
1230	SVC-UTL-002	AGY-003	ea_portal	\N	visitor	5	5	3	5	5	\N	f	2025-10-27 05:26:08.289113	3570651db64c5dae847b30b3890c46be	220a9bea7af15ca75b4fa56f3125c580
1231	SVC-UTL-002	AGY-003	ea_portal	\N	citizen	3	4	4	3	3	\N	f	2025-08-17 08:26:08.289113	6bd990b4c63ab058d2d41b9a3fd45c01	3c8ba02a15cc7e850382da44a04a1d68
1232	SVC-UTL-002	AGY-003	ea_portal	\N	government	4	3	2	5	3	System had technical issues	f	2025-08-21 02:26:08.289113	f1ad5c1c4fbd85e5dd489b7e526d7220	ce2b04d66d8ba622c4f64073362bf501
1233	SVC-UTL-002	AGY-003	ea_portal	\N	government	4	4	3	5	5	\N	f	2025-09-13 03:26:08.289113	86166cb0b9f78b426033cc46df90aebd	fe341de2974c98beb0cb3b6a17ce5024
1234	SVC-UTL-002	AGY-003	ea_portal	\N	citizen	5	5	4	4	5	\N	f	2025-09-06 11:26:08.289113	7279164821f8d2a7c232cb4fb3816eaa	cff63d34ef4b24ab1b2d522e2184b675
1235	SVC-UTL-002	AGY-003	ea_portal	\N	other	4	5	2	3	5	Could be faster but overall good experience	f	2025-10-02 19:26:08.289113	478ef885434f2193bb4a8dc044816c1e	82571f372fe3f2dfb3023274088daff9
1236	SVC-UTL-002	AGY-003	ea_portal	\N	visitor	3	4	4	5	4	\N	f	2025-09-06 19:26:08.289113	e8059de38402f772cbf0371a68871db4	a25bf253b8fad8771a81c70e9b51d840
1237	SVC-UTL-002	AGY-003	ea_portal	\N	business	5	4	2	4	3	\N	f	2025-09-21 00:26:08.289113	df270f6db33db19280ae08cf9b8f7b8c	3634cd6d5f0d8c7ecb395959074225f4
1238	SVC-UTL-002	AGY-003	ea_portal	\N	citizen	3	5	4	4	3	\N	f	2025-10-08 12:26:08.289113	89f825f5d99a437f632bc367c6ddaad9	8b0a54837768cb0eabc2f7ff4da51622
1239	SVC-UTL-002	AGY-003	ea_portal	\N	government	5	3	2	4	3	\N	f	2025-11-06 16:26:08.289113	b6fb4e76a88aec376f8a3aa0d39a5a04	0ffaacc58988223f07ca96d9dd66594f
1240	SVC-UTL-002	AGY-003	ea_portal	\N	citizen	4	5	2	4	5	Excellent service, very satisfied	f	2025-11-01 07:26:08.289113	28c8635bdf72980b9672affa154cc91f	d60912abe2aee39735814b28c6fe9358
1241	SVC-UTL-002	AGY-003	ea_portal	\N	other	5	5	4	4	4	\N	f	2025-11-07 16:26:08.289113	b1c8f3fe2a9905e9d96bb76c4b5f7a0b	f98dc6b0b5d1f0c5c036102c24663633
1242	SVC-UTL-002	AGY-003	ea_portal	\N	visitor	4	4	3	4	4	Information was not clear	f	2025-10-19 17:26:08.289113	e419e1caa39cacda6a474f7c02086787	269c1a7debd201bbb8b463d2b370268c
1243	SVC-UTL-002	AGY-003	ea_portal	\N	visitor	3	4	3	3	4	\N	f	2025-08-26 03:26:08.289113	c80503800ccf7701a5c0880bc3bbf4bd	384bc57d0acfb0fdd9b6d350127b1db8
1244	SVC-UTL-003	AGY-004	ea_portal	\N	citizen	5	3	4	5	3	\N	f	2025-10-30 15:26:08.289113	2d0a8aa790642633aa0a605fe6b2096a	5d160f4c764fc54869d15d7e42abed81
1245	SVC-UTL-003	AGY-004	ea_portal	\N	visitor	4	5	3	4	3	\N	f	2025-10-22 00:26:08.289113	dc673685dcf81c611953e780f9e71f57	52408d687ae3bbab937a0ebc93bacbc9
1246	SVC-UTL-003	AGY-004	ea_portal	\N	business	3	3	4	5	3	\N	f	2025-09-23 12:26:08.289113	4e938629356e6b444bbc684ec69bb658	220a9bea7af15ca75b4fa56f3125c580
1247	SVC-UTL-003	AGY-004	ea_portal	\N	other	3	3	3	5	3	\N	f	2025-09-10 08:26:08.289113	8904cf0f495c2ba6f1b333cdc91e8793	3c8ba02a15cc7e850382da44a04a1d68
1248	SVC-UTL-003	AGY-004	ea_portal	\N	citizen	5	3	3	5	4	\N	f	2025-10-08 18:26:08.289113	329d582cba2dbec8e8b9bfbfec1e7a15	ce2b04d66d8ba622c4f64073362bf501
1249	SVC-UTL-003	AGY-004	ea_portal	\N	business	4	5	2	4	4	\N	f	2025-08-22 20:26:08.289113	5981373b9f67ca1877ab5aba3ea9ee01	fe341de2974c98beb0cb3b6a17ce5024
1250	SVC-UTL-003	AGY-004	ea_portal	\N	other	4	5	2	5	5	Long wait times experienced	f	2025-11-02 10:26:08.289113	54355cd507461cea44690701297acdcb	cff63d34ef4b24ab1b2d522e2184b675
1251	SVC-UTL-003	AGY-004	ea_portal	\N	visitor	5	3	3	3	5	Forms were confusing	f	2025-10-21 10:26:08.289113	0e0a03a6366da16198c440f678852e09	82571f372fe3f2dfb3023274088daff9
1252	SVC-UTL-003	AGY-004	ea_portal	\N	visitor	5	3	3	4	5	\N	f	2025-09-14 21:26:08.289113	b2452a8f2792d6c349cd66ce420c9467	a25bf253b8fad8771a81c70e9b51d840
1253	SVC-UTL-003	AGY-004	ea_portal	\N	business	4	5	2	4	4	\N	f	2025-10-05 10:26:08.289113	24fa3a16ace3343dfd8055b638dbb312	3634cd6d5f0d8c7ecb395959074225f4
1254	SVC-UTL-003	AGY-004	ea_portal	\N	visitor	4	5	2	3	5	\N	f	2025-08-23 10:26:08.289113	46c8afbe57849b0a3cb53a445966605c	8b0a54837768cb0eabc2f7ff4da51622
1255	SVC-UTL-003	AGY-004	ea_portal	\N	visitor	5	5	3	4	4	\N	f	2025-09-01 04:26:08.289113	46abf4d81eaf3b71c011bacb3fe97871	0ffaacc58988223f07ca96d9dd66594f
1256	SVC-UTL-003	AGY-004	ea_portal	\N	citizen	3	4	4	4	4	\N	f	2025-10-28 13:26:08.289113	2a01ca64ac83f9dabfc4c5d6e30d67d4	d60912abe2aee39735814b28c6fe9358
1257	SVC-UTL-004	AGY-004	ea_portal	\N	visitor	4	3	3	4	4	System was easy to use	t	2025-09-12 01:26:08.289113	e0ca1253e13b2c0a8e668991d566b219	5d160f4c764fc54869d15d7e42abed81
1258	SVC-UTL-004	AGY-004	ea_portal	\N	visitor	3	3	2	5	5	\N	f	2025-10-02 04:26:08.289113	2ca67dd5a524a9f1930234ecd9163a20	52408d687ae3bbab937a0ebc93bacbc9
1259	SVC-UTL-004	AGY-004	ea_portal	\N	visitor	5	5	4	4	4	\N	f	2025-10-06 02:26:08.289113	b646ae420bf51f97ac21e75abbd2e989	220a9bea7af15ca75b4fa56f3125c580
1260	SVC-UTL-004	AGY-004	ea_portal	\N	business	3	3	3	5	4	\N	t	2025-09-13 16:26:08.289113	b1d1c7bbe22be808d6c9d0a52466a2a3	3c8ba02a15cc7e850382da44a04a1d68
1261	SVC-UTL-004	AGY-004	ea_portal	\N	business	5	3	4	4	5	Process needs improvement	f	2025-09-10 01:26:08.289113	83df178f418e29b168a7d54550b296fa	ce2b04d66d8ba622c4f64073362bf501
1262	SVC-UTL-004	AGY-004	ea_portal	\N	other	3	5	4	3	4	\N	f	2025-08-16 12:26:08.289113	afd68dc15cb3572344b0158679d1239c	fe341de2974c98beb0cb3b6a17ce5024
1263	SVC-UTL-004	AGY-004	ea_portal	\N	citizen	4	4	4	5	3	\N	f	2025-09-18 01:26:08.289113	c044401cffd29f1c670e98b460755cd4	cff63d34ef4b24ab1b2d522e2184b675
1264	SVC-UTL-004	AGY-004	ea_portal	\N	government	3	5	4	5	3	\N	f	2025-11-02 03:26:08.289113	b71b25f7ae2943f270cae0458d9eab52	82571f372fe3f2dfb3023274088daff9
1265	SVC-UTL-004	AGY-004	ea_portal	\N	citizen	5	3	3	3	5	\N	f	2025-10-29 19:26:08.289113	5ed9a6f1308900af94f6b6c2b42b0aa3	a25bf253b8fad8771a81c70e9b51d840
1266	SVC-UTL-004	AGY-004	ea_portal	\N	government	3	4	4	4	4	\N	f	2025-10-01 01:26:08.289113	ebb782396f9e7bdf9bf2a98910423a73	3634cd6d5f0d8c7ecb395959074225f4
1267	SVC-UTL-004	AGY-004	ea_portal	\N	visitor	3	4	4	4	3	Quick and efficient processing	f	2025-10-04 23:26:08.289113	9a10a5db902566745606be639aec3100	8b0a54837768cb0eabc2f7ff4da51622
1268	SVC-UTL-004	AGY-004	ea_portal	\N	other	5	5	2	3	3	System had technical issues	f	2025-10-18 10:26:08.289113	8935d6d3464964e7515763b48280a103	0ffaacc58988223f07ca96d9dd66594f
1269	SVC-UTL-004	AGY-004	ea_portal	\N	business	3	5	2	5	5	\N	f	2025-10-06 08:26:08.289113	7ac87f351f073b88768f126f51556d67	d60912abe2aee39735814b28c6fe9358
1270	SVC-UTL-004	AGY-004	ea_portal	\N	government	5	3	3	5	5	Waiting time was reasonable	f	2025-09-26 06:26:08.289113	ad4d583bfc207e41a7fb7066cc99f850	f98dc6b0b5d1f0c5c036102c24663633
1271	SVC-UTL-004	AGY-004	ea_portal	\N	government	4	4	2	5	4	System had technical issues	f	2025-09-03 12:26:08.289113	efb0f0469beb72015c574ba83ed4e522	269c1a7debd201bbb8b463d2b370268c
1272	SVC-IMM-001	DEPT-001	qr_code	QR-IMM-001-TEST	government	3	5	5	4	3	\N	f	2025-10-11 08:26:08.289113	fb7c80f11270f0848b80c10adf96e4f8	9a522fde8722188757855f9a37be7311
1273	SVC-IMM-001	DEPT-001	qr_code	QR-IMM-001-TEST	citizen	5	5	5	3	4	Information was not clear	f	2025-11-01 11:26:08.289113	782842d3bcbdf8d6b03ab143dae10469	01f0872f9d339a4e3ee45a375be1a637
1274	SVC-IMM-001	DEPT-001	qr_code	QR-IMM-001-TEST	citizen	5	3	4	4	5	Long wait times experienced	f	2025-09-10 00:26:08.289113	288f5d2fe339c350c13aedc63f6eacb0	4ffc74c9ab5ae3af690ccf382759fb25
1275	SVC-IMM-001	DEPT-001	qr_code	QR-IMM-001-TEST	government	4	3	4	5	5	Online portal works well	f	2025-10-30 04:26:08.289113	7948398ab4e27373f8a9b07c4babf351	64c090e61e65f8bce8a74816622935fb
1276	SVC-IMM-001	DEPT-001	qr_code	QR-IMM-001-TEST	government	3	4	3	4	4	\N	f	2025-09-14 00:26:08.289113	7ac805936823481cdf974980f00343d1	77954bebac6aacbe23de3ff40e73a8cc
1277	SVC-TAX-001	DEPT-002	qr_code	QR-TAX-001-TEST	visitor	3	5	5	5	4	Waiting time was reasonable	f	2025-10-06 11:26:08.289113	c43d0e8033c6df2ed247e156e9b3ecac	9a522fde8722188757855f9a37be7311
1278	SVC-TAX-001	DEPT-002	qr_code	QR-TAX-001-TEST	government	4	4	2	3	3	\N	f	2025-09-23 05:26:08.289113	81789d77c31a200b1ceddc53a89bdc77	01f0872f9d339a4e3ee45a375be1a637
1279	SVC-TAX-001	DEPT-002	qr_code	QR-TAX-001-TEST	citizen	4	4	4	4	4	\N	f	2025-10-05 22:26:08.289113	d608a8876f90424074ec2ef5e0701049	4ffc74c9ab5ae3af690ccf382759fb25
1280	SVC-TAX-001	DEPT-002	qr_code	QR-TAX-001-TEST	other	5	4	3	5	5	Excellent service, very satisfied	f	2025-11-02 08:26:08.289113	453cabf007484883c6da06614abb1fb1	64c090e61e65f8bce8a74816622935fb
1281	SVC-TAX-001	DEPT-002	qr_code	QR-TAX-001-TEST	visitor	3	3	4	5	5	Long wait times experienced	f	2025-09-17 11:26:08.289113	36666adb6f80fcd16fed455b0f61cc02	77954bebac6aacbe23de3ff40e73a8cc
1282	SVC-REG-010	DEPT-004	qr_code	QR-REG-001-TEST	other	5	5	2	5	3	\N	f	2025-09-23 14:26:08.289113	7a90ad25fbafde1dbdf226d6cd56b521	9a522fde8722188757855f9a37be7311
1283	SVC-REG-010	DEPT-004	qr_code	QR-REG-001-TEST	business	4	4	3	5	5	Process was straightforward and efficient	f	2025-10-01 01:26:08.289113	8818bbd417d3e74ca4fd1ae7679ef132	01f0872f9d339a4e3ee45a375be1a637
1284	SVC-REG-010	DEPT-004	qr_code	QR-REG-001-TEST	visitor	3	3	5	5	3	\N	f	2025-10-17 21:26:08.289113	77f5d428a6af6a287d3f0ba1c8cb5b32	4ffc74c9ab5ae3af690ccf382759fb25
1285	SVC-REG-010	DEPT-004	qr_code	QR-REG-001-TEST	business	4	4	3	3	4	\N	f	2025-10-30 05:26:08.289113	b9269f31ba3ac8e51fbdcf7c3b770c4a	64c090e61e65f8bce8a74816622935fb
1286	SVC-REG-010	DEPT-004	qr_code	QR-REG-001-TEST	citizen	3	4	5	5	4	\N	f	2025-10-08 22:26:08.289113	4e511739c4d6367e50b2b60be62e97b7	77954bebac6aacbe23de3ff40e73a8cc
1287	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-11-04 23:26:08.289113	594a62253f55d06876dbe92d5435fdfc	5b95e91668b0e793a26169cbe4611fcd
1288	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-05 23:26:08.289113	21c24514f3c0874709587c47ec8d5acd	ecbc4ac510ab2ef5d709705d800519fa
1289	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-29 23:26:08.289113	bb8b7f3c63206f413d94d698e25ae3c8	e0fcf0887b3f4ab94dd0c00b61f3ec03
1290	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-08 23:26:08.289113	66f5b980b6b0c5c28e633886976e052b	d2a72039094c4e15af7eed505c90e3fc
1291	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	05fb4d922a91bd64c43b4ffbfb828153	446c5e218c4f1c0f2f781e4432318b43
1292	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-10-26 23:26:08.289113	fbb42d796620a727a0d44a75d9ff8169	ee148c9b50c17a5ca50263cee8a5e1b7
1293	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-10-27 23:26:08.289113	ef0417262d73b622c94de83513c0ffe5	6298cd4dae3cee272654e3aba5216496
1294	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-06 23:26:08.289113	70182f48bbcf511def8df84ed051f839	cc00b990d1955097d4e55d5c0160bcf6
1295	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-07 23:26:08.289113	6043a0691d307212d1e47635bd946a9a	40b4b560961e32b35938edf01b3d1353
1296	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-10-26 23:26:08.289113	4e7abf26b597db8e35fbfb32586449c6	9fa303adc40921f5ef7583df594f829b
1297	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-10-27 23:26:08.289113	a03e49a49f56922f2fe120cb9811b05a	1d0019d24607400da0efb886b897b6b8
1298	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-11-05 23:26:08.289113	f8018e298b6a7280120b2bd98ae46a7a	f8fff41bdbb557f9252c5d6172990817
1299	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-02 23:26:08.289113	088a7c20253142cf69b75df5320bbf43	4c8d3cf9c970b14f941ec43200c81c10
1300	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-10-31 23:26:08.289113	a14150547ca10fc5018ad67c5b927b1b	50adadccb938f5594b0e68cca74eed1e
1301	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-06 23:26:08.289113	ae42b8913a4c9df8822251fdd390f1d0	c3319fda48ab4eb0f5517104cd094640
1302	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-08 23:26:08.289113	9ae26a623ba519d4ae11a8096a5b7258	95adad86bdc16710f8a7fa88eeac8b24
1303	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	1d1008c1b39c135b456b86ce38b2c925	2dff526b6eda88353553365147813e1c
1304	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-05 23:26:08.289113	0260fb3388e2be1d9f8cb76e9290a85a	088d9334603e40789f75b74a1be53bb6
1305	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-10-27 23:26:08.289113	2ddac1a195f826f4c5282c5a28387973	b62428d4d59786247b884ea9855da083
1306	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-11-06 23:26:08.289113	9e5ffd26401c12a23f8557a2fe271327	83c510975e15502140a72f7dcf27c854
1307	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-10-27 23:26:08.289113	5b587ac12ccc200821db6699311659a4	ccf3ce5757aa3b0d04e5c238cfbd044e
1308	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-05 23:26:08.289113	909bafcee2107d5d36705ebcca4e95d7	001e3c16602769279e7f56e8f76620f6
1309	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-05 23:26:08.289113	70119849f0ef54420dbcc2c8d275a2b2	c70be3c9249669ec30f09850434cc76b
1310	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-10-27 23:26:08.289113	01f3ebd7df1ebb2dd194ea31cb622661	2563d8600f8bd5377b8eccd5bb242cbd
1311	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-28 23:26:08.289113	0f2a34310d541fd38cc2aa86df9ef9f3	8d01b670cada9ac1a059e8c045af52da
1312	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-10-28 23:26:08.289113	076b8389ac0b2c48b62dde953a070cbf	4920f3bf389cc829934663bbbcd5ff3e
1313	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-01 23:26:08.289113	2a662f3d923f4c3b80dce83afad62821	e009ccdb4208e1a49bc1b7ba723edea0
1314	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	ff9140547fc165f11c2081c9a874cd38	c1b928477541ec84459941ac57ce6aad
1315	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-10-30 23:26:08.289113	bb05a5f9e03469a019bda8c143ae4a7e	4d9931aaeb47063bf499d04db61b17f9
1316	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-07 23:26:08.289113	9867f2814ff3b45edffe735234d66264	4b7b4ae26b945d7fcab21690c17657fd
1317	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	22157146b556f9ccef2c52b469a0a6af	d498c63e07b6753dda6ba9c80a794de9
1318	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-08 23:26:08.289113	1418a1b762b5396a693d5599f1da96d1	c8ccfe0c6cdcf98c9f3b631777f77ae7
1319	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-08 23:26:08.289113	939e5775a9a4a4583dbd8ad1dd492d9d	2a1848eb54aa3b5000849b9ac996ddc8
1320	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-01 23:26:08.289113	3aa2e8010742a9f1ff7a286c013c9930	cf46856e27602f74e6c638cafad28b3d
1321	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-04 23:26:08.289113	99aaa3e119f9cd0db3a2442efc864625	a8fe936ddb3bf6472a6002d7c59e2533
1322	SVC-TAX-002	DEPT-002	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-11-01 23:26:08.289113	b4f135c269ae1a72e066d083abce3aff	be65afda619c49109c15c5ba1bb50fc3
1323	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-11-02 23:26:08.289113	fe340d425a11f75248f39419a154ff9a	a41858bb14209bcef6b14b7f919d6b2f
1324	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-07 23:26:08.289113	49d18d110f8b8e41a5b7b49d3703dd0a	13fe57f6524b31a0df69ab93c8fe4c5c
1325	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-06 23:26:08.289113	7fa9342606beb8bd06b89e088004d691	ae81374f056e53987eb42604e91014a1
1326	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-02 23:26:08.289113	ade79820b6335238f908211cc37ddb81	174cfacbe6b885f3faed406b607f2b26
1327	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-10-29 23:26:08.289113	5fb7c655294e3d9f8af0fcf9898d55d9	668e82bd12dbe5abae8ae3932c337186
1328	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-10-29 23:26:08.289113	3e52522b8348119a8c759c5fc66acb10	8bf584d72dfdcd49162ec7c4bc5c2c0b
1329	SVC-TAX-002	DEPT-002	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-10-29 23:26:08.289113	314f8a712541548ed68b143952e38fef	76039fedac97fdc662f14a70fdf09fa5
1330	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-07 23:26:08.289113	901e8ab6e5265918ecc600e31cee4282	89ac0ea72003e8345402337f85cc35b3
1331	SVC-TAX-002	DEPT-002	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-08 23:26:08.289113	eb1f2aeb97da04e9a70a7c599c5c8e27	505e3be13c104e0496ee4f630415d45b
1332	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-11-06 23:26:08.289113	9f8bf68b32c82a63f5961ba634e0f7ad	fe127301cbe1f56cbc8fe56b52055e97
1333	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-28 23:26:08.289113	53e57e68d9828c6092ad6bcbc86832fd	85d618122ce81533efeee20f04b4eda5
1334	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	edf40ddaf4c2db05a0ebe42b9e824634	cf2f3af2cad296e9df9fb1cacddf17cf
1335	SVC-TAX-002	DEPT-002	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-01 23:26:08.289113	2f8ed215809c3c019a0be23074ea8964	84d3bc79f9023ccbe80e006fa65092ac
1336	SVC-TAX-002	DEPT-002	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	2836ae95612ab6356fcd932897adf322	c2e50d4ea2cb7c2fb09163256ea49a81
1337	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	6a75e333ef1f6e2f5a124f2ad1ec2586	5b95e91668b0e793a26169cbe4611fcd
1338	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-31 23:26:08.289113	a05d08cea8ce175662aeb205e01708f3	ecbc4ac510ab2ef5d709705d800519fa
1339	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-29 23:26:08.289113	74dfde52ff6a84b9b98abf8367a2dbc4	e0fcf0887b3f4ab94dd0c00b61f3ec03
1340	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-01 23:26:08.289113	8a108a5df505723ed9629ffa4dda24bd	d2a72039094c4e15af7eed505c90e3fc
1341	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-10-28 23:26:08.289113	40f3981366ff93fa72d5cb8454d7034e	446c5e218c4f1c0f2f781e4432318b43
1342	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-10-27 23:26:08.289113	6d0afa381e42215154e1fd72bba6f081	ee148c9b50c17a5ca50263cee8a5e1b7
1343	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-08 23:26:08.289113	aee56c778c3d9a56eaa173b493727c30	6298cd4dae3cee272654e3aba5216496
1344	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-11-05 23:26:08.289113	75aef56d1d77264436c9f5dbeb64ddb4	cc00b990d1955097d4e55d5c0160bcf6
1345	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-11-06 23:26:08.289113	c21f7512b335011eaf6849d583d5b567	40b4b560961e32b35938edf01b3d1353
1346	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-07 23:26:08.289113	351a68a2c79f5e98512d214a307c80a7	9fa303adc40921f5ef7583df594f829b
1347	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	bd0e7fc0a00c7eba1ad5c7f3c10c43cc	1d0019d24607400da0efb886b897b6b8
1348	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-10-27 23:26:08.289113	05ab0b6959c3ee6dc0213444e9a9f0b1	f8fff41bdbb557f9252c5d6172990817
1349	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-11-02 23:26:08.289113	e9d90543f3fe3dca0bbc45d2574dc784	4c8d3cf9c970b14f941ec43200c81c10
1350	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-04 23:26:08.289113	675d33104361a331bc0c9858c2c4cd14	50adadccb938f5594b0e68cca74eed1e
1351	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-11-03 23:26:08.289113	1bf2285073043241f205a0a0f84d7298	c3319fda48ab4eb0f5517104cd094640
1352	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-10-30 23:26:08.289113	688109b351f04729d124c74a59b2c0f6	95adad86bdc16710f8a7fa88eeac8b24
1353	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-01 23:26:08.289113	470cd862e8844ee55d3452fb0bc34425	2dff526b6eda88353553365147813e1c
1354	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-11-01 23:26:08.289113	5941d26ecebdb0ae1a60343be0c7471f	088d9334603e40789f75b74a1be53bb6
1355	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-10-27 23:26:08.289113	474389ecec11dccbe85d1d4533800f3e	b62428d4d59786247b884ea9855da083
1356	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-29 23:26:08.289113	da1b6f77d916d6786680e489c15901ac	83c510975e15502140a72f7dcf27c854
1357	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-02 23:26:08.289113	46b8e09a1099d55968bfe94c0ba5fc89	ccf3ce5757aa3b0d04e5c238cfbd044e
1358	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-10-28 23:26:08.289113	af32d540f154b3f2f109d5c4033421ae	001e3c16602769279e7f56e8f76620f6
1359	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-03 23:26:08.289113	caa04d4c4c4ccb3ba0049810e3cc1f6a	c70be3c9249669ec30f09850434cc76b
1360	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	bb45b737f6b0449cdac5abff8c4e329d	2563d8600f8bd5377b8eccd5bb242cbd
1361	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-10-31 23:26:08.289113	a8a5ec2c30572b9d603a3bf945d76f43	8d01b670cada9ac1a059e8c045af52da
1362	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-02 23:26:08.289113	030d0b484e1cd180e618a8cf85477827	4920f3bf389cc829934663bbbcd5ff3e
1363	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	3761c2da1294c12389082f7a04b87a11	e009ccdb4208e1a49bc1b7ba723edea0
1364	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-08 23:26:08.289113	68b4664b6e37b6c242b4eec6789e2b4a	c1b928477541ec84459941ac57ce6aad
1365	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-10-29 23:26:08.289113	df5a0a32a2d6d478cb5505186fb6ad00	4d9931aaeb47063bf499d04db61b17f9
1366	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	ee9aa6b90a4df8280eb3a90fd605ce59	4b7b4ae26b945d7fcab21690c17657fd
1367	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-28 23:26:08.289113	4ef8456cd52fd6310ee45bc1e854295e	d498c63e07b6753dda6ba9c80a794de9
1368	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-11-03 23:26:08.289113	d8a32673586afb59e0ecd8eafac17f53	c8ccfe0c6cdcf98c9f3b631777f77ae7
1369	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-01 23:26:08.289113	159398c4f56288c3b247d99b3fab3241	2a1848eb54aa3b5000849b9ac996ddc8
1370	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-11-02 23:26:08.289113	04c51173a83bb0ec1117fb6530e324e6	cf46856e27602f74e6c638cafad28b3d
1371	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-10-27 23:26:08.289113	61550253046bc674052f9b60e517ea0b	a8fe936ddb3bf6472a6002d7c59e2533
1372	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-10-28 23:26:08.289113	b1522e22ad1d3c9d0c9f65a382ea48fd	be65afda619c49109c15c5ba1bb50fc3
1373	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-06 23:26:08.289113	8936c2e6f3a6518c52752913b74a4dae	a41858bb14209bcef6b14b7f919d6b2f
1374	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-04 23:26:08.289113	a98608ef8744932d9bc695c455235051	13fe57f6524b31a0df69ab93c8fe4c5c
1375	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-11-05 23:26:08.289113	96a9534e535d629dcd99cb67d8f063c8	ae81374f056e53987eb42604e91014a1
1376	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	64dc6dfc54f89f9ffe26515d299bd668	174cfacbe6b885f3faed406b607f2b26
1377	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-11-08 23:26:08.289113	9d79cc7f39c03a5cb6688fa3ed64e478	668e82bd12dbe5abae8ae3932c337186
1378	SVC-IMM-001	DEPT-001	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-11-08 23:26:08.289113	b9ddcdae26b88b2c39f4ed64ead14207	8bf584d72dfdcd49162ec7c4bc5c2c0b
1379	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-02 23:26:08.289113	8065f70284f5b347656b2d6a02861cc8	76039fedac97fdc662f14a70fdf09fa5
1380	SVC-IMM-001	DEPT-001	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-06 23:26:08.289113	98e9488cc4156701a4cde36ab9054c72	89ac0ea72003e8345402337f85cc35b3
1381	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-01 23:26:08.289113	ba7a8057c2e44fb25b8235c47e5d68b4	505e3be13c104e0496ee4f630415d45b
1382	SVC-IMM-001	DEPT-001	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-08 23:26:08.289113	86751956039476a0188d92a90bc87af8	fe127301cbe1f56cbc8fe56b52055e97
1383	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-10-31 23:26:08.289113	b7d5c720f0fd5aad2e0d3b54afc1ee78	85d618122ce81533efeee20f04b4eda5
1384	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-07 23:26:08.289113	ff0c0564a732a6d39f5ec479ecb04cee	cf2f3af2cad296e9df9fb1cacddf17cf
1385	SVC-IMM-001	DEPT-001	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-30 23:26:08.289113	d65b29c9199d5144548a0947d35d579d	84d3bc79f9023ccbe80e006fa65092ac
1386	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-01 23:26:08.289113	5a2f30144aa22274bd1a895a6675cd5b	c2e50d4ea2cb7c2fb09163256ea49a81
1387	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-06 23:26:08.289113	6dc33c7453c7d490d9f3d45b3343bba4	5b95e91668b0e793a26169cbe4611fcd
1388	SVC-TRN-001	MIN-006	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-01 23:26:08.289113	0770e54744f939d170977d8df1ad7f97	ecbc4ac510ab2ef5d709705d800519fa
1389	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-28 23:26:08.289113	4eb0c30b997f5abac022b05993ffed26	e0fcf0887b3f4ab94dd0c00b61f3ec03
1390	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-10-27 23:26:08.289113	2e3a3095cc4d1eae55b1683f2076d633	d2a72039094c4e15af7eed505c90e3fc
1391	SVC-TRN-001	MIN-006	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-11-02 23:26:08.289113	4178237f7effb6a9a1d3638d53834100	446c5e218c4f1c0f2f781e4432318b43
1392	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-05 23:26:08.289113	1bc5ddb879e9d80b81ab7e471d3fae58	ee148c9b50c17a5ca50263cee8a5e1b7
1393	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-29 23:26:08.289113	9261475cf459676eef03990362e17614	6298cd4dae3cee272654e3aba5216496
1394	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-05 23:26:08.289113	614abba5caf07782483218522181d0c6	cc00b990d1955097d4e55d5c0160bcf6
1395	SVC-TRN-001	MIN-006	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-10-29 23:26:08.289113	6f8ecb5fc03bf5056fc16b00f8acf91d	40b4b560961e32b35938edf01b3d1353
1396	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-11-08 23:26:08.289113	ce91bd845dfb0c86c03e2b50d51ea170	9fa303adc40921f5ef7583df594f829b
1397	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-05 23:26:08.289113	1d3d11c8713ffeaba89bc60e6cfe39b1	1d0019d24607400da0efb886b897b6b8
1398	SVC-TRN-001	MIN-006	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-04 23:26:08.289113	d64da537703ee2a3a56da4f8fde557cc	f8fff41bdbb557f9252c5d6172990817
1399	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	23e1e903b095be0aad8178a99a3fc774	4c8d3cf9c970b14f941ec43200c81c10
1400	SVC-TRN-001	MIN-006	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-10-31 23:26:08.289113	8722bf3cc26ffadf452d92b921860898	50adadccb938f5594b0e68cca74eed1e
1401	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-11-08 23:26:08.289113	28eb14ab29e7af60ff9408179617c05c	c3319fda48ab4eb0f5517104cd094640
1402	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-10-28 23:26:08.289113	9a467878d8b6ba7e19cccba0a9cd4baf	95adad86bdc16710f8a7fa88eeac8b24
1403	SVC-TRN-001	MIN-006	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-11-01 23:26:08.289113	0442a3d003769716c326e0cbb49d3b66	2dff526b6eda88353553365147813e1c
1404	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-10-27 23:26:08.289113	6a0d32a5ff122160e9193d3656b5d548	088d9334603e40789f75b74a1be53bb6
1405	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-07 23:26:08.289113	e7b36128e1a80ea5ab3a9678250c8d74	b62428d4d59786247b884ea9855da083
1406	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-04 23:26:08.289113	137d7980de5396900b8b4562d673d828	83c510975e15502140a72f7dcf27c854
1407	SVC-TRN-001	MIN-006	ea_portal	\N	citizen	5	5	4	5	5	\N	f	2025-11-03 23:26:08.289113	fa9857bf9aaa096e6af55e99c820fb14	ccf3ce5757aa3b0d04e5c238cfbd044e
1408	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	5e0853d34771a209012460347127cbe5	001e3c16602769279e7f56e8f76620f6
1409	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-11-01 23:26:08.289113	dea3768f785e81cb8dbfca840c9abd3c	c70be3c9249669ec30f09850434cc76b
1410	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-06 23:26:08.289113	1b0ec032d5a300ee016dd146268fa987	2563d8600f8bd5377b8eccd5bb242cbd
1411	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-10-26 23:26:08.289113	da5e812bdd43d0a77fe3ac79db9cff29	8d01b670cada9ac1a059e8c045af52da
1412	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-10-28 23:26:08.289113	a942984da413a8f6ae3f71720ea2f6f1	4920f3bf389cc829934663bbbcd5ff3e
1413	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-10-28 23:26:08.289113	f55f9cd36a90434405e241e718584428	e009ccdb4208e1a49bc1b7ba723edea0
1414	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-27 23:26:08.289113	c3d6d8fb847f37aa5beee2a921c5e6db	c1b928477541ec84459941ac57ce6aad
1415	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	33e7499cbfea9e3eda5ff2e99ce2c5bb	4d9931aaeb47063bf499d04db61b17f9
1416	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-11-07 23:26:08.289113	206bcd5a73b5d0df8de2a85545d7a652	4b7b4ae26b945d7fcab21690c17657fd
1417	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-11-02 23:26:08.289113	6509ab771f27f7b1d0a4106cd1dede77	d498c63e07b6753dda6ba9c80a794de9
1418	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-11-03 23:26:08.289113	d72dc83e743bf55e7c633bf16c48f13b	c8ccfe0c6cdcf98c9f3b631777f77ae7
1419	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-26 23:26:08.289113	c7e427f8ca8a8b41405d461f9950c1f5	2a1848eb54aa3b5000849b9ac996ddc8
1420	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	734e6379bf859880c1879bfd4b482812	cf46856e27602f74e6c638cafad28b3d
1421	SVC-TRN-001	MIN-006	ea_portal	\N	citizen	5	5	5	5	5	\N	f	2025-10-30 23:26:08.289113	56563387abb640232d4adfe5840a43b2	a8fe936ddb3bf6472a6002d7c59e2533
1422	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-06 23:26:08.289113	18f51220ed44f16f82b1b3d05df21edd	be65afda619c49109c15c5ba1bb50fc3
1423	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-28 23:26:08.289113	e7e71b77944f43d3fc27bbd0603c5554	a41858bb14209bcef6b14b7f919d6b2f
1424	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-02 23:26:08.289113	7bbd593ee69e2db7454a847ae0498382	13fe57f6524b31a0df69ab93c8fe4c5c
1425	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-03 23:26:08.289113	28facb58fe355141a9c1d3244ba16fe9	ae81374f056e53987eb42604e91014a1
1426	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-29 23:26:08.289113	3aa7592ee5ca1a3a84c4bcc2ea31752a	174cfacbe6b885f3faed406b607f2b26
1427	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	4	5	5	\N	f	2025-11-01 23:26:08.289113	3588775e315f5baeb3f8d70863dee061	668e82bd12dbe5abae8ae3932c337186
1428	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	4	5	5	\N	f	2025-10-26 23:26:08.289113	9eef171c84c70a226801b06fe57ad007	8bf584d72dfdcd49162ec7c4bc5c2c0b
1429	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-11-05 23:26:08.289113	9ab54dbd0f162d7cd7286d6d69449045	76039fedac97fdc662f14a70fdf09fa5
1430	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	4	5	5	\N	f	2025-10-26 23:26:08.289113	1eb2f7e0f431e0c97f47a5490ed74fb6	89ac0ea72003e8345402337f85cc35b3
1431	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	4	5	5	\N	f	2025-11-05 23:26:08.289113	c23ad5a4bafb77ddd12868f7ca23a68a	505e3be13c104e0496ee4f630415d45b
1432	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-10-31 23:26:08.289113	196228952fff4caf1ea687357118eef3	fe127301cbe1f56cbc8fe56b52055e97
1433	SVC-TRN-001	MIN-006	ea_portal	\N	business	5	5	5	5	5	\N	f	2025-11-07 23:26:08.289113	7683e863a4e2ab8df173cdcaebfcc327	85d618122ce81533efeee20f04b4eda5
1434	SVC-TRN-001	MIN-006	ea_portal	\N	other	5	5	5	5	5	\N	f	2025-10-27 23:26:08.289113	e0643ad93c83bc8a2153f494a4b925a8	cf2f3af2cad296e9df9fb1cacddf17cf
1435	SVC-TRN-001	MIN-006	ea_portal	\N	government	5	5	5	5	5	\N	f	2025-11-03 23:26:08.289113	2cf6fc1742ad9a3c8f25c53727007c40	84d3bc79f9023ccbe80e006fa65092ac
1436	SVC-TRN-001	MIN-006	ea_portal	\N	visitor	5	5	5	5	5	\N	f	2025-11-07 23:26:08.289113	0248bebe10abcd1f468fbdd58423e723	c2e50d4ea2cb7c2fb09163256ea49a81
1437	SVC-REG-001	DEPT-004	ea_portal	\N	citizen	3	3	4	4	5	\N	f	2025-11-08 23:37:38.33048	49aa4f1d89735d753f147fe23d0c243ac79b761650fc3c103ae27dea40645b96	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1438	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	3	3	3	3	3	\N	f	2025-11-09 04:48:28.165571	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1439	SVC-DIG-002	AGY-002	ea_portal	\N	government	4	4	3	3	4	\N	f	2025-11-09 17:15:22.051381	6efaa7aa47e6980a7140038e89972b296dc9ebe12193704b9d6f640c651270ad	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1440	SVC-DIG-007	AGY-002	ea_portal	\N	government	2	2	1	2	1	no clear instructions, delayed delivery	t	2025-11-09 23:44:14.496509	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1441	SVC-IMM-001	DEPT-001	ea_portal	\N	citizen	1	1	2	3	1	very slow, no instruction available online	t	2025-11-09 23:50:07.854603	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1442	SVC-FOI-001	DEPT-012	ea_portal	\N	citizen	1	1	1	1	1	very slow, no clear instructions	t	2025-11-10 00:22:08.497526	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1443	SVC-REG-010	DEPT-004	ea_portal	\N	citizen	1	1	1	1	1	bad experience and very slow	t	2025-11-10 00:29:13.942148	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	0bfd1fb415d306d5d4958b6eb119a356694382f0d02a19906d2f4171e10de978
1444	SVC-TAX-002	DEPT-002	ea_portal	\N	business	3	1	1	3	1	slow and system bugs	t	2025-11-10 00:54:22.477069	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1445	SVC-REG-002	DEPT-004	ea_portal	\N	citizen	1	1	1	1	1	very slow and delays in getting certificate	t	2025-11-10 01:07:22.130586	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1446	SVC-STD-001	AGY-013	ea_portal	\N	business	1	1	1	1	1	Process is offline and manul. no officer available.	t	2025-11-10 01:14:12.644296	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1447	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	1	1	1	1	1	slow	f	2025-11-10 01:29:48.329456	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1448	SVC-HOU-001	AGY-011	ea_portal	\N	citizen	2	2	2	2	2	there is no online system to submit application	f	2025-11-10 02:05:30.858155	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1449	SVC-REG-012	DEPT-004	ea_portal	\N	citizen	1	1	1	1	1	slow and painful	f	2025-11-10 02:18:41.085248	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1450	SVC-TAX-001	DEPT-002	ea_portal	\N	business	1	1	2	3	2	\N	f	2025-11-10 02:29:56.230085	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1451	SVC-DIG-002	AGY-002	ea_portal	\N	citizen	1	1	1	1	1	\N	f	2025-11-10 02:57:25.770676	d2d2e641b21fd219c44351a5b2f68eab341aaf3c710c958b4cb192216595755d	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1452	SVC-REG-011	DEPT-004	ea_portal	\N	citizen	1	1	1	1	1	Slow	t	2025-11-10 02:58:48.854359	d2d2e641b21fd219c44351a5b2f68eab341aaf3c710c958b4cb192216595755d	902f048bfbd414566ff43c23c1da4fd0834220200f3c7ce639d9d8f0f77f2506
1453	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	2	2	2	2	2	slow service	t	2025-11-10 12:54:17.945338	1cf50e48c5a99c92579bc9ad7211d0a561ab0800faa4e81a2d9bc32f28f0ab31	d713dadbf3d0ca255287b277ab4d36ce7d711d34f197e05966270e2160e6da6c
1454	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	2	2	2	2	2	very slow difficult	t	2025-11-10 13:26:52.738104	1cf50e48c5a99c92579bc9ad7211d0a561ab0800faa4e81a2d9bc32f28f0ab31	d713dadbf3d0ca255287b277ab4d36ce7d711d34f197e05966270e2160e6da6c
1455	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	2	2	2	2	2	it is still manual and email based.	t	2025-11-10 20:26:32.523905	1cf50e48c5a99c92579bc9ad7211d0a561ab0800faa4e81a2d9bc32f28f0ab31	d713dadbf3d0ca255287b277ab4d36ce7d711d34f197e05966270e2160e6da6c
1456	SVC-IMM-002	DEPT-001	ea_portal	\N	citizen	2	2	2	2	2	slow	t	2025-11-11 14:41:32.948335	1cf50e48c5a99c92579bc9ad7211d0a561ab0800faa4e81a2d9bc32f28f0ab31	d713dadbf3d0ca255287b277ab4d36ce7d711d34f197e05966270e2160e6da6c
1457	SVC-EVT-001	AGY-002	qr_code	QR-DGR-001	citizen	2	4	5	5	3	\N	f	2025-11-12 02:45:29.892049	4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1458	SVC-EVT-001	AGY-002	qr_code	QR-DGR-001	citizen	3	2	1	1	1	Poor organisatio. Skills and presentation	t	2025-11-12 12:29:04.828631	b963515f7b5b426d92713656d0391dfd2bcd04281992781a1273a35ace6d9120	61b88f0a9f3157393f99888d9f51835502e99b3ad2e00a9cfc40020f217e4214
1459	SVC-DIG-002	AGY-002	ea_portal	\N	government	1	1	1	1	1	Very slow response.	t	2025-11-14 13:34:30.834527	1cf50e48c5a99c92579bc9ad7211d0a561ab0800faa4e81a2d9bc32f28f0ab31	d713dadbf3d0ca255287b277ab4d36ce7d711d34f197e05966270e2160e6da6c
\.


--
-- Data for Name: service_master; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.service_master (service_id, service_name, entity_id, service_category, service_description, is_active, created_at, updated_at) FROM stdin;
SVC-REG-001	Birth Certificate	DEPT-004	Civil Registry	Obtain birth certificate	t	2025-11-08 15:08:17.390505	2025-11-08 15:08:17.390505
SVC-REG-002	Marriage Certificate	DEPT-004	Civil Registry	Obtain marriage certificate	t	2025-11-08 15:08:17.390505	2025-11-08 15:08:17.390505
SVC-REG-003	Death Certificate	DEPT-004	Civil Registry	Obtain death certificate	t	2025-11-08 15:08:17.390505	2025-11-08 15:08:17.390505
SVC-REG-004	Land Title Search	DEPT-004	Property	Search land title records	t	2025-11-08 15:08:17.390505	2025-11-08 15:08:17.390505
SVC-TAX-001	Business Registration	DEPT-002	Tax & Revenue	Register new business	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.352289
SVC-TAX-002	Tax Filing (Personal/Corporate)	DEPT-002	Tax & Revenue	File tax returns via ptax.gov.gd	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.352289
SVC-TAX-003	Tax Clearance Certificate	DEPT-002	Tax & Revenue	Obtain tax clearance	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.352289
SVC-SOC-001	Public Assistance / Welfare Grant	MIN-007	Social	Apply for social assistance support	t	2025-11-08 23:15:59.525221	2025-11-08 23:18:32.364313
SVC-HOU-001	Apply for Public Housing	AGY-011	Housing	Application for government-assisted housing	t	2025-11-08 23:15:59.525221	2025-11-08 23:18:32.364313
SVC-NIS-001	NIS Contributions & Benefit Claims	AGY-006	Social Insurance	Manage contributions and apply for benefits	t	2025-11-08 23:15:59.525221	2025-11-08 23:18:32.364313
SVC-IMM-001	Passport Application	DEPT-001	Immigration	Apply for new passport	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.347827
SVC-IMM-002	Passport Renewal	DEPT-001	Immigration	Renew existing passport	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.347827
SVC-IMM-003	Visa Application	DEPT-001	Immigration	Apply for visa	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.347827
SVC-IMM-004	Work Permit (Employer-sponsored)	DEPT-001	Immigration	Apply for a work permit for foreign nationals	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.347827
SVC-LEG-001	Police Certificate of Character	DEPT-001	Legal	Background certificate for work/visa	t	2025-11-08 23:15:59.507264	2025-11-08 23:18:32.347827
SVC-REG-010	Civil Records – Birth Certificate	DEPT-004	Civil Registry	Obtain birth certificate	t	2025-11-08 23:15:59.507264	2025-11-08 23:18:32.347827
SVC-REG-011	Civil Records – Marriage Certificate	DEPT-004	Civil Registry	Obtain marriage certificate	t	2025-11-08 23:15:59.507264	2025-11-08 23:18:32.347827
SVC-REG-012	Civil Records – Death Certificate	DEPT-004	Civil Registry	Obtain death certificate	t	2025-11-08 23:15:59.507264	2025-11-08 23:18:32.347827
SVC-REG-013	Deeds & Land Registry – Title/Deed Registration	DEPT-004	Property	Register property transactions	t	2025-11-08 23:15:59.507264	2025-11-08 23:18:32.347827
SVC-CUS-001	Import Declaration	DEPT-003	Customs	Declare imported goods (ASYCUDA)	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.356413
SVC-CUS-002	Export Licence (Restricted Items)	DEPT-003	Customs	Apply for export licence	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.356413
SVC-CUS-003	Duty-Free Concession (Eligible Applicants)	DEPT-003	Customs	Apply for customs duty relief	t	2025-11-08 23:15:59.515934	2025-11-08 23:18:32.356413
SVC-HLT-001	Vaccination Certificate	DEPT-005	Health	Obtain vaccination records	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.359143
SVC-HLT-002	Public Health Inspection – Premises	DEPT-005	Health	Request public health inspection certificate	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.359143
SVC-HLT-003	Food Handler Permit	DEPT-005	Health	Apply for food handler permit	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.359143
SVC-EDU-001	Scholarship Application (Tertiary)	MIN-003	Education	Apply for government or regional scholarships	t	2025-11-08 23:15:59.52226	2025-11-08 23:18:32.361597
SVC-EDU-002	Teacher Registration/Licence	MIN-003	Education	Register/licence to teach	t	2025-11-08 23:15:59.52226	2025-11-08 23:18:32.361597
SVC-EDU-003	CXC / External Exam Registration	MIN-003	Education	Register candidates for examinations	t	2025-11-08 23:15:59.52226	2025-11-08 23:18:32.361597
SVC-NIS-002	Senior Citizens Pension	AGY-006	Social Insurance	Apply for pension benefits	t	2025-11-08 23:15:59.525221	2025-11-08 23:18:32.364313
SVC-GDB-001	Student Loan – Tertiary Education	AGY-005	Finance	Apply for student loan financing	t	2025-11-08 23:15:59.525221	2025-11-08 23:18:32.364313
SVC-TUR-001	Tour Operator Licence	AGY-001	Tourism	Apply for tour operator licence	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.366831
SVC-TUR-002	Hotel Registration / Classification	AGY-001	Tourism	Register and classify hotel/accommodation	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.366831
SVC-TUR-003	Film/Photography Permit (Public Sites)	AGY-001	Tourism	Permit to film in public/heritage sites	t	2025-11-08 23:15:59.528651	2025-11-08 23:18:32.366831
SVC-BIZ-001	Investment Incentives / Tax Concessions	MIN-001	Business	Apply for investment incentives and concessions	t	2025-11-08 23:15:59.528651	2025-11-08 23:18:32.366831
SVC-GIDC-001	Export Support / Promotion	AGY-007	Business	Support for exporters and trade promotion	t	2025-11-08 23:15:59.528651	2025-11-08 23:18:32.366831
SVC-PLAN-001	Building/Development Permit	AGY-012	Planning	Apply for building/development approval	t	2025-11-08 23:15:59.531507	2025-11-08 23:18:32.369329
SVC-UTL-001	Water Connection	AGY-003	Utilities	Request new water connection	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.372058
SVC-UTL-002	Water Bill Payment	AGY-003	Utilities	Pay water bill	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.372058
SVC-UTL-003	Electricity Connection	AGY-004	Utilities	Request new electricity connection	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.372058
SVC-UTL-004	Electricity Bill Payment	AGY-004	Utilities	Pay electricity bill	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.372058
SVC-DIG-001	Create eServices Account	PRT-001	Digital	Create/activate account for my.gov.gd	t	2025-11-08 15:08:17.390505	2025-11-08 23:18:32.374985
SVC-DIG-002	Portal Support 	AGY-002	Digital	Technical support for EA portal	t	2025-11-08 15:08:17.390505	2025-11-09 01:12:21.169702
SVC-REG-014	Land Title Search / Certified Copy	DEPT-004	Property	Search and obtain certified title copies	t	2025-11-08 23:15:59.507264	2025-11-08 23:18:32.347827
SVC-TAX-004	Apply for Tax Identification Number (TIN)	DEPT-002	Tax & Revenue	Obtain a TIN	t	2025-11-08 23:18:32.352289	2025-11-08 23:18:32.352289
SVC-PAY-001	Pay Government Taxes & Fees Online	PRT-002	Payments	Pay government taxes, fees and licences online	t	2025-11-08 23:18:32.352289	2025-11-08 23:18:32.352289
SVC-PLAN-002	Planning Data / Cadastral Map Request	AGY-012	Planning	Request maps and planning data	t	2025-11-08 23:15:59.531507	2025-11-08 23:18:32.369329
SVC-STD-001	Product/Process Certification	AGY-013	Standards	Apply for standards certification	t	2025-11-08 23:15:59.531507	2025-11-08 23:18:32.369329
SVC-AGRI-001	Importer/Exporter Registration (Agri)	AGY-014	Agriculture	Register as importer/exporter for agri products	t	2025-11-08 23:15:59.531507	2025-11-08 23:18:32.369329
SVC-AGRI-002	Plant/Animal Import Permit	AGY-014	Agriculture	Apply for plant/animal import permit	t	2025-11-08 23:15:59.531507	2025-11-08 23:18:32.369329
SVC-TRN-001	Driver’s Licence / Learner’s Permit	MIN-006	Transport	Apply for or renew driver’s/learner’s permit	t	2025-11-08 23:15:59.535788	2025-11-08 23:18:32.372058
SVC-TRN-002	Vehicle Registration (New)	MIN-006	Transport	Register a new motor vehicle	t	2025-11-08 23:15:59.535788	2025-11-08 23:18:32.372058
SVC-TRN-003	Vehicle Licence Renewal	MIN-006	Transport	Renew annual vehicle licence	t	2025-11-08 23:15:59.535788	2025-11-08 23:18:32.372058
SVC-SWM-001	Report Waste / Illegal Dumping	AGY-010	Waste	Report waste issues or illegal dumping	t	2025-11-08 23:15:59.535788	2025-11-08 23:18:32.372058
SVC-DIG-003	Report Cybercrime / Incident	DEPT-011	Digital	Submit cyber incident report to national team	t	2025-11-08 23:18:32.374985	2025-11-08 23:18:32.374985
SVC-OD-001	Request Official Statistics / Datasets	DEPT-006	Open Data	Request/download official statistics	t	2025-11-08 23:18:32.374985	2025-11-08 23:18:32.374985
SVC-AV-001	Airport Concession / Permit	AGY-009	Aviation	Apply for airport commercial concessions/permits	t	2025-11-08 23:15:59.540025	2025-11-08 23:18:32.377796
SVC-PORT-001	Port Services / Berthing Request	AGY-008	Ports	Request berthing/port services	t	2025-11-08 23:15:59.540025	2025-11-08 23:18:32.377796
SVC-ELC-001	Voter Registration / Update	AGY-015	Elections	Register to vote or update voter details	t	2025-11-08 23:15:59.543123	2025-11-08 23:18:32.381169
SVC-FOI-001	Access to Information (FOI)	DEPT-012	Governance	Submit freedom-of-information request	t	2025-11-08 23:15:59.543123	2025-11-08 23:18:32.381169
SVC-DIG-005	Repository access	AGY-002	Digital	Request access or setup a new repository	t	2025-11-09 00:50:06.23417	2025-11-09 00:50:06.23417
SVC-DIG-006	Helpdesk access	AGY-002	Digital	Add user id to helpdesk or create a new instance for entity	t	2025-11-09 01:09:01.41085	2025-11-09 01:09:01.41085
SVC-DIG-007	Roadmap	AGY-002	Digital	Develop digital transformation roadmap	t	2025-11-09 01:09:59.165891	2025-11-09 01:09:59.165891
SVC-DIG-008	Maturity assessment	AGY-002	Digital	Conduct a maturity assessment review	t	2025-11-09 01:10:34.874188	2025-11-09 01:10:34.874188
SVC-DIG-009	Compliance assessment	AGY-002	Digital	Review compliance to EA standards, digital rules and policy	t	2025-11-09 01:11:36.359559	2025-11-09 01:11:36.359559
SVC-EVT-001	DG4RP3 project kick-off	AGY-002	General	demo	t	2025-11-12 02:43:56.630785	2025-11-12 02:43:56.630785
\.


--
-- Data for Name: submission_rate_limit; Type: TABLE DATA; Schema: public; Owner: feedback_user
--

COPY public.submission_rate_limit (ip_hash, submission_count, window_start) FROM stdin;
49aa4f1d89735d753f147fe23d0c243ac79b761650fc3c103ae27dea40645b96	1	2025-11-08 23:37:38.3268
6efaa7aa47e6980a7140038e89972b296dc9ebe12193704b9d6f640c651270ad	1	2025-11-09 17:15:22.044233
d2d2e641b21fd219c44351a5b2f68eab341aaf3c710c958b4cb192216595755d	2	2025-11-10 02:57:25.763731
4ea2124cc19463d969c0d09bc961c47c20327f09788ef98cb3431049be059484	1	2025-11-12 02:45:29.884049
b963515f7b5b426d92713656d0391dfd2bcd04281992781a1273a35ace6d9120	1	2025-11-12 12:29:04.820676
1cf50e48c5a99c92579bc9ad7211d0a561ab0800faa4e81a2d9bc32f28f0ab31	1	2025-11-14 13:34:30.830125
\.


--
-- Name: service_feedback_feedback_id_seq; Type: SEQUENCE SET; Schema: public; Owner: feedback_user
--

SELECT pg_catalog.setval('public.service_feedback_feedback_id_seq', 1459, true);


--
-- Name: entity_master entity_master_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.entity_master
    ADD CONSTRAINT entity_master_pkey PRIMARY KEY (unique_entity_id);


--
-- Name: qr_codes qr_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.qr_codes
    ADD CONSTRAINT qr_codes_pkey PRIMARY KEY (qr_code_id);


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
-- Name: submission_rate_limit submission_rate_limit_pkey; Type: CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.submission_rate_limit
    ADD CONSTRAINT submission_rate_limit_pkey PRIMARY KEY (ip_hash);


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

CREATE INDEX idx_feedback_grievance ON public.service_feedback USING btree (grievance_flag) WHERE (grievance_flag = true);


--
-- Name: idx_feedback_qr; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_qr ON public.service_feedback USING btree (qr_code_id) WHERE (qr_code_id IS NOT NULL);


--
-- Name: idx_feedback_service; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_service ON public.service_feedback USING btree (service_id);


--
-- Name: idx_feedback_submitted; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_feedback_submitted ON public.service_feedback USING btree (submitted_at DESC);


--
-- Name: idx_qr_active; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_qr_active ON public.qr_codes USING btree (is_active);


--
-- Name: idx_qr_location; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_qr_location ON public.qr_codes USING btree (location_type);


--
-- Name: idx_qr_service; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_qr_service ON public.qr_codes USING btree (service_id);


--
-- Name: idx_rate_limit_window; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_rate_limit_window ON public.submission_rate_limit USING btree (window_start);


--
-- Name: idx_service_active; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_service_active ON public.service_master USING btree (is_active);


--
-- Name: idx_service_entity; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_service_entity ON public.service_master USING btree (entity_id);


--
-- Name: idx_service_name_trgm; Type: INDEX; Schema: public; Owner: feedback_user
--

CREATE INDEX idx_service_name_trgm ON public.service_master USING gin (service_name public.gin_trgm_ops);


--
-- Name: entity_master update_entity_updated_at; Type: TRIGGER; Schema: public; Owner: feedback_user
--

CREATE TRIGGER update_entity_updated_at BEFORE UPDATE ON public.entity_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: service_master update_service_updated_at; Type: TRIGGER; Schema: public; Owner: feedback_user
--

CREATE TRIGGER update_service_updated_at BEFORE UPDATE ON public.service_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_master entity_master_parent_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: feedback_user
--

ALTER TABLE ONLY public.entity_master
    ADD CONSTRAINT entity_master_parent_entity_id_fkey FOREIGN KEY (parent_entity_id) REFERENCES public.entity_master(unique_entity_id);


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
-- PostgreSQL database dump complete
--

\unrestrict DOg1UraVxQhfkMEQEt89BvuE0LepIO37cn2WTUrQX2op3DzpfJluUgBMPVvekTC

