import admin from 'firebase-admin';
import { generateContent } from '../lib/ai.ts';
import { generateImageViaCloudflare } from '../lib/imageGen.ts';
import { uploadToR2Temp } from '../lib/r2.ts';
import { publishToInstagram } from '../lib/instagram.ts';

const db = admin.firestore();

export async function createCampaign(userId: string, data: { idea: string, tone: string, audience: string, frequency: string, preferredHours: string[] }) {
  const campaignRef = db.collection('campaigns').doc();
  const now = admin.firestore.FieldValue.serverTimestamp();
  
  const campaign = {
    id: campaignRef.id,
    userId,
    idea: data.idea,
    tone: data.tone,
    targetAudience: data.audience,
    frequency: data.frequency,
    preferredHours: data.preferredHours,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
  };

  await campaignRef.set(campaign);

  // Generate scheduled posts for 7 days
  const scheduledPosts = [];
  const days = 7;
  // Parse frequency: "2 per day" or "1 per day"
  const postsPerDay = parseInt(data.frequency) || 1;
  const hours = data.preferredHours.length > 0 ? data.preferredHours : ['09:00', '18:00'];

  for (let d = 0; d < days; d++) {
    for (let p = 0; p < postsPerDay; p++) {
      const hourStr = hours[p % hours.length];
      const [hour, minute] = hourStr.split(':').map(Number);
      
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + d + 1); // Start tomorrow
      scheduledDate.setHours(hour, minute, 0, 0);

      scheduledPosts.push({
        campaignId: campaignRef.id,
        scheduledTime: admin.firestore.Timestamp.fromDate(scheduledDate),
        status: 'pending',
        retryCount: 0,
      });
    }
  }

  const batch = db.batch();
  scheduledPosts.forEach(post => {
    const ref = db.collection('scheduled_posts').doc();
    batch.set(ref, post);
  });
  await batch.commit();

  return campaign;
}

export async function processSinglePost(postId: string) {
  const postRef = db.collection('scheduled_posts').doc(postId);
  const postDoc = await postRef.get();
  if (!postDoc.exists) throw new Error("Post not found");
  
  const postData = postDoc.data()!;
  if (postData.status === 'posted') return;

  await postRef.update({ status: 'processing' });

  try {
    const campaignId = postData.campaignId;
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
    if (!campaignDoc.exists) throw new Error("Campaign not found");
    const campaign = campaignDoc.data()!;

    // 1. Generate text
    const { caption, hashtags, imagePrompt } = await generateContent({
      idea: campaign.idea,
      tone: campaign.tone,
      audience: campaign.targetAudience
    });

    // 2. Generate image
    const imageBuffer = await generateImageViaCloudflare(imagePrompt);

    // 3. Upload to R2
    const tempUrl = await uploadToR2Temp(imageBuffer, `post_${postId}.png`);

    // 4. Publish to Instagram
    const fullCaption = `${caption}\n\n${hashtags}`;
    const instaId = await publishToInstagram(tempUrl, fullCaption);

    // 5. Update campaign & post
    await db.collection('campaigns').doc(campaignId).update({
      generatedCaption: caption,
      generatedHashtags: hashtags,
      generatedImagePrompt: imagePrompt,
      instagramPostId: instaId,
      status: 'posted',
      postedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await postRef.update({ status: 'posted' });
  } catch (error: any) {
    console.error(`Error processing post ${postId}:`, error);
    await postRef.update({ 
      status: 'failed', 
      retryCount: (postData.retryCount || 0) + 1,
      error: error.message 
    });
    throw error;
  }
}
