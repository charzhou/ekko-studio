import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

function runPython(script: string): Record<string, unknown> {
  try {
    return JSON.parse(execFileSync('python3', ['-c', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    }))
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string }
    throw new Error([
      err.message || 'Python agent bridge disabled-toolsets test failed',
      err.stdout ? `stdout:\n${err.stdout}` : '',
      err.stderr ? `stderr:\n${err.stderr}` : '',
    ].filter(Boolean).join('\n\n'))
  }
}

/**
 * ``agent.disabled_toolsets`` must reach ``AIAgent`` or the block silently has no effect:
 * ``AIAgent`` only strips a toolset when the caller forwards the list
 * (``agent/agent_init.py::_load_tools``). The bridge used to pass ``enabled_toolsets`` alone,
 * so ``disabled_toolsets: [web, browser]`` worked in the CLI but not in Studio sessions.
 *
 * ``disabledExpr`` is a Python expression so each case can drive the loader's return value.
 */
function disabledToolsetsHarness(disabledExpr: string, summaryOnly = false): string {
  return String.raw`
import contextlib
import importlib.util
import json
import sys
import tempfile
import types
from pathlib import Path

bridge_runtime = types.ModuleType("bridge_runtime")
bridge_runtime.APPROVAL_TIMEOUT_MS = 1000
bridge_runtime.APPROVAL_TIMEOUT_SECONDS = 1
bridge_runtime._approval_pattern_keys = lambda *_args, **_kwargs: []
bridge_runtime._base_hermes_home = lambda: Path(tempfile.gettempdir())
bridge_runtime._bridge_platform = lambda: "agent-bridge"
bridge_runtime._cfg_max_turns = lambda *_args, **_kwargs: 20
bridge_runtime._discover_bridge_mcp_tools = lambda *_args, **_kwargs: []
bridge_runtime._ensure_agent_imports = lambda: None
bridge_runtime._hermes_home = lambda *_args, **_kwargs: Path(tempfile.gettempdir())
bridge_runtime._install_execute_code_approval_memory_patch = lambda *_args, **_kwargs: None
bridge_runtime._jsonable = lambda value: value
bridge_runtime._load_cfg = lambda *_args, **_kwargs: {}
bridge_runtime._load_disabled_toolsets = lambda *_args, **_kwargs: ${disabledExpr}
bridge_runtime._load_enabled_toolsets = lambda *_args, **_kwargs: []
bridge_runtime._load_fallback_model = lambda *_args, **_kwargs: None
bridge_runtime._load_reasoning_config = lambda *_args, **_kwargs: {}
bridge_runtime._load_service_tier = lambda *_args, **_kwargs: None
bridge_runtime._mcp_tool_names_from_names = lambda *_args, **_kwargs: []
bridge_runtime._persist_execute_code_approval_choice = lambda *_args, **_kwargs: None
bridge_runtime._profile_home = lambda *_args, **_kwargs: Path(tempfile.gettempdir())
bridge_runtime._refresh_approval_allowlist = lambda *_args, **_kwargs: None
bridge_runtime._refresh_worker_profile_env = lambda *_args, **_kwargs: None
bridge_runtime._resolve_model = lambda *_args, **_kwargs: "primary-model"
bridge_runtime._resolve_runtime = lambda *_args, **_kwargs: {"provider": "primary"}
bridge_runtime._suppress_bridge_platform_hint = lambda: None
bridge_runtime._title_user_message = lambda value: value
bridge_runtime._tool_names_from_definitions = lambda *_args, **_kwargs: []

@contextlib.contextmanager
def _profile_env(_profile):
    yield

bridge_runtime._profile_env = _profile_env
sys.modules["bridge_runtime"] = bridge_runtime

spec = importlib.util.spec_from_file_location(
    "bridge_pool",
    "packages/server/src/modules/hermes/services/bridge/python/bridge_pool.py",
)
bridge_pool = importlib.util.module_from_spec(spec)
assert spec.loader is not None
sys.modules["bridge_pool"] = bridge_pool
spec.loader.exec_module(bridge_pool)

run_agent = types.ModuleType("run_agent")
class AIAgent:
    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.tools = []
run_agent.AIAgent = AIAgent
sys.modules["run_agent"] = run_agent

pool = bridge_pool.AgentPool()
session = pool.get_or_create("session-1", summary_only=${summaryOnly ? 'True' : 'False'})
result = {
    "disabled_toolsets": session.agent.kwargs.get("disabled_toolsets"),
    "enabled_toolsets": session.agent.kwargs.get("enabled_toolsets"),
}
if ${summaryOnly ? 'True' : 'False'}:
    result.update({key: session.agent.kwargs.get(key) for key in (
        "max_iterations", "skip_context_files", "skip_memory", "skip_background_review", "session_db",
    )})
    result["tools"] = session.agent.tools
    result["background_delegation_enabled"] = session.config["background_delegation_enabled"]
    try:
        session.agent._execute_tool_calls({}, [], "summary-task")
    except RuntimeError as exc:
        result["tool_error"] = str(exc)
    try:
        pool.get_or_create("session-1", summary_only=False)
    except RuntimeError as exc:
        result["policy_change_error"] = str(exc)
print(json.dumps(result))
`
}

