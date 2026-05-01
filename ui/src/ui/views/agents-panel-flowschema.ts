import { html, nothing } from "lit";

// ---------------------------------------------------------------------------
// Types mirroring the schema-api response shapes
// ---------------------------------------------------------------------------

type SourceTopic = { name: string; domain: string; format: string };
type Field       = { name: string; type: string; required: boolean; kind: string };
type Metric      = { name: string; type: string; core: boolean; description: string };

type FieldEntry  = { field: Field; sourceTopic: string | null; schemaVersion: number; addedIn?: string };
type MetricEntry = { metric: Metric; schemaVersion: number; addedIn?: string };

type FlowTypeDetail = {
  id: string;
  displayName: string;
  domainNode: string;
  version: number;
  inputSchemaSubject: string;
  outputSchemaSubject: string;
  input: {
    requiredFields: FieldEntry[];
    optionalFields: FieldEntry[];
    allowedSourceTopics: SourceTopic[];
  };
  output: {
    coreMetrics: MetricEntry[];
    extendedMetrics: MetricEntry[];
  };
};

type GraphNode = {
  id: string; label: string; type: string;
  required?: boolean; kind?: string; core?: boolean;
  domain?: string; schemaVersion?: number;
};
type GraphEdge = { from: string; to: string; type: string };
type GraphData  = { nodes: GraphNode[]; edges: GraphEdge[] };

export type FlowSchemaState = {
  loading: boolean;
  error: string | null;
  flowTypes: Array<{ id: string; displayName: string; version: number }>;
  selectedId: string | null;
  detail: FlowTypeDetail | null;
  graphData: GraphData | null;
  view: "editor" | "graph";
  saving: boolean;
  saveMsg: string | null;
  registerResult: unknown | null;
};

export const FLOW_SCHEMA_INITIAL: FlowSchemaState = {
  loading: false,
  error: null,
  flowTypes: [],
  selectedId: null,
  detail: null,
  graphData: null,
  view: "editor",
  saving: false,
  saveMsg: null,
  registerResult: null,
};

const API = "http://localhost:8009";

// ---------------------------------------------------------------------------
// Data loading helpers (called from app-render.ts)
// ---------------------------------------------------------------------------

export async function loadFlowTypes(
  update: (patch: Partial<FlowSchemaState>) => void,
) {
  update({ loading: true, error: null });
  try {
    const res  = await fetch(`${API}/flowtypes`);
    const data = await res.json() as Array<{ id: string; displayName: string; version: number }>;
    update({ loading: false, flowTypes: data });
  } catch (e) {
    update({ loading: false, error: String(e) });
  }
}

export async function loadFlowTypeDetail(
  update: (patch: Partial<FlowSchemaState>) => void,
  flowTypeId: string,
) {
  update({ loading: true, error: null, detail: null, graphData: null, selectedId: flowTypeId });
  try {
    const [detailRes, graphRes] = await Promise.all([
      fetch(`${API}/flowtypes/${flowTypeId}`),
      fetch(`${API}/flowtypes/${flowTypeId}/graph`),
    ]);
    const detail = await detailRes.json() as FlowTypeDetail;
    const graph  = await graphRes.json() as GraphData;
    update({ loading: false, detail, graphData: graph });
  } catch (e) {
    update({ loading: false, error: String(e) });
  }
}

