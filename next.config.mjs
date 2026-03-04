/** @type {import('next').NextConfig} */
const nextConfig = {
    serverExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"],
    // Opcional: si usas Turbopack, esto ayuda a la compatibilidad
    experimental: {
        serverComponentsExternalPackages: ["@libsql/client", "@prisma/adapter-libsql"]
    }
};

export default nextConfig;
