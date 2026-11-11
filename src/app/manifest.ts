import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kitty Tinder",
    short_name: "Kitty Tinder",
    description: "Find your perfect ragdoll cat",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fdf6ee",
    theme_color: "#fdf6ee",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
