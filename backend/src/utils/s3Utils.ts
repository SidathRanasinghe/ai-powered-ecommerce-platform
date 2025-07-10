import AWS from "aws-sdk";
import { config } from "@/config/config";
import { v4 as uuidv4 } from "uuid";

const s3 = new AWS.S3({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  location?: string; // For compatibility with some S3 SDK versions
  [key: string]: any; // Allow additional properties
}

export interface UploadOptions {
  folder?: string;
  filename?: string;
  contentType?: string;
  acl?: string;
  metadata?: Record<string, string>;
}

export interface PresignedUrlOptions {
  expires?: number;
  contentType?: string;
  metadata?: Record<string, string>;
}

class S3Utils {
  // Upload file to S3
  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      folder = "uploads",
      filename,
      contentType,
      acl = "public-read",
      metadata = {},
    } = options;

    // Generate filename if not provided
    const fileExtension = file.originalname.split(".").pop();
    const fileName = filename || `${uuidv4()}.${fileExtension}`;
    const key = `${folder}/${fileName}`;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: contentType || file.mimetype,
      ACL: acl,
      Metadata: metadata,
    };

    const result = await s3.upload(params).promise();

    return {
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
    };
  }

  // Upload multiple files
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, options));
    return await Promise.all(uploadPromises);
  }

  // Upload avatar
  async uploadAvatar(
    file: Express.Multer.File,
    userId: string
  ): Promise<UploadResult> {
    return await this.uploadFile(file, {
      folder: "avatars",
      filename: `${userId}-${Date.now()}.${file.originalname.split(".").pop()}`,
      metadata: {
        userId,
        uploadType: "avatar",
      },
    });
  }

  // Upload product image
  async uploadProductImage(
    file: Express.Multer.File,
    productId: string
  ): Promise<UploadResult> {
    return await this.uploadFile(file, {
      folder: "products",
      filename: `${productId}-${Date.now()}.${file.originalname
        .split(".")
        .pop()}`,
      metadata: {
        productId,
        uploadType: "product",
      },
    });
  }

  // Upload product images (multiple)
  async uploadProductImages(
    files: Express.Multer.File[],
    productId: string
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file, index) =>
      this.uploadFile(file, {
        folder: "products",
        filename: `${productId}-${index}-${Date.now()}.${file.originalname
          .split(".")
          .pop()}`,
        metadata: {
          productId,
          uploadType: "product",
          imageIndex: index.toString(),
        },
      })
    );
    return await Promise.all(uploadPromises);
  }

  // Delete product image
  async deleteProductImage(url: string): Promise<void> {
    // Extract the key from the URL
    const key = url.split(
      `${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/`
    )[1];
    if (!key) {
      throw new Error("Invalid S3 URL");
    }

    await s3
      .deleteObject({
        Bucket: config.aws.s3Bucket,
        Key: key,
      })
      .promise();
  }

  // Delete multiple product images
  async deleteMultipleProductImages(urls: string[]): Promise<void> {
    const deletePromises = urls.map((url) => this.deleteProductImage(url));
    await Promise.all(deletePromises);
  }

  // Get presigned URL for upload
  async getPresignedUploadUrl(
    key: string,
    options: PresignedUrlOptions = {}
  ): Promise<string> {
    const {
      expires = 3600, // 1 hour
      contentType,
      metadata = {},
    } = options;

    const params: AWS.S3.PutObjectRequest = {
      Bucket: config.aws.s3Bucket,
      Key: key,
      Expires: new Date(Date.now() + expires * 1000),
      Metadata: metadata,
      ...(contentType ? { ContentType: contentType } : {}),
    };

    return await s3.getSignedUrlPromise("putObject", params);
  }

  // Get presigned URL for download
  async getPresignedDownloadUrl(
    key: string,
    expires: number = 3600
  ): Promise<string> {
    const params = {
      Bucket: config.aws.s3Bucket,
      Key: key,
      Expires: expires,
    };

    return await s3.getSignedUrlPromise("getObject", params);
  }

  // Delete file from S3
  async deleteFile(key: string): Promise<void> {
    const params = {
      Bucket: config.aws.s3Bucket,
      Key: key,
    };

    await s3.deleteObject(params).promise();
  }

  // Delete multiple files
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    const params = {
      Bucket: config.aws.s3Bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    };

    await s3.deleteObjects(params).promise();
  }

  // Check if file exists
  async fileExists(key: string): Promise<boolean> {
    try {
      await s3
        .headObject({
          Bucket: config.aws.s3Bucket,
          Key: key,
        })
        .promise();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get file metadata
  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    const params = {
      Bucket: config.aws.s3Bucket,
      Key: key,
    };

    return await s3.headObject(params).promise();
  }

  // List files in folder
  async listFiles(
    folder: string,
    maxKeys: number = 1000
  ): Promise<AWS.S3.Object[]> {
    const params = {
      Bucket: config.aws.s3Bucket,
      Prefix: folder,
      MaxKeys: maxKeys,
    };

    const result = await s3.listObjectsV2(params).promise();
    return result.Contents || [];
  }

  // Copy file
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    const params = {
      Bucket: config.aws.s3Bucket,
      CopySource: `${config.aws.s3Bucket}/${sourceKey}`,
      Key: destinationKey,
    };

    await s3.copyObject(params).promise();
  }

  // Move file (copy then delete)
  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
  }

  // Generate public URL
  generatePublicUrl(key: string): string {
    return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
  }

  // Generate CloudFront URL (if using CloudFront)
  generateCloudFrontUrl(key: string): string {
    if (config.aws) {
      return `https://${config.aws.cloudFrontDomain}/${key}`;
    }
    return this.generatePublicUrl(key);
  }

  // Validate file type
  validateFileType(file: Express.Multer.File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.mimetype);
  }

  // Validate file size
  validateFileSize(file: Express.Multer.File, maxSizeInBytes: number): boolean {
    return file.size <= maxSizeInBytes;
  }

  // Validate image file
  validateImageFile(file: Express.Multer.File): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!this.validateFileType(file, allowedTypes)) {
      errors.push(
        "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."
      );
    }

    if (!this.validateFileSize(file, maxSize)) {
      errors.push("File size too large. Maximum size is 5MB.");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Create folder
  async createFolder(folderName: string): Promise<void> {
    const params = {
      Bucket: config.aws.s3Bucket,
      Key: `${folderName}/`,
      Body: "",
    };

    await s3.putObject(params).promise();
  }

  // Delete folder and all contents
  async deleteFolder(folderName: string): Promise<void> {
    const files = await this.listFiles(folderName);

    if (files.length > 0) {
      const keys = files.map((file) => file.Key!);
      await this.deleteMultipleFiles(keys);
    }
  }

  // Get file size
  async getFileSize(key: string): Promise<number> {
    const metadata = await this.getFileMetadata(key);
    return metadata.ContentLength || 0;
  }

  // Get total storage usage
  async getStorageUsage(folder?: string): Promise<number> {
    const files = await this.listFiles(folder || "");
    return files.reduce((total, file) => total + (file.Size || 0), 0);
  }

  // Set file ACL
  async setFileAcl(key: string, acl: string): Promise<void> {
    const params = {
      Bucket: config.aws.s3Bucket,
      Key: key,
      ACL: acl,
    };

    await s3.putObjectAcl(params).promise();
  }

  // Add tags to file
  async addFileTags(key: string, tags: Record<string, string>): Promise<void> {
    const tagSet = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));

    const params = {
      Bucket: config.aws.s3Bucket,
      Key: key,
      Tagging: {
        TagSet: tagSet,
      },
    };

    await s3.putObjectTagging(params).promise();
  }

  // Get file tags
  async getFileTags(key: string): Promise<Record<string, string>> {
    const params = {
      Bucket: config.aws.s3Bucket,
      Key: key,
    };

    const result = await s3.getObjectTagging(params).promise();
    const tags: Record<string, string> = {};

    result.TagSet?.forEach((tag) => {
      if (tag.Key && tag.Value) {
        tags[tag.Key] = tag.Value;
      }
    });

    return tags;
  }
}

export default new S3Utils();
