# Calibration shots (Phase 4)

About 10 in-game checks (~15 min). For each, note the shot count, and whether the part broke. Model predictions are from `web/src/damage.ts` (labelled "estimate" until these pass).

| # | Setup | Check | Model predicts |
|---|-------|-------|----------------|
| 1 | Anvil vs Rocketeer, a thruster armour plate (Medium) | Shots to break plate | 1 |
| 2 | Anvil vs Rocketeer, same thruster after plate gone | Shots to break the thruster | 9 |
| 3 | Anvil vs Rocketeer thruster with plates still on | Does shot count rise vs #2? (propagation) | 9 |
| 4 | Anvil vs Rocketeer, weak point `Core_01` | Shots to kill (crit multiplier) | see viewer |
| 5 | Anvil vs Rocketeer, body hit only, no weak point | Shots to kill via frame | see viewer |
| 6 | One HE grenade on a Wasp | Kills / how much of its HP | see viewer |
| 7 | HE grenade on a Rocketeer thruster, plate on vs off | Does armour reduce explosive damage? | same |
| 8 | A low-armour-mult gun (0.1-0.2) on a Heavy plate | Shots to break plate | see viewer |
| 9 | Ferro on a Bastion leg plate | Shots to break | see viewer |
| 10 | Same shot at 5 m vs 40 m | Does range falloff change counts? | not modelled |

Open URL e.g. `?arc=HeavyDroneMissile&weapon=HandCannon_SingleAction_01&sel=Core_01` to read the prediction.
