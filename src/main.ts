import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { SocketIoAdapter } from './socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  await app.listen(3000);
  // app.useWebSocketAdapter(new SocketIoAdapter(app));
}
bootstrap();
