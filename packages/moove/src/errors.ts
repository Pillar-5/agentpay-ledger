export class MooveApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;
  readonly providerCode: string | undefined;

  constructor(args: { status: number; code: string; message: string; retryable?: boolean; providerCode?: string }) {
    super(args.message);
    this.name = "MooveApiError";
    this.status = args.status;
    this.code = args.code;
    this.retryable = args.retryable ?? false;
    this.providerCode = args.providerCode;
  }
}

export interface MooveErrorDetail {
  message: string;
  code: string;
}
