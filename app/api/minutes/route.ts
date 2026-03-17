import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import prisma from "@/lib/db";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const type = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { number: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status && status !== "TODOS") {
      where.status = status;
    }

    if (type && type !== "TODOS") {
      where.type = type;
    }

    const [minutes, total] = await Promise.all([
      prisma.minutesOfMeeting.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { meetingDate: "desc" },
        include: {
          prefecture: true,
          bid: { select: { id: true, number: true, title: true } },
          creator: { select: { name: true } },
          _count: { select: { adhesions: true } },
        },
      }),
      prisma.minutesOfMeeting.count({ where }),
    ]);

    return NextResponse.json({ minutes, total, page, limit });
  } catch (error) {
    console.error("Error fetching minutes:", error);
    return NextResponse.json({ error: "Erro ao buscar atas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const {
      number,
      title,
      description,
      type,
      status,
      meetingDate,
      startTime,
      endTime,
      location,
      participants,
      content,
      decisions,
      prefectureId,
      bidId,
      isPriceRegistry,
      validityStartDate,
      validityEndDate,
      isPublic,
      allowAdhesion,
      priceValue,
      items,
    } = body;

    if (!number || !title || !meetingDate) {
      return NextResponse.json(
        { error: "Número, título e data da reunião são obrigatórios" },
        { status: 400 }
      );
    }

    const minute = await prisma.minutesOfMeeting.create({
      data: {
        number,
        title,
        description,
        type: type || "ORDINARIA",
        status: status || "RASCUNHO",
        meetingDate: new Date(meetingDate),
        startTime,
        isPriceRegistry: isPriceRegistry || false,
        validityStartDate: validityStartDate ? new Date(validityStartDate) : null,
        validityEndDate: validityEndDate ? new Date(validityEndDate) : null,
        isPublic: isPublic || false,
        allowAdhesion: allowAdhesion || false,
        priceValue: priceValue ? parseFloat(priceValue) : null,
        items,
        endTime,
        location,
        participants: participants || [],
        content,
        decisions,
        prefectureId: prefectureId || null,
        bidId: bidId || null,
        createdBy: userId,
      },
      include: {
        prefecture: true,
        bid: { select: { id: true, number: true, title: true } },
      },
    });

    const user = session.user as any;
    await auditLog(request, {
      userId: user.id,
      userName: user.name || user.email,
      action: "CREATE",
      entity: "minute",
      entityId: minute.id,
      entityName: `${minute.number} - ${minute.title}`,
      details: `Ata criada: ${minute.number} - ${minute.title}, Tipo: ${minute.type}, Status: ${minute.status}`,
    });

    return NextResponse.json(minute, { status: 201 });
  } catch (error) {
    console.error("Error creating minute:", error);
    return NextResponse.json({ error: "Erro ao criar ata" }, { status: 500 });
  }
}
