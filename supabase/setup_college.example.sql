-- Template: onboard one college. Replace the values, then run in the Supabase SQL editor.

-- 1. Add the college and its email domain(s)
with i as (insert into public.institutions (name) values ('Demo College') returning id)
insert into public.institution_domains (domain, institution_id)
select d, i.id from i, unnest(array['mycollege.edu.in']) as d;

-- 2. The counsellor signs in once with their college email, then:
select public.promote_to_counsellor('mira.nair@mycollege.edu.in', 'Dr. Mira Nair');

-- 3. Weekly availability: Monday to Friday, 3:00 to 6:00 pm
insert into public.counsellor_availability (counsellor_id, weekday, start_time, end_time)
select c.id, d, '15:00', '18:00'
from public.counsellors c, generate_series(1, 5) d
where c.display_name = 'Dr. Mira Nair';