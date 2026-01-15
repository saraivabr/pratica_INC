import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import corretoresData from "@/data/corretores.json"

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
      name: "Codigo Corretor",
      credentials: {
        whatsapp: { label: "WhatsApp", type: "tel" },
        codigo: { label: "Codigo", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.whatsapp || !credentials?.codigo) {
          return null
        }

        // Normaliza o numero (remove espacos, tracos, parenteses)
        const whatsappNormalizado = credentials.whatsapp.replace(/\D/g, "")

        const corretor = corretoresData.corretores.find(
          (c) =>
            c.whatsapp === whatsappNormalizado &&
            c.codigo.toUpperCase() === credentials.codigo.toUpperCase() &&
            c.ativo
        )

        if (corretor) {
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
