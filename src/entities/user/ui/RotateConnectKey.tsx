"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { errorMessage } from "@/shared/api";
import { Button, CopyField } from "@/shared/ui";
import { useRotateConnectKey } from "../api/userApi";

/**
 * 연결 키 재발급. 키는 서버에 해시로만 저장돼 다시 보여줄 수 없으므로 새 키를 한 번만 보여준다.
 * 기존 키는 즉시 무효가 되므로 확인을 거친다
 */
export function RotateConnectKey() {
  const rotate = useRotateConnectKey();
  const [confirming, setConfirming] = useState(false);

  return (
    <div>
      {rotate.data ? (
        <>
          <CopyField label="새 연결 키" value={rotate.data.connectKey} />
          <p className="mt-2 text-[12.5px] font-medium text-human">
            이 화면을 떠나면 다시 볼 수 없습니다. 지금 복사해 두세요.
          </p>
        </>
      ) : confirming ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[13px] font-medium text-forbidden">기존 키는 즉시 무효가 됩니다.</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={rotate.isPending}>
              취소
            </Button>
            <Button size="sm" onClick={() => rotate.mutate()} disabled={rotate.isPending}>
              {rotate.isPending ? "재발급 중…" : "재발급"}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
          <KeyRound size={14} /> 연결 키 재발급
        </Button>
      )}
      {rotate.isError && <p className="mt-2 text-[12.5px] text-forbidden">{errorMessage(rotate.error)}</p>}
    </div>
  );
}
