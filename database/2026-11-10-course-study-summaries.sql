-- Public planning figures derived from learner materials. Only the totals leave the protected lessons.
alter table public.ta_course_previews add column if not exists study_minutes integer check (study_minutes > 0);
alter table public.ta_course_previews add column if not exists workshop_count integer check (workshop_count > 0);

with projects as (
  select course_slug,(material->'study_project'->>'minutes')::integer
    + coalesce((material->'study_project'->>'reading_minutes')::integer,0)
    + coalesce((material->'study_project'->>'review_minutes')::integer,0) as minutes,
    jsonb_array_length(material->'study_project'->'chapters') as workshops
  from public.ta_lessons where lesson_no=0 and material ? 'study_project'
)
update public.ta_course_previews p set study_minutes=x.minutes,workshop_count=x.workshops,updated_at=now()
from projects x where p.course_slug=x.course_slug
and (p.study_minutes,p.workshop_count) is distinct from (x.minutes,x.workshops);

with translated(slug,english_title) as (values
  ('autocad-skroty', 'AutoCAD Commands and Keyboard Shortcuts'),
  ('blizej-dziecka', 'Building a Closer Relationship with Your Child'),
  ('excel-skroty', 'Excel Keyboard Shortcuts and Spreadsheet Skills'),
  ('facebook-ads-promocja', 'Promoting a Business with Facebook and Instagram Ads'),
  ('google-ads-promocja', 'Fundamentals of Business Promotion with Google Ads'),
  ('jak-kupic-samochod', 'Used Car Buying and Vehicle Assessment'),
  ('lepszy-cukiernik', 'Practical Pastry and Confectionery Skills'),
  ('lepszy-kucharz', 'Practical Cooking and Kitchen Organisation'),
  ('mierz-ponad-sily', 'Self-Directed Learning and Practical Skills Development'),
  ('mocny-charakter', 'Assertiveness and Personal Boundaries'),
  ('nie-lubie-ludzi', 'Building Social Confidence at Your Own Pace'),
  ('obowiazki-domowe', 'Household Tasks and Shared Responsibilities'),
  ('opieka-seniorzy', 'Supporting Older Adults in Daily Life'),
  ('poznaj-siebie', 'Self-Awareness and Identifying Personal Strengths'),
  ('rodzice-50-50', 'Planning Shared Parenting and Alternating Care'),
  ('swiety-mikolaj', 'Organising a Safe and Welcoming Santa Visit'),
  ('wsparcie-adhd', 'Practical Support for People with ADHD'),
  ('zaczynam-od-zera', 'Financial and Practical Recovery After a Major Loss'),
  ('zwiazek-rozmowa', 'Practical Communication in Relationships')
)
update public.ta_courses c set certificate_en=t.english_title,
  title_en=case when nullif(c.title_en,'') is null or c.title_en=c.title_pl then t.english_title else c.title_en end
from translated t where t.slug=c.slug and (nullif(c.certificate_en,'') is null or c.certificate_en=c.certificate_pl);

-- Replace mixed-language names on the English edition of the diploma.
with translated(slug,english_title) as (values
  ('angielski-na-budowie', 'English for Construction Site Work'),
  ('astro-consafe-wms', 'Consafe Astro WMS: Warehouse Operations and Automation'),
  ('axapta-dynamics-magazyn', 'Warehouse Operations in Dynamics AX and Dynamics 365 SCM'),
  ('bednarz', 'Coopering: Wooden Barrels and Vessels'),
  ('blue-yonder-wms', 'Blue Yonder WMS: Warehouse Operations and Automation'),
  ('ciesla-przygotowanie-czeladnicze', 'Carpentry: Preparation for the Journeyman Examination'),
  ('garncarz-tradycja', 'Pottery: Clay and the Potter’s Wheel'),
  ('gontarz', 'Traditional Wooden Shingle Roofing'),
  ('infor-wms', 'Infor CloudSuite WMS: Warehouse Operations'),
  ('introligator-tradycja', 'Traditional Hand Bookbinding'),
  ('kaletnik-tradycja', 'Leathercraft: Bags, Belts and Wallets'),
  ('kolodziej', 'Wheelwrighting: Traditional Wooden Wheels'),
  ('kowal-tradycja', 'Traditional Blacksmithing and Forge Fundamentals'),
  ('ludwisarz', 'Traditional Bellfounding and Metal Casting'),
  ('manhattan-active-wms', 'Manhattan Active Warehouse Management'),
  ('mlynarz-tradycyjny', 'Traditional Milling: From Grain to Flour'),
  ('niemiecki-na-budowie', 'German for Construction Site Work'),
  ('norweski-na-budowie', 'Norwegian for Construction Site Work'),
  ('ongoing-wms', 'Ongoing WMS: E-Commerce Warehousing and 3PL'),
  ('oracle-wms-cloud', 'Oracle Warehouse Management Cloud: Warehouse Operations'),
  ('plecionkarz', 'Traditional Willow Basket Weaving'),
  ('pomagaj-dziecku-w-lekcjach', 'Supporting Your Child with Homework'),
  ('powroznik', 'Traditional Ropemaking'),
  ('rymarz', 'Harness Making and Leather Harness Assessment'),
  ('sap-ewm-magazyn', 'SAP EWM: Extended Warehouse Management'),
  ('sap-tm-transport', 'SAP Transportation Management: Transport Planning'),
  ('sitarz', 'Traditional Hand Sieve Making'),
  ('snycerz', 'Woodcarving: Ornament and Relief'),
  ('szewc-tradycja', 'Shoemaking and Footwear Repair Fundamentals'),
  ('tkacz-reczny', 'Traditional Hand Weaving'),
  ('transport-logistyka-praktycznie', 'Practical Transport Logistics and Delivery Planning'),
  ('windows-skroty', 'Windows Fundamentals: Files, Shortcuts and Safe Use'),
  ('woznica', 'Traditional Horse-Drawn Carriage Driving Theory'),
  ('zdun-tradycja', 'Traditional Tiled Stoves and Masonry Heating Fundamentals'),
  ('zecer', 'Traditional Hand Typesetting'),
  ('zegarmistrz-tradycja', 'Mechanical Watchmaking Fundamentals')
)
update public.ta_courses c set certificate_en=t.english_title,
  title_en=case when nullif(c.title_en,'') is null or c.title_en=c.title_pl then t.english_title else c.title_en end
from translated t where t.slug=c.slug and c.certificate_en is distinct from t.english_title;
