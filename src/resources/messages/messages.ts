import type { Anthropic, APIPromise } from '@anthropic-ai/sdk';
import { Messages } from '@anthropic-ai/sdk/resources';
import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages.js';
import type { Stream } from '@anthropic-ai/sdk/streaming';

import type { PangeaAnthropic } from '../../client.js';
import { PangeaAIGuardBlockedError } from '../../core/error.js';

function isTextBlock(
  x: Anthropic.Messages.ContentBlockParam | Anthropic.Messages.ContentBlock
): x is Anthropic.Messages.TextBlock {
  return x.type === 'text';
}

function toPangeaMessages(
  message: Anthropic.Messages.MessageParam
): { role: 'user' | 'assistant'; content: string }[] {
  if (typeof message.content === 'string') {
    return [{ role: message.role, content: message.content }];
  }
  if (message.content) {
    return message.content.filter(isTextBlock).map(({ text }) => ({
      role: message.role,
      content: text,
    }));
  }
  return [];
}

export class PangeaMessages extends Messages {
  protected _client: PangeaAnthropic;

  constructor(client: PangeaAnthropic) {
    super(client);
    this._client = client;
  }

  /**
   * Send a structured list of input messages with text and/or image content, and the
   * model will generate the next message in the conversation.
   *
   * The Messages API can be used for either single queries or stateless multi-turn
   * conversations.
   *
   * Learn more about the Messages API in our [user guide](/en/docs/initial-setup)
   *
   * @example
   * ```ts
   * const message = await client.messages.create({
   *   max_tokens: 1024,
   *   messages: [{ content: 'Hello, world', role: 'user' }],
   *   model: 'claude-sonnet-4-5-20250929',
   * });
   * ```
   */
  create(
    body: Anthropic.MessageCreateParamsNonStreaming,
    options?: Anthropic.RequestOptions
  ): APIPromise<Anthropic.Message>;
  create(
    body: Anthropic.MessageCreateParamsStreaming,
    options?: Anthropic.RequestOptions
  ): APIPromise<Stream<Anthropic.RawMessageStreamEvent>>;
  create(
    body: MessageCreateParamsBase,
    options?: Anthropic.RequestOptions
  ): APIPromise<Stream<Anthropic.RawMessageStreamEvent> | Anthropic.Message>;
  create(
    body: Anthropic.MessageCreateParams,
    options?: Anthropic.RequestOptions
  ):
    | APIPromise<Anthropic.Message>
    | APIPromise<Stream<Anthropic.RawMessageStreamEvent>> {
    if (body.stream) {
      return super.create(body, options);
    }

    let messages: {
      role: 'system' | 'user' | 'assistant' | 'developer';
      content: string;
    }[] = [];

    if (body.system) {
      messages.push({
        role: 'system',
        content:
          typeof body.system === 'string'
            ? body.system
            : body.system.join('\n'),
      });
    }

    messages = messages.concat(...body.messages.map(toPangeaMessages));

    return this._client.aiGuardClient
      .guard({ input: { messages }, recipe: this._client.pangeaInputRecipe })
      .then((inputGuardResponse) => {
        if (inputGuardResponse.result.blocked) {
          throw new PangeaAIGuardBlockedError();
        }

        if (
          inputGuardResponse.result.transformed &&
          inputGuardResponse.result.output
        ) {
          body.messages = inputGuardResponse.result.output as unknown as {
            role: 'user' | 'assistant';
            content: string;
          }[];
        }

        return super.create(body, options);
      })
      .then((response) => {
        return Promise.all([
          response,
          this._client.aiGuardClient.guard({
            input: {
              messages: messages.concat([
                {
                  role: 'assistant',
                  content: response.content
                    .filter(isTextBlock)
                    .map(({ text }) => text)
                    .join('\n'),
                },
              ]),
              recipe: this._client.pangeaOutputRecipe,
            },
          }),
        ]);
      })
      .then(([response, outputGuardResponse]) => {
        if (outputGuardResponse.result.blocked) {
          throw new PangeaAIGuardBlockedError();
        }

        if (
          outputGuardResponse.result.transformed &&
          outputGuardResponse.result.output
        ) {
          response.content = [
            {
              type: 'text',
              text:
                (
                  outputGuardResponse.result.output.messages as {
                    role: 'user' | 'assistant';
                    content: string;
                  }[]
                ).at(-1)?.content ?? '',
              citations: [],
            },
          ];
        }

        return response;
      }) as APIPromise<Anthropic.Message>;
  }
}