export async function registerFlowTypeSchemas(
  update: (patch: Partial<FlowSchemaState>) => void,
  flowTypeId: string,
) {
  update({ saving: true, saveMsg: null, registerResult: null });
  try {
    const res  = await fetch(`${API}/flowtypes/${flowTypeId}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputSchemaVersion: 1, outputSchemaVersion: 1 }),
    });
    const data = await res.json();
    const inp  = (data as { inputSchema?: { schemaId?: number } }).inputSchema;
    const out  = (data as { outputSchema?: { schemaId?: number } }).outputSchema;
    update({
      saving: false,
      registerResult: data,
      saveMsg: `Schemas registered — input id=${inp?.schemaId} · output id=${out?.schemaId}`,
    });
  } catch (e) {
    update({ saving: false, error: String(e) });
  }
}

// ---------------------------------------------------------------------------
// Graph layout — radial tiers
// ---------------------------------------------------------------------------

type PositionedNode = GraphNode & { x: number; y: number; r: number };

function layoutGraph(data: GraphData): PositionedNode[] {
  const cx = 380, cy = 295;
  const byType: Record<string, GraphNode[]> = {};
  for (const n of data.nodes) {
    (byType[n.type] ??= []).push(n);
  }

  const positioned: PositionedNode[] = [];

  for (const n of byType["flowtype"] ?? []) {
    positioned.push({ ...n, x: cx, y: cy, r: 38 });
  }

  const topics = byType["sourcetopic"] ?? [];
  topics.forEach((n, i) => {
    const angle = -Math.PI * 0.55 + (i / Math.max(topics.length - 1, 1)) * Math.PI * 1.1;
    positioned.push({ ...n, x: cx + 165 * Math.cos(angle), y: cy + 115 * Math.sin(angle), r: 22 });
  });

  const fields = byType["field"] ?? [];
  fields.forEach((n, i) => {
    const angle = Math.PI * 0.08 + (i / Math.max(fields.length - 1, 1)) * Math.PI * 0.84;
    positioned.push({ ...n, x: cx + 248 * Math.cos(angle), y: cy + 218 * Math.sin(angle), r: 15 });
  });

  const metrics = byType["metric"] ?? [];
  metrics.forEach((n, i) => {
    const angle = Math.PI * 0.88 + (i / Math.max(metrics.length - 1, 1)) * Math.PI * 1.24;
    positioned.push({ ...n, x: cx + 318 * Math.cos(angle), y: cy + 265 * Math.sin(angle), r: 13 });
  });

  return positioned;
}

const NODE_COLORS: Record<string, string> = {
  flowtype:    "#6366f1",
  sourcetopic: "#0ea5e9",
  field:       "#10b981",
  metric:      "#f59e0b",
};
const EDGE_COLORS: Record<string, string> = {
  required:       "#10b981",
  optional:       "#475569",
  allowed_source: "#0ea5e9",
  comes_from:     "#334155",
  core_metric:    "#ef4444",
  metric:         "#f59e0b",
};

function renderGraph(data: GraphData) {
  const nodes   = layoutGraph(data);
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const svgW = 760, svgH = 590;

  return html`
    <svg viewBox="0 0 ${svgW} ${svgH}"
      style="width:100%;height:470px;background:#0f172a;border-radius:8px;display:block;">

      <!-- Legend -->
      ${(["flowtype","sourcetopic","field","metric"] as const).map((t, i) => html`
        <circle cx=${14 + i * 150} cy="16" r="5" fill=${NODE_COLORS[t]}></circle>
        <text x=${23 + i * 150} y="20" fill="#64748b" font-size="10" font-family="monospace">${t}</text>
      `)}

      <!-- Edges -->
      ${data.edges.map(e => {
        const s = nodeMap.get(e.from), d = nodeMap.get(e.to);
        if (!s || !d) return nothing;
        return html`<line
          x1=${s.x} y1=${s.y} x2=${d.x} y2=${d.y}
          stroke=${EDGE_COLORS[e.type] ?? "#1e293b"}
          stroke-width=${e.type === "required" || e.type === "core_metric" ? "2" : "1"}
          stroke-dasharray=${e.type === "optional" || e.type === "comes_from" ? "4,3" : "none"}
          opacity="0.55">
        </line>`;
      })}

      <!-- Nodes -->
      ${nodes.map(n => {
        const fill   = NODE_COLORS[n.type] ?? "#6b7280";
        const dimmed = n.schemaVersion === 2;
        const label  = n.label.length > 17 ? n.label.slice(0, 15) + "…" : n.label;
        const badge  = n.type === "field"  ? (n.kind === "computed" ? "∿" : "→")
                     : n.type === "metric" ? (n.core ? "★" : "◇") : "";
        return html`
          <circle cx=${n.x} cy=${n.y} r=${n.r}
            fill=${fill} opacity=${dimmed ? "0.45" : "0.9"}
            stroke="white" stroke-width="1">
          </circle>
          ${badge ? html`<text x=${n.x} y=${n.y + 4}
            text-anchor="middle" fill="white"
            font-size="10" font-weight="700" font-family="monospace">${badge}</text>` : nothing}
          <text x=${n.x} y=${n.y + n.r + 10}
            text-anchor="middle"
            fill=${dimmed ? "#64748b" : "#cbd5e1"}
            font-size="8.5" font-family="monospace">${label}</text>
        `;
      })}
    </svg>
    <div style="margin-top:6px;display:flex;gap:16px;flex-wrap:wrap">
      <span style="font-size:11px;color:#64748b">● v1 active &nbsp; ◑ v2 planned (dimmed)</span>
      <span style="font-size:11px;color:#64748b">→ direct &nbsp; ∿ computed &nbsp; ★ core metric &nbsp; ◇ extended</span>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Input schema table
// ---------------------------------------------------------------------------

function renderInputTable(detail: FlowTypeDetail) {
  const all = [
    ...detail.input.requiredFields.map(e => ({ ...e, isRequired: true })),
    ...detail.input.optionalFields.map(e => ({ ...e, isRequired: false })),
  ];
  return html`
    <div class="card" style="margin-bottom:12px">
      <div style="margin-bottom:12px">
        <div class="card-title">Input Schema</div>
        <div class="card-sub">
          Subject: <code>${detail.inputSchemaSubject}</code>
          &nbsp;·&nbsp; Allowed sources:
          ${detail.input.allowedSourceTopics.map(t => html`
            <code style="color:#0ea5e9;margin-left:4px">${t.name}</code>
          `)}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="border-bottom:1px solid var(--c-border)">
          ${["Field","Type","Kind","Source Topic","Required","Schema v"].map(h => html`
            <th style="text-align:left;padding:5px 8px;color:var(--c-text-secondary);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em">${h}</th>
          `)}
        </tr></thead>
        <tbody>
          ${all.map((e, i) => html`
            <tr style="border-bottom:1px solid var(--c-border);background:${i % 2 ? "var(--c-bg-2)" : "transparent"}">
              <td style="padding:5px 8px;font-family:monospace;font-weight:600;font-size:12px">${e.field.name}</td>
              <td style="padding:5px 8px">
                <span style="background:var(--c-bg-3,#1e293b);border-radius:3px;padding:1px 5px;font-size:11px;font-family:monospace">${e.field.type}</span>
              </td>
              <td style="padding:5px 8px;font-size:12px;color:${e.field.kind === "computed" ? "#f59e0b" : "#94a3b8"}">
                ${e.field.kind === "computed" ? "∿ computed" : "→ direct"}
              </td>
              <td style="padding:5px 8px;font-size:12px;color:#0ea5e9;font-family:monospace">${e.sourceTopic ?? "—"}</td>
              <td style="padding:5px 8px;text-align:center">
                ${e.isRequired
                  ? html`<span style="color:#10b981;font-weight:700">✓</span>`
                  : html`<span style="color:#475569">○</span>`}
              </td>
              <td style="padding:5px 8px;text-align:center">
                <span style="background:${e.schemaVersion === 1 ? "var(--c-primary,#6366f1)" : "#f59e0b"};color:white;border-radius:10px;padding:1px 7px;font-size:11px">v${e.schemaVersion}</span>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Output metrics table
// ---------------------------------------------------------------------------

function renderOutputTable(detail: FlowTypeDetail) {
  const all = [
    ...detail.output.coreMetrics.map(e => ({ ...e, isCore: true })),
    ...detail.output.extendedMetrics.map(e => ({ ...e, isCore: false })),
  ];
  return html`
    <div class="card">
      <div style="margin-bottom:12px">
        <div class="card-title">Output Metrics</div>
        <div class="card-sub">
          Subject: <code>${detail.outputSchemaSubject}</code>
          &nbsp;·&nbsp; ★ Core metrics are immutable across schema versions — they anchor cross-run comparison.
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="border-bottom:1px solid var(--c-border)">
          ${["Metric","Type","Description","Core","Schema v"].map(h => html`
            <th style="text-align:left;padding:5px 8px;color:var(--c-text-secondary);font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em">${h}</th>
          `)}
        </tr></thead>
        <tbody>
          ${all.map((e, i) => html`
            <tr style="border-bottom:1px solid var(--c-border);background:${i % 2 ? "var(--c-bg-2)" : "transparent"}">
              <td style="padding:5px 8px;font-family:monospace;font-weight:600;font-size:12px">${e.metric.name}</td>
              <td style="padding:5px 8px">
                <span style="background:var(--c-bg-3,#1e293b);border-radius:3px;padding:1px 5px;font-size:11px;font-family:monospace">${e.metric.type}</span>
              </td>
              <td style="padding:5px 8px;font-size:12px;color:var(--c-text-secondary)">${e.metric.description}</td>
              <td style="padding:5px 8px;text-align:center">
                ${e.isCore
                  ? html`<span style="color:#ef4444;font-size:14px" title="Core — cannot be removed">★</span>`
                  : html`<span style="color:#475569;font-size:13px">◇</span>`}
              </td>
              <td style="padding:5px 8px;text-align:center">
                <span style="background:${e.schemaVersion === 1 ? "var(--c-primary,#6366f1)" : "#f59e0b"};color:white;border-radius:10px;padding:1px 7px;font-size:11px">v${e.schemaVersion}</span>
              </td>
            </tr>
          `)}
        </tbody>
      </table>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Main panel export
// ---------------------------------------------------------------------------

export function renderAgentFlowSchema(params: {
  state: FlowSchemaState;
  onSelectFlowType: (id: string) => void;
  onSwitchView:     (v: "editor" | "graph") => void;
  onRegister:       (id: string) => void;
  onRefresh:        () => void;
}) {
  const { state } = params;

  return html`
    <section class="card">
      <!-- Header row -->
      <div class="row" style="justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div>
          <div class="card-title">FlowType Schema Registry</div>
          <div class="card-sub">
            Define input guardrails and output business metrics per DecisionFlow type.
            Changes persist to Memgraph. "Register Schemas" pushes formal JSON Schemas to Confluent Schema Registry.
          </div>
        </div>
        <div class="row" style="gap:8px;align-items:center;flex-wrap:wrap">
          ${state.detail ? html`
            <button class="btn btn--sm ${state.view === "editor" ? "btn--primary" : ""}"
              @click=${() => params.onSwitchView("editor")}>Editor</button>
            <button class="btn btn--sm ${state.view === "graph" ? "btn--primary" : ""}"
              @click=${() => params.onSwitchView("graph")}>Graph</button>
            <button class="btn btn--sm"
              style="background:#10b981;color:white;border-color:#10b981;${state.saving ? "opacity:.6" : ""}"
              ?disabled=${state.saving}
              @click=${() => state.selectedId && params.onRegister(state.selectedId)}>
              ${state.saving ? "Registering…" : "↑ Register Schemas"}
            </button>
          ` : nothing}
          <button class="btn btn--sm" @click=${params.onRefresh}>↺</button>
        </div>
      </div>

      <!-- FlowType pills -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:600;color:var(--c-text-secondary);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">Flow Type</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${state.loading && !state.flowTypes.length
            ? html`<span style="color:var(--c-text-secondary);font-size:13px">Loading…</span>`
            : state.flowTypes.map(ft => html`
              <button class="btn btn--sm"
                style="${state.selectedId === ft.id ? "background:var(--c-primary,#6366f1);color:white;border-color:var(--c-primary,#6366f1);" : ""}"
                @click=${() => params.onSelectFlowType(ft.id)}>
                ${ft.displayName}
                <span style="opacity:.55;margin-left:4px;font-size:10px">v${ft.version}</span>
              </button>
            `)
          }
        </div>
      </div>

      ${state.error ? html`<div class="callout danger" style="margin-bottom:12px">${state.error}</div>` : nothing}

      ${state.saveMsg ? html`
        <div class="callout" style="margin-bottom:12px;background:#064e3b;border-color:#10b981;color:#6ee7b7">
          ${state.saveMsg}
        </div>
      ` : nothing}

      ${state.loading && state.selectedId ? html`
        <div style="color:var(--c-text-secondary);font-size:13px;padding:24px 0;text-align:center">Loading schema…</div>
      ` : nothing}

      ${!state.loading && state.detail ? html`
        <!-- Stat pills -->
        <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
          ${[
            ["Domain",           state.detail.domainNode,                              "#94a3b8"],
            ["Required fields",  String(state.detail.input.requiredFields.length),     "#10b981"],
            ["Optional fields",  String(state.detail.input.optionalFields.length),     "#f59e0b"],
            ["Core metrics",     String(state.detail.output.coreMetrics.length),       "#ef4444"],
            ["Extended metrics", String(state.detail.output.extendedMetrics.length),   "#f59e0b"],
          ].map(([label, value, color]) => html`
            <div style="background:var(--c-bg-2);border:1px solid var(--c-border);border-radius:6px;padding:7px 14px">
              <div style="font-size:11px;color:var(--c-text-secondary);margin-bottom:2px">${label}</div>
              <div style="font-size:14px;font-weight:600;color:${color}">${value}</div>
            </div>
          `)}
        </div>

        ${state.view === "graph" && state.graphData
          ? html`
            <div class="card" style="background:var(--c-bg-2)">
              <div class="card-title" style="margin-bottom:10px">Schema Graph</div>
              ${renderGraph(state.graphData)}
            </div>
          `
          : html`
            ${renderInputTable(state.detail)}
            ${renderOutputTable(state.detail)}
          `
        }
      ` : nothing}

      ${!state.loading && !state.detail && !state.error ? html`
        <div style="text-align:center;padding:40px 0;color:var(--c-text-secondary);font-size:14px">
          Select a FlowType above to inspect its schema definition.
        </div>
      ` : nothing}
    </section>
  `;
}
