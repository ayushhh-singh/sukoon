const CHAT_MODEL = 'gpt-4o';

export function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function streamChatCompletion(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: string) => void,
  options?: { maxTokens?: number; temperature?: number },
): Promise<void> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    onError('OpenAI API key not configured on the server.');
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        stream: true,
        temperature: options?.temperature ?? 0.85,
        max_tokens: options?.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      onError(`OpenAI API error: ${response.status} - ${errorBody}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError('No response body from OpenAI API.');
      return;
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          onDone(fullText);
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onDelta(content);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // In case stream ended without [DONE]
    if (fullText) {
      onDone(fullText);
    }
  } catch (error) {
    onError(`Chat completion failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
