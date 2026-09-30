// Обёртка над fetch с автоматическим повтором при потере интернет-соединения.
// Повторяет запрос ТОЛЬКО при сетевых сбоях (нет соединения, обрыв связи) —
// если сервер ответил (даже с ошибкой 4xx/5xx), это не сетевая проблема и повтор не делается,
// чтобы не дублировать операции сохранения на сервере.
interface RetryOptions {
  retries?: number;
  retryDelayMs?: number;
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function waitForOnline(timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    if (isOnline()) { resolve(); return; }
    const onOnline = () => { cleanup(); resolve(); };
    const timer = setTimeout(() => { cleanup(); resolve(); }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
    window.addEventListener("online", onOnline);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  input: string,
  init: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const { retries = 3, retryDelayMs = 1500 } = retryOptions;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(input, init);
    } catch (e) {
      lastError = e;
      if (attempt < retries) {
        // Ждём восстановления сети (но не дольше времени задержки) и пробуем снова
        await Promise.race([waitForOnline(retryDelayMs), sleep(retryDelayMs)]);
        await sleep(retryDelayMs * attempt);
        continue;
      }
    }
  }
  throw lastError;
}
