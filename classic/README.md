# Super Dog Adventure - Classic 2D

An English-language platformer inspired by a child's drawings. Explore six worlds: Forest Trail, Snake Town, Crystal Caves, Cloud Islands, Fire Valley, and Snake King Castle.

The campaign contains 408 bones including chest rewards, 18 secret stars, five caged friends, and two bosses. Double jump, dash, and bark to explore moving platforms, springs, shields, magnets, and power-ups.

## Play

Run `npm start` from the project root and open http://localhost:5173/classic/index.html. Node.js 18+ is required. The server is local to this computer. No dependency installation is needed.

## Controls

- Run: Left/Right or A/D.
- Jump: Space, Up, or W. Hold for a higher jump; press again in midair to double jump.
- Dash: Shift or C.
- Super bark: X or F.
- Pause: Escape or P.

Use the on-screen buttons on a touchscreen. Bark opens chests and cages. Jumping onto enemies or dashing through them also helps. Flags restore one heart and set a checkpoint. Heart pickups restore two hearts. A shield blocks one hit for up to 20 seconds, a magnet attracts bones for 16 seconds, and a bark boost lasts 14 seconds.

## Progress and tests

Progress saves in this browser independently of the 3D campaign. Continue resumes at the last flag, keeping bones, stars, rescued friends, chests, and unlocked worlds. An unfinished boss fight restarts. Use the map below the game to revisit unlocked worlds. New game restarts the campaign; the best score is stored separately.

Run `npm test` from the project root. Classic tests cover physics, platforms, power-ups, cages, chests, saves, bosses, and complete playthroughs. To generate isolated browser scenes, run `node tests/make-visual-fixture.mjs`; QA uses separate save keys.
