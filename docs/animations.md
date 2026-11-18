# Animation specification

This document describes the animations of the engine events.
The exact values are in [`assets/animations/animations.json`](../assets/animations/animations.json).
The client reads that file and builds a GSAP timeline for each event.

## 1. Principles

Motion uses 3 layers.

| Layer | Rate | Content |
|---|---|---|
| Frames | 180 ms per frame | Idle Keepers, Beacons, Tide buoy |
| Transforms | 60 frames per second | Position, scale, rotation with easing curves |
| Effects | 60 frames per second | Particles, light, camera shake, shaders |

Definitions:

- **Anticipation**: a small opposite movement before the action. The player understands what is about to happen.
- **Hit stop**: a short pause of the whole game at the moment of the hit. The hit feels stronger.
- **Squash and stretch**: compression and extension. The sprite changes `scaleX` and `scaleY`, but its area stays almost the same.
- **Dithered dissolve**: pixels disappear in the order of a 4 × 4 Bayer matrix. Do not use partial transparency.

Common rules:

- Put the pivot of a Keeper at its feet, in the center. The squash presses the sprite toward the ground.
- Round the position of each still sprite to a whole pixel.
- During hit stop, stop the global timeline. Do not stop the particles of the hit.
- Use squash and stretch values between 0.75 and 1.25.
- Limit the camera shake to 3 pixels.
- `dir` is +1 for an action toward the right and −1 for an action toward the left.

## 2. Event table

| Event | Duration | Blocks input | Techniques |
|---|---|---|---|
| `CardPlayed` | 420 ms | Yes | Anticipation, squash and stretch |
| `KeeperSummoned` | 460 ms | Yes | Squash and stretch, ripple |
| `KeeperDamaged` | 380 ms (+260 ms of attack) | No | Anticipation, hit stop, squash and stretch |
| `KeeperDied` | 520 ms | Yes | Squash, dithered dissolve |
| `BeaconDamaged` | 420 ms | No | Hit stop, shake |
| `BeaconOut` | 1100 ms | Yes | Hit stop, dithered dissolve, light |
| `TideShifted` | 600 ms | No | Anticipation, waves |

## 3. Events

### 3.1 `CardPlayed`

1. Lift the card by 6 pixels and stretch it (0.92 × 1.08) in 90 ms. This is the anticipation.
2. Move the card above the target cell in 200 ms (`power3.out`).
3. Squash the card (1.12 × 0.90) in 60 ms.
4. Return the scale to 1 in 70 ms (`back.out(2)`).
5. Create 6 `fx/spark` sparks in the faction color.
6. Dissolve a Rite with the dithering shader in 220 ms.

A Keeper, a Relic or a Site continues with its own event.

### 3.2 `KeeperSummoned`

1. Put the Keeper 20 pixels above the slot, stretched (0.80 × 1.25).
2. Drop the Keeper in 160 ms (`power2.in`).
3. Squash the Keeper (1.25 × 0.75) in 70 ms when it lands.
4. Create 2 `fx/puff` puffs at the sides of the feet.
5. Start a ripple ring under the slot (300 ms).
6. Return the scale to 1 in 230 ms (`elastic.out(1, 0.5)`).
7. Start the idle animation.

### 3.3 `KeeperDamaged`

If the event has a `source`, animate the attacker first:

1. Pull the attacker back by 2 pixels in 120 ms. This is the anticipation.
2. Throw the attacker forward by 12 pixels in 90 ms (`power4.in`), stretched (1.15 × 0.90).
3. Return the attacker to its slot in 220 ms after the hit.

Then animate the target at the moment of the hit:

1. Show `fx/hit` on the target.
2. Tint the target white for 60 ms.
3. Apply hit stop: 0 ms for 1–2 damage, 60 ms for 3 or more damage, 80 ms for a lethal hit.
4. Push the target back by 3 pixels and squash it (0.85 × 1.12) in 60 ms.
5. Return the target to its slot in 240 ms (`elastic.out(1, 0.4)`).
6. Show the damage number. The number rises by 14 pixels and fades out in 600 ms.
7. Shake the camera by 1 pixel for 3 or more damage, by 2 pixels for a lethal hit.

### 3.4 `KeeperDied`

1. Stop the idle animation.
2. Squash the Keeper (1.20 × 0.80) in 80 ms.
3. Dissolve the Keeper with the dithering shader in 440 ms, from top to bottom.
4. Lower the Keeper by 3 pixels during the dissolve.
5. Create 3 puffs and 5 sparks in the faction color.
6. Remove the sprite.

If `EchoReturned` follows, a light copy flies to the hand in 300 ms.

### 3.5 `BeaconDamaged`

1. Show `fx/hit` on the Beacon lamp.
2. Tint the Beacon white for 60 ms.
3. Apply hit stop: 40 ms for 1–2 damage, 80 ms for 3 or more damage.
4. Shake the Beacon horizontally by 2 pixels for 300 ms, with decreasing amplitude.
5. Shake the camera by 1 or 2 pixels for 160 ms.
6. Switch to the `damaged` state when Light drops to 5 or less.
7. Reduce the light radius by 20% for 80 ms, then restore it.
8. Show the damage number in the `glow` color.

### 3.6 `BeaconOut`

1. Apply a hit stop of 80 ms.
2. Shake the camera by 3 pixels for 260 ms.
3. Increase the light (radius × 1.6) in 120 ms. This is the last flash.
4. Turn off the light in 500 ms (`power2.in`).
5. Switch from the lit sprite to the `out` sprite with a dithered dissolve of 500 ms.
6. Create 10 falling sparks.
7. Start the `beacon/out` animation (smoke).
8. Darken the lane on that side by 35% in 400 ms.

### 3.7 `TideShifted`

1. Move the buoy by 2 pixels in the opposite direction in 80 ms. This is the anticipation.
2. Move the buoy to the new cell in 360 ms (`back.out(1.6)`). Each Tide step is 12 pixels.
3. Increase the amplitude of the wave shader from 1 to 2.5, then return it to 1, in 520 ms.
4. Raise the water line on the side that the Tide favors.
5. Create 2 puffs on the buoy when the Tide crosses the ±2 threshold.

## 4. Shaders

| Shader | Parameters | Use |
|---|---|---|
| `ditherDissolve` | `threshold` from 0 to 1 | Death of a Keeper, Rite played |
| `ditherCrossfade` | `threshold`, target texture | Beacon going out |
| `outline` | color, 1 pixel | Selected card, valid targets |
| `waves` | `amplitude`, `offsetX` | Sea, Tide track |
| `ripple` | radius, duration | Keeper entry |

The dissolve compares `threshold` with the 4 × 4 Bayer matrix.
Add the vertical coordinate of the sprite (from 0 to 0.5) to `threshold`. So the top pixels disappear first.

## 5. Reduced animations

ATTENTION: the "Reduce animations" option is an accessibility requirement.

When the option is on:

- Halve the duration of each timeline.
- Turn off camera shake and hit stop.
- Turn off squash and stretch.
- Create only 30% of the particles.
- Keep the dithered dissolve and the damage numbers.
