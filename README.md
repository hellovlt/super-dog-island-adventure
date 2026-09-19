# Super Dog Island Adventure 3D

An English-language third-person adventure inspired by a child's drawings: **5 worlds, 15 friends, 5 giant bosses, and 10 hidden secrets**. The game uses original Super Dog characters and procedural models, with free exploration inspired by Super Bear Adventure.

## Play online

**https://hellovlt.github.io/super-dog-island-adventure/** — the published game. Chrome, Edge, or Safari can install it
(address bar install icon, or Share → Add to Home Screen) and it then plays offline, with no terminal and no server.
Progress, drawings, and settings live in the browser that plays it, so each device keeps its own.

## Play locally

Run `npm start` from this folder, then open **http://localhost:5173/**. Node.js 18+ and WebGL 2 are required. Three.js is included in `vendor/`; no package installation or CDN access is needed to play. Google Fonts is optional and has system-font fallbacks.

This address works on this computer while the server runs. The classic 2D game is at **http://localhost:5173/classic/index.html** and has a separate save.

## Adventure

Rescue three friends in each world using three golden keys, then cross the bridge and face its giant boss. Dodge charges and bark during the rest phase. Defeating a boss unlocks the next world. Revisit unlocked worlds through the main menu.

| World | Boss |
| --- | --- |
| Sunny Island | Snake King |
| Mushroom Kingdom | Mushroom Giant |
| Crystal Winter | Frost Fang |
| Volcano Island | Fire Dragon |
| Sky Castle | Cloud Emperor |

There are 320 bones, 30 stars, and 10 optional secrets across the campaign. Press E near a floating secret to discover its story. Some award a cosmetic antenna, crown, or dancing walk. Discoveries appear in the Secret album.

Every world after Sunny Island has two landmarks of its own (mushroom tree and fairy ring, ice palace and crystal garden, volcano and obsidian arch, castle keep and rainbow arch), its own weather, and its own bone-trail shapes.

## Play with friends

**👣 Play with friends** in the main menu. One player chooses **Start a game** and reads out the five-letter code; up to seven others type it into **Join**. Everyone then explores the same island and sees each other's dogs, capes, hats and barks in real time.

Each player keeps their own bones, rescues and progress: this is playing side by side, not one shared save. Friends in a different world are listed but not drawn until you are in the same one.

