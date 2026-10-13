# Landing page asset manifest

All photographs and the logo are downloaded from the **official AKGEC website**
(akgec.ac.in) and stored locally for reliable delivery. They depict the real
campus; captions in the UI describe only what the source pages state or what
the photo visibly shows.

| File | Source URL | Depicts |
| --- | --- | --- |
| `akgec-logo.png` | https://www.akgec.ac.in/wp-content/themes/twentysixteen/img/AKGEC_1_0.png | Official AKGEC logo (transparent PNG, gear + flower mark). Institutional yellow sampled from it: `#FFF500`. |
| `campus-garden.jpg` | https://www.akgec.ac.in/wp-content/uploads/2019/06/Girl.jpg | Campus building and gardens (from the official hostel visual tour). |
| `boys-hostel-exterior.jpg` | https://www.akgec.ac.in/wp-content/uploads/2019/06/boy.jpg | Boys' hostel building exterior, red brick. |
| `girls-hostel-exterior.jpg` | https://www.akgec.ac.in/wp-content/uploads/2019/06/Girl_1.jpg | Girls' hostel buildings across a lawn. |
| `common-room-reading.jpg` | https://www.akgec.ac.in/wp-content/uploads/2019/06/Girl_3.jpg | Students reading in a hostel common room. |
| `common-room-tabletennis.jpg` | https://www.akgec.ac.in/wp-content/uploads/2019/06/boy_5.jpg | Table tennis in a boys' hostel common room. |
| `student-mess.jpg` | https://www.akgec.ac.in/wp-content/uploads/2019/06/Girl_2.jpg | Students in the hostel mess. |

Source pages:
- Hostel facilities: https://www.akgec.ac.in/hostel/
- Hostel visual tour: https://www.akgec.ac.in/about/infrastructure-visual-tour/hostel/

**Rights note:** these are institutional photographs from the college's own
public website, used here to represent the college's own portal. If the
college asks for removal or different licensing, replace the files in this
directory (filenames are referenced from `src/pages/HomePage.tsx`).

The images are small (~460px wide originals from the tour page). The UI
applies a saturate/contrast treatment plus a subtle grain overlay to keep
them presentable at larger sizes; replace with higher-resolution official
photography if the college provides it.
