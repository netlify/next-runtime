import type { NextRequest } from "next/server"
import type { JWT } from "next-auth/jwt"
import { withAuth } from "next-auth/middleware"

export default withAuth(
  {
    callbacks: {
      authorized: ({ req, token }) => {
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return token?.role === "admin"
        }
        if(token) return true

        return false
      },
    },
  }
)

export const config = { matcher: ["/admin", "/me"] }
