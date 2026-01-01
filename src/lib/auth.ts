import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import type { Provider } from 'next-auth/providers';
import { sendNotificationEmail } from '@/lib/services/email';

const ADMIN_EMAIL = 'andrejgalad@gmail.com';

// Check if Google OAuth is configured
const isGoogleConfigured =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CLIENT_ID.length > 0 &&
  process.env.GOOGLE_CLIENT_SECRET.length > 0;

// Build providers array dynamically
const providers: Provider[] = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Email and password are required');
      }

      const user = await prisma.user.findUnique({
        where: { email: credentials.email as string },
      });

      if (!user || !user.password) {
        throw new Error('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password as string,
        user.password
      );

      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

// Only add Google provider if configured
if (isGoogleConfigured) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Allow linking to existing accounts with same email
    })
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;

      // Auto-approve admin
      const isAdmin = user.email === ADMIN_EMAIL;

      // Update user approval status and create API keys
      await prisma.$transaction(async (tx) => {
        // Set admin as approved
        if (isAdmin) {
          await tx.user.update({
            where: { id: user.id },
            data: { isApproved: true, role: 'admin' },
          });
        }

        // Create default API keys entry
        await tx.apiKeys.create({
          data: { userId: user.id! },
        });
      });

      // If not admin, notify admin about new user
      if (!isAdmin) {
        try {
          // Find admin user
          const admin = await prisma.user.findUnique({
            where: { email: ADMIN_EMAIL },
          });

          if (admin) {
            // Create in-app notification for admin
            await prisma.notification.create({
              data: {
                userId: admin.id,
                type: 'new_user',
                title: 'New User Registration',
                message: `${user.name || user.email} has registered and is waiting for approval.`,
                metadata: {
                  newUserId: user.id,
                  newUserEmail: user.email,
                  newUserName: user.name,
                },
                actionUrl: '/admin',
              },
            });

            // Send email to admin
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            await sendNotificationEmail({
              to: ADMIN_EMAIL,
              subject: `New User Registration: ${user.name || user.email}`,
              title: 'New User Awaiting Approval',
              message: `A new user has registered and is waiting for your approval:\n\nName: ${user.name || 'Not provided'}\nEmail: ${user.email}\n\nPlease review and approve or reject this user in the admin dashboard.`,
              actionUrl: `${appUrl}/admin`,
              actionText: 'Go to Admin Dashboard',
            });
          }
        } catch (error) {
          console.error('Failed to notify admin about new user:', error);
        }
      }
    },
  },
});
