// ==UserScript==
// @name         ManagerZone - Tactical Analysis
// @namespace    https://github.com/gastonandriolo/managerzone-tactical-analysis
// @version      1.2.1
// @description  A ManagerZone userscript for match analysis, tactical changes, goals, substitutions and formation XML generation.
// @homepageURL  https://github.com/gastonandriolo/managerzone-tactical-analysis
// @supportURL   https://github.com/gastonandriolo/managerzone-tactical-analysis/issues
// @downloadURL  https://raw.githubusercontent.com/gastonandriolo/managerzone-tactical-analysis/main/managerzone-tactical-analysis.user.js
// @updateURL    https://raw.githubusercontent.com/gastonandriolo/managerzone-tactical-analysis/main/managerzone-tactical-analysis.user.js
// @match        https://www.managerzone.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const BUTTON_ID = 'mz-ta-launch';
    const PANEL_ID = 'mz-ta-panel';
    const STYLE_ID = 'mz-ta-styles';

    let busy = false;
    let observer = null;
    let currentLang = 'es';

    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    function getMatchId() {
        try {
            const params = new URLSearchParams(location.search);
            const mid = params.get('mid');
            if (mid && /^\d+$/.test(mid)) return mid;
        } catch (_) {}

        const match = location.href.match(/[?&]mid=(\d+)/);
        return match ? match[1] : '';
    }

    async function waitForMatchId(timeout = 60000) {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const mid = getMatchId();
            if (mid) return mid;
            await sleep(500);
        }

        return '';
    }

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;

        style.textContent = `
          #${BUTTON_ID} {
            cursor: pointer !important;
            border: 1px solid #174a85 !important;
            border-radius: 4px !important;
            background: #2878c8 !important;
            color: #fff !important;
            font-weight: 700 !important;
            padding: 4px 8px !important;
            margin: 3px !important;
            box-shadow: 0 1px 2px #0003 !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
          }

          #${BUTTON_ID}:disabled {
            opacity: .65;
            cursor: wait !important;
          }

          #${PANEL_ID} {
            position: fixed;
            inset: 4vh 4vw;
            z-index: 2147483647;
            background: #f6f7f9;
            color: #18202a;
            border: 1px solid #8b929b;
            border-radius: 10px;
            box-shadow: 0 12px 50px #0008;
            display: flex;
            flex-direction: column;
            font: 14px/1.4 Arial, sans-serif;
            overflow: hidden;
          }

          #${PANEL_ID} * {
            box-sizing: border-box;
          }

          #${PANEL_ID} .mz-ta-head {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: #252c34;
            color: white;
          }

          #${PANEL_ID} .mz-ta-head strong {
            font-size: 18px;
            flex: 1;
          }

          #${PANEL_ID} .mz-ta-close {
            font-size: 20px;
            border: 0;
            border-radius: 5px;
            padding: 4px 12px;
            cursor: pointer;
          }

          #${PANEL_ID} .mz-ta-tabs {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 10px 12px;
            background: #e1e5e9;
            border-bottom: 1px solid #c4cbd2;
            width: 100%;
          }

          #${PANEL_ID} .mz-ta-spacer {
            flex: 1;
          }

          #${PANEL_ID} .mz-ta-lang {
            padding: 7px 10px;
            border: 1px solid #9aa3ac;
            border-radius: 5px;
            cursor: pointer;
            background: #f5f6f7;
            font-weight: 700;
          }

          #${PANEL_ID} .mz-ta-lang[aria-pressed="true"] {
            background: #2878c8;
            border-color: #174a85;
            color: #fff;
          }

          #${PANEL_ID} .mz-ta-tab {
            padding: 8px 16px;
            border: 1px solid #b6bec6;
            border-radius: 6px 6px 0 0;
            cursor: pointer;
            background: #f5f6f7;
          }

          #${PANEL_ID} .mz-ta-tab[aria-selected="true"] {
            background: #fff;
            font-weight: bold;
            border-bottom-color: #fff;
          }

          #${PANEL_ID} .mz-ta-content {
            padding: 14px;
            overflow: auto;
            flex: 1;
            background: #fff;
          }

          #${PANEL_ID} pre {
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            font: 13px/1.5 Consolas, monospace;
            background: #f4f6f8;
            padding: 12px;
            border: 1px solid #dce1e5;
            border-radius: 6px;
          }

          #${PANEL_ID} textarea {
            width: 100%;
            min-height: 190px;
            resize: vertical;
            font: 12px/1.4 Consolas, monospace;
          }

          #${PANEL_ID} .mz-ta-copy {
            padding: 8px 12px;
            margin: 4px 6px 8px 0;
            cursor: pointer;
            border: 1px solid #9aa3ac;
            border-radius: 5px;
            background: #edf0f3;
          }

          #${PANEL_ID} .mz-ta-error {
            color: #a21d1d;
            font-weight: bold;
          }

          @media(max-width:700px) {
            #${PANEL_ID} { inset: 1vh 1vw; }
            #${PANEL_ID} .mz-ta-tabs { flex-wrap: wrap; }
          }
        `;

        document.head.appendChild(style);
    }


    function translateText(value, lang = currentLang) {
        if (!value) return value;

        let text = String(value);

        const replacementsEN = [
            [/No se encontraron cambios ni goles en el XML\./g, 'No changes or goals were found in the XML.'],
            [/No se encontraron cambios ni goles en el XML/g, 'No changes or goals were found in the XML'],
            [/No se encontraron eventos de gol en el XML\./g, 'No goal events were found in the XML.'],
            [/No se encontraron cambios durante el partido\./g, 'No changes were found during the match.'],
            [/No disponible en el XML/g, 'Not available in the XML'],
            [/No identificado/g, 'Unidentified'],
            [/Equipo desconocido/g, 'Unknown team'],
            [/Preparando análisis…/g, 'Preparing analysis…'],
            [/Buscando los XML del partido…/g, 'Looking for match XML files…'],
            [/Esperando los datos del partido\.\.\. Reintento (\d+) de (\d+)/g, 'Waiting for match data… Retry $1 of $2'],
            [/Esperando partido…/g, 'Waiting for match…'],
            [/Analizando…/g, 'Analysing…'],
            [/DATOS DEL PARTIDO NO DISPONIBLES/g, 'MATCH DATA NOT AVAILABLE'],
            [/Cómo solucionarlo:/g, 'How to fix it:'],
            [/Abre el modo 2D del partido\./g, 'Open the match in 2D mode.'],
            [/Espera a que cargue completamente\./g, 'Wait until it has fully loaded.'],
            [/Vuelve aquí y pulsa AT para intentarlo de nuevo\./g, 'Return here and click AT to try again.'],
            [/No se pudo detectar el ID del partido después de (\d+) segundos\. Recarga el partido e inténtalo nuevamente\./g, 'Could not detect the match ID after $1 seconds. Reload the match and try again.'],
            [/Se encontraron (\d+) equipos; se esperaban dos\./g, 'Found $1 teams; expected two.'],
            [/Error desconocido durante el análisis\./g, 'Unknown error during analysis.'],
            [/Error durante el análisis\./g, 'Analysis error.'],
            [/XML de formación/g, 'Formation XML'],
            [/Copiar XML/g, 'Copy XML'],
            [/Copiado/g, 'Copied'],
            [/Inicial -> Táctica:/g, 'Initial -> Passing:'],
            [/Estilo:/g, 'Mentality:'],
            [/Agresividad:/g, 'Pressing:'],
            [/Vigente:/g, '𝗖𝘂𝗿𝗿𝗲𝗻𝘁 𝘀𝗲𝘁𝘁𝗶𝗻𝗴𝘀:'],
            [/Minuto programado:/g, 'Scheduled minute:'],
            [/Tiempo:/g, 'Time:'],
            [/Equipo:/g, 'Team:'],
            [/Jugador:/g, 'Player:'],
            [/Marcador:/g, 'Score:'],
            [/Entra /g, 'In: '],
            [/ \/ sale /g, ' / out: '],
            [/LOCAL/g, 'HOME'],
            [/VISITANTE/g, 'AWAY'],
            [/equipo /g, 'team '],
            [/--- GOL ---/g, '--- 𝗚𝗢𝗔𝗟 ---'],
            [/--- Cambio (\d+): Táctica ---/g, '--- 𝗖𝗵𝗮𝗻𝗴𝗲 $1: 𝗧𝗮𝗰𝘁𝗶𝗰 ---'],
            [/--- Cambio (\d+): Sustitución ---/g, '--- 𝗖𝗵𝗮𝗻𝗴𝗲 $1: 𝗦𝘂𝗯𝘀𝘁𝗶𝘁𝘂𝘁𝗶𝗼𝗻 ---'],
            [/--- Cambio (\d+) ---/g, '--- 𝗖𝗵𝗮𝗻𝗴𝗲 $1 ---'],
            [/Táctica/g, 'Tactic'],
            [/Sustitución/g, 'Substitution'],
            [/Partido:/g, 'Match:'],
            [/Fuente de eventos:/g, 'Event source:'],
            [/Equipos encontrados:/g, 'Teams found:'],
            [/Eventos Tactic:/g, 'Tactic events:'],
            [/Eventos Substitution:/g, 'Substitution events:'],
            [/Goles encontrados:/g, 'Goals found:'],
            [/Etiquetas en Events:/g, 'Tags in Events:'],
            [/Jugadores propios encontrados:/g, 'Own players found:'],
            [/Aviso: algunas posiciones XML tendrán pid=0\./g, 'Warning: some XML positions will have pid=0.'],
            [/\bshortpass\b/g, 'Short'],
            [/\blongball\b/g, 'Long'],
            [/\bwings\b/g, 'Wings'],
            [/\bcounterattack\b/g, 'Balanced'],
            [/\boffensive\b/g, 'Attacking'],
            [/\bdefensive\b/g, 'Defensive'],
            [/\baggressive\b/g, 'Committed'],
            [/\bcautious\b/g, 'Passive'],
            [/\bnormal\b/g, 'Normal'],
            [/\btactic\b/g, 'Passing'],
            [/\bplaystyle\b/g, 'Mentality'],
            [/\baggression\b/g, 'Pressing']
        ];

        const replacementsES = [
            [/Vigente:/g, '𝗩𝗶𝗴𝗲𝗻𝘁𝗲:'],
            [/--- GOL ---/g, '--- 𝗚𝗢𝗟 ---'],
            [/--- Cambio (\d+): Táctica ---/g, '--- 𝗖𝗮𝗺𝗯𝗶𝗼 $1: 𝗧𝗮́𝗰𝘁𝗶𝗰𝗮 ---'],
            [/--- Cambio (\d+): Sustitución ---/g, '--- 𝗖𝗮𝗺𝗯𝗶𝗼 $1: 𝗦𝘂𝘀𝘁𝗶𝘁𝘂𝗰𝗶𝗼́𝗻 ---'],
            [/--- Cambio (\d+) ---/g, '--- 𝗖𝗮𝗺𝗯𝗶𝗼 $1 ---'],
            [/\bshortpass\b/gi, 'Pases Cortos'],
            [/\blongball\b/gi, 'Pases Largos'],
            [/\bwings\b/gi, 'Usar Extremos'],
            [/\bcounterattack\b/gi, 'Normal'],
            [/\boffensive\b/gi, 'Ofensivo'],
            [/\bdefensive\b/gi, 'Defensivo'],
            [/\baggressive\b/gi, 'Agresivo'],
            [/\bcautious\b/gi, 'Pasivo'],
            [/\bnormal\b/gi, 'Normal'],
            [/\btactic\b/gi, 'Táctica'],
            [/\bplaystyle\b/gi, 'Estilo'],
            [/\baggression\b/gi, 'Agresividad']
        ];

        if (lang === 'en') {
            for (const [pattern, replacement] of replacementsEN) {
                text = text.replace(pattern, replacement);
            }
        } else {
            for (const [pattern, replacement] of replacementsES) {
                text = text.replace(pattern, replacement);
            }
        }

        return text;
    }

    function setLanguage(panel, lang) {
        currentLang = lang === 'en' ? 'en' : 'es';

        if (!panel) return;

        panel.dataset.lang = currentLang;

        panel.querySelectorAll('.mz-ta-lang').forEach(button => {
            button.setAttribute(
                'aria-pressed',
                String(button.dataset.lang === currentLang)
            );
        });

        const title = panel.querySelector('.mz-ta-title');

        if (title) {
            title.textContent = currentLang === 'en'
                ? 'ManagerZone Tactical Analysis'
                : 'Análisis táctico de ManagerZone';
        }

        panel.querySelectorAll('[data-es-text]').forEach(el => {
            el.textContent = translateText(el.dataset.esText, currentLang);
        });

        const homeTab = panel.querySelector('[data-tab="home"]');
        const awayTab = panel.querySelector('[data-tab="away"]');

        if (homeTab) {
            homeTab.textContent = currentLang === 'en' ? 'Home' : 'Local';
        }

        if (awayTab) {
            awayTab.textContent = currentLang === 'en' ? 'Away' : 'Visitante';
        }

        panel.querySelectorAll('.mz-ta-copy').forEach(button => {
            button.textContent = button.dataset.copyState === 'copied'
                ? (currentLang === 'en' ? 'Copied' : 'Copiado')
                : (currentLang === 'en' ? 'Copy XML' : 'Copiar XML');
        });

        const message = panel.querySelector('.mz-ta-message');

        if (message && message.dataset.esMessage !== undefined) {
            message.textContent = translateText(
                message.dataset.esMessage,
                currentLang
            );
        }

        const launch = document.getElementById(BUTTON_ID);

        if (launch) {
            launch.title = currentLang === 'en'
                ? 'Copy Tactics // Show Passing, Mentality, Pressing and Substitutions.'
                : 'Clonar Formaciones // Mostrar Tácticas, Estilos, Agresividad y Sustituciones.';
        }
    }


    function createPanel() {
        document.getElementById(PANEL_ID)?.remove();

        const panel = document.createElement('section');
        panel.id = PANEL_ID;

        panel.innerHTML = `
      <div class="mz-ta-head">
        <strong class="mz-ta-title">Análisis táctico de ManagerZone</strong>
        <span class="mz-ta-match"></span>
        <button class="mz-ta-close" type="button">×</button>
      </div>

      <div class="mz-ta-tabs" role="tablist">
        <button class="mz-ta-tab"
            data-tab="home" aria-selected="true">Local</button>
        <button class="mz-ta-tab"
            data-tab="away" aria-selected="false">Visitante</button>

        <div class="mz-ta-spacer"></div>

        <button class="mz-ta-lang" type="button"
            data-lang="es" aria-pressed="true">ES</button>
        <button class="mz-ta-lang" type="button"
            data-lang="en" aria-pressed="false">EN</button>
      </div>

      <div class="mz-ta-content"></div>
    `;

        panel.querySelector('.mz-ta-close').onclick = () => panel.remove();

        panel.querySelectorAll('.mz-ta-lang').forEach(button => {
            button.addEventListener('click', () => {
                setLanguage(panel, button.dataset.lang);
            });
        });

        panel.querySelectorAll('.mz-ta-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                showTab(panel, tab.dataset.tab);
            });
        });

        document.body.appendChild(panel);
        setLanguage(panel, currentLang);

        return panel;
    }


    function showTab(panel, name) {
        panel.querySelectorAll('.mz-ta-tab').forEach(tab => {
            tab.setAttribute(
                'aria-selected',
                String(tab.dataset.tab === name)
            );
        });

        panel.querySelectorAll('[data-panel]').forEach(section => {
            section.hidden = section.dataset.panel !== name;
        });
    }


    function setMessage(panel, message, error = false) {
        if (!panel) {
            console.error('[MZ Tactical] El panel no existe.');
            return;
        }

        const content = panel.querySelector('.mz-ta-content');

        if (!content) {
            console.error(
                '[MZ Tactical] No se encontró .mz-ta-content dentro del panel.',
                panel
            );
            return;
        }

        content.replaceChildren();

        const p = document.createElement('p');
        p.style.whiteSpace = 'pre-line';
        p.className = 'mz-ta-message';
        p.dataset.esMessage = message;
        p.textContent = translateText(
            message,
            panel.dataset.lang || currentLang
        );

        if (error) {
            p.classList.add('mz-ta-error');
        }

        content.appendChild(p);
    }


    async function getMyPids() {
        try {
            const r = await fetch(
                '/?p=training&sport=soccer',
                { credentials: 'same-origin' }
            );

            if (!r.ok) return [];

            const t = await r.text();

            const m = t.match(
                /trainingField\.players\s*=\s*({[\s\S]+?})\s*;/
            );

            return m ? Object.keys(JSON.parse(m[1])) : [];
        } catch (e) {
            console.warn(
                '[MZ Tactical] Error obteniendo jugadores propios:',
                e
            );

            return [];
        }
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }

        return arr;
    }

    const toX = (v, home) => home
        ? Math.round(-0.255800462 * v + 199.8228530689)
        : Math.round(0.2555000556 * v + 8.3741302936);

    const toY = (v, home) => home
        ? Math.round(-0.3073207154 * v + 315.9278777381)
        : Math.round(0.3070644902 * v + 9.2794889414);

    async function fetchXml(type, mid) {
        try {
            const r = await fetch(
                `/matchviewer/getMatchFiles.php?type=${type}&mid=${encodeURIComponent(mid)}&sport=soccer`,
                { credentials: 'same-origin' }
            );

            if (!r.ok) return null;

            const t = await r.text();
            const doc = new DOMParser().parseFromString(t, 'text/xml');

            if (
                doc.querySelector('parsererror') ||
                !doc.getElementsByTagName('Team').length
            ) {
                return null;
            }

            return doc;
        } catch (e) {
            console.warn(
                `[MZ Tactical] Error descargando XML ${type}:`,
                e
            );

            return null;
        }
    }

    function extractEvents(doc) {
        const root = doc.getElementsByTagName('Events')[0];
        const children = root ? Array.from(root.children) : [];

        let tactics = children.filter(n => n.tagName === 'Tactic');
        let subs = children.filter(n => n.tagName === 'Substitution');

        if (!tactics.length) {
            tactics = Array.from(doc.getElementsByTagName('Tactic'));
        }

        if (!subs.length) {
            subs = Array.from(doc.getElementsByTagName('Substitution'));
        }

        const tags = {};

        children.forEach(n => {
            tags[n.tagName] = (tags[n.tagName] || 0) + 1;
        });

        return { tactics, subs, tags };
    }

    function extractGoals(doc, teams) {
        if (!doc || !teams || teams.length < 2) return [];

        const homeId = String(teams[0].getAttribute('id'));
        const awayId = String(teams[1].getAttribute('id'));

        const homeName = teams[0].getAttribute('name') || 'Local';
        const awayName = teams[1].getAttribute('name') || 'Visitante';

        const goals = [];

        for (const player of doc.getElementsByTagName('Player')) {
            const playerId = player.getAttribute('id');
            const playerTeamId = String(player.getAttribute('teamId'));

            const playerName =
                `${player.getAttribute('name') || playerId || 'Jugador'} ` +
                `(${player.getAttribute('shirtno') || '?'})`;

            for (const goal of player.getElementsByTagName('Goal')) {
                goals.push({
                    kind: 'goal',
                    frame: Number(goal.getAttribute('frame')) || 0,

                    s: (() => {
                        const t = goal.getAttribute('time') || '0:0';
                        const [m, sec] = t.split(':');

                        return (parseFloat(m) || 0) * 60 +
                            (parseFloat(sec) || 0);
                    })(),

                    clock: goal.getAttribute('clock') || '',
                    playerName,
                    playerTeamId,

                    scoringTeamId: String(
                        goal.getAttribute('team') || playerTeamId
                    ),

                    homeId,
                    awayId,
                    homeName,
                    awayName
                });
            }
        }

        return goals;
    }

    function teamInfo(team, isHome, ev, names, goalReport) {
        const teamId = String(team.getAttribute('id'));

        const secs = t => {
            const [m, s] = (t || '0:0').split(':');
            return (parseFloat(m) || 0) * 60 + (parseFloat(s) || 0);
        };

        const formatTime = t => {
            if (!t) return 'No disponible en el XML';

            const parts = t.split(':');
            const minutes = parseInt(parts[0], 10) || 0;
            const seconds = parseInt(parts[1], 10) || 0;

            return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };

        let txt =
            `${isHome ? 'LOCAL' : 'VISITANTE'} ` +
            `(${team.getAttribute('name') || 'equipo ' + teamId})\n` +
            `Inicial -> Táctica: ${team.getAttribute('tactic')} | ` +
            `Estilo: ${team.getAttribute('playstyle')} | ` +
            `Agresividad: ${team.getAttribute('aggression')}\n\n`;

        const items = [
            ...ev.tactics
                .filter(e => String(e.getAttribute('teamId')) === teamId)
                .map(e => ({
                    kind: 't',
                    e,
                    s: secs(e.getAttribute('time'))
                })),

            ...ev.subs
                .filter(e => String(e.getAttribute('teamId')) === teamId)
                .map(e => ({
                    kind: 's',
                    e,
                    s: secs(e.getAttribute('time'))
                }))
        ];

        const goals = Array.isArray(goalReport) ? goalReport : [];

        goals.forEach((goal, index) => {
            items.push({
                kind: 'goal',
                goal,
                s: Number.isFinite(goal.s) ? goal.s : 0,
                order: index
            });
        });

        items.sort((a, b) => a.s - b.s);

        if (!items.length) {
            txt += 'No se encontraron cambios ni goles en el XML.\n';
            return txt;
        }

        const state = {
            tactic: team.getAttribute('tactic'),
            playstyle: team.getAttribute('playstyle'),
            aggression: team.getAttribute('aggression')
        };

        const homeId = goals.length ? goals[0].homeId : null;
        const awayId = goals.length ? goals[0].awayId : null;

        let homeScore = 0;
        let awayScore = 0;
        let changeNumber = 0;

        items.forEach(it => {
            if (it.kind === 'goal') {
                const g = it.goal;

                if (String(g.scoringTeamId) === String(homeId)) {
                    homeScore++;
                } else if (String(g.scoringTeamId) === String(awayId)) {
                    awayScore++;
                }

                const scoringTeam =
                    String(g.scoringTeamId) === String(homeId)
                        ? (g.homeName || 'Local')
                        : String(g.scoringTeamId) === String(awayId)
                            ? (g.awayName || 'Visitante')
                            : 'Equipo desconocido';

                txt += `--- GOL ---\n`;
                txt += `Tiempo: ${formatTime(g.clock)}\n`;
                txt += `Equipo: ${scoringTeam}\n`;
                txt += `Jugador: ${g.playerName || 'No identificado'}\n`;
                txt += `Marcador: ${homeScore} - ${awayScore}\n\n`;

                return;
            }

            changeNumber++;

            const e = it.e;

            if (it.kind === 't') {
                const type = e.getAttribute('type');
                const val = e.getAttribute('new_setting');
                const minute = e.getAttribute('minute');

                txt += `--- Cambio ${changeNumber}: Táctica ---\n`;
                txt += `Tiempo: ${formatTime(e.getAttribute('clock') || e.getAttribute('time'))}\n`;
                txt += `${type}: ${state[type] ?? '?'} -> ${val ?? '?'}\n`;

                if (minute) {
                    txt += `Minuto programado: ${minute}\n`;
                }

                if (Object.prototype.hasOwnProperty.call(state, type)) {
                    state[type] = val;
                }
            } else {
                const incoming = e.getAttribute('playerId');
                const outgoing = e.getAttribute('substitutedId');
                const minute = e.getAttribute('minute');

                txt += `--- Cambio ${changeNumber}: Sustitución ---\n`;
                txt += `Tiempo: ${formatTime(e.getAttribute('clock') || e.getAttribute('time'))}\n`;

                if (minute) {
                    txt += `Minuto programado: ${minute}\n`;
                }

                txt +=
                    `Entra ${names[incoming] || incoming || '?'} / ` +
                    `sale ${names[outgoing] || outgoing || '?'}\n`;
            }

            txt +=
                `Vigente: ${state.tactic} | ` +
                `${state.playstyle} | ${state.aggression}\n\n`;
        });

        if (!goals.length) {
            txt += 'No se encontraron eventos de gol en el XML.\n';
        }

        return txt;
    }

    function buildXml(team, isHome, doc, pids) {
        const teamId = team.getAttribute('id');
        const ids = shuffle([...pids]);

        let out =
            '<?xml version="1.0" ?>\r\n<SoccerTactics>\r\n' +
            `\t<Team tactics="${team.getAttribute('tactic')}" ` +
            `playstyle="${team.getAttribute('playstyle')}" ` +
            `aggression="${team.getAttribute('aggression')}" />\r\n` +
            `\t<Pos pos="goalie" pid="${ids.shift() || 0}" ` +
            'x="103" y="315" x1="103" y1="315" ' +
            'x2="103" y2="315" pt="15" fk="15" />\r\n';

        for (const p of doc.getElementsByTagName('Player')) {
            if (p.getAttribute('teamId') !== teamId) continue;

            const origin = p.getAttribute('origin');

            if (
                !origin ||
                origin === '375,0' ||
                origin === '375,1000'
            ) {
                continue;
            }

            const [ox, oy] = origin.split(',');

            if (
                !Number.isFinite(Number(ox)) ||
                !Number.isFinite(Number(oy))
            ) {
                continue;
            }

            const x = toX(Number(ox), isHome);
            const y = toY(Number(oy), isHome);

            out +=
                `\t<Pos pos="normal" pid="${ids.shift() || 0}" ` +
                `x="${x}" y="${y}" x1="${x}" y1="${y}" ` +
                `x2="${x}" y2="${y}" pt="1" fk="1" />\r\n`;
        }

        return out + '</SoccerTactics>\r\n';
    }

    function addTeamTab(panel, tab, info, xml, title) {
        const section = document.createElement('section');
        section.dataset.panel = tab;
        section.hidden = tab !== 'home';

        const h = document.createElement('h3');
        h.dataset.esText = title;
        h.textContent = translateText(
            title,
            panel.dataset.lang || currentLang
        );

        const pre = document.createElement('pre');
        pre.className = 'mz-ta-report';
        pre.dataset.esText = info;
        pre.textContent = translateText(
            info,
            panel.dataset.lang || currentLang
        );

        const hXml = document.createElement('h3');
        hXml.dataset.esText = 'XML de formación';
        hXml.textContent = translateText(
            'XML de formación',
            panel.dataset.lang || currentLang
        );

        const ta = document.createElement('textarea');
        ta.readOnly = true;
        ta.value = xml;

        const copy = document.createElement('button');
        copy.className = 'mz-ta-copy';
        copy.textContent =
            (panel.dataset.lang || currentLang) === 'en'
                ? 'Copy XML'
                : 'Copiar XML';

        copy.onclick = async () => {
            try {
                await navigator.clipboard.writeText(ta.value);
            } catch (_) {
                ta.select();
                document.execCommand('copy');
            }

            copy.dataset.copyState = 'copied';
            copy.textContent =
                (panel.dataset.lang || currentLang) === 'en'
                    ? 'Copied'
                    : 'Copiado';

            setTimeout(() => {
                if (copy.isConnected) {
                    delete copy.dataset.copyState;
                    copy.textContent =
                        (panel.dataset.lang || currentLang) === 'en'
                            ? 'Copy XML'
                            : 'Copiar XML';
                }
            }, 1800);
        };

        section.append(
            h,
            pre,
            hXml,
            ta,
            document.createElement('br'),
            copy
        );

        panel.querySelector('.mz-ta-content').appendChild(section);
    }

    async function runAnalysis(button) {
        if (busy) return;

        busy = true;
        button.disabled = true;

        const oldLabel = button.textContent;
        let panel = null;

        try {
            button.textContent = 'Esperando partido…';

            const mid = await waitForMatchId(60000);

            if (!mid) {
                alert(
                    'No se pudo detectar el ID del partido después de ' +
                    '60 segundos. Recarga el partido e inténtalo nuevamente.'
                );
                return;
            }

            button.textContent = 'Analizando…';
            panel = createPanel();

            const matchLabel = panel.querySelector('.mz-ta-match');
            matchLabel.dataset.esText = `Partido ${mid}`;
            matchLabel.textContent = translateText(
                matchLabel.dataset.esText,
                panel.dataset.lang || currentLang
            );

            setMessage(panel, 'Buscando los XML del partido…');

            let xml = await fetchXml('stats', mid);

            for (let i = 0; i < 2 && !xml; i++) {
                setMessage(
                    panel,
                    `Esperando los datos del partido... Reintento ${i + 1} de 2`
                );

                await sleep(1500);
                xml = await fetchXml('stats', mid);
            }

            if (!xml) {
                setMessage(
                    panel,
                    'DATOS DEL PARTIDO NO DISPONIBLES\n\n' +
                    'Cómo solucionarlo:\n' +
                    '1. Abre el modo 2D del partido.\n' +
                    '2. Espera a que cargue completamente.\n' +
                    '3. Vuelve aquí y pulsa AT para intentarlo de nuevo.',
                    true
                );
                return;
            }

            const teams = Array.from(xml.getElementsByTagName('Team'));

            if (teams.length < 2) {
                throw new Error(
                    `Se encontraron ${teams.length} equipos; se esperaban dos.`
                );
            }

            let source = 'stats';
            let eventDoc = xml;
            let ev = extractEvents(xml);

            if (!ev.tactics.length || !ev.subs.length) {
                const dataXml = await fetchXml('data', mid);

                if (dataXml) {
                    const ev2 = extractEvents(dataXml);

                    if (
                        ev2.tactics.length > ev.tactics.length ||
                        ev2.subs.length > ev.subs.length
                    ) {
                        ev = ev2;
                        eventDoc = dataXml;
                        source = 'data';
                    }
                }
            }

            const names = {};

            for (const p of eventDoc.getElementsByTagName('Player')) {
                names[p.getAttribute('id')] =
                    `${p.getAttribute('name') || '?'} ` +
                    `(${p.getAttribute('shirtno') || '?'})`;
            }

            const pids = await getMyPids();
            const content = panel.querySelector('.mz-ta-content');

            content.replaceChildren();

            let goals = extractGoals(xml, teams);

            if (goals.length === 0 && eventDoc !== xml) {
                goals = extractGoals(eventDoc, teams);
            }

            teams.slice(0, 2).forEach((team, i) => {
                const home = i === 0;

                addTeamTab(
                    panel,
                    home ? 'home' : 'away',
                    teamInfo(team, home, ev, names, goals),
                    buildXml(team, home, xml, pids),
                    `${home ? 'LOCAL' : 'VISITANTE'}: ` +
                    `${team.getAttribute('name') || team.getAttribute('id')}`
                );
            });

            const diag = document.createElement('section');
            diag.dataset.panel = 'diag';
            diag.hidden = true;

            const pre = document.createElement('pre');

            const diagnosticText = [
                `Partido: ${mid}`,
                `Fuente de eventos: ${source}`,
                `Equipos encontrados: ${teams.length}`,
                `Eventos Tactic: ${ev.tactics.length}`,
                `Eventos Substitution: ${ev.subs.length}`,
                `Goles encontrados: ${goals.length}`,
                `Etiquetas en Events: ${JSON.stringify(ev.tags)}`,
                `Jugadores propios encontrados: ${pids.length}`,
                pids.length < 11
                    ? 'Aviso: algunas posiciones XML tendrán pid=0.'
                    : ''
            ].filter(Boolean).join('\n');

            pre.dataset.esText = diagnosticText;
            pre.textContent = translateText(
                diagnosticText,
                panel.dataset.lang || currentLang
            );

            diag.appendChild(pre);
            content.appendChild(diag);

            showTab(panel, 'home');

        } catch (e) {
            console.error('[MZ Tactical]', e);

            if (panel && panel.isConnected) {
                setMessage(
                    panel,
                    e.message || 'Error desconocido durante el análisis.',
                    true
                );
            } else {
                alert(e.message || 'Error durante el análisis.');
            }

        } finally {
            busy = false;
            button.disabled = false;
            button.textContent = oldLabel;
        }
    }

    function find3DControl() {
        const controls = Array.from(
            document.querySelectorAll('a, button, input, [role="button"]')
        );

        return controls.find(el => {
            const text = (
                el.innerText ||
                el.value ||
                el.getAttribute('aria-label') ||
                el.getAttribute('title') ||
                ''
            ).trim();

            return text === '3D';
        }) || null;
    }

    function isMatchPage() {
        return new URLSearchParams(location.search).get('p') === 'match';
    }

    function insertButton() {
        if (!document.body) return;

        if (!isMatchPage()) {
            document.getElementById(BUTTON_ID)?.remove();
            return;
        }

        const control = find3DControl();

        if (!control || !control.parentElement) return;

        addStyles();

        let button = document.getElementById(BUTTON_ID);

        if (!button) {
            button = document.createElement('button');
            button.id = BUTTON_ID;
            button.type = 'button';
            button.textContent = 'T A';

            button.title = currentLang === 'en'
                ? 'Copy Tactics // Show Passing, Mentality, Pressing and Substitutions.'
                : 'Clonar Formaciones // Mostrar Tácticas, Estilos, Agresividad y Sustituciones.';

            button.addEventListener('click', () => runAnalysis(button));
        }

        if (control.nextElementSibling !== button) {
            control.insertAdjacentElement('afterend', button);
        }
    }

    function monitorPage() {
        insertButton();
    }

    function start() {
        monitorPage();

        observer = new MutationObserver(() => {
            monitorPage();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener('popstate', monitorPage);
        window.addEventListener('hashchange', monitorPage);
    }

    start();
})();
