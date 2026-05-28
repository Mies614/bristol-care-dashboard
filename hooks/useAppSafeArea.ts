"use client";

import { useEffect } from "react";

/**
 * Sets CSS custom properties for Safari safe areas and dynamic viewport height.
 * Call once in the root layout.
 */
export function useAppSafeArea() {
  useEffect(() => {
    function updateVH() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--app-vh", `${vh}px`);
    }

    updateVH();
    window.addEventListener("resize", updateVH);
    window.addEventListener("orientationchange", () => {
      setTimeout(updateVH, 150);
    });

    return () => {
      window.removeEventListener("resize", updateVH);
      window.removeEventListener("orientationchange", updateVH);
    };
  }, []);
}