export type DataActionResult<Errors = never> = {
  ok: boolean;
  changed: boolean;
  message?: string;
  errors?: Errors;
};

export type DataChangeOrigin = "hydrate" | "local" | "remote" | "cross-tab";
