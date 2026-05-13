import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  StorageDownloadUploadOptions,
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
} from './index';

interface LocalProviderOptions {
  /** absolute path to the directory writes go to (e.g. <project>/public/uploads) */
  uploadDir: string;
  /** url prefix the uploaded files become reachable at (e.g. /uploads) */
  publicPrefix: string;
  /** optional fully-qualified host to prepend, e.g. http://localhost:3000 */
  publicOrigin?: string;
}

/**
 * Local filesystem storage provider for dev environments without R2 / S3.
 * Writes uploads to <uploadDir>/<key> and serves them via <publicPrefix>/<key>.
 *
 * Note: this only works on the Node runtime (server env, dev). It does not
 * function in serverless / edge / Cloudflare Workers, where the project should
 * use R2 or S3 instead.
 */
export class LocalProvider implements StorageProvider {
  readonly name = 'local';
  configs: LocalProviderOptions;

  constructor(options: LocalProviderOptions) {
    this.configs = options;
  }

  exists = async (options: { key: string; bucket?: string }) => {
    try {
      await stat(join(this.configs.uploadDir, options.key));
      return true;
    } catch {
      return false;
    }
  };

  getPublicUrl = (options: { key: string; bucket?: string }) => {
    const path = `${this.configs.publicPrefix.replace(/\/$/, '')}/${options.key}`;
    return this.configs.publicOrigin
      ? `${this.configs.publicOrigin.replace(/\/$/, '')}${path}`
      : path;
  };

  async uploadFile(
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      await mkdir(this.configs.uploadDir, { recursive: true });
      const filePath = join(this.configs.uploadDir, options.key);
      await writeFile(filePath, options.body as Uint8Array);

      return {
        success: true,
        provider: this.name,
        key: options.key,
        url: this.getPublicUrl({ key: options.key }),
        filename: options.key,
        location: filePath,
      };
    } catch (e: any) {
      return {
        success: false,
        provider: this.name,
        error: e?.message || 'local upload failed',
      };
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      await unlink(join(this.configs.uploadDir, key));
      return true;
    } catch {
      return false;
    }
  }

  async downloadAndUpload(
    options: StorageDownloadUploadOptions
  ): Promise<StorageUploadResult> {
    try {
      const resp = await fetch(options.url);
      if (!resp.ok) {
        return {
          success: false,
          provider: this.name,
          error: `download failed: ${resp.status}`,
        };
      }
      const buf = new Uint8Array(await resp.arrayBuffer());
      return this.uploadFile({
        body: buf,
        key: options.key,
        contentType: options.contentType,
      });
    } catch (e: any) {
      return {
        success: false,
        provider: this.name,
        error: e?.message || 'download-and-upload failed',
      };
    }
  }
}
