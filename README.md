# pi-sessions

**License: [AGPL-3.0-or-later](LICENSE)**

Arrow-key session picker and multi-session restore helpers for the
[Pi](https://pi.dev/) coding agent.

Pi already stores each session’s working directory and can resume with
`pi --resume`. This project adds:

- a **nano-style** interactive table of sessions (name, last user message, id)
  from every saved project, regardless of where the picker is started
- **cwd-aware resume** (`cd` then `pi --session …`)
- **rapid multi-start** (open selected sessions in new terminals while staying in the picker)
- pre-reboot **snapshot / restore** of live Pi terminals
- an optional **live-session registry** extension for exact pid↔session mapping

## Install

```sh
git clone https://github.com/webdawg/pi-sessions.git
cd pi-sessions
./install.sh
```

`install.sh` symlinks:

| Source | Destination |
|---|---|
| `bin/pi-sessions` | `~/.local/bin/pi-sessions` |
| `extensions/live-session-registry.ts` | `~/.pi/agent/extensions/live-session-registry.ts` |

Ensure `~/.local/bin` is on your `PATH`. Restart existing Pi sessions (or start
new ones) so the extension loads.

## Usage

```sh
cd /path/to/project
pi-sessions                 # non-running sessions from every project
pi-sessions pick --cwd /path/to/project  # restrict to one project
pi-sessions pick -i         # include already-running
```

### Nano-style key legend (bottom bar)

| Key | Label | Action |
|---|---|---|
| `Enter` (`^M`) | Resume | `cd` + resume in **this** terminal |
| `o` | New Term | new terminal; stay in picker |
| `↑` `↓` (also `j`/`k`) | Move | move selection |
| `/` | Filter | filter name / last message / id |
| `a` | All CWD | this directory ↔ every project |
| `i` | Running | toggle already-running rows |
| `r` | Reload | refresh list |
| `q` | Quit | exit picker |

### Snapshot / restore (reboot)

```sh
pi-sessions snapshot
pi-sessions restore --dry-run
pi-sessions restore --min-confidence medium
```

### Direct resume

```sh
pi-sessions resume 01a1b8ab
pi-sessions list --cwd
pi-sessions live
```

Inside Pi, name important sessions so the NAME column stays readable:

```text
/name medical
```

## Layout

```text
bin/pi-sessions                         # CLI + curses picker
extensions/live-session-registry.ts     # heartbeat → ~/.pi/agent/live-sessions/
install.sh
LICENSE                                 # GNU AGPL v3
README.md
```

Snapshots default to `~/.local/share/pi-sessions/`.

## Requirements

- Python 3 (stdlib `curses`)
- `pi` on `PATH`
- Optional: `xfce4-terminal`, `wmctrl` (terminal restore / title mapping)

## License

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

See [LICENSE](LICENSE) for the full text.
