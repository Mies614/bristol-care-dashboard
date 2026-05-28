"use client";

import { useEffect } from "react";

export function useAppSafeArea() {
  useEffect(() => {
    function setVar() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--app-vh", `${vh}px`);
      // Also set safe area variables
      document.documentElement.style.setProperty(
        "--sat",
        getComputedStyle(document.documentElement).getPropertyValue("--sat") || "0px"
      );
      document.documentElement.style.setProperty(
        "--sab",
        getComputedStyle(document.documentElement).getPropertyValue("--sab") || "0px"
      );
    }
    setVar();
    window.addEventListener("resize", setVar);
    window.addEventListener("orientationchange", () => setTimeout(setVar, 100));
    return () => {
      window.removeEventListener("resize", setVar);
      window.removeEventListener("orientationchange", () => setTimeout(setVar, 100));
    };
  }, []);
}