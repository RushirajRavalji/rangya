# Deploying to Vercel

This guide will help you deploy your Rangya e-commerce application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. [Git](https://git-scm.com/) installed on your machine
3. Your project pushed to a GitHub, GitLab, or Bitbucket repository

## Environment Variables

Before deploying, you need to set up the following environment variables in your Vercel project:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# API Configuration
NEXT_PUBLIC_API_URL=https://your-vercel-app.vercel.app/api
```

## Deployment Steps

1. **Push your code to a Git repository**
   - Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket)
   - Ensure `.gitignore` includes `node_modules/` and other build artifacts

2. **Import your project to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" > "Project"
   - Select your Git repository
   - Configure the project:
     - Root Directory: `./` (project root)
     - Build Command: `npm run build`
     - Output Directory: `.next`
     - Install Command: `npm install`

3. **Configure Environment Variables**
   - In the project settings, add all required environment variables from the list above

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

## Verifying Deployment

After deployment:

1. Check the deployment logs for any errors
2. Visit your deployed site at the provided Vercel URL
3. Verify all functionality works as expected

## Troubleshooting

If you encounter issues:

1. Check the build logs in Vercel dashboard
2. Ensure all environment variables are correctly set
3. Verify your `vercel.json` configuration is correct
4. Make sure your Next.js configuration in `next.config.js` includes proper image domains

## Continuous Deployment

Vercel automatically deploys when you push changes to your repository. To disable this:

1. Go to your project settings in Vercel
2. Navigate to Git Integration
3. Adjust the auto-deployment settings as needed 