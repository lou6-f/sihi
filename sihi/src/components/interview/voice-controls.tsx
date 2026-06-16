"use client";

import { Mic, MicOff, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceControlsProps {
  isListening: boolean;
  supported: boolean;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceControls({
  isListening,
  supported,
  disabled = false,
  onStart,
  onStop,
}: VoiceControlsProps) {
  if (!supported) {
    return (
      <p className="text-xs text-zinc-500">
        Trình duyệt không hỗ trợ nhận diện giọng nói.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isListening ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={onStop}
          disabled={disabled}
          className="gap-1.5"
        >
          <Square className="h-3.5 w-3.5" />
          Dừng ghi
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onStart}
          disabled={disabled}
          className="gap-1.5 border-violet-500/30 hover:bg-violet-500/10"
        >
          <Mic className="h-3.5 w-3.5" />
          Nói
        </Button>
      )}
      {isListening && (
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <span className="text-xs text-red-400">Đang ghi...</span>
        </div>
      )}
    </div>
  );
}
