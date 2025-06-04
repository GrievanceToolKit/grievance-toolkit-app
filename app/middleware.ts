import { authMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: ["/", "/sign-in", "/sign-up", "/unauthorized"],
  afterAuth(auth, req) {
    const role = auth.session?.user?.publicMetadata?.role;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/dashboard") && !["admin", "steward"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (path.startsWith("/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if ((path.startsWith("/submit") || path.startsWith("/grievance-analysis")) && !["admin", "steward"].includes(role)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    return NextResponse.next();
  },
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/submit/:path*", "/grievance-analysis/:path*"]
};
