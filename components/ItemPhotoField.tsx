"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  acquireItemPhotoUrl,
  deleteItemPhoto,
  saveItemPhoto,
  subscribeToItemPhotoChanges,
  type ItemPhotoUrlLease,
} from "@/lib/item-photos";

export type ItemPhotoController = {
  busy: boolean;
  error?: string;
  loading: boolean;
  photoUrl?: string;
  removePhoto: () => Promise<void>;
  savePhoto: (file: File) => Promise<void>;
};

export function useItemPhoto(
  itemId: string,
  enabled = true,
): ItemPhotoController {
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [loading, setLoading] = useState(enabled);
  const [resolvedItemId, setResolvedItemId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const leaseRef = useRef<ItemPhotoUrlLease | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const mountedRef = useRef(false);

  const releaseCurrentLease = useCallback(() => {
    leaseRef.current?.release();
    leaseRef.current = undefined;
    setPhotoUrl(undefined);
  }, []);

  const refreshPhoto = useCallback(async () => {
    if (!enabled || !itemId.trim()) {
      setLoading(false);
      return;
    }

    const requestSequence = ++requestSequenceRef.current;

    setLoading(true);

    try {
      const lease = await acquireItemPhotoUrl(itemId);

      if (
        !mountedRef.current ||
        requestSequence !== requestSequenceRef.current
      ) {
        lease.release();
        return;
      }

      leaseRef.current?.release();
      leaseRef.current = lease;
      setPhotoUrl(lease.url);
      setError(undefined);
    } catch (photoError) {
      if (
        mountedRef.current &&
        requestSequence === requestSequenceRef.current
      ) {
        setError(getPhotoErrorMessage(photoError));
      }
    } finally {
      if (
        mountedRef.current &&
        requestSequence === requestSequenceRef.current
      ) {
        setResolvedItemId(itemId);
        setLoading(false);
      }
    }
  }, [enabled, itemId]);

  useEffect(() => {
    mountedRef.current = true;
    releaseCurrentLease();

    if (!enabled || !itemId.trim()) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    void refreshPhoto();
    const unsubscribe = subscribeToItemPhotoChanges((changedItemId) => {
      if (!changedItemId || changedItemId === itemId) {
        void refreshPhoto();
      }
    });

    return () => {
      mountedRef.current = false;
      requestSequenceRef.current += 1;
      unsubscribe();
      leaseRef.current?.release();
      leaseRef.current = undefined;
    };
  }, [enabled, itemId, refreshPhoto, releaseCurrentLease]);

  const savePhoto = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(undefined);

      try {
        await saveItemPhoto(itemId, file);
      } catch (photoError) {
        if (mountedRef.current) {
          setError(getPhotoErrorMessage(photoError));
        }
      } finally {
        if (mountedRef.current) {
          setBusy(false);
        }
      }
    },
    [itemId],
  );

  const removePhoto = useCallback(async () => {
    setBusy(true);
    setError(undefined);

    try {
      await deleteItemPhoto(itemId);
    } catch (photoError) {
      if (mountedRef.current) {
        setError(getPhotoErrorMessage(photoError));
      }
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }, [itemId]);

  return {
    busy,
    error,
    loading: enabled && resolvedItemId !== itemId ? true : loading,
    photoUrl,
    removePhoto,
    savePhoto,
  };
}

export function ItemPhotoField({
  controller,
  itemName,
}: {
  controller: ItemPhotoController;
  itemName: string;
}) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const hasPhoto = Boolean(controller.photoUrl);
  const [photoDeleteConfirmOpen, setPhotoDeleteConfirmOpen] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    input.value = "";

    if (file) {
      await controller.savePhoto(file);
    }
  }

  function deletePhoto() {
    void controller.removePhoto();
  }

  return (
    <section
      aria-label={`${itemName}的物品照片`}
      className="grid gap-2 rounded-xl border border-border/70 bg-muted/35 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">物品照片</p>
        {controller.loading || controller.busy ? (
          <span className="text-xs text-muted-foreground">
            {controller.busy ? "处理中…" : "读取中…"}
          </span>
        ) : null}
      </div>

      {controller.photoUrl ? (
        <div className="relative aspect-[4/3] max-h-52 overflow-hidden rounded-xl bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${itemName}的物品照片`}
            className="size-full object-cover"
            src={controller.photoUrl}
          />
        </div>
      ) : (
        <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 text-center text-xs leading-5 text-muted-foreground">
          拍下实物或包装，家人找东西时更快。
        </div>
      )}

      <input
        ref={galleryInputRef}
        accept="image/*"
        aria-label="从相册选择物品照片"
        className="sr-only"
        type="file"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        accept="image/*"
        aria-label="拍摄物品照片"
        capture="environment"
        className="sr-only"
        type="file"
        onChange={handleFileChange}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={controller.busy}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => galleryInputRef.current?.click()}
        >
          {hasPhoto ? "从相册替换" : "从相册选择"}
        </Button>
        <Button
          disabled={controller.busy}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
        >
          {hasPhoto ? "重新拍照" : "拍照"}
        </Button>
        {hasPhoto ? (
          <Button
            disabled={controller.busy}
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setPhotoDeleteConfirmOpen(true)}
          >
            删除照片
          </Button>
        ) : null}
      </div>

      <p className="text-xs leading-4 text-muted-foreground">
        最长边压缩为 800px，原图上限 20 MiB。照片不会进入普通恢复点或
        WebDAV 备份；可前往“设置 - 备份与恢复”导出或导入独立照片备份包。
      </p>
      {controller.error ? (
        <p aria-live="polite" className="text-xs text-destructive" role="alert">
          {controller.error}
        </p>
      ) : null}
      <ConfirmDialog
        confirmLabel="删除照片"
        description={`删除后，“${itemName}”的照片无法恢复。`}
        onConfirm={deletePhoto}
        onOpenChange={setPhotoDeleteConfirmOpen}
        open={photoDeleteConfirmOpen}
        title="确认删除这张照片？"
        variant="destructive"
      />
    </section>
  );
}

function getPhotoErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "照片操作失败，请稍后重试。";
}