describe('Agent Bridge disabled toolsets', () => {
  it('forwards agent.disabled_toolsets to each newly created agent', () => {
    const result = runPython(disabledToolsetsHarness('["web", "browser"]'))

    expect(result).toEqual({
      disabled_toolsets: ['web', 'browser'],
      enabled_toolsets: [],
    })
  })

  it('passes None when agent.disabled_toolsets is unset', () => {
    const result = runPython(disabledToolsetsHarness('None'))

    expect(result).toEqual({
      disabled_toolsets: null,
      enabled_toolsets: [],
    })
  })

  it('isolates summary workers from tools, skills, memory, persistence, and background work', () => {
    expect(runPython(disabledToolsetsHarness('["web"]', true))).toEqual({
      disabled_toolsets: null, enabled_toolsets: [], max_iterations: 1,
      skip_context_files: true, skip_memory: true, skip_background_review: true,
      session_db: null, tools: [], background_delegation_enabled: false,
      tool_error: 'Tools are disabled for summary-only sessions',
      policy_change_error: "Cannot change an existing session's summary-only policy",
    })
  })

  it('forwards the summary policy at the worker boundary and retires only its dedicated broker worker', () => {
    const script = disabledToolsetsHarness('None', true).replace('print(json.dumps(result))', String.raw`
bridge_runtime.__getattr__ = lambda _name: (lambda *_args, **_kwargs: None)
transport = types.ModuleType("bridge_transport")
transport.__getattr__ = lambda _name: (lambda *_args, **_kwargs: None)
sys.modules["bridge_transport"] = transport

def load_module(name):
    spec = importlib.util.spec_from_file_location(name, "packages/server/src/modules/hermes/services/bridge/python/" + name + ".py")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

server_module = load_module("bridge_server")
class CapturePool:
    def start_chat(self, *args):
        self.args = args
        return types.SimpleNamespace(run_id="summary-run", status="running")
server = object.__new__(server_module.BridgeServer)
server.pool = CapturePool()
server.handle({"action": "chat", "session_id": "s", "message": "summarize", "summary_only": True})
assert server.pool.args[-1] is True
server.handle({"action": "chat", "session_id": "s", "message": "chat"})
assert server.pool.args[-1] is False

broker_module = load_module("bridge_broker")
broker = broker_module.BridgeBroker("ipc:///tmp/summary-fixture.sock")
class Worker:
    stopped = False
    def stop(self):
        self.stopped = True
worker = Worker()
key = "work:summary:summary-session"
broker._workers[key] = worker
broker._session_profile["summary-session"] = "work"
broker._session_worker_key["summary-session"] = key
broker._run_profile["summary-run"] = "work"
broker._run_worker_key["summary-run"] = key
# get_result does not need a worker key from the caller: admission records it.
assert broker._route_for_run("summary-run") == ("work", key)
destroyed = broker.handle({"action": "destroy", "session_id": "summary-session", "profile": "work", "worker_key": key, "stop_worker": True})
assert destroyed["worker_stopped"] and worker.stopped
assert key not in broker._workers and "summary-run" not in broker._run_worker_key
try:
    broker.handle({"action": "destroy", "session_id": "chat-session", "profile": "work", "worker_key": "work", "stop_worker": True})
except ValueError:
    pass
else:
    raise AssertionError("ordinary Profile worker must not be stopped by summary cleanup")
print(json.dumps({"summary_policy_forwarded": True, "worker_stopped": worker.stopped}))
`)
    expect(runPython(script)).toEqual({ summary_policy_forwarded: true, worker_stopped: true })
  })
})
