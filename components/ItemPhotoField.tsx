"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { Button } from "@/components/ui/button";
import {
  deleteItemPhoto,
  getItemPhoto,
  saveItemPhoto,
  subscribeToItemPhotoChanges,
} from "@/lib/item-photos";

export type ItemPhotoController = {
  busy: boolean;
  error?: string;
  loading: boolean;
  photoUrl?: string;
  removePhoto: () => Promise<void>;
  savePhoto: (file: File) => Promise<void>;
};

export function useItemPhoto(itemId: string): ItemPhotoController {
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const objectUrlRef = useRef<string | undefined>(undefined);
  const requestSequenceRef = useRef(0);
  const mountedRef = useRef(false);

  const replaceObjectUrl = useCallback((blob?: Blob) => {
    const previousUrl = objectUrlRef.current;
    let nextUrl: string | undefined;

    if (blob) {
      if (
        typeof URL === "undefined" ||
        typeof URL.createObjectURL !== "function"
      ) {
        throw new Error("当前浏览器无法显示本地照片。");
      }

      nextUrl = URL.createObjectURL(blob);
    }

    objectUrlRef.current = nextUrl;
    setPhotoUrl(nextUrl);

    if (previousUrl && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(previousUrl);
    }
  }, []);

  const refreshPhoto = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;

    setLoading(true);

    try {
      const record = await getItemPhoto(itemId);

      if (
        !mountedRef.current ||
        requestSequence !== requestSequenceRef.current
      ) {
        return;
      }

      replaceObjectUrl(record?.blob);
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
        setLoading(false);
      }
    }
  }, [itemId, replaceObjectUrl]);

  useEffect(() => {
    mountedRef.current = true;
    replaceObjectUrl();
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

      const objectUrl = objectUrlRef.current;
      objectUrlRef.current = undefined;

      if (
        objectUrl &&
        typeof URL !== "undefined" &&
        typeof URL.revokeObjectURL === "function"
      ) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [itemId, refreshPhoto, replaceObjectUrl]);

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
    loading,
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

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    input.value = "";

    if (file) {
      await controller.savePhoto(file);
    }
  }

  function confirmPhotoDeletion() {
    if (!window.confirm(`删除“${itemName}”的照片？`)) {
      return;
    }

    void controller.removePhoto();
  }

  return (
    <section
      aria-label={`${itemName}的物品照片`}
      className="grid gap-2 rounded-xl border border-border/70 bg-muted/35 p-3"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-foreground">物品照片</p>
        {controller.loading ? (
          <span className="text-[10px] text-muted-foreground">读取中…</span>
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
            onClick={confirmPhotoDeletion}
          >
            删除照片
          </Button>
        ) : null}
      </div>

      <p className="text-[10px] leading-4 text-muted-foreground">
        照片仅保存在本设备，不进入本机恢复点或 WebDAV 备份。
      </p>
      {controller.error ? (
        <p aria-live="polite" className="text-xs text-destructive" role="alert">
          {controller.error}
        </p>
      ) : null}
    </section>
  );
}

function getPhotoErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "照片操作失败，请稍后重试。";
}
