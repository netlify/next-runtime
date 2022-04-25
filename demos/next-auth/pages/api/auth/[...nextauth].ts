import NextAuth from "next-auth"
import NetlifyProvider from "next-auth/providers/netlify"

export default NextAuth({
  providers: [
    NetlifyProvider({
      clientId: process.env.NETLIFY_CLIENT_ID,
      clientSecret: process.env.NETLIFY_CLIENT_SECRET,
      authorization: ({ params: { scope: "user" } })
    })
  ],
  theme: {
    colorScheme: "dark",
  },
  callbacks: {
    async jwt({ token }) {
      token.userRole = "admin"
      return token
    },
  },
})
