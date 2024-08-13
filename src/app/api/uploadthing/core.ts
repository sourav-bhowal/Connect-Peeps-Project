import { prisma } from "@/lib/prismaDB";
import { validateRequest } from "@/utils/auth";
import { createUploadthing, FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";

// Initailize uploadthing
const f = createUploadthing();

// FileRouter to upload files and routes
export const fileRouter = {
  // upload file to uploadthing
  avatar: f({
    image: {
      maxFileSize: "512KB",
    },
  })
    // middle wares for user auth
    .middleware(async () => {
      const { user } = await validateRequest();

      if (!user) throw new UploadThingError("Unauthorized");

      return { user };
    })
    // onUploadComplete save to DB
    .onUploadComplete(async ({ metadata, file }) => {
      // delete old avatar from uploadthing
      const oldAvatarUrl = metadata.user.avatarUrl;
      // if old avatar exists
      if (oldAvatarUrl) {
        // get key from url
        const key = oldAvatarUrl.split(`/a/${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}/`)[1];

        // delete old avatar from uploadthing
        await new UTApi().deleteFiles(key);
      }

      // secure url of the avatar
      const newAvatarUrl = file.url.replace(
        "/f/",
        `/a/${process.env.NEXT_PUBLIC_UPLOADTHING_APP_ID}/`,
      );

      // save to DB
      await prisma.user.update({
        where: {
          id: metadata.user.id,
        },
        data: {
          avatarUrl: newAvatarUrl,
        },
      });

      // return new avatar url to client
      return { avatarUrl: newAvatarUrl };
    }),
} satisfies FileRouter;

// export app file route
export type AppFileRouter = typeof fileRouter;