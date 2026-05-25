import { describe, expect, it } from "vitest";
import { MAX_NOTE_AUDIO_SIZE, getNoteFileExtension, validateNoteAudioFile } from "@/lib/noteValidation";

function namedBlob(type: string, name: string, size = 1) {
  const blob = new Blob([new Uint8Array(size)], { type }) as Blob & { name: string };
  Object.defineProperty(blob, "name", { value: name });
  return blob;
}

describe("audio validation", () => {
  it("allows supported audio MIME types", () => {
    for (const type of ["audio/webm", "audio/mpeg", "audio/mp4", "audio/wav", "audio/aac", "audio/x-m4a"]) {
      expect(validateNoteAudioFile(new Blob(["x"], { type })).ok).toBe(true);
    }
  });

  it("allows m4a octet-stream by extension", () => {
    expect(validateNoteAudioFile(namedBlob("application/octet-stream", "voice.m4a")).ok).toBe(true);
  });

  it("rejects oversized audio", () => {
    expect(validateNoteAudioFile(namedBlob("audio/webm", "voice.webm", MAX_NOTE_AUDIO_SIZE + 1)).ok).toBe(false);
  });

  it("maps audio extensions", () => {
    expect(getNoteFileExtension(new Blob(["x"], { type: "audio/webm" }) as Blob & { name?: string })).toBe("webm");
    expect(getNoteFileExtension(namedBlob("application/octet-stream", "voice.m4a"))).toBe("m4a");
  });
});
