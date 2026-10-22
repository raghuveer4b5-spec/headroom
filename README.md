# Headroom

**Your running plan, built around your gym days and adjusted to your recovery every morning.**

You don't need a coaching-app subscription or a premium watch to train smart. Your watch already records the data that matters. Headroom turns it into a weekly plan for running and strength training, then tells you each morning how hard to go. It runs on your own Claude, with your own Garmin account. No app to install, no account to create, no extra subscription.

<table>
  <tr>
    <td align="center" valign="top" width="33%">
      <img src="docs/setup-preview.png" width="250" alt="Setup: goal, current and goal 5K time, runs per week, long-run day, gym days, and when to get the morning check">
      <br><sub><b>1. Set up</b><br>Two minutes, mostly pre-filled</sub>
    </td>
    <td align="center" valign="top" width="33%">
      <img src="docs/weekly-preview.png" width="250" alt="Sunday plan email: each day's session with distance and target pace, around three gym days">
      <br><sub><b>2. Get your week</b><br>Every Sunday</sub>
    </td>
    <td align="center" valign="top" width="33%">
      <img src="docs/email-preview.png" width="250" alt="Morning email: readiness 64 out of 100, today's adjusted session, and what shaped the score">
      <br><sub><b>3. Check in</b><br>Every morning</sub>
    </td>
  </tr>
</table>
<p align="center"><sub>Shown with sample data.</sub></p>

## Train hard on the right days

Most running injuries come from doing too much, too soon. Headroom is built to prevent that.

- **A plan that builds gradually.** About 10% more each week, with a lighter week every fourth.
- **Runs that respect your gym days.** Hard sessions stay off the day after strength training.
- **Paces that fit you.** Every session has a target pace from your current race time.
- **A daily readiness check.** HRV, sleep, resting heart rate and training load decide whether today stays hard, eases off or becomes a rest day.

Grounded in research on training load, HRV and injury. [See how it works](docs/how-it-works.md).

## How it works

1. **Set up once.** Tell Headroom your goal, current time, run days and gym days. It pre-fills what it can from your Garmin history.
2. **Get your week on Sunday.** Every session, with distance, target pace and heart-rate limit, planned around your strength training.
3. **Check in every morning.** A 0-100 readiness score adjusts today's session. Your gym sessions stay yours: Headroom only needs to know which days you train.

Already have Garmin Training Readiness on your watch? Headroom uses it.

## New to running? Start from zero

Can't run 2K yet? Beginner mode takes you from short run/walk intervals to 30 minutes non-stop, about a 5K for most new runners.

- **14 small stages.** Your longest run never grows more than 50% in one step. No sudden jumps.
- **You move up when you're ready, not when the calendar says.** Each Sunday, Headroom looks at your runs and recovery and moves you up a stage or repeats it. Repeating is normal.
- **Gentler after an injury.** A recent injury means a lower starting point and more caution about moving up.
- **Strength work built in.** Two short bodyweight sessions a week, the best-supported way to prevent running injuries.

Set up once, and Headroom picks your starting stage from how long you can run today.

<p align="center">
  <img src="docs/beginner-preview.png" width="280" alt="Beginner plan email: stage 6 of 14, run 5 minutes and walk 1.5 minutes, three sessions around three gym days">
  <br><sub>A beginner's Sunday plan, shown with sample data.</sub>
</p>


## Get started

You'll need Claude (the desktop app or Claude Code) with Claude in Chrome and Gmail connected, and a Garmin watch.

```bash
claude plugin marketplace add raghuveer4b5-spec/headroom
claude plugin install headroom@headroom
```

Then ask Claude: **"Set up Headroom."**

The morning check runs on your computer, so pick a time it's usually on. The first scheduled run may ask for permission; click **Run now** once to approve it.

## Privacy

There's no Headroom server. Your Garmin data goes from Garmin to your browser to your own Claude session, emails go only to the address you choose, and your settings and history stay in `~/.headroom/` on your computer.

---

<sub>Headroom gives training guidance, not medical advice. If something hurts, see a physio. Learn more: [how it works, the science, and known limits](docs/how-it-works.md).</sub>
