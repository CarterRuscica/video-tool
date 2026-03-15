import { create } from "zustand";

interface ClockState {
  currentTime: number;
  duration: number;
  playing: boolean;
  playbackRate: number;
  fps: number;

  seek: (time: number) => void;
  tick: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaying: (playing: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setFps: (fps: number) => void;
}

export const useClockStore = create<ClockState>((set) => ({
  currentTime: 0,
  duration: 0,
  playing: false,
  playbackRate: 1,
  fps: 30,

  seek: (time) => set({ currentTime: time }),
  tick: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setPlaying: (playing) => set({ playing }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setFps: (fps) => set({ fps }),
}));
