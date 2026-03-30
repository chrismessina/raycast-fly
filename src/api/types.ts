// Application types (from GraphQL)
export interface Application {
  id: string;
  name: string;
  state: "DEPLOYED" | "SUSPENDED" | "DESTROYED";
  hostname?: string;
  createdAt: string;
  currentRelease?: Release;
  vmSize: {
    name: string;
    memoryMb: number;
    memoryGb: number;
  };
  autoscaling?: {
    enabled: boolean;
    strategy: string;
    minCount: number;
    maxCount: number;
  };
  organization: {
    name: string;
    type?: string;
  };
  regions?: { code: string }[];
  machines?: {
    nodes: MachineSummary[];
  };
  ipAddresses?: {
    nodes: IPAddress[];
  };
  volumes?: {
    nodes: Volume[];
  };
  certificates?: {
    nodes: { hostname: string }[];
  };
}

export interface MachineSummary {
  id: string;
  state: string;
  region: string;
}

// Machine types (from REST API)
export interface Machine {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
  config: MachineConfig;
  image_ref: {
    registry: string;
    repository: string;
    tag: string;
    digest: string;
    labels: Record<string, string> | null;
  };
  created_at: string;
  updated_at: string;
  events: MachineEvent[];
  checks?: Check[];
}

export interface MachineConfig {
  image: string;
  guest: {
    cpu_kind: string;
    cpus: number;
    memory_mb: number;
  };
  services?: Service[];
  mounts?: Mount[];
  env?: Record<string, string>;
  auto_destroy: boolean;
  restart: { policy: string };
}

export interface Service {
  internal_port: number;
  protocol: string;
  ports: {
    port: number;
    handlers: string[];
  }[];
  autostart: boolean;
  autostop: string | boolean;
}

export interface Mount {
  volume: string;
  path: string;
  size_gb?: number;
  name?: string;
}

export interface Check {
  name?: string;
  status: string;
  output?: string;
  updated_at?: string;
}

export interface MachineEvent {
  type: string;
  status: string;
  timestamp: number;
}

export interface Volume {
  id?: string;
  sizeGb: number;
  state: string;
  status: string;
  name: string;
  region: string;
}

export interface IPAddress {
  id?: string;
  type: string;
  address: string;
  createdAt?: string;
}

export interface Release {
  imageRef: string;
  createdAt: string;
  status: string;
}

export interface Secret {
  name: string;
  digest: string;
  createdAt: string;
}

// GraphQL response wrappers
export interface ApplicationsResponse {
  data: {
    apps: {
      nodes: Application[];
    };
  };
}

export interface AppDetailResponse {
  data: {
    app: Application & {
      secrets: Secret[];
    };
  };
}
