export class PangeaError extends Error {}

export class PangeaAIGuardBlockedError extends PangeaError {
  constructor() {
    super('Pangea AI Guard returned a blocked response.');
  }
}
