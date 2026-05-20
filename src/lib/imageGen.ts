export async function generateImageViaCloudflare(prompt: string) {
  const workerUrl = process.env.CF_WORKER_URL;
  if (!workerUrl) {
    throw new Error("CF_WORKER_URL is not defined");
  }
  const res = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Cloudflare Worker failed: ${res.status} ${errorBody}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
