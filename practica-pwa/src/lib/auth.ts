import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"

declare module "next-auth" {
  interface User {
    whatsapp?: string
  }
  interface Session {
    user: {
      id?: string
      name?: string | null
      whatsapp?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    whatsapp?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "WhatsApp OTP",
      credentials: {
        whatsapp: { label: "WhatsApp", type: "tel" },
        codigo: { label: "Código", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.whatsapp || !credentials?.codigo) {
          return null
        }

        const whatsappNormalizado = credentials.whatsapp.replace(/\D/g, "")

        // Busca o código mais recente e não usado para este WhatsApp
        const authCode = await prisma.authCode.findFirst({
          where: {
            whatsapp: whatsappNormalizado,
            code: credentials.codigo,
            used: false,
            expiresAt: {
              gt: new Date()
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        if (!authCode) {
          return null
        }

        // Marca o código como usado
        await prisma.authCode.update({
          where: { id: authCode.id },
          data: { used: true }
        })

        // Busca o corretor
        const corretor = await prisma.corretor.findUnique({
          where: { whatsapp: whatsappNormalizado }
        })

        if (corretor && corretor.ativo) {
          return {
            id: corretor.id,
            name: corretor.nome,
            whatsapp: corretor.whatsapp,
          }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.whatsapp = user.whatsapp
        token.sub = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub
        session.user.whatsapp = token.whatsapp
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  secret: process.env.NEXTAUTH_SECRET || "pratica-catalogo-secret-2024",
}
