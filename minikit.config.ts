/**
 * MiniKit Configuration for Base Mini App
 * 
 * This file configures the manifest for your Mini App.
 * The accountAssociation needs to be generated using the Base Build tool:
 * https://www.base.dev/preview?tab=account
 */

const ROOT_URL = process.env.VITE_APP_URL || "https://your-app.vercel.app";

export const minikitConfig = {
  // Account association - generate this at https://www.base.dev/preview?tab=account
  // After deploying your app, paste your domain and follow instructions
  accountAssociation: {
    header: "",
    payload: "",
    signature: "",
  },
  
  miniapp: {
    version: "1",
    name: "Chess Battle",
    subtitle: "Play Chess for ETH on Base",
    description: "Multiplayer chess game with ETH betting. Create or join games, place your bets, and compete for the pot!",
    
    // URLs
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    
    // Images - replace with your actual images
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/splash.png`,
    heroImageUrl: `${ROOT_URL}/hero.png`,
    screenshotUrls: [
      `${ROOT_URL}/screenshot-1.png`,
      `${ROOT_URL}/screenshot-2.png`,
    ],
    
    // Branding
    splashBackgroundColor: "#1a1a2e",
    
    // Categorization
    primaryCategory: "games",
    tags: ["chess", "betting", "multiplayer", "eth", "pvp", "strategy"],
    
    // Open Graph metadata
    tagline: "Chess with ETH stakes",
    ogTitle: "Chess Battle - Play for ETH",
    ogDescription: "Challenge players to chess matches with ETH bets on Base",
    ogImageUrl: `${ROOT_URL}/og-image.png`,
  },
} as const;

export default minikitConfig;
