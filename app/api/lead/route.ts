import { NextResponse } from "next/server";

type LeadPayload = {
  kind?: "lead" | "newsletter";
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
}

export async function POST(request: Request) {
  try {
    const body: LeadPayload = await request.json();

    const { kind = "lead", name, email, phone, message } = body;

    // Validate required fields
    if (kind !== "newsletter" && (!name || !name.trim())) {
      return NextResponse.json(
        { success: false, error: "Vui lòng nhập họ và tên của bạn." },
        { status: 400 }
      );
    }

    if (!email || !email.trim() || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp địa chỉ email hợp lệ." },
        { status: 400 }
      );
    }

    // In production or next phase, save to MongoDB / Supabase / Postgres / Google Sheets
    console.log("[EXE201 API] New Lead Received:", {
      kind,
      name,
      email,
      phone: phone || "N/A",
      message: message || "N/A",
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message: kind === "newsletter" ? "Đăng ký nhận bản tin thành công." : "Đăng ký thành công! Đội ngũ phát triển dự án EXE201 sẽ liên hệ với bạn trong thời gian sớm nhất.",
        data: {
          name,
          email,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[EXE201 API] Error processing lead:", error);
    return NextResponse.json(
      { success: false, error: "Đã xảy ra lỗi hệ thống khi xử lý yêu cầu." },
      { status: 500 }
    );
  }
}
