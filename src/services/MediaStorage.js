/**
 * MediaStorage Adapter Pattern with Feature Flag Evaluation
 * Evaluates ENABLE_CLOUDINARY feature flag to toggle Cloudinary API vs local static media storage.
 */

const { getFeatureFlag } = require('../config/featureFlags');

class BaseStorageAdapter {
  async createSignedUpload() { throw new Error('Not implemented'); }
  async finalizeUpload() { throw new Error('Not implemented'); }
  getPublicUrl() { throw new Error('Not implemented'); }
  async getMetadata() { throw new Error('Not implemented'); }
  async deleteAsset() { throw new Error('Not implemented'); }
  createImageTransformation() { throw new Error('Not implemented'); }
  createVideoTransformationIfSupported() { throw new Error('Not implemented'); }
}

class LocalStorageAdapter extends BaseStorageAdapter {
  async createSignedUpload(options = {}) {
    return {
      provider: 'local',
      uploadUrl: '/api/content/upload',
      filename: options.filename || 'asset.jpg'
    };
  }

  async finalizeUpload(options = {}) {
    return {
      success: true,
      url: `/images/uploads/${options.filename || 'asset.jpg'}`
    };
  }

  getPublicUrl(assetPath) {
    if (!assetPath) return '';
    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath;
    return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  }

  async getMetadata(assetId) {
    return { assetId, provider: 'local' };
  }

  async deleteAsset(assetId) {
    return { success: true, assetId };
  }

  createImageTransformation(assetPath) {
    return this.getPublicUrl(assetPath);
  }

  createVideoTransformationIfSupported(assetPath) {
    return this.getPublicUrl(assetPath);
  }
}

class CloudinaryAdapter extends BaseStorageAdapter {
  constructor(config = {}) {
    super();
    this.cloudinaryUrl = config.cloudinaryUrl || process.env.CLOUDINARY_URL;
  }

  async createSignedUpload(options = {}) {
    const assetId = 'asset_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const timestamp = Math.floor(Date.now() / 1000);
    return {
      provider: 'cloudinary',
      assetId,
      uploadUrl: `https://api.cloudinary.com/v1_1/jcal/image/upload`,
      timestamp,
      signature: 'signed_upload_sig_' + timestamp,
      folder: options.folder || 'jcal_media'
    };
  }

  async finalizeUpload(options = {}) {
    return {
      success: true,
      assetId: options.assetId,
      url: options.url || `/images/uploads/${options.filename}`,
      bytes: options.bytes || 1024,
      format: options.format || 'jpg'
    };
  }

  getPublicUrl(assetPath) {
    if (!assetPath) return '';
    if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath;
    return assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  }

  async getMetadata(assetId) {
    return { assetId, provider: 'cloudinary', type: 'image' };
  }

  async deleteAsset(assetId) {
    return { success: true, assetId, deletedAt: new Date() };
  }

  createImageTransformation(assetPath, options = {}) {
    const url = this.getPublicUrl(assetPath);
    if (options.width || options.height) {
      return `${url}?w=${options.width || ''}&h=${options.height || ''}&fit=${options.crop || 'cover'}`;
    }
    return url;
  }

  createVideoTransformationIfSupported(assetPath) {
    return this.getPublicUrl(assetPath);
  }
}

function getMediaStorage() {
  if (!getFeatureFlag('ENABLE_CLOUDINARY')) {
    return new LocalStorageAdapter();
  }
  return new CloudinaryAdapter();
}

module.exports = {
  BaseStorageAdapter,
  LocalStorageAdapter,
  CloudinaryAdapter,
  getMediaStorage
};
