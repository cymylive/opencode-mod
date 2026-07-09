import { useProject } from "../../context/project"
import { useSync } from "../../context/sync"
import { createEffect, createMemo, createResource, createSignal, For, onCleanup, Show } from "solid-js"
import { useTheme } from "../../context/theme"
import { useTuiConfig } from "../../config"
import { InstallationChannel, InstallationVersion } from "@opencode-ai/core/installation/version"
import { usePluginRuntime } from "../../plugin/runtime"
import { useRoute } from "../../context/route"
import { useSDK } from "../../context/sdk"
import { useLocal } from "../../context/local"
import { useDialog } from "../../ui/dialog"
import { useKV } from "../../context/kv"
import { useToast } from "../../ui/toast"
import { DialogModel } from "../../component/dialog-model"
import { DialogPrompt } from "../../ui/dialog-prompt"
import { DialogMcp } from "../../component/dialog-mcp"
import { Locale } from "../../util/locale"
import { getScrollAcceleration } from "../../util/scroll"
import { WorkspaceLabel } from "../../component/workspace-label"
import { entries, map, pipe, sortBy } from "remeda"

// ── Scheduled Tasks ──
interface CronTask {
  id: string
  name: string
  prompt: string
  cron: string
  enabled: boolean
  lastRun?: number
  nextRun?: number
  createdAt: number
}

function fieldMatches(value: number, field: string): boolean {
  const f = field.trim()
  if (f === "*") return true
  if (f.startsWith("*/")) {
    const step = parseInt(f.slice(2), 10)
    return !isNaN(step) && step > 0 && value % step === 0
  }
  if (f.includes("-")) {
    const [lo, hi] = f.split("-").map(Number)
    return value >= lo && value <= hi
  }
  for (const v of f.split(",")) {
    if (parseInt(v, 10) === value) return true
  }
  return false
}

function cronNext(cron: string, from: number): number {
  const parts = cron.trim().split(/\s+/)
  const minuteField = parts[0]
  const hourField = parts.length === 1 ? "*" : parts[1]
  const d = new Date(from)
  d.setSeconds(0, 0)
  for (let i = 0; i < 1440; i++) {
    if (fieldMatches(d.getMinutes(), minuteField) && fieldMatches(d.getHours(), hourField)) {
      return d.getTime()
    }
    d.setTime(d.getTime() + 60000)
  }
  return 0
}

