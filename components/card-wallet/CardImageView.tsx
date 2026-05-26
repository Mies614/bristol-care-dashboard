"use client";

import { getAspectRatioValue, getCropTransform, type CardCrop } from "@/lib/cardWallet";

export function CardImageView({
  imageUrl,
  crop,
  alt,
  scan = false
}: {
  imageUrl: string;
  crop: CardCrop;
  alt: string;
  scan?: boolean;
}) {
  return (
    <div
      className={`${scan ? "w-full max-w-[92vw] bg-white" : "w-full bg-white"} relative overflow-hidden rounded-[1.4rem] border border-zinc-200`}
      style={{ aspectRatio: getAspectRatioValue(crop.aspectRatio) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        className="absolute left-1/2 top-1/2 max-w-none select-none"
        draggable={false}
        src={imageUrl}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: getCropTransform(crop),
          transformOrigin: `${crop.positionX}% ${crop.positionY}%`,
          imageRendering: "auto"
        }}
      />
    </div>
  );
}
