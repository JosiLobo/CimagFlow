import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3Client, getBucketConfig } from "./aws-config";

export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  isPublic = false
): Promise<{ uploadUrl: string; cloud_storage_path: string }> {
  const client = createS3Client();
  const { bucketName, folderPrefix } = getBucketConfig();

  const cloud_storage_path = isPublic
    ? `${folderPrefix}public/uploads/${Date.now()}-${fileName}`
    : `${folderPrefix}uploads/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ContentType: contentType,
    ContentDisposition: isPublic ? "inline" : undefined,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  return { uploadUrl, cloud_storage_path };
}

export async function getFileUrl(
  cloud_storage_path: string,
  isPublic: boolean
): Promise<string> {
  if (isPublic) {
    const { bucketName, region } = getBucketConfig();
    return `https://${bucketName}.s3.${region}.amazonaws.com/${cloud_storage_path}`;
  }

  const client = createS3Client();
  const { bucketName } = getBucketConfig();

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: cloud_storage_path,
    ResponseContentDisposition: "attachment",
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function deleteFile(cloud_storage_path: string): Promise<void> {
  const client = createS3Client();
  const { bucketName } = getBucketConfig();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: cloud_storage_path,
    })
  );
}
