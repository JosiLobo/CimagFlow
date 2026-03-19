import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = /^\/(login|registro|assinar|nova-solicitacao|consulta-protocolo|responder-demanda|atas-publicas|api\/(auth|signup|sign|demands\/(public|protocol)|credenciamentos\/(public|protocol)|upload\/(presigned-public|direct-public)|prefectures|public))/;

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (PUBLIC_ROUTES.test(req.nextUrl.pathname)) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|og-image|public).*)"],
};
