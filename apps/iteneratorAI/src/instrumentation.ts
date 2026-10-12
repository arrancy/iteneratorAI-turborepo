import { subscribeToPubSub } from "./redis/subscribeToChannel";

export async function register() {
  try {
    await subscribeToPubSub();
  } catch (error) {
    console.error(" : could not subscribe to pub/sub" + error);
  }
}
