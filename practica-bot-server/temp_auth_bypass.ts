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

        const cleanPhone = credentials.whatsapp.replace(/\D/g, "")
        const phoneWith55 = cleanPhone.startsWith("55") ? cleanPhone : "55" + cleanPhone
        const phoneWithout55 = cleanPhone.startsWith("55") ? cleanPhone.substring(2) : cleanPhone

        // BUSCA O CORRETOR
        const corretor = await prisma.corretor.findFirst({
           where: {
            whatsapp: {
              in: [phoneWith55, phoneWithout55, cleanPhone]
            },
            ativo: true
          }
        })

        if (!corretor) return null

        // MODO DE EMERGÊNCIA: Permite entrar com 000000 se o WhatsApp for o seu (Administrador)
        if (credentials.codigo === "000000" && (cleanPhone.includes("940716662"))) {
           console.log("LOGIN VIA MODO DE EMERGÊNCIA ATIVADO")
           return {
             id: corretor.id,
             name: corretor.nome,
             whatsapp: corretor.whatsapp,
           }
        }

        // VALIDAÇÃO NORMAL DO CÓDIGO
        const authCode = await prisma.authCode.findFirst({
          where: {
            whatsapp: corretor.whatsapp,
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

        return {
          id: corretor.id,
          name: corretor.nome,
          whatsapp: corretor.whatsapp,
        }
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
