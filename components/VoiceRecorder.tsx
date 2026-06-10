"use client";

import { useEffect, useRef, useState } from "react";

const MAX_RECORDING_MS = 5 * 60 * 1000;

function chooseMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function VoiceRecorder({ onChange }: { onChange: (blob: Blob | null) => void }) {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined");
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const next = Date.now() - startRef.current;
      setDuration(next);
      if (next >= MAX_RECORDING_MS) stop();
    }, 500);
    return () => window.clearInterval(timer);
  }, [recording]);

  async function start() {
    if (!supported) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const mimeType = chooseMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      setAudioUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
      onChange(blob);
      stream.getTracks().forEach((track) => track.stop());
    };
    recorderRef.current = recorder;
    startRef.current = Date.now();
    setDuration(0);
    setRecording(true);
    recorder.start();
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  function clear() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl("");
    setDuration(0);
    onChange(null);
  }

  const seconds = Math.floor(duration / 1000);

  return (
    <div className="rounded-[1.35rem] border border-white/70 bg-white/55 p-3 text-sm text-cocoa/70 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {supported ? (
          recording ? (
            <button className="btn-danger btn-small" type="button" onClick={stop} aria-label="停止录音">停止录音 {seconds}s</button>
          ) : (
            <button className="btn-secondary btn-small" type="button" onClick={start} aria-label="开始录音">开始录音</button>
          )
        ) : <span className="text-xs">当前浏览器暂不支持网页录音，可以上传一段已有音频。</span>}
        {audioUrl ? <button className="btn-secondary btn-small" type="button" onClick={clear} aria-label="清除录音">清除录音</button> : null}
      </div>
      {audioUrl ? <audio className="mt-3 w-full" src={audioUrl} controls /> : null}
      <p className="mt-2 text-xs text-cocoa/50">最长建议 5 分钟，超过会自动停止。</p>
    </div>
  );
}
