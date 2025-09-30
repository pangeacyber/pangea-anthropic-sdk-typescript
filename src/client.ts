import { Anthropic, type ClientOptions } from '@anthropic-ai/sdk';
import type * as API from '@anthropic-ai/sdk/resources';
import { AIGuardService, PangeaConfig } from 'pangea-node-sdk';

import * as Errors from './core/error.js';
import { readEnv } from './internal/utils/env.js';
import { PangeaMessages } from './resources';

export class PangeaAnthropic extends Anthropic {
  readonly aiGuardClient: AIGuardService;
  readonly pangeaInputRecipe: string | undefined;
  readonly pangeaOutputRecipe: string | undefined;

  constructor({
    baseURL = readEnv('ANTHROPIC_BASE_URL'),
    apiKey = readEnv('ANTHROPIC_API_KEY'),
    authToken = readEnv('ANTHROPIC_AUTH_TOKEN') ?? null,
    pangeaApiKey,
    pangeaInputRecipe,
    pangeaOutputRecipe,
    ...opts
  }: ClientOptions & {
    pangeaApiKey?: string;
    pangeaInputRecipe?: string;
    pangeaOutputRecipe?: string;
  } = {}) {
    if (!pangeaApiKey) {
      throw new Errors.PangeaError(
        'Missing credentials. Please pass a `pangeaApiKey`.'
      );
    }

    super({
      baseURL,
      apiKey,
      authToken,
      ...opts,
    });

    this.aiGuardClient = new AIGuardService(pangeaApiKey, new PangeaConfig());
    this.pangeaInputRecipe = pangeaInputRecipe;
    this.pangeaOutputRecipe = pangeaOutputRecipe;
  }

  messages: API.Messages = new PangeaMessages(this);
}
