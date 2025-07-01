import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../../utils/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: "Email", type: "email", placeholder: "hello@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );
          
          const user = userCredential.user;
          
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          // Update last login time
          await setDoc(doc(db, 'users', user.uid), {
            lastLogin: serverTimestamp()
          }, { merge: true });
          
          return {
            id: user.uid,
            uid: user.uid,
            name: user.displayName || userData.displayName || user.email.split('@')[0],
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.photoURL || userData.photoURL,
            role: userData.role || 'customer',
            ...userData
          };
        } catch (error) {
          console.error('Error in NextAuth authorize:', error);
          throw new Error(error.message || 'Authentication failed');
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '89588207516-vfvdtiqiv8uedud97gu616lq9bfe0n1q.apps.googleusercontent.com',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: "select_account"
        }
      },
      // Handle errors from Google authentication
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        if (account.provider === 'google') {
          // For Google provider, we need to get the Firebase user
          try {
            // Get the user from Firestore using the email
            const userQuery = await getDoc(doc(db, 'users', user.id));
            const userData = userQuery.exists() ? userQuery.data() : {};
            
            return {
              ...token,
              uid: user.id,
              emailVerified: user.emailVerified,
              role: userData.role || 'customer',
            };
          } catch (error) {
            console.error('Error during Google auth in NextAuth:', error);
          }
        }
        
        // For credentials provider
        return {
          ...token,
          uid: user.uid,
          emailVerified: user.emailVerified,
          role: user.role || 'customer',
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.uid = token.uid;
        session.user.emailVerified = token.emailVerified;
        session.user.role = token.role;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // For Google sign-in, ensure we have a user record in Firestore
      if (account.provider === 'google') {
        try {
          const userRef = doc(db, 'users', user.id);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            // Create new user document
            await setDoc(userRef, {
              displayName: user.name,
              email: user.email,
              photoURL: user.image,
              role: 'customer',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              emailVerified: true
            });
          } else {
            // Update last login time
            await setDoc(userRef, {
              lastLogin: serverTimestamp()
            }, { merge: true });
          }
        } catch (error) {
          console.error('Error saving Google user data to Firestore:', error);
        }
      }
      
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      } else if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    }
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};

export default NextAuth(authOptions); 