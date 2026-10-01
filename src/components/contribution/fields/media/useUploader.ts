import { useEffect, useRef, useState } from "react";

import { useForm } from "@/components/contribution/formContext";
import {
  UploadProgress,
  UploadResult,
  forgetUpload,
  pendingUploads,
  uploadFile,
} from "@/lib/upload/uploader";
import { NeedCaptchaError, startUploadSession } from "@/lib/upload/session";

// Upload state for one form field: starts the upload session (asking for
// the captcha when needed), runs uploads with progress, and cancels them
// when the field goes away.

export function useUploader(field: string) {
  const { formik, config } = useForm();
  const target = {
    repo: config.repo.name,
    contribution: config.contribution.name,
    field,
  };
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const controllers = useRef<Record<string, AbortController>>({});
  const waiting = useRef<() => void>();

  useEffect(() => {
    const current = controllers.current;
    return () => Object.values(current).forEach((c) => c.abort());
  }, []);

  // continue once the captcha is solved
  const captcha = formik.values.captcha;
  useEffect(() => {
    if (needCaptcha && captcha && waiting.current) {
      setNeedCaptcha(false);
      const retry = waiting.current;
      waiting.current = undefined;
      retry();
    }
  }, [captcha, needCaptcha]);

  const ensureSession = () =>
    startUploadSession({
      ...target,
      authorization: formik.values.authorization,
      captcha: formik.values.captcha,
      setCaptcha: (value) => formik.setFieldValue("captcha", value),
    });

  /**
   * Uploads a file. Resolves the result, or `undefined` when it was
   * cancelled or has to wait for the captcha (`retry` is called then).
   */
  async function upload(
    id: string,
    file: File,
    retry: () => void
  ): Promise<UploadResult | undefined> {
    try {
      await ensureSession();
    } catch (e) {
      if (e instanceof NeedCaptchaError) {
        waiting.current = retry;
        setNeedCaptcha(true);
        return;
      }
      throw e;
    }
    const controller = new AbortController();
    controllers.current[id] = controller;
    try {
      return await uploadFile({
        file,
        target,
        signal: controller.signal,
        onProgress: (p) => setProgress((all) => ({ ...all, [id]: p })),
        renewSession: ensureSession,
      });
    } catch (e) {
      if (controller.signal.aborted) return;
      throw e;
    } finally {
      delete controllers.current[id];
      setProgress(({ [id]: _, ...rest }) => rest);
    }
  }

  /** stops an upload and forgets its progress, so it is not resumed */
  async function cancel(id: string, name?: string) {
    controllers.current[id]?.abort();
    const records = await pendingUploads(target);
    await Promise.all(
      records.filter((r) => r.name === name).map((r) => forgetUpload(r.key))
    );
  }

  return { target, upload, cancel, progress, needCaptcha };
}
