# ManagerZone Tactical Analysis

A bilingual userscript for ManagerZone football matches. It adds a Tactical Analysis button to match pages and helps users review match events and generate formation XML.

## Features

- **Bilingual interface:** switch between Spanish and English.
- **Home and away analysis:** view each team's report in a separate tab.
- **Goal timeline:** review available goal times, scoring teams, players and score changes.
- **Tactical changes:** inspect changes to tactics, playing style and aggression, including the recorded current settings.
- **Substitutions:** review incoming and outgoing players and available timing information.
- **Formation XML:** generate XML formation files for both teams and copy the XML to the clipboard.
- **Match diagnostics:** display information about the available match data and detected events.
- **Clone another team's tactics using formations already saved in your own account**.
## Here's how it works:
1. Choose one of your own formations to use as the base for cloning an opponent's tactic.
2. Select the opponent's tactic you want to copy.
3. Choose where to apply the changes: Initial, Alternative 1 or Alternative 2.
4. The script generates the corresponding XML, ready to copy and paste into the selected tactic.

This means you can modify one specific variant without affecting the others. For example, you can clone a tactic into Alternative 1 of one of your formations while leaving both Initial and Alternative 2 unchanged.
The **"Generic Copy"** option is also still available. It works as before, copying the tactic across all three variants: Initial, Alternative 1 and Alternative 2.

## What happens to tactical settings and rules?
- When cloning into Initial, the opponent's tactical settings, playing style and aggression are copied as well.
- When cloning into Alternative 1 or Alternative 2, the formation is changed, but your existing tactical settings, playing style and aggression are preserved.
- Tactical rules are always preserved, regardless of which variant you choose as the destination. This includes configured conditions and player substitutions, so you don't need to set up your rules again manually.

In short, you can choose one of your own formations, use another team's tactic as a reference, and decide exactly where to apply it. Your existing settings are preserved where intended, and your other variants remain unchanged unless you choose the Generic Copy option.

The information displayed depends on the data made available by ManagerZone for each match. Results may be incomplete when match data or event information is unavailable.

## Requirements

- A compatible desktop browser, such as Google Chrome.
- The Tampermonkey browser extension.
- Access to ManagerZone.

## Installation

1. Install Tampermonkey from the [official website](https://www.tampermonkey.net/).
2. Open the [userscript installation link](https://raw.githubusercontent.com/gastonandriolo/managerzone-tactical-analysis/main/managerzone-tactical-analysis.user.js).
3. Review the script in Tampermonkey and click **Install**.
4. Open a football match page on [ManagerZone](https://www.managerzone.com/).
5. Locate the **TA** button next to the 3D control and click it.
6. Wait for the analysis to finish. Use the Home/Away tabs and the ES/EN language buttons to navigate the results.

If match data is unavailable, open the match in 2D mode, wait for it to load completely, and try again.

## Updating

Tampermonkey can check for updates using the update URL defined in the userscript metadata. You can also revisit the installation link to access the published script.

## Troubleshooting

- Make sure Tampermonkey is enabled.
- Check that the userscript is enabled in Tampermonkey's dashboard.
- Reload the ManagerZone match page after installing or updating.
- Make sure the match data has loaded before running the analysis.
- If the problem persists, report it through [GitHub Issues](https://github.com/gastonandriolo/managerzone-tactical-analysis/issues).

## Privacy and permissions

The script runs on ManagerZone pages matching its userscript metadata. It requests match data from ManagerZone using the current browser session and reads available training-page data to build the formation XML.

The script declares no additional userscript grants (`@grant none`). Review the source code before installing and only use versions from a source you trust.

## Disclaimer

This is an independent community project. It is not an official ManagerZone product and is not affiliated with or endorsed by ManagerZone.

## Feedback and contributions

Bug reports and feature suggestions are welcome through [GitHub Issues](https://github.com/gastonandriolo/managerzone-tactical-analysis/issues).
