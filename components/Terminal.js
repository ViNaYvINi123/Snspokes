import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

// Real xterm.js terminal component
// Only loads client-side (no SSR)
export default function Terminal({ onSearch, initialCommands = [] }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  let inputBuffer = '';
  let commandHistory = [];
  let historyIndex = -1;

  const PROMPT = '\r\n\x1b[38;5;99m snspokes\x1b[0m \x1b[38;5;240m~/search\x1b[0m \x1b[38;5;99m❯\x1b[0m ';

  const COMMANDS = {
    help: () => [
      '\x1b[38;5;99m┌─ Available Commands ──────────────────────┐\x1b[0m',
      '\x1b[38;5;240m│\x1b[0m  \x1b[1msearch\x1b[0m \x1b[38;5;240m<query>\x1b[0m   Search ServiceNow spokes',
      '\x1b[38;5;240m│\x1b[0m  \x1b[1mspokes\x1b[0m            Browse all 200+ spokes',
      '\x1b[38;5;240m│\x1b[0m  \x1b[1mtools\x1b[0m             List developer tools',
      '\x1b[38;5;240m│\x1b[0m  \x1b[1mclear\x1b[0m             Clear terminal',
      '\x1b[38;5;240m│\x1b[0m  \x1b[1mopen\x1b[0m \x1b[38;5;240m<slug>\x1b[0m      Open spoke page',
      '\x1b[38;5;240m│\x1b[0m  \x1b[1mhistory\x1b[0m           Show recent commands',
      '\x1b[38;5;99m└───────────────────────────────────────────┘\x1b[0m',
    ],
    tools: () => [
      '\x1b[38;5;99m● Developer Tools\x1b[0m',
      '  \x1b[1mcode_gen\x1b[0m   AI code generation → /tools/code-generator',
      '  \x1b[1merr_fix\x1b[0m    Error analyzer    → /tools/error-finder',
      '  \x1b[1mref_docs\x1b[0m   Cheatsheet        → /tools/cheatsheet',
    ],
    clear: null, // handled specially
    spokes: () => [
      '\x1b[38;5;99m● Integration Hub Spokes\x1b[0m',
      '  slack, jira, github, aws, salesforce,',
      '  pagerduty, okta, microsoft-teams + 190 more',
      '\x1b[38;5;240m  → run: open <slug> to navigate\x1b[0m',
    ],
    version: () => ['\x1b[38;5;99msnspokes\x1b[0m intelligence OS v33.11 — ServiceNow Developer Toolkit'],
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    let term, fitAddon;

    const init = async () => {
      const { Terminal: XTerm } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');
      await import('xterm/css/xterm.css');

      term = new XTerm({
        theme: {
          background:   '#020208',
          foreground:   '#9ca3af',
          cursor:       '#6c63ff',
          cursorAccent: '#020208',
          black:        '#1a1a2e',
          red:          '#f87171',
          green:        '#4ade80',
          yellow:       '#f59e0b',
          blue:         '#6c63ff',
          magenta:      '#a855f7',
          cyan:         '#38bdf8',
          white:        '#e8eaf6',
          brightBlack:  '#374151',
          brightBlue:   '#8b85ff',
        },
        fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
        fontSize: 13,
        lineHeight: 1.6,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 500,
        allowTransparency: true,
      });

      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(containerRef.current);
      fitAddon.fit();
      termRef.current = term;

      // Boot sequence
      const bootLines = [
        '\x1b[38;5;240m  ┌─────────────────────────────────────────┐\x1b[0m',
        '\x1b[38;5;240m  │\x1b[0m   \x1b[38;5;99m★ snspokes\x1b[0m developer intelligence OS   \x1b[38;5;240m│\x1b[0m',
        '\x1b[38;5;240m  └─────────────────────────────────────────┘\x1b[0m',
        '',
        '\x1b[38;5;240mloading spoke index...\x1b[0m      \x1b[38;5;82m[  OK  ]\x1b[0m',
        '\x1b[38;5;240mconnecting AI providers...\x1b[0m  \x1b[38;5;82m[  OK  ]\x1b[0m',
        '\x1b[38;5;240minitializing memory...\x1b[0m      \x1b[38;5;82m[  OK  ]\x1b[0m',
        '',
        "type \x1b[1mhelp\x1b[0m for available commands",
      ];

      for (let i = 0; i < bootLines.length; i++) {
        await new Promise(r => setTimeout(r, i * 80));
        term.writeln(bootLines[i]);
      }

      // Run initial commands if provided
      for (const cmd of initialCommands) {
        await new Promise(r => setTimeout(r, 200));
        writePrompt();
        term.write(cmd);
        await new Promise(r => setTimeout(r, 100));
        handleCommand(cmd);
      }

      if (!initialCommands.length) writePrompt();
      setReady(true);

      // Input handling
      term.onData(data => {
        const code = data.charCodeAt(0);

        if (code === 13) { // Enter
          term.write('\r\n');
          const cmd = inputBuffer.trim();
          if (cmd) {
            commandHistory.unshift(cmd);
            historyIndex = -1;
            handleCommand(cmd);
          } else {
            writePrompt();
          }
          inputBuffer = '';
        } else if (code === 127) { // Backspace
          if (inputBuffer.length > 0) {
            inputBuffer = inputBuffer.slice(0, -1);
            term.write('\b \b');
          }
        } else if (data === '\x1b[A') { // Up arrow
          if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            clearInput();
            inputBuffer = commandHistory[historyIndex];
            term.write(inputBuffer);
          }
        } else if (data === '\x1b[B') { // Down arrow
          if (historyIndex > 0) {
            historyIndex--;
            clearInput();
            inputBuffer = commandHistory[historyIndex];
            term.write(inputBuffer);
          } else if (historyIndex === 0) {
            historyIndex = -1;
            clearInput();
          }
        } else if (code >= 32) {
          inputBuffer += data;
          term.write(data);
        }
      });
    };

    const writePrompt = () => term.write(PROMPT);

    const clearInput = () => {
      // Move to end, delete back
      for (let i = 0; i < inputBuffer.length; i++) term.write('\b \b');
      inputBuffer = '';
    };

    const handleCommand = (raw) => {
      const parts = raw.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      if (cmd === 'clear') {
        term.clear();
        writePrompt();
        return;
      }

      if (cmd === 'search' && args) {
        term.writeln(`\x1b[38;5;99m⌕\x1b[0m searching: \x1b[1m${args}\x1b[0m`);
        if (onSearch) onSearch(args);
        else {
          // Navigate to search page
          window.location.href = '/search?q=' + encodeURIComponent(args);
        }
        writePrompt();
        return;
      }

      if (cmd === 'open' && args) {
        term.writeln(`\x1b[38;5;82m→\x1b[0m opening: \x1b[38;5;99m${args}\x1b[0m`);
        setTimeout(() => window.location.href = `/spoke/${args}`, 300);
        writePrompt();
        return;
      }

      if (cmd === 'goto' || cmd === 'cd') {
        const routes = { tools:'/tools/code-generator', search:'/search', spokes:'/spokes', home:'/', admin:'/admin' };
        if (routes[args]) {
          term.writeln(`\x1b[38;5;82m→\x1b[0m navigating to \x1b[1m${args}\x1b[0m`);
          setTimeout(() => window.location.href = routes[args], 300);
        } else {
          term.writeln(`\x1b[38;5;196mUnknown route: ${args}\x1b[0m`);
        }
        writePrompt();
        return;
      }

      if (cmd === 'history') {
        commandHistory.forEach((h, i) => term.writeln(`  ${commandHistory.length - i}  ${h}`));
        writePrompt();
        return;
      }

      if (COMMANDS[cmd]) {
        const lines = COMMANDS[cmd]();
        lines.forEach(l => term.writeln(l));
        writePrompt();
        return;
      }

      if (cmd === '') { writePrompt(); return; }

      term.writeln(`\x1b[38;5;196mcommand not found: ${cmd}\x1b[0m  (try \x1b[1mhelp\x1b[0m)`);
      writePrompt();
    };

    init();

    const handleResize = () => { if (fitAddon) fitAddon.fit(); };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (term) term.dispose();
    };
  }, []);

  return (
    <div style={{ width:'100%', height:'100%', background:'#020208' }}>
      <div ref={containerRef} style={{ width:'100%', height:'100%' }} />
      {!ready && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#020208' }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', color:'#374151', animation:'pulse 1s infinite' }}>initializing terminal...</span>
        </div>
      )}
    </div>
  );
}
