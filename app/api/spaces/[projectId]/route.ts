import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: { spaceId: string } }
) {
  try {
    const { spaceId } = params;
    const { title, description, userId } = await req.json();

    if (!spaceId) return new NextResponse("Space not found", { status: 400 });

    const UpdateSpace = await db.space.update({
      where: {
        id: spaceId,
        userId: userId,
      },
      data: {
        title: title,
        description: description,
      },
    });

    if (!UpdateSpace)
      return new NextResponse("Something happened while updating projce", {
        status: 403,
      });
    return new NextResponse("Space update sucessfully", { status: 200 });
  } catch (error: any) {
    console.error(error.message);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: { spaceId: string } }
) {
  try {
    const { spaceId } = params;
    if (!spaceId)
      return new NextResponse("SpaceId not found. please try again later");

    const GetSpace = await db.space.findUnique({
      where: {
        id: spaceId,
      },
      include: {
        articles: true,
      },
    });

    if (!GetSpace) return new NextResponse("Space not found", { status: 400 });

    return new NextResponse(JSON.stringify(GetSpace), { status: 200 });
  } catch (error: any) {
    console.error(error.message);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
