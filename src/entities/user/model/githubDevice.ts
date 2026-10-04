"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch, type Schemas } from "@/shared/api";
import { userKeys } from "../api/userApi";

type DeviceCode = Schemas["DeviceCode"];

export type GithubDeviceState =
  | { step: "idle" }
  | { step: "starting" }
  | { step: "waiting"; userCode: string; verificationUri: string; expiresAt: number }
  | { step: "expired" }
  | { step: "denied" }
  | { step: "connected"; githubLogin: string }
  | { step: "error"; error: unknown };

/**
 * GitHub Device Flow. start → 사용자가 verificationUri에서 userCode 입력 → interval초마다 poll.
 * poll은 진행 중에도 200이고 data.status로 분기한다 (HTTP 에러가 아니다).
 * deviceCode는 서버도 보관하지 않는다 — 이 훅의 ref에만 두고, 화면을 떠나면(unmount) 폴링을 멈춘다
 */
export function useGithubDeviceFlow({ onConnected }: { onConnected?: () => void } = {}) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<GithubDeviceState>({ step: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 화면을 떠났거나 새로 시작했으면 이전 폴링의 응답을 버린다
  const run = useRef(0);

  const stop = useCallback(() => {
    run.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    stop();
    const id = run.current;
    setState({ step: "starting" });

    let code: DeviceCode;
    try {
      code = await apiFetch<DeviceCode>("/auth/github/device/start", { method: "POST" });
    } catch (error) {
      if (id === run.current) setState({ step: "error", error });
      return;
    }
    if (id !== run.current) return;

    const expiresAt = Date.now() + code.expiresIn * 1000;
    setState({ step: "waiting", userCode: code.userCode, verificationUri: code.verificationUri, expiresAt });

    const poll = async (intervalSec: number) => {
      if (id !== run.current) return;
      if (Date.now() >= expiresAt) return setState({ step: "expired" });
      try {
        const res = await apiFetch<Schemas["DeviceFlowStatus"]>("/auth/github/device/poll", {
          method: "POST",
          body: { deviceCode: code.deviceCode },
        });
        if (id !== run.current) return;
        switch (res.status) {
          case "pending":
            return schedule(intervalSec);
          case "slow_down":
            // GitHub가 더 천천히 물으라고 한다 — 응답의 interval로 늘린다
            return schedule(res.interval);
          case "expired":
            return setState({ step: "expired" });
          case "denied":
            return setState({ step: "denied" });
          case "connected":
            setState({ step: "connected", githubLogin: res.githubLogin });
            await queryClient.invalidateQueries({ queryKey: userKeys.me() });
            onConnected?.();
            return;
        }
      } catch (error) {
        if (id === run.current) setState({ step: "error", error });
      }
    };
    const schedule = (intervalSec: number) => {
      timer.current = setTimeout(() => void poll(intervalSec), intervalSec * 1000);
    };
    schedule(code.interval);
  }, [stop, queryClient, onConnected]);

  const cancel = useCallback(() => {
    stop();
    setState({ step: "idle" });
  }, [stop]);

  return { state, start, cancel };
}
