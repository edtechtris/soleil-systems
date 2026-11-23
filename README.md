# Starting with Soleil

**One homeowner. One year. Every team.**

A learning game prototype for frontline onboarding at a residential solar asset management company. The player follows one homeowner, Dana Reyes, through a year of real-world problems and sits in each frontline seat as her case reaches it: Customer Care, Dispatch & Scheduling, Field Service, Billing & Collections and Account Services.

> **Soleil Systems is a fictional company.** Policies, fees and timelines in the game are assumptions based on general industry practice, not any real company's process.

This game is designed as **one piece of a larger onboarding**, not the whole program.

## Play

Open `index.html` through any web server (for example GitHub Pages). It's plain HTML, CSS and JavaScript with no build step.

To run locally:

```
python3 -m http.server
```

Then open http://localhost:8000.

## How it plays

- **Arrive:** each step opens with one thing to start with: a ringing phone, a ticket, an alert or an email.
- **Investigate:** opening it brings in the clues. Some are key; some are extra evidence.
- **Decide:** actions appear only from the clues you open. There's time for only a few, and the right ones are never in a fixed spot.
- **Pass it on:** your choices become the next team's starting point.
- **Season replay:** shows how the case traveled and what each choice caused, including what was missed.

Help fades across the year: spring has first-time prompts, teammate tips and Dana's instant reactions. Summer offers a tip only if you're stuck. Fall and winter have no help, more to check and more to choose.

## What it tracks

Every decision is logged as an xAPI statement and scored as **caught** (right, after checking the clue), **guessed** (right, without checking), **missed**, or for traps, **avoided** / **fell for**. Clues opened, action order and position, time per step, and Dana's mood and days waiting are logged too.

- Data saves on the player's device. Players can download their own choices at the end.
- `report.html` turns the data into a skill-gap report and a CSV.
- To send statements to a Learning Record Store, fill in `js/config.js`. Use a write-only key, since anything in that file is public.
- Add `?cohort=name` to the link to tag a group.

The data-capture approach was inspired by a colleague's prototype, *Brightwater Inspections*.

## Files

| Path | What |
|---|---|
| `index.html` | The game |
| `report.html` | Results report |
| `js/content.js` | All story content: steps, clues, actions, consequences |
| `js/game.js` | Game engine |
| `js/tracker.js` | xAPI tracking |
| `js/config.js` | Version, activity IDs, optional LRS |
| `css/style.css` | Look and layout |
| `assets/art/` | House scenes, characters, clue images |
| `assets/icons/` | Game icons |
| `assets/audio/` | Dana's voice clips and sound effects |
| `assets/ui/` | Logo mark, stained-glass corners, landscape |

## Credits

- Game design, art direction and assets: Tristia Hennessey.
- Dana's voice: produced by Tristia Hennessey in Articulate Storyline.
- Build: Tristia Hennessey with Claude.
- Sound effects: original, generated in code.
- Inspired by work with utilities including Sempra, PG&E and CenterPoint.

Version 0.2.
