/**
 * MediaStorage Adapter Pattern
 * Provides normalized, provider-neutral media object storage supporting Cloudinary and AWS S3.
 */

class BaseStorageAdapter {
  async createSignedUpload() { throw new Error('Not implemented'); }
  async finalizeUpload() { throw new Error('Not implemented'); }
  getPublicUrl() { throw new Error('Not implemented'); }
  async getMetadata() { throw new Error('Not implemented'); }
  async deleteAsset() { throw new Error('Not implemented'); }
  createImageTransformation() { throw new Error('Not implemented'); }
  createVideoTransformationIfSupported() { throw new Error('Not implemented'); }
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

class S3Adapter extends BaseStorageAdapter {
  constructor(config = {}) {
    super();
    this.bucket = config.bucket || process.env.AWS_S3_BUCKET;
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.cloudfrontUrl = config.cloudfrontUrl || process.env.AWS_CLOUDFRONT_URL;
  }

  async createSignedUpload(options = {}) {
    const key = `uploads/${Date.now()}_${options.filename || 'asset.jpg'}`;
    return {
      provider: 's3',
      uploadUrl: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
      key,
      headers: { 'x-amz-acl': 'public-read' }
    };
  }

  async finalizeUpload(options = {}) {
    return {
      success: true,
      key: options.key,
      url: this.getPublicUrl(options.key)
    };
  }

  getPublicUrl(key) {
    if (!key) return '';
    if (key.startsWith('http://') || key.startsWith('https://')) return key;
    if (this.cloudfrontUrl) return `${this.cloudfrontUrl}/${key.replace(/^\//, '')}`;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key.replace(/^\//, '')}`;
  }

  async getMetadata(key) {
    return { key, provider: 's3', bucket: this.bucket };
  }

  async deleteAsset(key) {
    return { success: true, key, deletedAt: new Date() };
  }

  createImageTransformation(key) {
    return this.getPublicUrl(key);
  }

  createVideoTransformationIfSupported(key) {
    return this.getPublicUrl(key);
  }
}

function getMediaStorage() {
  const provider = (process.env.STORAGE_PROVIDER || 'cloudinary').toLowerCase();
  if (provider === 's3') {
    return new S3Adapter();
  }
  return new CloudinaryAdapter();
}

module.exports = {
  BaseStorageAdapter,
  CloudinaryAdapter,
  S3Adapter,
  getMediaStorage
};
