export async function publishToInstagram(imageUrl: string, caption: string) {
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!businessId || !accessToken) {
    throw new Error("Instagram configuration missing");
  }

  // Step 1: create media container
  const containerUrl = `https://graph.facebook.com/v19.0/${businessId}/media`;
  const containerParams = new URLSearchParams({
    image_url: imageUrl,
    caption: caption.slice(0, 2200),
    access_token: accessToken
  });
  const containerRes = await fetch(`${containerUrl}?${containerParams}`, { method: 'POST' });
  const containerData = await containerRes.json();
  
  if (containerData.error) {
    throw new Error(`Instagram media container creation failed: ${JSON.stringify(containerData.error)}`);
  }
  
  const containerId = containerData.id;

  // Step 2: publish container
  const publishUrl = `https://graph.facebook.com/v19.0/${businessId}/media_publish`;
  const publishParams = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken
  });
  const publishRes = await fetch(`${publishUrl}?${publishParams}`, { method: 'POST' });
  const publishData = await publishRes.json();
  
  if (publishData.error) {
    throw new Error(`Instagram publishing failed: ${JSON.stringify(publishData.error)}`);
  }

  return publishData.id;
}
