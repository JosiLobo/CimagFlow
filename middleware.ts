import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        if (
          pathname.startsWith("/login") ||
          pathname.startsWith("/registro") ||
          pathname.startsWith("/assinar") ||
          pathname.startsWith("/abrir-demanda") ||
          pathname.startsWith("/consulta-protocolo") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/signup") ||
          pathname.startsWith("/api/sign") ||
          pathname.startsWith("/api/demands/public") ||
          pathname.startsWith("/api/demands/protocol") ||
          pathname.startsWith("/api/upload/presigned-public")
        ) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|og-image|public).*))"],
};
