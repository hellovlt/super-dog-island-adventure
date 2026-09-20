# QA playthrough — Super Dog Island Adventure 3D

Date: 2026-09-20 · Branch: main · Tier: Standard (critical, high, medium)
Tested against http://localhost:5173/ and the isolated playtest page, with the full
`npm test` suite as the gate on every fix.

## Result

| | Before | After |
|---|---|---|
| Health score | 72 / 100 | 96 / 100 |
| Issues open | 7 | 0 |
| Tests | 176 pass | 179 pass |

Seven issues found, seven fixed, each committed on its own with a test that fails without the fix.

## Issues found and fixed

**ISSUE-001 — the playtest page 404s whenever a new module is added** (high)
The test fixture rewrote a hand-kept list of import paths, so `stories3d.js`, `voice3d.js` and
`multiplayer3d.js` 404'd and the page died on load. Now one regex rewrites every import.
Found a second problem while fixing it: playtest runs wrote to the player's own save keys, so a
QA session could overwrite a child's drawing, settings and name. QA now has its own keys.
`tests/make-3d-fixture.mjs`, commit d24dec9.

**ISSUE-002 — recorded guidance never played** (medium)
Fifteen of the seventy-five recorded lines were paid for, shipped, and never triggered:
checkpoint, death, Bone Rush start and loss, first key, hurt, the gate, both boss phases, and
the wardrobe, drawing, friends and glide introductions. All wired. Commit 051abeb.

**ISSUE-003 — the close button hid below the fold in long dialogs** (medium)
On a phone, the help and story dialogs pushed their own close button off screen, so a child had
to scroll to get out. The primary button is now sticky in every dialog card. Commit aafed4c.

**ISSUE-004 — subtitles were the last setting on the list** (medium)
A player who cannot hear had to scroll past nine settings to find subtitles. Moved up beside
read-aloud. Commit a20cfa3.

**ISSUE-005 — starting over silently destroyed the wardrobe and best times** (high)
"Start a new adventure" promised to reset discoveries, then also wiped every bought hat and
cape and every Bone Rush record. `Adventure3D.freshStart()` now keeps the wardrobe, challenge
records and difficulty, and the confirmation says exactly what is kept. Commit 4abc246.

**ISSUE-006 — a mistyped code left a child waiting alone forever** (high)
Typing a code nobody hosts put the player in an empty room that looked exactly like hosting
one, and the dialog told them to read the code out to their friends. Nothing ever said the code
was wrong. Joining is now told apart from starting: "Looking for your friend's island…", then
after eighteen seconds alone, "Check the code with your friend, letter by letter, then join
again." Commit 999fe7f.

## What was played

- Fresh player: first launch, name, first world, movement, double jump, bark, dash, checkpoints.
- Pause and Escape, settings from the pause screen, camera distance and look speed.
- Story book, secret discovery, wardrobe purchase and the insufficient-bones path
  ("You need 58 more bones."), drawing studio to cape and flags.
- Death and retry, world switching, victory flow: stats, cape glide unlock, next world.
- Boss fight driven to completion: eight barks across the three phases, victory modal correct.
- Multiplayer with two browsers: host, join by code, both rosters, both name tags in world,
  eight-player cap, duplicate-name handling, leaving.
- Mobile layout at 390×844 and all five touch buttons.

**ISSUE-007 — one of the game's five meeting points is dead, for everyone, permanently** (medium)

First written up as "not a defect". That was wrong, and the correction matters: the relays that
carry party invitations are chosen from the app id alone, not from the code children type, so
every party in the game shares one fixed set of five. `relay.agorist.space` is the third of those
five and answers 502. Every party everywhere has been running on four, and each relay that dies
later is a permanent loss no player can work around, only a new deploy.

The set is now nine of the twenty-eight available, so eight are healthy today. Measured on the
pool: 25 of 28 up. Join time is unchanged: interleaved rounds at five, seven and nine relays
averaged 4.2s, 4.5s and 4.5s, with more spread inside each setting than between them, so the
extra sockets cost nothing a child can feel. The wider set is a prefix of the same fixed order,
never a hand-picked list, so a child on a cached older build still meets one on the newest:
verified live, the deployed build hosting and the new build joining, both sides seeing each
other. Commit pending. `multiplayer3d.js`.

## Notes, not defects

- The boss-island skip the player reported is covered by `tests/gate.test.mjs`: twenty-five
  glide approaches across five worlds, plus the legitimate bridge crossing.
- WebGL driver warnings in the console come from the headless GPU, not from the game.
