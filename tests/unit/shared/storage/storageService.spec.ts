import { describe, expect, it, vi } from "vitest";

const baseEnv = {
  LOCAL_STORAGE_PATH: "uploads-test",
  PUBLIC_UPLOADS_BASE_URL: "http://localhost:4000/uploads",
  S3_ACCESS_KEY_ID: undefined,
  S3_BUCKET: undefined,
  S3_ENDPOINT: undefined,
  S3_PUBLIC_BASE_URL: undefined,
  S3_REGION: "auto",
  S3_SECRET_ACCESS_KEY: undefined,
  STORAGE_PROVIDER: "local",
};

async function loadStorage(envOverrides: Record<string, unknown>) {
  vi.resetModules();
  vi.doMock("../../../../src/config/env.js", () => ({
    env: {
      ...baseEnv,
      ...envOverrides,
    },
  }));

  return import("../../../../src/shared/storage/storageService.js");
}

describe("storageService", () => {
  it("reports missing S3 configuration for release readiness", async () => {
    const { getStorageStatus } = await loadStorage({ STORAGE_PROVIDER: "s3" });

    expect(getStorageStatus()).toEqual(
      expect.objectContaining({
        configured: false,
        missing: expect.arrayContaining(["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_BASE_URL"]),
        provider: "s3",
      }),
    );
  });

  it("uploads to S3-compatible storage with a signed PUT request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { uploadAsset } = await loadStorage({
      S3_ACCESS_KEY_ID: "access-key",
      S3_BUCKET: "cargo-agent",
      S3_ENDPOINT: "https://storage.example.test",
      S3_PUBLIC_BASE_URL: "https://cdn.example.test/assets",
      S3_REGION: "us-east-1",
      S3_SECRET_ACCESS_KEY: "secret-key",
      STORAGE_PROVIDER: "s3",
    });

    const result = await uploadAsset({
      contentBase64: Buffer.from("file body").toString("base64"),
      fileName: "truck photo.png",
      folder: "companies/company_1",
      mimeType: "image/png",
    });

    expect(result.provider).toBe("s3");
    expect(result.url).toMatch(/^https:\/\/cdn\.example\.test\/assets\/companies\/company_1\//);
    expect(result.fileName).toBe("truck_photo.png");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining("https://storage.example.test/cargo-agent/companies/company_1/") }),
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("AWS4-HMAC-SHA256"),
          "Content-Type": "image/png",
          "x-amz-content-sha256": expect.any(String),
          "x-amz-date": expect.any(String),
        }),
      }),
    );
  });

  it("returns a traceable provider error when S3 rejects upload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "denied" }));
    const { uploadAsset } = await loadStorage({
      S3_ACCESS_KEY_ID: "access-key",
      S3_BUCKET: "cargo-agent",
      S3_ENDPOINT: "https://storage.example.test",
      S3_PUBLIC_BASE_URL: "https://cdn.example.test/assets",
      S3_REGION: "us-east-1",
      S3_SECRET_ACCESS_KEY: "secret-key",
      STORAGE_PROVIDER: "s3",
    });

    await expect(
      uploadAsset({
        contentBase64: Buffer.from("file body").toString("base64"),
        fileName: "license.pdf",
        mimeType: "application/pdf",
      }),
    ).rejects.toMatchObject({
      code: "STORAGE_PROVIDER_ERROR",
      details: expect.objectContaining({ status: 403 }),
      statusCode: 502,
    });
  });
});
