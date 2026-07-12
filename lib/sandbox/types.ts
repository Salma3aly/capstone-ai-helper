export type ComponentCategory =
  | "Board"
  | "Environmental"
  | "Distance & Motion"
  | "Output & Display"
  | "Input & User"
  | "Connectivity"
  | "Power & Control";

export type ProjectTrack = "classroom" | "school-fair" | "competition" | "exploring";

export interface Component {
  id: string;
  name: string;
  desc: string;
  category: ComponentCategory;
  icon: string;
  lang: "cpp" | "python" | "both";
  interface: "digital" | "analog" | "i2c" | "spi" | "uart" | "pwm" | "onewire" | "other";
  pinsRequired: number;
  voltage: 3.3 | 5 | "3.3-5";
  currentDrawMa: number;
  i2cAddress?: string;
  calibrationNote?: string;
}

export interface BoardSpec {
  id: string;
  name: string;
  logicVoltage: 3.3 | 5;
  digitalPins: string[];
  analogPins: string[];
  hasI2c: boolean;
  hasSpi: boolean;
  maxCurrentMa: number;
}

export interface WiringItem {
  component: string;
  connections: string[];
}

export interface RecommendResponse {
  boardId: string;
  sensorIds: string[];
  why: string;
}

export interface GenerateResponse {
  wiring: WiringItem[];
  code: string;
}

export interface ValidationIssue {
  severity: "error" | "warning" | "info";
  message: string;
  componentId?: string;
}

export interface ProjectRevision {
  timestamp: number;
  note: string;
  wiring: WiringItem[];
  code: string;
  board: string;
  sensors: string[];
}

export interface SavedProject {
  id: string;
  idea: string;
  board: string;
  boardId: string | null;
  sensors: string[];
  sensorNames: Record<string, string>;
  wiring: WiringItem[];
  code: string;
  language: string;
  createdAt: number;
  updatedAt: number;
  status: "idea" | "components" | "generated";
  track?: ProjectTrack;
  hypothesis?: string;
  revisions?: ProjectRevision[];
  published?: boolean;
}

export type Step = 1 | 2 | 3 | 4;

// ─── New Sandbox Project (software/app focus) ─────────────────────────

export type SandboxStage = "idea" | "analyzed" | "components" | "wiring" | "code";

export interface IdeaAnalysis {
  title: string;
  problem_statement: string;
  target_user: string;
  core_features: string[];
  out_of_scope: string[];
  clarifying_questions: string[];
}

export interface ComponentPage {
  name: string;
  purpose: string;
}

export interface DataModel {
  name: string;
  fields: string[];
}

export interface Integration {
  name: string;
  why: string;
}

export interface ComponentRecommendation {
  pages: ComponentPage[];
  data_models: DataModel[];
  integrations: Integration[];
  suggested_stack: {
    frontend: string;
    backend: string;
    database: string;
  };
}

export interface WiringNode {
  id: string;
  label: string;
  type: "page" | "service" | "database" | "external";
}

export interface WiringEdge {
  from: string;
  to: string;
  label: string;
}

export interface WiringDiagram {
  nodes: WiringNode[];
  edges: WiringEdge[];
}

export interface CodeFile {
  path: string;
  content: string;
}

export interface CodeGeneration {
  files: CodeFile[];
  readme: string;
}

export interface SandboxProject {
  id: string;
  userId: string;
  title: string;
  rawIdea: string;
  stage: SandboxStage;
  analysis: IdeaAnalysis | null;
  components: ComponentRecommendation | null;
  wiring: WiringDiagram | null;
  code: CodeGeneration | null;
  createdAt: number;
  updatedAt: number;
  hardwareBoard?: string;
  hardwareSensors?: string[];
  sensorNames?: Record<string, string>;
  hardwareWiring?: WiringItem[];
}
