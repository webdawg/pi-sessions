/**
 * Copyright (C) 2026 webdawg / contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Live Session Registry
 *
 * Writes a per-session heartbeat under ~/.pi/agent/live-sessions/ so a
 * companion CLI can snapshot active work and resume each session in its
 * original working directory after reboot/upgrade.
 *
 * Does not change model behavior. Safe to load globally.
 */

import { mkdirSync, writeFileSync, unlinkSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const LIVE_DIR = join(homedir(), ".pi", "agent", "live-sessions");
const HEARTBEAT_MS = 30_000;

type LiveRecord = {
	version: 1;
	status: "active" | "shutdown";
	pid: number;
	ppid?: number;
	sessionId: string;
	sessionFile?: string;
	cwd: string;
	name?: string;
	title?: string;
	provider?: string;
	model?: string;
	windowId?: string;
	startedAt: string;
	updatedAt: string;
	reason?: string;
};

function ensureDir() {
	mkdirSync(LIVE_DIR, { recursive: true });
}

function recordPath(sessionId: string) {
	const safe = sessionId.replace(/[^a-zA-Z0-9._-]/g, "_");
	return join(LIVE_DIR, `${safe}.json`);
}

function indexPath() {
	return join(LIVE_DIR, "index.json");
}

function rebuildIndex() {
	ensureDir();
	const entries: LiveRecord[] = [];
	for (const name of readdirSync(LIVE_DIR)) {
		if (!name.endsWith(".json") || name === "index.json") continue;
		try {
			const rec = JSON.parse(readFileSync(join(LIVE_DIR, name), "utf8")) as LiveRecord;
			if (rec?.sessionId) entries.push(rec);
		} catch {
			// ignore corrupt records
		}
	}
	entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	writeFileSync(indexPath(), `${JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), entries }, null, 2)}\n`);
}

function writeRecord(rec: LiveRecord) {
	ensureDir();
	writeFileSync(recordPath(rec.sessionId), `${JSON.stringify(rec, null, 2)}\n`);
	rebuildIndex();
}

function buildRecord(ctx: ExtensionContext, reason: string, startedAt: string): LiveRecord | undefined {
	const sessionId = ctx.sessionManager.getSessionId();
	if (!sessionId) return undefined;
	const sessionFile = ctx.sessionManager.getSessionFile();
	const cwd = ctx.sessionManager.getCwd() || ctx.cwd;
	const name = ctx.sessionManager.getSessionName();
	const model = ctx.model;
	const shortCwd = cwd.replace(homedir(), "~");
	const titleParts = ["π"];
	if (name) titleParts.push(name);
	titleParts.push(shortCwd.split("/").filter(Boolean).slice(-2).join("/") || shortCwd);

	return {
		version: 1,
		status: "active",
		pid: process.pid,
		ppid: typeof process.ppid === "number" ? process.ppid : undefined,
		sessionId,
		sessionFile,
		cwd,
		name,
		title: titleParts.join(" - "),
		provider: model?.provider,
		model: model?.id,
		windowId: process.env.WINDOWID,
		startedAt,
		updatedAt: new Date().toISOString(),
		reason,
	};
}

export default function liveSessionRegistry(pi: ExtensionAPI) {
	let startedAt = new Date().toISOString();
	let timer: ReturnType<typeof setInterval> | undefined;
	let lastCtx: ExtensionContext | undefined;

	const beat = (ctx: ExtensionContext, reason: string) => {
		lastCtx = ctx;
		const rec = buildRecord(ctx, reason, startedAt);
		if (!rec) return;
		writeRecord(rec);
		// Keep the terminal title useful for humans and for snapshot tools.
		if (ctx.hasUI && rec.title) {
			try {
				ctx.ui.setTitle(rec.title);
			} catch {
				// title is best-effort
			}
		}
	};

	const startTimer = (ctx: ExtensionContext) => {
		if (timer) clearInterval(timer);
		timer = setInterval(() => {
			if (!lastCtx) return;
			try {
				beat(lastCtx, "heartbeat");
			} catch {
				// ignore heartbeat failures
			}
		}, HEARTBEAT_MS);
		// unref so heartbeat does not keep process alive alone
		if (typeof timer === "object" && timer && "unref" in timer) {
			(timer as NodeJS.Timeout).unref?.();
		}
		beat(ctx, "timer-start");
	};

	pi.on("session_start", async (event, ctx) => {
		startedAt = new Date().toISOString();
		beat(ctx, `session_start:${event.reason ?? "unknown"}`);
		startTimer(ctx);
	});

	pi.on("session_info_changed", async (_event, ctx) => {
		beat(ctx, "session_info_changed");
	});

	pi.on("agent_end", async (_event, ctx) => {
		beat(ctx, "agent_end");
	});

	pi.on("turn_end", async (_event, ctx) => {
		beat(ctx, "turn_end");
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}
		const rec = buildRecord(ctx, "session_shutdown", startedAt);
		if (!rec) return;
		rec.status = "shutdown";
		rec.updatedAt = new Date().toISOString();
		writeRecord(rec);
		// Keep shutdown record briefly useful, but remove stale active marker file name space:
		// leave the file; CLI treats non-live pids as inactive.
		try {
			// Optional: delete after writing shutdown so live listing stays clean
			if (existsSync(recordPath(rec.sessionId))) {
				// keep file with status=shutdown for post-mortem restore hints
			}
		} catch {
			// ignore
		}
	});

	pi.registerCommand("live-register", {
		description: "Refresh this session's live-session registry entry",
		handler: async (_args, ctx) => {
			beat(ctx, "manual");
			const sid = ctx.sessionManager.getSessionId();
			ctx.ui.notify(sid ? `Live registry updated: ${sid}` : "No session id", "info");
		},
	});
}
