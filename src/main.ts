import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const allowedOrigins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:9000",
    "hyperloop.vercel.app",
    "ewercard.vercel.app"
    ];

const corsOptions = {
    origin: (origin: string, callback) => {
        if (allowedOrigins.includes(origin) || !origin || allowedOrigins.findIndex(or => origin.endsWith(or) || origin.startsWith(or))) {
            callback(null, true);
        } else {
            callback(new Error("Origin not allowed by CORS"));
        }
    }
};


async function bootstrap() {
    let appConfig = {};
    if (process.env.PRODUCTION) {
        const httpsOptions = {
            cert: process.env.HTTPS_SERVER_CRT.replace(/\\n/gm, "\n"),
            key: process.env.HTTPS_SERVER_KEY.replace(/\\n/gm, "\n"),
        };
        // prod config
        appConfig = {
            httpsOptions,
        };
    }
    const app = await NestFactory.create(AppModule, appConfig);
    app.enableCors(corsOptions);
    await app.listen(3000);
}
bootstrap();
