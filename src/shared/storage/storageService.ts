import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export type UploadAssetInput = {
  contentBase64: string;
  fileName: string;
  mimeType: string;
  folder?: string;
};

export type UploadAssetResult = {
  provider: "local" | "s3";
  key: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  fileName: string;
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

function sanitizeFolder(folder: string) {
  return folder
    .split("/")
    .map((segment) => sanitizeFileName(segment))
    .filter(Boolean)
    .join("/");
}

function decodeBase64(contentBase64: string) {
  const cleaned = contentBase64.includes(",") ? contentBase64.split(",").pop() ?? "" : contentBase64;
  const buffer = Buffer.from(cleaned, "base64");
  if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) {
    throw new AppError(400, "UPLOAD_SIZE_INVALID", "Upload must be between 1 byte and 5 MB");
  }
  return buffer;
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function hash(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex");
}

function encodePathname(pathname: string) {
  return pathname
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function formatAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function s3SigningKey(secret: string, dateStamp: string, region: string) {
  const dateKey = hmac(`AWS4${secret}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

async function uploadToS3(input: { buffer: Buffer; key: string; mimeType: string }) {
  const { S3_ACCESS_KEY_ID, S3_BUCKET, S3_ENDPOINT, S3_PUBLIC_BASE_URL, S3_REGION, S3_SECRET_ACCESS_KEY } = env;

  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_PUBLIC_BASE_URL) {
    const status = getStorageStatus();
    throw new AppError(503, "STORAGE_PROVIDER_NOT_CONFIGURED", "S3-compatible storage is not fully configured", {
      missing: status.missing,
    });
  }

  const endpoint = new URL(S3_ENDPOINT);
  const objectPath = `/${S3_BUCKET}/${input.key}`;
  const requestUrl = new URL(`${endpoint.origin}${objectPath}`);
  const now = new Date();
  const amzDate = formatAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const region = S3_REGION;
  const payloadHash = hash(input.buffer);
  const host = requestUrl.host;
  const canonicalUri = encodePathname(requestUrl.pathname);
  const canonicalHeaders = [
    `content-type:${input.mimeType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n") + "\n";
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, hash(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", s3SigningKey(S3_SECRET_ACCESS_KEY, dateStamp, region))
    .update(stringToSign)
    .digest("hex");

  const body = input.buffer.buffer.slice(input.buffer.byteOffset, input.buffer.byteOffset + input.buffer.byteLength) as ArrayBuffer;
  const response = await fetch(requestUrl, {
    method: "PUT",
    headers: {
      Authorization: `AWS4-HMAC-SHA256 Credential=${S3_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "Content-Type": input.mimeType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new AppError(502, "STORAGE_PROVIDER_ERROR", "S3-compatible storage rejected the upload", {
      status: response.status,
      body: body.slice(0, 500),
    });
  }
}

export function getStorageStatus() {
  const missing: string[] = [];
  if (env.STORAGE_PROVIDER === "s3") {
    if (!env.S3_ENDPOINT) missing.push("S3_ENDPOINT");
    if (!env.S3_BUCKET) missing.push("S3_BUCKET");
    if (!env.S3_ACCESS_KEY_ID) missing.push("S3_ACCESS_KEY_ID");
    if (!env.S3_SECRET_ACCESS_KEY) missing.push("S3_SECRET_ACCESS_KEY");
    if (!env.S3_PUBLIC_BASE_URL) missing.push("S3_PUBLIC_BASE_URL");
  }

  return {
    provider: env.STORAGE_PROVIDER,
    configured: env.STORAGE_PROVIDER === "local" || missing.length === 0,
    missing,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    allowedMimeTypes: Array.from(allowedMimeTypes),
  };
}

export async function uploadAsset(input: UploadAssetInput): Promise<UploadAssetResult> {
  if (!allowedMimeTypes.has(input.mimeType)) {
    throw new AppError(400, "UNSUPPORTED_UPLOAD_MIME_TYPE", "Upload MIME type is not supported");
  }

  const buffer = decodeBase64(input.contentBase64);
  const safeName = sanitizeFileName(input.fileName);
  const folder = sanitizeFolder(input.folder ?? "documents");
  const key = `${folder}/${randomUUID()}-${safeName}`;

  if (env.STORAGE_PROVIDER === "s3") {
    await uploadToS3({ buffer, key, mimeType: input.mimeType });
    const publicBaseUrl = env.S3_PUBLIC_BASE_URL;
    if (!publicBaseUrl) {
      throw new AppError(503, "STORAGE_PROVIDER_NOT_CONFIGURED", "S3-compatible storage is not fully configured", {
        missing: ["S3_PUBLIC_BASE_URL"],
      });
    }

    return {
      provider: "s3",
      key,
      url: `${publicBaseUrl.replace(/\/$/, "")}/${key.replace(/\\/g, "/")}`,
      sizeBytes: buffer.length,
      mimeType: input.mimeType,
      fileName: safeName,
    };
  }

  const absolutePath = path.resolve(process.cwd(), env.LOCAL_STORAGE_PATH, key);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    provider: "local",
    key,
    url: `${env.PUBLIC_UPLOADS_BASE_URL.replace(/\/$/, "")}/${key.replace(/\\/g, "/")}`,
    sizeBytes: buffer.length,
    mimeType: input.mimeType,
    fileName: safeName,
  };
}