export function Sidebar(props: { sessionID: string; overlay?: boolean }) {
  const pluginRuntime = usePluginRuntime()
  const project = useProject()
  const sync = useSync()
  const { theme } = useTheme()
  const tuiConfig = useTuiConfig()
  const route = useRoute()
  const sdk = useSDK()
  const local = useLocal()
  const dialog = useDialog()
  const kv = useKV()
  const toast = useToast()
  const session = createMemo(() => sync.session.get(props.sessionID))
  const workspace = () => {
    const workspaceID = session()?.workspaceID
    if (!workspaceID) return
    return project.workspace.get(workspaceID)
  }
  const scrollAcceleration = createMemo(() => getScrollAcceleration(tuiConfig))

  const [deleting, setDeleting] = createSignal<string | null>(null)
  const handleDelete = (sessionID: string) => {
    if (deleting() === sessionID) {
      setDeleting(null)
      sdk.client.session.delete({ sessionID }).then((res) => {
        if (!res.error) sync.session.refresh()
      })
      return
    }
    setDeleting(sessionID)
    setTimeout(() => setDeleting((prev) => prev === sessionID ? null : prev), 3000)
  }

  const handleNewSession = () => {
    route.navigate({ type: "home" })
  }

  const handleRename = async (sessionID: string, currentTitle: string) => {
    const title = await DialogPrompt.show(dialog, "Rename session", { value: currentTitle })
    if (!title || title === currentTitle) return
    await sdk.client.session.update({ sessionID, title })
    sync.session.refresh()
  }

  const history = createMemo(() => {
    const current = session()
    if (!current) return []
    const dir = current.directory
    return sync.data.session
      .filter((s) => s.directory === dir && !s.parentID)
      .toSorted((a, b) => (b.time.updated ?? 0) - (a.time.updated ?? 0))
      .slice(0, 20)
  })

  const isCurrent = (id: string) => id === props.sessionID

  const sessionStatusColor = (id: string) => {
    const status = sync.data.session_status?.[id]
    if (!status || status.type === "idle") return theme.success
    if (status.type === "busy") return theme.warning
    return theme.error
  }

  const sessionStatusDot = (id: string) => {
    const status = sync.data.session_status?.[id]
    if (!status || status.type === "idle") return "●"
    if (status.type === "busy") return "●"
    return "●"
  }

  const allStatuses = createMemo(() => sync.data.session_status ?? {})

  createEffect(() => {
    const interval = setInterval(() => {
      sdk.client.session.status({}).then((res) => {
        if (res.data) sync.set("session_status", res.data)
      })
    }, 3000)
    onCleanup(() => clearInterval(interval))
  })

  // ── MCP ──
  const mcpList = createMemo(() => {
    const data = sync.data.mcp
    if (!data) return []
    return pipe(
      data,
      entries(),
      sortBy(([name]) => name),
      map(([name, status]) => ({ name, status })),
    )
  })
  const mcpNotes = (): Record<string, string> => kv.get("sidebar_mcp_notes", {})
  const setMcpNote = async (name: string) => {
    const notes = { ...mcpNotes() }
    const note = await DialogPrompt.show(dialog, `Note for ${name}`, { value: notes[name] ?? "" })
    if (note === null) return
    notes[name] = note || ""
    kv.set("sidebar_mcp_notes", notes)
  }

  // ── Skills ──
  const [skills] = createResource(async () => {
    const res = await sdk.client.v2.skill.list({ location: {} })
    return (res.data?.data ?? []) as Array<{ name: string; description?: string }>
  })
  const skillNotes = (): Record<string, string> => kv.get("sidebar_skill_notes", {})
  const setSkillNote = async (name: string) => {
    const notes = { ...skillNotes() }
    const note = await DialogPrompt.show(dialog, `Note for ${name}`, { value: notes[name] ?? "" })
    if (note === null) return
    notes[name] = note || ""
    kv.set("sidebar_skill_notes", notes)
  }

  // ── Tasks ──
  const [tasks, setTasks] = createSignal<CronTask[]>([])
  createEffect(() => { setTasks(kv.get("scheduled_tasks", [] as CronTask[])) })
  const saveTasks = (list: CronTask[]) => kv.set("scheduled_tasks", list)

  const handleAddTask = async () => {
    const name = await DialogPrompt.show(dialog, "Task name", { value: "" })
    if (!name) return
    const prompt = await DialogPrompt.show(dialog, "Prompt", { value: "" })
    if (!prompt) return
    const expr = await DialogPrompt.show(dialog, "Cron (*/5=5分 0 *=1时 0 9=天9点)", { value: "*/5" })
    if (!expr) return
    const list = kv.get("scheduled_tasks", [] as CronTask[])
    list.push({
      id: Math.random().toString(36).slice(2, 10),
      name, prompt, cron: expr, enabled: true,
      createdAt: Date.now(),
      nextRun: cronNext(expr, Date.now()),
    })
    saveTasks(list)
    setTasks([...list])
  }

  const handleToggleTask = (id: string) => {
    const list = kv.get("scheduled_tasks", [] as CronTask[])
    const t = list.find((x) => x.id === id)
    if (t) { t.enabled = !t.enabled; saveTasks(list); setTasks([...list]) }
  }

  const handleDeleteTask = (id: string) => {
    const list = kv.get("scheduled_tasks", [] as CronTask[]).filter((x) => x.id !== id)
    saveTasks(list)
    setTasks([...list])
  }

  createEffect(() => {
    const interval = setInterval(async () => {
      const list = kv.get("scheduled_tasks", [] as CronTask[])
      const now = Date.now()
      let changed = false
      for (const t of list) {
        if (!t.enabled) continue
        if (t.nextRun && t.nextRun <= now) {
          const agent = local.agent.current()
          sdk.client.session.prompt({
            sessionID: props.sessionID,
            agent: agent?.name ?? "build",
            model: { provider: local.model.parsed().provider, model: local.model.parsed().model },
            parts: [{ type: "text", text: t.prompt }],
          }).then(() => {
            toast.show({ title: `Scheduled: ${t.name}`, message: t.prompt.slice(0, 60), variant: "info" })
          }).catch(() => {})
          t.lastRun = now
          t.nextRun = cronNext(t.cron, now + 60000)
          changed = true
        }
      }
      if (changed) { saveTasks(list); setTasks([...list]) }
    }, 10000)
    onCleanup(() => clearInterval(interval))
  })

  const mcpStatusColor = (status: string) => {
    if (status === "connected") return theme.success
    if (status === "failed") return theme.error
    return theme.textMuted
  }
  const mcpStatusDot = (status: string) => status === "connected" ? "●" : "○"

  return (
    <Show when={session()}>
      <box
        backgroundColor={theme.backgroundPanel}
        width={42}
        height="100%"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        position={props.overlay ? "absolute" : "relative"}
      >
        <scrollbox
          flexGrow={1}
          scrollAcceleration={scrollAcceleration()}
          verticalScrollbarOptions={{
            trackOptions: {
              backgroundColor: theme.background,
              foregroundColor: theme.borderActive,
            },
          }}
        >
          <box flexShrink={0} gap={1} paddingRight={1}>
            <pluginRuntime.Slot
              name="sidebar_title"
              mode="single_winner"
              session_id={props.sessionID}
              title={session()!.title}
              share_url={session()!.share?.url}
            >
              <box paddingRight={1}>
                <text fg={theme.text}><b>{session()!.title}</b></text>
                <Show when={InstallationChannel !== "latest"}>
                  <text fg={theme.textMuted}>{props.sessionID}</text>
                </Show>
                <Show when={session()!.workspaceID}>
                  <text fg={theme.textMuted}>
                    <Show when={workspace()} fallback={<WorkspaceLabel type="unknown" name={session()!.workspaceID!} status="error" icon />}>
                      {(item) => (
                        <WorkspaceLabel type={item().type} name={item().name} status={project.workspace.status(item().id) ?? "error"} icon />
                      )}
                    </Show>
                  </text>
                </Show>
                <Show when={session()!.share?.url}>
                  <text fg={theme.textMuted}>{session()!.share!.url}</text>
                </Show>
              </box>
            </pluginRuntime.Slot>

            <pluginRuntime.Slot name="sidebar_content" session_id={props.sessionID}>
              <Show when={history().length > 0}>
                <box paddingTop={2} gap={1}>
                  <box
                    flexDirection="row"
                    justifyContent="space-between"
                    border={["bottom"]}
                    borderColor={theme.border}
                  >
                    <text fg={theme.primary}><b>History</b></text>
                    <text fg={theme.secondary} onMouseUp={handleNewSession}>+ New</text>
                  </box>
                  <For each={history()}>
                    {(s) => {
                      const wrk = () => s.workspaceID ? project.workspace.get(s.workspaceID) : undefined
                      const wsStatus = () => s.workspaceID ? project.workspace.status(s.workspaceID) : undefined
                      const handleAddWorkspace = () => {
                        void import("../../component/dialog-workspace-create").then((mod) => {
                          mod.openWorkspaceSelect({
                            dialog, sdk, sync, project, toast,
                            onSelect: async (selection) => {
                              if (selection.type === "none") return
                              let workspaceID = selection.type === "existing" ? selection.workspaceID : undefined
                              if (selection.type === "new") {
                                const created = await sdk.client.experimental.workspace.create({
                                  type: selection.workspaceType,
                                  branch: null,
                                }).catch(() => undefined)
                                if (!created?.data?.id) return
                                workspaceID = created.data.id
                              }
                              await mod.warpWorkspaceSession({
                                dialog, sdk, sync, project, toast,
                                workspaceID,
                                sessionID: s.id,
                                copyChanges: false,
                              })
                            },
                          })
                        })
                      }
                      return (
                        <box gap={0} paddingLeft={1}
                          backgroundColor={isCurrent(s.id) ? theme.backgroundElement : undefined}>
                          <box flexDirection="row" alignItems="center" gap={1}>
                            <text fg={isCurrent(s.id) ? theme.primary : sessionStatusColor(s.id)}>
                              {isCurrent(s.id) ? "▶" : sessionStatusDot(s.id)}
                            </text>
                            <box flexGrow={1} gap={0}
                              onMouseUp={() => !isCurrent(s.id) && route.navigate({ type: "session", sessionID: s.id })}
                            >
                              <text fg={isCurrent(s.id) ? theme.primary : theme.text} wrapMode="ellipsis" width={26}>
                                {s.title}
                              </text>
                              <text fg={theme.textMuted}>
                                {Locale.todayTimeOrDateTime(s.time.updated)}
                              </text>
                            </box>
                            <Show when={!isCurrent(s.id)}>
                              <box paddingX={1} onMouseUp={() => handleRename(s.id, s.title)}>
                                <text fg={theme.textMuted}>r</text>
                              </box>
                              <box paddingX={1} onMouseUp={() => handleDelete(s.id)}>
                                <text fg={deleting() === s.id ? theme.error : theme.textMuted}>
                                  {deleting() === s.id ? "✗ DEL" : "✕"}
                                </text>
                              </box>
                            </Show>
                          </box>
                          <box paddingLeft={4} gap={1} flexDirection="row" alignItems="center">
                            <Show when={wrk()} fallback={
                              <box onMouseUp={handleAddWorkspace}>
                                <text fg={theme.textMuted}><i>+w</i></text>
                              </box>
                            }>
                              {(item) => (
                                <text fg={wsStatus() === "connected" ? theme.success : theme.textMuted}>
                                  ● {item().name} ({item().type})
                                </text>
                              )}
                            </Show>
                          </box>
                        </box>
                      )
                    }}
                  </For>
                </box>
              </Show>

              <box paddingTop={2} gap={1}>
                <box border={["bottom"]} borderColor={theme.border}>
                  <text fg={theme.primary}><b>Model</b></text>
                </box>
                <box paddingLeft={1} onMouseUp={() => dialog.replace(() => <DialogModel />)}>
                  <text fg={theme.accent} wrapMode="ellipsis" width={34}>
                    {local.model.parsed().provider} / {local.model.parsed().model}
                  </text>
                </box>
              </box>

              <Show when={mcpList().length > 0}>
                <box paddingTop={2} gap={1}>
                  <box flexDirection="row" justifyContent="space-between" border={["bottom"]} borderColor={theme.border}>
                    <text fg={theme.primary}><b>MCP</b></text>
                    <text fg={theme.textMuted} onMouseUp={() => dialog.replace(() => <DialogMcp />)}>manage</text>
                  </box>
                  <For each={mcpList()}>
                    {(m) => {
                      const notes = mcpNotes()
                      const note = notes[m.name]
                      return (
                        <box flexDirection="row" alignItems="center" gap={1} paddingLeft={1}>
                          <text fg={mcpStatusColor(m.status.status)}>{mcpStatusDot(m.status.status)}</text>
                          <box flexGrow={1}>
                            <text fg={theme.text} wrapMode="ellipsis" width={24}>{m.name}</text>
                            <Show when={note}>
                              <text fg={theme.textMuted} wrapMode="ellipsis" width={28}
                                onMouseUp={() => setMcpNote(m.name)}>{note}</text>
                            </Show>
                          </box>
                          <box paddingX={1} onMouseUp={() => local.mcp.toggle(m.name).then(() => {
                            sdk.client.mcp.status().then((s) => { if (s.data) sync.set("mcp", s.data) })
                          })}>
                            <text fg={m.status.status === "connected" ? theme.success : theme.textMuted}>
                              {m.status.status === "connected" ? "ON" : "OFF"}
                            </text>
                          </box>
                          <box paddingX={1} onMouseUp={() => setMcpNote(m.name)}>
                            <text fg={note ? theme.secondary : theme.textMuted}>m</text>
                          </box>
                        </box>
                      )
                    }}
                  </For>
                </box>
              </Show>

              <Show when={skills() && skills()!.length > 0}>
                <box paddingTop={2} gap={1}>
                  <box border={["bottom"]} borderColor={theme.border}>
                    <text fg={theme.primary}><b>Skills</b></text>
                  </box>
                  <For each={skills()}>
                    {(s) => {
                      const notes = skillNotes()
                      const note = notes[s.name]
                      return (
                        <box flexDirection="row" alignItems="center" gap={1} paddingLeft={1}>
                          <text fg={theme.primary}>◆</text>
                          <box flexGrow={1}>
                            <text fg={theme.text} wrapMode="ellipsis" width={24}>{s.name}</text>
                            <Show when={note}>
                              <text fg={theme.textMuted} wrapMode="ellipsis" width={28}
                                onMouseUp={() => setSkillNote(s.name)}>{note}</text>
                            </Show>
                          </box>
                          <box paddingX={1} onMouseUp={() => setSkillNote(s.name)}>
                            <text fg={note ? theme.secondary : theme.textMuted}>m</text>
                          </box>
                        </box>
                      )
                    }}
                  </For>
                </box>
              </Show>

              <box paddingTop={2} gap={1}>
                <box flexDirection="row" justifyContent="space-between" border={["bottom"]} borderColor={theme.border}>
                  <text fg={theme.primary}><b>Scheduled</b></text>
                  <text fg={theme.secondary} onMouseUp={handleAddTask}>+</text>
                </box>
                <text fg={theme.textMuted}>
                  */5=5分  */30=30分  0 *=1时  0 9=天9点  0,30=每时0/30分
                </text>
                <Show when={tasks().length === 0}>
                  <text fg={theme.textMuted} paddingLeft={1}>点 + 添加定时任务</text>
                </Show>
                <For each={tasks()}>
                  {(t) => (
                    <box flexDirection="row" alignItems="center" gap={1} paddingLeft={1}>
                      <text fg={t.enabled ? theme.success : theme.textMuted}>●</text>
                      <box flexGrow={1}>
                        <text fg={theme.text} wrapMode="ellipsis" width={24}>{t.name}</text>
                        <text fg={theme.textMuted} wrapMode="ellipsis" width={28}>
                          {t.nextRun ? Locale.todayTimeOrDateTime(t.nextRun) : "-"}
                        </text>
                      </box>
                      <box paddingX={1} onMouseUp={() => handleToggleTask(t.id)}>
                        <text fg={t.enabled ? theme.success : theme.textMuted}>{t.enabled ? "ON" : "OFF"}</text>
                      </box>
                      <box paddingX={1} onMouseUp={() => handleDeleteTask(t.id)}>
                        <text fg={theme.textMuted}>✕</text>
                      </box>
                    </box>
                  )}
                </For>
              </box>
            </pluginRuntime.Slot>
          </box>
        </scrollbox>

        <box flexShrink={0} gap={1} paddingTop={1}>
          <pluginRuntime.Slot name="sidebar_footer" mode="single_winner" session_id={props.sessionID}>
            <text fg={theme.textMuted}>
              <span style={{ fg: theme.success }}>•</span> <b>Open</b>
              <span style={{ fg: theme.text }}><b>Code</b></span>{" "}
              <span>{InstallationVersion}</span>
            </text>
          </pluginRuntime.Slot>
        </box>
      </box>
    </Show>
  )
}
