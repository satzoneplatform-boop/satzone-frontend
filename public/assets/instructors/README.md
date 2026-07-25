# Instructor photos

`instructor.jpg` is the single instructor photo used everywhere (auth marketing
panel + landing instructor section), served at `/assets/instructors/instructor.jpg`.
Use a 4:5 portrait around 1280×1600 — both surfaces crop it with object-cover.

If the file is missing, an initials fallback renders automatically
(see `src/components/auth/marketing/config.ts` → `instructor.photoUrl`).
