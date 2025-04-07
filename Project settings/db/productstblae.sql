--
-- PostgreSQL database dump
--

-- Dumped from database version 16.4
-- Dumped by pg_dump version 16.4

-- Started on 2025-04-04 16:36:22

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
-- TOC entry 4887 (class 0 OID 21359)
-- Dependencies: 241
-- Data for Name: acted_products; Type: TABLE DATA; Schema: public; Owner: eugenelo1030
--

INSERT INTO public.acted_products VALUES (2, 'CAF', 'Additional Charge', 'Additional Charge', '', '2025-03-11 14:19:04.431263+00', '2025-03-11 14:19:04.431263+00', true);
INSERT INTO public.acted_products VALUES (3, 'CAMP', 'Additional Mock Pack eBook', 'Addit. Mock Pack', '', '2025-03-11 14:19:04.476386+00', '2025-03-11 14:19:04.476386+00', true);
INSERT INTO public.acted_products VALUES (4, 'CATA', 'ActEd Team Area', 'ActEd Team Area', '', '2025-03-11 14:19:04.484405+00', '2025-03-11 14:19:04.484405+00', true);
INSERT INTO public.acted_products VALUES (6, 'CCD', 'Sound Revision', 'Sound Revision', '', '2025-03-11 14:19:04.489432+00', '2025-03-11 14:19:04.489432+00', true);
INSERT INTO public.acted_products VALUES (5, 'CC', 'Combined Materials Pack eBook', 'CMP eBook', '', '2025-03-11 14:19:04.486414+00', '2025-03-11 14:19:04.486414+00', true);
INSERT INTO public.acted_products VALUES (7, 'CCR', 'Core Reading eBook', 'Core Reading eBook', '', '2025-03-11 14:19:04.492414+00', '2025-03-11 14:19:04.492414+00', true);
INSERT INTO public.acted_products VALUES (8, 'CEX2', 'ASET (2020-2023 Papers) eBook', 'ASET 2020-23 eBook', '', '2025-03-11 14:19:04.496451+00', '2025-03-11 14:19:04.496451+00', true);
INSERT INTO public.acted_products VALUES (9, 'CEX', 'ASET (2014-2017 Papers) eBook', 'ASET 2014-17 eBook', '', '2025-03-11 14:19:04.503135+00', '2025-03-11 14:19:04.503135+00', true);
INSERT INTO public.acted_products VALUES (10, 'CFC', 'Flash Cards eBook', 'Flash Cards eBook', '', '2025-03-11 14:19:04.508209+00', '2025-03-11 14:19:04.508209+00', true);
INSERT INTO public.acted_products VALUES (11, 'CGOL', 'Module 0 Online Course - Gold', 'M0 Online - Gold', '', '2025-03-11 14:19:04.510722+00', '2025-03-11 14:19:04.510722+00', true);
INSERT INTO public.acted_products VALUES (12, 'CL4A', 'Level 4 Apprentices Course', 'L4 Apprentices Course', '', '2025-03-11 14:19:04.522555+00', '2025-03-11 14:19:04.522555+00', true);
INSERT INTO public.acted_products VALUES (13, 'CL7A', 'Level 7 Apprentices Course', 'L7 Apprentices Course', '', '2025-03-11 14:19:04.52456+00', '2025-03-11 14:19:04.52456+00', true);
INSERT INTO public.acted_products VALUES (14, 'CSP', 'StudyPlus Course', 'StudyPlus Course', '', '2025-03-11 14:19:04.526561+00', '2025-03-11 14:19:04.526561+00', true);
INSERT INTO public.acted_products VALUES (15, 'CM1', 'Mock Exam eBook', 'Mock Exam eBook', '', '2025-03-11 14:19:04.530122+00', '2025-03-11 14:19:04.530122+00', true);
INSERT INTO public.acted_products VALUES (16, 'CM1S', 'Mock Exam Solutions eBook', 'Mock Exam Sol. eBook', '', '2025-03-11 14:19:04.533127+00', '2025-03-11 14:19:04.533127+00', true);
INSERT INTO public.acted_products VALUES (17, 'CMAA', 'Mini ASET (April 2024 Paper) eBook', 'Mini ASET Apr.24 ebook', '', '2025-03-11 14:19:04.535124+00', '2025-03-11 14:19:04.535124+00', true);
INSERT INTO public.acted_products VALUES (18, 'CN', 'Course Notes eBook', 'Course Notes eBook', '', '2025-03-11 14:19:04.537126+00', '2025-03-11 14:19:04.537126+00', true);
INSERT INTO public.acted_products VALUES (19, 'CNRB', 'Revision Notes eBook', 'Revision Notes eBook', '', '2025-03-11 14:19:04.539126+00', '2025-03-11 14:19:04.539126+00', true);
INSERT INTO public.acted_products VALUES (20, 'CPBOR', 'Paper B Online Resources', 'PBOR', '', '2025-03-11 14:19:04.541144+00', '2025-03-11 14:19:04.541144+00', true);
INSERT INTO public.acted_products VALUES (21, 'CPMBE', 'Maths & Stats Bronze (e-book only)', 'MS Bronze eBook', '', '2025-03-11 14:19:04.543088+00', '2025-03-11 14:19:04.543088+00', true);
INSERT INTO public.acted_products VALUES (22, 'CPMBG', 'Maths & Stats Bronze to Gold Upgrade', 'MS Bronze --> Gold', '', '2025-03-11 14:19:04.545624+00', '2025-03-11 14:19:04.545624+00', true);
INSERT INTO public.acted_products VALUES (23, 'CPMBS', 'Maths & Stats Bronze to Silver Upgrade', 'MS Bronze --> Silver', '', '2025-03-11 14:19:04.548043+00', '2025-03-11 14:19:04.548043+00', true);
INSERT INTO public.acted_products VALUES (24, 'CPMGE', 'Maths & Stats Gold (with e-book)', 'MS Gold eBook', '', '2025-03-11 14:19:04.551315+00', '2025-03-11 14:19:04.551315+00', true);
INSERT INTO public.acted_products VALUES (25, 'CPMSE', 'Maths & Stats Silver (with e-book)', 'MS Silver eBook', '', '2025-03-11 14:19:04.553294+00', '2025-03-11 14:19:04.553294+00', true);
INSERT INTO public.acted_products VALUES (26, 'CPMSG', 'Maths & Stats Silver to Gold Upgrade', 'MS Silver --> Gold', '', '2025-03-11 14:19:04.555296+00', '2025-03-11 14:19:04.555296+00', true);
INSERT INTO public.acted_products VALUES (27, 'CRG', 'Module 0 Gold Renewal', 'M0 Gold Renewal', '', '2025-03-11 14:19:04.558323+00', '2025-03-11 14:19:04.558323+00', true);
INSERT INTO public.acted_products VALUES (28, 'CRS', 'Module 0 Silver Renewal', 'M0 Silver Renewal', '', '2025-03-11 14:19:04.569697+00', '2025-03-11 14:19:04.569697+00', true);
INSERT INTO public.acted_products VALUES (29, 'CSIL', 'Module 0 Online Course - Silver', 'M0 Online - Silver', '', '2025-03-11 14:19:04.576693+00', '2025-03-11 14:19:04.576693+00', true);
INSERT INTO public.acted_products VALUES (30, 'CTB', 'Module 1 Bronze (e-book only)', 'M1 Bronze eBook', '', '2025-03-11 14:19:04.591806+00', '2025-03-11 14:19:04.591806+00', true);
INSERT INTO public.acted_products VALUES (31, 'CTB2', 'Module 0 Bronze (e-book only)', 'M0 Bronze eBook', '', '2025-03-11 14:19:04.600563+00', '2025-03-11 14:19:04.600563+00', true);
INSERT INTO public.acted_products VALUES (32, 'CUBG', 'Module 0 Bronze to Gold Upgrade', 'M0 Bronze --> Gold', '', '2025-03-11 14:19:04.613246+00', '2025-03-11 14:19:04.613246+00', true);
INSERT INTO public.acted_products VALUES (33, 'CUBS', 'Module 0 Bronze to Silver Upgrade', 'M0 Bronze --> Silver', '', '2025-03-11 14:19:04.624767+00', '2025-03-11 14:19:04.624767+00', true);
INSERT INTO public.acted_products VALUES (34, 'CUSG', 'Module 0 Silver to Gold Upgrade', 'M0 Silver --> Gold', '', '2025-03-11 14:19:04.637919+00', '2025-03-11 14:19:04.637919+00', true);
INSERT INTO public.acted_products VALUES (35, 'CX', 'Series X Assignments eBook', 'Series X Assign. eBook', '', '2025-03-11 14:19:04.64946+00', '2025-03-11 14:19:04.64946+00', true);
INSERT INTO public.acted_products VALUES (36, 'CXS', 'Series X Solutions eBook', 'Series X Sol. eBook', '', '2025-03-11 14:19:04.65246+00', '2025-03-11 14:19:04.65246+00', true);
INSERT INTO public.acted_products VALUES (37, 'CBAR', 'Baxter & Rennie Textbook eBook', 'Baxter & Rennie eBook', '', '2025-03-11 14:19:04.654484+00', '2025-03-11 14:19:04.654484+00', true);
INSERT INTO public.acted_products VALUES (38, 'CE11', 'Economics Textbook 11th Ed. eBook', 'Economics eBook', '', '2025-03-11 14:19:04.657466+00', '2025-03-11 14:19:04.657466+00', true);
INSERT INTO public.acted_products VALUES (39, 'CH11', 'SP6 Hull Textbook 11th Ed. eBook', 'Hull eBook', '', '2025-03-11 14:19:04.6608+00', '2025-03-11 14:19:04.6608+00', true);
INSERT INTO public.acted_products VALUES (40, 'CLAM', 'Lam Textbook 2nd Ed. eBook', 'Lam eTextbook', '', '2025-03-11 14:19:04.663823+00', '2025-03-11 14:19:04.663823+00', true);
INSERT INTO public.acted_products VALUES (41, 'CSWE2', 'Sweeting Textbook 2nd Ed. eBook', 'Sweeting eBook', '', '2025-03-11 14:19:04.666834+00', '2025-03-11 14:19:04.666834+00', true);
INSERT INTO public.acted_products VALUES (42, 'MM1', 'Practice Exam Marking', 'Practice Exam Marking', '', '2025-03-11 14:19:04.669851+00', '2025-03-11 14:19:04.669851+00', true);
INSERT INTO public.acted_products VALUES (43, 'MM2', 'Mock Exam 2 Marking', 'Mock Exam 2 Marking', '', '2025-03-11 14:19:04.673834+00', '2025-03-11 14:19:04.673834+00', true);
INSERT INTO public.acted_products VALUES (44, 'MM3', 'Mock Exam 3 Marking', 'Mock Exam 3 Marking', '', '2025-03-11 14:19:04.676342+00', '2025-03-11 14:19:04.676342+00', true);
INSERT INTO public.acted_products VALUES (45, 'MV', 'Marking Voucher', 'Marking Voucher', '', '2025-03-11 14:19:04.680361+00', '2025-03-11 14:19:04.680361+00', true);
INSERT INTO public.acted_products VALUES (46, 'MX', 'Series X Assignments (Marking)', 'X Marking', '', '2025-03-11 14:19:04.683366+00', '2025-03-11 14:19:04.683366+00', true);
INSERT INTO public.acted_products VALUES (47, 'MY', 'Series Y Assignments (Marking)', 'Y Marking', '', '2025-03-11 14:19:04.685364+00', '2025-03-11 14:19:04.685364+00', true);
INSERT INTO public.acted_products VALUES (48, 'PB1', 'Materials & Marking Bundle', 'Materials & Marking', '', '2025-03-11 14:19:04.68736+00', '2025-03-11 14:19:04.68736+00', true);
INSERT INTO public.acted_products VALUES (49, 'PBIN', 'ActEd Binder', 'ActEd Binder', '', '2025-03-11 14:19:04.689367+00', '2025-03-11 14:19:04.689367+00', true);
INSERT INTO public.acted_products VALUES (50, 'PC', 'Combined Materials Pack', 'CMP', '', '2025-03-11 14:19:04.691687+00', '2025-03-11 14:19:04.691687+00', true);
INSERT INTO public.acted_products VALUES (51, 'PCR', 'Core Reading', 'Core Reading', '', '2025-03-11 14:19:04.696439+00', '2025-03-11 14:19:04.696439+00', true);
INSERT INTO public.acted_products VALUES (52, 'PEX2', 'ASET (2020-2023 Papers)', 'ASET 2020-23 Papers', '', '2025-03-11 14:19:04.69855+00', '2025-03-11 14:19:04.69855+00', true);
INSERT INTO public.acted_products VALUES (53, 'PFC', 'Flash Cards', 'Flash Cards', '', '2025-03-11 14:19:04.70255+00', '2025-03-11 14:19:04.70255+00', true);
INSERT INTO public.acted_products VALUES (54, 'PN', 'Course Notes', 'Course Notes', '', '2025-03-11 14:19:04.705432+00', '2025-03-11 14:19:04.705432+00', true);
INSERT INTO public.acted_products VALUES (55, 'PNRB', 'Revision Notes', 'Revision Notes', '', '2025-03-11 14:19:04.707462+00', '2025-03-11 14:19:04.707462+00', true);
INSERT INTO public.acted_products VALUES (56, 'PPMBP', 'Maths & Stats Bronze (printed book only)', 'MS Bronze Printed Book', '', '2025-03-11 14:19:04.709985+00', '2025-03-11 14:19:04.709985+00', true);
INSERT INTO public.acted_products VALUES (57, 'PPMGP', 'Maths & Stats Gold (with printed book)', 'MS Gold Printed Book', '', '2025-03-11 14:19:04.713129+00', '2025-03-11 14:19:04.713129+00', true);
INSERT INTO public.acted_products VALUES (58, 'PPMSP', 'Maths & Stats Silver (with printed book)', 'MS Silver Printed Book', '', '2025-03-11 14:19:04.716129+00', '2025-03-11 14:19:04.716129+00', true);
INSERT INTO public.acted_products VALUES (59, 'PTB', 'Printed Textbook', 'Printed Textbook', '', '2025-03-11 14:19:04.718126+00', '2025-03-11 14:19:04.718126+00', true);
INSERT INTO public.acted_products VALUES (60, 'PTB2', 'Printed Textbook 2nd Edition', 'Printed Textbook 2nd', '', '2025-03-11 14:19:04.72013+00', '2025-03-11 14:19:04.72013+00', true);
INSERT INTO public.acted_products VALUES (61, 'PX', 'Series X Assignments', 'Series X Assignments', '', '2025-03-11 14:19:04.724162+00', '2025-03-11 14:19:04.724162+00', true);
INSERT INTO public.acted_products VALUES (62, 'PXS', 'Series X Solutions', 'Series X Solutions', '', '2025-03-11 14:19:04.726649+00', '2025-03-11 14:19:04.726649+00', true);
INSERT INTO public.acted_products VALUES (63, 'PBAR', 'Baxter & Rennie Textbook', 'Baxter & Rennie Book', '', '2025-03-11 14:19:04.729896+00', '2025-03-11 14:19:04.729896+00', true);
INSERT INTO public.acted_products VALUES (64, 'PE11', 'Economics Textbook 11th Ed.', 'Economics Book', '', '2025-03-11 14:19:04.732898+00', '2025-03-11 14:19:04.732898+00', true);
INSERT INTO public.acted_products VALUES (65, 'PH11', 'SP6 Hull Textbook 11th Ed.', 'Hull Book', '', '2025-03-11 14:19:04.735897+00', '2025-03-11 14:19:04.735897+00', true);
INSERT INTO public.acted_products VALUES (66, 'PLAM', 'Lam Textbook 2nd Ed.', 'Lam Textbook', '', '2025-03-11 14:19:04.737911+00', '2025-03-11 14:19:04.737911+00', true);
INSERT INTO public.acted_products VALUES (67, 'PSWE2', 'Sweeting Textbook 2nd Ed.', 'Sweeting Book', '', '2025-03-11 14:19:04.740937+00', '2025-03-11 14:19:04.740937+00', true);
INSERT INTO public.acted_products VALUES (68, 'CMAS', 'Mini ASET (September 2024 Paper) eBook', 'Mini ASET Sep.24 ebook', '', '2025-03-11 14:19:04.741922+00', '2025-03-11 14:19:04.741922+00', true);
INSERT INTO public.acted_products VALUES (69, 'CVAU', 'The Vault', 'The Vault', '', '2025-03-11 14:19:04.745454+00', '2025-03-11 14:19:04.745454+00', true);
INSERT INTO public.acted_products VALUES (70, 'CYS', 'Series Y Solutions eBook', 'Series Y Sol. eBook', '', '2025-03-11 14:19:04.749721+00', '2025-03-11 14:19:04.749721+00', true);


--
-- TOC entry 4893 (class 0 OID 0)
-- Dependencies: 240
-- Name: products_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eugenelo1030
--

SELECT pg_catalog.setval('public.products_product_id_seq', 70, true);


-- Completed on 2025-04-04 16:36:22

--
-- PostgreSQL database dump complete
--

