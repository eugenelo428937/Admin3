-- Insert tutorial events from CSV data
-- This script maps the CSV codes to exam_session_subject_product_variations
-- and inserts the tutorial events

INSERT INTO acted_tutorial_events (
    code, 
    venue, 
    is_soldout, 
    finalisation_date, 
    remain_space, 
    start_date, 
    end_date, 
    exam_session_subject_product_variation_id,
    created_at,
    updated_at
) 
SELECT 

    csv_data.title,
    COALESCE(csv_data.venue, 'TBD') as venue,
    CASE WHEN csv_data.sold_out = 'TRUE' THEN true ELSE false END as is_soldout,
    TO_TIMESTAMP(csv_data.finalisation_date, 'DD/MM/YYYY') as finalisation_date,
    csv_data.remain_space,
    TO_TIMESTAMP(csv_data.start_date, 'DD/MM/YYYY HH24:MI') as start_date,
    TO_TIMESTAMP(csv_data.end_date, 'DD/MM/YYYY HH24:MI') as end_date, -- Using start_date as end_date since no end_date in CSV
    master.esspvid as exam_session_subject_product_variation_id,
    NOW() as created_at,
    NOW() as updated_at
FROM (
    VALUES 
   ('CB1_LO_6','CB1-01-25S','27/05/2025 09:00','31/07/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',5),
('CB1_LO_3','CB1-10-25S','03/06/2025 09:30','17/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CB1_LO_3','CB1-11-25S','17/06/2025 09:30','14/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',14),
('CB1_f2f_3','CB1-20-25S','29/05/2025 09:30','14/07/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'28/04/2025',0),
('CB1_f2f_3','CB1-21-25S','11/06/2025 09:30','29/07/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'12/05/2025',1),
('CB1_f2f_3','CB1-22-25S','12/06/2025 09:30','25/07/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'12/05/2025',2),
('CB1_f2f_3','CB1-30-25S','19/06/2025 09:30','24/07/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'12/05/2025',12),
('CB1_f2f_3','CB1-32-25S','19/06/2025 09:30','24/07/2025 17:00','Tutorial - Manchester','BPP Manchester',FALSE,'28/05/2025',7),
('CB1_LO_3','CB1-40-25S','18/06/2025 09:30','18/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',7),
('CB1_LO_3','CB1-41-25S','24/06/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',0),
('CB1_f2f_3','CB1-50-25S','08/07/2025 09:30','04/08/2025 17:00','Tutorial - London','BPP London East (Portsoken)',FALSE,'02/06/2025',12),
('CB1_LO_3','CB1-60-25S','16/07/2025 09:30','07/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',3),
('CB1_f2f_3','CB1-70-25S','04/08/2025 09:30','06/08/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'14/07/2025',10),
('CB2_LO_4','CB2-10-25S','21/05/2025 09:30','16/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',2),
('CB2_LO_4','CB2-11-25S','02/06/2025 09:30','08/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CB2_f2f_4','CB2-20-25S','27/05/2025 09:30','22/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'28/04/2025',0),
('CB2_f2f_4','CB2-21-25S','20/05/2025 09:30','10/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'28/04/2025',0),
('CB2_f2f_4','CB2-22-25S','02/06/2025 09:30','29/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CB2_f2f_4','CB2-23-25S','29/05/2025 09:30','08/08/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'28/04/2025',0),
('CB2_f2f_4','CB2-24-25S','22/05/2025 09:30','17/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'28/04/2025',0),
('CB2_f2f_4','CB2-30-25S','15/07/2025 09:30','20/08/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'22/06/2025',0),
('CB2_f2f_4','CB2-32-25S','10/06/2025 09:30','22/07/2025 17:00','Tutorial - Manchester','BPP Manchester',FALSE,'12/05/2025',3),
('CB2_f2f_4','CB2-38-25S','12/06/2025 09:30','14/08/2025 17:00','Tutorial - Bristol','BPP Bristol',FALSE,'12/05/2025',6),
('CB2_LO_4','CB2-40-25S','07/07/2025 09:30','18/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',0),
('CB2_LO_4','CB2-41-25S','18/06/2025 09:30','26/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CB2_LO_4','CB2-42-25S','23/06/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',0),
('CB2_f2f_4','CB2-50-25S','10/06/2025 09:30','26/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CB2_f2f_4','CB2-51-25S','04/06/2025 09:30','27/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'12/05/2025',12),
('CB2_LO_4','CB2-60-25S','24/06/2025 09:30','26/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',2),
('CB2_f2f_4','CB2-70-25S','04/08/2025 09:30','12/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',1),
('CM1_LO_6','CM1-10-25S','20/05/2025 09:30','11/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',3),
('CM1_LO_6','CM1-11-25S','22/05/2025 09:30','11/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',8),
('CM1_f2f_6','CM1-20-25S','21/05/2025 09:30','30/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'28/04/2025',1),
('CM1_f2f_6','CM1-21-25S','04/06/2025 09:30','11/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CM1_f2f_6','CM1-22-25S','05/06/2025 09:30','22/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',5),
('CM1_f2f_6','CM1-23-25S','18/06/2025 09:30','07/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'12/05/2025',12),
('CM1_f2f_6','CM1-30-25S','02/06/2025 09:30','18/08/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'12/05/2025',4),
('CM1_LO_6','CM1-40-25S','10/06/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CM1_LO_6','CM1-41-25S','11/06/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',14),
('CM1_f2f_6','CM1-50-25S','10/06/2025 09:30','21/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CM1_LO_6','CM1-60-25S','16/06/2025 09:30','12/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CM1_LO_6','CM1-61-25S','23/06/2025 09:30','14/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',0),
('CM1_f2f_6','CM1-70-25S','02/07/2025 09:30','13/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',8),
('CM1_LO_1','CM1-80-25S','27/08/2025 09:30','27/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',13),
('CM2_LO_8','CM2-01-25S','22/05/2025 09:00','04/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',2),
('CM2_LO_5','CM2-10-25S','20/05/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',1),
('CM2_LO_5','CM2-11-25S','28/05/2025 09:30','29/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',0),
('CM2_LO_5','CM2-12-25S','29/05/2025 09:30','31/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',0),
('CM2_LO_5','CM2-13-25S','06/06/2025 09:30','15/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CM2_f2f_5','CM2-20-25S','22/05/2025 09:30','15/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'28/04/2025',0),
('CM2_f2f_5','CM2-21-25S','05/06/2025 09:30','28/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'12/05/2025',0),
('CM2_f2f_5','CM2-22-25S','04/06/2025 09:30','11/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'12/05/2025',0),
('CM2_f2f_5','CM2-23-25S','03/06/2025 09:30','14/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CM2_f2f_5','CM2-30-25S','27/05/2025 09:30','29/07/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'12/05/2025',0),
('CM2_f2f_5','CM2-32-25S','19/06/2025 09:30','27/08/2025 17:00','Tutorial - Manchester','BPP Manchester',FALSE,'12/05/2025',3),
('CM2_LO_5','CM2-41-25S','23/06/2025 09:30','27/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',14),
('CM2_LO_5','CM2-42-25S','25/06/2025 09:30','28/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',2),
('CM2_f2f_5','CM2-50-25S','16/06/2025 09:30','08/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CM2_f2f_5','CM2-51-25S','28/07/2025 09:30','26/08/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'22/06/2025',0),
('CM2_f2f_5','CM2-52-25S','16/06/2025 09:30','27/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CM2_f2f_5','CM2-55-25S','22/07/2025 09:00','21/08/2025 16:30','Tutorial - Dublin','Camden Court Hotel',FALSE,'22/06/2025',11),
('CM2_LO_5','CM2-60-25S','17/06/2025 09:30','26/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CM2_LO_5','CM2-61-25S','24/06/2025 09:30','28/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',5),
('CM2_f2f_5','CM2-70-25S','14/07/2025 09:30','27/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'22/06/2025',1),
('CM2_LO_1','CM2-80-25S','22/08/2025 09:30','22/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',4),
('CM2_LO_1','CM2-81-25S','28/08/2025 09:30','28/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',10),
('CP1_LO_10','CP1-01-25S','22/05/2025 09:00','22/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',3),
('CP1_LO_5','CP1-10-25S','03/06/2025 09:30','28/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CP1_f2f_5','CP1-20-25S','27/05/2025 09:30','30/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'28/04/2025',0),
('CP1_LO_5','CP1-40-25S','06/06/2025 09:30','22/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',14),
('CP1_f2f_5','CP1-50-25S','07/07/2025 09:30','14/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',4),
('CP1_f2f_5','CP1-51-25S','26/06/2025 09:30','07/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',0),
('CP1_LO_5','CP1-60-25S','07/07/2025 09:30','18/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',3),
('CP1_f2f_5','CP1-70-25S','09/07/2025 09:30','14/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'02/06/2025',0),
('CP2_LO_2','CP2-01-25S','18/07/2025 09:00','25/07/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',7),
('CP2_LO_2','CP2-02-25S','30/07/2025 09:00','05/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',6),
('CP2_LO_1','CP2-10-25S','22/07/2025 09:30','22/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',0),
('CP2_LO_1','CP2-11-25S','02/07/2025 09:30','02/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',0),
('CP2_LO_1','CP2-13-25S','31/07/2025 09:30','31/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',0),
('CP2_LO_1','CP2-14-25S','14/08/2025 09:30','14/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',8),
('CP2_LO_1','CP2-15-25S','06/08/2025 09:30','06/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',3),
('CP2_LO_1','CP2-12-25S','23/07/2025 09:30','23/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',0),
('CP2_LO_1','CP2-16-25S','05/08/2025 09:30','05/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',4),
('CP2_LO_1','CP2-17-25S','12/08/2025 09:30','12/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',9),
('CP2_LO_1','CP2-18-25S','14/08/2025 09:30','14/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',10),
('CP2_LO_1','CP2-19-25S','14/08/2025 09:30','14/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',0),
('CP2_f2f_1','CP2-20-25S','22/07/2025 09:30','22/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'22/06/2025',0),
('CP2_LO_1','CP2-21-25S','22/07/2025 09:30','22/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',14),
('CP2_f2f_1','CP2-22-25S','04/08/2025 09:30','04/08/2025 17:00','Tutorial - London','BPP London North (King''s Cross)',FALSE,'14/07/2025',0),
('CP2_LO_1','CP2-24-25S','19/08/2025 09:30','19/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',14),
('CP2_f2f_1','CP2-23-25S','29/07/2025 09:30','29/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'22/06/2025',0),
('CP2_f2f_1','CP2-25-25S','12/08/2025 09:30','12/08/2025 17:00','Tutorial - London','BPP London North (King''s Cross)',FALSE,'14/07/2025',0),
('CP2_f2f_1','CP2-26-25S','19/08/2025 09:30','19/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',0),
('CP2_f2f_1','CP2-27-25S','06/08/2025 09:30','06/08/2025 17:00','Tutorial - London','BPP London East (Portsoken)',FALSE,'14/07/2025',0),
('CP2_f2f_1','CP2-30-25S','14/08/2025 09:30','14/08/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'14/07/2025',0),
('CP2_f2f_1','CP2-31-25S','20/08/2025 09:00','20/08/2025 16:30','Tutorial - Dublin','Camden Court Hotel',FALSE,'14/07/2025',2),
('CP2_f2f_1','CP2-32-25S','05/08/2025 09:30','05/08/2025 17:00','Tutorial - Manchester','BPP Manchester',FALSE,'14/07/2025',0),
('CP2_f2f_1','CP2-33-25S','13/08/2025 09:30','13/08/2025 17:00','Tutorial - Birmingham','BPP Birmingham',FALSE,'14/07/2025',5),
('CP2_f2f_1','CP2-34-25S','07/08/2025 09:30','07/08/2025 17:00','Tutorial - Leeds','BPP Leeds',FALSE,'14/07/2025',8),
('CP2_f2f_1','CP2-38-25S','07/08/2025 09:30','07/08/2025 17:00','Tutorial - Bristol','BPP Bristol',FALSE,'14/07/2025',0),
('CP2_LO_1','CP2-40-25S','18/08/2025 09:30','18/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',10),
('CP2_LO_1','CP2-41-25S','26/08/2025 09:30','26/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',13),
('CP2_LO_1','CP2-42-25S','20/08/2025 09:30','20/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',12),
('CP3_LO_2','CP3-01-25S','06/08/2025 09:00','11/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',9),
('CP3_LO_2','CP3-02-25S','22/07/2025 09:00','29/07/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',6),
('CP3_LO_1','CP3-10-25S','09/07/2025 09:30','09/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',4),
('CP3_LO_1','CP3-11-25S','21/07/2025 09:30','21/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',12),
('CP3_LO_1','CP3-12-25S','08/07/2025 09:30','08/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',8),
('CP3_LO_1','CP3-13-25S','04/08/2025 09:30','04/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',10),
('CP3_LO_1','CP3-14-25S','12/08/2025 09:30','12/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',5),
('CP3_LO_1','CP3-15-25S','14/07/2025 09:30','14/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',8),
('CP3_LO_1','CP3-16-25S','16/07/2025 09:30','16/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',7),
('CP3_LO_1','CP3-17-25S','30/07/2025 09:30','30/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',8),
('CP3_LO_1','CP3-18-25S','21/07/2025 09:30','21/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',8),
('CP3_LO_1','CP3-19-25S','26/08/2025 09:30','26/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',14),
('CP3_f2f_1','CP3-20-25S','09/07/2025 09:30','09/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',0),
('CP3_f2f_1','CP3-21-25S','28/07/2025 09:30','28/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'22/06/2025',1),
('CP3_f2f_1','CP3-22-25S','29/07/2025 09:30','29/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'22/06/2025',2),
('CP3_f2f_1','CP3-24-25S','19/08/2025 09:30','19/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'14/07/2025',11),
('CP3_f2f_1','CP3-25-25S','06/08/2025 09:30','06/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',4),
('CP3_f2f_1','CP3-26-25S','07/08/2025 09:30','07/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',5),
('CP3_f2f_1','CP3-28-25S','20/08/2025 09:30','20/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'14/07/2025',8),
('CP3_f2f_1','CP3-29-25S','21/08/2025 09:30','21/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'14/07/2025',9),
('CP3_f2f_1','CP3-30-25S','14/07/2025 09:30','14/07/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'22/06/2025',2),
('CP3_f2f_1','CP3-31-25S','14/08/2025 09:00','14/08/2025 16:30','Tutorial - Dublin','Camden Court Hotel',FALSE,'14/07/2025',4),
('CP3_f2f_1','CP3-32-25S','13/08/2025 09:30','13/08/2025 17:00','Tutorial - Manchester','BPP Manchester',FALSE,'14/07/2025',0),
('CP3_f2f_1','CP3-34-25S','12/08/2025 09:30','12/08/2025 17:00','Tutorial - Leeds','BPP Leeds',FALSE,'14/07/2025',6),
('CP3_f2f_1','CP3-33-25S','13/08/2025 09:30','13/08/2025 17:00','Tutorial - Birmingham','BPP Birmingham',FALSE,'14/07/2025',4),
('CP3_f2f_1','CP3-38-25S','12/08/2025 09:30','12/08/2025 17:00','Tutorial - Bristol','BPP Bristol',FALSE,'14/07/2025',4),
('CP3_LO_1','CP3-40-25S','18/07/2025 09:30','18/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',11),
('CP3_LO_1','CP3-41-25S','28/07/2025 09:30','28/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',9),
('CP3_LO_1','CP3-42-25S','28/08/2025 09:30','28/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',9),
('CP3_LO_1','CP3-43-25S','20/08/2025 09:30','20/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',6),
('CP3_LO_1','CP3-44-25S','01/08/2025 09:30','01/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',8),
('CP3_f2f_1','CP3-50-25S','07/07/2025 09:30','07/07/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'02/06/2025',0),
('CS1_LO_8','CS1-01-25S','22/05/2025 09:00','31/07/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',0),
('CS1_LO_5','CS1-10-25S','22/05/2025 09:30','07/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',6),
('CS1_LO_5','CS1-11-25S','27/05/2025 09:30','05/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',1),
('CS1_f2f_5','CS1-20-25S','20/05/2025 09:30','30/07/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'28/04/2025',0),
('CS1_f2f_5','CS1-21-25S','28/05/2025 09:30','31/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'28/04/2025',0),
('CS1_f2f_5','CS1-22-25S','05/06/2025 09:30','13/08/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'12/05/2025',0),
('CS1_f2f_5','CS1-23-25S','28/05/2025 09:30','06/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CS1_f2f_5','CS1-30-25S','28/05/2025 09:30','21/08/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'12/05/2025',2),
('CS1_f2f_5','CS1-32-25S','11/06/2025 09:30','12/08/2025 17:00','Tutorial - Manchester','BPP Manchester',FALSE,'12/05/2025',6),
('CS1_f2f_5','CS1-33-25S','23/06/2025 09:30','12/08/2025 17:00','Tutorial - Birmingham','BPP Birmingham',FALSE,'02/06/2025',3),
('CS1_f2f_5','CS1-38-25S','28/05/2025 09:30','13/08/2025 17:00','Tutorial - Bristol','BPP Bristol',FALSE,'28/04/2025',1),
('CS1_LO_5','CS1-40-25S','11/06/2025 09:30','21/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CS1_LO_5','CS1-42-25S','23/06/2025 09:30','27/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',6),
('CS1_f2f_5','CS1-50-25S','18/06/2025 09:30','11/08/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'12/05/2025',0),
('CS1_f2f_5','CS1-51-25S','20/06/2025 09:30','26/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('CS1_f2f_5','CS1-52-25S','19/06/2025 09:30','20/08/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'12/05/2025',0),
('CS1_LO_5','CS1-60-25S','18/07/2025 09:30','28/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',9),
('CS1_f2f_5','CS1-70-25S','23/07/2025 09:30','22/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'22/06/2025',10),
('CS1_LO_1','CS1-80-25S','12/08/2025 09:30','12/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',3),
('CS2_LO_10','CS2-01-25S','21/05/2025 09:00','08/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',5),
('CS2_LO_6','CS2-10-25S','20/05/2025 09:30','04/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',0),
('CS2_f2f_6','CS2-20-25S','21/05/2025 09:30','06/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'28/04/2025',2),
('CS2_f2f_6','CS2-21-25S','30/05/2025 09:30','14/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'28/04/2025',0),
('CS2_f2f_6','CS2-22-25S','04/06/2025 09:30','14/08/2025 17:00','Tutorial - Birmingham','BPP Birmingham',FALSE,'12/05/2025',12),
('CS2_f2f_6','CS2-33-25S','11/06/2025 09:30','06/08/2025 17:00','Tutorial - Leeds','BPP Leeds',FALSE,'12/05/2025',8),
('CS2_LO_6','CS2-40-25S','01/07/2025 09:30','11/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',1),
('CS2_LO_6','CS2-41-25S','03/06/2025 09:30','18/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CS2_f2f_6','CS2-50-25S','02/07/2025 09:30','14/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'02/06/2025',1),
('CS2_f2f_6','CS2-51-25S','25/06/2025 09:30','18/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'02/06/2025',0),
('CS2_LO_6','CS2-60-25S','09/06/2025 09:30','11/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('CS2_f2f_6','CS2-70-25S','08/07/2025 09:30','14/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',5),
('CS2_LO_1','CS2-80-25S','18/08/2025 09:30','18/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',8),
('CS2_LO_1','CS2-81-25S','21/08/2025 09:30','21/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',11),
('SA1_LO_2','SA1-60-25S','22/07/2025 09:30','05/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',13),
('SA2_LO_6','SA2-01-25S','23/06/2025 09:00','27/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',6),
('SA2_LO_3','SA2-10-25S','30/05/2025 09:30','09/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'28/04/2025',4),
('SA2_f2f_3','SA2-20-25S','12/06/2025 09:30','24/07/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'12/05/2025',3),
('SA2_f2f_3','SA2-33-25S','03/07/2025 09:30','30/07/2025 17:00','Tutorial - Birmingham','BPP Birmingham',FALSE,'02/06/2025',12),
('SA2_f2f_3','SA2-55-25S','08/07/2025 09:30','18/08/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'02/06/2025',12),
('SA2_LO_3','SA2-60-25S','12/08/2025 09:30','26/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'14/07/2025',5),
('SA2_f2f_3','SA2-70-25S','18/08/2025 09:30','20/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'14/07/2025',10),
('SA3_LO_6','SA3-01-25S','11/06/2025 09:00','20/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',5),
('SA3_f2f_3','SA3-20-25S','10/06/2025 09:30','22/07/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'12/05/2025',0),
('SA3_LO_3','SA3-40-25S','16/06/2025 09:30','04/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('SA3_LO_3','SA3-41-25S','16/06/2025 09:30','15/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',14),
('SA3_f2f_3','SA3-50-25S','22/07/2025 09:30','18/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'22/06/2025',0),
('SA3_f2f_3','SA3-52-25S','15/07/2025 09:30','26/08/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'22/06/2025',0),
('SA3_LO_3','SA3-60-25S','30/06/2025 09:30','18/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',5),
('SA3_f2f_3','SA3-70-25S','20/08/2025 09:30','22/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'14/07/2025',7),
('SA4_LO_3','SA4-10-25S','09/06/2025 09:30','30/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',2),
('SA4_LO_3','SA4-20-25S','18/06/2025 09:30','08/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',6),
('SA4_LO_3','SA4-60-25S','04/07/2025 09:30','26/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',14),
('SA4_f2f_3','SA4-70-25S','04/08/2025 09:30','06/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',1),
('SA7_LO_3','SA7-40-25S','30/07/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',8),
('SA7_f2f_3','SA7-70-25S','19/08/2025 09:30','21/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',10),
('SP1_LO_3','SP1-40-25S','09/07/2025 09:30','06/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',0),
('SP1_f2f_3','SP1-50-25S','24/06/2025 09:30','04/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',6),
('SP1_f2f_3','SP1-51-25S','03/07/2025 09:00','21/08/2025 16:30','Tutorial - Dublin','Camden Court Hotel',FALSE,'02/06/2025',12),
('SP1_LO_3','SP1-60-25S','15/07/2025 09:30','01/09/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',10),
('SP1_LO_3','SP1-61-25S','31/07/2025 09:30','29/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',11),
('SP1_f2f_3','SP1-70-25S','28/07/2025 09:30','30/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'22/06/2025',8),
('SP2_LO_3','SP2-10-25S','28/05/2025 09:30','08/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',9),
('SP2_f2f_3','SP2-20-25S','11/06/2025 09:30','23/07/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'12/05/2025',0),
('SP2_LO_3','SP2-41-25S','25/06/2025 09:30','20/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',5),
('SP2_f2f_3','SP2-46-25S','25/06/2025 09:30','05/08/2025 17:00','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'02/06/2025',8),
('SP2_LO_3','SP2-60-25S','03/07/2025 09:30','14/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',0),
('SP2_LO_3','SP2-61-25S','30/07/2025 09:30','27/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',7),
('SP2_f2f_3','SP2-70-25S','04/08/2025 09:30','06/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',0),
('SP2_f2f_3','SP2-75-25S','12/08/2025 09:00','14/08/2025 16:30','Tutorial - Dublin','Camden Court Hotel',FALSE,'14/07/2025',7),
('SP4_LO_3','SP4-10-25S','02/06/2025 09:30','21/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('SP4_f2f_3','SP4-20-25S','03/06/2025 09:30','29/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',2),
('SP4_LO_3','SP4-40-25S','03/07/2025 09:30','19/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',1),
('SP4_f2f_3','SP4-50-25S','16/07/2025 09:30','18/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'22/06/2025',4),
('SP4_f2f_3','SP4-70-25S','11/08/2025 09:30','13/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',7),
('SP5_LO_3','SP5-10-25S','05/06/2025 09:30','31/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('SP5_f2f_3','SP5-20-25S','29/05/2025 09:30','09/07/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'12/05/2025',0),
('SP5_LO_3','SP5-40-25S','10/07/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',0),
('SP5_f2f_3','SP5-50-25S','08/07/2025 09:30','27/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',0),
('SP5_LO_3','SP5-60-25S','30/07/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',0),
('SP5_f2f_3','SP5-70-25S','20/08/2025 09:30','22/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',10),
('SP5_f2f_3','SP5-83-25S','19/08/2025 09:30','21/08/2025 17:00','Tutorial - Birmingham','BPP Birmingham',FALSE,'14/07/2025',10),
('SP6_LO_3','SP6-40-25S','09/07/2025 09:30','29/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',7),
('SP6_f2f_3','SP6-70-25S','20/08/2025 09:30','22/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',5),
('SP7_LO_6','SP7-01-25S','30/05/2025 09:00','18/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',14),
('SP7_LO_6','SP7-02-25S','13/06/2025 09:00','22/08/2025 12:30','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',14),
('SP7_f2f_3','SP7-20-25S','27/05/2025 09:30','24/07/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'28/04/2025',0),
('SP7_LO_3','SP7-40-25S','11/06/2025 09:30','21/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',0),
('SP7_f2f_3','SP7-50-25S','16/07/2025 09:30','19/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'22/06/2025',3),
('SP7_LO_3','SP7-60-25S','10/07/2025 09:30','14/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',1),
('SP7_LO_3','SP7-61-25S','11/07/2025 09:30','22/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',8),
('SP7_f2f_3','SP7-70-25S','23/07/2025 09:30','31/07/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'22/06/2025',0),
('SP8_LO_3','SP8-10-25S','29/05/2025 09:30','10/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',2),
('SP8_LO_3','SP8-11-25S','05/06/2025 09:30','24/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',2),
('SP8_f2f_3','SP8-20-25S','28/05/2025 09:30','25/07/2025 17:00','Tutorial - London','BPP London West (Shepherd''s Bush)',FALSE,'28/04/2025',0),
('SP8_LO_3','SP8-40-25S','17/07/2025 09:30','21/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',11),
('SP8_LO_3','SP8-41-25S','12/06/2025 09:30','22/07/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'12/05/2025',14),
('SP8_f2f_3','SP8-50-25S','17/07/2025 09:30','29/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'22/06/2025',0),
('SP8_LO_3','SP8-60-25S','31/07/2025 09:30','28/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',11),
('SP8_LO_3','SP8-61-25S','08/07/2025 09:30','19/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'02/06/2025',5),
('SP8_f2f_3','SP8-70-25S','26/08/2025 09:30','28/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'14/07/2025',1),
('SP9_f2f_3','SP9-40-25S','09/07/2025 09:30','20/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',6),
('SP9_LO_3','SP9-50-25S','24/07/2025 09:30','20/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',7),
 ('CP2_f2f_1','CP2-43-25S','21/08/2025 09:30','21/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',0),
('CM1_f2f_6','CM1-32-25S','18/06/2025 09:30','07/08/2025 17:00','Tutorial - Manchester','BPP Manchester',FALSE,'28/05/2025',12),
('CS1_f2f_5','CS1-53-25S','18/06/2025 09:30','07/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'28/05/2025',0),
('CM2_f2f_5','CM2-24-25S','04/06/2025 09:30','13/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'12/05/2025',0),
('CP2_f2f_1','CP2-28-25S','20/08/2025 09:30','20/08/2025 17:00','Tutorial - London','BPP London Central (Holborn)',FALSE,'14/07/2025',0),
('CM1_LO_6','CM1-62-25S','09/07/2025 09:30','13/08/2025 17:00','Tutorial - Live Online','Live Online',FALSE,'22/06/2025',13),
('CM2_f2f_5','CM2-53-25S','23/06/2025 09:30','27/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'02/06/2025',8),
('CP2_f2f_1','CP2-29-25S','13/08/2025 09:30','13/08/2025 17:00','Tutorial - London','BPP London South (Waterloo)',FALSE,'14/07/2025',1),
('SP1_f2f_3','SP1-55-25S','08/07/2025 09:00','18/08/2025 16:30','Tutorial - Edinburgh','Edinburgh Training and Conf'' Centre',FALSE,'16/06/2025',9)
    -- Add more rows as needed from the CSV
) AS csv_data(code_prefix, title, start_date, end_date, location, venue, sold_out, finalisation_date, remain_space)
LEFT JOIN 
(SELECT esspv.id esspvid, pv.id pvid, ps.id pid, ps.fullname, s.id sid, s.code scode , pv.code pvcode, essp.id esspid, ppv.id ppvid
 FROM acted_products ps
LEFT JOIN acted_product_productvariation ppv ON ps.id = ppv.product_id
left join acted_product_variations pv ON pv.id = ppv.product_variation_id
left join acted_exam_session_subject_products essp ON essp.product_id = ps.id
left join acted_exam_session_subject_product_variations esspv ON esspv.product_product_variation_id = ppv.id 
           AND essp.id = esspv.exam_session_subject_product_id
left join acted_exam_session_subjects ess ON ess.id = essp.exam_session_subject_id
left join acted_subjects s ON s.id = ess.subject_id) master 
ON master.fullname = csv_data.location 
AND master.scode = SUBSTRING(csv_data.code_prefix FROM 1 FOR 3)
AND master.pvcode = csv_data.code_prefix
WHERE master.esspvid IS NOT NULL 
ON CONFLICT (code) DO NOTHING;

-- Note: This script includes only a sample of the CSV data
-- You should extend this with all rows from the CSV file
-- The script assumes that exam_session_subject_product_variations table 
-- has records with names matching the code prefixes (CB1_LO_6, CB1_LO_3, etc.)
