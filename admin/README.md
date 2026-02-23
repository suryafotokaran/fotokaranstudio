# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## AWS S3 Configuration

To enable image uploads, you need to configure an AWS S3 bucket and IAM user.

1.  **Create S3 Bucket**: 
    - Go to AWS S3 Console.
    - Click "Create bucket". 
    - Name it (this is your `VITE_AWS_BUCKET_NAME`).
    - Note the Region (e.g., `us-east-1` - this is your `VITE_AWS_REGION`).
    - Uncheck "Block all public access" if you want public viewing (or keep blocked and use presigned URLs).

2.  **Configure CORS**: 
    - In your bucket -> Permissions -> Cross-origin resource sharing (CORS).
    - Paste the following configuration:
    ```json
    [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["PUT", "POST", "GET"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": []
        }
    ]
    ```

3.  **Create IAM User**: 
    - Go to AWS IAM Console.
    - Create a user.
    - Attach policy `AmazonS3FullAccess` (or a custom policy solely for this bucket).

4.  **Get Credentials**: 
    - For the user, go to "Security credentials" -> "Create access key".
    - Copy the *Access Key ID* (`VITE_AWS_ACCESS_KEY_ID`).
    - Copy the *Secret Access Key* (`VITE_AWS_SECRET_ACCESS_KEY`).
