import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

// UploadThing React helpers
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();