The connection is made directly between the devices (WebRTC, through the MIT-licensed [Trystero](https://github.com/dmotz/trystero) in `vendor/trystero`), so there is no server and no account. Public relays are used only to introduce the devices to each other. Strict networks (some mobile and school connections) can block direct connections, and then joining fails.

Anyone who knows a code can join that island, so treat it like a password and share it only with friends. Names come from a fixed list, there is no chat, and a drawing is only sent to friends if **Show my drawing to friends** is switched on in the party screen.

## Cape glide

Beating the Snake King unlocks the cape glide: hold jump while falling to float across gaps. No route requires it.

## Guides and read aloud

A guide waits beside the first flag of every world (Grandma Tortoise, Professor Toad, Captain Penguin, Sal the Salamander, Wise Owl). Press E to hear hints. Rescued friends thank Super Dog in their own words. The speaker button in the speech bubble, or the button in How to play, reads dialogue and secret stories aloud with the browser's speech voice.

## Bone Rush

A glowing stone across from each guide starts Bone Rush: collect twelve golden bones in 42 seconds (55 on Easy, 34 on Hard). Each world uses a different shape. The first clear in a world pays 30 bones for the wardrobe and turns the trophy gold; best times are kept.

## Wardrobe

Bones from every world, plus Bone Rush rewards, buy capes, hats, and fur colors in **◆ Wardrobe** on the main menu. Super Dog turns on a turntable while you choose. The secret antenna and crown appear there once found.

## Draw your own

Open **✎ Draw on Super Dog's cape** in the main menu, or click the "Imagined by a child" card. Draw with eight crayons, three brush sizes, an eraser, and undo. **Use a photo** turns a picture of a paper drawing into a sticker: the paper becomes transparent and only the lines and colors stay. The drawing appears on Super Dog's cape and on the checkpoint flags; untick either place to hide it there. It is saved in this browser under `superdog-drawing-v1`, separately from campaign progress.

## Sound

Each world has its own looping tune, generated in the browser with Web Audio (no audio files). Sound is on by default and starts after the first click or key press; the ♫ button mutes it and the choice is remembered. Bones collected quickly in a row play a rising scale.

## Controls and difficulty

WASD/arrows move relative to the camera. Space twice performs a double jump and holding Space glides; X barks, Shift dashes, and E talks or interacts. Drag to orbit the camera, use Q/R to rotate, and the mouse wheel to zoom. Escape pauses. Touch controls appear on narrow screens; hold the jump button to glide.

Standard controllers work too: left stick or D-pad to move, A to jump (hold to glide), X bark, B dash, Y talk, right stick camera, LB/LT zoom, Start pause. In menus the D-pad moves between buttons, A presses, and B goes back. Controllers rumble on hits, heavy landings, rescues, and victories.

Easy has 7 hearts and no fall damage. Normal has 5 hearts; Hard has 3. Difficulty changes enemy speed, boss health, attack timing, and cooldowns, while preserving reachable jump distances. Change difficulty in the main menu without losing discoveries.

## Saves

Flags set checkpoints and restore health. Progress saves per world in this browser under `superdog-island-3d-v4`. Version 3 is read only for migration when no new save exists, so an old open tab cannot overwrite a newer campaign. On reload, Super Dog returns at the latest checkpoint. New adventure resets the campaign only after confirmation. The same save holds wardrobe purchases and Bone Rush best times; bones available to spend are always recomputed from bones collected, so a save cannot hold more than were earned. Sound (`superdog-sound`), read aloud (`superdog-read-aloud`), and the drawing are separate browser preferences.

## Files

- `world3d.js`: first-world coordinates and shared collider definitions.
- `campaign3d.js`: five worlds, routes, landmarks, guides, Bone Rush shapes, bosses, names, and secret stories.
- `collision3d.js`: movement, surfaces, camera obstacles, and line of sight.
- `adventure3d.js`: simulation, difficulty, collection, rescue, and progression.
- `drawing3d.js`: drawing studio, photo paper removal, and cape and flag stickers.
- `wardrobe3d.js`: wardrobe catalogue, prices, and purchase rules.
- `input3d.js`: gamepad mapping and rumble strengths.
- `multiplayer3d.js`: room codes, friend state packets, and the party roster.
- `settings3d.js`: saved settings and the camera-follow maths.
- `audio3d.js`: per-world music and sound effects synthesized with Web Audio.
- `game3d.js`: Three.js rendering, models, camera, sound, UI, and controls.
- `index.html`, `style3d.css`: 3D interface and responsive layout.
- `vendor/`: Three.js 0.180.0, its glTF loader, and Trystero, all MIT licensed.
- `game.js`, `engine.js`, `levels.js`, `style.css`, `classic/`: classic 2D game.

## Verification

Run `npm test`. Tests cover complete playthroughs on all three difficulties, physics, collision, camera obstruction, saves, level progression, secrets, safe spawn points, lava, the cape glide, Bone Rush won with real inputs in every world, landmark and trail placement, guides, wardrobe economy, gamepad mapping, sound coverage, classic 2D gameplay, and English-only interface copy. Simulation rates are not device frame-rate measurements.

Generate isolated browser scenes with `node tests/make-3d-fixture.mjs`, then open `/tests/.visual/3d/index.html?level=1&scene=secret`. Its controls feed normal frame inputs and use separate QA storage. Regenerate fixtures after changing the game.

[Player guide](docs/Super-Dog-3D-Guide.md) | [Word guide](docs/Super%20Dog%20Adventure%20Guide.docx) | [Campaign test report](docs/4.0-Playtest-Report.md)
