import { prismaClient } from "../client/db";
import { redisClient } from "../client/redis";

export interface CreateTweetPayload {
  imageData: any;
  content: string;
  imageURL?: string; // Optional in the payload
  userId: string;
}

class TweetService {
  public static async createTweet(data: CreateTweetPayload) {
    const rateLimitFlag = await redisClient.get(
      `RATE_LIMIT:TWEET:${data.userId}`
    );

    if (rateLimitFlag) throw new Error("Please Wait...");

    // Ensure imageURL is a string; provide a default value if undefined
    const tweet = await prismaClient.tweet.create({
      data: {
        content: data.content,
        imageURL: data.imageURL || '', // Default to empty string if undefined
        author: { connect: { id: data.userId } },
      },
    });

    await redisClient.setex(`RATE_LIMIT:TWEET:${data.userId}`, 10, "1");
    await redisClient.del("ALL_TWEETS"); // Use del to clear the cache

    return tweet;
  }

  public static async getAllTweets() {
    const cachedTweets = await redisClient.get("ALL_TWEETS");
    if (cachedTweets) return JSON.parse(cachedTweets);

    const tweets = await prismaClient.tweet.findMany({
      orderBy: { createdAt: "desc" },
    });

    await redisClient.set("ALL_TWEETS", JSON.stringify(tweets));
    return tweets;
  }
}

export default TweetService;
