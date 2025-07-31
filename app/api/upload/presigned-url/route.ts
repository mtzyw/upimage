import { generateUserPresignedUploadUrl } from "@/actions/r2-resources";
import { apiResponse } from "@/lib/api-response";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType } = await req.json();
    
    if (!fileName || !contentType) {
      return apiResponse.badRequest("Missing fileName or contentType");
    }

    console.log("Generating presigned URL for:", { fileName, contentType });

    const result = await generateUserPresignedUploadUrl({
      fileName,
      contentType,
      path: 'image-enhancements',
      prefix: 'original'
    });

    console.log("Presigned URL result:", result);

    if (!result.success) {
      return apiResponse.error(result.error || "Failed to generate presigned URL");
    }

    return apiResponse.success(result.data);
  } catch (error) {
    console.error("Error in presigned URL API:", error);
    return apiResponse.serverError("Internal server error");
  }
}