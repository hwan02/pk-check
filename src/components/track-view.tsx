"use client";

import { useEffect } from "react";
import { addToRecentlyViewed } from "./recently-viewed";

export default function TrackView({
  id,
  title,
  image_url,
  price_usd,
}: {
  id: string;
  title: string;
  image_url: string | null;
  price_usd: number;
}) {
  useEffect(() => {
    addToRecentlyViewed({ id, title, image_url, price_usd });
  }, [id, title, image_url, price_usd]);

  return null;
}
